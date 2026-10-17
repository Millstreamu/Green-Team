import { PROGRESSION } from './config.js';
import { LOOT_TYPES, itemSaleValue } from './loot.js';

export const PROFILE_SAVE_KEY = 'green-team-goblin-v1';
export const PERSONAL_UPGRADES = Object.freeze({
  smoke: Object.freeze({ name: 'Smoke bomb recipe', cost: PROGRESSION.recipeCosts.smoke, kind: 'recipe' }),
  quickSearch: Object.freeze({ name: 'Quick fingers', cost: PROGRESSION.quickSearchCost, kind: 'passive' })
});
export function createProfile(id = 'local-goblin') { return { id, xp: 0, earnedXp: 0, purchases: [] }; }
export function loadProfile(storage) {
  try {
    const saved = JSON.parse(storage?.getItem(PROFILE_SAVE_KEY) ?? 'null');
    if (![1, 2].includes(saved?.version) || typeof saved.id !== 'string' || !saved.id || saved.id.length > 128 || !Number.isSafeInteger(saved.xp) || saved.xp < 0) return createProfile();
    if (saved.version === 1) {
      // Preserve previously automatic recipe knowledge; new profiles must buy it.
      return { id: saved.id, xp: saved.xp, earnedXp: saved.xp, purchases: saved.xp >= 50 ? ['smoke'] : [] };
    }
    if (!Number.isSafeInteger(saved.earnedXp) || saved.earnedXp < saved.xp || !Array.isArray(saved.purchases)
      || saved.purchases.some(id => typeof id !== 'string' || !Object.hasOwn(PERSONAL_UPGRADES, id)) || new Set(saved.purchases).size !== saved.purchases.length) return createProfile();
    return { id: saved.id, xp: saved.xp, earnedXp: saved.earnedXp, purchases: [...saved.purchases] };
  } catch { return createProfile(); }
}
export function saveProfile(profile, storage) {
  try {
    storage?.setItem(PROFILE_SAVE_KEY, JSON.stringify({ version: 2, id: profile.id, xp: profile.xp, earnedXp: Math.max(profile.earnedXp ?? 0, profile.xp), purchases: profile.purchases ?? [] }));
    return !!storage;
  } catch { return false; }
}
export function teamHaulXp(result) {
  if (result.outcome !== 'escaped') return 0;
  const gold = result.items.reduce((sum, item) => {
    if (item.debugSupply || !LOOT_TYPES[item.type]?.sellValue) return sum;
    const value = itemSaleValue(item);
    return Number.isSafeInteger(value) && value > 0 ? Math.min(Number.MAX_SAFE_INTEGER, sum + value) : sum;
  }, 0);
  return Math.min(Number.MAX_SAFE_INTEGER, Math.floor(gold * PROGRESSION.xpPerGold));
}
// A shared haul can reward several profiles equally. Each profile is credited
// once for this live result; the future server needs durable run/profile IDs.
export function awardPersonalXp(profile, teamResult) {
  teamResult.xpAwards ??= new Map();
  if (teamResult.xpAwards.has(profile.id)) return teamResult.xpAwards.get(profile.id);
  const total = Math.min(Number.MAX_SAFE_INTEGER, profile.xp + teamHaulXp(teamResult));
  const receipt = Object.freeze({ earned: total - profile.xp, total });
  profile.earnedXp = Math.min(Number.MAX_SAFE_INTEGER, Math.max(profile.earnedXp ?? 0, profile.xp) + receipt.earned);
  profile.xp = total; teamResult.xpAwards.set(profile.id, receipt);
  return receipt;
}

export function knowsRecipe(profile, type) {
  return type === 'snare' || type === 'smoke' && ownsUpgrade(profile, 'smoke');
}
export function ownsUpgrade(profile, id) { return typeof id === 'string' && Object.hasOwn(PERSONAL_UPGRADES, id) && (profile?.purchases ?? []).includes(id); }
export function buyPersonalUpgrade(profile, id) {
  if (typeof id !== 'string' || !Object.hasOwn(PERSONAL_UPGRADES, id) || ownsUpgrade(profile, id) || !Number.isSafeInteger(profile.xp) || profile.xp < PERSONAL_UPGRADES[id].cost) return false;
  profile.earnedXp = Math.max(profile.earnedXp ?? 0, profile.xp);
  profile.xp -= PERSONAL_UPGRADES[id].cost;
  profile.purchases ??= []; profile.purchases.push(id); return true;
}
export function personalSearchRate(profile) { return ownsUpgrade(profile, 'quickSearch') ? 1 + PROGRESSION.quickSearchBonus : 1; }
