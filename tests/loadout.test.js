import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTrapLoadout } from '../src/loadout.js';
import { bagItemAt } from '../src/loot.js';

test('debug loadout packs zero to nine separate traps without stacking or duplicate IDs', () => {
  assert.deepEqual(buildTrapLoadout({ snare: 0 }, 42), { bag: [], slots: 0 });
  const full = buildTrapLoadout({ snare: 9 }, 42);
  assert.equal(full.bag.length, 9); assert.equal(full.slots, 9);
  assert.equal(new Set(full.bag.map(item => item.id)).size, 9);
  for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) assert.equal(bagItemAt(full.bag, x, y).type, 'snare');
  const next = buildTrapLoadout({ snare: 3 }, 42);
  assert.equal(next.bag.length, 3); assert.notEqual(next.bag[0], full.bag[0]);
});
test('debug loadout rejects overflow, fractions and invalid quantities', () => {
  for (const count of [10, -1, 1.5, NaN, Infinity, 'oops']) assert.equal(buildTrapLoadout({ snare: count }, 42), null);
});
