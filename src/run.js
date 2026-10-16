import { clearPath, itemCells } from './loot.js';

export const TUNNEL_REACH = 0.7;

export function createRun(world, now = 0) {
  return { phase: 'exploring', entrance: { ...world.spawn }, startedAt: now, result: null };
}

export function atTunnel(run, world, player) {
  return run.phase === 'exploring' && Math.hypot(player.x - run.entrance.x, player.y - run.entrance.y) <= TUNNEL_REACH && clearPath(world, player, run.entrance);
}

export function finishRun(run, world, player, loot, now) {
  if (run.phase !== 'exploring' || loot.held || !atTunnel(run, world, player)) return null;
  // Snapshot only what was packed, never loose loot or an extra cursor item.
  const items = loot.bag.map(item => ({ ...item }));
  run.result = { items, count: items.length, slots: items.reduce((n, item) => n + itemCells(item).length, 0), elapsed: Math.max(0, Math.floor((now - run.startedAt) / 1000)) };
  run.phase = 'results';
  return run.result;
}
