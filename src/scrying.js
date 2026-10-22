import { SCRY } from './config.js';
import { cancelPlacement } from './traps.js';
import { breakDisguise } from './potions.js';

export function equipOrb(placement, loot, player, id) {
  if (loot.held || player.hiding || player.state !== 'active' || !loot.bag.some(i => i.id === id && i.type === 'orb')) return false;
  cancelPlacement(placement); player.berryId = null; player.dartId = null; player.bellId = null; player.potionId = null; player.orbId = id; return true;
}
export function useOrb(loot, player, guards, pings, id = player.orbId) {
  if (!id || player.orbId !== id || loot.held || player.hiding || player.state !== 'active') return false;
  const index = loot.bag.findIndex(i => i.id === id && i.type === 'orb'); if (index < 0) return false;
  // Copy coordinates once. Marks never hold live actor references or follow patrols.
  const marks = guards.filter(g => Number.isFinite(g.x) && Number.isFinite(g.y))
    .map(g => ({ guardId: g.id, x: g.x, y: g.y, distance: Math.hypot(g.x - player.x, g.y - player.y) }))
    .sort((a, b) => a.distance - b.distance || String(a.guardId).localeCompare(String(b.guardId)))
    .slice(0, SCRY.count).map(({ guardId, x, y }) => ({ guardId, x, y }));
  loot.bag.splice(index, 1); player.orbId = null; breakDisguise(player);
  pings.push({ id, ownerId: player.id, left: SCRY.seconds, marks }); return true;
}
export function updateScrying(pings, dt) {
  for (let i = pings.length - 1; i >= 0; i--) {
    pings[i].left = Math.max(0, pings[i].left - Math.max(0, dt)); if (!pings[i].left) pings.splice(i, 1);
  }
}
export function drawScrying(map, pings) {
  map.save(); map.strokeStyle = '#e6baff'; map.fillStyle = '#b86ae1'; map.lineWidth = 1;
  const seen = new Set();
  for (const ping of pings) if (ping.left > 0) for (const mark of ping.marks) {
    const x = Math.floor(mark.x) * 2 + 1, y = Math.floor(mark.y) * 2 + 1, key = `${x},${y}`;
    if (seen.has(key)) continue; seen.add(key);
    map.beginPath(); map.moveTo(x, y - 3); map.lineTo(x + 3, y); map.lineTo(x, y + 3); map.lineTo(x - 3, y); map.closePath(); map.fill(); map.stroke();
  }
  map.restore();
}
