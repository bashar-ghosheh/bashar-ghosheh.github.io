// My system · the micromouse drive motor: model and design maths (no page elements)
// Runs in the browser and in the Node tests (motor-model.test.js).
//
// Reference tags used in the comments of this project:
//   [HW2 §3]   = Homework 2 sheet, section 3 "Applying it to your project"
//   [SLIDES n] = lecture slides "Static and Dynamic Characteristics", slide n
//   [DS]       = seller's product manual for the JGA12-N20 motor (AliExpress item 32968556654)

if (typeof require !== 'undefined') Object.assign(globalThis, require('./pid-core.js'));

// ---------------------------------------------------------------- datasheet and assumptions
// [DS] table, row JGA12-N20-30 (6 V, ratio 30). Our order is the 6 V 530 rpm option, so the
// no-load speed is the listing's 530 rpm; the currents and torque come from the ratio-30 row.
const DATASHEET = {
  volts: 6, // rated voltage
  noLoadRpm: 530, // output shaft, from the listing option we ordered
  noLoadAmps: 0.04, // [DS] 40 mA
  stallAmps: 0.55, // [DS] 0.55 A
  stallKgCm: 0.4, // [DS] 0.4 kg·cm at the output shaft
  ratio: 30, // [DS] speed reducer ratio
};
// Not in the datasheet: our robot's numbers. Each is editable on the page.
const ASSUMED = {
  massGrams: 120, // whole robot, shared by two drive wheels
  wheelMm: 32, // wheel diameter
  rotorGcm2: 0.025, // rotor inertia of a 12 mm micro motor (small next to the load)
};

// ---------------------------------------------------------------- the plant
// DC motor with a gearbox, armature inductance neglected:
//   R  = V / I_stall                       winding resistance
//   Ke = (V − I0·R) / ω_motor,no-load       back-EMF constant (V·s/rad)
//   Kt = T_stall,motor / I_stall            torque constant (N·m/A), includes gear losses
//   J  = J_rotor + (m/2)·r_wheel² / N²      inertia seen by the motor shaft
//   τ  = J·R / (Kt·Ke)                      mechanical time constant
// The speed loop is then first order [SLIDES 13]:  τ·y' + y = K·u,
// with u = PWM duty in % and y = wheel speed in rpm, so K = no-load rpm / 100%.
function motorPlant(ds = DATASHEET, as = ASSUMED) {
  const R = ds.volts / ds.stallAmps;
  const wMotor = (ds.noLoadRpm * ds.ratio * 2 * Math.PI) / 60;
  const Ke = (ds.volts - ds.noLoadAmps * R) / wMotor;
  const Kt = (ds.stallKgCm * 0.0980665) / ds.ratio / ds.stallAmps;
  const r = as.wheelMm / 2000;
  const Jrotor = as.rotorGcm2 * 1e-7; // g·cm² → kg·m²
  const Jload = ((as.massGrams / 1000 / 2) * r * r) / (ds.ratio * ds.ratio);
  const J = Jrotor + Jload;
  const tau = (J * R) / (Kt * Ke);
  const K = ds.noLoadRpm / 100;
  // Wheel speed in m/s for a given rpm, for the spec text.
  const metersPerSecond = (rpm) => (rpm / 60) * Math.PI * (as.wheelMm / 1000);
  return { R, Ke, Kt, J, Jrotor, Jload, tau, K, metersPerSecond };
}

// ---------------------------------------------------------------- the design
// [HW2 §3] "Aim for 0.6 ≤ ζ ≤ 0.8 and check that the PWM command stays within 0–100%."
// PI gains from the wanted ζ and ωn (pid-core.js designPI), then a digital run on the
// first-order plant with the real PWM limits and anti-windup.
function designLoop({ K, tau, zeta, wn, rpm, TsMs }) {
  const g = designPI(K, tau, zeta, wn);
  const run = simulate({ plant: firstOrder(K, tau), Kp: g.Kp, Ki: g.Ki, r: rpm, uMin: 0, uMax: 100, Ts: TsMs / 1000, antiWindup: true, T: Math.max(0.4, 12 * tau, 10 / (zeta * wn)) });
  const m = loopMetrics(run.t, run.y, rpm);
  // The raw PID command at the first sample is Kp·r + Ki·Ts·r: the biggest push.
  const firstPush = g.Kp * rpm + g.Ki * (TsMs / 1000) * rpm;
  return { ...g, run, metrics: m, target: rpm, firstPush, peakPwm: Math.max(...run.u), saturated: run.saturated };
}

// The checks of our spec, each PASS or FAIL.
function specChecks(d, zeta) {
  const m = d.metrics;
  return [
    { name: 'Damping ratio', limit: '0.6 ≤ ζ ≤ 0.8', got: 'ζ = ' + zeta.toFixed(2), pass: zeta >= 0.6 - 1e-9 && zeta <= 0.8 + 1e-9 },
    { name: 'PWM stays in 0–100%', limit: 'never clipped', got: 'peak ' + d.peakPwm.toFixed(1) + '%' + (d.saturated ? ' · clipped ' + (100 * d.saturated).toFixed(1) + '% of samples' : ''), pass: d.saturated === 0 && d.Kp >= 0 },
    { name: 'Zero steady-state error', limit: '|e| ≤ 1% of target', got: m.ess.toFixed(2) + ' rpm', pass: m.settled && Math.abs(m.ess) <= 0.01 * Math.abs(d.target) },
  ];
}

// ---------------------------------------------------------------- measured step test
// [HW2 §3] "Find K and τ from a PWM step test logged with the encoder."
// Paste "time_ms, rpm" lines from a step of pwm % applied at t = 0.
// K = final speed / PWM step; τ = time to 63.2% of the final speed  [SLIDES 13–14].
function parseLog(text) {
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    const nums = line.split(/[\s,;\t]+/).filter(Boolean).map(Number);
    if (nums.length >= 2 && nums.every(Number.isFinite)) rows.push({ t: nums[0] / 1000, rpm: nums[1] });
  }
  return rows.sort((a, b) => a.t - b.t);
}
function fitStep(rows, pwm) {
  if (rows.length < 10) throw new Error('Paste at least 10 lines of "time_ms, rpm".');
  if (!(pwm > 0)) throw new Error('Type the PWM step in % (for example 50).');
  const t0 = rows[0].t;
  const tail = rows.slice(Math.floor(rows.length * 0.8));
  const final = tail.reduce((s, r) => s + r.rpm, 0) / tail.length;
  const start = rows[0].rpm;
  const level = start + 0.632 * (final - start);
  const i = rows.findIndex((r) => r.rpm >= level);
  if (i <= 0) throw new Error('The speed never reaches 63% of its final value: log for longer.');
  const a = rows[i - 1],
    b = rows[i];
  const tau = a.t + ((level - a.rpm) / (b.rpm - a.rpm)) * (b.t - a.t) - t0;
  return { K: (final - start) / pwm, tau, final, level };
}
// A pretend step test from the datasheet model, with encoder noise, for the demo button.
function exampleLog(plant, pwm = 50, noise = 0.02) {
  const lines = [];
  for (let ms = 0; ms <= 200; ms += 2) {
    const ideal = plant.K * pwm * (1 - Math.exp(-ms / 1000 / plant.tau));
    const n = noise * plant.K * pwm * (Math.random() + Math.random() + Math.random() - 1.5);
    lines.push(ms + ', ' + Math.max(0, ideal + n).toFixed(1));
  }
  return lines.join('\n');
}

if (typeof module !== 'undefined') module.exports = { DATASHEET, ASSUMED, motorPlant, designLoop, specChecks, parseLog, fitStep, exampleLog };
