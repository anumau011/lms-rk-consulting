const crypto = require('crypto');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const User = require('../models/User');
const logger = require('../utils/logger');
const {
  sendPurchaseConfirmationEmail,
  sendUpgradeConfirmationEmail,
  sendAdminPurchaseAlert,
  sendAdminUpgradeAlert,
} = require('../services/emailService');
const { ORDER_EXPIRY_MS, CURRENCY, VALID_TIERS } = require('../utils/constants');
const {
  normalizeEnrollmentTier,
  enrollmentsByTierKey,
  canonicalPurchaseTier,
  normalizePricingTierName,
  isUpgradePath,
  normalizePricingTiersForDisplay,
  calculateEnrollmentExpirationDate,
} = require('../utils/tierAccess');
const Razorpay = require('razorpay');

const TAG = 'ENROLLMENT_CTRL';

/** Lazy-initialized Razorpay instance (avoids throwing at import time). */
let _razorpay = null;
function getRazorpay() {
  if (!_razorpay) {
    _razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_API_KEY,
      key_secret: process.env.RAZORPAY_API_SECRET,
    });
  }
  return _razorpay;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function computeAmount(tier) {
  const baseAmount = tier.price || 0;
  const discount = tier.discount || 0;
  const discountAmount = (baseAmount * discount) / 100;
  const finalAmount = baseAmount - discountAmount;
  return { baseAmount, discountAmount, finalAmount };
}

function isPurchaseOrderStillValid(enrollment) {
  if (!enrollment.purchase?.razorpayOrderId) return false;
  if (enrollment.purchase.status !== 'PENDING') return false;
  return Date.now() - new Date(enrollment.purchase.initiatedAt).getTime() < ORDER_EXPIRY_MS;
}

function isUpgradeOrderStillValid(enrollment) {
  if (!enrollment.upgrade?.razorpayOrderId) return false;
  if (enrollment.upgrade.status !== 'PENDING') return false;
  return Date.now() - new Date(enrollment.upgrade.initiatedAt).getTime() < ORDER_EXPIRY_MS;
}

function findPricingTier(course, tierCanonicalUpper) {
  const key = tierCanonicalUpper.toLowerCase();
  const tiers = normalizePricingTiersForDisplay(course.pricingTiers || []);
  return tiers.find((t) => normalizePricingTierName(t.tier) === key);
}

// ── Controllers ─────────────────────────────────────────────────────────────

/** POST /user/purchase — Initiate or resume course purchase. */
const purchaseCourse = async (req, res) => {
  const { courseId, planType } = req.body;
  const userId = req.user._id;

  if (!courseId || !planType) {
    return res.status(400).json({ success: false, message: 'courseId and planType are required' });
  }

  const normalizedPlan = String(planType).trim().toUpperCase();
  if (!VALID_TIERS.includes(normalizedPlan)) {
    return res.status(400).json({ success: false, message: 'Invalid planType' });
  }

  const canonicalTier = canonicalPurchaseTier(normalizedPlan);

  const [course, existingEnrollment] = await Promise.all([
    Course.findById(courseId).lean().catch(() => null),
    Enrollment.findOne({ userId, courseId }).lean(),
  ]);

  if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
  if (existingEnrollment?.purchase?.status === 'CAPTURED') {
    return res.status(409).json({ success: false, message: 'You are already enrolled in this course' });
  }

  const pricingTier = findPricingTier(course, canonicalTier);
  if (!pricingTier) {
    return res.status(400).json({ success: false, message: 'Plan not available for this course' });
  }

  const { baseAmount, discountAmount, finalAmount } = computeAmount(pricingTier);
  const planChanged = existingEnrollment?.purchase?.purchasedTier !== canonicalTier;
  const priceChanged = existingEnrollment?.purchase?.amountPaid !== finalAmount;

  let enrollment;
  try {
    enrollment = await Enrollment.findOneAndUpdate(
      { userId, courseId, 'purchase.status': { $ne: 'CAPTURED' } },
      {
        $setOnInsert: { userId, courseId },
        $set: {
          tier: canonicalTier,
          currency: CURRENCY,
          'purchase.purchasedTier': canonicalTier,
          'purchase.baseAmount': baseAmount,
          'purchase.discountApplied': discountAmount,
          'purchase.amountPaid': finalAmount,
          'purchase.status': 'PENDING',
          'purchase.initiatedAt': new Date(),
        },
      },
      { upsert: true, new: true }
    );
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'You are already enrolled in this course' });
    }
    throw err;
  }

  if (isPurchaseOrderStillValid(enrollment) && !planChanged && !priceChanged) {
    return res.json({
      success: true,
      reused: true,
      order_id: enrollment.purchase.razorpayOrderId,
      amount: enrollment.purchase.amountPaid,
      currency: enrollment.currency,
      razorpayKey: process.env.RAZORPAY_API_KEY,
    });
  }

  let razorpayOrder;
  try {
    razorpayOrder = await getRazorpay().orders.create({
      amount: Math.round(finalAmount * 100),
      currency: CURRENCY,
      receipt: `prc_${enrollment._id}`,
    });
  } catch (err) {
    logger.error(TAG, 'Razorpay order creation failed:', err.message, { userId, courseId });
    return res.status(502).json({ success: false, message: 'Payment gateway error. Please try again.' });
  }

  const staleOrderId = enrollment.purchase.razorpayOrderId ?? null;
  const orderFilter = staleOrderId
    ? { _id: enrollment._id, 'purchase.razorpayOrderId': staleOrderId }
    : { _id: enrollment._id, 'purchase.razorpayOrderId': { $exists: false } };

  const { modifiedCount } = await Enrollment.updateOne(orderFilter, {
    $set: {
      'purchase.razorpayOrderId': razorpayOrder.id,
      'purchase.razorpayPaymentId': null,
      'purchase.razorpaySignature': null,
      'purchase.status': 'PENDING',
      'purchase.initiatedAt': new Date(),
    },
  });

  if (modifiedCount === 0) {
    const fresh = await Enrollment.findById(enrollment._id).select('purchase currency').lean();
    return res.json({
      success: true,
      reused: true,
      order_id: fresh.purchase.razorpayOrderId,
      amount: fresh.purchase.amountPaid,
      currency: fresh.currency,
      razorpayKey: process.env.RAZORPAY_API_KEY,
    });
  }

  return res.json({
    success: true,
    reused: false,
    order_id: razorpayOrder.id,
    amount: finalAmount,
    currency: CURRENCY,
    razorpayKey: process.env.RAZORPAY_API_KEY,
  });
};

/** POST /user/upgrade — Upgrade to a higher tier (e.g. BASIC→GOLD, GOLD→PLATINUM). */
const upgradeToTier = async (req, res) => {
  const targetRaw = req.body.targetTier ?? req.body.planType ?? 'PREMIUM';
  const { courseId } = req.body;
  const userId = req.user._id;

  if (!courseId) return res.status(400).json({ success: false, message: 'courseId is required' });

  const normalizedTarget = String(targetRaw).trim().toUpperCase();
  const targetCanonical = canonicalPurchaseTier(normalizedTarget);

  const enrollment = await Enrollment.findOne({ userId, courseId });
  if (!enrollment) return res.status(404).json({ success: false, message: 'Enrollment not found' });
  if (enrollment.purchase.status !== 'CAPTURED') {
    return res.status(400).json({ success: false, message: 'Complete your initial purchase first' });
  }

  const current = normalizeEnrollmentTier(enrollment.tier);
  if (current === targetCanonical) {
    return res.status(409).json({ success: false, message: `Already on ${targetCanonical} tier` });
  }
  if (!isUpgradePath(current, targetCanonical)) {
    return res.status(400).json({ success: false, message: 'Invalid upgrade path' });
  }

  if (isUpgradeOrderStillValid(enrollment)) {
    return res.json({
      success: true,
      reused: true,
      order_id: enrollment.upgrade.razorpayOrderId,
      amount: enrollment.upgrade.amountCharged,
      currency: enrollment.currency,
      razorpayKey: process.env.RAZORPAY_API_KEY,
    });
  }

  const course = await Course.findById(courseId).lean();
  if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

  const currentPricing = findPricingTier(course, current);
  const targetPricing = findPricingTier(course, targetCanonical);
  if (!currentPricing || !targetPricing) {
    return res.status(400).json({ success: false, message: 'Tier pricing not available for this course' });
  }

  const { finalAmount: currentFinal } = computeAmount(currentPricing);
  const { baseAmount, finalAmount: targetFinal } = computeAmount(targetPricing);
  const deltaAmount = targetFinal - currentFinal;

  if (deltaAmount <= 0) return res.status(400).json({ success: false, message: 'Invalid upgrade amount' });

  let razorpayOrder;
  try {
    razorpayOrder = await getRazorpay().orders.create({
      amount: Math.round(deltaAmount * 100),
      currency: enrollment.currency,
      receipt: `upg_${enrollment._id}`,
    });
  } catch (err) {
    logger.error(TAG, 'Razorpay upgrade order creation failed:', err.message, { userId, courseId });
    return res.status(502).json({ success: false, message: 'Payment gateway error. Please try again.' });
  }

  const staleOrderId = enrollment.upgrade?.razorpayOrderId || null;
  const upgradeFilter = staleOrderId
    ? { _id: enrollment._id, 'upgrade.razorpayOrderId': staleOrderId }
    : { _id: enrollment._id, 'upgrade.razorpayOrderId': { $exists: false } };

  const updateResult = await Enrollment.updateOne(
    { ...upgradeFilter, tier: enrollment.tier },
    {
      $set: {
        upgrade: {
          fromTier: enrollment.tier,
          toTier: targetCanonical,
          razorpayOrderId: razorpayOrder.id,
          baseAmount,
          discountApplied: 0,
          amountCharged: deltaAmount,
          status: 'PENDING',
          initiatedAt: new Date(),
        },
      },
    }
  );

  if (updateResult.modifiedCount === 0) {
    const fresh = await Enrollment.findById(enrollment._id).select('tier upgrade currency').lean();
    if (normalizeEnrollmentTier(fresh.tier) === targetCanonical) {
      return res.status(409).json({ success: false, message: `Already on ${targetCanonical} tier` });
    }
    return res.json({
      success: true,
      reused: true,
      order_id: fresh.upgrade.razorpayOrderId,
      amount: fresh.upgrade.amountCharged,
      currency: fresh.currency,
      razorpayKey: process.env.RAZORPAY_API_KEY,
    });
  }

  return res.json({
    success: true,
    reused: false,
    order_id: razorpayOrder.id,
    amount: deltaAmount,
    currency: enrollment.currency,
    razorpayKey: process.env.RAZORPAY_API_KEY,
  });
};

/** POST /user/verify-payment — Verify Razorpay payment signature. */
const verifyPayment = async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature, type } = req.body;

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !type) {
    return res.status(400).json({ success: false, message: 'All payment fields are required' });
  }
  if (!['purchase', 'upgrade'].includes(type)) {
    return res.status(400).json({ success: false, message: 'Invalid type' });
  }

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_API_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  if (expectedSignature !== razorpaySignature) {
    return res.status(400).json({ success: false, message: 'Invalid payment signature' });
  }

  const orderField = type === 'purchase' ? 'purchase.razorpayOrderId' : 'upgrade.razorpayOrderId';
  const enrollment = await Enrollment.findOne({ [orderField]: razorpayOrderId });

  if (!enrollment) return res.status(404).json({ success: false, message: 'Enrollment not found' });

  const statusField = type === 'purchase' ? enrollment.purchase.status : enrollment.upgrade?.status;
  if (statusField === 'CAPTURED') {
    return res.json({ success: true, alreadyCaptured: true, tier: enrollment.tier, message: 'Payment already confirmed' });
  }

  if (type === 'purchase') {
    // Fetch course to get enrollment expiration settings
    const course = await Course.findById(enrollment.courseId).select('enrollmentExpirationMonths title').lean();
    const expirationMonths = course?.enrollmentExpirationMonths || 12;
    const expiresAt = calculateEnrollmentExpirationDate(new Date(), expirationMonths);

    const result = await Enrollment.updateOne(
      { 'purchase.razorpayOrderId': razorpayOrderId, 'purchase.status': 'PENDING' },
      {
        $set: {
          'purchase.status': 'CAPTURED',
          'purchase.razorpayPaymentId': razorpayPaymentId,
          'purchase.razorpaySignature': razorpaySignature,
          'purchase.capturedAt': new Date(),
          'expiresAt': expiresAt,
        },
      }
    );
    if (result.modifiedCount > 0) {
      const tierKey = enrollmentsByTierKey(enrollment.tier);
      await Course.findByIdAndUpdate(enrollment.courseId, {
        $inc: {
          enrollmentCount: 1,
          [`enrollmentsByTier.${tierKey}`]: 1,
        },
      });

      // Send purchase confirmation emails (non-blocking)
      User.findById(enrollment.userId).select('email firstName').lean().then((student) => {
        if (!student) return;
        const emailData = {
          to: student.email,
          firstName: student.firstName,
          courseName: course?.title || 'the course',
          tier: enrollment.tier,
          amountPaid: enrollment.purchase.amountPaid,
          paymentId: razorpayPaymentId,
          expiresAt,
        };
        Promise.allSettled([
          sendPurchaseConfirmationEmail(emailData),
          sendAdminPurchaseAlert({ studentEmail: student.email, firstName: student.firstName, ...emailData }),
        ]).then((results) => {
          results.forEach((r, i) => {
            if (r.status === 'rejected') logger.error(TAG, `Purchase email [${i}] failed:`, r.reason?.message);
          });
        });
      }).catch((err) => logger.error(TAG, 'Failed to fetch student for email:', err.message));
    }
  } else {
    const newTier = normalizeEnrollmentTier(enrollment.upgrade.toTier);
    const fromKey = enrollmentsByTierKey(enrollment.tier);
    const toKey = enrollmentsByTierKey(newTier);

    const result = await Enrollment.updateOne(
      { 'upgrade.razorpayOrderId': razorpayOrderId, 'upgrade.status': 'PENDING' },
      {
        $set: {
          tier: newTier,
          'upgrade.status': 'CAPTURED',
          'upgrade.razorpayPaymentId': razorpayPaymentId,
          'upgrade.razorpaySignature': razorpaySignature,
          'upgrade.capturedAt': new Date(),
        },
      }
    );
    if (result.modifiedCount > 0) {
      await Course.findByIdAndUpdate(enrollment.courseId, {
        $inc: {
          [`enrollmentsByTier.${fromKey}`]: -1,
          [`enrollmentsByTier.${toKey}`]: 1,
        },
      });

      // Send upgrade confirmation emails (non-blocking)
      Promise.allSettled([
        Course.findById(enrollment.courseId).select('title').lean(),
        User.findById(enrollment.userId).select('email firstName').lean(),
      ]).then(([courseRes, userRes]) => {
        const course = courseRes.status === 'fulfilled' ? courseRes.value : null;
        const student = userRes.status === 'fulfilled' ? userRes.value : null;
        if (!student) return;
        const emailData = {
          to: student.email,
          firstName: student.firstName,
          courseName: course?.title || 'the course',
          fromTier: enrollment.tier,
          toTier: newTier,
          amountPaid: enrollment.upgrade?.amountCharged || 0,
          paymentId: razorpayPaymentId,
        };
        Promise.allSettled([
          sendUpgradeConfirmationEmail(emailData),
          sendAdminUpgradeAlert({ studentEmail: student.email, firstName: student.firstName, ...emailData }),
        ]).then((results) => {
          results.forEach((r, i) => {
            if (r.status === 'rejected') logger.error(TAG, `Upgrade email [${i}] failed:`, r.reason?.message);
          });
        });
      });
    }
  }

  const updated = await Enrollment.findOne({ [orderField]: razorpayOrderId }).select('tier').lean();
  return res.json({ success: true, alreadyCaptured: false, tier: updated.tier, message: 'Payment verified successfully' });
};

module.exports = { purchaseCourse, upgradeToTier, upgradeToPremium: upgradeToTier, verifyPayment };
