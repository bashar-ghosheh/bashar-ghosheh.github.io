# Homework 2 · PID Control Toolkit · Team plan

Internal notes for the four of us. The public pages (`index.html`, `control.html` and the modules) are written for Dr. Wasel Ghanem and for future students, so the work split, grading points and deadlines live here instead.

- **Live hub:** [control.html](https://bashar-ghosheh.github.io/control.html)
- **Shared simulator:** `pid-core.js` (tests: `pid-core.test.js`)

---

## 1. Who does what

| Member | Owns | Page(s) | GitHub issue |
| :--- | :--- | :--- | :--- |
| **Bashar Ghosheh** | P1 · PID playground, plus the P1 side of the validation checks | `control-p1.html` | P1 |
| **Amro Qutna** | P2 · A slow sensor in the loop, and the My system page | `control-p2.html`, `control-system.html` | P2, My system |
| **Tareq Ahmad** | P3 · Digital PID and the Arduino code generator | `control-p3.html` | P3 |
| **Ahmad AlSheikh** | P4 · Tuning challenge, Control hub, shared simulator, README, release v2.0 | `control-p4.html`, `control.html`, `pid-core.js` | P4 |

Everyone also:

- writes the **Predict, then check** box of their own page (2–3 questions),
- commits from their **own GitHub account** (graded),
- can explain **every line of code and every equation** on their page in the demo.

The motor measurement for My system (PWM step test with the encoder) needs the whole team.

---

## 2. What each page must show

| Page | The user can change | The page must show |
| :--- | :--- | :--- |
| **P1** PID playground | Plant (first order from Module 1 or second order from Module 3), Kp, Ki, Kd, setpoint step | Block diagram, output against setpoint, control signal u with its limit, live rise time, overshoot, settling time, steady-state error |
| **P2** Slow sensor | Sensor τs in the feedback path, PID gains | True output y and sensor reading ym on the same plot. As τs grows, overshoot grows until the loop oscillates |
| **P3** Digital PID | Ts, gains, anti-windup on/off | Stair-step u, performance falling as Ts grows, Arduino loop code for the current gains with a Copy button |
| **P4** Tuning challenge | PID gains | Hidden random plant (reuse Module 4), a spec (e.g. overshoot ≤ 10%, settling-time limit, zero error), pass/fail per line, score |
| **My system** | — | Plant model and the source of its numbers, the spec and why, final gains, simulated response, generated Arduino code |

### My system: the micromouse drive motor

1. PWM step test (e.g. 0 → 50%), log speed from the encoder.
   K = Δspeed / ΔPWM, τ = time to reach 63% of the final speed. If we cannot measure, use the datasheet and **cite it on the page**.
2. Spec: **0.6 ≤ ζ ≤ 0.8** (practical range from the lecture) and **PWM inside 0–100%**.
3. Design the PI directly: `designPI(K, tau, zeta, wn)` gives `Ki = ωn²τ/K` and `Kp = (2ζωnτ − 1)/K`.
4. Check in the simulator that u never leaves 0–100%, then generate the Arduino code.

---

## 3. Grading (100 points)

| Criterion | Points | Owner |
| :--- | :---: | :--- |
| P1 PID playground | 20 | Bashar |
| P2 Slow sensor in the loop | 15 | Amro |
| P3 Digital PID | 15 | Tareq |
| P4 Tuning challenge | 10 | Ahmad |
| Applying it to our project (My system) | 15 | Amro + everyone for the measurement |
| Validation checks (all three pass) | 5 | Shared simulator (already passing) |
| Teaching value and GitHub practice | 10 | Everyone (Ahmad coordinates) |
| Demo and individual questions | 10 | Each member, own module |
| **Bonus** (one of: real hardware vs simulation, Ziegler–Nichols, state-space pole placement) | +10 | Open |

A missed checkpoint costs 5 points. Copying another group = zero for both groups. AI use is allowed but must be listed in the README.

---

## 4. Dates

| Date | Milestone | Status |
| :--- | :--- | :--- |
| Mon 16 Nov 2026 | Released | ✓ |
| Thu 19 Nov 2026 | Checkpoint: P1 and P2 working on the live link | **missed: get P1 and P2 live first** |
| Mon 23 Nov 2026 | Final release tagged **v2.0** + Pages link on the course page | |
| From Tue 24 Nov 2026 | Demos, 10 minutes per group plus questions | |

Plan for the last days:

- **Sat 21:** shared simulator and Control hub (done). Start P1 and P2. Open the GitHub issues. Run the motor step test.
- **Sun 22:** P1–P4 and My system complete.
- **Mon 23:** test on a phone, update README, check issues and commits, tag v2.0.

---

## 5. How to build a page (rules)

1. **File name:** `control-p1.html`, `control-p2.html`, `control-p3.html`, `control-p4.html`, `control-system.html`. The hub cards and the nav already link to these names, and each card switches to "Ready to explore" as soon as the page is online.
2. **Header:** copy the `<head>` and the nav bar from `control.html`. Load `module-assets/styles.css` and `module-assets/control.css`.
3. **Simulation:** never write a second simulator. Load the shared one:

   ```html
   <script defer src="pid-core.js"></script>
   ```

   ```js
   const run = simulate({
     plant: firstOrder(1, 1),         // or secondOrder(K, zeta, wn)
     Kp: 9, Ki: 0, Kd: 0,
     tauS: 0,                         // P2: sensor time constant
     uMin: 0, uMax: 100,              // P1/P3: control limit
     Ts: null, antiWindup: false,     // P3: digital PID
     T: 10,
   });
   const m = loopMetrics(run.t, run.y); // rise, overshoot, settle, ess, final, settled
   // run.t, run.y (true output), run.ym (sensor reading), run.u (control signal)
   ```

   The function is `loopMetrics`, not `metrics`: `second-order.js` already has a `metrics`, and the two would clash on one page.
4. **Plots and cards:** use `plot()`, `trace()`, `checkRow()`, `verdict()` and `bindModel()` from `module-assets/shared.js`, so the page matches the theme in light and dark mode.
5. **Comments:** cite the sources like the Homework 1 files: `[HW2 §x]`, `[SLIDES n]`, `[NOTES §x]`.
6. **Before pushing:** `node --test pid-core.test.js` (and the other tests) must pass. Then close your issue.
7. **Committing with `commit.bat`:** put only the files you changed inside `upload\` (same folders as the repo), double-click, check the list, type a message, press Y. Do not leave old copies of other people's files in `upload\`.

---

## 6. Final checklist (v2.0)

- [ ] "Control" section linked from the landing page (done: nav link and banner on `index.html`)
- [ ] Own closed-loop simulation with RK4 (done: `pid-core.js`)
- [ ] P1, P2, P3, P4 and My system online
- [ ] One GitHub issue per module, assigned to its owner
- [ ] README lists the new modules and their owners, and the AI use
- [ ] Works on a phone
- [ ] Every member's commits visible
- [ ] Release tagged **v2.0**, Pages link on the course page
