/**
 * Shared constants — eliminates magic numbers and duplicated literals.
 */

/** Razorpay order expiry window (15 minutes). */
const ORDER_EXPIRY_MS = 15 * 60 * 1000;

/** Default currency for payments. */
const CURRENCY = 'INR';

/** Status priority map for idempotent webhook processing. */
const STATUS_PRIORITY = {
  PENDING: 0,
  AUTHORIZED: 1,
  CAPTURED: 2,
  REFUNDED: 3,
};

/** Valid subscription tiers (purchase / enrollment). Legacy STANDARD/PREMIUM accepted. */
const VALID_TIERS = ['BASIC', 'GOLD', 'PLATINUM', 'STANDARD', 'PREMIUM'];

/** Valid user roles. */
const VALID_ROLES = ['student', 'educator', 'admin'];

/** Valid pricing tier names (lowercase, as stored in Course model). Legacy standard/premium accepted. */
const VALID_PRICING_TIERS = ['basic', 'gold', 'platinum', 'standard', 'premium'];

/** Allowed MIME types for note/resource uploads. */
const ALLOWED_NOTE_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg',
  'image/png',
  'image/webp',
];

module.exports = {
  ORDER_EXPIRY_MS,
  CURRENCY,
  STATUS_PRIORITY,
  VALID_TIERS,
  VALID_ROLES,
  VALID_PRICING_TIERS,
  ALLOWED_NOTE_MIME_TYPES,
};
