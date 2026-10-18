import { publicTreasure, unlockTreasure } from '../src/treasure.js';
import { dungeonConfig, GENERATOR_PRESETS } from '../src/generator-settings.js';
import { runTuning } from '../src/tuning.js';
import { tickVitality } from '../src/guard.js';
import { createDanger } from './danger.js';
import { generateDungeon, movePlayer } from '../src/world.js';
import { createLoot, autoPickup, liftItem, placeHeld, dropHeld, reachable, LOOT_TYPES, itemCells, itemCount } from '../src/loot.js';
import { createSearchables, createSearchSession, beginSearch, cancelSearch, updateSearch } from '../src/search.js';
import { createRun, atTunnel } from '../src/run.js';
import { awardPersonalXp, personalSearchRate } from '../src/profile.js';
import { bankEscape } from '../src/lair.js';

// The same single-player rules operate on one shared dungeon and separate sacks.
export function createDungeonSession(launch, participants, camp) {
  const world = generateDungeon(launch.seed, launch.layout ?? dungeonConfig(GENERATOR_PRESETS[launch.job.jobId])); world.job = launch.job; world.tuning = runTuning(launch.tuning);
  const run = createRun(world), objects = createSearchables(world), ground = [];
  let elapsed = 0, settled = false, noticeSerial = 0;
  for (const p of participants) {
    Object.assign(p, world.spawn);
    p.location = 'dungeon'; p.inRun = true; p.waiting = false; p.disconnectedFor = 0;
    p.input = { x: 0, y: 0 }; p.inputAge = 0; p.moving = false;
    p.loot = createLoot(); p.loot.bag = p.bag; p.loot.ground = ground;
    p.notice = null; p.search = createSearchSession(); p.searchHeld = false; p.searchRate = personalSearchRate(p.profile);
  }
  const danger = createDanger(world, participants, objects);
  const stopSearch = (p, keepHold = false) => { if (p.search) cancelSearch(p.search); if (!keepHold) p.searchHeld = false; };
  const spillBag = p => {
    for (const item of [...p.bag, ...(p.loot.held ? [p.loot.held] : [])]) ground.push({ ...item, x: p.x, y: p.y, spillAge: 0 });
    p.bag.length = 0; p.loot.held = null;
  };
  function finish(outcome, aborted = false) {
    if (settled) return null;
    settled = true;
    // Ghosts and expired goblins never bank their dungeon sacks on another's exit.
    const escaped = participants.filter(p => p.inRun && p.connected && p.state === 'active');
    const recovered = outcome === 'escaped' ? escaped.flatMap(p => p.bag.map(item => ({ ...item }))) : [];
    const recoveredIds = new Set(recovered.map(item => item.id));
    const items = recovered.filter(item => !LOOT_TYPES[item.type].equipment && !LOOT_TYPES[item.type].runOnly);
    const result = { runId: launch.id, outcome, job: launch.job, items, count: items.reduce((n, item) => n + itemCount(item), 0),
      slots: items.reduce((sum, item) => sum + itemCells(item).length, 0), team: true,
      elapsed: Math.floor(elapsed), lostItems: [], ...(aborted ? { aborted: true } : {}) };
    if (outcome === 'escaped') bankEscape(camp, result, { bag: recovered });
    // The departure roster earns equally, including offline/left-behind goblins.
    // The lair checkpoint commits these profiles and the bank together before
    // acknowledging settlement. Live runs are never replayed after restart.
    const receipts = new Map(participants.map(p => [p.id, awardPersonalXp(p.profile, result)]));
    delete result.xpAwards; // Internal receipt cache never belongs in snapshots.
    for (const p of participants) {
      const wasInRun = p.inRun;
      const abandoned = aborted ? [...p.bag, ...(p.loot.held ? [p.loot.held] : [])].map(i => ({ ...i })) : null;
      stopSearch(p); danger.rescue.remove(p); danger.cancel(p, true); p.bag.length = 0; p.loot.held = null; p.inRun = false;
      if (!p.connected || !wasInRun) p.notice = { id: `${launch.id}-xp`, text: `Team run finished. +${receipts.get(p.id).earned} XP · ${p.profile.xp} XP available.` };
      p.result = p.connected && wasInRun ? { ...result, ...(p.state !== 'active' ? { outcome: 'down', leftBehind: outcome === 'escaped', items: [], count: 0, slots: 0, lostItems: (p.downItems ?? []).filter(i => !recoveredIds.has(i.id)) } : {}), ...(aborted ? { outcome: 'down', leftBehind: false, lostItems: abandoned } : {}), personalXp: receipts.get(p.id) } : null;
    }
    return result;
  }
  return {
    world, objects, ground, run, danger,
    abort() { return finish('down', true); },
    disconnect(p) { stopSearch(p); danger.rescue.disconnect(p); danger.cancel(p, true); p.disconnectedFor = 0; p.moving = false; },
    action(p, message) {
      if (settled || !p.inRun || !p.connected || p.state !== 'active') return false;
      const loot = p.loot;
      if (message.type === 'cancel-search') { stopSearch(p);
        // Releasing E cancels hide entry, but keeps equipped traps available.
        p.enteringHide = null; danger.rescue.cancel(p); return true; }
      if (p.hiding && message.type !== 'hide') return false;
      if (message.type === 'unlock') {
        stopSearch(p); danger.cancel(p);
        return unlockTreasure(world, p, p.loot);
      }
      if (message.type === 'rescue') {
        if (typeof message.id !== 'string') return false;
        stopSearch(p); danger.cancel(p); return danger.rescue.start(p, message.id);
      }
      if (['equip', 'aim', 'smoke', 'hide', 'cancel-placement'].includes(message.type)) {
        if (message.type !== 'aim') { danger.rescue.cancel(p); stopSearch(p); p.enteringHide = null; }
        return danger.action(p, message);
      }
      if (message.type === 'search') {
        if (typeof message.id !== 'string') return false;
        const object = objects.find(o => o.id === message.id);
        if (!object || participants.some(q => q !== p && q.search?.active?.id === object.id)) return false;
        danger.cancel(p);
        if (!beginSearch(p.search, world, p, loot, object)) return false;
        p.searchHeld = true; p.inputAge = 0; return true;
      }
      if (message.type === 'pickup' || message.type === 'lift') {
        if (typeof message.id !== 'string') return false;
        const source = message.type === 'pickup' ? 'ground' : message.source;
        if (!['ground', 'bag'].includes(source)) return false;
        const item = loot[source].find(item => item.id === message.id);
        if (!item || source === 'ground' && !reachable(world, p, item)) return false;
        stopSearch(p); danger.cancel(p);
        return message.type === 'pickup' ? autoPickup(loot, item.id) : liftItem(loot, source, item.id);
      }
      if (message.type === 'rotate') {
        danger.rescue.cancel(p);
        if (!loot.held) return false;
        loot.held.rotation = (loot.held.rotation + 1) % 4; return true;
      }
      if (message.type === 'place') {
        danger.rescue.cancel(p);
        if (![message.x, message.y].every(n => Number.isInteger(n) && n >= 0 && n < 3)) return false;
        return placeHeld(loot, message.x, message.y);
      }
      if (message.type === 'drop') { stopSearch(p); danger.cancel(p); return dropHeld(loot, world, p); }
      if (message.type === 'extract') {
        if (loot.held || !atTunnel(run, world, p)) return false;
        const standing = participants.filter(q => q.inRun && q.connected && q.state === 'active');
        if (!standing.length || standing.some(q => q.loot.held || !atTunnel(run, world, q))) return false;
        return finish('escaped');
      }
      return false;
    },
    tick(dt) {
      if (settled) return null;
      elapsed += dt;
      for (const item of ground) if (item.spillAge !== undefined) item.spillAge += dt;
      for (const p of participants) if (p.inRun) {
        if (!p.connected) {
          tickVitality(p, dt); // Existing hit immunity expires while offline; reconnect grants none.
          p.disconnectedFor += dt;
          if (p.disconnectedFor + .000001 >= 60) {
            stopSearch(p); danger.rescue.remove(p); danger.cancel(p, true); spillBag(p); p.inRun = false; p.waiting = true; p.location = 'home';
          }
          continue;
        }
        p.inputAge += dt;
        const fresh = p.inputAge <= .4;
        const step = Math.min(dt, .1), direction = fresh ? p.input : { x: 0, y: 0 };
        if (!danger.beforeMove(p, step, direction)) movePlayer(world, p, direction, step);
      }
      danger.tick(Math.min(dt, .1), stopSearch, spillBag);
      for (const p of participants) if (p.inRun && p.connected && p.state === 'active') {
        const event = updateSearch(p.search, world, p, p.loot, p.inputAge <= .4 && p.searchHeld && !p.hiding && !p.enteringHide && !p.placement.itemId, dt);
        if (event?.type === 'completed') p.notice = { id: `${launch.id}-${++noticeSerial}`, text: event.count ? 'Search complete. Release E, then press E again to pack the loot.' : 'Nothing worth taking.' };
      }
      // A downed or disconnected downed goblin cannot keep an otherwise failed run open.
      if (!participants.some(p => p.inRun && p.state === 'active')) return finish('down');
      return null;
    },
    snapshot() {
      return { ...danger.snapshot(), id: launch.id, seed: launch.seed, layout: world.layout, tuning: world.tuning, treasure: publicTreasure(world), job: launch.job, entrance: run.entrance,
        objects: objects.map(o => {
          const searcher = participants.find(p => p.inRun && p.connected && p.search?.active?.id === o.id);
          return { id: o.id, type: o.type, x: o.x, y: o.y, tileX: o.tileX, tileY: o.tileY, width: o.width, height: o.height, facing: o.facing, approach: o.approach, searched: o.searched,
            ...(searcher ? { searcherId: searcher.id, searcherName: searcher.name, elapsed: searcher.search.elapsed, duration: searcher.search.duration } : {}) };
        }), ground };
    }
  };
}
