const mongoose = require('mongoose');

// Immutable ledger of all financial events
const TransactionSchema = new mongoose.Schema({
    userId: { type: String, ref: 'User', required: true },
    stripeEventId: { type: String, required: true, unique: true }, // Idempotency Key
    type: {
        type: String,
        enum: ['PURCHASE', 'SUBSCRIPTION_START', 'SUBSCRIPTION_RENEW', 'REFUND', 'UPGRADE', 'CHARGEBACK'],
        required: true
    },
    amount: { type: Number, required: true }, // In cents
    currency: { type: String, default: 'usd' },
    metadata: { type: mongoose.Schema.Types.Mixed },

    status: { type: String, enum: ['succeeded', 'failed', 'pending'], default: 'succeeded' },

    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Transaction', TransactionSchema);
