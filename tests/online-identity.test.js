import test from 'node:test';
import assert from 'node:assert/strict';
import { createOnlineIdentity } from '../src/online-identity.js';
function storage() { const map = new Map(); return { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value) }; }

test('browser remembers goblins across closed tabs and keeps separate per-tab selections', () => {
  const local = storage(), tabA = storage(), tabB = storage();
  const a = createOnlineIdentity(local, tabA); assert.equal(a.token(), undefined);
  a.remember('a', 'Goblin 1');
  const b = createOnlineIdentity(local, tabB); assert.equal(b.token(), 'a');
  b.select(null); assert.equal(b.token(), undefined); b.remember('b', 'Goblin 2');
  assert.equal(createOnlineIdentity(local, tabA).token(), 'a');
  assert.equal(createOnlineIdentity(local, tabB).token(), 'b');
  const reopen = createOnlineIdentity(local, storage()); assert.equal(reopen.token(), 'a');
  assert.deepEqual(reopen.list().map(p => p.name), ['Goblin 1', 'Goblin 2']);
  reopen.select('b'); assert.equal(reopen.token(), 'b');
});
test('unknown server token is replaced without erasing other remembered goblins', () => {
  const local = storage(), tab = storage(), a = createOnlineIdentity(local, tab);
  a.remember('old', 'Old goblin'); a.select(null); a.remember('other', 'Other goblin');
  a.select('old'); a.remember('new', 'Goblin 1');
  assert.deepEqual(a.list().map(p => p.token), ['other', 'new']);
});
test('blocked browser storage remains playable and reports inability to remember identity', () => {
  const blocked = { getItem() { throw Error('Blocked'); }, setItem() { throw Error('Blocked'); } };
  const a = createOnlineIdentity(blocked, blocked);
  a.remember('key', 'Goblin 1'); assert.equal(a.token(), 'key'); assert.equal(a.remembered(), false);
});

test('tabs opened together merge their remembered goblins instead of overwriting the list', () => {
  const local = storage(), a = createOnlineIdentity(local, storage()), b = createOnlineIdentity(local, storage());
  a.remember('a', 'Goblin 1'); b.remember('b', 'Goblin 2');
  assert.deepEqual(a.list().map(p => p.token), ['a', 'b']);
  assert.deepEqual(b.list().map(p => p.token), ['a', 'b']);
});
