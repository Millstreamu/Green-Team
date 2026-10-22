import test from 'node:test';
import assert from 'node:assert/strict';
import { COMBAT } from '../src/config.js';
import { createGuard, createVitality, updateGuard, seesPlayer } from '../src/guard.js';
import { canStand } from '../src/world.js';

function cornerWorld() {
  const world = { width: 22, height: 20, seed: 1, tiles: new Uint8Array(440), spawn: { x: 3.5, y: 2.5 }, rooms: [{ x: 2, y: 2, w: 7, h: 1, cx: 5, cy: 2 }, { x: 8, y: 6, w: 8, h: 9, cx: 12, cy: 10 }] };
  const carve = (x, y) => { world.tiles[y * world.width + x] = 1; };
  for (let x = 2; x <= 9; x++) carve(x, 2);
  for (let y = 2; y <= 6; y++) carve(9, y);
  for (let y = 6; y < 15; y++) for (let x = 8; x < 16; x++) carve(x, y);
  return world;
}

function cornerScenario() {
  const world = cornerWorld(), guard = createGuard(world, { roomIndex: 0, behaviour: 'lookout' });
  guard.state = 'chase'; guard.lastSeen = { x: 9.5, y: 3.05 };
  const player = { x: 9.5, y: 3.25, ...createVitality() };
  assert.equal(seesPlayer(world, guard, player, true), false);
  return { world, guard, player };
}

test('guard runs to last sighting before hidden tracking round the corner', () => {
  const { world, guard, player } = cornerScenario();
  let enteredRoom = false, followedTrail = false;
  for (let frame = 0; frame < 240; frame++) {
    if (frame < 28) player.y += 0.2;
    else if (frame < 48) player.x += 0.2;
    const previous = { x: guard.x, y: guard.y };
    const wasApproaching = guard.lastSeenPending || guard.state === 'chase';
    updateGuard(world, guard, player, 0.05);
    assert.ok(canStand(world, guard.x, guard.y, COMBAT.guardRadius));
    if (guard.state === 'search') {
      followedTrail ||= guard.trail.length > 1;
      assert.ok(Math.hypot(guard.x - previous.x, guard.y - previous.y) <= (wasApproaching ? COMBAT.chaseSpeed : COMBAT.searchSpeed) * 0.05 + 0.000001);
    }
    if (guard.y >= 6.25) { enteredRoom = true; break; }
  }
  assert.ok(followedTrail); assert.ok(enteredRoom, 'Guard stopped at the corner instead of entering the room');
});

test('hidden trail capture stops after the configured window and does not rewrite the last visible position', () => {
  const { world, guard, player } = cornerScenario();
  // Start farther back so there is no legitimate reacquisition around the turn
  // during this test of a single uninterrupted loss-of-sight window.
  world.tuning = {combat:{...COMBAT,chaseSpeed:.5}};
  guard.x = 2.5; guard.lastSeen = { x: 9.5, y: 2.85 };
  const lastVisible = { ...guard.lastSeen };
  updateGuard(world, guard, player, 0.05);
  for (let frame = 0; frame < 50; frame++) {
    if (frame < 28) player.y += 0.2; else player.x += 0.15;
    updateGuard(world, guard, player, 0.05);
  }
  assert.equal(guard.state, 'search'); assert.equal(guard.trailLeft, 0);
  assert.deepEqual(guard.lastSeen, lastVisible);
  const trailEnd = { ...guard.trailEnd };
  player.x += 0.2;
  assert.equal(seesPlayer(world, guard, player, true), false);
  updateGuard(world, guard, player, 0.05);
  assert.deepEqual(guard.trailEnd, trailEnd);
});

test('reacquiring actual sight clears the old trail and resumes the chase', () => {
  const { world, guard, player } = cornerScenario();
  updateGuard(world, guard, player, 0.05); assert.ok(guard.trailLeft > 0);
  player.x = 8.5; player.y = 2.5;
  assert.ok(seesPlayer(world, guard, player, true));
  updateGuard(world, guard, player, 0.05);
  assert.equal(guard.state, 'chase'); assert.equal(guard.trail.length, 0); assert.equal(guard.trailLeft, 0);
  assert.deepEqual(guard.lastSeen, { x: player.x, y: player.y });
});

test('invalid teleports leave no trail and a fruitless search still returns the guard home', () => {
  const { world, guard, player } = cornerScenario();
  player.x = -100; player.y = -100;
  updateGuard(world, guard, player, 0.05);
  assert.deepEqual(guard.trailEnd, { x: 9.5, y: 3.05 });
  let returning = false;
  for (let frame = 0; frame < 1000; frame++) {
    updateGuard(world, guard, player, 0.05);
    returning ||= guard.state === 'return';
    if (returning && guard.state === 'patrol') break;
  }
  assert.ok(returning); assert.equal(guard.state, 'patrol'); assert.equal(guard.trail.length, 0);
  assert.ok(Math.hypot(guard.x - guard.home.x, guard.y - guard.home.y) < 0.01);
});

test('last-seen approach preserves queued tracking points and uses running speed until arrival',()=>{
 const {world,guard,player}=cornerScenario();guard.x=3.5;guard.y=2.5;guard.lastSeen={x:9.5,y:2.5};player.x=-100;player.y=-100;
 const from={x:guard.x,y:guard.y};updateGuard(world,guard,player,.05);
 assert.equal(guard.lastSeenPending,true);assert.ok(Math.abs(Math.hypot(guard.x-from.x,guard.y-from.y)-COMBAT.chaseSpeed*.05)<1e-8);
 const remembered={...guard.lastSeen};const next={x:9.5,y:5.5};guard.trail.push(next);
 for(let n=0;n<200&&guard.lastSeenPending;n++){
  assert.deepEqual(guard.lastSeen,remembered);assert.equal(guard.trail.at(-1),next);
  updateGuard(world,guard,player,.05);
 }
 assert.equal(guard.lastSeenPending,false);assert.ok(Math.hypot(guard.x-remembered.x,guard.y-remembered.y)<=COMBAT.searchSpeed*.05+.08);
 const before={x:guard.x,y:guard.y};updateGuard(world,guard,player,.05);
 assert.ok(Math.hypot(guard.x-before.x,guard.y-before.y)<=COMBAT.searchSpeed*.05+1e-8);
});

test('team guard uses the same last-seen approach and clears it on reacquisition',async()=>{
 const {updateTeamGuard}=await import('../server/team-guards.js');const {world,guard,player}=cornerScenario();
 Object.assign(player,{id:'goblin',connected:true,inRun:true});guard.targetId=player.id;
 updateTeamGuard(world,guard,[player],.05,[]);assert.equal(guard.lastSeenPending,true);
 player.x=8.5;player.y=2.5;updateTeamGuard(world,guard,[player],.05,[]);
 assert.equal(guard.state,'chase');assert.equal(guard.lastSeenPending,false);assert.equal(guard.trail.length,0);
});
