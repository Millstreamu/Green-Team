// Trial tuning shared by solo and the authoritative server.
export const AWARENESS = Object.freeze({ sprintBonus: .2, sprintSeconds: 3, sprintCooldown: 20, veilSeconds: 3, noticeMultiplier: 2 });
export function triggerPanicSprint(player) {
 if (!player.panicSprint || player.state !== 'active' || player.panicCooldown > 0) return false;
 player.panicLeft = AWARENESS.sprintSeconds; player.panicCooldown = AWARENESS.sprintCooldown; return true;
}
export function tickPassiveEffects(player, dt) {
 const step = Math.max(0, dt);
 for (const key of ['panicLeft','panicCooldown','searchVeilLeft']) player[key] = Math.max(0, (player[key] ?? 0) - step);
 if (player.state !== 'active') { player.panicLeft = 0; player.searchVeilLeft = 0; }
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
export function passiveStatus(player) {
 return [player.panicLeft > 0 ? `HASTE ${Math.ceil(player.panicLeft)}s` : '', player.searchVeilLeft > 0 ? `VEIL ${Math.ceil(player.searchVeilLeft)}s` : ''].filter(Boolean).join(' · ');
}
