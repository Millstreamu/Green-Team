import { PROGRESSION } from './config.js';
import { LOOT_TYPES, itemSaleValue } from './loot.js';

export const PROFILE_SAVE_KEY = 'green-team-goblin-v1';
export const PERSONAL_UPGRADES = Object.freeze({
  orb: Object.freeze({ name: 'Scrying orb recipe', cost: PROGRESSION.recipeCosts.orb, kind: 'recipe' }),
  lucky: Object.freeze({ name: 'Lucky potion recipe', cost: PROGRESSION.recipeCosts.lucky, kind: 'recipe' }),
  vanish: Object.freeze({ name: 'Vanish potion recipe', cost: PROGRESSION.recipeCosts.vanish, kind: 'recipe' }),
  disguise: Object.freeze({ name: 'Guard disguise recipe', cost: PROGRESSION.recipeCosts.disguise, kind: 'recipe' }),
  bell: Object.freeze({ name: 'Clang bell recipe', cost: PROGRESSION.recipeCosts.bell, kind: 'recipe' }),
  dart: Object.freeze({ name: 'Sleep dart recipe', cost: PROGRESSION.recipeCosts.dart, kind: 'recipe' }),
  smoke: Object.freeze({ name: 'Smoke bomb recipe', cost: PROGRESSION.recipeCosts.smoke, kind: 'recipe' }),
  panicSprint: Object.freeze({ name: 'Panic Sprint', cost: 50, kind: 'passive' }),
  hideSense: Object.freeze({ name: 'Hideout Sense', cost: 50, kind: 'passive' }),
  searchVeil: Object.freeze({ name: 'Fade Away', cost: 75, kind: 'passive' }),
  quietHands: Object.freeze({ name: 'Quiet Hands', cost: 75, kind: 'passive' }),
  luckyGoblin: Object.freeze({ name: 'Lucky Goblin', cost: 50, kind: 'passive' }),
  quickSearch: Object.freeze({ name: 'Quick fingers', cost: PROGRESSION.quickSearchCost, kind: 'passive' })
});
export function createProfile(id = 'local-goblin') { return { id, xp: 0, earnedXp: 0, purchases: [], activePassives: [] }; }
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
    if (saved.activePassives !== undefined && !validActivePassives(saved)) return createProfile();
    return { id: saved.id, xp: saved.xp, earnedXp: saved.earnedXp, purchases: [...saved.purchases], activePassives: [...activePassives(saved)] };
  } catch { return createProfile(); }
}
export function saveProfile(profile, storage) {
  try {
    storage?.setItem(PROFILE_SAVE_KEY, JSON.stringify({ version: 2, id: profile.id, xp: profile.xp, earnedXp: Math.max(profile.earnedXp ?? 0, profile.xp), purchases: profile.purchases ?? [], activePassives: [...activePassives(profile)] }));
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
// once for this live result. The server commits all profile/bank changes
// atomically and never restores a live dungeon after restart.
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
  return ['snare', 'lunch'].includes(type) || ['smoke', 'dart', 'bell', 'disguise', 'vanish', 'lucky', 'orb'].includes(type) && ownsUpgrade(profile, type);
}
export function ownsUpgrade(profile, id) { return typeof id === 'string' && Object.hasOwn(PERSONAL_UPGRADES, id) && (profile?.purchases ?? []).includes(id); }
export function buyPersonalUpgrade(profile, id) {
  if (typeof id !== 'string' || !Object.hasOwn(PERSONAL_UPGRADES, id) || ownsUpgrade(profile, id) || !Number.isSafeInteger(profile.xp) || profile.xp < PERSONAL_UPGRADES[id].cost) return false;
  profile.earnedXp = Math.max(profile.earnedXp ?? 0, profile.xp);
  profile.xp -= PERSONAL_UPGRADES[id].cost;
  profile.purchases ??= []; profile.purchases.push(id); return true;
}
export function personalSearchRate(profile) { return passiveActive(profile, 'quickSearch') ? 1 + PROGRESSION.quickSearchBonus : 1; }

// Display-only level; spending available XP never reduces lifetime progress.
export function profileLevel(profile) { return 1 + Math.floor((profile.earnedXp ?? 0) / PROGRESSION.levelXp); }

export const PASSIVE_IDS = Object.freeze(['quickSearch','quietHands','luckyGoblin','panicSprint','hideSense','searchVeil']);
export const PASSIVE_LIMIT = 3;
export function activePassives(profile) {
  // Existing Quick Fingers purchases remain equipped on old saves.
  return profile?.activePassives ?? (ownsUpgrade(profile,'quickSearch') ? ['quickSearch'] : []);
}
export function validActivePassives(profile) {
  const ids=profile?.activePassives;
  return Array.isArray(ids) && ids.length<=PASSIVE_LIMIT && new Set(ids).size===ids.length && ids.every(id=>PASSIVE_IDS.includes(id)&&ownsUpgrade(profile,id));
}
export function passiveActive(profile,id) { return PASSIVE_IDS.includes(id)&&ownsUpgrade(profile,id)&&activePassives(profile).includes(id); }
export function setPassiveActive(profile,id,active) {
  if(typeof active!=='boolean'||!PASSIVE_IDS.includes(id)||!ownsUpgrade(profile,id)||passiveActive(profile,id)===active)return false;
  const current=[...activePassives(profile)];
  if(active&&current.length>=PASSIVE_LIMIT)return false;
  profile.activePassives=active?[...current,id]:current.filter(value=>value!==id);return true;
}
export function passiveEffects(profile) { return {searchRate:personalSearchRate(profile),quietHands:passiveActive(profile,'quietHands'),passiveLuck:passiveActive(profile,'luckyGoblin'),panicSprint:passiveActive(profile,'panicSprint'),hideSense:passiveActive(profile,'hideSense'),searchVeil:passiveActive(profile,'searchVeil')}; }
