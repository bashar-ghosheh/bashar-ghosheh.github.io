// Module 3 · Second-order response: the page (Tareq Ahmad)
// The formulas are in second-order.js. Shared helpers (plot, trace, formula,
// checkRow, bindModel...) are in module-assets/shared.js.

// [NOTES §3.3, step 5] ωn = √(k/m) and ζ = b / (2·√(k·m)).
function springSettings() {
  const m = num('mass'),
    b = num('damping'),
    k = num('spring');
  return { m, b, k, w: Math.sqrt(k / m), z: b / (2 * Math.sqrt(m * k)) };
}
// Write a pole or eigenvalue [real, imaginary] as text, for example −1.000 + j1.732.
function rootText([r, i]) {
  return r.toFixed(3) + (i === 0 ? '' : (i > 0 ? ' + j' : ' − j') + Math.abs(i).toFixed(3));
}
// Runs every time a slider moves: recalculates and redraws the whole module.
function drawSpring() {
  const { m, b, k, w, z } = springSettings();
  for (const [id, v] of [
    ['mass', m],
    ['damping', b],
    ['spring', k],
  ])
    el(id + 'Value').textContent = v;
  const curve = samples(z, w),
    measured = metrics(curve),
    times = curve.map((p) => p[0]);
  // Unit force gives a final displacement of 1/k metres.
  const x = curve.map((p) => p[1] / k),
    v = curve.map((p) => p[2] / k);
  formula('transfer', String.raw`G(s)=\frac{1}{ms^2+bs+k},\quad K=1/k`);
  plot(
    'step',
    [
      trace(times, x, 'Displacement'),
      trace(
        times,
        times.map(() => 1 / k),
        'Equilibrium',
        'target',
      ),
    ],
    { title: 'Time (s)' },
    { title: 'Displacement (m)' },
  );
  const kind = Math.abs(z - 1) < 1e-10 ? 'Critically damped' : z < 1 ? 'Underdamped' : 'Overdamped';
  verdict(
    'regime',
    z < 1 ? 'warn' : 'good',
    kind +
      ' · ζ = ' +
      z.toFixed(3) +
      ', ωₙ = ' +
      w.toFixed(3) +
      ' rad/s. ' +
      (z < 1
        ? 'The sensor crosses equilibrium before settling.'
        : 'The sensor approaches equilibrium from below.'),
  );
  el('metrics').innerHTML = [
    ['Rise', measured.rise.toFixed(3) + ' s'],
    ['Peak time', measured.peak === null ? 'No finite peak' : measured.peak.toFixed(3) + ' s'],
    ['Overshoot', measured.overshoot.toFixed(2) + '%'],
    ['Settling', measured.settle.toFixed(3) + ' s'],
  ]
    .map(([label, value]) => '<span class="metric-item">' + label + ' · ' + value + '</span>')
    .join('');
  // [HW §3.1] State-space panel: A and B update live with m, b and k.
  // [NOTES §3.3, step 4] A = [[0, 1], [−k/m, −b/m]], B = [0, 1/m], C = [1 0].
  formula(
    'matrix',
    'A=\\begin{bmatrix}0&1\\\\' +
      (-k / m).toFixed(3) +
      '&' +
      (-b / m).toFixed(3) +
      '\\end{bmatrix},\\ B=\\begin{bmatrix}0\\\\' +
      (1 / m).toFixed(3) +
      '\\end{bmatrix},\\ C=[1\\;0]',
  );
  const roots = poles(z, w),
    ev = eigen(m, b, k);
  el('roots').textContent =
    'Transfer poles: ' +
    roots.map(rootText).join(', ') +
    ' · Eigenvalues of A: ' +
    ev.map(rootText).join(', ');
  plot(
    'poles',
    [
      {
        x: roots.map((p) => p[0]),
        y: roots.map((p) => p[1]),
        mode: 'markers',
        name: 'Transfer poles',
        marker: { symbol: 'x', size: 14, color: css('output') },
      },
      {
        // [HW §3.1] Eigenvalues of A drawn around the poles: the same numbers.
        x: ev.map((p) => p[0]),
        y: ev.map((p) => p[1]),
        mode: 'markers',
        name: 'Eigenvalues of A',
        marker: { symbol: 'circle-open', size: 22, line: { width: 2 }, color: css('target') },
      },
    ],
    { title: 'Real part (1/s)', rangemode: 'tozero' },
    { title: 'Imaginary part (rad/s)', rangemode: 'tozero' },
  );
  // [HW §3.1] Phase plane: x2 (velocity) against x1 (displacement).
  // [NOTES §3.3] A spiral when underdamped, no spiral when overdamped.
  formula('phaseLaw', String.raw`x_1=x,\quad x_2=\dot x`);
  plot('path', [trace(x, v, 'State trajectory')], { title: 'Displacement (m)' }, { title: 'Velocity (m/s)' });
  el('question').textContent = 'Predict the final displacement (m) under a 1 N force.';
  el('result').textContent = '';
}
for (const [id, b] of [
  ['under', 2],
  ['critical', 4],
  ['over', 8],
])
  el(id).onclick = () => preset({ mass: 1, damping: b, spring: 4 });
prediction(
  () => 1 / num('spring'),
  () => 'At rest the spring balances the applied force, so x = F/k.',
);
// [HW §3.2] Validation checks 4, 5 and 6.
const under = metrics(samples(0.5, 2)),
  critical = metrics(samples(1, 2)),
  ev = eigen(1, 2, 4),
  roots = poles(0.5, 2);
el('checks').innerHTML =
  checkRow(
    '4 · ζ = 0.5',
    '16.3%',
    under.overshoot.toFixed(2) + '%',
    Math.abs(under.overshoot - 16.3) < 0.05,
  ) +
  checkRow('5 · ζ = 1', '0%', critical.overshoot + '%', critical.overshoot === 0) +
  checkRow(
    '6 · Poles and eigenvalues',
    '−1 ± j1.732',
    ev.map(rootText).join(', '),
    ev.every(
      ([r, i], j) =>
        r === -1 && Math.abs(Math.abs(i) - 1.732) < 0.001 && r === roots[j][0] && i === roots[j][1],
    ),
  );
// Redraw whenever one of the three sliders moves.
bindModel(['mass', 'damping', 'spring'], drawSpring);
