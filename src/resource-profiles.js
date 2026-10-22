import { LOOT_TYPES } from './loot.js';

// Relative weights within an already-successful material roll. Adding content
// here never changes empty-search, valuable, rare-item or item-count rolls.
function resourceProfile(common, containers) {
  for (const weights of Object.values(containers)) for (const [type, weight] of Object.entries(weights)) {
    if (!LOOT_TYPES[type]?.material || !Number.isSafeInteger(weight) || weight <= 0) throw Error(`Invalid resource weight: ${type}`);
  }
  if (common.some(type => !LOOT_TYPES[type]?.material)) throw Error('Invalid common resource');
  return Object.freeze({ common: Object.freeze([...common]), containers: Object.freeze(
    Object.fromEntries(Object.entries(containers).map(([type, weights]) => [type, Object.freeze({ ...weights })]))
  ) });
}
const manorStores = { meat: 4, cloth: 3, scrap: 1, berries: 1, mushroom: 1 };
const holdStores = { meat: 4, scrap: 3, cloth: 1, berries: 1, mushroom: 1 };
const sanctuaryStores = { berries: 4, mushroom: 4, cloth: 1, scrap: 1, meat: 1 };
export const RESOURCE_PROFILES = Object.freeze({
  manor: resourceProfile(['meat', 'cloth'], { chest: { cloth: 3, scrap: 1 }, cupboard: manorStores, crate: manorStores }),
  hold: resourceProfile(['scrap', 'meat'], { chest: { scrap: 3, cloth: 1 }, cupboard: holdStores, crate: holdStores }),
  sanctuary: resourceProfile(['berries', 'mushroom'], { chest: { scrap: 1, cloth: 1 }, cupboard: sanctuaryStores, crate: sanctuaryStores })
});
export function resourcePool(jobId, containerType, fallback) {
  const profile = Object.hasOwn(RESOURCE_PROFILES, jobId) ? RESOURCE_PROFILES[jobId] : null;
  const weights = profile && Object.hasOwn(profile.containers, containerType) ? profile.containers[containerType] : null;
  return weights ? Object.entries(weights).flatMap(([type, count]) => Array(count).fill(type)) : fallback;
}
export function commonFinds(jobId) {
  const profile = Object.hasOwn(RESOURCE_PROFILES, jobId) ? RESOURCE_PROFILES[jobId] : null;
  return profile ? profile.common.map(type => LOOT_TYPES[type].name).join(' and ') : 'Varied resources';
}
