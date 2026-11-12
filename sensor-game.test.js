const { test } = require('node:test');
const assert = require('node:assert/strict');
const { newSensor, sensorOutput, measure, percentError, pointsFor, scoreGuess, SAMPLES, NOISE } = require('./sensor-game.js');
function near(actual, expected, tolerance) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} vs ${expected}`);
}

test('scoring: within 10% is full marks, then points fall to zero at 50%', () => {
  assert.equal(pointsFor(0), 100);
  assert.equal(pointsFor(10), 100);
  assert.equal(pointsFor(30), 50);
  assert.equal(pointsFor(50), 0);
  assert.equal(pointsFor(400), 0);
  near(percentError(1.1, 1), 10, 1e-9);
  near(percentError(0.9, 1), 10, 1e-9);
});

test('round score is the average over the estimated parameters', () => {
  const sensor = { kind: 'step1', K: 2, tau: 1 };
  assert.equal(scoreGuess(sensor, { K: 2.1, tau: 0.95 }).total, 100);
  assert.equal(scoreGuess(sensor, { K: 2, tau: 1.3 }).total, 75);   // 100 and 50
});

test('true curves match the lecture numbers', () => {
  near(sensorOutput({ kind: 'step1', K: 2, tau: 0.5 }, 0.5), 2 * 0.632, 0.001);       // 63.2% at τ
  near(sensorOutput({ kind: 'step1', K: 2, tau: 0.5 }, 1.5), 2 * 0.950, 0.001);       // 95% at 3τ
  // τ = 0.2 s and sin 2t: amplitude 0.93. The peak comes a quarter period plus the lag after t = 0.
  near(sensorOutput({ kind: 'sine1', K: 1, tau: 0.2, omega: 2 }, (Math.PI / 2 + Math.atan(0.4)) / 2), 0.928, 0.001);
  // ζ = 0.5, ωn = 2: 16.3% overshoot at tp = 1.814 s.
  near(sensorOutput({ kind: 'step2', K: 1, zeta: 0.5, wn: 2 }, 1.814), 1.163, 0.001);
});

test('random sensors stay inside playable ranges', () => {
  for (let i = 0; i < 500; i++) {
    const s = newSensor();
    assert.ok(['step1', 'sine1', 'step2'].includes(s.kind));
    if (s.kind === 'step2') assert.ok(s.zeta >= 0.15 && s.zeta <= 0.6 && s.order === 2);
    else assert.ok(s.tau > 0 && s.order === 1);
    if (s.kind === 'sine1') assert.ok(s.omega * s.tau > 0.9 && s.omega * s.tau < 2.7);
    const data = measure(s);
    assert.equal(data.times.length, SAMPLES + 1);
    // Noise is small: no reading is more than 3 noise sizes from the true curve.
    data.times.forEach((t, j) => near(data.values[j], sensorOutput(s, t), 3 * NOISE * s.K + 1e-9));
  }
});

// "Play your own Module 4": a careful student who smooths the dots and uses
// the lecture methods should earn full marks almost every time.
test('the game is fair: lecture methods reach full marks on noisy data', () => {
  const smooth = v => v.map((_, i) => { const part = v.slice(Math.max(0, i - 2), i + 3); return part.reduce((a, b) => a + b) / part.length; });
  function student(s, data) {
    const y = smooth(data.values), t = data.times;
    if (s.kind === 'step1') {                    // final level, then the 63.2% point
      const K = data.values.slice(-20).reduce((a, b) => a + b) / 20;
      return { K, tau: t[y.findIndex(v => v >= 0.632 * K)] };
    }
    if (s.kind === 'sine1') {                    // amplitude ratio
      const M = (Math.max(...y) - Math.min(...y)) / 2;
      return { tau: Math.sqrt(1 / (M * M) - 1) / s.omega };
    }
    const peak = Math.max(...y), L = Math.log(peak - 1);   // overshoot and peak time
    const zeta = -L / Math.sqrt(Math.PI ** 2 + L * L);
    return { zeta, wn: Math.PI / (t[y.indexOf(peak)] * Math.sqrt(1 - zeta * zeta)) };
  }
  for (const kind of ['step1', 'sine1', 'step2']) {
    let full = 0;
    for (let i = 0; i < 400; i++) {
      const s = newSensor(kind);
      if (scoreGuess(s, student(s, measure(s))).total === 100) full++;
    }
    assert.ok(full >= 380, kind + ': only ' + full + ' of 400 rounds reached full marks');
  }
});
