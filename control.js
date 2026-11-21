// Control hub (Homework 2): block diagram, live demo, validation board (Ahmad AlSheikh)
// Reference tags used in the comments of this project:
//   [HW2 §x]   = Homework 2 sheet (PID Control Toolkit), section x
//   [SLIDES n] = lecture slides "Static and Dynamic Characteristics", slide n
// All numbers on this page come from pid-core.js, the simulator every Control module uses.

// ---------------------------------------------------------------- three numbers
// [HW2 §1] Kp = 9 on K/(τs+1), K = 1, τ = 1 s: τcl = 0.1 s (10× faster), 10% short.
// Count up once when the strip scrolls into view.
(function countUp() {
  const items = document.querySelectorAll('.stat b[data-count]');
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const run = (b) => {
    const end = Number(b.dataset.count),
      start = end === 0 ? 100 : 0, // "0%" counts down from 100 to make the point
      t0 = performance.now();
    const tick = (now) => {
      const k = Math.min(1, (now - t0) / 1100),
        ease = 1 - Math.pow(1 - k, 3);
      b.textContent = Math.round(start + (end - start) * ease) + b.dataset.suffix;
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const seen = new IntersectionObserver((entries) => {
    for (const e of entries)
      if (e.isIntersecting) {
        run(e.target);
        seen.unobserve(e.target);
      }
  });
  items.forEach((b) => seen.observe(b));
})();

// ---------------------------------------------------------------- block diagram
const BLOCKS = {
  setpoint: {
    icon: 'flag',
    title: 'Setpoint r',
    text: 'What we want the output to be. Every module applies it as a step, from 0 to r, and measures how the loop follows.',
    math: 'r(t) = r for t ≥ 0',
    modules: [['P1', 'control-p1.html']],
  },
  sum: {
    icon: 'eye',
    title: 'Error e = r − y_m',
    text: 'The loop compares the target with what the sensor reports, not with the true output. If the sensor is late, the error is wrong.',
    math: 'e = r − y_m',
    modules: [['P2', 'control-p2.html']],
  },
  pid: {
    icon: 'sliders',
    title: 'PID controller',
    text: 'Turns the error into a command: P pushes on the present error, I on the past (the sum), D on the future (the slope). On an Arduino it runs once every Ts.',
    math: 'u = Kp·e + Ki·∫e dt + Kd·de/dt',
    modules: [
      ['P1', 'control-p1.html'],
      ['P3', 'control-p3.html'],
      ['P4', 'control-p4.html'],
    ],
  },
  limit: {
    icon: 'bolt',
    title: 'Control-signal limit',
    text: 'A real actuator saturates: a PWM duty cycle cannot go past 100%. While u is stuck at the limit, the integral keeps growing (wind-up) unless we stop it.',
    math: 'u = clamp(u_raw, u_min, u_max)',
    modules: [
      ['P1', 'control-p1.html'],
      ['P3', 'control-p3.html'],
      ['My system', 'control-system.html'],
    ],
  },
  plant: {
    icon: 'motor',
    title: 'Plant',
    text: 'The thing we control. First order K/(τs + 1) from Module 1, or second order from Module 3. In P4 its numbers are hidden, and in My system it is our micromouse motor.',
    math: 'τ·y′ + y = K·u',
    modules: [
      ['P1', 'control-p1.html'],
      ['P4', 'control-p4.html'],
      ['My system', 'control-system.html'],
    ],
  },
  sensor: {
    icon: 'thermometer',
    title: 'Sensor in the feedback path',
    text: 'The first-order sensor from the Dynamic Characteristics Toolkit. A slow sensor (large τs) reports the past, so the controller keeps pushing after the output has arrived. Result: overshoot, then oscillation.',
    math: 'τs·y_m′ + y_m = y',
    modules: [['P2', 'control-p2.html']],
  },
};
function showBlock(key) {
  const b = BLOCKS[key];
  document.querySelectorAll('#loop .blk').forEach((g) => g.classList.toggle('on', g.dataset.key === key));
  const box = el('blockInfo');
  box.innerHTML =
    '<span class="badge-icon">' + icon(b.icon) + '</span><h3>' + b.title + '</h3><p>' + b.text + '</p>' +
    '<p class="chips"><code>' + b.math + '</code>' +
    b.modules.map(([name, href]) => '<a href="' + href + '">' + name + ' →</a>').join('') + '</p>';
  box.style.animation = 'none';
  void box.offsetWidth; // restart the pop animation
  box.style.animation = '';
}
document.querySelectorAll('#loop .blk').forEach((g) => {
  g.addEventListener('click', () => showBlock(g.dataset.key));
  g.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      showBlock(g.dataset.key);
    }
  });
});
showBlock('pid');

// ---------------------------------------------------------------- live demo
// Plant: K = 1, ζ = 0.7, ωn = 2 rad/s (second order, Module 3).
// The four steps follow [HW2 §1]: P makes it faster but leaves an error,
// I removes the error, D calms the overshoot that follows.
const demoPlant = secondOrder(1, 0.7, 2);
const STEPS = [
  { kp: 0, ki: 0, kd: 0, text: 'No controller. The plant just receives the step. It gets there, but it needs about 3 s.' },
  { kp: 6, ki: 0, kd: 0, text: 'P only, Kp = 6. Much faster, but it overshoots and stops short: P needs an error to keep pushing.' },
  { kp: 6, ki: 4, kd: 0, text: 'Add I, Ki = 4. The error is gone, because the integral keeps growing until it is zero. The price is a big overshoot.' },
  { kp: 6, ki: 4, kd: 1.2, text: 'Add D, Kd = 1.2. The brake. Overshoot drops to about 6% and it settles in about half the open-loop time.' },
];
// Open-loop step response of the plant (no feedback), for comparison.
const openLoop = (() => {
  const t = [],
    y = [];
  let x = [0, 0];
  for (let k = 0; k <= 6000; k++) {
    t.push(k / 1000);
    y.push(x[0]);
    x = rk4((s) => demoPlant.deriv(s, 1), x, 0.001);
  }
  return { t, y };
})();
// Keep every 20th sample for plotting (0.02 s apart); metrics use all samples.
const thin = (a) => a.filter((_, i) => i % 20 === 0);
function setStep(i) {
  const s = STEPS[i];
  el('kp').value = s.kp;
  el('ki').value = s.ki;
  el('kd').value = s.kd;
  syncParameterFields();
  drawDemo();
  markStep(i);
}
function markStep(i) {
  document.querySelectorAll('#stepper button').forEach((b) => b.setAttribute('aria-pressed', Number(b.dataset.step) === i));
  el('storyText').textContent =
    i === null ? 'Your own gains. Compare the curve and the four numbers with the table further down.' : STEPS[i].text;
}
function metricItem(label, value, cls = '') {
  return '<span class="metric-item ' + cls + '">' + label + '<strong>' + value + '</strong></span>';
}
function drawDemo() {
  const Kp = num('kp'),
    Ki = num('ki'),
    Kd = num('kd');
  el('kpValue').textContent = Kp.toFixed(1);
  el('kiValue').textContent = Ki.toFixed(1);
  el('kdValue').textContent = Kd.toFixed(2);
  const off = Kp === 0 && Ki === 0 && Kd === 0;
  // With all gains at zero the loop does nothing, so show the open-loop plant.
  const run = off ? openLoop : simulate({ plant: demoPlant, Kp, Ki, Kd, T: 6 });
  const m = loopMetrics(run.t, run.y);
  const curves = [
    trace([0, 6], [1, 1], 'Target r', 'input'),
    { ...trace(thin(openLoop.t), thin(openLoop.y), 'No controller', 'output'), line: { color: css('muted'), dash: 'dash', width: 2 }, opacity: 0.7 },
  ];
  if (!off) curves.push(trace(thin(run.t), thin(run.y), 'Closed loop y', 'output'));
  Plotly.react(
    'demoPlot',
    curves,
    {
      paper_bgcolor: css('surface'),
      plot_bgcolor: css('surface'),
      font: { color: css('text') },
      margin: { l: 54, r: 16, t: 16, b: 48 },
      legend: { orientation: 'h', y: -0.24 },
      xaxis: { title: 'Time t (s)', gridcolor: css('edge'), zerolinecolor: css('muted'), range: [0, 6] },
      yaxis: { title: 'Output y', gridcolor: css('edge'), zerolinecolor: css('muted'), range: [0, Math.max(1.5, Math.min(2.2, Math.max(...run.y) * 1.08))] },
    },
    { responsive: true, displayModeBar: false },
  );
  const fmt = (v, unit) => (v === null ? '—' : v.toFixed(2) + unit);
  const openM = loopMetrics(openLoop.t, openLoop.y);
  el('demoMetrics').innerHTML =
    metricItem('Rise time', fmt(m.rise, ' s'), m.rise !== null && m.rise < openM.rise * 0.8 ? 'good-m' : '') +
    metricItem('Overshoot', m.overshoot.toFixed(1) + '%', m.overshoot > 20 ? 'bad-m' : m.overshoot <= 10 ? 'good-m' : '') +
    metricItem('Settling time (2%)', m.settled ? fmt(m.settle, ' s') : 'not settled', !m.settled ? 'bad-m' : m.settle < openM.settle * 0.8 ? 'good-m' : '') +
    metricItem('Steady-state error', (100 * m.ess).toFixed(1) + '%', Math.abs(m.ess) < 0.005 ? 'good-m' : 'bad-m');
}
document.querySelectorAll('#stepper button').forEach((b) => (b.onclick = () => setStep(Number(b.dataset.step))));
['kp', 'ki', 'kd'].forEach((id) =>
  el(id).addEventListener(
    'input',
    oncePerFrame(() => {
      drawDemo();
      const i = STEPS.findIndex((s) => s.kp === num('kp') && s.ki === num('ki') && s.kd === num('kd'));
      markStep(i < 0 ? null : i);
    }),
  ),
);
window.addEventListener('palette', drawDemo);
setStep(3);

// ---------------------------------------------------------------- predict, then check
// P only on a plant with K = 1: final value K·Kp/(1 + K·Kp) = 4/5 = 0.8.
el('predictForm').onsubmit = (e) => {
  e.preventDefault();
  const guess = num('guessFinal');
  if (Number.isNaN(guess)) return verdict('predictResult', 'warn', 'Type a number first, for example 0.5.');
  const run = simulate({ plant: demoPlant, Kp: 4, T: 10 });
  const final = loopMetrics(run.t, run.y).final;
  const close = Math.abs(guess - final) <= 0.02;
  verdict(
    'predictResult',
    close ? 'good' : 'warn',
    (close ? 'Right. ' : guess > final ? 'Too high. ' : 'Too low. ') +
      'Simulated final value: ' + final.toFixed(3) + '. P alone settles at Kp/(1 + Kp) = 4/5, so 20% short. ' +
      'Now press step 3 above and watch the integral close the gap.',
  );
  el('kp').value = 4;
  el('ki').value = 0;
  el('kd').value = 0;
  syncParameterFields();
  drawDemo();
  markStep(null);
};

// ---------------------------------------------------------------- module status
// Each card asks the server whether its page exists yet, and says "Live" or "Being built".
document.querySelectorAll('.control-grid .card[data-page]').forEach(async (card) => {
  const chip = card.querySelector('.live-chip');
  let live = false;
  try {
    live = (await fetch(card.dataset.page, { method: 'HEAD', cache: 'no-store' })).ok;
  } catch {
    live = false;
  }
  chip.textContent = live ? 'Live ✓' : 'Being built';
  chip.classList.add(live ? 'live' : 'soon');
  card.classList.toggle('soon', !live);
});

// ---------------------------------------------------------------- validation
// [HW2 §2.1] The three checks, computed by pid-core.js.
const checks = validationChecks();
el('checks').innerHTML = checks.map((c) => checkRow(c.id + ' · ' + c.title, c.expected, c.got, c.pass)).join('');
const passed = checks.filter((c) => c.pass).length;
el('checkSummary').className = 'readout ' + (passed === checks.length ? 'good' : 'bad');
el('checkSummary').textContent = passed + ' of ' + checks.length + ' checks pass.';

// ---------------------------------------------------------------- timeline
(function timeline() {
  const list = el('timeline'),
    items = [...list.children],
    today = new Date();
  let next = items.findIndex((li) => new Date(li.dataset.date + 'T23:59:59') >= today);
  if (next < 0) next = items.length;
  items.forEach((li, i) => {
    li.classList.toggle('past', i < next);
    li.classList.toggle('next', i === next);
  });
  const fill = document.createElement('div');
  fill.className = 'bar-fill';
  list.prepend(fill);
  // The line runs from the first dot to the last (75% of the width).
  requestAnimationFrame(() => (fill.style.width = (75 * Math.min(1, Math.max(0, next - 0.5) / (items.length - 1))) + '%'));
})();
el('guessFinal').placeholder = 'e.g. 0.5';
