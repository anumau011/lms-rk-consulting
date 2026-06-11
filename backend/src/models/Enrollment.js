const mongoose = require("mongoose");
const Course = require("./Course");
const { Schema } = mongoose;

const PurchaseSchema = new Schema(
  {
    purchasedTier: {
      type: String,
      enum: ["BASIC", "GOLD", "PLATINUM", "STANDARD", "PREMIUM"],
      required: true,
    },

    razorpayOrderId:   { type: String, required: true },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },

    baseAmount:      { type: Number, required: true },
    discountApplied: { type: Number, default: 0 },
    amountPaid:      { type: Number, required: true },

    status: {
      type: String,
      enum: ["PENDING", "CAPTURED", "FAILED", "EXPIRED"],
      default: "PENDING",
      required: true,
    },

    initiatedAt: { type: Date, default: Date.now },
    capturedAt:  { type: Date },
  },
  { _id: false }
);

const UpgradeSchema = new Schema(
  {
    fromTier: { type: String, enum: ["BASIC", "GOLD", "STANDARD", "PREMIUM", "PLATINUM"], required: true },
    toTier: { type: String, enum: ["GOLD", "PLATINUM", "PREMIUM"], required: true },

    razorpayOrderId:   { type: String, required: true },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },

    baseAmount:      { type: Number, required: true },
    discountApplied: { type: Number, default: 0 },
    amountCharged:   { type: Number, required: true }, // delta only

    status: {
      type: String,
      enum: ["PENDING", "CAPTURED", "FAILED", "EXPIRED"],
      default: "PENDING",
      required: true,
    },

    initiatedAt: { type: Date, default: Date.now },
    capturedAt:  { type: Date },
  },
  { _id: false }
);

const EnrollmentSchema = new Schema(
  {
    userId: {
      type: String,
      ref: "User",
      required: true,
    },

    courseId: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },

    // Single source of truth for what the user can access right now
    tier: {
      type: String,
      enum: ["BASIC", "GOLD", "PLATINUM", "STANDARD", "PREMIUM"],
      required: true,
    },

    purchase: {
      type: PurchaseSchema,
      required: true,
    },

    // Only exists after upgrade is initiated — absent on STANDARD-only enrollments
    upgrade: {
      type: UpgradeSchema,
      default: undefined,
    },

    currency: { type: String, default: "INR" },

    // Learner rating for this purchased course (one rating per enrollment)
    courseRating: {
      type: Number,
      min: 1,
      max: 5,
      default: undefined,
    },
    ratedAt: {
      type: Date,
      default: undefined,
    },

    // Learner feedback for this course (rating + comment)
    feedback: {
      rating: {
        type: Number,
        min: 1,
        max: 5,
        default: undefined,
      },
      comment: {
        type: String,
        default: undefined,
      },
      submittedAt: {
        type: Date,
        default: undefined,
      },
    },

    // Course expiration date — student loses access after this date
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

// ── Indexes ───────────────────────────────────────────────────────────────────

EnrollmentSchema.index({ userId: 1, courseId: 1 }, { unique: true });
EnrollmentSchema.index({ userId: 1 });
EnrollmentSchema.index({ "purchase.razorpayOrderId": 1 }, { unique: true, sparse: true });
EnrollmentSchema.index({ "upgrade.razorpayOrderId":  1 }, { unique: true, sparse: true });
EnrollmentSchema.index({ expiresAt: 1 }, { sparse: true });

module.exports = mongoose.model("Enrollment", EnrollmentSchema);