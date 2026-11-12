// Coordinate readouts use the same plotted samples as the visible curves.
const graphExamples = {
  responsePlot:
    'Tea step: a 60 °C change with τ = 10 s gives a 37.9 °C rise after 10 s. For a unit ramp with τ = 1 s, the late-time gap is 1 unit.',
  errorPlot: 'At t = τ the log error is −1; at 3τ it is −3. Doubling τ halves the slope.',
  waves: 'With τ = 0.2 s and ω = 2 rad/s, the input peaks at 0.785 s. The sensor peaks about 0.190 s later.',
  magnitude:
    'For τ = 0.2 s, compare 0.5, 5 and 50 rad/s. Magnitude falls from about −0.04 dB to −3.01 dB and then −20.04 dB.',
  angle:
    'For τ = 0.2 s, those same three frequencies produce approximately −5.7°, −45° and −84.3° of phase shift.',
  mixture:
    'Try a ripple five times faster than the base sine. At τ = 0.2 s and ω = 2 rad/s, the sensor retains 92.8% of the base and 44.7% of the ripple.',
  step: 'With m = 1, b = 2 and k = 4, the 1 N step settles at 0.25 m. Its first peak is about 0.291 m.',
  poles: 'For m = 1, b = 2, k = 4 the two poles share real part −1. Increase b to 4 and they meet at −2.',
  path: 'With the underdamped preset, speed first rises from zero. At maximum displacement the mass stops momentarily before moving back.',
  unknown:
    'On a different sensor, if a unit step settles at 2 and reaches 1.264 after 0.8 s, estimate K = 2 and τ = 0.8 s.',
  logView: 'If the dots fall from 0 to −2 in 1.6 s, the slope is −1.25 per second, so τ = 1 / 1.25 = 0.8 s.',
};
function closest(values, target) {
  let best = 0;
  for (let i = 1; i < values.length; i++) {
    if (Math.abs(values[i] - target) < Math.abs(values[best] - target)) best = i;
  }
  return best;
}
function extremum(values, direction) {
  return values.reduce((best, y, i) => (direction * y > direction * values[best] ? i : best), 0);
}
function graphLandmarks(id, curve) {
  const { x, y } = curve;
  const at = (value) => closest(x, value);
  switch (id) {
    case 'responsePlot':
    case 'errorPlot':
      return [
        ['One τ', at(num('tau'))],
        ['Three τ', at(3 * num('tau'))],
      ];
    case 'magnitude':
    case 'angle':
      return [
        ['Cutoff', at(1 / num('tau'))],
        ['Input frequency', at(num('omega'))],
      ];
    case 'poles':
      return [
        ['Pole 1', 0],
        ['Pole 2', 1],
      ];
    case 'path':
      return [
        ['Fastest forward motion', extremum(y, 1)],
        ['End of trace', y.length - 1],
      ];
    case 'step': {
      const final = 1 / num('spring');
      const peak = extremum(y, 1);
      return [
        ['90% crossing', y.findIndex((v) => v >= 0.9 * final)],
        [y[peak] > final ? 'Peak' : 'End of trace', peak],
      ];
    }
    case 'unknown':
      return [
        ['Highest sample', extremum(y, 1)],
        ['Last sample', y.length - 1],
      ];
    case 'logView':
      return [
        ['First sample', 0],
        ['Last sample', y.length - 1],
      ];
    default:
      return [
        ['Highest output', extremum(y, 1)],
        ['Lowest output', extremum(y, -1)],
      ];
  }
}
function graphReader(id, traces, xaxis, yaxis, refresh) {
  const target = el(id);
  const curve = ['responsePlot', 'waves', 'mixture'].includes(id) ? traces[1] : traces[0];
  let field = el(id + '-query');
  if (!field) {
    const panel = document.createElement('section');
    panel.className = 'graph-tools';
    const example = document.createElement('p');
    example.textContent = 'Example · ' + graphExamples[id];
    const label = document.createElement('label');
    field = document.createElement('input');
    field.id = id + '-query';
    field.type = 'number';
    field.step = 'any';
    const quantity =
      id === 'poles' ? 'Pole number (1 or 2)' : id === 'path' ? 'Trajectory time (s)' : xaxis.title;
    label.append('Inspect ' + quantity + ' ', field);
    const values = document.createElement('div');
    values.id = id + '-values';
    values.className = 'point-values';
    values.setAttribute('aria-live', 'polite');
    panel.append(example, label, values);
    target.before(panel);
    field.addEventListener('input', () => field.redraw());
  }
  field.redraw = refresh;
  const domain = id === 'poles' ? [1, 2] : id === 'path' ? el('step').data[0].x : curve.x;
  field.min = domain[0];
  field.max = domain[domain.length - 1];
  if (id === 'poles') field.step = 1;
  showRange(field, id === 'poles' ? 2 : Number(domain[Math.floor(domain.length / 4)].toPrecision(5)));
  const points = graphLandmarks(id, curve);
  if (field.value !== '' && field.validity.valid)
    points.push(['Your reading', closest(domain, field.valueAsNumber)]);
  const values = el(id + '-values');
  values.replaceChildren();
  const colors = [css('point1'), css('point2'), css('point3')];
  const symbols = ['diamond', 'square', 'circle-open'];
  const pretty = (n) => Number(n.toPrecision(4)).toString();
  for (const [i, [name, index]] of points.entries()) {
    const item = document.createElement('span');
    item.style.borderColor = colors[i];
    item.textContent =
      i +
      1 +
      '. ' +
      name +
      ' · ' +
      xaxis.title +
      ' ' +
      pretty(curve.x[index]) +
      ', ' +
      yaxis.title +
      ' ' +
      pretty(curve.y[index]);
    values.append(item);
  }
  if (field.value && !field.validity.valid)
    values.append(
      'Enter a value from ' + pretty(Number(field.min)) + ' to ' + pretty(Number(field.max)) + '.',
    );
  return {
    x: points.map((p) => curve.x[p[1]]),
    y: points.map((p) => curve.y[p[1]]),
    mode: 'markers+text',
    text: points.map((_, i) => String(i + 1)),
    textposition: 'top center',
    textfont: { color: css('text') },
    cliponaxis: false,
    marker: { size: 10, color: colors, symbol: symbols },
    name: 'Marked points',
    showlegend: false,
  };
}
