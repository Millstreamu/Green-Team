import { RESCUE, SEARCH, COMBAT } from '../src/config.js';
import { createCages, rescueCandidate } from '../src/rescue.js';
import { createGuard, createVitality, seesPlayer } from '../src/guard.js';
import { canStand } from '../src/world.js';
import { findPath, followPath } from '../src/navigation.js';

export function createRescue(world, participants, guards, obstacles) {
  const cages = createCages(world, [...obstacles, ...guards.map(g => g.home)]), claims = new Map();
  for (const p of participants) { p.rescueAttempt = null; p.carrierId = null; p.cageId = null; }
  for (const cage of cages) {
    const g = createGuard(world, { roomIndex: cage.roomIndex, behaviour: 'lookout', patrol: [{ ...cage.post }] });
    Object.assign(g, { id: `${cage.id}-jailer`, stationary: true, jailer: true, angle: Math.PI / 2, watchAngles: [Math.PI / 2, 0] });
    guards.push(g);
  }
  const cancel = p => {
    if (p.rescueAttempt && claims.get(p.rescueAttempt.targetId) === p.id) claims.delete(p.rescueAttempt.targetId);
    p.rescueAttempt = null;
  };
  function drop(g) {
    const p = participants.find(p => p.id === g.captiveId);
    if (p?.state === 'carried' && p.carrierId === g.id) { p.state = 'down'; p.carrierId = null; p.x = g.x; p.y = g.y; }
    g.captiveId = null; g.captureTargetId = null; g.captureElapsed = 0; g.capturePath = []; g.destinationCageId = null;
    g.state = 'return'; g.repath = 0; g.moving = false;
  }
  function removeFromCage(p) {
    for (const cage of cages) cage.prisoners = cage.prisoners.filter(id => id !== p.id);
    p.cageId = null;
  }
  function nearestCage(g) {
    return cages.map(cage => ({ cage, path: findPath(world, g, cage.entry) }))
      .filter(c => c.path.length || Math.hypot(g.x - c.cage.entry.x, g.y - c.cage.entry.y) < .4)
      .sort((a, b) => a.path.length - b.path.length || a.cage.id.localeCompare(b.cage.id))[0]?.cage ?? null;
  }
  function walk(g, point, dt, speed) {
    g.captureRepath = (g.captureRepath ?? 0) - dt;
    if (!g.capturePath?.length || g.captureRepath <= 0) {
      g.capturePath = findPath(world, g, point); g.captureRepath = .5;
      if (Math.floor(g.x) === Math.floor(point.x) && Math.floor(g.y) === Math.floor(point.y)) g.capturePath = [{ x: point.x, y: point.y }];
    }
    g.moving = followPath(world, g, g.capturePath, speed * dt, COMBAT.guardRadius) > 0;
  }
  return {
    cages, cancel, nearestCage,
    disconnect(p) {
      cancel(p);
      for (const helper of participants) if (helper.rescueAttempt?.targetId === p.id) cancel(helper);
      for (const g of guards) if (g.captiveId === p.id || g.captureTargetId === p.id) drop(g);
      // A caged ghost stays in its cage; it cannot be rescued until it reconnects.
    },
    remove(p) {
      this.disconnect(p); removeFromCage(p); p.carrierId = null;
    },
    start(actor, targetId) {
      const target = participants.find(p => p.id === targetId), candidate = target && rescueCandidate(world, actor, target, cages);
      if (!candidate || actor.loot.held || actor.placement.itemId || actor.enteringHide) return false;
      if (claims.has(targetId) && claims.get(targetId) !== actor.id) return false;
      const lunch = candidate.kind === 'revive' ? actor.bag.find(i => i.type === 'lunch') : null;
      if (candidate.kind === 'revive' && !lunch) return false;
      cancel(actor); claims.set(targetId, actor.id);
      actor.rescueAttempt = { targetId, kind: candidate.kind, cageId: candidate.item.cageId, elapsed: 0,
        duration: candidate.kind === 'revive' ? RESCUE.reviveSeconds : RESCUE.cageSeconds,
        itemId: lunch?.id, origin: { x: actor.x, y: actor.y }, health: actor.health };
      actor.searchHeld = true; actor.inputAge = 0; return true;
    },
    guardTick(g, dt, clouds) {
      if (g.jailer) return false;
      // Pickup leaves state as capture until the next tick; the captive claim
      // must switch vision immediately, including the usual close-range check.
      const carrying = !!g.captiveId || g.state === 'carry';
      const visible = participants.filter(p => p.inRun && p.connected && p.state === 'active' && seesPlayer(world, g, p,
        !carrying && ['chase', 'search', 'capture'].includes(g.state), clouds, carrying));
      if (visible.length) {
        if (g.captiveId || g.captureTargetId) { drop(g); g.state = 'chase'; g.targetId = visible[0].id; }
        return false;
      }
      let target = participants.find(p => p.id === (g.captiveId ?? g.captureTargetId));
      if (target && (!target.inRun || !target.connected || !['down', 'carried'].includes(target.state))) { drop(g); target = null; }
      if (!target) {
        const bodies = participants.filter(p => p.inRun && p.connected && p.state === 'down' && p.downSpilled
          && !guards.some(other => other !== g && (other.captiveId === p.id || other.captureTargetId === p.id))
          && seesPlayer(world, g, { ...p, state: 'active' }, ['chase', 'search'].includes(g.state), clouds))
          .map(p => ({ p, path: findPath(world, g, p) })).filter(c => c.path.length || Math.hypot(c.p.x - g.x, c.p.y - g.y) < .65)
          .sort((a, b) => a.path.length - b.path.length || a.p.id.localeCompare(b.p.id));
        target = bodies[0]?.p;
        if (!target || !nearestCage(g)) return false;
        g.captureTargetId = target.id; g.captureElapsed = 0; g.capturePath = []; g.captureRepath = 0;
      }
      if (g.snareLeft > 0) { g.snareLeft = Math.max(0, g.snareLeft - dt); g.moving = false; g.captureElapsed = 0; return true; }
      g.windup = 0; g.swing = 0; g.cooldown = Math.max(0, g.cooldown - dt);
      if (g.captiveId) {
        const cage = cages.find(c => c.id === g.destinationCageId);
        if (!cage) { drop(g); return true; }
        g.state = 'carry'; walk(g, cage.entry, dt, RESCUE.carrySpeed);
        target.x = g.x; target.y = g.y;
        if (Math.hypot(g.x - cage.entry.x, g.y - cage.entry.y) < .4) {
          target.state = 'caged'; target.cageId = cage.id; target.carrierId = null; target.x = cage.x; target.y = cage.y;
          if (!cage.prisoners.includes(target.id)) cage.prisoners.push(target.id);
          g.captiveId = null; g.captureTargetId = null; g.destinationCageId = null; g.state = 'return'; g.repath = 0;
        }
      } else {
        g.state = 'capture'; walk(g, target, dt, COMBAT.patrolSpeed);
        if (Math.hypot(g.x - target.x, g.y - target.y) > .65) { g.captureElapsed = 0; return true; }
        g.captureElapsed += dt;
        if (g.captureElapsed + .000001 >= RESCUE.pickupSeconds) {
          const cage = nearestCage(g); if (!cage) { drop(g); return true; }
          for (const p of participants) if (p.rescueAttempt?.targetId === target.id) cancel(p);
          target.state = 'carried'; target.carrierId = g.id; target.x = g.x; target.y = g.y;
          g.captiveId = target.id; g.destinationCageId = cage.id; g.capturePath = []; g.captureRepath = 0;
        }
      }
      return true;
    },
    tick(dt) {
      for (const actor of participants) if (actor.rescueAttempt) {
        const attempt = actor.rescueAttempt, target = participants.find(p => p.id === attempt.targetId);
        const candidate = target && rescueCandidate(world, actor, target, cages);
        const lunchIndex = actor.bag.findIndex(i => i.id === attempt.itemId && i.type === 'lunch');
        if (!actor.inRun || !actor.connected || !candidate || candidate.kind !== attempt.kind || candidate.item.cageId !== attempt.cageId
          || !actor.searchHeld || actor.inputAge > .4 || actor.health !== attempt.health || actor.loot.held || actor.placement.itemId
          || Math.hypot(actor.x - attempt.origin.x, actor.y - attempt.origin.y) > SEARCH.movementTolerance
          || attempt.kind === 'revive' && lunchIndex < 0) { cancel(actor); continue; }
        attempt.elapsed += dt;
        if (attempt.elapsed + .000001 < attempt.duration) continue;
        const point = attempt.kind === 'rescue' ? cages.find(c => c.id === target.cageId)?.entry : target;
        if (!point || !canStand(world, point.x, point.y)) { cancel(actor); continue; }
        if (attempt.kind === 'revive') actor.bag.splice(lunchIndex, 1);
        target.x = point.x; target.y = point.y; removeFromCage(target);
        Object.assign(target, createVitality(), { health: 1, carrierId: null, downSpilled: false });
        target.input = { x: 0, y: 0 }; target.inputAge = 1; target.searchHeld = false;
        cancel(actor);
      }
    },
    snapshot() {
      return { cages, rescues: participants.filter(p => p.rescueAttempt).map(actor => {
        const a = actor.rescueAttempt, target = participants.find(p => p.id === a.targetId), cage = cages.find(c => c.id === a.cageId);
        const point = cage ?? target ?? actor;
        return { actorId: actor.id, targetId: a.targetId, kind: a.kind, elapsed: a.elapsed, duration: a.duration, x: point.x, y: point.y };
      }) };
    }
  };
}
