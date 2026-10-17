import test from 'node:test';
import assert from 'node:assert/strict';
import { PROFILE_SAVE_KEY, createProfile, loadProfile, saveProfile, teamHaulXp, awardPersonalXp } from '../src/profile.js';
import { createCamp, saveCamp, loadCamp, bankEscape } from '../src/lair.js';
import { createLoot, autoPickup } from '../src/loot.js';
import { generateDungeon } from '../src/world.js';
import { createRun, finishRun, loseRun } from '../src/run.js';
import { selectJob } from '../src/jobs.js';
const memory = () => {
  const data = new Map();
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
};
const haul = items => ({ outcome: 'escaped', items });

test('personal XP rewards use recovered value, including Hard rounding, and credit each profile once from the same team haul', () => {
  const world = generateDungeon(42); world.job = selectJob('manor', 'hard');
  const loot = createLoot(), player = { ...world.spawn, state: 'active' }, run = createRun(world);
  loot.ground.push({ id: 'ruby', type: 'ruby', saleMultiplier: 1.5, rotation: 0, ...world.spawn }, { id: 'coin', type: 'coin', saleMultiplier: 1.5, rotation: 0, ...world.spawn });
  for (const item of [...loot.ground]) assert.ok(autoPickup(loot, item.id));
  const result = finishRun(run, world, player, loot, 1000), camp = createCamp();
  assert.ok(bankEscape(camp, result, loot)); assert.equal(result.soldGold, 43);
  const first = createProfile('one'), second = createProfile('two'); second.xp = 10;
  assert.equal(teamHaulXp(result), 43);
  const receipt = awardPersonalXp(first, result);
  assert.deepEqual(receipt, { earned: 43, total: 43 });
  assert.deepEqual(awardPersonalXp(second, result), { earned: 43, total: 53 });
  assert.equal(awardPersonalXp(first, result), receipt); assert.equal(first.xp, 43);
  camp.counts.gold = 0; assert.equal(first.xp, 43);
});

test('materials, unused equipment, debug items, floor loot and failed/empty runs do not generate test XP', () => {
  assert.equal(teamHaulXp(haul([{ type: 'scrap' }, { type: 'cloth' }, { type: 'snare' }, { type: 'smoke' }, { type: 'ruby', debugSupply: true }])), 0);
  const world = generateDungeon(42), loot = createLoot(), profile = createProfile(); profile.xp = 25;
  loot.bag.push({ id: 'lost-ruby', type: 'ruby', rotation: 0, bx: 0, by: 0 });
  loot.ground.push({ id: 'floor-ruby', type: 'ruby', ...world.spawn });
  const result = loseRun(createRun(world), loot, 1000);
  assert.deepEqual(awardPersonalXp(profile, result), { earned: 0, total: 25 });
  const empty = finishRun(createRun(world), world, { ...world.spawn, state: 'active' }, createLoot(), 1000);
  assert.deepEqual(awardPersonalXp(profile, empty), { earned: 0, total: 25 });
});

test('personal XP survives save/load independently of lair stock, reset and recipe saves', () => {
  const storage = memory(), profile = createProfile(); profile.xp = 125;
  assert.ok(saveProfile(profile, storage));
  const original = storage.getItem(PROFILE_SAVE_KEY);
  const camp = createCamp(); camp.counts.gold = 99;
  assert.ok(saveCamp(camp, storage)); assert.equal(storage.getItem(PROFILE_SAVE_KEY), original);
  saveCamp(createCamp(), storage); assert.equal(loadProfile(storage).xp, 125);
  profile.xp = 150; saveProfile(profile, storage);
  assert.equal(loadCamp(storage).counts.gold, 0); assert.equal(loadProfile(storage).xp, 150);
  assert.equal(loadProfile(storage).id, profile.id);
});

test('blocked storage and malformed profiles fall back without breaking the in-memory game', () => {
  const blocked = { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } };
  assert.deepEqual(loadProfile(blocked), createProfile()); assert.equal(saveProfile(createProfile(), blocked), false);
  assert.equal(saveProfile(createProfile(), undefined), false);
  for (const text of ['{', 'null', '{"version":2,"id":"one","xp":1}', '{"version":1,"id":"one","xp":-1}', '{"version":1,"id":"one","xp":1.5}', '{"version":1,"xp":1}', '{"version":1,"id":"one","xp":9007199254740992}']) {
    assert.deepEqual(loadProfile({ getItem() { return text; } }), createProfile());
  }
  const profile = loadProfile(blocked); awardPersonalXp(profile, haul([{ type: 'ruby' }]));
  assert.equal(profile.xp, 25); assert.equal(saveProfile(profile, blocked), false); assert.equal(profile.xp, 25);
});

test('each new run can reward XP, old receipts never recredit and total XP remains a safe integer', () => {
  const profile = createProfile(), first = haul([{ type: 'coin' }]), next = haul([{ type: 'coin' }]);
  awardPersonalXp(profile, first); awardPersonalXp(profile, next); assert.equal(profile.xp, 6);
  awardPersonalXp(profile, first); assert.equal(profile.xp, 6);
  profile.xp = Number.MAX_SAFE_INTEGER - 1;
  assert.deepEqual(awardPersonalXp(profile, haul([{ type: 'ruby' }])), { earned: 1, total: Number.MAX_SAFE_INTEGER });
});
