import { SMOKE } from './config.js';

export function useSmoke(loot, player, clouds) {
  if (player.hiding || loot.held || player.state !== 'active') return false;
  const index = loot.bag.findIndex(item => item.type === 'smoke');
  if (index < 0) return false;
  const [item] = loot.bag.splice(index, 1);
  clouds.push({ id: item.id, x: player.x, y: player.y, radius: SMOKE.radius, left: SMOKE.duration });
  return true;
}
export function updateSmoke(clouds, dt) {
  for (let i = clouds.length - 1; i >= 0; i--) {
    clouds[i].left -= Math.max(0, dt);
    if (clouds[i].left <= 0) clouds.splice(i, 1);
  }
}
export function smokeBlocksSight(from, to, clouds = []) {
  const dx = to.x - from.x, dy = to.y - from.y, lengthSquared = dx * dx + dy * dy;
  return clouds.some(cloud => {
    if (cloud.left <= 0) return false;
    const t = lengthSquared ? Math.max(0, Math.min(1, ((cloud.x - from.x) * dx + (cloud.y - from.y) * dy) / lengthSquared)) : 0;
    return Math.hypot(from.x + t * dx - cloud.x, from.y + t * dy - cloud.y) <= cloud.radius;
  });
}
