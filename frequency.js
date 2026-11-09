// Angular frequency is in radians/second; one cycle contains 2π radians.
function angularFrequency(hertz) {
  return 2 * Math.PI * hertz;
}

function response(tau, omega) {
  const product = omega * tau;
  const ratio = 1 / Math.hypot(1, product);
  return {
    ratio,
    phase: -Math.atan(product),
    error: ratio - 1,
    db: 20 * Math.log10(ratio),
    cutoff: 1 / tau
  };
}

// Unit input amplitude and unity static gain; transient has decayed.
function wave(time, omega, sensor) {
  return sensor.ratio * Math.sin(omega * time + sensor.phase);
}

// Solve M = 1 - loss for τ at the highest input frequency.
function tauLimit(hertz, loss) {
  return Math.sqrt(1 / (1 - loss) ** 2 - 1) / angularFrequency(hertz);
}

// A linear sensor responds to each sine separately. Add the two outputs.
function twoTone(times, tau, omega, harmonic, amplitude) {
  const fastOmega = harmonic * omega;
  const slow = response(tau, omega);
  const fast = response(tau, fastOmega);
  return {
    input: times.map(t => Math.sin(omega * t) + amplitude * Math.sin(fastOmega * t)),
    output: times.map(t => wave(t, omega, slow) + amplitude * wave(t, fastOmega, fast))
  };
}

if (typeof module !== 'undefined') {
  module.exports = { response, tauLimit, wave, angularFrequency, twoTone };
}
