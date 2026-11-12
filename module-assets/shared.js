// Helpers shared by every page: element access, plotting, formulas, validation
// cards, predict-then-check, light/dark theme and module progress.

const el = (id) => document.getElementById(id);
const num = (id) => el(id).valueAsNumber;
const css = (name) =>
  getComputedStyle(document.documentElement)
    .getPropertyValue('--' + name)
    .trim();
// Run fn at most once per screen frame, so dragging a slider stays smooth.
function oncePerFrame(fn) {
  let pending = false;
  return () => {
    if (!pending) {
      pending = true;
      requestAnimationFrame(() => {
        pending = false;
        fn();
      });
    }
  };
}
// One Plotly line. role picks the colour and dash: 'output', 'input' or 'target'.
function trace(x, y, name, role = 'output') {
  return {
    x,
    y,
    name,
    mode: 'lines',
    line: {
      color: css(role),
      dash: role === 'input' ? 'dash' : role === 'target' ? 'dot' : 'solid',
      width: 2.5,
    },
  };
}
// Draw (or redraw) a Plotly chart in the element with this id, in the theme colours.
// It also attaches the "Inspect" graph reader from graph-reader.js.
function plot(id, traces, xaxis, yaxis, extra = {}) {
  const axis = { gridcolor: css('edge'), zerolinecolor: css('muted'), automargin: true };
  const marks = graphReader(id, traces, xaxis, yaxis, () => plot(id, traces, xaxis, yaxis, extra));
  Plotly.react(
    id,
    [...traces, marks],
    {
      paper_bgcolor: css('surface'),
      plot_bgcolor: css('surface'),
      font: { color: css('text') },
      margin: { l: 54, r: 16, t: 16, b: 48 },
      legend: { orientation: 'h', y: -0.26 },
      ...extra,
      xaxis: { ...axis, ...xaxis },
      yaxis: { ...axis, ...yaxis },
    },
    { responsive: true, displayModeBar: false },
  );
}
// Render a LaTeX formula with KaTeX.
function formula(id, tex) {
  katex.render(tex, el(id), { throwOnError: false });
}
// One validation card: name, expected value, calculated value, PASS or FAIL.  [HW §3.2]
function checkRow(name, expected, actual, pass) {
  return (
    '<div class="check"><strong>' +
    name +
    '</strong><span>Expected: ' +
    expected +
    '</span><span>Calculated: ' +
    actual +
    '</span><b class="check-status ' +
    (pass ? 'pass' : 'fail') +
    '">' +
    (pass ? 'PASS' : 'FAIL') +
    '</b></div>'
  );
}
// Call draw() now, whenever one of these inputs changes, and when the theme changes.
function bindModel(ids, draw) {
  const update = oncePerFrame(draw);
  ids.forEach((id) => el(id).addEventListener('input', update));
  window.addEventListener('palette', update);
  draw();
}
// Set several sliders at once (preset buttons).
function preset(values) {
  for (const [id, value] of Object.entries(values)) el(id).value = value;
  syncParameterFields();
  el(Object.keys(values)[0]).dispatchEvent(new Event('input'));
}
// "Predict, then check" box: compare the user's estimate with the true target.
function prediction(target, reason) {
  el('predict').onsubmit = (e) => {
    e.preventDefault();
    const actual = target(),
      guess = num('estimate');
    const close = Math.abs(guess - actual) <= Math.max(0.01, Math.abs(actual) * 0.05);
    verdict(
      'result',
      close ? 'good' : 'warn',
      (close ? 'Within tolerance. ' : guess > actual ? 'Too high. ' : 'Too low. ') +
        'Calculated: ' +
        actual.toFixed(3) +
        '. ' +
        reason(),
    );
  };
}
// Show a coloured message: kind is 'good', 'warn' or 'bad'.
function verdict(id, kind, text) {
  el(id).className = 'readout ' + kind;
  el(id).textContent = text;
}
const page = Number(document.body.dataset.module);
function syncTheme() {
  el('theme').textContent = document.documentElement.dataset.theme === 'dark' ? 'Light mode' : 'Dark mode';
}
el('theme').onclick = () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  stored('encs-theme', next);
  syncTheme();
  window.dispatchEvent(new Event('palette'));
};
syncTheme();
if (page) {
  function completion(done) {
    el('complete').textContent = done ? 'Completed ✓ · Undo' : 'Mark module complete';
    el('complete').setAttribute('aria-pressed', done);
  }
  completion(stored('encs-done-' + page) === 'yes');
  el('complete').onclick = () => {
    const done = el('complete').getAttribute('aria-pressed') !== 'true';
    stored('encs-done-' + page, done ? 'yes' : 'no');
    completion(done);
  };
} else {
  function progress() {
    const done = [1, 2, 3, 4].filter((n) => stored('encs-done-' + n) === 'yes');
    el('progress').value = done.length;
    el('count').textContent = done.length + ' of 4 complete';
    for (let n = 1; n <= 4; n++)
      el('status' + n).textContent = done.includes(n) ? 'Completed ✓' : 'Ready to explore';
  }
  window.addEventListener('pageshow', progress);
  progress();
}

function syncParameterFields() {
  document.querySelectorAll('input[data-slider]').forEach((input) => {
    if (document.activeElement !== input) input.value = el(input.dataset.slider).value;
  });
}
for (const slider of document.querySelectorAll('input[type=range]')) {
  if (slider.id === 'cursor') continue;
  const input = document.createElement('input');
  input.type = 'number';
  input.dataset.slider = slider.id;
  for (const key of ['min', 'max', 'step', 'value']) input[key] = slider[key];
  const label = document.createElement('label');
  label.className = 'parameter-entry';
  label.append('Exact value', input);
  input.setAttribute('aria-label', 'Exact value for ' + slider.id);
  const sliderLabel = slider.closest('label');
  if (sliderLabel) {
    const control = document.createElement('div');
    sliderLabel.before(control);
    control.append(sliderLabel, label);
  } else {
    slider.after(label);
  }
  input.addEventListener('input', () => {
    if (input.value !== '' && input.validity.valid) {
      slider.value = input.value;
      slider.dispatchEvent(new Event('input'));
    }
  });
  input.addEventListener('blur', () => {
    input.value = slider.value;
  });
  slider.addEventListener('input', syncParameterFields);
}

// Show the allowed range under an input, and an example value inside it.
function showRange(field, example) {
  if (!field.id) field.id = field.dataset.slider + '-exact';
  let hint = el(field.id + '-range');
  if (!hint) {
    hint = document.createElement('small');
    hint.className = 'field-range';
    hint.id = field.id + '-range';
    field.after(hint);
    field.setAttribute('aria-describedby', hint.id);
  }
  hint.textContent = 'Range: ' + Number(field.min) + ' – ' + Number(field.max);
  if (field.type === 'number') field.placeholder = 'e.g. ' + example;
}

const estimate = el('estimate');
if (estimate) {
  // Largest allowed equilibrium change is K·A = 3·100 or F/k = 1/1.
  estimate.min = 0;
  estimate.max = page === 1 ? 300 : 1;
}
const examples = { amplitude: 2, estimate: page === 1 ? 0.6 : 0.4, guess: 75, first: 0.8, second: 1.2 };
for (const field of document.querySelectorAll('input[type=number],input[type=range]')) {
  showRange(field, examples[field.id] ?? field.value);
}
