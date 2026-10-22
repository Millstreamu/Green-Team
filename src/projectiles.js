import { COMBAT } from './config.js';
import { canStand } from './world.js';

// Shared swept collision for small thrown/fired items. Impact happens before
// guards act; walls/props/locks and the first guard stop the projectile.
export function sweepProjectiles(world, shots, guards, dt, speed, hit) {
  const hits = [];
  for (let i = shots.length - 1; i >= 0; i--) {
    const shot = shots[i], distance = Math.min(shot.remaining, speed * Math.max(0, dt));
    const steps = Math.max(1, Math.ceil(distance / .05)); let stopped = false;
    for (let step = 0; step < steps; step++) {
      const amount = distance / steps;
      shot.x += shot.dx * amount; shot.y += shot.dy * amount; shot.remaining = Math.max(0, shot.remaining - amount);
      if (!canStand(world, shot.x, shot.y, .04)) { stopped = true; break; }
      const guard = guards.find(g => Math.hypot(g.x - shot.x, g.y - shot.y) <= COMBAT.guardRadius + .07);
      if (guard) { hits.push({ id: shot.id, guardId: guard.id, ...hit(guard, shot) }); stopped = true; break; }
    }
    if (stopped || shot.remaining <= .000001) shots.splice(i, 1);
  }
  return hits;
}
