// [HW2 §2, P3] The generator is independent of the UI so My system can reuse it.
// TsMs is an integer in milliseconds. Commands span 0 to uMax in model units.
function generateArduinoPID({ Kp, Ki, Kd, TsMs, r = 1, uMax = 1, antiWindup = false }) {
  if (![Kp, Ki, Kd, r, uMax].every(Number.isFinite) || uMax <= 0 ||
      !Number.isInteger(TsMs) || TsMs < 1 || TsMs > 0x7fffffff) {
    throw new RangeError('Use finite gains and target, a positive command limit, and a whole millisecond period.');
  }
  const float = (value) => {
    const literal = String(value);
    return /[.e]/i.test(literal) ? literal + 'f' : literal + '.0f';
  };
  return `#include <Arduino.h>

// ENCS4380 P3 - Digital PID, Arduino Uno (8-bit PWM).
const uint8_t PWM_PIN = 9;
const uint8_t SENSOR_PIN = A0;
const float SENSOR_FULL_SCALE = 2.0f; // Output units at ADC count 1023.

const float Kp = ${float(Kp)};
const float Ki = ${float(Ki)};
const float Kd = ${float(Kd)};
const uint32_t SAMPLE_MS = ${TsMs}UL;
const float Ts = SAMPLE_MS / 1000.0f;
const float SETPOINT = ${float(r)};
const float U_MAX = ${float(uMax)};
const bool ANTI_WINDUP = ${Boolean(antiWindup)};

float sumError = 0.0f;
float previousError = 0.0f;
bool firstSample = true;
uint32_t lastSampleMs;

float readSensor() {
  // Example analog input. Replace with calibrated encoder speed for the motor.
  return analogRead(SENSOR_PIN) * (SENSOR_FULL_SCALE / 1023.0f);
}

void setup() {
  pinMode(PWM_PIN, OUTPUT);
  analogWrite(PWM_PIN, 0);
  lastSampleMs = millis() - SAMPLE_MS; // Sample on the first loop pass.
}

void loop() {
  const uint32_t now = millis();
  if (now - lastSampleMs < SAMPLE_MS) return;
  lastSampleMs += SAMPLE_MS;
  // Skip missed intervals instead of replaying them with the same sensor read.
  if (now - lastSampleMs >= SAMPLE_MS) lastSampleMs = now;

  const float e = SETPOINT - readSensor();
  if (firstSample) previousError = e;
  const float raw = Kp * e + Ki * Ts * (sumError + e)
                  + Kd * ((e - previousError) / Ts);
  const float u = constrain(raw, 0.0f, U_MAX);
  const bool pushesFurther = (raw > U_MAX && e > 0.0f)
                           || (raw < 0.0f && e < 0.0f);
  if (!ANTI_WINDUP || !pushesFurther) sumError += e;

  previousError = e;
  firstSample = false;
  analogWrite(PWM_PIN, static_cast<int>(255.0f * (u / U_MAX) + 0.5f));
}
`;
}

if (typeof module !== 'undefined') module.exports = { generateArduinoPID };
