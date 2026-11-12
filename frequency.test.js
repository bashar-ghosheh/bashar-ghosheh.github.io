const { test } = require('node:test');
const assert = require('node:assert/strict');
const { response, tauLimit, wave, angularFrequency } = require('./frequency.js');
function near(actual, expected, tolerance) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} vs ${expected}`);
}
test('sin(2t), tau = 0.2 s', () => {
  const r = response(0.2, 2);
  near(r.ratio, 0.92848, 0.00001);
  near((r.phase * 180) / Math.PI, -21.8, 0.05);
  near(r.error, -0.07152, 0.00001);
  near(wave(0, 2, r), -0.34483, 0.00001);
});
test('cutoff of a 0.2 s sensor', () => {
  const r = response(0.2, 5);
  near(r.cutoff, 5, 0);
  near(r.db, -3.0103, 0.0001);
  near(r.phase, -Math.PI / 4, 1e-12);
});
test('100 Hz bandwidth with 5% maximum loss', () => {
  const tau = tauLimit(100, 0.05);
  near(tau * 1000, 0.523, 0.001);
  near(response(tau, angularFrequency(100)).ratio, 0.95, 1e-12);
  near((response(tau, angularFrequency(50)).phase * 180) / Math.PI, -9.3, 0.05);
});

test('two-tone input and steady-state output, including the single-tone limit', () => {
  const { twoTone } = require('./frequency.js');
  const times = [0, Math.PI / 2];
  const mixed = twoTone(times, 1, 1, 2, 0.5);
  near(mixed.input[1], 1, 1e-12);
  near(mixed.output[0], -0.7, 1e-12);
  near(mixed.output[1], 0.7, 1e-12);
  near(twoTone(times, 1, 1, 2, 0).output[0], -0.5, 1e-12);
});
