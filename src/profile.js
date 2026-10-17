import { PROGRESSION } from './config.js';
import { LOOT_TYPES, itemSaleValue } from './loot.js';

export const PROFILE_SAVE_KEY = 'green-team-goblin-v1';
export function createProfile(id = 'local-goblin') { return { id, xp: 0 }; }
export function loadProfile(storage) {
  try {
    const saved = JSON.parse(storage?.getItem(PROFILE_SAVE_KEY) ?? 'null');
    if (saved?.version !== 1 || typeof saved.id !== 'string' || !saved.id || saved.id.length > 128 || !Number.isSafeInteger(saved.xp) || saved.xp < 0) return createProfile();
    return { id: saved.id, xp: saved.xp };
  } catch { return createProfile(); }
}
export function saveProfile(profile, storage) {
  try {
    storage?.setItem(PROFILE_SAVE_KEY, JSON.stringify({ version: 1, id: profile.id, xp: profile.xp }));
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
  profile.xp = total; teamResult.xpAwards.set(profile.id, receipt);
  return receipt;
}

export function knowsRecipe(profile, type) {
  return Object.hasOwn(PROGRESSION.recipeXp, type) && (profile?.xp ?? 0) >= PROGRESSION.recipeXp[type];
}
