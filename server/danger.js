import { createRescue } from './rescue.js';
import { createGuards, createVitality, tickVitality, seesPlayer } from '../src/guard.js';
import { createPressure, updatePressure } from '../src/pressure.js';
import { createHidingSpots, beginHiding, cancelHiding, updateHiding, leaveHiding } from '../src/hiding.js';
import { createPlacement, cancelPlacement, interruptPlacement, equipSnare, placementPoint, moveTrapAim, updatePlacement, updateTraps } from '../src/traps.js';
import { useSmoke, updateSmoke } from '../src/smoke.js';
import { updateTeamGuard } from './team-guards.js';

export function createDanger(world, participants, objects) {
  const guards = createGuards(world), hidingSpots = createHidingSpots(world, objects), traps = [], clouds = [];
  const obstacles = [...objects, ...hidingSpots], pressure = createPressure(world, obstacles);
  for (const p of participants) {
    Object.assign(p, createVitality()); p.hiding = null; p.enteringHide = null;
    p.placement = createPlacement(); p.quickType = null; p.downSpilled = false; p.downItems = [];
  }
  const rescue = createRescue(world, participants, guards, obstacles);
  obstacles.push(...rescue.cages.map(c => ({ x: c.x, y: c.y })));
  const witnesses = p => guards.filter(g => seesPlayer(world, g, p, ['chase', 'search'].includes(g.state), clouds));
  return {
    guards, hidingSpots, traps, clouds, pressure, rescue,
    cancel(p, releaseSpot = false) {
      rescue.cancel(p); cancelHiding(p); cancelPlacement(p.placement);
      if (releaseSpot) { p.quickType = null; leaveHiding(p); }
    },
    action(p, m) {
      if (m.type === 'cancel-placement') { cancelPlacement(p.placement); return true; }
      if (m.type === 'equip') {
        if (typeof m.id !== 'string' || p.loot.held || p.hiding) return false;
        const item = p.bag.find(item => item.id === m.id);
        if (!item || !['snare', 'smoke'].includes(item.type)) return false;
        cancelHiding(p); cancelPlacement(p.placement);
        p.quickType = item.type === 'smoke' ? 'smoke' : null;
        p.input = { x: 0, y: 0 }; p.moving = false;
        if (item.type === 'snare') {
          equipSnare(p.placement, p.loot, item.id); p.placement.aimPoint = placementPoint(p); p.placement.point = placementPoint(p);
          p.searchHeld = true; // The equipping E must be released before placement can start.
        }
        return true;
      }
      if (m.type === 'aim') {
        if (!p.placement.itemId || !Number.isFinite(m.x) || !Number.isFinite(m.y)) return false;
        const point = placementPoint(p, m);
        p.placement.aimPoint = point; return true;
      }
      if (m.type === 'smoke') {
        if (p.quickType !== 'smoke' || p.placement.itemId || p.hiding) return false;
        return useSmoke(p.loot, p, clouds);
      }
      if (m.type === 'hide') {
        if (p.hiding) return leaveHiding(p);
        const spot = hidingSpots.find(spot => spot.id === m.id);
        if (!spot || p.loot.held || !beginHiding(world, p, spot, witnesses(p))) return false;
        cancelPlacement(p.placement); p.searchHeld = true; p.inputAge = 0; return true;
      }
      return false;
    },
    beforeMove(p, dt, direction) {
      tickVitality(p, dt, world);
      if (p.state !== 'active' || p.hiding) { p.moving = false; return true; }
      if (p.placement.itemId) { moveTrapAim(p.placement, p, direction, dt); p.moving = false; return true; }
      return false;
    },
    tick(dt, stopSearch, spillBag) {
      const live = participants.filter(p => p.inRun && p.connected);
      updateSmoke(clouds, dt);
      updateTraps(traps, live.filter(p => p.state === 'active'), guards, dt);
      for (const g of guards) {
        if (rescue.guardTick(g, dt, clouds)) continue;
        const event = updateTeamGuard(world, g, participants, dt, clouds, pressure.heat);
        for (const id of event.hitIds) {
          const p = participants.find(p => p.id === id); stopSearch(p, true); rescue.cancel(p); cancelHiding(p); interruptPlacement(p.placement);
        }
      }
      for (const p of live) {
        if (p.state !== 'active') {
          if (p.state === 'down' && !p.downSpilled) { p.downSpilled = true; p.downItems = [...p.bag, ...(p.loot.held ? [p.loot.held] : [])].map(i => ({ ...i })); spillBag(p); }
          stopSearch(p); rescue.cancel(p); cancelHiding(p); leaveHiding(p); cancelPlacement(p.placement); p.quickType = null;
          continue;
        }
        const holding = p.inputAge <= .4 && p.searchHeld;
        updateHiding(world, p, holding, dt, witnesses(p), !!p.loot.held || !!p.placement.itemId);
        const point = p.placement.aimPoint ?? placementPoint(p);
        updatePlacement(p.placement, world, p, p.loot, traps, obstacles, point, holding, dt);
      }
      rescue.tick(dt);
      updatePressure(world, pressure, guards, dt);
    },
    snapshot() {
      return { ...rescue.snapshot(), guards: guards.map(g => ({ id: g.id, x: g.x, y: g.y, angle: g.angle, state: g.state, behaviour: g.behaviour,
        suspicion: g.suspicion, windup: g.windup, swing: g.swing, attackAngle: g.attackAngle, snareLeft: g.snareLeft,
        reinforcement: g.reinforcement, stationary: g.stationary, jailer: g.jailer, captiveId: g.captiveId ?? null, pauseLeft: g.pauseLeft, targetId: g.targetId })), hidingSpots, traps, clouds, pressure };
    }
  };
}
