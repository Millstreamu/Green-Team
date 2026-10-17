import { randomUUID, randomInt } from 'node:crypto';
import { createCamp, createLairWorld, lairTarget, takeStashItem, returnStashItem, craftForSack, moveStashStack } from '../src/lair.js';
import { createProfile, buyPersonalUpgrade } from '../src/profile.js';
import { createDeparture, setDestination, toggleCartSeat, tickDeparture } from '../src/jobs.js';
import { movePlayer } from '../src/world.js';

// One temporary test home. No browser supplies stock, coordinates, profiles or elapsed time.
export function createLairSession() {
  const world = createLairWorld(), camp = createCamp(), players = new Map();
  const cart = createDeparture([], camp.destination);
  let launched = null;
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
        p = { token, id: randomUUID(), name: `Goblin ${players.size + 1}`, connected: false, waiting: !!launched,
          ...world.spawn, facing: 1, phase: 0, moving: false, input: { x: 0, y: 0 }, inputAge: 0,
          bag: [], profile: createProfile() };
        p.profile.id = p.id; players.set(token, p);
      }
      if (p.connected) return null;
      p.connected = true; p.input = { x: 0, y: 0 }; membership(); return p;
    },
    disconnect(p) { p.connected = false; p.input = { x: 0, y: 0 }; p.moving = false; membership(); },
    action(p, message) {
      if (!p?.connected || !message || typeof message !== 'object' || typeof message.type !== 'string') return false;
      if (message.type === 'move') {
        if (!Number.isFinite(message.x) || !Number.isFinite(message.y) || Math.abs(message.x) > 1 || Math.abs(message.y) > 1) return false;
        p.input = { x: message.x, y: message.y }; p.inputAge = 0; return true;
      }
      if (message.type === 'reset-test' && launched) {
        launched = null; cart.launched = false; cart.aboard.clear(); cart.countdown = null;
        for (const q of players.values()) { q.waiting = false; Object.assign(q, world.spawn); q.input = { x: 0, y: 0 }; }
        membership(); return true;
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
      if (['take', 'craft', 'stack'].includes(message.type) && typeof message.item !== 'string') return false;
      if (message.type === 'return' && typeof message.id !== 'string') return false;
      if (message.type === 'buy' && typeof message.upgrade !== 'string') return false;
      if (message.type === 'destination' && (typeof message.job !== 'string' || typeof message.difficulty !== 'string')) return false;
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
      dt = Math.max(0, Math.min(.1, dt));
      if (launched) return;
      for (const p of players.values()) if (p.connected && !p.waiting) {
        p.inputAge += dt;
        if (!cart.aboard.has(p.id)) movePlayer(world, p, p.inputAge > .4 ? { x: 0, y: 0 } : p.input, dt);
        else p.moving = false;
      }
      const job = tickDeparture(cart, dt);
      if (job) launched = { id: randomUUID(), seed: randomInt(0, 2 ** 32), job, participants: [...cart.participants] };
    },
    snapshot(p) {
      return { type: 'state', selfId: p.id, name: p.name, bag: p.bag, profile: p.profile,
        camp: { counts: camp.counts, slots: camp.slots, destination: camp.destination },
        players: [...players.values()].filter(q => q.connected).map(q => ({ id: q.id, name: q.name, x: q.x, y: q.y, facing: q.facing, moving: q.moving, phase: q.phase, waiting: q.waiting })),
        cart: { selection: cart.selection, participants: cart.participants, aboard: [...cart.aboard], countdown: cart.countdown }, launched };
    }
  };
}
