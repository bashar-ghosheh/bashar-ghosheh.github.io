# ENCS4380 Interactive Toolkits: Dynamic Characteristics and PID Control

Two interactive web toolkits built for **ENCS4380 Interfacing Techniques** at Birzeit University:

1. **Dynamic Characteristics Toolkit** (Homework 1): how slow a sensor or system is. Hub: `index.html`.
2. **PID Control Toolkit** (Homework 2): how feedback makes it faster and more accurate. Hub: `control.html`.

- **Live site:** [https://bashar-ghosheh.github.io/](https://bashar-ghosheh.github.io/)
- **Instructor:** Dr. Wasel Ghanem

A sensor never reports the present. It reports the past, smoothed. The toolkit makes that visible in four modules, and every plot runs live in the page.

![Hub page](screenshots/hub.png)

---

## Team members and who built what (Part 1)

| Member | Module | Page | Status |
| :--- | :--- | :--- | :--- |
| **Bashar Ghosheh** | Module 1: First-order time response | `module1.html` | Completed |
| **Amro Qutna** | Module 2: First-order frequency response | `module2.html` | Completed |
| **Tareq Ahmad** | Module 3: Second-order response and state space | `module3.html` | Completed |
| **Ahmad AlSheikh** | Module 4: Guess the sensor, hub page and final integration | `module4.html`, `index.html` | Completed |

> The team plan for Homework 2 (work split, grading points, dates and coding rules) is in [`HW2-TEAM-PLAN.md`](HW2-TEAM-PLAN.md), not on the public pages.

---

# Part 1 · Dynamic Characteristics Toolkit

## Hub (`index.html`)

- The "tea test": a live version of the thermometer example from the homework sheet (20 °C air into 80 °C tea, τ = 10 s).
- Cards for the four modules, with progress saved in the browser.
- K, τ, ζ and ωn explained in plain words.
- Download buttons for the lecture slides and the State-Space Modeling notes.
- All **six validation checks** on one board, recalculated in the browser with the modules' own code, each with expected value, calculated value and PASS or FAIL.

## Module 1: First-order time response

Built by **Bashar Ghosheh**. Models a first-order sensor such as a mercury thermometer:

$$\tau \dot{y} + y = K x(t) \iff G(s) = \frac{K}{\tau s + 1}$$

- **Controls:** gain $K$, time constant $\tau$, input waveform (step or ramp) and input size.
- **Step response:** $y(t) = KA(1 - e^{-t/\tau})$ with the final line $KA$ and markers at $\tau$ (63.2%) and $3\tau$ (95.0%).
- **Ramp response:** $y(t) = Kr[t - \tau(1 - e^{-t/\tau})]$ with the time lag $\tau$ and the steady-state error $Kr\tau$.
- **Log error plot:** $\ln(e(t)/e(0)) = -t/\tau$, a straight line with slope $-1/\tau$.
- **Predict, then check**, a quiz, and validation check 1.

## Module 2: First-order frequency response

Built by **Amro Qutna**. A first-order sensor driven by a sine wave:

$$M = \frac{1}{\sqrt{1 + (\omega\tau)^2}}, \qquad \phi = -\tan^{-1}(\omega\tau)$$

- Sliders for $\tau$ and the input frequency $\omega$, with the input and output sines on one plot.
- Amplitude ratio, phase lag and dynamic error $\delta = M - 1$.
- Bode magnitude and phase plots with the cutoff at $\omega = 1/\tau$.
- Predict, then check, a quiz, and validation checks 2 and 3.
- Bonus: superposition of two sines, to see how the sensor distorts a mixed signal.

## Module 3: Second-order response and state space

Built by **Tareq Ahmad**. The mass-spring-damper model is `m*x'' + b*x' + k*x = F(t)` with a 1 N step input. Its transfer function is `G(s) = 1/(m*s^2 + b*s + k)`, natural frequency `sqrt(k/m)` and damping ratio `b/(2*sqrt(m*k))`.

- Live mass, damping and stiffness controls, plus underdamped, critical and overdamped presets.
- Closed-form displacement with measured 10–90% rise time, peak time, overshoot and 2% settling time.
- Live state-space matrices A and B, transfer poles next to the eigenvalues of A, and the phase plane.
- Predict, then check, a quiz, and validation checks 4 to 6.

## Module 4: Guess the sensor

Built by **Ahmad AlSheikh**. The page puts a hidden sensor on a "test bench" and shows one noisy response. The user reads the curve and works backwards.

There are three kinds of round, picked at random:

| Round | Hidden sensor | The user estimates | Lecture method |
| :--- | :--- | :--- | :--- |
| First-order step | random $K$ and $\tau$ | $K$ and $\tau$ | final level, 63.2% point, or the log method |
| First-order sine | random $\tau$, stated $\omega$, $K = 1$ | $\tau$ | amplitude ratio $M$, cross-check with the phase lag |
| Second-order step | random $\zeta$ and $\omega_n$, $K = 1$ | $\zeta$ and $\omega_n$ | overshoot and peak time |

- **First look:** before estimating, the user decides if the curve is first order or second order, and learns which energy stores explain the answer.
- **Measuring tools:** a level ruler (dashed line), a time inspector that reads one sample, and a log view that plots $\ln(1 - y/K)$ for the log method.
- **Hints on request:** three steps per round, from a nudge ("Overshoot depends only on ζ") to the full formula with a small lookup table.
- **Reveal:** the true curve is drawn over the user's curve, with a table of estimate, true value, error and points, and a worked solution for that exact curve.
- **Score:** an estimate within 10% of the true value earns 100 points. Beyond that it loses 2.5 points per extra percent, so 30% error earns 50 and 50% earns 0. The round score is the average of the estimates.
- **Session score:** rounds played, average, full-marks rounds and a rank, plus a "New sensor" button.
- After the reveal the score is locked, but the user can keep changing the numbers and watch the dashed curve move onto the true one.

![Module 4 reveal](screenshots/module4_reveal.png)

---

## Validation checks

| # | Check | Expected |
| :--- | :--- | :--- |
| 1 | First-order step | $y(\tau) = 0.632\,KA$, $y(3\tau) = 0.95\,KA$ |
| 2 | $\tau = 0.2$ s, input $\sin 2t$ | amplitude 0.93, lag 21.8° |
| 3 | 100 Hz with at most 5% dynamic error | $\tau_{max} \approx 0.52$ ms, lag 9.3° at 50 Hz |
| 4 | Second order, $\zeta = 0.5$ | overshoot 16.3% |
| 5 | Second order, $\zeta = 1$ | no overshoot |
| 6 | State space, $m = 1$, $b = 2$, $k = 4$ | eigenvalues $-1 \pm j1.732$, equal to the poles |

All six are shown on the hub page, and again inside the module they belong to.

---

# Part 2 · PID Control Toolkit

Opened from the banner on the hub, or directly at `control.html`. Every module keeps the "Predict, then check" box, and every plot is simulated live in the page.

## Modules and owners

| Member | Module | Page | Status |
| :--- | :--- | :--- | :--- |
| **Bashar Ghosheh** | P1: PID playground | [P1](control-p1.html) | Completed |
| **Amro Qutna** | P2: A slow sensor in the loop, and My system | [P2](control-p2.html), [My system](control-system.html) | Completed |
| **Tareq Ahmad** | P3: Digital PID and the Arduino code generator | [P3](control-p3.html) | Completed |
| **Ahmad AlSheikh** | P4: Tuning challenge, Control hub, shared simulator, integration | [P4](control-p4.html), `control.html`, `pid-core.js` | Completed |

## Control hub (`control.html`)

- An interactive block diagram of the loop: tap a block (setpoint, error, PID, limit, plant, sensor) to read what it does and which module explores it.
- "Feel the loop": the four steps of the lecture on a second-order plant (K = 1, ζ = 0.7, ωn = 2 rad/s): no control, add P, add I, add D, with live rise time, overshoot, settling time and steady-state error.
- A "Predict, then check" question on the P-only final value.
- P, I and D in plain words, and the table of what each gain does.
- Cards for the five pages. Each card checks whether its page is online yet.
- The three validation checks, computed by the shared simulator.

## P1 · PID playground

Open [the P1 playground](control-p1.html) from the Control hub. Choose a first-order plant ($K, \tau$) or second-order plant ($K, \zeta, \omega_n$), adjust $K_p$, $K_i$, $K_d$, the setpoint step $r$, and the actuator limits $u_{\min}/u_{\max}$ (supporting 0–100% limits).

- Plots live closed-loop output $y$ against setpoint $r$ alongside the clipped control signal $u$ and its saturation rate.
- Reports live 10–90% rise time, overshoot, ±2% settling time and steady-state error.
- **Keep this run** stores up to three earlier runs: they are drawn dashed under the live curve and listed in a table with their gains and metrics, so changing one gain shows the lecture's P, I, D table directly.
- Includes three **Predict, then check** experiments (P-only, PI, and saturated PI) and the three Homework 2 validation checks.

## P2 · A slow sensor in the loop

Open [the P2 experiment](control-p2.html) from the Control hub. Adjust the sensor time constant and PID gains to compare true wheel speed with the reading used by the controller. The default settings use a unit step and a normalized first-order motor.

- Choose the 0.25 s sensor preset with the reference gains. At the first target crossing, the sensor reads about 0.645. Increase the lag to 1.5 s to see successive peaks grow.
- **Overshoot against sensor lag:** for the current gains, 41 simulations sweep τs from 0 to 2 s and plot the peak overshoot. A dashed line marks the Routh boundary τs* = (1 + Kd)(1 + Kp)/(Ki − 1 − Kp), past which the swings grow.
- Select **Run P2 checks** to compare all four presets against their expected behavior.
- Open **Pole placement** to apply state feedback to the Module 3 mass-spring-damper. The page compares the selected poles with the calculated eigenvalues and plots the return to rest.

## P3 · Digital PID

Open [the digital PID experiment](control-p3.html) from the Control hub. Compare the 10 ms and 350 ms presets to see how the zero-order hold affects the output and PWM command. The sampling table keeps the other settings fixed and reports the measured response for several periods.

- **Verify P3** runs five checks: Ts = 1 ms equals the continuous PID, u changes only at sample instants, the response worsens as Ts grows (350 ms does not settle), anti-windup lowers the peak and the settling time, and the sketch carries the settings and the u[k] formula.
- **Windup demo** applies a tight actuator limit and compares the same controller with conditional integration on and off.
- **Arduino sketch** generates an Arduino Uno sketch from the active settings. For the micromouse, supply the measured plant values and replace the example analog input with calibrated encoder speed.
- To reuse the generator from My system, load `arduino-pid.js` and call `generateArduinoPID({ Kp, Ki, Kd, TsMs, r, uMax, antiWindup })`. The returned sketch maps commands in the range 0 to `uMax` to 8-bit PWM.

## P4 · Tuning challenge (`control-p4.html`)

A hidden random plant, a spec, and three gains.

- **The plant** is a Module 4 "Guess the sensor" plant (`newSensor()` in `sensor-game.js`): first order with random K and τ, or second order with random ζ and ωn. The page shows only its noisy open-loop step test, so the user first reads the plant, as in Module 4.
- **Three levels.** Easy: first order, overshoot ≤ 15%. Normal: first or second order, overshoot ≤ 10%. Hard: lightly damped second order, overshoot ≤ 5%, and an actuator that saturates (u between 0 and 3), with an anti-windup switch.
- **The spec** has three lines, each marked PASS or FAIL after every test: overshoot above the target, 2% settling time (about half, or on Easy 80%, of the time the plant takes on its own), and steady-state error within 1%.
- **Every round is solvable.** Before a plant is shown, `findReference()` designs gains by pole placement and checks them on the true plant. The sliders are wide enough to reach them.
- **Score:** overshoot 35, settling 35, error 30. Three tests are free, then each test costs 5% (never below half). Three stars for a full pass within three tests. A session board keeps rounds, average, best and three-star rounds.
- **Results:** the closed-loop curve with the spec drawn on it (overshoot ceiling, settling deadline, ±2% band), earlier tests in grey, the control signal, and one sentence per failed line saying which gain to change.
- **Live preview** makes the curve follow the sliders for practice, with no score. **Hints** step from reading the plant to a design shortcut. **Reveal** shows the true plant and the reference design with its working.
- "Predict, then check": which spec line can P alone never pass?

## My system · Our micromouse drive motor (`control-system.html`)

Section 3 of the sheet, applied to our micromouse. The robot is not assembled yet, so the plant comes from the motor's datasheet, which the sheet allows, with the source cited on the page.

1. **The plant and its source.** The motor we ordered is the BRINGSMART JGA12-N20 encoder gear motor, 6 V, 530 rpm ([AliExpress item 32968556654](https://www.aliexpress.com/item/32968556654.html)). From the seller's manual (row JGA12-N20-30: no-load 40 mA, stall 0.55 A and 0.4 kg·cm, ratio 30) the page derives R = V/I_stall, Ke, Kt, the inertia of half the robot at the motor shaft, and τ = J·R/(Kt·Ke) ≈ 27 ms. K = 530 rpm / 100% PWM = 5.3 rpm per %. Robot mass (120 g), wheel diameter (32 mm) and rotor inertia are stated assumptions, editable on the page.
2. **The spec and why.** 0.6 ≤ ζ ≤ 0.8 (wheel slip and odometry errors otherwise), PWM inside 0–100% (no clipping or wind-up), zero steady-state error (both wheels at the same speed, so the mouse drives straight), cruising at 300 rpm ≈ 0.5 m/s.
3. **Design.** `designPI()` turns the chosen ζ and ωn into Kp and Ki; a digital PID (Ts = 5 ms) with the real PWM limits and anti-windup is simulated, and each line of the spec is marked PASS or FAIL. Default: ζ = 0.7, ωn = 45 rad/s, Kp = 0.1206, Ki = 9.99, 5.8% overshoot, 113 ms settling, PWM peak 70%.
4. **Arduino code** from P3's `generateArduinoPID()`, with a copy button.
5. **Measure it yourself.** When the robot is built, paste a logged PWM step test (`time_ms, rpm`): the page finds K from the final speed and τ from the 63.2% point, compares them with the datasheet model, and redesigns the loop.

"Predict, then check": a heavier battery doubles the mass; with the same gains, what happens to the overshoot?

## Shared simulator (`pid-core.js`)

The homework asks for a time-stepping solver, not a closed form. Every Control page uses this one file, so all pages agree on the numbers.

- `simulate({...})` steps the closed loop with **RK4** (1 ms by default). Options: plant, `Kp`, `Ki`, `Kd`, setpoint `r`, sensor `tauS`, limits `uMin`/`uMax`, sampling time `Ts` (digital PID with zero-order hold), `antiWindup`.
- The PID is the digital law of the sheet, $u[k] = K_p e[k] + K_i T_s \sum e[j] + K_d (e[k]-e[k-1])/T_s$. A continuous PID is the same law updated every step.
- `loopMetrics(t, y)`: 10–90% rise time, overshoot, 2% settling time, steady-state error, and whether the run settled.
- `theoryP`, `theoryPI`, `designPI` (gains from a chosen ζ and ωn), `theorySensorPI` (largest stable Ki with a slow sensor).
- `validationChecks()`: the three checks below.

## Validation checks (PID)

For the plant $K/(\tau s+1)$ with $K = 1$, $\tau = 1$ s:

| # | Check | Expected | Simulated |
| :--- | :--- | :--- | :--- |
| 1 | P only, $K_p = 9$ | $\tau_{cl} = 0.1$ s, $e_{ss} = 10\%$ | 0.100 s, 10.0% |
| 2 | PI, $K_p = K_i = 1$ | $\omega_n = 1$ rad/s, $\zeta = 1$ | 1.00 rad/s, 1.00, no overshoot |
| 3 | Any PI | zero steady-state error | largest $\lvert e_{ss}\rvert$ = 5.6e-6 over 4 gain pairs |

---

## Screenshots

### Module 1: step and ramp
![Step response](screenshots/module1_step.png)
![Ramp response](screenshots/module1_ramp.png)

### Module 2: frequency response
![First-order frequency response](screenshots/module2.png)

### Module 3: second-order response
![Second-order response and state-space panel](screenshots/module3.png)

### Module 4: the bench and the score
![Module 4 bench](screenshots/module4_bench.png)
![Module 4 estimate and score](screenshots/module4_score.png)

---

## Files

| File | What it does |
| :--- | :--- |
| `index.html`, `hub.js` | Hub page, tea test and the validation board |
| `module1.html`, `app.js` | Module 1 |
| `module2.html`, `module2.js`, `frequency.js` | Module 2 page and its formulas |
| `module3.html`, `module3.js`, `second-order.js` | Module 3 page and its formulas |
| `module4.html`, `module4.js`, `sensor-game.js` | Module 4 page and its game maths |
| `module-assets/` | Shared theme, icons, plot helper, graph reader and quiz |
| `resources/` | Lecture slides and State-Space notes, offered for download on the hub |
| `*.test.js` | Numerical tests |
| `control.html`, `control.js` | PID Control hub: block diagram, live demo, validation board |
| `control-p1.html` … `control-p4.html`, `control-system.html` | The PID modules and the applied design (being added) |
| `pid-core.js` | Shared closed-loop simulator (RK4), metrics and PID theory |
| `control-p4.html`, `control-p4.js`, `tuning-challenge.js`, `module-assets/control-p4.css` | P4 page, its game maths (plants, spec, judging, score, reference design) and styles |
| `control-system.html`, `control-system.js`, `motor-model.js`, `module-assets/control-system.css` | My system page, the motor model from the datasheet, the design checks and the step-test fit |
| `module-assets/control.css` | Extra styles for the Control section |
| `HW2-TEAM-PLAN.md` | Team plan for Homework 2 |

## How to run

1. **Online:** open the live link: [https://bashar-ghosheh.github.io/](https://bashar-ghosheh.github.io/)
2. **Locally:** clone the repository and open `index.html` in any modern browser. Plotly and KaTeX load from CDNs, so an internet connection is needed.

Run the numerical tests from the repository root (Node 18 or newer):

```sh
node --test frequency.test.js second-order.test.js sensor-game.test.js notes-check.test.js pid-core.test.js tuning-challenge.test.js arduino-pid.test.js motor-model.test.js
```

`pid-core.test.js` checks the simulator against the three PID validation checks, closed-form closed-loop responses, the Module 3 second-order formula, the Routh limit for a slow sensor, saturation, anti-windup and the effect of the sampling time.

`notes-check.test.js` compares every closed-form formula in the toolkit with the RK4 simulator and the `eig2` function from Section 7.1 of the State-Space Modeling notes. The Module 4 test also plays 1200 random rounds as a "careful student" using the lecture methods, to confirm the game is fair.

---

## AI assistant disclosure

In accordance with the course guidelines (Section 8):

- **Module 1:** AI tools helped structure the HTML/CSS layout, set up the Plotly chart configuration and run browser tests. All formulas were reviewed against the course material.
- **Module 2:** Codex assisted with implementation, packaging and verification. Amro Qutna is responsible for reviewing and explaining the module's code and equations.
- **Module 3:** Codex assisted with implementation, packaging, numerical verification and repository integration. Tareq Ahmad is responsible for reviewing and explaining the module's code and equations.
- **Module 4, hub and integration:** Claude assisted with the implementation of Module 4 and the hub page, moving Module 1 to the shared theme, browser testing and this README. Ahmad AlSheikh is responsible for reviewing and explaining the module's code and equations.
- **PID Control hub, `pid-core.js` and P4 (Homework 2):** Claude assisted with the shared simulator and its tests, the Control hub page, the P4 tuning challenge and its tests, the shared header, run comparison, sweep chart and P3 checks added to P1–P3, the My system page and its motor model, and this README. Ahmad AlSheikh is responsible for reviewing and explaining this code and its equations.
- **P1 (Homework 2):** AI tools assisted with implementation review, bug fixes and verification of the PID playground page. Bashar Ghosheh is responsible for reviewing and explaining the module's code and equations.
- **P2 (Homework 2):** AI assistance covered implementation and verification of the sensor and pole-placement experiments.
- **P3 (Homework 2):** Codex assisted with the interactive sampling and anti-windup experiments, the Arduino sketch generator, and numerical and browser verification. Tareq Ahmad is responsible for explaining the module's code and equations.
