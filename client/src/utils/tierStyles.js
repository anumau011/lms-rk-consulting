/** UI labels and Tailwind classes for subscription tiers (aligned with backend BASIC / GOLD / PLATINUM). */

export const TIER_KEYS = ['basic', 'gold', 'platinum'];

/** Normalize API tier string to BASIC | GOLD | PLATINUM */
export function normalizeTier(t) {
  const u = String(t || '').toUpperCase();
  if (u === 'STANDARD') return 'GOLD';
  if (u === 'PREMIUM') return 'PLATINUM';
  return u;
}

export const TIER_UI = {
  BASIC: {
    label: 'Basic',
    shortLabel: 'Basic',
    description: 'Notes (view only)',
    pill: 'bg-slate-600 text-white border border-slate-400',
    card: 'bg-slate-50 border-slate-200',
    text: 'text-slate-800',
    accent: '#475569',
    selectActive: 'bg-slate-700 text-white border-slate-600',
    selectInactive: 'bg-white text-slate-700 hover:bg-slate-50 border-slate-300',
  },
  GOLD: {
    label: 'Gold',
    shortLabel: 'Gold',
    description: 'Video + notes (view)',
    pill: 'bg-amber-500 text-white border border-amber-400',
    card: 'bg-amber-50 border-amber-200',
    text: 'text-amber-950',
    accent: '#d97706',
    selectActive: 'bg-amber-500 text-white border-amber-500',
    selectInactive: 'bg-white text-amber-900 hover:bg-amber-50 border-amber-300',
  },
  PLATINUM: {
    label: 'Platinum',
    shortLabel: 'Platinum',
    description: 'Video + notes (download)',
    pill: 'bg-gradient-to-r from-slate-800 to-cyan-900 text-cyan-50 border border-cyan-400',
    card: 'bg-gradient-to-br from-slate-900 to-cyan-950 border-cyan-600/50',
    text: 'text-cyan-50',
    accent: '#22d3ee',
    selectActive: 'bg-gradient-to-r from-slate-800 to-cyan-900 text-white border-cyan-400',
    selectInactive: 'bg-white text-cyan-950 hover:bg-cyan-50 border-cyan-300',
  },
};

export function tierUi(upperOrKey) {
  const k = normalizeTier(upperOrKey);
  return TIER_UI[k] || TIER_UI.GOLD;
}

const RANK = { BASIC: 0, GOLD: 1, PLATINUM: 2 };

export function tierRank(t) {
  return RANK[normalizeTier(t)] ?? -1;
}

/** Find pricing tier row: supports basic/gold/platinum and legacy standard/premium */
export function findPricingTierRow(courseData, planKey) {
  const tiers = courseData?.pricingTiers || [];
  const key = String(planKey).toLowerCase();
  if (key === 'gold') {
    return tiers.find((t) => t.tier === 'gold' || t.tier === 'standard');
  }
  if (key === 'platinum') {
    return tiers.find((t) => t.tier === 'platinum' || t.tier === 'premium');
  }
  if (key === 'basic') {
    return tiers.find((t) => t.tier === 'basic');
  }
  return tiers.find((t) => t.tier === key);
}

/**
 * Amount to charge / display for a plan (same rules as backend tierFinalAmount).
 * Uses finalPrice when set; otherwise price minus discount %.
 * Falls back to course.price.basic|gold|platinum from catalog API when tier row is missing.
 */
export function getTierFinalAmount(courseData, planKey) {
  const row = findPricingTierRow(courseData, planKey);
  if (!row) {
    const fallback = courseData?.price?.[planKey];
    if (fallback != null && fallback !== '') return Number(fallback);
    return null;
  }
  if (row.finalPrice != null && row.finalPrice >= 0) return Number(row.finalPrice);
  const p = Number(row.price) || 0;
  const d = Number(row.discount) || 0;
  return Math.round((p * (100 - d)) / 100);
}

export function planKeyFromTier(upper) {
  const n = normalizeTier(upper);
  if (n === 'BASIC') return 'basic';
  if (n === 'GOLD') return 'gold';
  if (n === 'PLATINUM') return 'platinum';
  return 'gold';
}
