// P4 · Tuning challenge (Ahmad AlSheikh)
// The maths only, with no page elements, so the same code runs in the browser
// and in the Node tests (tuning-challenge.test.js).
//
// Reference tags used in the comments of this project:
//   [HW2 §x]   = Homework 2 sheet (PID Control Toolkit), section x
//   [HW §x]    = Homework 1 sheet, section x
//   [SLIDES n] = lecture slides "Static and Dynamic Characteristics", slide n
//
// [HW2 P4] "A hidden random plant (reusing Homework 1's Module 4) and a spec, for
// example overshoot ≤ 10%, a settling time limit and zero steady-state error. The
// page shows pass or fail on each part of the spec, and a score."

// In Node, borrow the simulator and Module 4. In the browser, control-p4.html
// has already loaded pid-core.js, frequency.js, second-order.js and sensor-game.js.
if (typeof require !== 'undefined') {
  Object.assign(globalThis, require('./pid-core.js'), require('./frequency.js'), require('./second-order.js'), require('./sensor-game.js'));
}

// ---------------------------------------------------------------- levels
// Each level sets the kind of plant, the overshoot limit, how much faster than
// the plant on its own the loop must settle, and (Hard) an actuator limit.
const LEVELS = {
  easy: { label: 'Easy', kinds: ['step1'], overshoot: 15, speedUp: 0.8, limited: false },
  normal: { label: 'Normal', kinds: ['step1', 'step2'], overshoot: 10, speedUp: 0.5, limited: false },
  hard: { label: 'Hard', kinds: ['step2'], overshoot: 5, speedUp: 0.5, limited: true },
};
const ERROR_LIMIT = 1; // "zero" steady-state error means |e_ss| ≤ 1% of the step
const WEIGHTS = { overshoot: 35, settle: 35, error: 30 };
const FREE_TESTS = 3; // tests 1–3 cost nothing, every later test costs 5%

// ---------------------------------------------------------------- plants
// Module 4's hidden sensor becomes the plant to control:
//   step1 → first order  K/(τs + 1)                 [SLIDES 13]
//   step2 → second order K·ωn²/(s² + 2ζωn·s + ωn²)  [SLIDES 40]
function plantOf(sensor) {
  return sensor.order === 1 ? firstOrder(sensor.K, sensor.tau) : secondOrder(sensor.K, sensor.zeta, sensor.wn);
}

// 2% settling time of the plant with no controller (unit step straight in).
function openLoopSettle(sensor) {
  const t = [],
    y = [];
  const T = sensor.order === 1 ? 8 * sensor.tau : 10 / (sensor.zeta * sensor.wn);
  const n = 4000;
  for (let i = 0; i <= n; i++) {
    t.push((T * i) / n);
    y.push(sensorOutput(sensor, (T * i) / n));
  }
  return loopMetrics(t, y, sensor.K).settle;
}

// Round to two significant figures, so a spec reads "3.4 s", not "3.4127 s".
const tidy = (v) => Number(v.toPrecision(2));

// ---------------------------------------------------------------- spec
function makeSpec(level, sensor) {
  const L = LEVELS[level];
  const settle = tidy(L.speedUp * openLoopSettle(sensor));
  return {
    overshoot: L.overshoot, // %
    settle, // s
    error: ERROR_LIMIT, // % of the step
    uMin: L.limited ? 0 : -Infinity,
    uMax: L.limited ? tidy(3 / sensor.K) : Infinity, // 3 times the steady-state drive
    T: tidy(Math.max(3 * settle, 1)), // simulated time for every test
  };
}

// One test of the gains on the true hidden plant  [HW2 §4: own RK4 simulation].
function runTest(round, gains) {
  const { spec } = round;
  return simulate({
    plant: plantOf(round.sensor),
    Kp: gains.Kp,
    Ki: gains.Ki,
    Kd: gains.Kd,
    uMin: spec.uMin,
    uMax: spec.uMax,
    antiWindup: gains.antiWindup ?? true,
    T: spec.T,
  });
}

// Pass or fail on each part of the spec  [HW2 P4].
function judge(round, run) {
  // A loop that blows up has no meaningful metrics: fail every part.
  const unstable = !run.y.every((v) => Number.isFinite(v) && Math.abs(v) < 1e6);
  if (unstable) {
    const fail = (key, label, limit) => ({ key, label, limit, value: null, shown: 'unstable', pass: false });
    return {
      metrics: null,
      unstable,
      passed: false,
      parts: [fail('overshoot', 'Overshoot', '≤ ' + round.spec.overshoot + '%'), fail('settle', 'Settling time (2%)', '≤ ' + round.spec.settle + ' s'), fail('error', 'Steady-state error', '≈ 0 (within ' + round.spec.error + '%)')],
    };
  }
  const m = loopMetrics(run.t, run.y, 1);
  const { spec } = round;
  const err = 100 * Math.abs(m.ess);
  // Overshoot is measured above the target r = 1 (the red ceiling on the plot),
  // so a loop that stops short cannot hide a big swing behind a low final value.
  const over = 100 * Math.max(0, Math.max(...run.y) - 1);
  m.overshoot = over;
  const parts = [
    { key: 'overshoot', label: 'Overshoot', limit: '≤ ' + spec.overshoot + '%', value: over, shown: over.toFixed(1) + '%', pass: over <= spec.overshoot },
    {
      key: 'settle',
      label: 'Settling time (2%)',
      limit: '≤ ' + spec.settle + ' s',
      value: m.settle,
      shown: m.settled && m.settle !== null ? m.settle.toFixed(2) + ' s' : 'not settled',
      pass: m.settled && m.settle !== null && m.settle <= spec.settle,
    },
    { key: 'error', label: 'Steady-state error', limit: '≈ 0 (within ' + spec.error + '%)', value: err, shown: (100 * m.ess).toFixed(2) + '%', pass: m.settled && err <= spec.error },
  ];
  return { metrics: m, unstable, parts, passed: parts.every((p) => p.pass) };
}

// Score: the weights of the parts that pass, then 5% off for each test after
// the third (never below half).
function score(parts, tests) {
  const earned = parts.reduce((sum, p) => sum + (p.pass ? WEIGHTS[p.key] : 0), 0);
  const factor = Math.max(0.5, 1 - 0.05 * Math.max(0, tests - FREE_TESTS));
  return { earned, factor, total: Math.round(earned * factor), stars: earned === 100 ? (tests <= FREE_TESTS ? 3 : 2) : earned >= 65 ? 1 : 0 };
}

// ---------------------------------------------------------------- reference design
// Pole placement on the closed loop. With C(s) = (Kd·s² + Kp·s + Ki)/s:
//   first order:  τs² + (1 + K·Kp)s + K·Ki                         (Kd = 0)
//   second order: s³ + (2ζωn + K·ωn²·Kd)s² + ωn²(1 + K·Kp)s + K·ωn²·Ki
// Match these with the wanted poles: a pair with damping ζd and frequency ωd
// (and, for second order, a third real pole at −p).
function placePoles(sensor, zd, wd, p) {
  const { K } = sensor;
  if (sensor.order === 1) {
    const g = designPI(K, sensor.tau, zd, wd);
    return { Kp: g.Kp, Ki: g.Ki, Kd: 0 };
  }
  const w2 = sensor.wn * sensor.wn;
  return {
    Kp: ((wd * wd + 2 * zd * wd * p) / w2 - 1) / K,
    Ki: (wd * wd * p) / (K * w2),
    Kd: (2 * zd * wd + p - 2 * sensor.zeta * sensor.wn) / (K * w2),
  };
}
// Search a small set of pole choices and keep the first set of gains that passes
// the spec on the true plant. Every round is checked this way before it is shown,
// so a solution always exists.
function findReference(round) {
  const { sensor, spec } = round;
  for (const speed of [1, 1.4, 2, 2.8, 4]) {
    for (const zd of [1, 0.9, 1.2, 0.8, 1.5]) {
      const wd = (4 * speed) / (zd * spec.settle);
      for (const pf of sensor.order === 1 ? [0] : [1, 2, 0.6]) {
        const g = placePoles(sensor, zd, wd, pf * zd * wd);
        if (g.Kp < 0 || g.Ki <= 0 || g.Kd < 0) continue;
        const gains = { Kp: Number(g.Kp.toFixed(3)), Ki: Number(g.Ki.toFixed(3)), Kd: Number(g.Kd.toFixed(3)), antiWindup: true };
        if (judge(round, runTest(round, gains)).passed) return { ...gains, zd, wd: Number(wd.toFixed(3)), p: pf * zd * wd };
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------- a round
// A new hidden plant for this level, its spec, a reference solution, and slider
// ranges wide enough to hold that solution three times over.
function newRound(level = 'normal') {
  const L = LEVELS[level];
  for (let attempt = 0; attempt < 30; attempt++) {
    const kind = L.kinds[Math.floor(Math.random() * L.kinds.length)];
    const sensor = newSensor(kind);
    const round = { level, sensor, spec: makeSpec(level, sensor) };
    const reference = findReference(round);
    if (!reference) continue;
    const top = (v, floor) => Math.max(floor, Number((3 * v).toPrecision(1)));
    round.reference = reference;
    round.ranges = { Kp: top(reference.Kp, 5), Ki: top(reference.Ki, 5), Kd: sensor.order === 1 ? 1 : top(reference.Kd, 1) };
    round.bench = measure({ ...sensor, tEnd: sensor.order === 1 ? 6 * sensor.tau : Math.min(sensor.tEnd, 12 / (sensor.zeta * sensor.wn)) });
    return round;
  }
  throw new Error('No solvable plant found');
}

// After the reveal: how the reference gains were found, in words.
function referenceSolution(round) {
  const { sensor, reference: g, spec } = round;
  const f = (v, d = 2) => Number(v).toFixed(d);
  const lines = [];
  if (sensor.order === 1) {
    lines.push('The plant is first order: K = ' + f(sensor.K) + ', τ = ' + f(sensor.tau) + ' s. Read them off the bench curve with the 63.2% point, as in Module 1 and Guess the sensor.');
    lines.push('A PI loop on this plant is second order: τs² + (1 + K·Kp)s + K·Ki = 0, so ωn = √(K·Ki/τ) and ζ = (1 + K·Kp)/(2√(τ·K·Ki)).');
    lines.push('Pick ζ = ' + f(g.zd, 1) + ' and ωn = ' + f(g.wd) + ' rad/s, so the rule of thumb 4/(ζωn) = ' + f(4 / (g.zd * g.wd)) + ' s aims at the ' + spec.settle + ' s deadline. Then Ki = ωn²τ/K = ' + f(g.Ki) + ' and Kp = (2ζωnτ − 1)/K = ' + f(g.Kp) + '.');
  } else {
    lines.push('The plant is second order: K = 1, ζ = ' + f(sensor.zeta) + ', ωn = ' + f(sensor.wn, 1) + ' rad/s. The overshoot and peak time of the bench curve give them, as in Guess the sensor.');
    lines.push('With PID the loop is third order: s³ + (2ζωn + ωn²Kd)s² + ωn²(1 + Kp)s + ωn²Ki = 0. Three gains place three poles.');
    lines.push('Poles chosen: a pair with ζ = ' + f(g.zd, 1) + ', ω = ' + f(g.wd) + ' rad/s, and a real pole at −' + f(g.p) + '. Matching the coefficients gives Kp = ' + f(g.Kp) + ', Ki = ' + f(g.Ki) + ', Kd = ' + f(g.Kd) + '.');
  }
  lines.push('This is one answer, not the only one: any gains that pass all three lines are correct.');
  return lines;
}

if (typeof module !== 'undefined') {
  module.exports = { LEVELS, WEIGHTS, FREE_TESTS, ERROR_LIMIT, plantOf, openLoopSettle, makeSpec, runTest, judge, score, placePoles, findReference, newRound, referenceSolution };
}
