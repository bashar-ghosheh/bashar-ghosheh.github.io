// Module 4 · Guess the sensor (Ahmad AlSheikh)
// This file holds only the maths, with no page elements, so the same code
// runs in the browser and in the Node tests (sensor-game.test.js).
//
// Reference tags used in the comments of this project:
//   [SLIDES n] = lecture slides "Static and Dynamic Characteristics", slide n
//   [NOTES §x] = State-Space Modeling notes (2026 edition), section x
//   [HW §x]    = Homework 1 sheet, section x

// In Node, borrow the response formulas of Modules 2 and 3.
// In the browser, module4.html has already loaded those two files.
if (typeof require !== 'undefined') {
  Object.assign(globalThis, require('./frequency.js'), require('./second-order.js'));
}

const SAMPLES = 200;   // readings on every curve
const NOISE = 0.015;   // noise size: 1.5% of the final value

// Random number from low to high, rounded so the true values look tidy.
function randomBetween(low, high, decimals) {
  const value = low + Math.random() * (high - low);
  return Number(value.toFixed(decimals));
}

// [HW §4, step 1] "The page picks a hidden sensor at random: first order
// (random K and τ) or second order (random ζ and ωn)."
// Pick a hidden sensor. There are three kinds of round:
//   step1 = first-order sensor, unit step input    → find K and τ
//   sine1 = first-order sensor, sine input, K = 1  → find τ
//   step2 = second-order sensor, unit step, K = 1  → find ζ and ωn
function newSensor(kind) {
  if (!kind) {
    const dice = Math.random();
    kind = dice < 0.4 ? 'step1' : dice < 0.6 ? 'sine1' : 'step2';
  }
  if (kind === 'step1') {
    const tau = randomBetween(0.3, 4, 2);
    // Show 5.5 to 8 time constants, so the curve clearly flattens out.
    return { kind, order: 1, K: randomBetween(0.5, 3, 1), tau, tEnd: tau * randomBetween(5.5, 8, 1) };
  }
  if (kind === 'sine1') {
    const tau = randomBetween(0.1, 2, 2);
    // Choose ω so that ωτ is between 1 and 2.5. The output is then clearly
    // smaller than the input, but still large enough to measure.
    const omega = Number((randomBetween(1, 2.5, 2) / tau).toPrecision(2));
    return { kind, order: 1, K: 1, tau, omega, tEnd: 3 * 2 * Math.PI / omega };   // three periods
  }
  // Underdamped only: the user needs an overshoot to measure.
  const zeta = randomBetween(0.15, 0.6, 2);
  const wn = randomBetween(1, 8, 1);
  const period = 2 * Math.PI / (wn * Math.sqrt(1 - zeta * zeta));
  return { kind, order: 2, K: 1, zeta, wn, tEnd: Math.max(2.5 * period, 5 / (zeta * wn)) };
}

// [HW §5] "Plot the closed-form responses from the slides."
// Noise-free output at time t, from the closed-form answers in the slides:
//   step1: [SLIDES 34] y(t) = KA·(1 − e^(−t/τ)), with A = 1
//   sine1: [SLIDES 34] y(t) = M·sin(ωt + φ), using response() and wave() of Module 2
//   step2: [SLIDES 40–41] underdamped step, using state() of Module 3
function sensorOutput(sensor, t) {
  if (sensor.kind === 'step1') {
    return sensor.K * (1 - Math.exp(-t / sensor.tau));                              // Module 1
  }
  if (sensor.kind === 'sine1') {
    return sensor.K * wave(t, sensor.omega, response(sensor.tau, sensor.omega));    // Module 2
  }
  return sensor.K * state(t, sensor.zeta, sensor.wn)[0];                            // Module 3
}

// [HW §4, step 1] "It adds a little noise."
// Adding three random numbers gives a bell-shaped spread around zero,
// like real measurement noise. The factor 2 makes its standard deviation 1.
function randomNoise() {
  return 2 * (Math.random() + Math.random() + Math.random() - 1.5);
}

// [HW §4, step 2] "It plots one response": these are the points of that plot.
// "Measure" the sensor: the true curve plus a little noise on every reading.
function measure(sensor) {
  const times = [], values = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const t = Number((sensor.tEnd * i / SAMPLES).toFixed(4));   // tidy time values
    times.push(t);
    values.push(sensorOutput(sensor, t) + NOISE * sensor.K * randomNoise());
  }
  return { times, values };
}

// How far off is one estimate, in percent of the true value?
function percentError(guess, truth) {
  return 100 * Math.abs(guess - truth) / truth;
}

// [HW §4, step 4] "gives a score: within 10% is full marks."
// Within 10% is full marks. After that, lose 2.5 points for every extra
// percent, so a 30% error earns 50 points and a 50% error earns nothing.
function pointsFor(error) {
  if (error <= 10) return 100;
  return Math.max(0, Math.round(100 - 2.5 * (error - 10)));
}

// Score every parameter the user estimated. The round score is the average.
function scoreGuess(sensor, guess) {
  const rows = Object.keys(guess).map(name => {
    const error = percentError(guess[name], sensor[name]);
    return { name, guess: guess[name], truth: sensor[name], error, points: pointsFor(error) };
  });
  const total = Math.round(rows.reduce((sum, row) => sum + row.points, 0) / rows.length);
  return { rows, total };
}

// After the reveal: how to read the true values off this exact curve.
// [HW §4, step 3] These are the methods the homework names:
//   first order  → the 63.2% point (and 95% at 3τ as a check)
//   sine         → amplitude ratio M and phase lag [SLIDES 34]
//   second order → overshoot and peak time; the same formulas as [NOTES §3.3]:
//                  Mp = e^(−πζ/√(1−ζ²)) and tp = π / (ωn·√(1−ζ²))
function workedSolution(sensor) {
  const f = (value, digits = 2) => value.toFixed(digits);
  if (sensor.kind === 'step1') {
    return [
      'A unit step settles at K, and this curve flattens out at ' + f(sensor.K) + '. So K = ' + f(sensor.K) + '.',
      '63.2% of ' + f(sensor.K) + ' is ' + f(0.632 * sensor.K) + '. The curve reaches that level at t = ' + f(sensor.tau) + ' s, so τ = ' + f(sensor.tau) + ' s.',
      'Check: at 3τ = ' + f(3 * sensor.tau) + ' s the curve should be at 95%, which is ' + f(0.95 * sensor.K) + '.'
    ];
  }
  if (sensor.kind === 'sine1') {
    const r = response(sensor.tau, sensor.omega);
    const lag = -r.phase / sensor.omega;   // seconds between an input peak and the output peak
    return [
      'The input amplitude is 1 and K = 1, so the output amplitude is the ratio M = ' + f(r.ratio, 3) + '.',
      'τ = √(1/M² − 1) / ω = ' + f(Math.sqrt(1 / r.ratio ** 2 - 1), 3) + ' / ' + sensor.omega + ' = ' + f(sensor.tau) + ' s.',
      'Check: every output peak comes ' + f(lag, 3) + ' s after an input peak. That is a phase lag of ' + f(-r.phase * 180 / Math.PI, 1) + '°, and tan(phase lag) / ω gives the same τ.'
    ];
  }
  const root = Math.sqrt(1 - sensor.zeta ** 2);
  const overshoot = Math.exp(-Math.PI * sensor.zeta / root);
  const peakTime = Math.PI / (sensor.wn * root);
  return [
    'The first peak is ' + f(1 + overshoot, 3) + ' at t = ' + f(peakTime, 3) + ' s. The final value is 1, so the overshoot is ' + f(100 * overshoot, 1) + '%.',
    'Overshoot depends only on ζ: ζ = −ln(Mp) / √(π² + ln²Mp) = ' + f(sensor.zeta) + ', with Mp = ' + f(overshoot, 3) + '.',
    'Peak time then gives ωn = π / (tp · √(1 − ζ²)) = ' + f(sensor.wn, 1) + ' rad/s.'
  ];
}

if (typeof module !== 'undefined') {
  module.exports = { newSensor, sensorOutput, measure, percentError, pointsFor, scoreGuess, workedSolution, SAMPLES, NOISE };
}
