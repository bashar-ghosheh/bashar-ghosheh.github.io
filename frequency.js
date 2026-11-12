// Module 2 · First-order frequency response: the formulas (Amro Qutna)
// Reference tags used in the comments of this project:
//   [SLIDES n] = lecture slides "Static and Dynamic Characteristics", slide n
//   [NOTES §x] = State-Space Modeling notes (2026 edition), section x
//   [HW §x]    = Homework 1 sheet, section x

// Angular frequency is in radians/second; one cycle contains 2π radians.
function angularFrequency(hertz) {
  return 2 * Math.PI * hertz;
}

// [SLIDES 34] Frequency response of a first-order sensor with K = 1.  [HW §3, Module 2]
//   amplitude ratio  M = 1 / √(1 + (ωτ)²)
//   phase            φ = −atan(ωτ)   (negative: the output lags)
//   dynamic error    δ = M − 1
//   cutoff           ω = 1/τ
function response(tau, omega) {
  const product = omega * tau;
  const ratio = 1 / Math.hypot(1, product);
  return {
    ratio,
    phase: -Math.atan(product),
    error: ratio - 1,
    db: 20 * Math.log10(ratio),
    cutoff: 1 / tau,
  };
}

// Steady-state output for the input sin(ωt): y(t) = M·sin(ωt + φ).
// Unit input amplitude and unity static gain; transient has decayed.
function wave(time, omega, sensor) {
  return sensor.ratio * Math.sin(omega * time + sensor.phase);
}

// [HW §3.2, check 3] Largest τ for a given maximum dynamic error.
// Solve M = 1 - loss for τ at the highest input frequency.
function tauLimit(hertz, loss) {
  return Math.sqrt(1 / (1 - loss) ** 2 - 1) / angularFrequency(hertz);
}

// [HW §8, bonus] Superposition of two sines.
// A linear sensor responds to each sine separately. Add the two outputs.
function twoTone(times, tau, omega, harmonic, amplitude) {
  const fastOmega = harmonic * omega;
  const slow = response(tau, omega);
  const fast = response(tau, fastOmega);
  return {
    input: times.map((t) => Math.sin(omega * t) + amplitude * Math.sin(fastOmega * t)),
    output: times.map((t) => wave(t, omega, slow) + amplitude * wave(t, fastOmega, fast)),
  };
}

if (typeof module !== 'undefined') {
  module.exports = { response, tauLimit, wave, angularFrequency, twoTone };
}
