// Module 3 · Second-order response: the formulas (Tareq Ahmad)
// [SLIDES 40] G(s) = K·ωn² / (s² + 2ζωn·s + ωn²)
// [NOTES §3.3] Example 3: the same system as a mass-spring-damper in state space.
// Reference tags used in the comments of this project:
//   [SLIDES n] = lecture slides "Static and Dynamic Characteristics", slide n
//   [NOTES §x] = State-Space Modeling notes (2026 edition), section x
//   [HW §x]    = Homework 1 sheet, section x

// Closed-form unit-step response of the second-order model (K = 1, so it tends to 1).
// Arguments: t = time, z = ζ (damping ratio), w = ωn (natural frequency).
// Returns [x1, x2] = [displacement, velocity]: the two states of [NOTES §3.3].
// The velocity is the time derivative of the displacement formula.
// [SLIDES 41] The three branches are the three response types.
function state(t, z, w) {
  const a = z * w; // decay rate ζ·ωn (minus the real part of the poles)
  // Critically damped (ζ = 1): repeated pole at −ωn, no oscillation.
  if (Math.abs(z - 1) < 1e-10) {
    const decay = Math.exp(-w * t);
    return [1 - (1 + w * t) * decay, w * w * t * decay];
  }
  // Underdamped (ζ < 1): decaying oscillation at ωd = ωn·√(1 − ζ²).
  if (z < 1) {
    const d = w * Math.sqrt(1 - z * z),
      decay = Math.exp(-a * t);
    return [1 - decay * (Math.cos(d * t) + (a * Math.sin(d * t)) / d), (w * w * decay * Math.sin(d * t)) / d];
  }
  // Overdamped (ζ > 1): two real poles, so a sum of two decaying exponentials.
  const d = w * Math.sqrt(z * z - 1),
    slow = -a + d,
    fast = -a - d;
  const s = Math.exp(slow * t),
    f = Math.exp(fast * t);
  return [1 + (fast * s - slow * f) / (slow - fast), (w * w * (s - f)) / (slow - fast)];
}
// Roots of a quadratic written as center ± √discriminant.
// Each root is a pair [real part, imaginary part].
function quadraticRoots(center, discriminant) {
  const d = Math.sqrt(Math.abs(discriminant));
  return discriminant < 0
    ? [
        [center, d],
        [center, -d],
      ]
    : [
        [center + d, 0],
        [center - d, 0],
      ];
}
// Poles of G(s): the roots of s² + 2ζωn·s + ωn² = 0.  [SLIDES 31, 40]
function poles(z, w) {
  return quadraticRoots(-z * w, (z * z - 1) * w * w);
}
// Eigenvalues of A = [[0, 1], [−k/m, −b/m]] from its trace and determinant.
// [NOTES §7.1] This is the same method as the notes' eig2(A) function:
//   eig2 uses tr/2 ± √(tr²/4 − det). Here trace = −b/m and det = k/m.
// [NOTES §5.1] "The eigenvalues of A are the poles of G(s)".  [HW §3.1]
function eigen(m, b, k) {
  const halfTrace = -b / (2 * m);
  return quadraticRoots(halfTrace, halfTrace * halfTrace - k / m);
}
// 2001 points [t, x1, x2] of the closed-form curve.
// The time window is 8 time constants of the slowest pole, so every case settles.
function samples(z, w) {
  const slowRate = -poles(z, w)[0][0];
  const end = 8 / slowRate;
  return Array.from({ length: 2001 }, (_, i) => {
    const t = (end * i) / 2000;
    return [t, ...state(t, z, w)];
  });
}
// Interpolate threshold crossings between adjacent plotted samples.
function crossing(a, b, level) {
  return a[0] + ((b[0] - a[0]) * (level - a[1])) / (b[1] - a[1]);
}
// [SLIDES 41] Rise time, peak time, overshoot and settling time.
// [HW §3] They are read off the sampled curve, not taken from formulas:
//   rise = 10% to 90%, settle = last time the curve leaves the ±2% band.
function metrics(curve) {
  function first(level) {
    const i = curve.findIndex((p) => p[1] >= level);
    return crossing(curve[i - 1], curve[i], level);
  }
  const peak = curve.reduce((best, p) => (p[1] > best[1] ? p : best));
  const i = curve.findLastIndex((p) => Math.abs(p[1] - 1) > 0.02);
  return {
    rise: first(0.9) - first(0.1),
    peak: peak[1] > 1 ? peak[0] : null,
    overshoot: 100 * Math.max(0, peak[1] - 1),
    settle: crossing(curve[i], curve[i + 1], curve[i][1] < 1 ? 0.98 : 1.02),
  };
}
if (typeof module !== 'undefined') module.exports = { state, poles, eigen, samples, metrics };
