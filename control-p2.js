// [HW2 §2, P2] Use the team simulator. Speeds are normalized to a unit target.
const p2Plant = firstOrder(1, 1);
const reference = { Kp: 1, Ki: 4, Kd: 0, tauS: 0.25 };
const sensorButtons = document.querySelectorAll('[data-lag]');

// For this unit plant, the characteristic polynomial is
// τs s³ + (1 + τs + Kd)s² + (1 + Kp)s + Ki. Routh's cubic test
// compares a2*a1 with a3*a0. With Ki=0 the integral state drops out.
function stability({ Kp, Ki, Kd, tauS }) {
  if (!Kp && !Ki && !Kd) return 'Controller off';
  if (!tauS || !Ki) return 'Stable';
  const margin = (1 + tauS + Kd) * (1 + Kp) - tauS * Ki;
  if (Math.abs(margin) < 1e-9) return 'Sustained oscillation';
  return margin > 0 ? 'Stable' : 'Growing oscillation';
}

function drawExperiment() {
  const opts = Object.fromEntries(Object.keys(reference).map(id => [id, num(id)]));
  const run = simulate({ plant: p2Plant, ...opts, T: 12 });
  const crossing = run.y.findIndex(speed => speed >= 1);
  const peak = Math.max(...run.y);
  el('peak').textContent = (100 * Math.max(0, peak - 1)).toFixed(1) + '%';
  el('atTarget').textContent = crossing < 0 ? 'No crossing' : run.ym[crossing].toFixed(3);
  el('regime').textContent = stability(opts);
  formula('liveSensor', opts.tauS === 0 ? 'H(s)=1' :
    String.raw`H(s)=\dfrac{1}{${opts.tauS === 1 ? '' : opts.tauS}s+1}`);
  sensorButtons.forEach(button => button.setAttribute('aria-pressed', Number(button.dataset.lag) === opts.tauS));
  if (crossing < 0) {
    el('observation').textContent = 'True speed stays below the target throughout this 12 s run.';
  } else if (!opts.tauS) {
    el('observation').textContent = 'The sensor reports the true speed at every time step. The dashed reading lies directly on the solid speed curve.';
  } else {
    el('observation').textContent = 'At ' + run.t[crossing].toFixed(3) + ' s, the wheel first reaches the target. The controller still sees an error of ' + (1 - run.ym[crossing]).toFixed(3) + ' because it uses the sensor reading.';
  }

  // Keep all samples for measurements. Draw every tenth sample for responsive dragging.
  const display = values => values.filter((_, i) => i % 10 === 0);
  const time = display(run.t);
  const axes = { gridcolor: css('edge'), zerolinecolor: css('muted'), automargin: true };
  const traces = [
    trace([0, 12], [1, 1], 'Target', 'target'),
    trace(time, display(run.y), 'True speed'),
    trace(time, display(run.ym), 'Reading', 'input')
  ];
  Plotly.react('speedPlot', traces, {
    showlegend: false, hovermode: 'x unified', paper_bgcolor: css('surface'),
    plot_bgcolor: css('surface'), font: { color: css('text') },
    margin: { l: 52, r: 12, t: 10, b: 44 },
    xaxis: { ...axes, title: 'Time (s)', range: [0, 12], fixedrange: true },
    yaxis: { ...axes, title: 'Normalized speed', rangemode: 'tozero', fixedrange: true }
  }, { responsive: true, displayModeBar: false });
  // The sweep is 41 runs: redraw it at once if the gains have not changed (only the
  // marker moves), otherwise wait until the slider rests so dragging stays smooth.
  clearTimeout(sweepTimer);
  if (sweepCache.key === [opts.Kp, opts.Ki, opts.Kd].join('|')) drawSweep(opts);
  else sweepTimer = setTimeout(() => drawSweep(opts), 150);
  return run;
}

// [HW2 P2] "As τs grows, overshoot grows until the loop oscillates."
// Sweep τs from 0 to 2 s with the current gains and plot the peak overshoot.
// The boundary comes from the same Routh test as stability():
//   (1 + τs + Kd)(1 + Kp) = τs·Ki  →  τs* = (1 + Kd)(1 + Kp) / (Ki − 1 − Kp)
// It exists only when Ki > 1 + Kp; otherwise no sensor lag makes this loop unstable.
const SWEEP_LAGS = Array.from({ length: 41 }, (_, i) => i * 0.05);
const SWEEP_CAP = 200; // %, growing swings are drawn at this ceiling
let sweepCache = { key: '', peaks: [] };
let sweepTimer = null;
function lagBoundary({ Kp, Ki, Kd }) {
  return Ki > 1 + Kp ? ((1 + Kd) * (1 + Kp)) / (Ki - 1 - Kp) : Infinity;
}
function drawSweep(opts) {
  const key = [opts.Kp, opts.Ki, opts.Kd].join('|');
  if (sweepCache.key !== key) {
    // 5 ms steps keep 41 runs fast; the peak changes by well under 0.1%.
    const peaks = SWEEP_LAGS.map((tauS) => {
      const run = simulate({ plant: p2Plant, ...opts, tauS, T: 12, dtMax: 0.005 });
      return Math.min(SWEEP_CAP, 100 * Math.max(0, Math.max(...run.y) - 1));
    });
    sweepCache = { key, peaks };
  }
  const { peaks } = sweepCache;
  const star = lagBoundary(opts);
  const current = peaks[Math.round(opts.tauS / 0.05)] ?? peaks[peaks.length - 1];
  const top = Math.max(20, Math.min(SWEEP_CAP, Math.max(...peaks) * 1.1));
  const shapes = Number.isFinite(star) && star <= 2
    ? [
        { type: 'rect', xref: 'x', yref: 'paper', x0: star, x1: 2, y0: 0, y1: 1, fillcolor: css('fail'), opacity: 0.08, line: { width: 0 } },
        { type: 'line', xref: 'x', yref: 'paper', x0: star, x1: star, y0: 0, y1: 1, line: { color: css('target'), width: 2, dash: 'dash' } },
      ]
    : [];
  const axes = { gridcolor: css('edge'), zerolinecolor: css('muted'), automargin: true, fixedrange: true };
  Plotly.react('sweepPlot', [
    { ...trace(SWEEP_LAGS, peaks, 'Peak overshoot'), mode: 'lines+markers', marker: { size: 5, color: css('output') } },
    { x: [opts.tauS], y: [current], mode: 'markers', name: 'Now', marker: { size: 14, color: css('input'), line: { color: css('surface'), width: 2 } } },
  ], {
    showlegend: false, hovermode: 'x unified', paper_bgcolor: css('surface'), plot_bgcolor: css('surface'),
    font: { color: css('text') }, margin: { l: 56, r: 12, t: 10, b: 44 }, shapes,
    xaxis: { ...axes, title: 'Sensor lag τs (s)', range: [0, 2] },
    yaxis: { ...axes, title: 'Peak overshoot of y (%)', range: [0, top] },
  }, { responsive: true, displayModeBar: false });
  el('boundaryPill').textContent = Number.isFinite(star) ? 'Oscillates from τs ≈ ' + star.toFixed(2) + ' s' : 'Stable for every τs';
  const tail = Number.isFinite(star)
    ? (star <= 2 ? 'With these gains the loop starts to oscillate at τs = ' + star.toFixed(2) + ' s.' : 'The boundary is at τs = ' + star.toFixed(2) + ' s, off this chart.')
    : 'Ki ≤ 1 + Kp here, so no sensor lag can make this loop unstable; the lag still adds overshoot.';
  verdict('sweepNote', Number.isFinite(star) && opts.tauS >= star ? 'bad' : 'good',
    'At your τs = ' + opts.tauS.toFixed(2) + ' s the true speed overshoots by ' + (current >= SWEEP_CAP ? 'more than ' + SWEEP_CAP : current.toFixed(1)) + '%. ' + tail);
}

function clearFeedback() {
  el('lagFeedback').textContent = '';
  el('waveFeedback').textContent = '';
}
for (const id of Object.keys(reference)) el(id).addEventListener('input', clearFeedback);
bindModel(Object.keys(reference), drawExperiment);
for (const button of sensorButtons) {
  button.onclick = () => preset({ tauS: Number(button.dataset.lag) });
}
el('reset').onclick = () => {
  preset(reference);
  el('predictLag').reset();
  el('predictWave').reset();
};

function runPrediction(lag) {
  clearFeedback();
  for (const [id, value] of Object.entries({ ...reference, tauS: lag })) el(id).value = value;
  syncParameterFields();
  return drawExperiment();
}
el('predictLag').onsubmit = event => {
  event.preventDefault();
  const run = runPrediction(0.25);
  const i = run.y.findIndex(speed => speed >= 1);
  const correct = el('lagAnswer').value === 'below';
  verdict('lagFeedback', correct ? 'good' : 'warn',
    (correct ? 'Correct. ' : 'Look at the dashed line. ') + 'At ' + run.t[i].toFixed(3) + ' s the sensor reads ' + run.ym[i].toFixed(3) + ', even though the wheel has reached 1.');
};
el('predictWave').onsubmit = event => {
  event.preventDefault();
  const run = runPrediction(1.5);
  const peaks = run.y.filter((v, i, a) => v > a[i - 1] && v >= a[i + 1]);
  const correct = el('waveAnswer').value === 'grow';
  verdict('waveFeedback', correct ? 'good' : 'warn',
    (correct ? 'Correct. ' : 'Compare the first two peaks. ') + 'True speed peaks at ' + peaks[0].toFixed(2) + ' and then ' + peaks[1].toFixed(2) + '. Late corrections drive growing swings.');
};

// The teaching checks use predictions about the signals, independently of
// stability(), which labels the experiment using the characteristic polynomial.
function maxima(values) {
  return values.flatMap((value, i) => value > values[i - 1] && value >= values[i + 1] ? [i] : []);
}

el('runChecks').onclick = () => {
  const [ideal, short, boundary, long] = [0, 0.25, 1, 1.5].map(tauS =>
    simulate({ ...reference, plant: p2Plant, tauS, T: 12 })
  );
  const gap = Math.max(...ideal.y.map((y, i) => Math.abs(y - ideal.ym[i])));
  const crossing = short.y.findIndex(y => y >= 1);
  const reading = short.ym[crossing] ?? NaN;
  const shortPeak = Math.max(...short.y);
  const idealPeak = Math.max(...ideal.y);
  // At τs = 1 the polynomial is (s+2)(s²+2). The imaginary roots
  // predict period 2π/√2. Compare two late peaks after the transient.
  const boundaryPeaks = maxima(boundary.y);
  const [a, b] = boundaryPeaks.slice(-2);
  const period = boundary.t[b] - boundary.t[a];
  const ratio = (boundary.y[b] - 1) / (boundary.y[a] - 1);
  const [first, second] = maxima(long.y);
  const growth = (long.y[second] - 1) / (long.y[first] - 1);
  const cases = [
    ['Ideal sensor · 0 s', 'The two speed curves coincide.',
      'Largest gap ' + gap.toFixed(6), gap < 1e-9],
    ['Short lag · 0.25 s', 'Reading below 1 at the first crossing, and a higher peak than with the ideal sensor.',
      'Reading ' + reading.toFixed(3) + ' · peaks ' + idealPeak.toFixed(3) + ' → ' + shortPeak.toFixed(3),
      reading < 1 && shortPeak > idealPeak],
    ['Stability boundary · 1 s', 'Late peak heights above target agree within 1% and the period is within 0.02 s of 4.443 s.',
      'Height ratio ' + ratio.toFixed(4) + ' · period ' + period.toFixed(3) + ' s',
      Math.abs(ratio - 1) < 0.01 && Math.abs(period - 2 * Math.PI / Math.sqrt(2)) < 0.02],
    ['Longer lag · 1.5 s', 'The second peak rises farther above the target than the first.',
      'Peak heights above target grow by a factor of ' + growth.toFixed(3), growth > 1]
  ];
  el('p2Checks').innerHTML = cases.map(args => checkRow(...args)).join('');
  el('checkCount').textContent = cases.filter(row => row[3]).length + ' of 4 P2 checks pass.';
};

// [HW2 §7] Free response of the HW1 M3 mass-spring-damper. Represent each
// requested root as [real, imaginary]. All choices give real-valued gains.
const targetPoles = {
  distinct: [[-3, 0], [-4, 0]],
  repeated: [[-3, 0], [-3, 0]],
  complex: [[-2, 3], [-2, -3]]
};

function drawPolePlacement() {
  const mass = 1, damping = 2, spring = 4;
  const target = targetPoles[el('poleChoice').value];
  const [p, q] = target;
  const positionGain = mass * (p[0] * q[0] - p[1] * q[1]) - spring;
  const velocityGain = -mass * (p[0] + q[0]) - damping;
  // The Module 3 eigenvalue routine evaluates the matrix formed from the gains.
  const actual = eigen(mass, damping + velocityGain, spring + positionGain);
  const same = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-7;
  const match = (same(actual[0], p) && same(actual[1], q)) || (same(actual[1], p) && same(actual[0], q));
  function formatPole([real, imaginary]) {
    return imaginary ? real + (imaginary > 0 ? ' + ' : ' − ') + Math.abs(imaginary) + 'j' : String(real);
  }
  el('actualPoles').textContent = actual.map(formatPole).join(', ');
  el('positionGain').textContent = positionGain + ' N/m';
  el('velocityGain').textContent = velocityGain + ' N·s/m';
  verdict('poleCheck', match ? 'good' : 'bad', match ? 'PASS\nBoth calculated poles match the requested pair.' : 'FAIL\nThe calculated poles differ from the request.');

  const time = [], free = [], controlled = [];
  let x = [1, 0];
  const dt = 0.01;
  function derivatives([position, velocity]) {
    const force = -positionGain * position - velocityGain * velocity;
    return [velocity, (force - damping * velocity - spring * position) / mass];
  }
  for (let i = 0; i <= 600; i++) {
    const t = i * dt;
    time.push(t);
    // For initial position 1 and velocity 0, the free response equals one
    // minus the Module 3 unit-final-value step response for this plant.
    free.push(1 - state(t, 0.5, 2)[0]);
    controlled.push(x[0]);
    x = rk4(derivatives, x, dt);
  }
  const axis = { gridcolor: css('edge'), zerolinecolor: css('muted'), automargin: true, fixedrange: true };
  Plotly.react('bonusPlot', [
    trace(time, controlled, 'With state feedback'), trace(time, free, 'Free response', 'input')
  ], {
    showlegend: false, hovermode: 'x unified', paper_bgcolor: css('surface'), plot_bgcolor: css('surface'),
    font: { color: css('text') }, margin: { l: 52, r: 12, t: 10, b: 44 },
    xaxis: { ...axis, title: 'Time (s)' }, yaxis: { ...axis, title: 'Displacement (m)' }
  }, { responsive: true, displayModeBar: false });
}
bindModel(['poleChoice'], drawPolePlacement);


// Use the toolkit's bundled KaTeX renderer for the continuous-time models.
const equations = {
  motorEq: String.raw`G(s)=\frac{Y(s)}{U(s)}=\frac{1}{s+1}`,
  sensorEq: String.raw`H(s)=\frac{Y_m(s)}{Y(s)}=\frac{1}{\tau_s s+1}`,
  pidEq: String.raw`C(s)=\frac{U(s)}{E(s)}=\frac{K_d s^2+K_p s+K_i}{s}`,
  massEq: String.raw`G(s)=\frac{X(s)}{U(s)}=\frac{1}{m s^2+b s+k}`,
  forceEq: String.raw`u(t)=-K_1 x(t)-K_2\frac{dx(t)}{dt}`,
  polyEq: String.raw`s^2+\frac{b+K_2}{m}s+\frac{k+K_1}{m}=0`
};
for (const [id, latex] of Object.entries(equations)) formula(id, '\\displaystyle ' + latex);


// Each teammate's module opens directly once it is published. Until then,
// its navigation item opens the existing module overview on the Control hub.
for (const link of document.querySelectorAll('[data-module-page]')) {
  const url = link.dataset.modulePage;
  fetch(url, { method: 'HEAD' })
    .then(response => { if (response.ok) link.href = url; })
    .catch(() => {});
}
