// Tests for the P3 Arduino sketch generator (arduino-pid.js).
// Run from the repository root:  node --test arduino-pid.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { generateArduinoPID } = require('./arduino-pid');
const base = { Kp: 2.5, Ki: 1.25, Kd: 0.05, TsMs: 20, r: 1, uMax: 6, antiWindup: true };

test('[HW2 P3] the sketch carries the current gains, period, target and limit', () => {
  const code = generateArduinoPID(base);
  for (const part of ['const float Kp = 2.5f;', 'const float Ki = 1.25f;', 'const float Kd = 0.05f;', 'SAMPLE_MS = 20UL;', 'SETPOINT = 1.0f;', 'U_MAX = 6.0f;', 'ANTI_WINDUP = true;'])
    assert.ok(code.includes(part), part);
});

test('[HW2 §2] the loop uses the digital PID of the sheet', () => {
  const code = generateArduinoPID(base);
  // u[k] = Kp·e[k] + Ki·Ts·Σe[j] + Kd·(e[k] − e[k−1])/Ts, then clamp to [0, U_MAX]
  assert.ok(code.includes('Kp * e + Ki * Ts * (sumError + e)'));
  assert.ok(code.includes('Kd * ((e - previousError) / Ts)'));
  assert.ok(code.includes('constrain(raw, 0.0f, U_MAX)'));
  // Conditional integration, the same rule as pid-core.js
  assert.ok(code.includes('if (!ANTI_WINDUP || !pushesFurther) sumError += e;'));
});

test('whole numbers become valid float literals and anti-windup off is written', () => {
  const code = generateArduinoPID({ ...base, Kp: 5, Ki: 0, antiWindup: false });
  assert.ok(code.includes('Kp = 5.0f;') && code.includes('Ki = 0.0f;') && code.includes('ANTI_WINDUP = false;'));
});

test('bad settings are refused', () => {
  for (const bad of [{ TsMs: 12.5 }, { TsMs: 0 }, { uMax: 0 }, { Kp: NaN }, { Ki: Infinity }])
    assert.throws(() => generateArduinoPID({ ...base, ...bad }), RangeError);
});

test('the sketch has setup() and loop() and maps u to 8-bit PWM', () => {
  const code = generateArduinoPID(base);
  assert.match(code, /void setup\(\)/);
  assert.match(code, /void loop\(\)/);
  assert.ok(code.includes('255.0f * (u / U_MAX)'));
});
