# Dynamic Characteristics Interactive Toolkit

Interactive web toolkit for sensor dynamic characteristics, built for **ENCS4380 Interfacing Techniques** at Birzeit University.

- **Live Site:** [https://bashar-ghosheh.github.io/](https://bashar-ghosheh.github.io/)
- **Instructor:** Dr. Wasel Ghanem

---

## Team Members & Responsibilities

| Member | Assigned Module | Milestone | Status |
| :--- | :--- | :--- | :--- |
| **Bashar Ghosheh** | **Module 1: First-Order Time Response** | Checkpoint 1 | Completed |
| **Amro Qutna** | Module 2: First-Order Frequency Response | Checkpoint 2 | Completed |
| **Tareq Ahmad** | Module 3: Second-Order Response | Checkpoint 2 | In Progress |
| **Ahmad AlSheikh** | Module 4: Guess the Sensor Challenge | Final Release | Backlog |

---

## Module 1: First-Order Time Response

Models a first-order sensor (such as a mercury thermometer) governed by:
$$\tau \dot{y} + y = K x(t) \iff G(s) = \frac{K}{\tau s + 1}$$

### Features:
- **Interactive Controls:** Sliders for gain $K$, time constant $\tau$, input waveform (step or ramp), and input magnitude.
- **Step Response:** Displays the closed-form curve $y(t) = KA(1 - e^{-t/\tau})$, final steady-state line $KA$, and markers at $\tau$ (63.2%) and $3\tau$ (95.0%).
- **Ramp Response:** Displays the curve $y(t) = Kr[t - \tau(1 - e^{-t/\tau})]$, steady-state line, time lag $\tau$, and steady-state error $e_{ss} = Kr\tau$.
- **Log Error Plot:** Plots $\ln(e(t)/e(0)) = -\frac{1}{\tau}t$ against time to show a straight line with dynamic slope $m = -1/\tau$.
- **Predict, Then Check:** Allows users to guess the output or time lag before checking against the theoretical value.
- **Validation Check 1:** Verifies that $y(\tau) = 0.632\,KA$ and $y(3\tau) = 0.950\,KA$ with PASS indicators.

---

## Screenshots

### Step Response
![Step Response](screenshots/module1_step.png)

### Ramp Response
![Ramp Response](screenshots/module1_ramp.png)

---

## How to Run

1. **Online:** Visit the live GitHub Pages link: [https://bashar-ghosheh.github.io/](https://bashar-ghosheh.github.io/)
2. **Locally:** Clone the repository and open `index.html` in any modern web browser.

---

## AI Assistant Disclosure
In accordance with course guidelines (Section 8), AI tools were used to help structure the HTML/CSS layout, set up the Plotly chart configurations, and run automated browser tests. All formulas and physics logic were reviewed and verified against course materials.
