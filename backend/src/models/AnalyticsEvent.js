const mongoose = require('mongoose');

const AnalyticsEventSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    eventType: {
        type: String,
        required: true,
        enum: [
            'PURCHASE', 'REFUND', 'UPGRADE',
            'SUBSCRIPTION_STARTED', 'SUBSCRIPTION_ENDED',
            'LECTURE_COMPLETED'
        ]
    },
    payload: { type: mongoose.Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now }
}, {
    capped: { size: 1024 * 1024 * 1024 } // Optional: Capped collection (1GB) for high volume logs
});

module.exports = mongoose.model('AnalyticsEvent', AnalyticsEventSchema);
