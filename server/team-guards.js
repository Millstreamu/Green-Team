import { createVitality, seesPlayer, updateGuard, strikePlayer } from '../src/guard.js';

// Advance each guard once per simulation step, independent of party size.
export function updateTeamGuard(world, guard, goblins, dt, clouds, heat) {
  const eligible = goblins.filter(p => p.connected && p.inRun && p.state === 'active');
  const current = eligible.find(p => p.id === guard.targetId);
  const committed = guard.windup > 0 || guard.swing > 0;
  const alerted = ['chase', 'search'].includes(guard.state) || !!guard.bellWasAlerted;
  const visible = eligible.filter(p => seesPlayer(world, guard, p, alerted, clouds))
    .sort((a, b) => Math.hypot(a.x - guard.x, a.y - guard.y) - Math.hypot(b.x - guard.x, b.y - guard.y) || a.id.localeCompare(b.id));
  const known = eligible.find(p => p.id === guard.knownHiding?.playerId && p.hiding?.spot.id === guard.knownHiding.spotId);
  // Keep a visible target; don't jitter between two goblins or snap a committed swing.
  const target = committed ? current : current && visible.includes(current) ? current : visible[0] ?? known ?? current;
  if (target && target.id !== guard.targetId) {
    guard.targetId = target.id;
    guard.lastSeenPending = false; guard.trail = []; guard.trailSource = null; guard.trailEnd = null; guard.trailLeft = 0; guard.repath = 0;
    if (guard.state === 'suspicious') guard.suspicion = 0;
  }
  const fallback = { id: null, ...createVitality(), ...(guard.lastSeen ?? guard.home), unavailable: true };
  const beforeWindup = guard.windup, hitIds = [];
  const event = updateGuard(world, guard, target ?? fallback, dt, clouds, heat);
  if (event.hit && target) hitIds.push(target.id);
  // The committed directional arc can also catch another standing goblin in it.
  if (beforeWindup > 0 && guard.windup === 0 && guard.swing > 0) {
    for (const p of eligible) if (p !== target && strikePlayer(world, guard, p)) hitIds.push(p.id);
  }
  if (!target && !committed) guard.targetId = null;
  return { ...event, hitIds, exposedId: event.exposed ? target?.id : null };
}
