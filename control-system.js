// My system · the micromouse drive motor: the page
// Maths in motor-model.js, simulation in pid-core.js, Arduino code from arduino-pid.js (P3).
// Reference tags: [HW2 §3] Homework 2 sheet, [DS] the motor's product manual.

let measured = null; // { K, tau } from a pasted step test, or null for the datasheet
let lastDesign = null;
const f = (v, d = 2) => Number(v).toFixed(d);

function assumptions() {
  return { massGrams: num('massGrams'), wheelMm: num('wheelMm'), rotorGcm2: num('rotorGcm2') };
}
function currentPlant() {
  const p = motorPlant(DATASHEET, assumptions());
  return measured ? { ...p, K: measured.K, tau: measured.tau } : p;
}

// ---------------------------------------------------------------- 1 · plant
function drawPlant() {
  const as = assumptions();
  if (![as.massGrams, as.wheelMm, as.rotorGcm2].every((v) => Number.isFinite(v) && v >= 0)) return;
  const p = motorPlant(DATASHEET, as);
  const ds = DATASHEET;
  const row = (a, b) => '<tr><th scope="row">' + a + '</th><td>' + b + '</td></tr>';
  el('dsRows').innerHTML =
    row('Rated voltage', ds.volts + ' V') +
    row('No-load speed (output)', ds.noLoadRpm + ' rpm') +
    row('No-load current', ds.noLoadAmps * 1000 + ' mA') +
    row('Stall current', ds.stallAmps + ' A') +
    row('Stall torque (output)', ds.stallKgCm + ' kg·cm') +
    row('Gear ratio', ds.ratio + ' : 1');
  el('derive').innerHTML = [
    'Winding resistance: R = V / I<sub>stall</sub> = ' + ds.volts + ' / ' + ds.stallAmps + ' = <b>' + f(p.R) + ' Ω</b>.',
    'Back-EMF constant: the motor shaft turns ' + ds.ratio + ' × ' + ds.noLoadRpm + ' rpm = ' + f((ds.ratio * ds.noLoadRpm * 2 * Math.PI) / 60, 0) + ' rad/s at no load, so K<sub>e</sub> = (V − I<sub>0</sub>R) / ω = <b>' + f(p.Ke * 1000, 3) + ' mV·s/rad</b>.',
    'Torque constant: stall torque at the motor = ' + ds.stallKgCm + ' kg·cm / ' + ds.ratio + ', so K<sub>t</sub> = T / I<sub>stall</sub> = <b>' + f(p.Kt * 1000, 3) + ' mN·m/A</b> (this includes the gearbox losses).',
    'Inertia at the motor shaft: half the robot (' + as.massGrams / 2 + ' g) on a ' + as.wheelMm + ' mm wheel, divided by the ratio squared, plus the rotor: J = ' + f(p.Jload * 1e9, 1) + ' + ' + f(p.Jrotor * 1e9, 1) + ' = <b>' + f(p.J * 1e9, 1) + ' × 10⁻⁹ kg·m²</b>.',
    'Time constant: τ = J·R / (K<sub>t</sub>·K<sub>e</sub>) = <b>' + f(p.tau * 1000, 1) + ' ms</b>. Static gain: 100% PWM gives ' + ds.noLoadRpm + ' rpm, so K = <b>' + f(p.K) + ' rpm per %</b>.',
  ]
    .map((x) => '<li>' + x + '</li>')
    .join('');
  const cur = currentPlant();
  el('chipK').textContent = f(cur.K) + ' rpm/%';
  el('chipTau').textContent = f(cur.tau * 1000, 1) + ' ms';
  el('chipSource').textContent = measured ? 'Measured step test' : 'Datasheet';
}

// ---------------------------------------------------------------- 2 + 3 · spec and design
const axisStyle = () => ({ gridcolor: css('edge'), zerolinecolor: css('muted'), automargin: true });
const baseLayout = (x, y, extra = {}) => ({
  paper_bgcolor: css('surface'),
  plot_bgcolor: css('surface'),
  font: { color: css('text') },
  margin: { l: 58, r: 16, t: 12, b: 46 },
  showlegend: false,
  hovermode: 'x unified',
  xaxis: { ...axisStyle(), ...x },
  yaxis: { ...axisStyle(), ...y },
  ...extra,
});
const every = (a, n) => a.filter((_, i) => i % n === 0 || i === a.length - 1);

function drawDesign() {
  const zeta = num('zeta'),
    wn = num('wn'),
    rpm = num('rpm'),
    TsMs = num('TsMs');
  el('zetaValue').textContent = f(zeta);
  el('wnValue').textContent = f(wn, 0);
  el('rpmValue').textContent = f(rpm, 0);
  el('TsValue').textContent = f(TsMs, 0);
  const p = currentPlant();
  el('cruiseText').textContent = f(rpm, 0) + ' rpm';
  el('cruiseMs').textContent = f(p.metersPerSecond(rpm), 2) + ' m/s';
  const d = designLoop({ K: p.K, tau: p.tau, zeta, wn, rpm, TsMs });
  lastDesign = { ...d, TsMs, rpm };
  const m = d.metrics;
  const item = (label, value) => '<span class="metric-item"><span>' + label + '</span><strong>' + value + '</strong></span>';
  el('gains').innerHTML =
    item('K<sub>p</sub>', f(d.Kp, 4) + ' %/rpm') +
    item('K<sub>i</sub>', f(d.Ki, 3) + ' %/(rpm·s)') +
    item('Overshoot', f(m.overshoot, 1) + '%') +
    item('Settling (2%)', m.settled && m.settle !== null ? f(m.settle * 1000, 0) + ' ms' : 'not settled') +
    item('Steady PWM', f(rpm / p.K, 1) + '%');
  const checks = specChecks(d, zeta);
  el('specTickets').innerHTML = checks
    .map(
      (c) =>
        '<div class="ticket ' + (c.pass ? 'pass' : 'fail') + '"><span class="ticket-icon">' + icon(c.pass ? 'check' : 'bolt') + '</span>' +
        '<span class="ticket-label">' + c.name + '<small>' + c.limit + '</small></span><b class="ticket-limit"></b>' +
        '<span class="ticket-result"><span>' + c.got + '</span><em>' + (c.pass ? 'PASS' : 'FAIL') + '</em></span></div>',
    )
    .join('');
  const n = Math.max(1, Math.round(d.run.t.length / 500));
  const t = every(d.run.t, n).map((v) => v * 1000);
  Plotly.react(
    'speedPlot',
    [
      { ...trace(t, every(d.run.y, n), 'Wheel speed'), line: { color: css('output'), width: 3 } },
      { ...trace([0, t[t.length - 1]], [rpm, rpm], 'Target', 'input'), hoverinfo: 'skip' },
    ],
    baseLayout({ title: 'Time (ms)' }, { title: 'Wheel speed (rpm)', rangemode: 'tozero' }),
    { responsive: true, displayModeBar: false },
  );
  const pwm = { ...trace(t, every(d.run.u, n), 'PWM'), line: { color: css('target'), width: 2.4, shape: 'hv' } };
  Plotly.react(
    'pwmPlot',
    [pwm],
    baseLayout({ title: 'Time (ms)' }, { title: 'PWM (%)', range: [-5, 110] }, {
      shapes: [0, 100].map((v) => ({ type: 'line', xref: 'paper', x0: 0, x1: 1, y0: v, y1: v, line: { color: css('fail'), dash: 'dot', width: 1.5 } })),
    }),
    { responsive: true, displayModeBar: false },
  );
  const ok = checks.every((c) => c.pass);
  verdict(
    'designVerdict',
    ok ? 'good' : 'warn',
    ok
      ? 'All three lines of the spec pass. The wheel reaches ' + f(rpm, 0) + ' rpm in about ' + f((m.settle ?? 0) * 1000, 0) + ' ms with ' + f(m.overshoot, 1) + '% overshoot, and the PWM peaks at ' + f(d.peakPwm, 1) + '%.'
      : checks.find((c) => !c.pass).name === 'PWM stays in 0–100%'
        ? 'The PWM clips at 100%: the design asks the battery for more than it has. Lower ωn (a slower loop) or the target speed.'
        : 'Move ζ back into 0.6–0.8, the practical range from the lecture.',
  );
  drawCode();
}

// ---------------------------------------------------------------- 4 · code
function drawCode() {
  if (!lastDesign) return;
  const code = generateArduinoPID({
    Kp: Number(lastDesign.Kp.toFixed(5)),
    Ki: Number(lastDesign.Ki.toFixed(4)),
    Kd: 0,
    TsMs: lastDesign.TsMs,
    r: lastDesign.rpm,
    uMax: 100,
    antiWindup: true,
  });
  if (el('arduinoCode').value !== code) {
    el('arduinoCode').value = code;
    el('copyStatus').textContent = '';
  }
}
el('copyCode').onclick = async () => {
  try {
    await navigator.clipboard.writeText(el('arduinoCode').value);
    el('copyStatus').textContent = 'Sketch copied.';
  } catch {
    el('arduinoCode').select();
    el('copyStatus').textContent = 'The sketch is selected. Use your browser’s Copy command.';
  }
};

// ---------------------------------------------------------------- predict, then check
// Same gains, double mass: τ grows, so ζ = (1 + K·Kp) / (2√(τ·K·Ki)) falls and the overshoot rises.
el('predictForm').onsubmit = (e) => {
  e.preventDefault();
  const p = currentPlant();
  const heavy = motorPlant(DATASHEET, { ...assumptions(), massGrams: 2 * num('massGrams') });
  const tauHeavy = measured ? p.tau * (heavy.tau / motorPlant(DATASHEET, assumptions()).tau) : heavy.tau;
  const g = lastDesign;
  const run = (tau) => {
    const r = simulate({ plant: firstOrder(p.K, tau), Kp: g.Kp, Ki: g.Ki, r: g.rpm, uMin: 0, uMax: 100, Ts: g.TsMs / 1000, antiWindup: true, T: 1 });
    return loopMetrics(r.t, r.y, g.rpm);
  };
  const before = run(p.tau),
    after = run(tauHeavy);
  const zetaAfter = theoryPI(p.K, tauHeavy, g.Kp, g.Ki).zeta;
  verdict(
    'predictResult',
    el('predictPick').value === 'up' ? 'good' : 'warn',
    (el('predictPick').value === 'up' ? 'Right. ' : 'Not quite. ') +
      'τ goes from ' + f(p.tau * 1000, 1) + ' to ' + f(tauHeavy * 1000, 1) + ' ms, so ζ = (1 + K·Kp)/(2√(τ·K·Ki)) drops to ' + f(zetaAfter) +
      ' and the overshoot rises from ' + f(before.overshoot, 1) + '% to ' + f(after.overshoot, 1) + '%. A heavier robot needs the gains redesigned.',
  );
};

// ---------------------------------------------------------------- 5 · measure
function useMeasured(fit) {
  measured = fit ? { K: fit.K, tau: fit.tau } : null;
  el('useDatasheet').disabled = !measured;
  drawPlant();
  drawDesign();
}
el('fitLog').onclick = () => {
  try {
    const rows = parseLog(el('logText').value);
    const pwm = num('pwmStep');
    const fit = fitStep(rows, pwm);
    const ds = motorPlant(DATASHEET, assumptions());
    verdict(
      'fitResult',
      'good',
      'Measured K = ' + f(fit.K) + ' rpm/% (datasheet ' + f(ds.K) + ') and τ = ' + f(fit.tau * 1000, 1) + ' ms (datasheet model ' + f(ds.tau * 1000, 1) + ' ms). The design above now uses the measured plant.',
    );
    el('fitResult').hidden = false;
    el('fitPlot').hidden = false;
    const tm = rows.map((r) => (r.t - rows[0].t) * 1000);
    Plotly.react(
      'fitPlot',
      [
        { x: tm, y: rows.map((r) => r.rpm), mode: 'markers', marker: { size: 4, color: css('output') }, name: 'Logged' },
        { ...trace(tm, tm.map((ms) => rows[0].rpm + fit.K * pwm * (1 - Math.exp(-ms / 1000 / fit.tau))), 'Fitted model', 'input') },
      ],
      baseLayout({ title: 'Time (ms)' }, { title: 'Wheel speed (rpm)', rangemode: 'tozero' }),
      { responsive: true, displayModeBar: false },
    );
    useMeasured(fit);
  } catch (err) {
    verdict('fitResult', 'bad', err.message);
    el('fitResult').hidden = false;
  }
};
el('exampleLog').onclick = () => {
  el('logText').value = 'time_ms, rpm\n' + exampleLog(motorPlant(DATASHEET, assumptions()), num('pwmStep') || 50);
};
el('useDatasheet').onclick = () => {
  el('fitResult').hidden = true;
  el('fitPlot').hidden = true;
  useMeasured(null);
};

// ---------------------------------------------------------------- wiring
['massGrams', 'wheelMm', 'rotorGcm2'].forEach((id) =>
  el(id).addEventListener('input', () => {
    drawPlant();
    drawDesign();
  }),
);
drawPlant();
bindModel(['zeta', 'wn', 'rpm', 'TsMs'], drawDesign);

// A module's nav item opens its page once it is published; until then it opens the
// module cards on the Control hub (the same approach as P1–P4).
for (const link of document.querySelectorAll('[data-module-page]')) {
  fetch(link.dataset.modulePage, { method: 'HEAD' })
    .then((r) => {
      if (r.ok) link.href = link.dataset.modulePage;
    })
    .catch(() => {});
}
