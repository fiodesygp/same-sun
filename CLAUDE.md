# Same Sun

## Project
- "Same Sun" is a mobile-first web game for the miniAgriPV project (Girl Scouts Beyond Bars x ASU Mary Lou Fulton College).
- Players are about 7th grade (ages 12-13).
- Source of truth: `docs/prototype/same-sun-prototype.html` for screens, wording, layout, colors and the simulation. `docs/game-concept.md` is background. Where they disagree, follow the prototype.

## Screens
- Four tabs: Home, Sun Day, Build Lab, Growth Story.
- Build Lab is one guided path in two stages: "Meet the parts" (10 part cards, each with a quick check) unlocks "Try it" (13 steps: the 7 SCN 202 Solar Card Deck missions, then the Build Lab challenges and the bonus cards, in `PATH` in `src/lib/learn.ts`), plus the Sun Monitor. Learners can skip ahead.
- The free-wiring circuits use the watts budget in `src/lab/`; the deck missions use the volts/amps/watts model in `src/sim/electric.ts`.
- Saved progress: `samesun:learn` (steps), `samesun:parts` (quick checks). `migrate()` carries old Build Lab levels (`samesun:buildLabSolved`) into the path; it only adds and never deletes old keys.
- Match the prototype. Tell me before changing a screen's content or flow.

## Stack
- Vite + React + TypeScript, SVG for scenes, Vitest for tests, vite-plugin-pwa for offline use.
- Ask before adding any other dependency.

## Hosting
- Static site on GitHub Pages at `/same-sun/` and on Vercel at `/`. The base path comes from the `VERCEL` env var in `vite.config.ts`; never hard-code `/same-sun/`.
- Never enable Vercel Analytics, Speed Insights or any other tracking.
- No backend, no accounts, no analytics. Nothing leaves the device.

## Privacy
- Players are minors.
- Growth Story entries and photos stay on the device only.
- Never add upload, sharing or tracking without my approval.

## Keep it simple
- For 7th graders: few controls, short sentences.
- Big tap targets (at least 44 px). No hover-only interactions.
- Mobile first: design for a 360 px wide phone in portrait, then scale up.
- Three layouts (media queries listed at the top of `src/styles/app.css`): phone under 600 px (tabs in a bottom bar); tablet portrait 600–1023 px; wide = tablet landscape or 1024 px and up (content max 1200 px). Keep the Sun Day scene under 45% of the screen height.

## Accessibility
- WCAG 2.2 AA contrast.
- Keyboard and screen-reader friendly.
- Never use color alone (wires show + and - labels).
- Respect `prefers-reduced-motion`.

## Language
- All UI text lives in `src/i18n/en.json` and `src/i18n/es.json`.

## Simulation
- Pure functions in `src/sim/`.
- Every constant in `src/config/model.json`.
- Covered by unit tests.

## Decisions
- Tap targets: raise every control to at least 44 px, including ones the prototype has smaller (tabs, sentence starters, text links, Back). Keep everything else the same.
- Fonts: ship Montserrat (600, 700, 800) and Source Sans 3 (400, 600, 700) as woff2 files in the repo. No Google Fonts requests, no font package.
- Scope: leave out concept-doc features the prototype lacks (read-aloud, Family Mode, LED in Sun Day, bush bean, tilt/gap/priority/tank controls). Follow the prototype.
- Spanish: `es.json` has the same keys as `en.json`, with English text as placeholders for now. Claude drafts the Spanish later; a native speaker on the team reviews it before launch.
- Reading level: 7th grade (ages 12-13). Keep the prototype's wording.
- Naming: the tab label is "Growth Story". The page heading and the Home card say "Growth Story Card". In code, use `growthStory` for the component, files and storage keys. Never "plan" or "journal".
- Build Lab layout: the app (`src/views/buildLab/Board.tsx`) is the reference, not the prototype. Terminals were spread for 44 px targets; do not copy them back into `docs/prototype`.

## Workflow
- Work in small steps.
- Run `npm test` and `npm run build` before saying a step is done.
- Then commit with a clear message.
- Do not push unless I ask.
