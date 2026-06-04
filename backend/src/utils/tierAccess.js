/**
 * Subscription tiers: BASIC (notes view), GOLD (video + notes view), PLATINUM (video + notes download).
 * Legacy: STANDARD → GOLD, PREMIUM → PLATINUM.
 */

const NORMAL_RANK = { BASIC: 0, GOLD: 1, PLATINUM: 2 };

/** Normalize DB tier to BASIC | GOLD | PLATINUM */
function normalizeEnrollmentTier(tier) {
  const u = String(tier || '').toUpperCase();
  if (u === 'STANDARD') return 'GOLD';
  if (u === 'PREMIUM') return 'PLATINUM';
  return u;
}

/** Map enrollment tier to Course.enrollmentsByTier key */
function enrollmentsByTierKey(tier) {
  return normalizeEnrollmentTier(tier).toLowerCase();
}

function canViewVideo(tier) {
  const t = normalizeEnrollmentTier(tier);
  return t === 'GOLD' || t === 'PLATINUM';
}

function canViewNotes(tier) {
  const t = normalizeEnrollmentTier(tier);
  return t === 'BASIC' || t === 'GOLD' || t === 'PLATINUM';
}

function canDownloadCourseNotes(tier) {
  return normalizeEnrollmentTier(tier) === 'PLATINUM';
}

function canDownloadVideo(tier) {
  return normalizeEnrollmentTier(tier) === 'PLATINUM';
}

function tierRank(tier) {
  const t = normalizeEnrollmentTier(tier);
  return NORMAL_RANK[t] ?? -1;
}

/** Whether targetTier is strictly higher than currentTier */
function isUpgradePath(currentTier, targetTier) {
  return tierRank(targetTier) > tierRank(currentTier);
}

/** Course.pricingTiers[].tier (lowercase) → canonical key: basic | gold | platinum */
function normalizePricingTierName(tier) {
  const k = String(tier || '').trim().toLowerCase();
  if (k === 'standard') return 'gold';
  if (k === 'premium') return 'platinum';
  return k;
}

/** Map purchase plan (BASIC|GOLD|...) to same canonical tier string */
function canonicalPurchaseTier(planUpper) {
  return normalizeEnrollmentTier(planUpper);
}

/** Final amount for a pricing tier row (respects discount + optional cached finalPrice). */
function tierFinalAmount(tier) {
  if (!tier) return 0;
  if (tier.finalPrice != null && tier.finalPrice >= 0) return tier.finalPrice;
  const p = tier.price || 0;
  const d = tier.discount || 0;
  return Math.round((p * (100 - d)) / 100);
}

/**
 * Student API: always expose three plans — basic, gold, platinum.
 * - Legacy `standard` + `premium`: inject Basic at 50% of Gold (standard) final price if no `basic` row.
 * - Legacy `premium` only: infer Basic + Gold from Platinum so all three plans appear.
 */
function normalizePricingTiersForDisplay(pricingTiers) {
  if (!Array.isArray(pricingTiers) || pricingTiers.length === 0) return [];

  const active = pricingTiers.filter((t) => t && t.isActive !== false);
  const hasBasic = active.some((t) => t.tier === 'basic');
  const goldRow = active.find((t) => t.tier === 'gold') || active.find((t) => t.tier === 'standard');
  const platinumRow =
    active.find((t) => t.tier === 'platinum') || active.find((t) => t.tier === 'premium');

  const out = [];

  // Premium/Platinum only — synthesize lower tiers so Basic is never missing from the catalog.
  if (!goldRow && platinumRow) {
    const pf = tierFinalAmount(platinumRow);
    const basicPrice = Math.max(0, Math.round(pf * 0.4));
    const goldPrice = Math.max(0, Math.round(pf * 0.65));
    out.push({
      tier: 'basic',
      price: basicPrice,
      discount: 0,
      finalPrice: basicPrice,
      features: [],
      isActive: true,
    });
    out.push({
      tier: 'gold',
      price: goldPrice,
      discount: 0,
      finalPrice: goldPrice,
      features: [],
      isActive: true,
    });
    out.push({
      ...platinumRow,
      tier: platinumRow.tier === 'premium' ? 'platinum' : platinumRow.tier,
    });
    return out;
  }

  if (hasBasic) {
    const b = active.find((t) => t.tier === 'basic');
    out.push({ ...b, tier: 'basic' });
  } else if (goldRow) {
    const goldFinal = tierFinalAmount(goldRow);
    const basicPrice = Math.max(0, Math.round(goldFinal * 0.5));
    out.push({
      tier: 'basic',
      price: basicPrice,
      discount: 0,
      finalPrice: basicPrice,
      features: [],
      isActive: true,
    });
  }

  if (goldRow) {
    out.push({
      ...goldRow,
      tier: goldRow.tier === 'standard' ? 'gold' : goldRow.tier,
    });
  }

  if (platinumRow) {
    out.push({
      ...platinumRow,
      tier: platinumRow.tier === 'premium' ? 'platinum' : platinumRow.tier,
    });
  }

  return out;
}

/**
 * Calculate expiration date for a new enrollment.
 * @param {Date} enrollmentDate - Date of enrollment (typically Date.now())
 * @param {number} durationMonths - How many months until expiration (default: 12)
 * @returns {Date} expiration date
 */
function calculateEnrollmentExpirationDate(enrollmentDate = new Date(), durationMonths = 12) {
  const date = new Date(enrollmentDate);
  date.setMonth(date.getMonth() + durationMonths);
  return date;
}

/**
 * Check if an enrollment is expired.
 * @param {Object} enrollment - enrollment document with expiresAt field
 * @returns {boolean} true if enrollment is expired, false otherwise
 */
function isEnrollmentExpired(enrollment) {
  if (!enrollment || !enrollment.expiresAt) return false;
  return new Date() > new Date(enrollment.expiresAt);
}

/**
 * Get enrollment expiration status.
 * @param {Object} enrollment - enrollment document
 * @returns {Object} { isExpired: boolean, expiresAt: Date|null, daysRemaining: number }
 */
function getEnrollmentExpirationStatus(enrollment) {
  if (!enrollment || !enrollment.expiresAt) {
    return { isExpired: false, expiresAt: null, daysRemaining: null };
  }

  const now = new Date();
  const expiresAt = new Date(enrollment.expiresAt);
  const isExpired = now > expiresAt;
  const daysRemaining = isExpired ? 0 : Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));

  return { isExpired, expiresAt, daysRemaining };
}

module.exports = {
  normalizeEnrollmentTier,
  enrollmentsByTierKey,
  canViewVideo,
  canViewNotes,
  canDownloadCourseNotes,
  canDownloadVideo,
  tierRank,
  isUpgradePath,
  normalizePricingTierName,
  canonicalPurchaseTier,
  tierFinalAmount,
  normalizePricingTiersForDisplay,
  calculateEnrollmentExpirationDate,
  isEnrollmentExpired,
  getEnrollmentExpirationStatus,
};
