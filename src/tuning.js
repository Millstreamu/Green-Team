import { COMBAT, HEAT, SEARCH, SEARCH_LOOT } from './config.js';

// One list defines the editor, server validation and run settings.
export const TUNING_FIELDS = Object.freeze([
  ['patrolSpeed', 'Patrol speed', 'tiles/second', .2, 8, .1, 'combat', COMBAT.patrolSpeed],
  ['chaseSpeed', 'Chase speed', 'tiles/second; heat still increases speed', .2, 8, .1, 'combat', COMBAT.chaseSpeed],
  ['searchSpeed', 'Guard search speed', 'tiles/second', .2, 8, .1, 'combat', COMBAT.searchSpeed],
  ['sight', 'Normal sight distance', 'tiles', 1, 16, .5, 'combat', COMBAT.sight],
  ['alertSight', 'Alerted sight distance', 'tiles', 1, 20, .5, 'combat', COMBAT.alertSight],
  ['noticeTime', 'Time to notice a goblin', 'seconds', .1, 5, .05, 'combat', COMBAT.noticeTime],
  ['windup', 'Pause before a swing', 'seconds', .05, 2, .01, 'combat', COMBAT.windup],
  ['cooldown', 'Attack recovery', 'seconds', .1, 3, .05, 'combat', COMBAT.cooldown],
  ['alertsPerGuard', 'Alerts per extra guard', 'whole alerts', 1, 20, 1, 'heat', HEAT.alertsPerGuard],
  ['chestTime', 'Chest search time', 'seconds, before personal bonuses', .2, 15, .1, 'search', SEARCH.chestTime],
  ['cupboardTime', 'Cupboard search time', 'seconds, before personal bonuses', .2, 15, .1, 'search', SEARCH.cupboardTime],
  ['crateTime', 'Crate search time', 'seconds, before personal bonuses', .2, 15, .1, 'search', SEARCH.crateTime],
  ['nearEmptyChance', 'Empty searches near entrance', 'chance, 0 to 1 (0.7 = 70%)', 0, 1, .05, 'loot', SEARCH_LOOT.nearEmptyChance],
  ['farEmptyChance', 'Empty searches far from entrance', 'chance, 0 to 1 (0.5 = 50%)', 0, 1, .05, 'loot', SEARCH_LOOT.farEmptyChance],
  ['nearMaterialChance', 'Materials near entrance', 'chance after a nonempty roll, 0 to 1', 0, 1, .05, 'loot', SEARCH_LOOT.nearMaterialChance],
  ['twoItemChance', 'Two items instead of one', 'chance after a nonempty roll, 0 to 1', 0, 1, .05, 'loot', SEARCH_LOOT.twoItemChance]
].map(([id, label, unit, min, max, step, group, value]) => Object.freeze({ id, label, unit, min, max, step, group, value })));
export const DEFAULT_TUNING = Object.freeze(Object.fromEntries(TUNING_FIELDS.map(f => [f.id, f.value])));
export function validateTuning(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== TUNING_FIELDS.length
    || TUNING_FIELDS.some(f => !Object.hasOwn(value, f.id) || typeof value[f.id] !== 'number' || !Number.isFinite(value[f.id])
      || value[f.id] < f.min || value[f.id] > f.max || f.step === 1 && !Number.isInteger(value[f.id]))) throw Error('Invalid tuning settings. Check the shown limits.');
  return { ...value };
}
// V66 saved every editor field except material mix. Preserve that implicit75%
// when loading exactly the old schema; submitted edits still require all fields.
export function restoreTuning(value) {
  if (value === undefined) return { ...DEFAULT_TUNING };
  if (value && typeof value === 'object' && !Array.isArray(value)
    && !Object.hasOwn(value, 'nearMaterialChance') && Object.keys(value).length === TUNING_FIELDS.length - 1) {
    return validateTuning({ ...value, nearMaterialChance: .75 });
  }
  return validateTuning(value);
}
export function runTuning(value = DEFAULT_TUNING) {
  const values = validateTuning(value);
  const result = { combat: { ...COMBAT }, heat: { ...HEAT }, search: { ...SEARCH }, loot: { ...SEARCH_LOOT } };
  for (const f of TUNING_FIELDS) result[f.group][f.id] = values[f.id];
  return result;
}
