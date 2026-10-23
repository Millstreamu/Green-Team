import { DISGUISE, VANISH } from './config.js';
import { cancelPlacement } from './traps.js';
import { breakShadow } from './shadows.js';

export const POTIONS = Object.freeze({
  lucky: Object.freeze({ runEffect: 'lucky' }),
  disguise: Object.freeze({ timer: 'disguiseLeft', seconds: DISGUISE.seconds }),
  vanish: Object.freeze({ timer: 'vanishLeft', seconds: VANISH.seconds })
});
const concealmentPotions = Object.values(POTIONS).filter(p => p.timer);
export function isPotion(type) { return Object.hasOwn(POTIONS, type); }
// Ready gear reserves the selected packed copy; drinking spends it once.
export function equipPotion(placement, loot, player, id) {
  if (loot.held || player.hiding || player.state !== 'active' || !loot.bag.some(i => i.id === id && isPotion(i.type))) return false;
  cancelPlacement(placement); player.berryId = null; player.orbId = null; player.dartId = null; player.bellId = null; player.potionId = id; return true;
}
export function drinkPotion(loot, player, id = player.potionId) {
  if (!id || player.potionId !== id || loot.held || player.hiding || player.state !== 'active') return false;
  const index = loot.bag.findIndex(i => i.id === id && isPotion(i.type)); if (index < 0) return false;
  const potion = POTIONS[loot.bag[index].type];
  if (potion.runEffect ? player[potion.runEffect] === true : concealmentPotions.some(p => player[p.timer] > 0)) return false;
  loot.bag.splice(index, 1); player.potionId = null;
  if (potion.runEffect) { breakDisguise(player); player[potion.runEffect] = true; }
  else player[potion.timer] = potion.seconds;
  return true;
}
// Keep the old disguise-only API/command strict for existing clients and tests.
export function equipDisguise(placement, loot, player, id) {
  return loot.bag.some(i => i.id === id && i.type === 'disguise') && equipPotion(placement, loot, player, id);
}
export function drinkDisguise(loot, player, id = player.potionId) {
  return loot.bag.some(i => i.id === id && i.type === 'disguise') && drinkPotion(loot, player, id);
}
// Searching and successful gear use break either concealment effect.
export function breakDisguise(player) { for (const p of concealmentPotions) player[p.timer] = 0; breakShadow(player); }
export function tickDisguise(player, dt) {
  for (const p of concealmentPotions) player[p.timer] = player.state === 'active' ? Math.max(0, (player[p.timer] ?? 0) - Math.max(0, dt)) : 0;
}
