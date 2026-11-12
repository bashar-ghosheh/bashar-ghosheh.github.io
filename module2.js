// Module 2 · First-order frequency response: the page (Amro Qutna)
// The formulas are in frequency.js. Shared helpers are in module-assets/shared.js.

const degrees = (radians) => (radians * 180) / Math.PI;
// [HW §3, Module 2] Input and output sines on one plot.
function drawWaves(omega, sensor) {
  // Show three complete periods at every frequency.
  const period = (2 * Math.PI) / omega;
  const times = Array.from({ length: 361 }, (_, i) => (3 * period * i) / 360);
  plot(
    'waves',
    [
      trace(
        times,
        times.map((t) => Math.sin(omega * t)),
        'Input',
        'input',
      ),
      trace(
        times,
        times.map((t) => wave(t, omega, sensor)),
        'Sensor output',
        'output',
      ),
    ],
    { title: 'Time (s)' },
    { title: 'Amplitude', range: [-1.15, 1.15] },
  );
}

// [HW §3, Module 2] Bode plot (magnitude and phase) with the cutoff at ω = 1/τ.
function drawBode(tau, omega, sensor) {
  // A fixed logarithmic sweep covers both slider ranges and their cutoffs.
  const frequencies = Array.from({ length: 301 }, (_, i) => 10 ** (-2 + i / 60));
  frequencies.push(sensor.cutoff, omega);
  frequencies.sort((a, b) => a - b);
  const sweep = frequencies.map((w) => response(tau, w));
  const axes = { title: 'Angular frequency ω (rad/s)', type: 'log', dtick: 1 };
  function panel(id, values, selected, title) {
    plot(
      id,
      [
        trace(frequencies, values, title, 'input'),
        {
          x: [omega],
          y: [selected],
          mode: 'markers',
          name: 'Selected input',
          marker: { size: 10, color: css('output') },
        },
      ],
      axes,
      { title },
      {
        showlegend: false,
        shapes: [
          {
            type: 'line',
            x0: sensor.cutoff,
            x1: sensor.cutoff,
            yref: 'paper',
            y0: 0,
            y1: 1,
            line: { color: css('muted'), dash: 'dot' },
          },
        ],
      },
    );
  }
  panel(
    'magnitude',
    sweep.map((r) => r.db),
    sensor.db,
    'Magnitude (dB)',
  );
  panel(
    'angle',
    sweep.map((r) => degrees(r.phase)),
    degrees(sensor.phase),
    'Phase (°)',
  );
}

// [HW §8, bonus] Two sines added together, and how the sensor distorts them.
function drawMixture() {
  const tau = el('tau').valueAsNumber;
  const omega = el('omega').valueAsNumber;
  const harmonic = el('harmonic').valueAsNumber;
  const amplitude = el('ripple').valueAsNumber;
  el('harmonicValue').textContent = harmonic + ' × ω';
  el('rippleValue').textContent = amplitude.toFixed(2);
  const times = Array.from({ length: 1201 }, (_, i) => ((i / 1200) * 3 * 2 * Math.PI) / omega);
  const mix = twoTone(times, tau, omega, harmonic, amplitude);
  plot(
    'mixture',
    [trace(times, mix.input, 'Combined input', 'input'), trace(times, mix.output, 'Sensor output', 'output')],
    { title: 'Time (s)' },
    { title: 'Amplitude', range: [-2.1, 2.1] },
  );
  const retained = (w) => (100 * response(tau, w).ratio).toFixed(1) + '%';
  el('componentRatios').textContent =
    'The sensor retains ' +
    retained(omega) +
    ' of the base amplitude and ' +
    retained(harmonic * omega) +
    ' of the ripple amplitude.';
}
const updateMix = oncePerFrame(drawMixture);
for (const id of ['harmonic', 'ripple']) el(id).addEventListener('input', updateMix);

// Runs every time a slider moves: amplitude ratio, phase lag and dynamic error δ = M − 1.
function update() {
  const tau = el('tau').valueAsNumber;
  const omega = el('omega').valueAsNumber;
  const sensor = response(tau, omega);
  el('loss').className = 'readout ' + (sensor.ratio >= 0.95 ? 'good' : sensor.ratio > 0.707 ? 'warn' : 'bad');
  el('tauValue').textContent = tau.toFixed(2) + ' s';
  el('omegaValue').textContent = omega.toFixed(1) + ' rad/s';
  el('ratio').textContent = sensor.ratio.toFixed(4);
  el('phase').textContent = degrees(sensor.phase).toFixed(1) + '°';
  el('error').textContent = (100 * sensor.error).toFixed(2) + '%';
  el('loss').textContent =
    'The output amplitude is ' +
    (-100 * sensor.error).toFixed(2) +
    '% smaller than the input. A negative phase means the output peaks later.';
  el('cutoff').textContent = 'Dotted line · ωc = 1/τ = ' + sensor.cutoff.toFixed(2) + ' rad/s';
  el('guessForm').reset();
  el('feedback').textContent = '';
  drawWaves(omega, sensor);
  drawBode(tau, omega, sensor);
  drawMixture();
}

// [HW §3.2] Validation checks 2 and 3.
function showChecks() {
  const lecture = response(0.2, 2);
  const tau = tauLimit(100, 0.05);
  // Compare at the precision printed in the assignment.
  const rows = [
    ['sin(2t), τ = 0.2 s · amplitude ratio', lecture.ratio, 0.93, 2, ''],
    ['sin(2t), τ = 0.2 s · lag', -degrees(lecture.phase), 21.8, 1, '°'],
    ['100 Hz, 5% maximum loss · largest τ', 1000 * tau, 0.52, 2, ' ms'],
    ['50 Hz, same sensor · lag', -degrees(response(tau, angularFrequency(50)).phase), 9.3, 1, '°'],
  ];
  el('checks').innerHTML = rows
    .map(([name, actual, expected, digits, unit]) => {
      const pass = actual.toFixed(digits) === expected.toFixed(digits);
      return `<div class="check"><strong>${name}</strong><div>Expected: ${expected}${unit}</div>
      <div>Calculated: ${actual.toFixed(digits + 2)}${unit}</div>
      <span class="check-status ${pass ? 'pass' : 'fail'}">${pass ? 'PASS' : 'FAIL'}</span></div>`;
    })
    .join('');
}

// Predict, then check: what happens to M when the frequency doubles?
el('guessForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const target = response(el('tau').valueAsNumber, 2 * el('omega').valueAsNumber).ratio * 100;
  const close = Math.abs(el('guess').valueAsNumber - target) <= 1;
  el('feedback').textContent =
    (close
      ? 'Within one percentage point. '
      : el('guess').valueAsNumber > target
        ? 'Too high. '
        : 'Too low. ') +
    'At twice the frequency the output retains ' +
    target.toFixed(2) +
    '% of the input amplitude. Increasing ωτ reduces M.';
});

showChecks();
el('lecture').onclick = () => preset({ tau: 0.2, omega: 2 });
el('atCut').onclick = () => preset({ tau: 0.2, omega: 5 });
bindModel(['tau', 'omega'], update);
formula('waveLaw', String.raw`y(t)=M\sin(\omega t+\phi)`);
formula('bodeLaw', String.raw`M=(1+(\omega\tau)^2)^{-1/2},\quad \phi=-\arctan(\omega\tau)`);
