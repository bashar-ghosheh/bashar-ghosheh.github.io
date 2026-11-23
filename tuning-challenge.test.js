// Tests for the P4 tuning challenge (tuning-challenge.js).
// Run from the repository root:  node --test tuning-challenge.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const tc = require('./tuning-challenge');

test('[HW2 P4] every round has a hidden plant, a clear spec and a working solution', () => {
  for (const level of Object.keys(tc.LEVELS)) {
    for (let i = 0; i < 40; i++) {
      const round = tc.newRound(level);
      assert.ok(tc.LEVELS[level].kinds.includes(round.sensor.kind));
      assert.ok(round.spec.settle > 0 && round.spec.overshoot > 0);
      // The reference gains pass every part of the spec on the true plant.
      const result = tc.judge(round, tc.runTest(round, round.reference));
      assert.ok(result.passed, level + ' ' + JSON.stringify(round.sensor));
      // The sliders are wide enough to reach the reference gains.
      for (const g of ['Kp', 'Ki', 'Kd']) assert.ok(round.reference[g] <= round.ranges[g]);
    }
  }
});

test('plants are random: twenty rounds give different plants', () => {
  const seen = new Set();
  for (let i = 0; i < 20; i++) seen.add(JSON.stringify(tc.newRound('normal').sensor));
  assert.ok(seen.size > 15);
});

test('P alone can never pass the zero-error line  [HW2 §1]', () => {
  for (let i = 0; i < 20; i++) {
    const round = tc.newRound('normal');
    for (const Kp of [1, 5, 20]) {
      const result = tc.judge(round, tc.runTest(round, { Kp, Ki: 0, Kd: 0 }));
      assert.equal(result.parts.find((p) => p.key === 'error').pass, false);
    }
  }
});

test('the spec limits come from the plant: settle in about half the open-loop time', () => {
  for (let i = 0; i < 20; i++) {
    const round = tc.newRound('normal');
    const open = tc.openLoopSettle(round.sensor);
    assert.ok(Math.abs(round.spec.settle / open - 0.5) < 0.05, round.spec.settle + ' versus ' + open);
  }
});

test('hard rounds limit the actuator and the tests respect it', () => {
  const round = tc.newRound('hard');
  assert.equal(round.spec.uMin, 0);
  const run = tc.runTest(round, { Kp: 50, Ki: 50, Kd: 0 });
  assert.ok(Math.max(...run.u) <= round.spec.uMax && Math.min(...run.u) >= 0);
});

test('an unstable loop fails every part instead of crashing', () => {
  const round = tc.newRound('hard');
  const fake = { t: [0, 1, 2], y: [0, 1e9, NaN], u: [0, 0, 0] };
  const result = tc.judge(round, fake);
  assert.equal(result.unstable, true);
  assert.ok(result.parts.every((p) => !p.pass));
});

test('pole placement gives the requested characteristic polynomial', () => {
  // Second order K = 1, ζ = 0.4, ωn = 3: s³ + (2ζωn + ωn²Kd)s² + ωn²(1 + Kp)s + ωn²Ki
  const sensor = { order: 2, K: 1, zeta: 0.4, wn: 3 };
  const g = tc.placePoles(sensor, 0.8, 4, 5);
  const w2 = 9;
  const a2 = 2 * 0.4 * 3 + w2 * g.Kd,
    a1 = w2 * (1 + g.Kp),
    a0 = w2 * g.Ki;
  // Wanted: (s² + 6.4s + 16)(s + 5) = s³ + 11.4s² + 48s + 80
  assert.ok(Math.abs(a2 - 11.4) < 1e-9 && Math.abs(a1 - 48) < 1e-9 && Math.abs(a0 - 80) < 1e-9);
});

test('score: weights of passed parts, free tests, then 5% per extra test', () => {
  const all = [
    { key: 'overshoot', pass: true },
    { key: 'settle', pass: true },
    { key: 'error', pass: true },
  ];
  assert.deepEqual(tc.score(all, 1), { earned: 100, factor: 1, total: 100, stars: 3 });
  assert.equal(tc.score(all, 5).total, 90);
  assert.equal(tc.score(all, 30).total, 50);
  const two = all.map((p) => ({ ...p, pass: p.key !== 'error' }));
  assert.equal(tc.score(two, 2).total, 70);
});
