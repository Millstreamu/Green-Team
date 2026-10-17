import { createVitality } from '../src/guard.js';
import { createDungeonSession } from './dungeon-session.js';
import { randomUUID, randomInt } from 'node:crypto';
import { createCamp, createLairWorld, lairTarget, takeStashItem, returnStashItem, craftForSack, moveStashStack } from '../src/lair.js';
import { createProfile, buyPersonalUpgrade } from '../src/profile.js';
import { createDeparture, setDestination, toggleCartSeat, tickDeparture } from '../src/jobs.js';
import { movePlayer } from '../src/world.js';

// One temporary test home. No browser supplies stock, coordinates, profiles or elapsed time.
export function createLairSession() {
  const world = createLairWorld(), camp = createCamp(), players = new Map();
  const cart = createDeparture([], camp.destination);
  let launched = null, dungeon = null;
  function returnHome() {
    dungeon = null; launched = null; cart.launched = false; cart.aboard.clear(); cart.countdown = null;
    for (const q of players.values()) { q.location = 'home'; q.waiting = false; q.inRun = false; Object.assign(q, world.spawn, createVitality()); q.hiding = null; q.enteringHide = null; q.input = { x: 0, y: 0 }; q.moving = false; }
    membership();
  }
  function membership() {
    const ids = [...players.values()].filter(p => p.connected && !p.waiting).map(p => p.id);
    if (ids.join() === cart.participants.join()) return;
    cart.participants = ids; cart.countdown = null;
    for (const id of cart.aboard) if (!ids.includes(id)) cart.aboard.delete(id);
    // A membership change requires a fresh boarding action to begin a countdown.
  }
  return {
    connect(token) {
      let p = players.get(token);
      if (!p) {
        token = randomUUID();
        p = { token, id: randomUUID(), name: `Goblin ${players.size + 1}`, connected: false, waiting: !!launched, location: 'home',
          ...world.spawn, ...createVitality(), facing: 1, phase: 0, moving: false, input: { x: 0, y: 0 }, inputAge: 0,
          bag: [], profile: createProfile() };
        p.profile.id = p.id; players.set(token, p);
      }
      if (p.connected) return null;
      p.connected = true; p.disconnectedFor = 0; p.input = { x: 0, y: 0 }; if (!dungeon) membership(); return p;
    },
    disconnect(p) { p.connected = false; p.input = { x: 0, y: 0 }; p.moving = false; if (dungeon && p.inRun) dungeon.disconnect(p); if (!dungeon) membership(); },
    action(p, message) {
      if (!p?.connected || !message || typeof message !== 'object' || typeof message.type !== 'string') return false;
      if (message.type === 'dismiss-result') { p.result = null; return true; }
      if (p.result) return false;
      if (message.type === 'move') {
        if (!Number.isFinite(message.x) || !Number.isFinite(message.y) || Math.abs(message.x) > 1 || Math.abs(message.y) > 1) return false;
        if (p.waiting) return false;
        p.input = { x: message.x, y: message.y }; p.inputAge = 0;
        p.searchHeld = message.searchHeld === true; return true;
      }
      if (dungeon) {
        const result = dungeon.action(p, message);
        if (result && typeof result === 'object') { returnHome(); return true; }
        return result;
      }
      if (launched || p.waiting) return false;
      const station = lairTarget(world, p), aboard = cart.aboard.has(p.id);
      if (message.type === 'board') {
        if (!aboard && station?.kind !== 'tunnel') return false;
        const ready = toggleCartSeat(cart, p.id);
        if (ready) { p.outside = { x: p.x, y: p.y }; p.x = 9; p.y = 2.35; }
        else if (p.outside) Object.assign(p, p.outside);
        p.input = { x: 0, y: 0 }; return ready !== null;
      }
      if (aboard) return false;
      const loot = { bag: p.bag, held: null };
      // Same domain rules as solo mode, with each player's bag kept separately.
      // Stash access via Tab is already allowed anywhere in the lair.
      if (['take', 'craft', 'stack', 'debug-pack'].includes(message.type) && typeof message.item !== 'string') return false;
      if (message.type === 'return' && typeof message.id !== 'string') return false;
      if (message.type === 'buy' && typeof message.upgrade !== 'string') return false;
      if (message.type === 'destination' && (typeof message.job !== 'string' || typeof message.difficulty !== 'string')) return false;
      if (message.type === 'debug-pack') return !!takeStashItem(camp, loot, message.item, true);
      if (message.type === 'take') return !!takeStashItem(camp, loot, message.item);
      if (message.type === 'return') return returnStashItem(camp, loot, message.id);
      if (message.type === 'stack') return moveStashStack(camp, message.item, message.slot);
      if (message.type === 'craft' && station?.kind === 'craft') return !!craftForSack(camp, loot, message.item, p.profile);
      if (message.type === 'buy') {
        const kind = message.upgrade === 'quickSearch' ? 'campfire' : 'craft';
        return station?.kind === kind && buyPersonalUpgrade(p.profile, message.upgrade);
      }
      if (message.type === 'destination' && station?.kind === 'planning') {
        if (!setDestination(cart, message.job, message.difficulty)) return false;
        camp.destination = { jobId: message.job, difficultyId: message.difficulty }; return true;
      }
      return false;
    },
    tick(dt) {
      if (!Number.isFinite(dt) || dt <= 0) return;
      const step = Math.min(.1, dt);
      if (dungeon) {
        if (dungeon.tick(dt)) returnHome();
        for (const p of players.values()) if (p.waiting && p.location === 'home') Object.assign(p, world.spawn);
        return;
      }
      for (const p of players.values()) if (p.connected && !p.waiting) {
        p.inputAge += dt;
        if (!cart.aboard.has(p.id)) movePlayer(world, p, p.inputAge > .4 ? { x: 0, y: 0 } : p.input, step);
        else p.moving = false;
      }
      const job = tickDeparture(cart, dt);
      if (job) {
        launched = { id: randomUUID(), seed: randomInt(0, 2 ** 32), job, participants: [...cart.participants] };
        dungeon = createDungeonSession(launched, [...players.values()].filter(p => launched.participants.includes(p.id)), camp);
      }
    },
    snapshot(p) {
      return { type: 'state', selfId: p.id, name: p.name, bag: p.bag, profile: p.profile, location: p.location, held: p.loot?.held ?? null, result: p.result ?? null, notice: p.notice ?? null,
        placement: p.placement ?? null, quickType: p.quickType ?? null,
        dungeon: p.location === 'dungeon' ? dungeon?.snapshot() : null,
        camp: { counts: camp.counts, slots: camp.slots, destination: camp.destination },
        players: [...players.values()].filter(q => q.location === p.location && (q.connected || q.inRun)).map(q => ({ id: q.id, name: q.name, x: q.x, y: q.y, facing: q.facing, moving: q.moving, phase: q.phase, state: q.state, health: q.health, maxHealth: q.maxHealth, invulnerable: q.invulnerable,
          hiding: q.hiding ? { spot: { id: q.hiding.spot.id } } : null, enteringHide: q.enteringHide ? { spot: { id: q.enteringHide.spot.id }, elapsed: q.enteringHide.elapsed } : null, waiting: q.waiting, ghost: !q.connected, ghostSeconds: !q.connected ? Math.max(0, Math.ceil(60 - q.disconnectedFor)) : null })),
        cart: { selection: cart.selection, participants: cart.participants, aboard: [...cart.aboard], countdown: cart.countdown }, launched };
    }
  };
}
