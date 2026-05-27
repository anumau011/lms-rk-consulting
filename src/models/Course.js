const mongoose = require('mongoose');

const PricingTierSchema = new mongoose.Schema({
    tier: {
        type: String,
        enum: ['basic', 'gold', 'platinum'],
        required: true
    },
    price: {
        type: Number,
        required: true // in cents
    },
    discount: {
        type: Number,
        default: 0 // percentage (0–100)
    },
    finalPrice: {
        type: Number // calculated price (optional, cached)
    },
    features: [{
        type: String // "Full course access", "Downloadable notes"
    }],
    isActive: {
        type: Boolean,
        default: true
    }
}, { _id: false });

const CourseSchema = new mongoose.Schema({
    instructorId: {
        type: String,
        ref: 'User',
        required: true,
        index: true
    },

    // Step 1: Basic Info
    title: {
        type: String,
        required: true,
        trim: true
    },

    // Step 3: Details
    description: {
        type: String,
        trim: true
    },
    subtitle: {
        type: String,
        trim: true
    },
    thumbnail: {
        type: String,
        trim: true
    },
    category: {
        type: String,
        enum: ['development', 'business', 'design', 'marketing', 'personal-development', 'other'],
        default: 'other'
    },
    level: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced', 'all-levels'],
        default: 'all-levels'
    },

    // Step 4: Pricing
    currency: {
        type: String,
        default: 'inr'
    },
    pricingTiers: {
        type: [PricingTierSchema],
        default: []
    },

    // Publishing Status
    status: {
        type: String,
        enum: ['draft', 'published', 'archived'],
        default: 'draft',
        index: true
    },

    // Completion tracking for each step
    completedSteps: {
        step1: { type: Boolean, default: false }, // Basic info
        step2: { type: Boolean, default: false }, // Curriculum
        step3: { type: Boolean, default: false }, // Details
        step4: { type: Boolean, default: false }, // Pricing
    },

    // Course expiration settings
    enrollmentExpirationMonths: {
        type: Number,
        default: 12,
        min: 1,
        max: 120, // Max 10 years
        description: 'How many months students can access the course after enrollment'
    },

    // Analytics
    enrollmentCount: {
        type: Number,
        default: 0
    },
    enrollmentsByTier: {
        basic: { type: Number, default: 0 },
        gold: { type: Number, default: 0 },
        platinum: { type: Number, default: 0 },
    },
    averageRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    totalReviews: {
        type: Number,
        default: 0
    },
}, {
    timestamps: true,
    versionKey: false
});

// Indexes
CourseSchema.index({ instructorId: 1, status: 1 });
CourseSchema.index({ status: 1, createdAt: -1 });
CourseSchema.index({ category: 1, status: 1 });

// Methods
CourseSchema.methods.isStepCompleted = function (step) {
    return this.completedSteps[`step${step}`] || false;
};

CourseSchema.methods.canPublish = function () {
    return this.completedSteps.step1 &&
        this.completedSteps.step2 &&
        this.completedSteps.step3 &&
        this.completedSteps.step4;
};

// Pre-save hook to calculate final prices
// Pre-save hook to calculate final prices
CourseSchema.pre('save', async function () {
    if (this.pricingTiers && this.pricingTiers.length > 0) {
        this.pricingTiers.forEach(tier => {
            if (tier.discount > 0) {
                tier.finalPrice = Math.round(tier.price * (1 - tier.discount / 100));
            } else {
                tier.finalPrice = tier.price;
            }
        });
    }
});

module.exports = mongoose.model('Course', CourseSchema);