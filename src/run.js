import { clearPath, itemCells, LOOT_TYPES } from './loot.js';

export const TUNNEL_REACH = 0.7;

export function createRun(world, now = 0) {
  return { phase: 'exploring', entrance: { ...world.spawn }, startedAt: now, job: world.job ? { ...world.job } : null, result: null };
}

export function atTunnel(run, world, player) {
  return run.phase === 'exploring' && player.state !== 'down' && Math.hypot(player.x - run.entrance.x, player.y - run.entrance.y) <= TUNNEL_REACH && clearPath(world, player, run.entrance);
}

export function finishRun(run, world, player, loot, now) {
  if (run.phase !== 'exploring' || loot.held || !atTunnel(run, world, player)) return null;
  // Snapshot only what was packed, never loose loot or an extra cursor item.
  const items = loot.bag.filter(item => !LOOT_TYPES[item.type].equipment).map(item => ({ ...item }));
  run.result = { outcome: 'escaped', job: run.job, items, count: items.length, slots: items.reduce((n, item) => n + itemCells(item).length, 0), elapsed: Math.max(0, Math.floor((now - run.startedAt) / 1000)) };
  run.phase = 'results';
  return run.result;
}

// Solo fallback: no active teammate remains, so the downed player's run is over.
// A future team session can wait for recovery before choosing this outcome.
export function loseRun(run, loot, now) {
  if (run.phase !== 'exploring') return null;
  const lostItems = [...loot.bag, ...(loot.held ? [loot.held] : [])].map(item => ({ ...item }));
  run.result = { outcome: 'down', job: run.job, items: [], count: 0, slots: 0, lostItems, elapsed: Math.max(0, Math.floor((now - run.startedAt) / 1000)) };
  loot.bag.length = 0; loot.held = null; run.phase = 'results';
  return run.result;
}
