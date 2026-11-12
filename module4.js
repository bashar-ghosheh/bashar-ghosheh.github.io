// Module 4 · Guess the sensor (Ahmad AlSheikh)
// Page logic: rounds, drawing, hints, reveal and the session score.
// The maths (random sensor, noise, scoring) lives in sensor-game.js.
// Shared helpers used here (el, num, css, trace, plot, verdict, showRange,
// oncePerFrame, bindModel) are in module-assets/shared.js.
//
// Map to the homework sheet [HW §4]:
//   step 1 hidden random sensor + noise  → newRound()
//   step 2 plot one response             → drawBench()
//   step 3 user estimates                → identify(), hints, drawLogView()
//   step 4 reveal, overlay and score     → the 'submit' handler of estimateForm
//   step 5 "New sensor" + running score  → nextSensor(), updateScoreboard()

// What the user estimates in each kind of round:
// [parameter, label, smallest allowed, largest allowed, example]
const FIELDS = {
  step1: [['K', 'Static gain K', 0.1, 5, 1.5], ['tau', 'Time constant τ (s)', 0.01, 40, 0.8]],
  sine1: [['tau', 'Time constant τ (s)', 0.01, 40, 0.8]],
  step2: [['zeta', 'Damping ratio ζ', 0.01, 2, 0.4], ['wn', 'Natural frequency ωn (rad/s)', 0.1, 20, 3]]
};
const NAMES = { K: 'K', tau: 'τ (s)', zeta: 'ζ', wn: 'ωn (rad/s)' };
const KINDS = { step1: 'First-order step', sine1: 'First-order sine', step2: 'Second-order step' };
const TASKS = {
  step1: 'Estimate the static gain K and the time constant τ.',
  sine1: 'Estimate the time constant τ.',
  step2: 'This sensor has K = 1. Estimate the damping ratio ζ and the natural frequency ωn.'
};

// A real-world story for each kind: [what it is, where it stores energy]
const SCENES = {
  step1: [['a thermocouple dropped into hot oil', 'its heat capacity'],
          ['an IR distance sensor behind an RC filter', 'the capacitor'],
          ['a micromouse motor after a voltage step', 'the spinning rotor']],
  sine1: [['a thermometer in a room where the heater cycles on and off', 'its heat capacity'],
          ['a light sensor with an RC filter under a flickering lamp', 'the capacitor']],
  step2: [['an accelerometer after a sudden push', 'the mass and the spring'],
          ['a spring scale with a weight dropped on it', 'the mass and the spring'],
          ['a series RLC circuit switched on', 'the inductor and the capacitor']]
};

// [HW §4] "Show a short hint on request, for example: Overshoot depends only on ζ."
// Hints are shown one at a time, from a gentle nudge to the full method.
const HINTS = {
  step1: [
    'For a unit step, the level where the curve flattens out is K. Lay the ruler through the middle of the noisy dots.',
    'τ is the time when the curve reaches 63.2% of that final level. Multiply your K by 0.632, move the ruler there and read the crossing time.',
    'Cross-check: at 3τ the curve should be at 95%. Or use the log method view below: its slope is −1/τ.'
  ],
  sine1: [
    'The input amplitude is 1 and K = 1, so the height of the output peaks is the amplitude ratio M. Lay the ruler on the peaks.',
    'M = 1 / √(1 + (ωτ)²), so τ = √(1/M² − 1) / ω. Read ωτ from this table, then divide by the stated ω.' +
      '<div class="table-scroll"><table><tr><th>M</th><td>0.70</td><td>0.60</td><td>0.50</td><td>0.45</td><td>0.40</td><td>0.35</td></tr>' +
      '<tr><th>ωτ</th><td>1.02</td><td>1.33</td><td>1.73</td><td>1.98</td><td>2.29</td><td>2.68</td></tr></table></div>',
    'Cross-check with the delay Δt from an input peak to the next output peak: τ = tan(ω · Δt) / ω, with the angle in radians.'
  ],
  step2: [
    'Overshoot depends only on ζ. Measure how far the first peak rises above the final value of 1.',
    'ζ = −ln(Mp) / √(π² + ln²Mp), with the overshoot Mp as a fraction. Or read it from this table.' +
      '<div class="table-scroll"><table><tr><th>Overshoot</th><td>60%</td><td>50%</td><td>40%</td><td>30%</td><td>20%</td><td>15%</td><td>10%</td></tr>' +
      '<tr><th>ζ</th><td>0.16</td><td>0.22</td><td>0.28</td><td>0.36</td><td>0.46</td><td>0.52</td><td>0.59</td></tr></table></div>',
    'The time of the first peak gives the speed: ωn = π / (tp · √(1 − ζ²)).'
  ]
};

// Set a button's text together with its icon (icon() comes from module-assets/icons.js).
function label(id, iconName, text) {
  el(id).innerHTML = icon(iconName) + text;
}

// ---- State of the current round and of the whole session ----
let sensor, data, scene;                   // hidden sensor, its noisy readings, its story
let identified, guess, result, hintsShown; // progress inside the round
let shown = 0, sweepFrame;                 // how many readings are on screen yet
const session = { cases: 0, rounds: 0, points: 0, perfect: 0, typeAsked: 0, typeRight: 0 };

// ---- Start a round ----  [HW §4, step 1]
function newRound() {
  sensor = newSensor();
  data = measure(sensor);
  scene = SCENES[sensor.kind][Math.floor(Math.random() * SCENES[sensor.kind].length)];
  guess = null; result = null; hintsShown = 0;
  session.cases++;
  el('caseTitle').textContent = 'Mystery sensor ' + session.cases;

  // Put the page back to its "nothing revealed" state.
  for (const id of ['reveal', 'verdict', 'identifyResult']) el(id).hidden = true;
  el('hints').replaceChildren();
  el('hintButton').disabled = false; label('hintButton', 'bulb', 'Show a hint');
  el('lock').disabled = false; label('lock', 'lock', 'Lock in my estimate');
  for (const id of ['unknown-query', 'logView-query']) if (el(id)) el(id).value = '';
  setFields();
  setRuler();

  if (sensor.kind === 'sine1') {
    // A steady sine cannot show the order, so this round states it.
    identified = true;
    el('briefing').textContent = 'This is ' + scene[0] + ': a first-order sensor with K = 1. The input is x(t) = sin(ωt) with ω = ' +
      sensor.omega + ' rad/s, and the start-up transient has died away.';
  } else {
    identified = false;
    el('briefing').textContent = 'A unit step (0 → 1) hits the sensor at t = 0. The dots are its noisy readings.';
  }
  el('identifyCard').hidden = identified;
  el('identify').hidden = false;
  el('estimateCard').hidden = !identified;
  startSweep();
}

// Draw the readings from left to right, like an oscilloscope taking the measurement.
function startSweep() {
  cancelAnimationFrame(sweepFrame);
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  shown = still ? data.times.length : 0;
  function step() {
    shown = Math.min(shown + 6, data.times.length);
    drawBench();
    if (shown < data.times.length) sweepFrame = requestAnimationFrame(step);
  }
  step();
}

// Label the estimate boxes for this kind of sensor. Sine rounds use one box.
function setFields() {
  el('task').textContent = TASKS[sensor.kind];
  ['first', 'second'].forEach((id, i) => {
    const field = FIELDS[sensor.kind][i];
    el(id).value = '';
    el(id).disabled = !field;                 // a disabled box is skipped by the form
    if (id === 'second') el('secondWrap').hidden = !field;
    if (!field) return;
    el(id + 'Label').textContent = field[1];
    el(id).min = field[2]; el(id).max = field[3];
    showRange(el(id), field[4]);              // shared helper: range hint and example
  });
}

// Fit the level ruler to this curve.
function setRuler() {
  // Leave 15% of headroom. A sine round must also show the whole input (amplitude 1).
  const highest = sensor.kind === 'sine1' ? 1 : Math.max(...data.values);
  const top = Number((1.15 * highest).toFixed(2));
  const bottom = sensor.kind === 'sine1' ? -top : 0;
  el('cursor').min = bottom; el('cursor').max = top; el('cursor').step = 0.002;
  el('cursor').value = 0;
  showRange(el('cursor'), 0);
}

// ---- Drawing ----  [HW §4, step 2]
function dots(x, y, name) {
  return { ...trace(x, y, name), mode: 'markers', marker: { size: 5, color: css('muted') } };
}

function drawBench() {
  const level = num('cursor'), top = Number(el('cursor').max), bottom = Number(el('cursor').min);
  el('cursorValue').textContent = level.toFixed(3);
  const t = data.times;
  const traces = [dots(t.slice(0, shown), data.values.slice(0, shown), 'Readings')];
  if (sensor.kind === 'sine1') {
    traces.push(trace(t, t.map(time => Math.sin(sensor.omega * time)), 'Input x(t)', 'target'));
  }
  if (guess) {
    // [HW §4, step 4] "overlays the true curve on the guess".
    // After the reveal: the user's sensor (dashed) under the true one (solid).
    const mine = { ...sensor, ...guess };
    traces.push(trace(t, t.map(time => sensorOutput(mine, time)), 'Your estimate', 'input'));
    traces.push(trace(t, t.map(time => sensorOutput(sensor, time)), 'True sensor', 'output'));
  }
  const ruler = { type: 'line', xref: 'paper', x0: 0, x1: 1, y0: level, y1: level,
    line: { color: css('point3'), dash: 'dash', width: 1.5 } };
  plot('unknown', traces, { title: 'Time (s)', range: [-0.03 * sensor.tEnd, 1.03 * sensor.tEnd] },
    { title: 'Sensor output', range: [bottom - 0.05 * top, top] },
    { shapes: [ruler], legend: { orientation: 'h', y: 1.02, yanchor: 'bottom' }, margin: { l: 54, r: 16, t: 56, b: 48 } });
  drawLogView();
}

// [HW §4, step 3] "the log method from the lecture (ln of the error fraction
// against t is a line with slope −1/τ)". Module 1 draws the same line.
// Log method (first-order step only): ln(1 − y/K) is a line with slope −1/τ.
function drawLogView() {
  const show = sensor.kind === 'step1' && identified;
  el('logCard').hidden = !show;
  if (!show) return;
  const K = num('first');                      // the user's K (not a number while the box is empty)
  const times = [], logs = [];
  for (let i = 0; i < data.times.length && K > 0; i++) {
    const left = 1 - data.values[i] / K;       // fraction of the change still to go
    if (left < 0.1) break;                     // later readings are mostly noise
    times.push(data.times[i]); logs.push(Math.log(left));
  }
  const ready = times.length >= 2;
  el('logNote').hidden = ready; el('logView').hidden = !ready;
  if (ready) plot('logView', [dots(times, logs, 'ln(1 − y/K)')], { title: 'Time (s)' }, { title: 'ln(1 − y/K)' });
}

// ---- Step 1: first order or second order? ----
// [NOTES §1.1] "Number of state variables = number of independent energy stores
// = order". The feedback names the energy stores of the sensor.
function identify(order) {
  const right = order === sensor.order;
  session.typeAsked++;
  if (right) session.typeRight++;
  identified = true;
  const why = sensor.order === 1
    ? 'The curve climbs to its final level and never goes above it. It is first order: one energy store ('
    : 'The curve overshoots its final level and rings, which a first-order sensor can never do. It is second order: two energy stores (';
  verdict('identifyResult', right ? 'good' : 'warn',
    (right ? 'Correct. ' : 'Not this time. ') + why + scene[1] + '). This one is ' + scene[0] + '.');
  el('identifyResult').hidden = false;
  el('identify').hidden = true;
  el('estimateCard').hidden = false;
  updateScoreboard();
  drawLogView();
}
el('pickFirst').onclick = () => identify(1);
el('pickSecond').onclick = () => identify(2);

// ---- Step 2: hints on request ----
el('hintButton').onclick = () => {
  const list = HINTS[sensor.kind];
  const item = document.createElement('li');
  item.innerHTML = list[hintsShown];
  el('hints').append(item);
  hintsShown++;
  label('hintButton', 'bulb', hintsShown < list.length ? 'Show another hint' : 'No more hints');
  el('hintButton').disabled = hintsShown === list.length;
};

// ---- Step 3: lock in, score and reveal ----  [HW §4, step 4]
function readGuess() {
  const values = {};
  FIELDS[sensor.kind].forEach((field, i) => { values[field[0]] = num(i === 0 ? 'first' : 'second'); });
  return values;
}

el('estimateForm').addEventListener('submit', event => {
  event.preventDefault();
  if (result) return;                           // one scored guess per sensor
  guess = readGuess();
  result = scoreGuess(sensor, guess);
  session.rounds++;
  session.points += result.total;
  if (result.total === 100) { session.perfect++; celebrate(); }
  shown = data.times.length;                    // show every reading for the reveal
  cancelAnimationFrame(sweepFrame);

  el('resultRows').innerHTML = result.rows.map(row =>
    '<tr><td>' + NAMES[row.name] + '</td><td>' + row.guess + '</td><td>' + row.truth + '</td><td>' +
    row.error.toFixed(1) + '%</td><td>' + row.points + '</td></tr>').join('');
  el('solution').innerHTML = workedSolution(sensor).map(line => '<li>' + line + '</li>').join('');
  const kind = result.total === 100 ? 'good' : result.total >= 50 ? 'warn' : 'bad';
  const comment = result.total === 100 ? 'Full marks: every estimate is within 10%.'
    : result.total >= 50 ? 'Close. Compare your dashed curve with the solid true curve.'
    : 'Far off this time. See below how to read this curve.';
  verdict('verdict', kind, 'Round score ' + result.total + ' / 100. ' + comment);
  el('verdict').hidden = false;
  el('reveal').hidden = false;
  el('lock').disabled = true; label('lock', 'lock', 'Estimate locked');

  const chip = document.createElement('span');
  chip.textContent = session.cases + ' · ' + KINDS[sensor.kind] + ' · ' + result.total;
  el('history').append(chip);
  updateScoreboard();
  drawBench();
  el('unknown').scrollIntoView({ behavior: 'smooth', block: 'center' });
});

// Typing in the estimate boxes redraws the log view. After the reveal it also
// moves the dashed curve, so the user can explore (the score stays locked).
const onEstimateInput = oncePerFrame(() => {
  if (result) {
    const values = readGuess();
    if (Object.values(values).every(value => value > 0)) guess = values;
  }
  drawBench();
});
el('first').addEventListener('input', onEstimateInput);
el('second').addEventListener('input', onEstimateInput);

// Full marks: a short shower of confetti in the theme colours.
function celebrate() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const colors = [css('output'), css('target'), css('input'), css('point1')];
  for (let i = 0; i < 40; i++) {
    const piece = document.createElement('span');
    piece.className = 'confetti';
    piece.style.left = 100 * Math.random() + 'vw';
    piece.style.background = colors[i % colors.length];
    piece.style.animationDelay = 0.5 * Math.random() + 's';
    document.body.append(piece);
    setTimeout(() => piece.remove(), 2600);
  }
}

// ---- Session score ----  [HW §4, step 5] "Keep a running score for the session."
function updateScoreboard() {
  const average = session.rounds ? session.points / session.rounds : 0;
  el('rounds').textContent = session.rounds;
  el('average').textContent = session.rounds ? average.toFixed(0) + ' / 100' : '–';
  el('perfect').textContent = session.perfect;
  el('spotted').textContent = session.typeAsked ? session.typeRight + ' of ' + session.typeAsked : '–';
  el('rank').textContent = !session.rounds ? 'No rounds yet'
    : average >= 90 ? 'Rank: sensor detective'
    : average >= 75 ? 'Rank: bench engineer'
    : average >= 50 ? 'Rank: lab technician' : 'Rank: trainee';
}

function nextSensor() {
  newRound();
  el('caseTitle').scrollIntoView({ behavior: 'smooth', block: 'center' });
}
el('newSensor').onclick = nextSensor;
el('nextSensor').onclick = nextSensor;

// ---- Start ----
newRound();
updateScoreboard();
bindModel(['cursor'], drawBench);   // ruler slider and light/dark switch both redraw the plot
