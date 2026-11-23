// P4 · Tuning challenge: the page (Ahmad AlSheikh)
// The maths lives in tuning-challenge.js; the simulation in pid-core.js.
// Reference tags: [HW2 §x] Homework 2 sheet, [SLIDES n] lecture slides.

let round = null; // the current hidden plant, its spec and the reference gains
let level = 'normal';
let tests = 0; // scored tests in this round
let best = null; // best score of this round
let practice = false; // live preview was used: no score
let revealed = false;
let pastRuns = []; // earlier test curves, drawn faint
let hintStep = 0;
const session = { rounds: 0, total: 0, best: 0, perfect: 0 };

const SPEC_ICONS = { overshoot: 'arrow', settle: 'clock', error: 'target' };
const fmt = (v, d = 2) => Number(v).toFixed(d);

// ---------------------------------------------------------------- spec tickets
function drawTickets(parts) {
  const { spec } = round;
  const base = [
    { key: 'overshoot', label: 'Overshoot', limit: '≤ ' + spec.overshoot + '%', why: 'How far the output may shoot past the target.' },
    { key: 'settle', label: 'Settling time (2%)', limit: '≤ ' + spec.settle + ' s', why: 'About ' + Math.round(100 * LEVELS[level].speedUp) + '% of the time the plant needs on its own.' },
    { key: 'error', label: 'Steady-state error', limit: '≈ 0', why: 'Within ' + spec.error + '% of the target once settled.' },
  ];
  el('tickets').innerHTML = base
    .map((b) => {
      const p = parts && parts.find((x) => x.key === b.key);
      const state = p ? (p.pass ? 'pass' : 'fail') : '';
      return (
        '<div class="ticket ' + state + '"><span class="ticket-icon">' + icon(SPEC_ICONS[b.key]) + '</span>' +
        '<span class="ticket-label">' + b.label + '<small>' + b.why + '</small></span>' +
        '<b class="ticket-limit">' + b.limit + '</b>' +
        '<span class="ticket-result">' + (p ? '<span>' + p.shown + '</span><em>' + (p.pass ? 'PASS' : 'FAIL') + '</em>' : '<span>not tested</span>') + '</span></div>'
      );
    })
    .join('');
}

// ---------------------------------------------------------------- plots
const axis = () => ({ gridcolor: css('edge'), zerolinecolor: css('muted'), automargin: true });
const layout = (x, y, extra = {}) => ({
  paper_bgcolor: css('surface'),
  plot_bgcolor: css('surface'),
  font: { color: css('text') },
  margin: { l: 54, r: 16, t: 12, b: 46 },
  showlegend: false,
  hovermode: 'x unified',
  xaxis: { ...axis(), ...x },
  yaxis: { ...axis(), ...y },
  ...extra,
});
const every = (a, n) => a.filter((_, i) => i % n === 0 || i === a.length - 1);

// [HW2 P4] the bench: Module 4's noisy step test of the hidden plant.
function drawBench() {
  const b = round.bench;
  Plotly.react(
    'bench',
    [
      { x: b.times, y: b.values, mode: 'markers', marker: { size: 4, color: css('output') }, name: 'Reading' },
      { ...trace([0, b.times[b.times.length - 1]], [1, 1], 'Input step', 'input'), hoverinfo: 'skip' },
    ],
    layout({ title: 'Time t (s)' }, { title: 'Plant output', rangemode: 'tozero' }),
    { responsive: true, displayModeBar: false },
  );
}

// Closed-loop result with the spec drawn on it: overshoot ceiling, deadline, ±2% band.
function drawResult(run) {
  const { spec } = round;
  const T = spec.T;
  const n = Math.max(1, Math.round(run.t.length / 600));
  const finite = run.y.filter(Number.isFinite);
  const top = Math.max(1 + spec.overshoot / 100 + 0.25, Math.min(2.5, Math.max(...finite.map(Math.abs)) * 1.08));
  const bottom = Math.min(0, Math.max(-1, Math.min(...finite) * 1.08));
  const ceiling = 1 + spec.overshoot / 100;
  const traces = pastRuns.map((h) => ({ x: h.t, y: h.y, mode: 'lines', line: { color: css('muted'), width: 1.4 }, opacity: 0.35, hoverinfo: 'skip' }));
  traces.push({ ...trace([0, T], [1, 1], 'Target', 'input'), hoverinfo: 'skip' });
  traces.push({ ...trace(every(run.t, n), every(run.y, n).map((v) => (Number.isFinite(v) ? v : null)), 'Your loop'), line: { color: css('output'), width: 3 } });
  const shapes = [
    { type: 'rect', xref: 'x', yref: 'y', x0: 0, x1: T, y0: ceiling, y1: top, fillcolor: css('fail'), opacity: 0.1, line: { width: 0 } },
    { type: 'line', xref: 'x', yref: 'y', x0: 0, x1: T, y0: ceiling, y1: ceiling, line: { color: css('fail'), width: 1.5, dash: 'dash' } },
    { type: 'rect', xref: 'x', yref: 'y', x0: spec.settle, x1: T, y0: 0.98, y1: 1.02, fillcolor: css('pass'), opacity: 0.22, line: { width: 0 } },
    { type: 'line', xref: 'x', yref: 'paper', x0: spec.settle, x1: spec.settle, y0: 0, y1: 1, line: { color: css('target'), width: 1.5, dash: 'dash' } },
  ];
  Plotly.react(
    'closedLoop',
    traces,
    layout({ title: 'Time t (s)', range: [0, T] }, { title: 'Output y', range: [bottom, top] }, {
      shapes,
      annotations: [{ x: spec.settle, y: 1, yref: 'paper', text: 'deadline ' + spec.settle + ' s', showarrow: false, xanchor: 'left', yanchor: 'top', font: { size: 11, color: css('target') } }],
    }),
    { responsive: true, displayModeBar: false },
  );
  const uTraces = [{ ...trace(every(run.t, n), every(run.u, n), 'u'), line: { color: css('target'), width: 2.2 } }];
  const uShapes = Number.isFinite(spec.uMax)
    ? [spec.uMin, spec.uMax].map((v) => ({ type: 'line', xref: 'paper', x0: 0, x1: 1, y0: v, y1: v, line: { color: css('fail'), dash: 'dot', width: 1.5 } }))
    : [];
  Plotly.react('effort', uTraces, layout({ title: 'Time t (s)', range: [0, T] }, { title: 'Control signal u' }, { shapes: uShapes }), { responsive: true, displayModeBar: false });
}

// ---------------------------------------------------------------- score panel
function drawScore(result, s) {
  el('scoreValue').textContent = practice ? '–' : s.total;
  el('ringFg').setAttribute('stroke-dasharray', (practice ? 0 : s.total) + ' 100');
  el('ringFg').classList.toggle('full', !practice && s.total === 100);
  el('stars').textContent = practice ? 'Practice round' : '★'.repeat(s.stars) + '☆'.repeat(3 - s.stars);
  el('stars').classList.toggle('practice', practice);
  el('breakdown').innerHTML =
    result.parts.map((p) => '<li class="' + (p.pass ? 'pass' : 'fail') + '"><span>' + p.label + '</span><b>' + (p.pass ? '+' + WEIGHTS[p.key] : '0') + '</b></li>').join('') +
    (practice ? '' : '<li><span>Tests used</span><b>' + tests + (tests > FREE_TESTS ? ' · ×' + s.factor.toFixed(2) : ' · free') + '</b></li>');
}

// ---------------------------------------------------------------- testing
function gains() {
  return { Kp: num('kp'), Ki: num('ki'), Kd: num('kd'), antiWindup: !LEVELS[level].limited || el('antiWindup').checked };
}
function evaluate(counted) {
  const run = runTest(round, gains());
  const result = judge(round, run);
  if (counted) tests++;
  const s = score(result.parts, Math.max(tests, 1));
  if (counted && !practice && !revealed) best = Math.max(best ?? 0, s.total);
  el('result').hidden = false;
  drawResult(run);
  drawTickets(result.parts);
  drawScore(result, s);
  el('testCount').textContent = tests ? '#' + (tests + 1) : '';
  el('resultTitle').textContent = practice ? 'Live preview' : 'Test #' + tests;
  el('resultPill').textContent = 'Kp ' + fmt(num('kp')) + ' · Ki ' + fmt(num('ki')) + ' · Kd ' + fmt(num('kd'));
  const failed = result.parts.filter((p) => !p.pass);
  let text;
  if (result.unstable) text = 'The loop is unstable: the output runs away. Lower the gains, especially Ki.';
  else if (!failed.length) text = 'All three lines pass. ' + (practice ? 'Turn off Live preview and start a new plant to play for a score.' : 'Score ' + s.total + '. Reveal the plant to compare with a reference design, or try for fewer tests on the next plant.');
  else text = advice(failed, result.metrics);
  verdict('resultVerdict', result.passed ? 'good' : 'warn', text);
  el('resultVerdict').hidden = false;
  if (counted) {
    pastRuns.push({ t: every(run.t, Math.max(1, Math.round(run.t.length / 300))), y: every(run.y, Math.max(1, Math.round(run.t.length / 300))).map((v) => (Number.isFinite(v) ? v : null)) });
    pastRuns = pastRuns.slice(-5);
  }
  return result;
}
// One plain sentence per failed line, pointing at the gain that helps.  [HW2 §1 table]
function advice(failed, m) {
  const tips = {
    overshoot: 'Too much overshoot (' + fmt(m.overshoot, 1) + '%): lower Ki, or add Kd to brake.',
    settle: m.settled ? 'Too slow to settle (' + fmt(m.settle) + ' s): raise Kp, or reduce the overshoot that keeps it ringing.' : 'It has not settled by the end of the test: it is still oscillating or still creeping. Check Ki.',
    error: 'The error does not reach zero: you need an integral term (Ki > 0).',
  };
  return failed.map((p) => tips[p.key]).join(' ');
}
el('runTest').onclick = () => {
  evaluate(!revealed && !practice);
  if (revealed) {
    el('resultTitle').textContent = 'Test (not scored)';
    verdict('resultVerdict', 'warn', 'The plant is revealed, so tests no longer count. Start a new plant to play for a score.');
  }
  el('result').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};

// Live preview: the curve follows the sliders. The round becomes practice.
el('live').onchange = () => {
  if (el('live').checked) {
    practice = true;
    evaluate(false);
  }
};
['kp', 'ki', 'kd'].forEach((id) =>
  el(id).addEventListener(
    'input',
    oncePerFrame(() => {
      el(id + 'Value').textContent = fmt(num(id));
      if (el('live').checked) evaluate(false);
    }),
  ),
);
el('antiWindup').onchange = () => el('live').checked && evaluate(false);

// ---------------------------------------------------------------- hints
function hintList() {
  const first = round.sensor.order === 1;
  return [
    'Look at the bench. Does the curve shoot past its final level? No: first order, read K (the final level) and τ (the time to 63.2% of it). Yes: second order, read the overshoot and the peak time.',
    'Every round needs an integral term: without Ki the loop always stops short, so the error line fails.',
    'Read the result plot: above the red ceiling, lower Ki or add Kd. Still outside the green band at the deadline, raise Kp.',
    first
      ? 'Design shortcut for a first-order plant: choose ζ ≈ 1 and ωn ≈ 6/(ζ·deadline). Then Ki = ωn²τ/K and Kp = (2ζωnτ − 1)/K, with your K and τ from the bench.'
      : 'For a second-order plant the PID loop is third order: s³ + (2ζωn + ωn²Kd)s² + ωn²(1 + Kp)s + ωn²Ki. Choose three poles a little faster than 4/deadline and match the coefficients.',
  ];
}
el('hintButton').onclick = () => {
  const list = hintList();
  if (hintStep >= list.length) return;
  el('hints').insertAdjacentHTML('beforeend', '<li>' + list[hintStep++] + '</li>');
  el('hintButton').disabled = hintStep >= list.length;
};

// ---------------------------------------------------------------- reveal
function reveal() {
  revealed = true;
  const s = round.sensor;
  const item = (label, value) => '<span class="metric-item">' + label + '<strong>' + value + '</strong></span>';
  el('truth').innerHTML =
    item('Kind', s.order === 1 ? 'First order' : 'Second order') +
    item('Gain K', fmt(s.K)) +
    (s.order === 1 ? item('Time constant τ', fmt(s.tau) + ' s') : item('Damping ζ', fmt(s.zeta)) + item('Natural frequency ωn', fmt(s.wn, 1) + ' rad/s')) +
    item('Reference gains', 'Kp ' + fmt(round.reference.Kp) + ' · Ki ' + fmt(round.reference.Ki) + (s.order === 2 ? ' · Kd ' + fmt(round.reference.Kd) : ''));
  el('solution').innerHTML = referenceSolution(round)
    .map((line) => '<li>' + line + '</li>')
    .join('');
  el('reveal').hidden = false;
  el('revealButton').disabled = true;
  el('reveal').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
el('revealButton').onclick = reveal;
el('tryReference').onclick = () => {
  const g = round.reference;
  preset({ kp: g.Kp, ki: g.Ki, kd: g.Kd });
  ['kp', 'ki', 'kd'].forEach((id) => (el(id + 'Value').textContent = fmt(num(id))));
  evaluate(false);
  el('resultTitle').textContent = 'Reference gains';
  el('result').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};

// ---------------------------------------------------------------- predict, then check
// [HW2 §1] P alone needs an error to keep pushing, so it always stops short.
el('predictForm').onsubmit = (e) => {
  e.preventDefault();
  const pick = el('predictPick').value;
  const run = runTest(round, { Kp: num('kp') || 1, Ki: 0, Kd: 0 });
  const m = loopMetrics(run.t, run.y, 1);
  verdict(
    'predictResult',
    pick === 'error' ? 'good' : 'warn',
    (pick === 'error' ? 'Right. ' : 'Not quite. ') +
      'P pushes only while there is an error, so it settles where the push just balances the plant: short of the target. On this plant, Kp = ' + fmt(num('kp') || 1) +
      ' alone stops ' + fmt(100 * m.ess, 1) + '% short. Overshoot and settling time can pass with P; the error line needs Ki.',
  );
};

// ---------------------------------------------------------------- rounds
function drawSession() {
  const avg = session.rounds ? Math.round(session.total / session.rounds) : 0;
  const item = (label, value) => '<span class="metric-item">' + label + '<strong>' + value + '</strong></span>';
  el('session').innerHTML = item('Rounds', session.rounds) + item('Average', session.rounds ? avg : '–') + item('Best', session.rounds ? session.best : '–') + item('Three-star rounds', session.perfect);
  el('rank').textContent = !session.rounds ? 'Tuner in training' : avg >= 90 ? 'Control engineer' : avg >= 70 ? 'Steady tuner' : avg >= 40 ? 'Getting there' : 'Tuner in training';
}
function closeRound() {
  if (round && best !== null && !practice) {
    session.rounds++;
    session.total += best;
    session.best = Math.max(session.best, best);
    if (best === 100 && tests <= FREE_TESTS) session.perfect++;
    stored('encs-p4-session', JSON.stringify(session));
  }
}
function setSliders() {
  for (const [id, key] of [
    ['kp', 'Kp'],
    ['ki', 'Ki'],
    ['kd', 'Kd'],
  ]) {
    const max = round.ranges[key];
    el(id).max = max;
    el(id).step = max >= 10 ? 0.05 : 0.01;
    const exact = document.querySelector('input[data-slider="' + id + '"]');
    if (exact) {
      exact.max = max;
      exact.step = el(id).step;
    }
    const hint = el(id + '-exact-range');
    if (hint) hint.textContent = 'Range: 0 – ' + max;
  }
  preset({ kp: 1, ki: 0, kd: 0 }); // start from P only, as the lecture does
  ['kp', 'ki', 'kd'].forEach((id) => (el(id + 'Value').textContent = fmt(num(id))));
}
function startRound() {
  closeRound();
  round = newRound(level);
  tests = 0;
  best = null;
  revealed = false;
  pastRuns = [];
  hintStep = 0;
  practice = el('live').checked;
  el('roundTitle').textContent = 'Hidden plant · ' + LEVELS[level].label;
  el('levelNote').textContent = {
    easy: 'Easy: a first-order plant and a loose spec.',
    normal: 'Normal: first or second order, overshoot ≤ 10%, settle in half the time the plant takes on its own.',
    hard: 'Hard: a lightly damped second-order plant, overshoot ≤ 5%, and an actuator that saturates.',
  }[level];
  document.querySelectorAll('.level button').forEach((b) => b.setAttribute('aria-checked', b.dataset.level === level));
  el('actuatorNote').hidden = !LEVELS[level].limited;
  el('awWrap').hidden = !LEVELS[level].limited;
  el('actuatorNote').innerHTML = icon('bolt') + ' The actuator saturates: u stays between ' + round.spec.uMin + ' and ' + round.spec.uMax + ', like a PWM duty cycle. Keep anti-windup on.';
  el('hints').innerHTML = '';
  el('hintButton').disabled = false;
  el('revealButton').disabled = false;
  el('result').hidden = true;
  el('reveal').hidden = true;
  el('resultVerdict').hidden = true;
  el('predictResult').textContent = '';
  el('testCount').textContent = '';
  setSliders();
  drawTickets(null);
  drawBench();
  drawSession();
  if (practice) evaluate(false);
}
document.querySelectorAll('.level button').forEach(
  (b) =>
    (b.onclick = () => {
      level = b.dataset.level;
      startRound();
    }),
);
el('newRound').onclick = startRound;
el('nextRound').onclick = () => {
  startRound();
  el('mission').scrollIntoView({ behavior: 'smooth' });
};
window.addEventListener('palette', () => {
  if (!round) return;
  drawBench();
  if (!el('result').hidden) evaluate(false);
});

try {
  Object.assign(session, JSON.parse(stored('encs-p4-session') || '{}'));
} catch {
  /* a fresh session */
}
startRound();

// ---------------------------------------------------------------- navigation
// A module's nav item opens its page once the page is published; until then it
// opens the module cards on the Control hub (the same approach as P2).
for (const link of document.querySelectorAll('[data-module-page]')) {
  fetch(link.dataset.modulePage, { method: 'HEAD' })
    .then((r) => {
      if (r.ok) link.href = link.dataset.modulePage;
    })
    .catch(() => {});
}
