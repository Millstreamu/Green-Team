import { ABILITY, COMBAT } from './config.js';
// Trial tuning shared by solo and the authoritative server.
export const AWARENESS = Object.freeze({ sprintBonus: .2, sprintSeconds: 3, sprintCooldown: 20, veilSeconds: 3, noticeMultiplier: 2 });
export function triggerPanicSprint(player) {
 if (!player.panicSprint || player.state !== 'active' || player.panicCooldown > 0) return false;
 player.panicLeft = AWARENESS.sprintSeconds; player.panicCooldown = AWARENESS.sprintCooldown; return true;
}
export function tickPassiveEffects(player, dt) {
 const step = Math.max(0, dt);
 for (const key of ['panicLeft','panicCooldown','searchVeilLeft','anchorCooldown','bearingLeft']) player[key] = Math.max(0, (player[key] ?? 0) - step);
 if (player.state !== 'active') { player.panicLeft = 0; player.searchVeilLeft = 0; }
 // Treasure Sense: the arrow appears for bearingShow seconds every bearingEvery seconds.
 if (player.treasureBearing && player.state === 'active') {
  player.bearingClock = (player.bearingClock ?? 0) + step;
  if (player.bearingClock >= ABILITY.bearingEvery) { player.bearingClock -= ABILITY.bearingEvery; player.bearingLeft = ABILITY.bearingShow; }
 }
}
// Straight-line direction to the locked treasure room's centre, or null.
export function treasureBearing(world, player) {
 if (!player.treasureBearing || !(player.bearingLeft > 0) || !world.treasure || world.treasure.unlocked) return null;
 const room = world.rooms[world.treasure.roomIndex]; if (!room) return null;
 return Math.atan2(room.cy + .5 - player.y, room.cx + .5 - player.x);
}
export function passiveMoveRate(player) { return player.state === 'active' && player.panicSprint && player.panicLeft > 0 ? 1 + AWARENESS.sprintBonus : 1; }
export function passiveNoticeRate(player) { return player.searchVeil && player.searchVeilLeft > 0 ? AWARENESS.noticeMultiplier : 1; }
export function completeSearchPassive(player) { if (player.searchVeil && player.state === 'active') player.searchVeilLeft = AWARENESS.veilSeconds; }
export function hiddenGuardMark(player, guards) {
 if (!player.hideSense || !player.hiding || player.state !== 'active') return null;
 return guards.filter(g => Number.isFinite(g.x) && Number.isFinite(g.y)).slice().sort((a,b) => Math.hypot(a.x-player.x,a.y-player.y)-Math.hypot(b.x-player.x,b.y-player.y) || String(a.id).localeCompare(String(b.id)))[0] ?? null;
}
export function drawHiddenGuardMark(ctx, player, guards) {
 const guard = hiddenGuardMark(player, guards); if (!guard) return;
 const x = Math.floor(guard.x)*2, y = Math.floor(guard.y)*2;
 ctx.fillStyle = '#efb568'; ctx.fillRect(x-1,y-1,4,4);
 ctx.fillStyle = '#49352b'; ctx.fillRect(x,y,2,2);
}
// Tough Hide: call after createVitality at raid start.
export function applyAbilityVitality(player) {
 if (!player.extraHeart) return;
 player.maxHealth = COMBAT.health + ABILITY.extraHearts; player.health = player.maxHealth;
}
// Haggler: tag the items whose sale bonus belongs to a Haggler (their sack, or carted by them).
export function markHagglerItems(items, haggler) { for (const item of items) if (haggler(item)) item.haggled = true; return items; }
export function passiveStatus(player) {
 return [player.panicLeft > 0 ? `HASTE ${Math.ceil(player.panicLeft)}s` : '', player.searchVeilLeft > 0 ? `VEIL ${Math.ceil(player.searchVeilLeft)}s` : '', player.anchorCooldown > 0 ? `ANCHOR ${Math.ceil(player.anchorCooldown)}s` : '', player.shadowHidden ? 'UNSEEN IN SHADOW' : player.inShadow ? 'SHADOW' : ''].filter(Boolean).join(' · ');
}
