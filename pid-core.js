// Homework 2 · PID Control Toolkit: the shared closed-loop simulator
// Every Control page (P1 to P4 and "My system") uses this one file, so all the
// pages agree on the numbers.
// Reference tags used in the comments of this project:
//   [HW2 §x]   = Homework 2 sheet (PID Control Toolkit), section x
//   [SLIDES n] = lecture slides "Static and Dynamic Characteristics", slide n
//   [NOTES §x] = State-Space Modeling notes (2026 edition), section x
//
// [HW2 §4] "Use your own simulation of the closed loop: step it in time with Euler
// or RK4." This file uses RK4 for the plant and the sensor, with the control
// signal u held constant between controller updates (zero-order hold).
//
// The loop:   r ──(+)── e ──> PID ──> clamp ──u──> Plant ──y──┐
//                 (−)                                          │
//                  └──────── ym <── Sensor (τs) <──────────────┘

// ---------------------------------------------------------------- plants
// A plant is an object with:
//   size          number of states
//   deriv(x, u)   time derivative of the state vector x for input u
//   out(x)        the plant output y
// First order [SLIDES 13]: τ·y' + y = K·u, so y' = (K·u − y)/τ.  States: [y].
function firstOrder(K, tau) {
  return {
    kind: 'first',
    K,
    tau,
    size: 1,
    deriv: (x, u) => [(K * u - x[0]) / tau],
    out: (x) => x[0],
  };
}
// Second order [SLIDES 40]: y'' + 2ζωn·y' + ωn²·y = K·ωn²·u.  States: [y, y'].
// This is the state-space form of [NOTES §3.3]: x1 = y, x2 = y'.
function secondOrder(K, zeta, wn) {
  return {
    kind: 'second',
    K,
    zeta,
    wn,
    size: 2,
    deriv: (x, u) => [x[1], wn * wn * (K * u - x[0]) - 2 * zeta * wn * x[1]],
    out: (x) => x[0],
  };
}

// ---------------------------------------------------------------- RK4
// One RK4 step of length h for dx/dt = f(x), with u held constant during the step.
function rk4(f, x, h) {
  const add = (a, b, s) => a.map((v, i) => v + s * b[i]);
  const k1 = f(x);
  const k2 = f(add(x, k1, h / 2));
  const k3 = f(add(x, k2, h / 2));
  const k4 = f(add(x, k3, h));
  return x.map((v, i) => v + (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
}

// ---------------------------------------------------------------- simulate
// Options (all optional except plant):
//   plant        firstOrder(...) or secondOrder(...)
//   Kp, Ki, Kd   PID gains (default 0)
//   r            setpoint step size (default 1)
//   tauS         sensor time constant τs in the feedback path; 0 = ideal sensor  [HW2 P2]
//   uMin, uMax   control signal limits, e.g. 0 and 100 for PWM %                 [HW2 P1]
//   T            simulated time in seconds (default 10)
//   Ts           controller sampling time; null = continuous PID                 [HW2 P3]
//   antiWindup   stop integrating while u is saturated (default false)           [HW2 P3]
//   dtMax        largest RK4 step for the plant (default 1 ms)
//
// The PID is the digital law of [HW2 §2]:
//   u[k] = Kp·e[k] + Ki·Ts·Σ e[j] + Kd·(e[k] − e[k−1])/Ts
// A "continuous" PID is the same law updated at every RK4 step (Ts = dt).
// e[−1] is taken equal to e[0], so the first sample gives no derivative kick.
//
// Returns { t, y, ym, u, dt, Ts, saturated } where saturated is the fraction of
// samples in which the limit was active.
function simulate(opts) {
  const { plant, Kp = 0, Ki = 0, Kd = 0, r = 1, tauS = 0, T = 10, antiWindup = false, dtMax = 0.001 } = opts;
  const uMin = opts.uMin ?? -Infinity;
  const uMax = opts.uMax ?? Infinity;
  const digital = opts.Ts != null && opts.Ts > 0;
  // The plant step must divide Ts exactly, so a sample always lands on a step.
  const perSample = digital ? Math.max(1, Math.ceil(opts.Ts / dtMax - 1e-9)) : 1;
  const dt = digital ? opts.Ts / perSample : dtMax;
  const Ts = digital ? opts.Ts : dt;
  const steps = Math.round(T / dt);
  const lag = tauS > 0;

  // State vector: plant states, then (with a slow sensor) the sensor reading ym.
  let x = new Array(plant.size + (lag ? 1 : 0)).fill(0);
  const reading = (s) => (lag ? s[plant.size] : plant.out(s));
  let sum = 0, // Σ e[j]
    ePrev = null,
    u = 0,
    hits = 0,
    samples = 0;
  const out = { t: [], y: [], ym: [], u: [], dt, Ts };

  for (let k = 0; k <= steps; k++) {
    const ym = reading(x);
    // Controller update: every step (continuous) or every Ts (digital).
    if (k % perSample === 0) {
      const e = r - ym; // the controller only sees the sensor  [HW2 P2]
      if (ePrev === null) ePrev = e;
      const uRaw = Kp * e + Ki * Ts * (sum + e) + Kd * ((e - ePrev) / Ts);
      u = Math.min(uMax, Math.max(uMin, uRaw));
      const saturated = u !== uRaw;
      // Anti-windup (conditional integration): while u is stuck at a limit, do not
      // add errors that push it further into that limit.
      const pushesFurther = (uRaw > uMax && e > 0) || (uRaw < uMin && e < 0);
      if (!(antiWindup && saturated && pushesFurther)) sum += e;
      ePrev = e;
      samples++;
      if (saturated) hits++;
    }
    out.t.push(k * dt);
    out.y.push(plant.out(x));
    out.ym.push(ym);
    out.u.push(u);
    if (k === steps) break;
    // Advance plant (and sensor) by one RK4 step with u held.
    const f = (s) => {
      const d = plant.deriv(s.slice(0, plant.size), u);
      if (lag) d.push((plant.out(s) - s[plant.size]) / tauS); // τs·ym' = y − ym
      return d;
    };
    x = rk4(f, x, dt);
  }
  out.saturated = samples ? hits / samples : 0;
  return out;
}

// ---------------------------------------------------------------- metrics
// Step-response metrics of y against the setpoint r  [HW2 P1]:
//   rise       10% → 90% of the final value, in seconds
//   overshoot  percent above the final value
//   peak       time of the maximum (null if no overshoot)
//   settle     2% settling time, in seconds
//   ess        steady-state error r − y(final)
//   final      final value (mean of the last 5% of the run)
//   settled    false if the run ends still moving by more than 2% (oscillating or too slow)
// Values that cannot be measured are null.
function loopMetrics(t, y, r = 1) {
  const n = y.length;
  const tail = y.slice(Math.floor(n * 0.95));
  const final = tail.reduce((a, b) => a + b, 0) / tail.length;
  const band = 0.02 * Math.max(Math.abs(final), Math.abs(r) * 1e-3);
  const lastPart = y.slice(Math.floor(n * 0.9));
  const settled = Math.max(...lastPart) - Math.min(...lastPart) <= 2 * band;
  // Linear interpolation of the first time y crosses a level.
  const cross = (level) => {
    const sign = final >= 0 ? 1 : -1;
    for (let i = 1; i < n; i++) {
      if (sign * y[i] >= sign * level) {
        const a = y[i - 1],
          b = y[i];
        return b === a ? t[i] : t[i - 1] + ((level - a) / (b - a)) * (t[i] - t[i - 1]);
      }
    }
    return null;
  };
  const t10 = cross(0.1 * final),
    t90 = cross(0.9 * final);
  let iPeak = 0;
  for (let i = 1; i < n; i++) if (Math.abs(y[i]) > Math.abs(y[iPeak])) iPeak = i;
  const over = final !== 0 ? (100 * (Math.abs(y[iPeak]) - Math.abs(final))) / Math.abs(final) : 0;
  let iOut = -1;
  for (let i = n - 1; i >= 0; i--)
    if (Math.abs(y[i] - final) > band) {
      iOut = i;
      break;
    }
  return {
    rise: t10 !== null && t90 !== null ? t90 - t10 : null,
    overshoot: Math.max(0, over),
    peak: over > 0.05 ? t[iPeak] : null,
    settle: settled ? (iOut < 0 ? 0 : t[Math.min(iOut + 1, n - 1)]) : null,
    ess: r - final,
    final,
    settled,
  };
}

// ---------------------------------------------------------------- theory
// Closed-form results for a first-order plant K/(τs + 1). Used by the validation
// checks [HW2 §2.1] and by the "My system" design [HW2 §3].
//
// P only: closed loop K·Kp/(τs + 1 + K·Kp), so
//   τcl = τ/(1 + K·Kp),  ess = 1/(1 + K·Kp)
function theoryP(K, tau, Kp) {
  return { tauCL: tau / (1 + K * Kp), ess: 1 / (1 + K * Kp) };
}
// PI: characteristic equation τs² + (1 + K·Kp)s + K·Ki = 0, so
//   ωn = √(K·Ki/τ),  ζ = (1 + K·Kp) / (2√(τ·K·Ki))
function theoryPI(K, tau, Kp, Ki) {
  return { wn: Math.sqrt((K * Ki) / tau), zeta: (1 + K * Kp) / (2 * Math.sqrt(tau * K * Ki)) };
}
// The same two equations solved for the gains: pick ζ and ωn, get Kp and Ki.
//   Ki = ωn²·τ/K,  Kp = (2ζωn·τ − 1)/K
function designPI(K, tau, zeta, wn) {
  return { Kp: (2 * zeta * wn * tau - 1) / K, Ki: (wn * wn * tau) / K };
}

// PI with a first-order sensor τs in the feedback path [HW2 P2]. Characteristic equation:
//   τ·τs·s³ + (τ + τs)·s² + (1 + K·Kp)·s + K·Ki = 0
// Routh–Hurwitz for a cubic: stable only while (τ + τs)(1 + K·Kp) > τ·τs·K·Ki.
// Returns the largest stable Ki, so a page can say where the loop starts to oscillate.
function theorySensorPI(K, tau, tauS, Kp, Ki) {
  const KiMax = tauS > 0 ? ((tau + tauS) * (1 + K * Kp)) / (tau * tauS * K) : Infinity;
  return { stable: Ki < KiMax, KiMax };
}

// ---------------------------------------------------------------- validation
// The three checks of [HW2 §2.1], run on this simulator. Each entry has
// { id, title, expected, got, pass } as text, ready for a validation board.
function validationChecks() {
  const plant = firstOrder(1, 1);
  const fmt = (v, d = 3) => (v === null ? '—' : v.toFixed(d));
  // Time for y to reach 63.2% of its final value = the closed-loop τ.
  const timeTo = (run, level) => {
    const i = run.y.findIndex((v) => v >= level);
    return run.t[i];
  };

  // 1. P only, Kp = 9.
  const th1 = theoryP(1, 1, 9);
  const run1 = simulate({ plant, Kp: 9, T: 2 });
  const m1 = loopMetrics(run1.t, run1.y);
  const tau1 = timeTo(run1, 0.632 * m1.final);
  const pass1 = Math.abs(tau1 - th1.tauCL) < 0.005 && Math.abs(m1.ess - th1.ess) < 0.002;

  // 2. PI, Kp = 1, Ki = 1: ωn = 1 rad/s, ζ = 1, so no overshoot.
  const th2 = theoryPI(1, 1, 1, 1);
  const run2 = simulate({ plant, Kp: 1, Ki: 1, T: 15 });
  const m2 = loopMetrics(run2.t, run2.y);
  const pass2 = Math.abs(th2.wn - 1) < 1e-9 && Math.abs(th2.zeta - 1) < 1e-9 && m2.overshoot < 0.5;

  // 3. Any PI gives zero steady-state error for a step.
  const gains = [
    [1, 0.5],
    [2, 1],
    [5, 10],
    [0.3, 2],
  ];
  const errors = gains.map(([Kp, Ki]) => {
    const run = simulate({ plant, Kp, Ki, T: 40 });
    return Math.abs(loopMetrics(run.t, run.y).ess);
  });
  const worst = Math.max(...errors);
  const pass3 = worst < 1e-3;

  return [
    {
      id: 1,
      title: 'P only, Kp = 9',
      expected: 'τcl = 0.100 s, ess = 10.0%',
      got: 'τcl = ' + fmt(tau1) + ' s, ess = ' + (100 * m1.ess).toFixed(1) + '%',
      pass: pass1,
    },
    {
      id: 2,
      title: 'PI, Kp = 1, Ki = 1',
      expected: 'ωn = 1 rad/s, ζ = 1 (no overshoot)',
      got: 'ωn = ' + fmt(th2.wn, 2) + ' rad/s, ζ = ' + fmt(th2.zeta, 2) + ', overshoot = ' + m2.overshoot.toFixed(2) + '%',
      pass: pass2,
    },
    {
      id: 3,
      title: 'Any PI: zero steady-state error',
      expected: '|ess| ≈ 0 for every PI tried',
      got: 'largest |ess| = ' + worst.toExponential(1) + ' over ' + gains.length + ' gain pairs',
      pass: pass3,
    },
  ];
}

if (typeof module !== 'undefined')
  module.exports = { firstOrder, secondOrder, rk4, simulate, loopMetrics, theoryP, theoryPI, theorySensorPI, designPI, validationChecks };
