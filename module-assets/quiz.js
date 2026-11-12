// Each question includes the explanation shown after the full quiz is submitted.
const bank = [
  [
    [
      'At t = τ, what fraction of a step has the sensor completed?',
      ['63.2%', '95%', '100%'],
      0,
      'At one time constant the uncompleted fraction is exp(−1).',
    ],
    [
      'Double τ. What happens to the log-error slope?',
      ['Twice as steep', 'Half as steep'],
      1,
      'Its slope is −1/τ, so its magnitude halves.',
    ],
    [
      'Which quantity sets the late-time ramp lag?',
      ['Static gain', 'Time constant'],
      1,
      'Gain scales the reading. The ramp asymptote is delayed by τ.',
    ],
  ],
  [
    ['At cutoff, what is the phase?', ['−45°', '−90°', '0°'], 0, 'At ωτ = 1, −atan(1) equals −45°.'],
    [
      'Which ripple is attenuated more?',
      ['Slower', 'Faster'],
      1,
      'Increasing ωτ lowers the amplitude ratio.',
    ],
    ['A ratio of 0.95 gives which signed error?', ['+5%', '−5%'], 1, 'Dynamic error is the ratio minus one.'],
  ],
  [
    [
      'Which case has oscillatory poles?',
      ['Underdamped', 'Critical', 'Overdamped'],
      0,
      'Complex conjugate poles introduce a decaying sinusoid.',
    ],
    [
      'What does velocity equal at the first displacement peak?',
      ['Maximum positive speed', 'Zero'],
      1,
      'Velocity changes sign at a turning point.',
    ],
    [
      'Which parameter sets the final displacement for a constant force?',
      ['Spring stiffness', 'Damping'],
      0,
      'At rest kx balances the applied force.',
    ],
  ],
  [
    [
      'A unit step settles at 1.8. What is the first-order gain?',
      ['1.8', '0.632'],
      0,
      'The final output divided by the input step gives gain.',
    ],
    [
      'Which measurement helps identify damping?',
      ['Overshoot', 'Final displacement alone'],
      0,
      'Normalized overshoot depends on ζ for a standard second-order step.',
    ],
    [
      'How should you read noisy peaks?',
      ['Use the tallest isolated dot', 'Estimate the peak of the surrounding curve'],
      1,
      'One noise spike can bias both peak height and time.',
    ],
  ],
];
const questions = page ? bank[page - 1] : bank.map((group) => group[0]);
function resetQuiz() {
  el('quizScore').textContent = '';
  el('quiz').replaceChildren();
  questions.forEach(([prompt, choices], i) => {
    const box = document.createElement('fieldset');
    const legend = document.createElement('legend');
    legend.textContent = prompt;
    box.append(legend);
    choices.forEach((option, j) => {
      const label = document.createElement('label');
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'quiz' + i;
      input.value = j;
      input.required = true;
      label.append(input, option);
      box.append(label);
    });
    box.append(document.createElement('p'));
    el('quiz').append(box);
  });
}
el('quizForm').onsubmit = (event) => {
  event.preventDefault();
  let correct = 0;
  const answers = new FormData(event.currentTarget);
  questions.forEach(([, choices, answer, why], i) => {
    const box = el('quiz').children[i];
    const right = Number(answers.get('quiz' + i)) === answer;
    if (right) correct++;
    const message = box.querySelector('p');
    message.className = right ? 'good' : 'warn';
    message.textContent = (right ? 'Correct. ' : 'Correct answer: ' + choices[answer] + '. ') + why;
    box.disabled = true;
  });
  el('quizForm').querySelector('[type=submit]').disabled = true;
  el('quizScore').textContent =
    correct +
    ' / ' +
    questions.length +
    (correct === questions.length ? ' · All answers correct.' : ' · Review the explanations and try again.');
};
el('resetQuiz').onclick = () => {
  resetQuiz();
  el('quizForm').querySelector('[type=submit]').disabled = false;
  el('quiz').querySelector('input').focus();
};
resetQuiz();
