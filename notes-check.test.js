// Cross-check: the closed-form formulas used by the toolkit against the RK4
// simulator and the eigenvalue function that Dr. Ghanem gives in the
// State-Space Modeling notes, Section 7.1. The two functions below are copied
// from the notes without changes.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { response, wave } = require('./frequency.js');
const { state, eigen, poles } = require('./second-order.js');
const { sensorOutput } = require('./sensor-game.js');

// ---- [NOTES §7.1] start of the code from the notes ----
// Simulate dx/dt = A x + B u(t) with RK4 (single input u)
function simulate(A, B, u, x0, h, tEnd) {
  const f = (x, t) => A.map((row, i) =>
    row.reduce((sum, a, j) => sum + a * x[j], 0) + B[i] * u(t));
  const add = (x, k, c) => x.map((xi, i) => xi + c * k[i]);
  let x = x0.slice(), t = 0;
  const T = [0], X = [x0.slice()];
  const n = Math.round(tEnd / h);
  for (let step = 0; step < n; step++) {
    const k1 = f(x, t);
    const k2 = f(add(x, k1, h / 2), t + h / 2);
    const k3 = f(add(x, k2, h / 2), t + h / 2);
    const k4 = f(add(x, k3, h), t + h);
    x = x.map((xi, i) => xi + h / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
    t = (step + 1) * h;
    T.push(t); X.push(x.slice());
  }
  return { T, X };
}

// Eigenvalues of a 2x2 matrix (= the poles)
function eig2(A) {
  const tr = A[0][0] + A[1][1];
  const det = A[0][0] * A[1][1] - A[0][1] * A[1][0];
  const disc = tr * tr / 4 - det;
  if (disc >= 0) {
    const r = Math.sqrt(disc);
    return [{ re: tr / 2 + r, im: 0 }, { re: tr / 2 - r, im: 0 }];
  }
  const w = Math.sqrt(-disc);
  return [{ re: tr / 2, im: w }, { re: tr / 2, im: -w }];
}
// ---- [NOTES §7.1] end of the code from the notes ----

function near(actual, expected, tolerance) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} vs ${expected}`);
}

test('notes example: m = 1, b = 2, k = 4, F = 4 N gives a peak of about 1.163', () => {
  const { X } = simulate([[0, 1], [-4, -2]], [0, 1], () => 4, [0, 0], 0.01, 8);
  near(Math.max(...X.map(x => x[0])), 1.163, 0.001);
});

test('Module 1 step and ramp formulas match the RK4 simulation [NOTES §3.1]', () => {
  const K = 1.8, tau = 0.7;   // x' = −x/τ + (K/τ)·u
  const step = simulate([[-1 / tau]], [K / tau], () => 1, [0], 0.001, 5);
  const ramp = simulate([[-1 / tau]], [K / tau], t => t, [0], 0.001, 5);
  step.T.forEach((t, i) => {
    near(step.X[i][0], sensorOutput({ kind: 'step1', K, tau }, t), 1e-8);
    near(ramp.X[i][0], K * (t - tau * (1 - Math.exp(-t / tau))), 1e-8);
  });
});

test('Module 2 sine formula matches the RK4 simulation once the transient is gone', () => {
  const tau = 0.2, omega = 2, sensor = response(tau, omega);
  const { T, X } = simulate([[-1 / tau]], [1 / tau], t => Math.sin(omega * t), [0], 0.001, 12);
  T.forEach((t, i) => { if (t > 6) near(X[i][0], wave(t, omega, sensor), 1e-6); });   // 6 s = 30 τ
});

test('Module 3 step formula matches the RK4 simulation in all three damping cases [NOTES §5.3]', () => {
  for (const [zeta, wn] of [[0.2, 3], [0.5, 2], [1, 2], [2, 2]]) {
    // Canonical form with K = 1: A = [[0, 1], [−ωn², −2ζωn]], B = [0, ωn²]
    const { T, X } = simulate([[0, 1], [-wn * wn, -2 * zeta * wn]], [0, wn * wn], () => 1, [0, 0], 0.001, 6);
    T.forEach((t, i) => {
      const [x1, x2] = state(t, zeta, wn);
      near(X[i][0], x1, 1e-7);   // displacement
      near(X[i][1], x2, 1e-6);   // velocity (phase plane)
    });
  }
});

test('eigen() of Module 3 gives the same numbers as eig2() of the notes, and they equal the poles', () => {
  for (const [m, b, k] of [[1, 2, 4], [1, 0.8, 4], [1, 4, 4], [1, 8, 4], [2.5, 3, 7]]) {
    const ours = eigen(m, b, k), notes = eig2([[0, 1], [-k / m, -b / m]]);
    const transfer = poles(b / (2 * Math.sqrt(k * m)), Math.sqrt(k / m));
    ours.forEach((value, i) => {
      near(value[0], notes[i].re, 1e-12); near(value[1], notes[i].im, 1e-12);
      near(value[0], transfer[i][0], 1e-9); near(value[1], transfer[i][1], 1e-9);
    });
  }
  const e = eig2([[0, 1], [-4, -2]]);
  near(e[0].re, -1, 1e-12); near(e[0].im, 1.732, 0.001);   // validation check 6
});
