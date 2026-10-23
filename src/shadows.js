import { SHADOW } from './config.js';

// Shadow is floor more than SHADOW.lightReach tiles from every torch whose
// wall-blocked light shape reaches it. Torches come from litTorches().
function insidePolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if ((a.y > point.y) !== (b.y > point.y) && point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
export function inShadow(torches, point) {
  return !torches.some(torch => Math.hypot(point.x - torch.x, point.y - torch.y) <= SHADOW.lightReach && insidePolygon(point, torch.polygon ?? []));
}
// Standing still in shadow for SHADOW.stillSeconds makes the goblin unseen
// beyond SHADOW.closeRange. Moving, a hit, searching (busy) or gear use resets it.
export function updateShadowStillness(player, dt, shadowed, busy = false) {
  const last = player.shadowAt, moved = !last || Math.hypot(player.x - last.x, player.y - last.y) > .01;
  const hit = Number.isFinite(player.shadowHealth) && player.health < player.shadowHealth;
  player.shadowAt = { x: player.x, y: player.y }; player.shadowHealth = player.health;
  player.inShadow = player.shadowStillness === true && player.state === 'active' && !player.hiding && shadowed;
  if (!player.inShadow || moved || hit || busy || player.moving) { player.shadowStill = 0; player.shadowHidden = false; return false; }
  player.shadowStill = (player.shadowStill ?? 0) + Math.max(0, dt);
  player.shadowHidden = player.shadowStill >= SHADOW.stillSeconds;
  return player.shadowHidden;
}
export function breakShadow(player) { player.shadowStill = 0; player.shadowHidden = false; }
