// Module 1 · First-order time response (Bashar Ghosheh)
// [SLIDES 34] First-order sensor: τ·dy/dt + y = K·x, G(s) = K / (τs + 1).
// [NOTES §3.1] Example 1, the thermometer, is this model with τ = RC.
// Colours come from the shared theme through css() in module-assets/shared.js.

// Get HTML elements
var gainSlider = document.getElementById('gain');
var tauSlider = document.getElementById('tau');
var inputTypeSelect = document.getElementById('inputType');
var amplitudeInput = document.getElementById('amplitude');

var gainValueLabel = document.getElementById('gainValue');
var tauValueLabel = document.getElementById('tauValue');
var inputLabel = document.getElementById('inputLabel');
var responseTitle = document.getElementById('responseTitle');
var errorTitle = document.getElementById('errorTitle');
var slopeValueLabel = document.getElementById('slopeValue');

var predictionInput = document.getElementById('estimate');
var checkButton = document.getElementById('checkPrediction');
var predictionResult = document.getElementById('predictionResult');
var predictionPrompt = document.getElementById('predictionPrompt');
var predictionTip = document.getElementById('predictionTip');

// Largest possible answer is K·A = 3 × 10 (shared.js adds the range hint)
predictionInput.max = 30;
showRange(predictionInput, 0.6);

var responseMetricsDiv = document.getElementById('responseMetrics');
var logExplanationDiv = document.getElementById('logExplanation');
var validationDiv = document.getElementById('validation');


// Helper to format numbers
function formatNumber(num, decimals) {
    if (decimals === undefined) {
        decimals = 2;
    }
    return Number(num).toFixed(decimals);
}


// Helper to render KaTeX math
function displayMath(elementId, latexCode) {
    var element = document.getElementById(elementId);
    if (!element) {
        return;
    }

    if (window.katex) {
        try {
            katex.render(latexCode, element, {
                throwOnError: false,
                displayMode: true
            });
            return;
        } catch (error) {
            console.log(error);
        }
    }

    element.textContent = latexCode;
}


function displayInlineMath(elementId, latexCode) {
    var element = document.getElementById(elementId);
    if (!element) {
        return;
    }

    if (window.katex) {
        try {
            katex.render(latexCode, element, {
                throwOnError: false,
                displayMode: false
            });
            return;
        } catch (error) {
            console.log(error);
        }
    }

    element.textContent = latexCode;
}


// Main function to calculate values and draw plots
function updateSimulation() {

    var isMobile = (window.innerWidth <= 600);

    // Read current slider values
    var gain = Number(gainSlider.value);
    var tau = Number(tauSlider.value);
    var amplitude = Number(amplitudeInput.value);

    if (isNaN(amplitude) || amplitude <= 0) {
        amplitude = 1.0;
    }

    var selectedType = inputTypeSelect.value;
    var isRamp = (selectedType === 'ramp');

    // Update labels on the page
    gainValueLabel.textContent = formatNumber(gain, 1);
    tauValueLabel.textContent = formatNumber(tau, 1) + ' s';

    if (isRamp) {
        inputLabel.textContent = 'Ramp slope r (units/s)';
        responseTitle.textContent = isMobile ? 'Ramp Response' : 'Ramp Response & Dynamic Lag';
        errorTitle.textContent = isMobile ? 'Transient Error (Log Plot)' : 'Transient Departure from Steady-State (Log Plot)';
    } else {
        inputLabel.textContent = 'Step amplitude A';
        responseTitle.textContent = isMobile ? 'Step Response' : 'Step Response & Time-Constant Markers';
        errorTitle.textContent = isMobile ? 'Error Fraction (Log Plot)' : 'Step Error Fraction & Time-Constant Extraction (Log Plot)';
    }

    // Equations (compact on mobile to prevent horizontal overflow)
    if (isMobile) {
        displayInlineMath('odeEquation', 'G(s) = \\frac{K}{\\tau s + 1}');
    } else {
        displayInlineMath('odeEquation', '\\tau \\dot{y} + y = K x(t) \\iff G(s) = \\frac{K}{\\tau s + 1}');
    }

    if (isRamp) {
        if (isMobile) {
            displayMath('responseEquation', 'y(t) = Kr\\left[t-\\tau(1-e^{-t/\\tau})\\right]');
            displayMath('errorEquation', '\\ln|y_{ss}-y| = -\\frac{t}{\\tau} + c');
        } else {
            displayMath('responseEquation', 'y(t) = K r \\left[ t - \\tau \\left( 1 - e^{-t/\\tau} \\right) \\right], \\quad y_{ss}(t) = K r (t - \\tau)');
            displayMath('errorEquation', '\\ln \\left| \\frac{y_{ss}(t) - y(t)}{K r \\tau} \\right| = -\\frac{1}{\\tau} t');
        }
        logExplanationDiv.innerHTML = 'For a ramp input, the transient error decays with slope <strong>m = -1/τ = ' + formatNumber(-1 / tau, 2) + ' s⁻¹</strong>.';
    } else {
        displayMath('responseEquation', 'y(t) = K A \\left( 1 - e^{-t/\\tau} \\right)');
        displayMath('errorEquation', '\\ln \\left( \\frac{e(t)}{e(0)} \\right) = -\\frac{1}{\\tau} t');
        logExplanationDiv.innerHTML = 'The error fraction e(t)/e(0) plotted on a log axis is a straight line with slope <strong>m = -1/τ = ' + formatNumber(-1 / tau, 2) + ' s⁻¹</strong>.';
    }

    // Theoretical slope
    var slope = -1 / tau;
    slopeValueLabel.textContent = formatNumber(slope, 2) + ' s⁻¹';

    // Time array
    var maxTime = 5 * tau;
    if (maxTime < 12) {
        maxTime = 12;
    }
    if (maxTime > 30) {
        maxTime = 30;
    }

    var totalPoints = 300;
    var timeArray = [];

    for (var i = 0; i <= totalPoints; i++) {
        var t = (maxTime * i) / totalPoints;
        timeArray.push(t);
    }

    // Output array
    var outputArray = [];

    for (var j = 0; j < timeArray.length; j++) {
        var currentTime = timeArray[j];
        var yVal = 0;

        if (isRamp) {
            // [SLIDES 34] Ramp response: y(t) = Kr·[t − τ·(1 − e^(−t/τ))]
            yVal = gain * amplitude * (currentTime - tau * (1 - Math.exp(-currentTime / tau)));
        } else {
            // [SLIDES 34] Step response: y(t) = KA·(1 − e^(−t/τ))
            yVal = gain * amplitude * (1 - Math.exp(-currentTime / tau));
        }

        outputArray.push(yVal);
    }

    // Build plot traces
    var traces = [];
    var shapes = [];
    var annotations = [];

    if (isRamp) {

        // Input ramp line
        var inputArray = [];
        for (var k = 0; k < timeArray.length; k++) {
            inputArray.push(amplitude * timeArray[k]);
        }

        var inputTrace = {
            x: timeArray,
            y: inputArray,
            name: isMobile ? 'x(t)' : 'Input ramp x(t)',
            mode: 'lines',
            line: { color: css('input'), dash: 'dash', width: 2 }
        };
        traces.push(inputTrace);

        // Steady-state asymptote line
        var ssTimeArray = [];
        var ssOutputArray = [];

        for (var m = 0; m < timeArray.length; m++) {
            if (timeArray[m] >= tau) {
                ssTimeArray.push(timeArray[m]);
                ssOutputArray.push(gain * amplitude * (timeArray[m] - tau));
            }
        }

        var ssTrace = {
            x: ssTimeArray,
            y: ssOutputArray,
            name: isMobile ? 'y_ss(t)' : 'Steady-state line',
            mode: 'lines',
            line: { color: css('target'), dash: 'dot', width: 2 }
        };
        traces.push(ssTrace);

        // Output trace
        var outputTrace = {
            x: timeArray,
            y: outputArray,
            name: isMobile ? 'y(t)' : 'Output y(t)',
            mode: 'lines',
            line: { color: css('output'), width: 3 }
        };
        traces.push(outputTrace);

        // Reference point for lag and error
        var tRef = 3.5 * tau;
        if (tRef < 6.5) {
            tRef = 6.5;
        }
        if (tRef > maxTime - 1.5) {
            tRef = maxTime - 1.5;
        }

        var yAtRef = gain * amplitude * (tRef - tau * (1 - Math.exp(-tRef / tau)));
        // [HW §3, Module 1] Late in a ramp the output lags by τ; the error is K·r·τ.
        var steadyStateError = gain * amplitude * tau;
        var targetY = gain * amplitude * tRef;

        // Horizontal time lag line
        var lagShape = {
            type: 'line',
            x0: tRef - tau,
            y0: yAtRef,
            x1: tRef,
            y1: yAtRef,
            line: { color: css('point2'), width: 2.2 }
        };
        shapes.push(lagShape);

        var lagAnnotation = {
            x: tRef - (tau / 2),
            y: yAtRef,
            text: isMobile ? ('Lag: ' + formatNumber(tau, 1) + 's') : ('Lag τ = ' + formatNumber(tau, 1) + ' s'),
            showarrow: true,
            arrowhead: 2,
            ax: 0,
            ay: isMobile ? -20 : -26,
            font: { color: css('point2'), size: isMobile ? 10 : 11, weight: 'bold' },
            bgcolor: css('surface'),
            bordercolor: css('point2'),
            borderwidth: 1
        };
        annotations.push(lagAnnotation);

        // Vertical steady-state error line
        var errorShape = {
            type: 'line',
            x0: tRef,
            y0: yAtRef,
            x1: tRef,
            y1: targetY,
            line: { color: css('point3'), width: 2.2 }
        };
        shapes.push(errorShape);

        var errorAnnotation = {
            x: tRef,
            y: (yAtRef + targetY) / 2,
            text: isMobile ? ('e_ss: ' + formatNumber(steadyStateError, 1)) : ('e_ss = ' + formatNumber(steadyStateError, 2)),
            showarrow: true,
            arrowhead: 2,
            ax: isMobile ? 32 : 42,
            ay: 0,
            font: { color: css('point3'), size: isMobile ? 10 : 11, weight: 'bold' },
            bgcolor: css('surface'),
            bordercolor: css('point3'),
            borderwidth: 1
        };
        annotations.push(errorAnnotation);

        // Metrics for ramp
        responseMetricsDiv.innerHTML =
            '<div class="metric-item"><span>Time Lag:</span><strong>' + formatNumber(tau, 2) + ' s</strong></div>' +
            '<div class="metric-item"><span>Steady-State Error:</span><strong>' + formatNumber(steadyStateError, 2) + ' units</strong></div>';

    } else {

        // Step response
        var finalValue = gain * amplitude;
        // [HW §3, Module 1] 63.2% of the final value at τ and 95% at 3τ.
        var valueAtTau = finalValue * (1 - Math.exp(-1));
        var valueAt3Tau = finalValue * (1 - Math.exp(-3));

        // Horizontal line for final value
        var finalValueTrace = {
            x: [0, maxTime],
            y: [finalValue, finalValue],
            name: isMobile ? 'Final' : 'Final KA',
            mode: 'lines',
            line: { color: css('muted'), dash: 'dash', width: 1.8 }
        };
        traces.push(finalValueTrace);

        // Output curve
        var stepOutputTrace = {
            x: timeArray,
            y: outputArray,
            name: isMobile ? 'y(t)' : 'Output y(t)',
            mode: 'lines',
            line: { color: css('output'), width: 3 }
        };
        traces.push(stepOutputTrace);

        // Marker points at tau and 3tau
        var markersTrace = {
            x: [tau, 3 * tau],
            y: [valueAtTau, valueAt3Tau],
            name: isMobile ? 'Markers' : 'Markers (τ, 3τ)',
            mode: 'markers+text',
            text: isMobile ? [
                'τ (63%)',
                '3τ (95%)'
            ] : [
                'τ = ' + formatNumber(tau, 1) + 's (63.2%)',
                '3τ = ' + formatNumber(3 * tau, 1) + 's (95.0%)'
            ],
            textposition: ['top right', 'bottom right'],
            textfont: { size: isMobile ? 9 : 11 },
            marker: { size: isMobile ? 8 : 10, color: css('point1') }
        };
        traces.push(markersTrace);

        // Droplines for tau
        shapes.push({ type: 'line', x0: tau, y0: 0, x1: tau, y1: valueAtTau, line: { color: css('point1'), dash: 'dot', width: 1.2 } });
        shapes.push({ type: 'line', x0: 0, y0: valueAtTau, x1: tau, y1: valueAtTau, line: { color: css('point1'), dash: 'dot', width: 1.2 } });

        // Droplines for 3tau
        shapes.push({ type: 'line', x0: 3 * tau, y0: 0, x1: 3 * tau, y1: valueAt3Tau, line: { color: css('point1'), dash: 'dot', width: 1.2 } });
        shapes.push({ type: 'line', x0: 0, y0: valueAt3Tau, x1: 3 * tau, y1: valueAt3Tau, line: { color: css('point1'), dash: 'dot', width: 1.2 } });

        // Metrics for step
        responseMetricsDiv.innerHTML =
            '<div class="metric-item"><span>Final Value KA:</span><strong>' + formatNumber(finalValue, 2) + '</strong></div>' +
            '<div class="metric-item"><span>At t = τ (63.2%):</span><strong>' + formatNumber(valueAtTau, 2) + '</strong></div>' +
            '<div class="metric-item"><span>At t = 3τ (95.0%):</span><strong>' + formatNumber(valueAt3Tau, 2) + '</strong></div>';
    }

    // Responsive layout for response plot
    var responseLayout = {
        margin: isMobile ? { l: 38, r: 10, t: 15, b: 65 } : { l: 60, r: 24, t: 24, b: 54 },
        paper_bgcolor: css('surface'),
        plot_bgcolor: css('surface'),
        font: { color: css('text'), size: isMobile ? 10 : 12 },
        legend: {
            orientation: 'h',
            y: isMobile ? -0.32 : 1.15,
            x: 0,
            font: { size: isMobile ? 9 : 11 }
        },
        xaxis: {
            title: isMobile ? 't (s)' : 'Time t (seconds)',
            range: [0, maxTime],
            gridcolor: css('edge'), zerolinecolor: css('muted')
        },
        yaxis: {
            title: isRamp ? 'y(t), x(t)' : 'Output y(t)',
            rangemode: 'tozero',
            gridcolor: css('edge'), zerolinecolor: css('muted')
        },
        shapes: shapes,
        annotations: annotations,
        autosize: true
    };

    Plotly.react('responsePlot', traces, responseLayout, {
        responsive: true,
        displayModeBar: false
    });


    // Draw error plot on log axis
    // [HW §4, step 3] The log method: ln(e(t)/e(0)) = −t/τ, a line with slope −1/τ.
    var logTimes = [];
    var logValues = [];

    for (var p = 0; p < timeArray.length; p++) {
        if (timeArray[p] <= 4 * tau) {
            logTimes.push(timeArray[p]);
            logValues.push(-timeArray[p] / tau);
        }
    }

    var logLineTrace = {
        x: logTimes,
        y: logValues,
        name: isMobile ? 'ln(Error)' : ('ln(Error Fraction) — Slope = ' + formatNumber(-1 / tau, 2)),
        mode: 'lines',
        line: { color: css('output'), width: 2.5 }
    };

    var logMarkersTrace = {
        x: [tau, 2 * tau, 3 * tau],
        y: [-1, -2, -3],
        name: 'τ Marks',
        mode: 'markers+text',
        text: ['(τ,-1)', '(2τ,-2)', '(3τ,-3)'],
        textposition: 'bottom left',
        textfont: { size: isMobile ? 8 : 11 },
        marker: { size: isMobile ? 6 : 9, color: css('point1') }
    };

    var logShapes = [
        { type: 'line', x0: tau, y0: 0, x1: tau, y1: -1, line: { color: css('edge'), dash: 'dash' } },
        { type: 'line', x0: 0, y0: -1, x1: tau, y1: -1, line: { color: css('edge'), dash: 'dash' } },
        { type: 'line', x0: 3 * tau, y0: 0, x1: 3 * tau, y1: -3, line: { color: css('edge'), dash: 'dash' } },
        { type: 'line', x0: 0, y0: -3, x1: 3 * tau, y1: -3, line: { color: css('edge'), dash: 'dash' } }
    ];

    var logLayout = {
        margin: isMobile ? { l: 38, r: 10, t: 15, b: 65 } : { l: 60, r: 24, t: 24, b: 54 },
        paper_bgcolor: css('surface'),
        plot_bgcolor: css('surface'),
        font: { color: css('text'), size: isMobile ? 10 : 12 },
        showlegend: true,
        legend: {
            orientation: 'h',
            y: isMobile ? -0.32 : 1.15,
            x: 0,
            font: { size: isMobile ? 9 : 11 }
        },
        xaxis: {
            title: isMobile ? 't (s)' : 'Time t (seconds)',
            range: [0, Math.min(maxTime, 4.2 * tau)],
            gridcolor: css('edge'), zerolinecolor: css('muted')
        },
        yaxis: {
            title: isMobile ? 'ln( e / e₀ )' : 'Natural Log ln( e(t) / e(0) )',
            range: [-4.2, 0.2],
            gridcolor: css('edge'), zerolinecolor: css('muted')
        },
        shapes: logShapes,
        autosize: true
    };

    Plotly.react('errorPlot', [logLineTrace, logMarkersTrace], logLayout, {
        responsive: true,
        displayModeBar: false
    });


    // Prediction prompts
    if (isRamp) {
        predictionPrompt.textContent = 'For this ramp with slope r = ' + formatNumber(amplitude, 1) + ' and τ = ' + formatNumber(tau, 1) + ' s, predict the steady-state lag time (seconds):';
        predictionTip.textContent = 'Hint: In steady-state (t ≫ τ), the first-order response lags the input by exactly τ seconds.';
    } else {
        predictionPrompt.textContent = 'Predict the sensor reading y(t) at t = τ (' + formatNumber(tau, 1) + ' s) when K = ' + formatNumber(gain, 1) + ' and A = ' + formatNumber(amplitude, 1) + ':';
        predictionTip.textContent = 'Hint: y(τ) = KA · (1 - e⁻¹) ≈ 0.6321 · KA = 0.6321 · ' + formatNumber(gain * amplitude, 2) + '.';
    }


    // Validation check cards
    // [HW §3.2, check 1] y(τ) = 0.632 KA and y(3τ) = 0.95 KA.
    var calculatedTau = 1 - Math.exp(-1);
    var calculated3Tau = 1 - Math.exp(-3);

    var pass1 = Math.abs(calculatedTau - 0.632) < 0.002;
    var pass2 = Math.abs(calculated3Tau - 0.950) < 0.002;

    validationDiv.innerHTML =
        checkRow('1 · Step at t = τ', '0.632 KA', formatNumber(calculatedTau, 3) + ' KA', pass1) +
        checkRow('1 · Step at t = 3τ', '0.950 KA', formatNumber(calculated3Tau, 3) + ' KA', pass2);
}


// Check user prediction
function checkPrediction() {

    var enteredValue = parseFloat(predictionInput.value);

    if (isNaN(enteredValue)) {
        predictionResult.innerHTML = '<p class="readout warn">Enter a number before you check.</p>';
        return;
    }

    var gain = Number(gainSlider.value);
    var tau = Number(tauSlider.value);
    var amplitude = Number(amplitudeInput.value);
    if (isNaN(amplitude) || amplitude <= 0) {
        amplitude = 1.0;
    }

    var isRamp = (inputTypeSelect.value === 'ramp');

    var actualValue = 0;
    var units = '';
    var explanation = '';

    if (isRamp) {
        actualValue = tau;
        units = 's';
        explanation = 'For a first-order system with ramp input, the steady-state lag is identically equal to the time constant τ = ' + formatNumber(tau, 2) + ' s.';
    } else {
        actualValue = gain * amplitude * (1 - Math.exp(-1));
        units = 'units';
        explanation = 'At t = τ, y(τ) = KA(1 - e⁻¹) = (' + formatNumber(gain, 1) + ')(' + formatNumber(amplitude, 1) + ')(0.63212) = ' + formatNumber(actualValue, 3) + ' units.';
    }

    var difference = Math.abs(enteredValue - actualValue);
    var percentError = 0;
    if (actualValue !== 0) {
        percentError = (difference / Math.abs(actualValue)) * 100;
    }

    var cardClass = 'bad';
    var badgeText = 'Needs review.';
    var assessment = 'Open the hint above and check your calculation.';

    if (percentError <= 2.5) {
        cardClass = 'good';
        badgeText = 'Spot-on!';
        assessment = 'You have the physical meaning of this parameter.';
    } else if (percentError <= 10.0) {
        cardClass = 'warn';
        badgeText = 'Very close.';
        assessment = 'You are within 10% of the exact closed-form value.';
    }

    predictionResult.innerHTML =
        '<p class="readout ' + cardClass + '">' +
            '<strong>' + badgeText + '</strong> ' +
            'Your prediction: ' + formatNumber(enteredValue, 2) + ' ' + units + '. ' +
            'Exact value: ' + formatNumber(actualValue, 2) + ' ' + units +
            ' (error ' + formatNumber(percentError, 1) + '%). ' + assessment +
        '</p>' +
        '<p>' + explanation + '</p>';
}


// Event listeners
gainSlider.addEventListener('input', updateSimulation);
tauSlider.addEventListener('input', updateSimulation);
amplitudeInput.addEventListener('input', updateSimulation);

inputTypeSelect.addEventListener('change', function() {
    predictionResult.innerHTML = '';
    predictionInput.value = '';
    updateSimulation();
});

checkButton.addEventListener('click', checkPrediction);

// Redraw with the new colours when the light/dark theme changes
window.addEventListener('palette', updateSimulation);

predictionInput.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        checkPrediction();
    }
});

// Run once on page load
window.addEventListener('load', function() {
    updateSimulation();
    Plotly.Plots.resize('responsePlot');
    Plotly.Plots.resize('errorPlot');
});

window.addEventListener('resize', function() {
    updateSimulation();
    Plotly.Plots.resize('responsePlot');
    Plotly.Plots.resize('errorPlot');
});

// Initial run
updateSimulation();
