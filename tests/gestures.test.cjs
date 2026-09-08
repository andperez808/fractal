const { test } = require('node:test');
const assert = require('node:assert/strict');
const { GestureEngine } = require('../.test-build/gestures.js');
const { defaults, initialView } = require('../.test-build/types.js');
const hand = (id, x, y = 0.5) => {
  const points = Array.from({ length: 21 }, () => ({ x, y }));
  points[0] = { x, y: y + 0.2 };
  points[9] = { x, y };
  points[4] = { x: x - 0.01, y };
  points[8] = { x: x + 0.01, y };
  return { id, points };
};
const actions = { update: () => {}, reset: () => {} };
test('spreading two pinched hands zooms in without a mode-entry jump', () => {
  const g = new GestureEngine(),
    v = initialView(),
    s = { ...defaults };
  g.process([hand('L', 0.3), hand('R', 0.7)], 0, s, v, actions);
  assert.equal(v.distance, 3.5);
  g.process([hand('L', 0.2), hand('R', 0.8)], 50, s, v, actions);
  assert.ok(v.distance < 3.5);
});
test('hand array reordering preserves identity and avoids a rotation jump', () => {
  const g = new GestureEngine(),
    v = initialView();
  g.process([hand('L', 0.3), hand('R', 0.7)], 0, defaults, v, actions);
  g.process([hand('R', 0.7), hand('L', 0.3)], 50, defaults, v, actions);
  assert.equal(v.roll, 0);
  assert.equal(v.distance, 3.5);
});
test('tracking loss releases interaction and reacquisition does not jump', () => {
  const g = new GestureEngine(),
    v = initialView();
  g.process([hand('L', 0.3)], 0, defaults, v, actions);
  g.process([], 50, defaults, v, actions);
  assert.equal(v.interacting, false);
  const yaw = v.yaw;
  g.process([hand('L', 0.9)], 100, defaults, v, actions);
  assert.equal(v.yaw, yaw);
});
test('switching from one hand to two does not change zoom or orientation', () => {
  const g = new GestureEngine(),
    v = initialView();
  g.process([hand('L', 0.2)], 0, defaults, v, actions);
  g.process([hand('L', 0.2), hand('R', 0.8)], 50, defaults, v, actions);
  assert.equal(v.distance, 3.5);
  assert.equal(v.roll, 0);
});
test('clockwise and counterclockwise twists have opposite signs', () => {
  const a = new GestureEngine(),
    b = new GestureEngine(),
    va = initialView(),
    vb = initialView();
  for (const [g, v] of [
    [a, va],
    [b, vb],
  ])
    g.process([hand('L', 0.3), hand('R', 0.7)], 0, defaults, v, actions);
  a.process(
    [hand('L', 0.3, 0.4), hand('R', 0.7, 0.6)],
    50,
    defaults,
    va,
    actions,
  );
  b.process(
    [hand('L', 0.3, 0.6), hand('R', 0.7, 0.4)],
    50,
    defaults,
    vb,
    actions,
  );
  assert.ok(va.roll > 0);
  assert.ok(vb.roll < 0);
});
test('an open palm must be held and only toggles once per hold', () => {
  const g = new GestureEngine(),
    v = initialView(),
    h = hand('L', 0.5);
  for (const i of [8, 12, 16, 20]) h.points[i] = { x: 0.5, y: 0.1 };
  h.points[4] = { x: 0.2, y: 0.5 };
  let count = 0;
  const a = { update: () => count++, reset: () => {} };
  for (let t = 0; t <= 1800; t += 100) g.process([h], t, defaults, v, a);
  assert.equal(count, 1);
});
