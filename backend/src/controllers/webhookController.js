const crypto = require("crypto");
const { Webhook } = require("svix");
const User = require("../models/User");
const Course = require("../models/Course");
const Video = require("../models/Video");
const Enrollment = require("../models/Enrollment");
const { webhookQueue } = require("../services/queue");
const { mapBunnyStatus, getVideo } = require("../services/bunny");
const logger = require("../utils/logger");
const {
  normalizeEnrollmentTier,
  enrollmentsByTierKey,
  calculateEnrollmentExpirationDate,
} = require("../utils/tierAccess");
const {
  sendWelcomeEmail,
  sendAdminRegistrationAlert,
  sendPurchaseConfirmationEmail,
  sendUpgradeConfirmationEmail,
  sendAdminPurchaseAlert,
  sendAdminUpgradeAlert,
} = require("../services/emailService");

const TAG = "WEBHOOK_CTRL";

function logEmailFailures(results, label) {
  results.forEach((result, index) => {
    if (result.status === "rejected") {
      logger.error(TAG, `${label} email [${index}] failed:`, result.reason?.message);
    }
  });
}

// ── Clerk ───────────────────────────────────────────────────────────────────

const handleClerkWebhook = async (req, res) => {
  const payload = req.rawBody;
  const {
    "svix-id": svixId,
    "svix-timestamp": svixTimestamp,
    "svix-signature": svixSignature,
  } = req.headers;

  if (!svixId || !svixTimestamp || !svixSignature) {
    return res.status(400).json({ error: "Missing Svix headers" });
  }

  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    logger.error(TAG, "Missing CLERK_WEBHOOK_SECRET");
    return res.status(500).json({ error: "Server Configuration Error" });
  }

  let evt;
  try {
    evt = new Webhook(WEBHOOK_SECRET).verify(payload.toString(), {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    });
  } catch (err) {
    logger.warn(TAG, "Clerk signature verification failed:", err.message);
    return res.status(400).json({ error: "Invalid signature" });
  }

  const { data, type } = evt;
  logger.info(TAG, `Processing Clerk webhook: ${type}`);

  switch (type) {
    case "user.created": {
      const newUserEmail = data.email_addresses[0].email_address;
      await User.create({
        _id: data.id,
        email: newUserEmail,
        firstName: data.first_name,
        lastName: data.last_name,
      });
      // Fire emails asynchronously — never block the webhook response
      Promise.allSettled([
        sendWelcomeEmail({ to: newUserEmail, firstName: data.first_name }),
        sendAdminRegistrationAlert({
          studentEmail: newUserEmail,
          firstName: data.first_name,
          lastName: data.last_name,
        }),
      ]).then((results) => {
        results.forEach((r, i) => {
          if (r.status === "rejected")
            logger.error(
              TAG,
              `Registration email [${i}] failed:`,
              r.reason?.message,
            );
        });
      });
      break;
    }
    case "user.updated":
      await User.findByIdAndUpdate(data.id, {
        email: data.email_addresses[0].email_address,
        firstName: data.first_name,
        lastName: data.last_name,
      });
      break;
    case "user.deleted":
      await User.findByIdAndDelete(data.id);
      break;
    default:
      logger.debug(TAG, `Unhandled Clerk event: ${type}`);
  }

  return res.status(200).json({ success: true, message: "Webhook processed" });
};

// ── Bunny Stream ────────────────────────────────────────────────────────────

const handleBunnyWebhook = async (req, res) => {
  const { VideoGuid, Status } = req.body;

  if (!VideoGuid || Status === undefined) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  logger.info(TAG, `Bunny webhook: VideoGuid=${VideoGuid}, Status=${Status}`);

  const video = await Video.findOne({ videoGuid: VideoGuid });
  if (!video) {
    return res
      .status(200)
      .json({
        success: true,
        message: "Video not found, but webhook acknowledged",
      });
  }

  // ── Status priority guard ────────────────────────────────────────────────
  // Webhooks arrive asynchronously and can be out of order.
  // e.g. "READY" arrives, then a stale "UPLOADING" arrives later.
  // We only allow status to advance forward, never regress.
  const STATUS_PRIORITY = {
    QUEUED: 0,
    UPLOADING: 1,
    PROCESSING: 2,
    ENCODING: 3,
    READY: 4,
    FAILED: 5, // FAILED can always override (it's an error state)
  };

  const incomingStatus = mapBunnyStatus(Status);
  const currentPriority = STATUS_PRIORITY[video.status] ?? 0;
  const incomingPriority = STATUS_PRIORITY[incomingStatus] ?? 0;

  if (incomingPriority < currentPriority) {
    logger.warn(
      TAG,
      `Ignoring out-of-order webhook: current=${video.status}(${currentPriority}), incoming=${incomingStatus}(${incomingPriority})`,
    );
    return res.status(200).json({
      success: true,
      message: "Webhook acknowledged but ignored (out-of-order)",
      currentStatus: video.status,
    });
  }

  let bunnyDetails = null;
  try {
    bunnyDetails = await getVideo(VideoGuid);

    // Core metadata — always update from API source of truth
    video.duration = bunnyDetails.length || 0;
    video.storageSize = bunnyDetails.storageSize || 0;
    video.views = bunnyDetails.views || 0;
    video.encodeProgress = bunnyDetails.encodeProgress || 0;

    if (bunnyDetails.thumbnailFileName) {
      video.thumbnailFileName = bunnyDetails.thumbnailFileName;
    }
    if (bunnyDetails.hasMP4Fallback !== undefined) {
      video.hasMP4Fallback = bunnyDetails.hasMP4Fallback;
    }

    logger.info(
      TAG,
      `Fetched video details: duration=${bunnyDetails.length}s, encodeProgress=${bunnyDetails.encodeProgress}%, apiStatus=${bunnyDetails.status}`,
    );
  } catch (fetchErr) {
    logger.error(
      TAG,
      `Failed to fetch video details for ${VideoGuid}:`,
      fetchErr.message,
    );
  }

  // ── Determine final status ────────────────────────────────────────────────
  // If we got the Bunny API response, use its status as the real source of
  // truth (it reflects the actual current state, not the webhook event).
  // This handles the race condition where the video has progressed further
  // than what this particular webhook reports.
  const realBunnyStatus = bunnyDetails ? bunnyDetails.status : Status;
  const realMappedStatus = mapBunnyStatus(realBunnyStatus);
  const realPriority = STATUS_PRIORITY[realMappedStatus] ?? 0;

  // Use whichever is more advanced: webhook status or API status
  const finalStatus =
    realPriority >= incomingPriority ? realMappedStatus : incomingStatus;

  video.bunnyStatus = realBunnyStatus;
  video.status = finalStatus;

  // Handle specific transitions
  if (finalStatus === "READY") {
    video.encodeProgress = 100;
    if (!video.processedAt) {
      video.processedAt = new Date();
    }
  }

  await video.save();
  logger.info(
    TAG,
    `Video ${video._id} saved: status=${video.status}, duration=${video.duration}s`,
  );

  return res.status(200).json({
    success: true,
    message: "Webhook processed successfully",
    videoId: video._id,
    status: video.status,
    duration: video.duration,
  });
};

// ── Razorpay ────────────────────────────────────────────────────────────────

const handleRazorpayWebhook = async (req, res) => {
  const signature = req.headers["x-razorpay-signature"];

  const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();

  if (!secret) {
    throw new Error("RAZORPAY_WEBHOOK_SECRET is not set or is empty");
  }

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(req.rawBody)
    .digest("hex");

  if (signature !== expectedSignature) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid signature" });
  }

  const event = req.body;
  const payment = event.payload.payment.entity;
  const orderId = payment.order_id;

  if (event.event !== "payment.captured") {
    return res.status(200).json({ success: true });
  }

  const [isPurchase, isUpgrade] = await Promise.all([
    Enrollment.exists({ "purchase.razorpayOrderId": orderId }),
    Enrollment.exists({ "upgrade.razorpayOrderId": orderId }),
  ]);

  if (!isPurchase && !isUpgrade) {
    logger.error(TAG, "Unrecognised orderId", { orderId });
    return res.status(200).json({ success: true });
  }

  if (isPurchase) {
    const enrollment = await Enrollment.findOne({
      "purchase.razorpayOrderId": orderId,
    })
      .select("courseId tier purchase userId")
      .lean();
    if (enrollment) {
      const course = await Course.findById(enrollment.courseId)
        .select("enrollmentExpirationMonths")
        .lean();
      const expirationMonths = course?.enrollmentExpirationMonths || 12;
      const expiresAt = calculateEnrollmentExpirationDate(
        new Date(),
        expirationMonths,
      );

      const result = await Enrollment.updateOne(
        { "purchase.razorpayOrderId": orderId, "purchase.status": "PENDING" },
        {
          $set: {
            "purchase.status": "CAPTURED",
            "purchase.razorpayPaymentId": payment.id,
            "purchase.razorpaySignature": payment.signature ?? null,
            "purchase.capturedAt": new Date(),
            expiresAt,
          },
        },
      );
      if (result.modifiedCount === 0) {
        logger.warn(TAG, "Purchase capture no-op", { orderId });
      } else {
        const tierKey = enrollmentsByTierKey(enrollment.tier || "GOLD");
        await Course.findByIdAndUpdate(enrollment.courseId, {
          $inc: {
            enrollmentCount: 1,
            [`enrollmentsByTier.${tierKey}`]: 1,
          },
        });

        Promise.allSettled([
          Course.findById(enrollment.courseId).select("title").lean(),
          User.findById(enrollment.userId).select("email firstName").lean(),
        ]).then(([courseRes, userRes]) => {
          const course = courseRes.status === "fulfilled" ? courseRes.value : null;
          const student = userRes.status === "fulfilled" ? userRes.value : null;
          if (!student) return;

          const emailData = {
            to: student.email,
            firstName: student.firstName,
            courseName: course?.title || "the course",
            tier: enrollment.tier,
            amountPaid: enrollment.purchase?.amountPaid || payment.amount / 100,
            paymentId: payment.id,
            expiresAt,
          };

          Promise.allSettled([
            sendPurchaseConfirmationEmail(emailData),
            sendAdminPurchaseAlert({
              studentEmail: student.email,
              firstName: student.firstName,
              ...emailData,
            }),
          ]).then((results) => logEmailFailures(results, "Purchase"));
        }).catch((err) => logger.error(TAG, "Failed to fetch student for email:", err.message));
      }
    }
  }

  if (isUpgrade) {
    const enrollment = await Enrollment.findOne({
      "upgrade.razorpayOrderId": orderId,
    })
      .select("courseId tier upgrade userId")
      .lean();
    if (enrollment) {
      const newTier = normalizeEnrollmentTier(enrollment.upgrade?.toTier);
      const fromKey = enrollmentsByTierKey(enrollment.tier);
      const toKey = enrollmentsByTierKey(newTier);
      const result = await Enrollment.updateOne(
        { "upgrade.razorpayOrderId": orderId, "upgrade.status": "PENDING" },
        {
          $set: {
            tier: newTier,
            "upgrade.status": "CAPTURED",
            "upgrade.razorpayPaymentId": payment.id,
            "upgrade.razorpaySignature": payment.signature ?? null,
            "upgrade.capturedAt": new Date(),
          },
        },
      );
      if (result.modifiedCount === 0) {
        logger.warn(TAG, "Upgrade capture no-op", { orderId });
      } else {
        const inc = {
          [`enrollmentsByTier.${fromKey}`]: -1,
          [`enrollmentsByTier.${toKey}`]: 1,
        };
        await Course.findByIdAndUpdate(enrollment.courseId, { $inc: inc });

        Promise.allSettled([
          Course.findById(enrollment.courseId).select("title").lean(),
          User.findById(enrollment.userId).select("email firstName").lean(),
        ]).then(([courseRes, userRes]) => {
          const course = courseRes.status === "fulfilled" ? courseRes.value : null;
          const student = userRes.status === "fulfilled" ? userRes.value : null;
          if (!student) return;

          const emailData = {
            to: student.email,
            firstName: student.firstName,
            courseName: course?.title || "the course",
            fromTier: enrollment.tier,
            toTier: newTier,
            amountPaid: enrollment.upgrade?.amountCharged || 0,
            paymentId: payment.id,
          };

          Promise.allSettled([
            sendUpgradeConfirmationEmail(emailData),
            sendAdminUpgradeAlert({
              studentEmail: student.email,
              firstName: student.firstName,
              ...emailData,
            }),
          ]).then((results) => logEmailFailures(results, "Upgrade"));
        }).catch((err) => logger.error(TAG, "Failed to fetch student for email:", err.message));
      }
    }
  }

  return res.status(200).json({ success: true });
};

module.exports = {
  handleClerkWebhook,
  handleBunnyWebhook,
  handleRazorpayWebhook,
};
