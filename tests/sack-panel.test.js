import test from 'node:test';
import assert from 'node:assert/strict';
import { createSackPanel, toggleSackPanel, revealSackPanel, stepSackPanel } from '../src/sack-panel.js';

test('sack starts tucked away, opens manually and closes on movement', () => {
  const panel = createSackPanel();
  assert.equal(stepSackPanel(panel, {}, 0), false);
  toggleSackPanel(panel); assert.equal(stepSackPanel(panel, {}, 0), true);
  assert.equal(stepSackPanel(panel, { moving: true }, 0.016), false);
  assert.equal(stepSackPanel(panel, {}, 0.016), false);
});

test('loot highlights reveal the sack; continuing movement tucks it away after the peek', () => {
  const panel = createSackPanel();
  assert.equal(stepSackPanel(panel, { targetId: 'ruby', moving: true }, 0.016), true);
  assert.equal(stepSackPanel(panel, { targetId: 'ruby', moving: true }, 1.2), false);
  assert.equal(stepSackPanel(panel, { targetId: 'ruby' }, 0.016), true);
  assert.equal(stepSackPanel(panel, { targetId: 'ruby', moving: true }, 0.016), false);
});

test('pickup reveals even on a movement start, but never permanently pins it', () => {
  const panel = createSackPanel();
  revealSackPanel(panel);
  assert.equal(stepSackPanel(panel, { moving: true }, 0.016), true);
  assert.equal(stepSackPanel(panel, { moving: true }, 2), false);
});

test('manual dismissal is respected for an unchanged highlight; a new item reveals it', () => {
  const panel = createSackPanel();
  stepSackPanel(panel, { targetId: 'ruby' }, 0);
  toggleSackPanel(panel, 'ruby');
  assert.equal(stepSackPanel(panel, { targetId: 'ruby' }, 1), false);
  assert.equal(stepSackPanel(panel, { targetId: 'coin' }, 0), true);
});

test('a held item keeps the sack accessible while moving or toggling; results hide it', () => {
  const panel = createSackPanel();
  assert.equal(stepSackPanel(panel, { holding: true, moving: true }, 2), true);
  toggleSackPanel(panel, null, true);
  assert.equal(stepSackPanel(panel, { holding: true, moving: true }, 2), true);
  assert.equal(stepSackPanel(panel, { holding: true, active: false }, 0), false);
  assert.equal(createSackPanel().open, false);
});
