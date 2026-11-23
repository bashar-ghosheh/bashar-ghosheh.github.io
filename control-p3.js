// [HW2 §2, P3] All experiments use the same RK4 and PID implementation as the Control hub.
const p3Duration = 20;
const p3Presets = {
  fast: { TsMs: 10, Kp: 5, Ki: 5, Kd: 0, plantGain: 1, plantTau: 1, setpoint: 1, commandMax: 6, antiWindup: true, compareWindup: false },
  slow: { TsMs: 350, Kp: 5, Ki: 5, Kd: 0, plantGain: 1, plantTau: 1, setpoint: 1, commandMax: 6, antiWindup: true, compareWindup: false },
  windup: { TsMs: 50, Kp: 2, Ki: 5, Kd: 0, plantGain: 1, plantTau: 1, setpoint: 1, commandMax: 1.2, antiWindup: true, compareWindup: true },
};
const p3Fields = Object.keys(p3Presets.fast);
const plantFields = ['plantGain', 'plantTau', 'setpoint', 'commandMax'];
const p3RunCache = new Map();

graphExamples.digitalResponse = 'Compare the selected curve with the 10 ms reference to isolate the effect of sampling.';
graphExamples.digitalCommand = 'Inspect snaps to the nearest plotted sample. Between sample markers the command stays constant.';

function runP3({ plantGain, plantTau, Kp, Ki, Kd, setpoint, commandMax, TsMs, antiWindup }) {
  const key = JSON.stringify([plantGain, plantTau, Kp, Ki, Kd, setpoint, commandMax, TsMs, antiWindup]);
  if (p3RunCache.has(key)) return p3RunCache.get(key);
  const run = simulate({
    plant: firstOrder(plantGain, plantTau), Kp, Ki, Kd, r: setpoint,
    uMin: 0, uMax: commandMax, Ts: TsMs / 1000, antiWindup, T: p3Duration,
  });
  const metrics = loopMetrics(run.t, run.y, setpoint);
  const peakAboveTarget = Math.max(0, (Math.max(...run.y) / setpoint - 1) * 100);
  const result = { run, metrics, peakAboveTarget };
  // Keep a short cache because the reference and preset rows repeat as Ts changes.
  if (p3RunCache.size >= 12) p3RunCache.delete(p3RunCache.keys().next().value);
  p3RunCache.set(key, result);
  return result;
}

function p3Percent(value) {
  return value.toFixed(1) + '%';
}

function p3Measures({ metrics, peakAboveTarget }) {
  const rise = metrics.settled && metrics.final > 0 && metrics.rise !== null
    ? metrics.rise.toFixed(2) + ' s' : '—';
  const settle = metrics.settle === null ? 'Not settled' : metrics.settle.toFixed(2) + ' s';
  const error = Number(metrics.ess.toPrecision(3));
  return { rise, peak: p3Percent(peakAboveTarget), settle, error: Object.is(error, -0) ? 0 : error };
}

function p3Row(tbody, name, values, current) {
  const row = tbody.insertRow();
  row.classList.toggle('current-run', current);
  const label = document.createElement('th');
  label.scope = 'row';
  label.textContent = name + (current ? ' (selected)' : '');
  row.append(label);
  for (const value of values) row.insertCell().textContent = value;
}

function p3Plots(settings, current, reference, other) {
  const { run } = current;
  const windowAxis = { title: 'Time (s)', range: [0, 6] };
  const chart = { legend: { orientation: 'h', y: -0.27 }, margin: { l: 54, r: 16, t: 12, b: 65 }, uirevision: 'p3' };
  const response = [
    trace(run.t, run.y, 'Selected · ' + settings.TsMs + ' ms'),
    trace([0, p3Duration], [settings.setpoint, settings.setpoint], 'Target', 'target'),
  ];
  if (settings.TsMs !== 10) response.push(trace(reference.run.t, reference.run.y, '10 ms reference', 'input'));
  if (settings.compareWindup) {
    const alternate = trace(other.run.t, other.run.y, 'Anti-windup ' + (settings.antiWindup ? 'off' : 'on'));
    alternate.line = { color: css('brake'), width: 2, dash: 'dashdot' };
    response.push(alternate);
  }
  plot('digitalResponse', response, windowAxis, { title: 'Output y', rangemode: 'tozero' }, chart);

  // [HW2 §2, P3] Plot the controller instants, then extend the last held value to the end.
  // Plotly's hv shape holds u[k] horizontally up to the time of sample k+1.
  const stride = Math.round(run.Ts / run.dt);
  const times = [];
  const pwm = [];
  for (let i = 0; i < run.t.length; i += stride) {
    times.push(run.t[i]);
    pwm.push(100 * run.u[i] / settings.commandMax);
  }
  const samples = {
    ...trace(times, pwm, 'Samples'),
    mode: 'markers',
    marker: { color: css('output'), size: settings.TsMs < 50 ? 3 : 6 },
  };
  const lastTime = run.t.at(-1);
  const holdTimes = times.at(-1) < lastTime ? [...times, lastTime] : times;
  const holdPWM = holdTimes === times ? pwm : [...pwm, pwm.at(-1)];
  const held = trace(holdTimes, holdPWM, 'Held command');
  held.line.shape = 'hv';
  // The reader inspects the actual sample markers in the first trace.
  plot('digitalCommand', [samples, held, trace([0, lastTime], [100, 100], 'PWM limit', 'target')],
    windowAxis, { title: 'PWM (%)', range: [-5, 108] }, chart);
}

function drawP3() {
  const invalid = plantFields.find((id) => !el(id).validity.valid);
  const error = el('settingsError');
  error.hidden = !invalid;
  if (invalid) {
    const field = el(invalid);
    error.textContent = field.labels[0].textContent + ' must be between ' + field.min + ' and ' + field.max + '. Showing the last valid run.';
    el('copyCode').disabled = true;
    return;
  }
  el('copyCode').disabled = false;
  const settings = Object.fromEntries(p3Fields.map((id) => {
    const field = el(id);
    return [id, field.type === 'checkbox' ? field.checked : num(id)];
  }));
  for (const button of document.querySelectorAll('[data-preset]')) {
    const preset = p3Presets[button.dataset.preset];
    button.setAttribute('aria-pressed', p3Fields.every((id) => settings[id] === preset[id]));
  }
  const current = runP3(settings);
  const reference = runP3({ ...settings, TsMs: 10 });
  const other = runP3({ ...settings, antiWindup: !settings.antiWindup });
  const { settle } = p3Measures(current);
  el('runSummary').textContent = [
    'Tₛ ' + settings.TsMs + ' ms',
    'Anti-windup ' + (settings.antiWindup ? 'on' : 'off'),
    settle === 'Not settled' ? 'Not settled in 20 s' : '2% settling ' + settle,
  ].join(' · ');

  const samplingRows = el('samplingRows');
  samplingRows.replaceChildren();
  const periods = [...new Set([10, 100, 200, 350, settings.TsMs])].sort((a, b) => a - b);
  for (const TsMs of periods) {
    const { rise, peak, settle, error } = p3Measures(runP3({ ...settings, TsMs }));
    p3Row(samplingRows, TsMs + ' ms', [rise, peak, settle, error], settings.TsMs === TsMs);
  }
  const windupRows = el('windupRows');
  windupRows.replaceChildren();
  for (const enabled of [false, true]) {
    const result = enabled === settings.antiWindup ? current : other;
    const { peak, settle, error } = p3Measures(result);
    p3Row(windupRows, enabled ? 'On' : 'Off',
      [p3Percent(100 * result.run.saturated), peak, settle, error], enabled === settings.antiWindup);
  }

  const code = generateArduinoPID({ ...settings, r: settings.setpoint, uMax: settings.commandMax });
  if (el('arduinoCode').value !== code) {
    el('arduinoCode').value = code;
    el('copyStatus').textContent = '';
  }
  el('plotError').hidden = typeof Plotly !== 'undefined';
  if (el('plotError').hidden) p3Plots(settings, current, reference, other);
}

function applyP3Preset(name) {
  for (const [id, value] of Object.entries(p3Presets[name])) {
    const field = el(id);
    if (field.type === 'checkbox') field.checked = value;
    else field.value = value;
  }
  syncParameterFields();
  drawP3();
}

document.querySelectorAll('[data-preset]').forEach((button) => {
  button.addEventListener('click', () => applyP3Preset(button.dataset.preset));
});

el('sampleQuestion').addEventListener('submit', (event) => {
  event.preventDefault();
  applyP3Preset('slow');
  const fast = runP3(p3Presets.fast).peakAboveTarget;
  const slow = runP3(p3Presets.slow).peakAboveTarget;
  const actual = slow > fast ? 'higher' : slow < fast ? 'lower' : 'same';
  const correct = el('sampleAnswer').value === actual;
  el('sampleFeedback').hidden = false;
  verdict('sampleFeedback', correct ? 'good' : 'warn',
    (correct ? 'Correct. ' : 'Compare the two runs. ') + 'The peak above target changes from ' +
    p3Percent(fast) + ' to ' + p3Percent(slow) + '. The slower controller holds its command longer before reacting.');
});

el('windupQuestion').addEventListener('submit', (event) => {
  event.preventDefault();
  applyP3Preset('windup');
  const on = runP3(p3Presets.windup).peakAboveTarget;
  const off = runP3({ ...p3Presets.windup, antiWindup: false }).peakAboveTarget;
  const actual = on < off ? 'on' : on > off ? 'off' : 'same';
  const correct = el('windupAnswer').value === actual;
  el('windupFeedback').hidden = false;
  verdict('windupFeedback', correct ? 'good' : 'warn',
    (correct ? 'Correct. ' : 'Compare the two runs. ') + 'The peak above target is ' +
    p3Percent(on) + ' with anti-windup on and ' + p3Percent(off) +
    ' with it off. With anti-windup on, errors that deepen saturation do not accumulate.');
});

// [HW2 P3] "The effect of Ts is visible, anti-windup works, and the generated code
// is correct." Each check runs the shared simulator (or the generator) and compares
// the result with what the lesson predicts.
el('runChecks').onclick = () => {
  const base = { plant: firstOrder(1, 1), Kp: 5, Ki: 5, Kd: 0, uMin: 0, uMax: 6, antiWindup: true, T: 10 };
  // 1. A digital PID sampled every 1 ms is the continuous PID of the hub.
  const cont = simulate({ ...base, Ts: null });
  const fine = simulate({ ...base, Ts: 0.001 });
  const gap = Math.max(...cont.y.map((y, i) => Math.abs(y - fine.y[i])));
  // 2. Zero-order hold: inside one 100 ms sample the command never changes.
  const held = simulate({ ...base, Ts: 0.1, T: 3 });
  const stride = Math.round(held.Ts / held.dt);
  let changesInside = 0;
  for (let i = 1; i < held.u.length; i++) if (i % stride !== 0 && held.u[i] !== held.u[i - 1]) changesInside++;
  // 3. A slower controller overshoots more, until it breaks.
  const peaks = [10, 200, 350].map((TsMs) => runP3({ ...p3Presets.fast, TsMs }).peakAboveTarget);
  const slowSettled = runP3({ ...p3Presets.fast, TsMs: 350 }).metrics.settled;
  // 4. Anti-windup after saturation: smaller peak and faster settling.
  const on = runP3(p3Presets.windup),
    off = runP3({ ...p3Presets.windup, antiWindup: false });
  // 5. The sketch carries the current settings and the sheet's formula.
  const settings = { Kp: 2.5, Ki: 1.25, Kd: 0.05, TsMs: 20, r: 1, uMax: 6, antiWindup: true };
  const code = generateArduinoPID(settings);
  const needs = ['Kp = 2.5f', 'Ki = 1.25f', 'Kd = 0.05f', 'SAMPLE_MS = 20UL', 'U_MAX = 6.0f', 'ANTI_WINDUP = true', 'Ki * Ts * (sumError + e)', '(e - previousError) / Ts'];
  const missing = needs.filter((part) => !code.includes(part));
  let rejects = false;
  try {
    generateArduinoPID({ ...settings, TsMs: 12.5 });
  } catch {
    rejects = true;
  }
  const cases = [
    ['Ts = 1 ms equals the continuous PID', 'The two output curves coincide.', 'Largest gap ' + gap.toExponential(1), gap < 1e-9],
    ['Zero-order hold', 'u changes only at sample instants (Ts = 100 ms).', changesInside + ' changes between samples', changesInside === 0],
    ['Larger Ts, worse response', 'Peak never shrinks as Ts goes 10 → 200 → 350 ms, ends far higher, and 350 ms does not settle.', peaks.map((p) => p.toFixed(1) + '%').join(' → ') + (slowSettled ? ' · settles' : ' · not settled'), peaks[0] <= peaks[1] && peaks[1] < peaks[2] && peaks[2] > peaks[0] + 10 && !slowSettled],
    ['Anti-windup works', 'Smaller peak and faster settling with it on (windup demo).', 'Peak ' + off.peakAboveTarget.toFixed(1) + '% → ' + on.peakAboveTarget.toFixed(1) + '% · settling ' + (off.metrics.settle ?? NaN).toFixed(2) + ' → ' + (on.metrics.settle ?? NaN).toFixed(2) + ' s', on.peakAboveTarget < off.peakAboveTarget && on.metrics.settle < off.metrics.settle],
    ['Generated sketch', 'Gains, period, limit, anti-windup and the u[k] formula appear; a fractional period is refused.', missing.length ? 'Missing: ' + missing.join(', ') : 'All ' + needs.length + ' parts found' + (rejects ? ' · 12.5 ms refused' : ''), !missing.length && rejects],
  ];
  el('p3Checks').innerHTML = cases.map((args) => checkRow(...args)).join('');
  const passed = cases.filter((c) => c[3]).length;
  el('checkCount').className = 'readout ' + (passed === cases.length ? 'good' : 'bad');
  el('checkCount').textContent = passed + ' of ' + cases.length + ' P3 checks pass.';
};

el('copyCode').addEventListener('click', async () => {
  const field = el('arduinoCode');
  const code = field.value;
  try {
    await navigator.clipboard.writeText(code);
    if (field.value === code) el('copyStatus').textContent = 'Sketch copied.';
  } catch {
    field.focus();
    field.select();
    let copied = false;
    try {
      copied = document.execCommand('copy');
    } catch {
      // The selected text can still be copied manually in restricted browsers.
    }
    el('copyStatus').textContent = copied
      ? 'Sketch copied.'
      : 'The sketch is selected. Use your browser’s Copy command.';
  }
});

bindModel(p3Fields, drawP3);

// A module's nav item opens its page once the page is published; until then it
// opens the module cards on the Control hub (the same approach as P2 and P4).
for (const link of document.querySelectorAll('[data-module-page]')) {
  fetch(link.dataset.modulePage, { method: 'HEAD' })
    .then((r) => {
      if (r.ok) link.href = link.dataset.modulePage;
    })
    .catch(() => {});
}
