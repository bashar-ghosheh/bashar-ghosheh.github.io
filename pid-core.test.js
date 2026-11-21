// Numerical tests for pid-core.js (Homework 2 shared simulator).
// Run from the repository root:  node --test pid-core.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('./pid-core');
const { firstOrder, secondOrder, rk4, simulate, loopMetrics, theoryP, theoryPI, theorySensorPI, designPI, validationChecks } = core;
const { state } = require('./second-order');
const near = (a, b, tol) => assert.ok(Math.abs(a - b) <= tol, a + ' versus ' + b);
const plant = firstOrder(1, 1);
const run = (o) => {
  const s = simulate({ plant, ...o });
  return { s, m: loopMetrics(s.t, s.y, o.r ?? 1) };
};

test('[HW2 §2.1] all three validation checks pass', () => {
  for (const c of validationChecks()) assert.ok(c.pass, 'check ' + c.id + ': ' + c.got);
});

test('validation 1 in detail: Kp = 9 gives τcl = 0.1 s and 10% error', () => {
  const th = theoryP(1, 1, 9);
  near(th.tauCL, 0.1, 1e-12);
  near(th.ess, 0.1, 1e-12);
  const { s, m } = run({ Kp: 9, T: 2 });
  near(m.final, 0.9, 1e-4);
  // Closed-form closed loop: y = 0.9·(1 − e^(−t/0.1)). Compare at t = 0.1 s.
  // (Small gap: u is held for one 1 ms step, a tiny delay in a 0.1 s loop.)
  near(s.y[100], 0.9 * (1 - Math.exp(-1)), 3e-3);
});

test('validation 2 in detail: PI 1/1 is y = 1 − e^(−t), no overshoot', () => {
  const th = theoryPI(1, 1, 1, 1);
  near(th.wn, 1, 1e-12);
  near(th.zeta, 1, 1e-12);
  const { s, m } = run({ Kp: 1, Ki: 1, T: 15 });
  // The PI zero cancels the plant pole, so the loop is exactly first order.
  near(s.y[1000], 1 - Math.exp(-1), 1e-3);
  assert.ok(m.overshoot < 0.01);
});

test('P alone keeps an error, adding I removes it  [HW2 tip]', () => {
  for (const Kp of [1, 3, 9]) {
    near(run({ Kp, T: 5 }).m.ess, 1 / (1 + Kp), 1e-3);
    near(run({ Kp, Ki: 2, T: 40 }).m.ess, 0, 1e-3);
  }
});

test('the lecture table: Kp speeds up, Ki adds overshoot, Kd calms it', () => {
  const slow = run({ Kp: 1, T: 5 }).m,
    fast = run({ Kp: 9, T: 5 }).m;
  assert.ok(fast.rise < slow.rise);
  const pi = run({ Kp: 1, Ki: 10, T: 15 }).m;
  assert.ok(pi.overshoot > 10);
  const p2 = secondOrder(1, 0.3, 2);
  const noD = run({ plant: p2, Kp: 3, T: 15 }).m;
  const withD = run({ plant: p2, Kp: 3, Kd: 0.5, T: 15 }).m;
  assert.ok(withD.overshoot < noD.overshoot, withD.overshoot + ' versus ' + noD.overshoot);
});

test('[HW2 P2] a slower sensor gives more overshoot, then oscillation', () => {
  const gains = { Kp: 5, Ki: 2, T: 40 };
  const o = [0, 0.3, 0.6, 1].map((tauS) => run({ ...gains, tauS }).m.overshoot);
  assert.ok(o[0] < o[1] && o[1] < o[2] && o[2] < o[3], o.join(', '));
  // Past the Routh limit the loop oscillates and never settles.
  const lim = theorySensorPI(1, 1, 1, 2, 0);
  near(lim.KiMax, 6, 1e-12);
  assert.equal(run({ Kp: 2, Ki: 3, tauS: 1, T: 60 }).m.settled, true);
  assert.equal(run({ Kp: 2, Ki: 7, tauS: 1, T: 60 }).m.settled, false);
  // The sensor reading lags the true output.
  const { s } = run({ Kp: 2, tauS: 0.5, T: 5 });
  assert.ok(s.ym[500] < s.y[500]);
});

test('[HW2 P1] the control signal never leaves its limits', () => {
  const { s } = run({ Kp: 50, Ki: 20, uMin: 0, uMax: 1.5, T: 10 });
  assert.ok(Math.min(...s.u) >= 0 && Math.max(...s.u) <= 1.5);
  assert.ok(s.saturated > 0);
});

test('[HW2 P3] anti-windup cuts the overshoot after saturation', () => {
  const base = { Kp: 2, Ki: 5, uMin: 0, uMax: 1.2, T: 20 };
  const off = run(base).m,
    on = run({ ...base, antiWindup: true }).m;
  assert.ok(on.overshoot < off.overshoot, on.overshoot + ' versus ' + off.overshoot);
});

test('[HW2 P3] a larger Ts holds u in steps and degrades the response', () => {
  const { s } = run({ Kp: 5, Ki: 5, Ts: 0.1, T: 5 });
  near(s.dt * Math.round(0.1 / s.dt), 0.1, 1e-12);
  // u stays constant inside one sample.
  assert.equal(s.u[1], s.u[0]);
  assert.equal(s.u[Math.round(0.05 / s.dt)], s.u[0]);
  const o = [0.01, 0.1, 0.2].map((Ts) => run({ Kp: 5, Ki: 5, Ts, T: 20 }).m.overshoot);
  assert.ok(o[0] < o[1] && o[1] < o[2], o.join(', '));
});

test('digital PID with a tiny Ts matches the continuous PID', () => {
  const a = run({ Kp: 3, Ki: 2, Kd: 0.1, T: 5 }).s;
  const b = run({ Kp: 3, Ki: 2, Kd: 0.1, Ts: 0.001, T: 5 }).s;
  near(a.y[3000], b.y[3000], 1e-9);
});

test('designPI gives back the requested ζ and ωn  [HW2 §3]', () => {
  for (const [K, tau, zeta, wn] of [
    [2, 0.15, 0.7, 20],
    [1, 1, 0.6, 3],
  ]) {
    const g = designPI(K, tau, zeta, wn);
    const th = theoryPI(K, tau, g.Kp, g.Ki);
    near(th.zeta, zeta, 1e-12);
    near(th.wn, wn, 1e-12);
  }
});

test('second-order plant under RK4 matches the Module 3 closed form', () => {
  for (const z of [0.3, 1, 1.8]) {
    const p = secondOrder(1, z, 2);
    let x = [0, 0];
    const h = 0.001;
    for (let k = 0; k < 1500; k++) x = rk4((s) => p.deriv(s, 1), x, h);
    near(x[0], state(1.5, z, 2)[0], 1e-9);
    near(x[1], state(1.5, z, 2)[1], 1e-9);
  }
});
