# miniAgriPV Game Concept

Oct 14, 2026 · @Fiodesy Putri

## Overview

**Same Sun** is a short design-and-test game where players build a virtual mini agrivoltaic plot, run sunny Arizona days, and balance plant health against solar energy. It turns the project's driving question into play: *In a desert where land, water, and shade are hard to come by, how can you use STEM to build a micro-lab that shows your family how one sunny space can grow food and power other things at once?*

- **Where it lives:** a new "Game" page on the miniAgriPV site, playable on a phone or laptop browser.
- **Who plays:** Girl Scouts in the Girl Scouts Beyond Bars × ASU Mary Lou Fulton College program, alone at home or with a family member.
- **Why a game:** the physical kit takes days to show plant results. The game compresses a week into minutes, so players can try many designs, then test their best idea on the real kit.
- **What it is not:** a replacement for the hands-on build. The game sends players back to the real panel, wires and seedling at every stage.

## Learning goals

By the end, a player can explain one trade-off between shade and energy and defend a design choice with evidence from a test.

| Goal | What the player does in the game | Possible NGSS link |
| --- | --- | --- |
| Energy transfer | Connects panel to fan and LED; sees sunlight become motion and light | 4-PS3-2, 4-PS3-4 |
| Plant needs | Tracks how light, heat and water change seedling growth | 5-LS1-1, 3-LS1-1 |
| Shade trade-off | Moves panel height, tilt and gap; watches energy and growth shift | 3-5-ETS1-1 |
| Engineering design | Predicts, tests, compares designs, then improves one | 3-5-ETS1-2, 3-5-ETS1-3 |
| Circuits basics | Fixes polarity and parallel wiring in a puzzle | 4-PS3-2 |

Standards codes are a starting suggestion; the team should confirm the grade band before locking them.

## Core loop

The game repeats one engineering cycle in about two minutes, and every few loops it hands the player back to the physical kit.

&#91;embedded content: core loop · 4 steps, a redesign loop, a hand-off to the real kit\]

The Journal closes the outer loop: real observations from the kit are compared with the game's prediction for the same design.

## Game modes

Four modes, each mirroring a real step of the build. Build Lab and Sun Day are the MVP; Challenges and Family Mode come next.

**1. Build Lab** — assemble the kit on screen.

- *Wiring puzzle:* drag red and black leads from panel to motor and LED. Wrong LED polarity stays dark; swapped motor wires spin the fan backwards. Unlocks parallel wiring with two loads, then a pump level where the pump and fan share one panel.
- *Frame builder:* place sticks to lift the panel above the dome. A wobble test pushes the frame; only frames with triangles stay standing.
- Ends with a "Try it for real" card pointing to the matching step on the physical kit.

**2. Sun Day** — the core sandbox.

- Set panel height, tilt, gap between panels, crop, and what the panel powers (fan, LED, water pump, or a mix).
- Press play to run one Arizona day from sunrise to sunset in about 60 seconds, or a 7-day week.
- Live gauges: energy made, fan running time, water pumped, tank level, leaf temperature, soil moisture, plant growth.
- A Sun Score shows both results side by side, so neither energy nor food can win alone.

**Solar watering** — a pump add-on inside Sun Day.

- A small tank feeds the pot through a tube. The pump runs on panel power, so it waters only while the sun shines, which is also when the plant dries out fastest.
- Three watering modes: *By hand* (water each morning), *Sun-timed pump* (runs whenever there is enough power, like the simplest real kit), and *Smart pump* (runs only when soil moisture falls below a trigger the player sets).
- Trade-offs to discover: the pump shares power with the fan; a low panel or narrow gap can starve the pump; a trigger set too wet floods the roots; a small tank runs dry mid-week.
- A power-priority switch lets the player choose which load runs first when there is not enough power for both.
- Real-kit link: a 3–5 V mini submersible pump and tubing, wired like the fan, gives the sun-timed mode. The smart mode needs a moisture-sensor switch module or a small microcontroller, so it fits best as an extension activity. Keep the tank below and away from the panel and wires.

**3. Challenges** — short goals with constraints.

- "Keep the lettuce alive through a 108 °F week."
- "Run the fan all afternoon without stunting the plant."
- "Grow the most food while the LED still lights at noon."
- "Keep the soil moist all week with one tank fill and no hand watering."
- Each challenge saves the player's best design as a card.

**4. Family Mode and Journal** — play and record together.

- Two players take roles: Energy Engineer and Plant Scientist. Each sees one goal, and they must agree on one design.
- The Journal logs real kit observations (photo optional, soil moisture, plant height) next to the game's prediction for the same design.

## Fit with the project arc

Each step of the arc unlocks one slice of the game, so play always lands right before or after hands-on work. Session and task goals are still placeholders on the site; this mapping should be updated once they are set.

| Arc step | Game slice | Real-world link |
| --- | --- | --- |
| Session 1 · Troop · Launch | Build Lab wiring puzzle; first Sun Day with a preset design | Wire the real panel to fan and LED |
| At home 1 | Sun Day sandbox; make a prediction for the real kit | Plant the seed, place the frame, write the prediction |
| Session 2 · Family · Share & Advance | Family Mode: two roles, one shared design | Agree on a redesign of the real setup |
| At home 2 | Journal: log soil moisture and growth, compare to the game | Measure with the soil-moisture video tutorial |
| Session 3 · Troop · Reflect & Wrap-up | Challenge showcase; best design card | Present the real setup and what changed |

## Simulation model

The model is deliberately simple and explainable: hourly steps, a handful of variables, and every constant in one config file the team can tune after testing the real kit. It should feel right to a 10-year-old, not match a physics lab.

**Player inputs:** panel height (low, mid, high), tilt (0–45°), gap between panels (none, small, wide), crop, loads (fan, LED, water pump, or a mix), power priority, weather preset (October, July heat wave), watering mode (by hand, sun-timed pump, smart pump with a moisture trigger), tank size.

**Each hour from 6:00 to 19:00:**

1. Sunlight follows a smooth arc that peaks at midday.

```latex
S(h) = S_{max} \cdot \max\left(0, \sin\frac{\pi (h - 6)}{13}\right)
```

2. Panel power depends on sun, panel size and how close the tilt is to the sun's angle that hour.

```latex
P(h) = S(h) \cdot A_{panel} \cdot \eta \cdot \cos(\lvert \theta_{tilt} - \theta_{sun}(h) \rvert)
```

3. Shade on the plant grows with panel cover and shrinks with a wider gap or a higher panel (more side light gets in).

```latex
L(h) = S(h) \cdot \left(1 - c\right) + 0.15 \cdot S(h) \cdot c, \quad c = cover \cdot (1 - gap) \cdot (1 - k_{height})
```

4. The fan runs when panel power passes its start threshold; the LED lights above its own threshold. A running fan lowers leaf temperature by a few degrees.
5. Leaf temperature = air temperature + a heating term from direct light − fan cooling.
6. Soil moisture drops faster with more light and heat. Hand watering refills it each morning; the pump adds water each hour it runs, until the tank is empty.
7. Growth that hour = crop max rate × light factor × temperature factor × water factor, each between 0 and 1.

**Pump logic.** The pump runs in an hour only when all three conditions hold, and each running hour moves a fixed amount of water from the tank into the soil.

```latex
pump_{on}(h) = \left(P_{avail}(h) \ge P_{pump}\right) \land \left(M(h) < M_{trigger}\right) \land \left(V_{tank}(h) > 0\right)
```

P\_avail is the panel power left after the priority load. Sun-timed mode drops the moisture condition. Soil above field capacity counts as waterlogged and lowers the water factor in step 7, so overwatering is possible.

**Sun Score** borrows the land equivalent ratio idea used for real agrivoltaics: food as a share of a full-sun plot, plus energy as a share of an unshaded panel. A total above 100% means sharing the space beat using it for one thing only.

```latex
SunScore = \frac{Growth_{design}}{Growth_{full\ sun}} + \frac{Energy_{design}}{Energy_{panel\ only}}
```

**Starter crops** (relative values, to calibrate):

| Crop | Light need | Comfort band (°F) | Stress above (°F) | Water use | What it teaches |
| --- | --- | --- | --- | --- | --- |
| Lettuce | Low | 55–75 | 85 | Medium | Shade helps in desert heat |
| Basil | Medium | 65–85 | 95 | Medium | A middle balance |
| Bush bean | Medium | 65–85 | 95 | Medium | Fast visible growth |
| Chili pepper | High | 70–90 | 100 | Low | Too much shade hurts |

Temperatures use °F for a US audience; panel, motor and LED thresholds should be measured on the real kit and entered in the config rather than guessed.

## Feedback and plan prompts

Every test run is framed by a prediction before and explanatory feedback after, and every session ends with a concrete if-then plan for the at-home task.

**Before a run: predict.** One tap plus one sentence starter: "I think the plant will grow *more / the same / less* because …". Predictions are saved so the result can be compared to them.

**After a run: explain, not just score.** Feedback has three short parts:

1. *What happened:* "Your lettuce grew 40% less than yesterday."
2. *Why:* one cause tied to one variable. "The wide gap let midday sun through, and leaf temperature passed 85 °F for 4 hours."
3. *Try next:* one suggestion, not the answer. "What could block the hottest hours without losing all the light?"

A hint ladder gives more help only when the player asks: a question, then a pointed hint, then a worked example.

**End of a session: make a plan.** Before leaving, the player builds an if-then plan for the at-home task from sentence starters.

- "When I get home on *\[day\]*, I will check the soil and write the number in my journal."
- "If the leaves look droopy, then I will *\[water / move the panel lower\]*."

The plan shows on the Journal page and as a printable card, so it also works for players without a device at home.

## Design constraints

The players are minors in a program serving families affected by incarceration, so privacy and access shape every feature.

- **No accounts, no personal data.** Progress saves on the device only. The Journal never asks for names, locations or details about family members. Photo upload stays optional and local.
- **Works without the internet after first load.** Offline play covers spotty home connections and settings where devices may be limited.
- **Unplugged twin.** Every game slice has a printable version (design cards, prediction sheet, plan card), so no player is left out where screens are not allowed.
- **Short sessions.** One Sun Day run takes about a minute; a full mode takes 5–10 minutes.
- **Language.** English and Spanish from the start, matching the site's printable guides; all text in one strings file so more languages can be added.
- **Reading level and audio.** Short sentences around a grade 3–4 reading level, with a read-aloud button on every instruction.
- **Accessible by default.** Keyboard and touch controls, labels as well as color on wires (+ red, − black), captions on video, WCAG 2.2 AA contrast.
- **Tone.** Encouraging and low-stakes: no lives, no timers that punish, and a failed design is framed as data.

## Tech approach and MVP

Build a static web app that drops into the miniAgriPV site as a "Game" page, with the simulation in plain TypeScript so it can be tested apart from the visuals.

**Suggested stack:** Vite + React + TypeScript, SVG for the scene (crisp, easy to label, accessible), a pure `simulate(design, weather, days)` function, constants in `config/model.json`, strings in `i18n/en.json` and `i18n/es.json`, localStorage for saves, and a PWA service worker for offline play.

**MVP (first build):**

- [ ] Sun Day sandbox with height, tilt, gap, crop and loads, including the solar water pump and its three watering modes
- [ ] One-day and seven-day runs with live gauges and the Sun Score
- [ ] Predict-before and explain-after feedback
- [ ] Build Lab wiring puzzle (single loads, then parallel)
- [ ] English and Spanish strings, read-aloud on instructions
- [ ] Unit tests for the simulation (shade lowers leaf temperature, wider gap raises growth, no sun means no power)

**Next:** frame builder with wobble test, Challenges, Family Mode roles, Journal with real-vs-predicted comparison, printable cards.

## Open questions

- [ ] What age and grade band are the players? This sets reading level and the standards to cite.
- [ ] Are devices allowed during troop and family sessions, or should the game be at-home only with printables in session?
- [ ] Where are family sessions held, and can both people use one screen together?
- [ ] Which crop does the real kit use, so the game's default matches?
- [ ] What are the measured voltages and start thresholds of the kit's panels, motor and LED?
- [ ] Will the kit add a mini pump and tubing, and can the large panel start it in full sun?
- [ ] Is the smart pump (moisture-sensor switch or microcontroller) in scope for the real kit, or game-only?
- [ ] Is a soil-moisture tool in the kit, or is moisture checked by finger test?
- [ ] Is Spanish enough for launch, or are other languages needed?
- [ ] Will the team collect any gameplay data for research? If yes, it needs IRB review and a consent design before any logging is added.

## Claude Code kickoff prompt

Copy this into Claude Code to start the MVP. Export this doc as Markdown and save it in the repo as `docs/game-concept.md` first, so Claude Code can read the full spec.

```markdown
Read docs/game-concept.md. It is the concept for "Same Sun", a web game for the miniAgriPV project (Girl Scouts Beyond Bars x ASU). Build the MVP listed in the "Tech approach and MVP" section.

Stack: Vite + React + TypeScript, SVG for the scene, no backend, no accounts, localStorage for saves, PWA for offline play.

Order of work:
1. Create src/sim/simulate.ts as a pure function simulate(design, weather, days) that returns hourly values (sun, panel power, plant light, leaf temperature, soil moisture, growth, fan on, LED on, pump on, water pumped, tank level) plus a Sun Score. Follow the "Simulation model" section. Put every constant in config/model.json.
2. Write unit tests (Vitest) for the simulation first: no sun means no power; more shade lowers leaf temperature; a wider gap raises plant light; a running fan lowers leaf temperature; the pump runs only with enough power, soil below the trigger and water in the tank; sun-timed mode ignores the trigger.
3. Build the Sun Day screen: controls for panel height, tilt, gap, crop, loads, weather preset, power priority, watering mode (by hand, sun-timed pump, smart pump with a moisture trigger) and tank size; a side-view SVG scene; live gauges; a 60-second day playback; a 7-day option.
4. Add predict-before and explain-after feedback as described in "Feedback and plan prompts".
5. Build the Build Lab wiring puzzle: drag red and black leads; LED polarity matters; motor wires reversed spin the fan backwards; then a parallel level with fan and LED, then a pump level where pump and fan share one panel.
6. Put all UI text in i18n/en.json and i18n/es.json with a language toggle, and add a read-aloud button using the Web Speech API.

Constraints: no personal data collection, no analytics, WCAG 2.2 AA, touch and keyboard friendly, short sentences for young readers. Ask me before adding any dependency beyond React, Vite and Vitest. Show me the simulation and its tests before building the UI.
```

For the full step-by-step build, the prompt sequence and GitHub Pages deployment, use Build and deploy guide.
