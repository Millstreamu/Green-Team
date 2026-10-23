import test from 'node:test';
import assert from 'node:assert/strict';
import { inShadow, updateShadowStillness } from '../src/shadows.js';
import { seesPlayer, createVitality, hurtPlayer } from '../src/guard.js';
import { breakDisguise } from '../src/potions.js';
import { litTorches } from '../src/lighting.js';
import { generateDungeon } from '../src/world.js';
import { SHADOW } from '../src/config.js';

const square = (x, y, r) => ({ x, y, polygon: [{ x: x - r, y: y - r }, { x: x + r, y: y - r }, { x: x + r, y: y + r }, { x: x - r, y: y + r }] });

test('shadow is beyond the light reach or outside every torch light shape', () => {
  const torches = [square(2, 2, 6)];
  assert.equal(inShadow(torches, { x: 2 + SHADOW.lightReach - .1, y: 2 }), false);
  assert.equal(inShadow(torches, { x: 2 + SHADOW.lightReach + .1, y: 2 }), true);
  assert.equal(inShadow([square(2, 2, 1)], { x: 4, y: 2 }), true, 'blocked by walls: outside the light shape');
  assert.equal(inShadow([], { x: 0, y: 0 }), true);
});

test('standing still in shadow for one second hides from guards beyond close range; any break restarts it', () => {
  const world = generateDungeon(3), room = world.rooms.find(r => r.w >= 6);
  const player = { id: 'g', x: room.x + 4.5, y: room.y + room.h / 2, ...createVitality(), shadowStillness: true, moving: false };
  updateShadowStillness(player, 0, true); updateShadowStillness(player, .5, true); assert.equal(player.inShadow, true); assert.equal(player.shadowHidden, false);
  updateShadowStillness(player, .6, true); assert.equal(player.shadowHidden, true);
  const far = { x: room.x + .5, y: player.y, angle: 0, state: 'chase' }, near = { x: player.x - 1.2, y: player.y, angle: 0, state: 'chase' };
  assert.equal(seesPlayer(world, far, { ...player, shadowHidden: false }, true), true, 'test guard would normally see the goblin');
  assert.equal(seesPlayer(world, far, player, true), false); assert.equal(seesPlayer(world, near, player, true), true);
  player.x += .5; updateShadowStillness(player, .1, true); assert.equal(player.shadowHidden, false); assert.equal(seesPlayer(world, far, player, true), true);
  updateShadowStillness(player, 1, true); updateShadowStillness(player, .1, true); assert.equal(player.shadowHidden, true);
  breakDisguise(player); assert.equal(player.shadowHidden, false, 'gear use breaks it');
  updateShadowStillness(player, 1, true); updateShadowStillness(player, .1, true, true); assert.equal(player.shadowHidden, false, 'searching breaks it');
  updateShadowStillness(player, 1, true); assert.equal(player.shadowHidden, true); hurtPlayer(player); assert.equal(player.shadowHidden, false, 'a hit breaks it');
  updateShadowStillness(player, 2, false); assert.equal(player.inShadow, false); assert.equal(player.shadowHidden, false, 'light breaks it');
  const plain = { ...createVitality(), x: 1, y: 1, moving: false }; updateShadowStillness(plain, 1, true); updateShadowStillness(plain, 1, true);
  assert.equal(plain.inShadow, false); assert.equal(plain.shadowHidden, false, 'needs the ability');
});

test('real dungeons have both lit and shadowed floor, from the same torches the renderer draws', () => {
  for (const seed of [3, 41, 977]) {
    const world = generateDungeon(seed), torches = litTorches(world, []);
    assert.equal(litTorches(world, []), torches, 'cached per world');
    let lit = 0, dark = 0;
    world.tiles.forEach((floor, i) => { if (floor) inShadow(torches, { x: i % world.width + .5, y: Math.floor(i / world.width) + .5 }) ? dark++ : lit++; });
    assert.ok(lit > 0 && dark > 0, `seed ${seed}: ${lit} lit, ${dark} dark`);
    for (const torch of torches) assert.equal(inShadow(torches, { x: torch.x, y: torch.y }), false);
  }
});
