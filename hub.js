// Hub page: the tea demo and the six validation checks (Ahmad AlSheikh)
// Reference tags used in the comments of this project:
//   [SLIDES n] = lecture slides "Static and Dynamic Characteristics", slide n
//   [NOTES §x] = State-Space Modeling notes (2026 edition), section x
//   [HW §x]    = Homework 1 sheet, section x


// Tea test: 20 °C air into 80 °C tea, τ = 10 s.
// [HW §1] and [NOTES §3.1, "Numbers"]: θ(t) = 80 − 60·e^(−t/10),
// so 57.9 °C after 10 s and 77.0 °C after 30 s.
function teaTest() {
  const t = num('teaTime');
  const done = 1 - Math.exp(-t / 10);            // fraction of the change completed
  const reading = 20 + 60 * done;
  el('teaTimeValue').textContent = t + ' s';
  el('teaFill').style.width = (100 * done) + '%';
  el('teaReading').textContent = 'After ' + t + ' s the thermometer reads ' + reading.toFixed(1) +
    ' °C. That is ' + (100 * done).toFixed(1) + '% of the way, and ' + (80 - reading).toFixed(1) + ' °C too low.';
}
el('teaTime').addEventListener('input', teaTest);
teaTest();

// Play button: run the first 60 seconds in about 6 seconds.
let teaFrame;
el('teaPlay').onclick = () => {
  cancelAnimationFrame(teaFrame);
  const start = performance.now();
  function tick(now) {
    const seconds = Math.min(60, (now - start) / 100);   // 100 ms of real time = 1 s of tea time
    el('teaTime').value = Math.round(seconds);
    el('teaTime').dispatchEvent(new Event('input'));     // also updates the "Exact value" box
    if (seconds < 60) teaFrame = requestAnimationFrame(tick);
  }
  teaFrame = requestAnimationFrame(tick);
};

// Highlight the cards of modules the student has marked complete.
function showCompleted() {
  for (let n = 1; n <= 4; n++) {
    el('status' + n).closest('.card').classList.toggle('done', stored('encs-done-' + n) === 'yes');
  }
}
window.addEventListener('pageshow', showCompleted);
showCompleted();

// [HW §3.2] Validation checks 1–6. Each row: name, expected text, calculated text, pass?
// The values come from the modules' own formula files (frequency.js, second-order.js).
function validationRows() {
  const deg = radians => radians * 180 / Math.PI;
  const atTau = 1 - Math.exp(-1), at3Tau = 1 - Math.exp(-3);
  const lecture = response(0.2, 2);                       // Module 2 formula
  const tauMax = tauLimit(100, 0.05);
  const lag50 = -deg(response(tauMax, angularFrequency(50)).phase);
  const under = metrics(samples(0.5, 2)), critical = metrics(samples(1, 2));  // Module 3 formulas
  const eigenvalues = eigen(1, 2, 4), transferPoles = poles(0.5, 2);
  const same = eigenvalues.every((e, i) => e[0] === transferPoles[i][0] && e[1] === transferPoles[i][1]);
  return [
    ['1 · First-order step', '0.632 KA at τ, 0.950 KA at 3τ', atTau.toFixed(3) + ' KA, ' + at3Tau.toFixed(3) + ' KA',
      atTau.toFixed(3) === '0.632' && at3Tau.toFixed(3) === '0.950'],
    ['2 · τ = 0.2 s, input sin 2t', 'amplitude 0.93, lag 21.8°', lecture.ratio.toFixed(2) + ', ' + (-deg(lecture.phase)).toFixed(1) + '°',
      lecture.ratio.toFixed(2) === '0.93' && (-deg(lecture.phase)).toFixed(1) === '21.8'],
    ['3 · 100 Hz with 5% error', 'τ max 0.52 ms, lag 9.3° at 50 Hz', (1000 * tauMax).toFixed(2) + ' ms, ' + lag50.toFixed(1) + '°',
      (1000 * tauMax).toFixed(2) === '0.52' && lag50.toFixed(1) === '9.3'],
    ['4 · Second order, ζ = 0.5', 'overshoot 16.3%', under.overshoot.toFixed(1) + '%', under.overshoot.toFixed(1) === '16.3'],
    ['5 · Second order, ζ = 1', 'no overshoot', critical.overshoot === 0 ? 'no overshoot' : critical.overshoot.toFixed(2) + '%', critical.overshoot === 0],
    ['6 · State space m = 1, b = 2, k = 4', 'eigenvalues −1 ± j1.732 = poles',
      '−' + Math.abs(eigenvalues[0][0]).toFixed(0) + ' ± j' + eigenvalues[0][1].toFixed(3) + (same ? ' = poles' : ' ≠ poles'),
      same && eigenvalues[0][0] === -1 && eigenvalues[0][1].toFixed(3) === '1.732']
  ];
}
const rows = validationRows();
el('checks').innerHTML = rows.map(row => checkRow(...row)).join('');
const passed = rows.filter(row => row[3]).length;
el('checkSummary').className = 'readout ' + (passed === 6 ? 'good' : 'bad');
el('checkSummary').textContent = passed + ' of 6 checks pass.';
