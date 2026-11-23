// [HW2 P1] First- or second-order plant (default unit static gain). The ideal feedback sensor measures y directly.
const controls = ['plantType', 'plantK', 'plantTau', 'plantZeta', 'plantWn', 'setpoint', 'duration', 'Kp', 'Ki', 'Kd', 'uMin', 'uMax'];
graphExamples.plantOutput = 'For the opening P-only run, inspect 0.10 s. The output has reached about 63% of its final change.';
graphExamples.actuator = 'In the limited PI experiment, inspect the command at 1 s. The actuator is delivering its maximum of 0.6.';
el('predictedFinal').placeholder = 'e.g. 0.9';

function drawPlayground() {
  const first = el('plantType').value === 'first';
  el('tauWrap').hidden = !first;
  el('zetaWrap').hidden = first;
  el('wnWrap').hidden = first;

  const K = num('plantK');
  const tau = num('plantTau');
  const zeta = num('plantZeta');
  const wn = num('plantWn');
  const r = num('setpoint');
  const T = Number(el('duration').value);
  const uMin = num('uMin');
  const uMax = num('uMax');
  // [SLIDES 13, 40] First order: K/(τs+1). Second order: Kωn²/(s²+2ζωn s+ωn²).
  const plant = first ? firstOrder(K, tau) : secondOrder(K, zeta, wn);
  el('model').textContent = first
    ? 'K = ' + K + ', τ = ' + tau + ' s'
    : 'K = ' + K + ', ζ = ' + zeta + ', ωₙ = ' + wn + ' rad/s';
  const run = simulate({ plant, Kp: num('Kp'), Ki: num('Ki'), Kd: num('Kd'), r, uMin, uMax, T });
  const m = loopMetrics(run.t, run.y, r);
  const moving = run.y.some(value => value !== 0);
  const measurable = moving && m.settled;
  el('rise').textContent = measurable && m.rise !== null ? m.rise.toFixed(3) + ' s' : '—';
  el('overshoot').textContent = measurable ? m.overshoot.toFixed(1) + '%' : '—';
  el('settle').textContent = measurable && m.settle !== null ? m.settle.toFixed(3) + ' s' : '—';
  el('ess').textContent = m.settled ? Number(m.ess.toFixed(3)).toString() : '—';
  let note = 'Rise, overshoot and settling use the final output. Error is setpoint minus final output.';
  if (!moving) note = 'The output stayed at zero throughout this run.';
  else if (!m.settled) note = 'The output did not settle during this run. Try a longer simulation or adjust the gains.';
  el('metricNote').textContent = note;
  el('limitNote').textContent = run.saturated
    ? 'The actuator clipped the controller command at ' + (100 * run.saturated).toFixed(1) + '% of the sampled times.'
    : 'The actuator delivered the requested command throughout this run.';

  // Metrics use every 1 ms step; thin plotted points for responsive dragging while keeping 0.10 s and 1.0 s exact.
  const stride = T <= 2 ? 2 : T <= 15 ? 10 : 20;
  const thin = arr => arr.filter((_, i) => i % stride === 0 || i === arr.length - 1);
  const tPlot = thin(run.t);
  const timeAxis = { title: 'Time (s)' };
  const level = (value, name, role) => trace([0, T], [value, value], name, role);
  plot('plantOutput', [trace(tPlot, thin(run.y), 'Output y'), level(r, 'Setpoint r', 'input')], timeAxis, { title: 'Output (units)' });
  plot('actuator', [
    trace(tPlot, thin(run.u), 'Applied u'),
    level(uMin, 'Lower limit', 'target'),
    level(uMax, 'Upper limit', 'target'),
  ], timeAxis, { title: 'Control (units)' });
  return m;
}

// [HW2 §2.1] Load repeatable experiments. Score against the simulated final output.
const experiments = {
  p: { Kp: 9, Ki: 0, duration: 2, uMin: -10, uMax: 10, why: 'At equilibrium, y = 9(1 − y), so y = 0.9.' },
  pi: { Kp: 1, Ki: 1, duration: 15, uMin: -10, uMax: 10, why: 'Integral action builds enough command to remove the steady-state error.' },
  limited: { Kp: 1, Ki: 1, duration: 15, uMin: 0, uMax: 0.6, why: 'With unit plant gain, an actuator capped at 0.6 can sustain at most 0.6 output.' },
};
el('experiment').addEventListener('submit', event => {
  event.preventDefault();
  const { why, ...settings } = experiments[el('question').value];
  for (const [id, value] of Object.entries({ ...settings, plantType: 'first', plantK: 1, plantTau: 1, Kd: 0, setpoint: 1 })) {
    el(id).value = value;
  }
  syncParameterFields();
  const measured = drawPlayground().final;
  const correct = Math.abs(num('predictedFinal') - measured) <= 0.011;
  verdict('result', correct ? 'good' : 'warn', (correct ? 'Correct. ' : 'Try again. ') +
    'The simulated final output is ' + measured.toFixed(2) + '. ' + why);
});
el('question').addEventListener('change', () => {
  el('predictedFinal').value = '';
  el('result').textContent = '';
  el('result').className = '';
});

function renderValidation() {
  if (el('validation').open && !el('checks').childElementCount) {
    el('checks').innerHTML = validationChecks().map(c => checkRow(c.title, c.expected, c.got, c.pass)).join('');
  }
}
el('validation').addEventListener('toggle', renderValidation);
renderValidation();
bindModel(controls, drawPlayground);
