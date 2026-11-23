// Tests for the My system motor model and design (motor-model.js).
// Run from the repository root:  node --test motor-model.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const mm = require('./motor-model');
const { theoryPI } = require('./pid-core');
const near = (a, b, tol) => assert.ok(Math.abs(a - b) <= tol, a + ' versus ' + b);

test('[DS] datasheet numbers give R, Ke, Kt and the plant K and τ', () => {
  const p = mm.motorPlant();
  near(p.R, 6 / 0.55, 1e-12);
  near(p.Ke, (6 - 0.04 * p.R) / ((530 * 30 * 2 * Math.PI) / 60), 1e-12);
  near(p.Kt, (0.4 * 0.0980665) / 30 / 0.55, 1e-12);
  near(p.K, 5.3, 1e-12);
  // About 27 ms with a 120 g robot on 32 mm wheels: a fast first-order plant.
  assert.ok(p.tau > 0.015 && p.tau < 0.04, String(p.tau));
});

test('a heavier robot or bigger wheels make the plant slower', () => {
  const base = mm.motorPlant().tau;
  assert.ok(mm.motorPlant(mm.DATASHEET, { ...mm.ASSUMED, massGrams: 240 }).tau > base);
  assert.ok(mm.motorPlant(mm.DATASHEET, { ...mm.ASSUMED, wheelMm: 40 }).tau > base);
});

test('[HW2 §3] the default design meets the spec: 0.6 ≤ ζ ≤ 0.8, PWM in 0–100%, zero error', () => {
  const p = mm.motorPlant();
  const d = mm.designLoop({ K: p.K, tau: p.tau, zeta: 0.7, wn: 45, rpm: 300, TsMs: 5 });
  const th = theoryPI(p.K, p.tau, d.Kp, d.Ki);
  near(th.zeta, 0.7, 1e-9);
  near(th.wn, 45, 1e-9);
  assert.ok(mm.specChecks(d, 0.7).every((c) => c.pass));
  assert.ok(Math.max(...d.run.u) <= 100 && Math.min(...d.run.u) >= 0);
});

test('a loop that is too fast clips the PWM and fails that line', () => {
  const p = mm.motorPlant();
  const d = mm.designLoop({ K: p.K, tau: p.tau, zeta: 0.7, wn: 110, rpm: 400, TsMs: 5 });
  assert.equal(mm.specChecks(d, 0.7).find((c) => c.name.startsWith('PWM')).pass, false);
});

test('a measured step test gives back K and τ', () => {
  const p = mm.motorPlant();
  for (let i = 0; i < 10; i++) {
    const fit = mm.fitStep(mm.parseLog(mm.exampleLog(p, 50, 0.01)), 50);
    near(fit.K, p.K, 0.1);
    near(fit.tau, p.tau, 0.003);
  }
  assert.throws(() => mm.fitStep(mm.parseLog('0, 0\n1, 1'), 50));
});
