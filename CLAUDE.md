# Same Sun

## Project
- "Same Sun" is a mobile-first web game for the miniAgriPV project (Girl Scouts Beyond Bars x ASU Mary Lou Fulton College).
- Players are about 7th grade (ages 12-13).
- Source of truth: `docs/prototype/same-sun-prototype.html` for screens, wording, layout, colors and the simulation. `docs/game-concept.md` is background. Where they disagree, follow the prototype.

## Screens
- Five tabs: Home, Sun Day, Power (was "Build Lab"; Spanish "Energía"), Structure ("Estructura"), Growth Story. On screens narrower than 390 px the English Growth Story tab reads "Story" (Spanish stays "Mi historia"); screen readers always hear the full name. In code the tab is `power` (`src/views/Power.tsx`, `src/views/power/`); old storage keys such as `samesun:buildLabSolved` keep their names so saved progress loads.
- Power is one guided path in two stages: "Meet the parts" (10 part cards, each with a quick check) unlocks "Try it": 10 steps (the 7 SCN 202 Solar Card Deck missions, then the 3 bonus cards), then 3 Power challenges in their own section with their own counter (`STEPS` and `CHALLENGES` in `src/lib/learn.ts`), then the Sun Monitor. Learners can skip ahead.
- The free-wiring circuits use the watts budget in `src/lab/`; the deck missions use the volts/amps/watts model in `src/sim/electric.ts`.
- Saved progress: `samesun:learn` (steps), `samesun:parts` (quick checks). `migrate()` carries old Build Lab (now Power) levels (`samesun:buildLabSolved`) into the path; it only adds and never deletes old keys.
- Match the prototype. Tell me before changing a screen's content or flow.

## Stack
- Vite + React + TypeScript, SVG for scenes, Vitest for tests, vite-plugin-pwa for offline use.
- Structure (`src/views/Structure.tsx`, `src/views/structure/`, rules and data in `src/structure/` and `src/config/structure.json`): meet the materials, build a frame, test it, save it. Key idea: an adjustable panel needs a hinge and an angle stop. Saved as `samesun:structure`; saved designs go to Growth Story's "Build" step, tagged "From Structure". Optional 3D view of the frame (`Frame3D.tsx`), with the same rules as Power's 3D.
- 3D (Power's bench and Structure's frame): three and @react-three/fiber, pinned exact (+ @types/three, dev only). three.js is built into one lazy chunk, `three3d` (see `vite.config.ts`); it and the 3D views are not precached, only cached at runtime the first time 3D opens. React must stay in the main bundle. 2D must always work on its own.
- Photos on the part and material cards (`public/photos/`): openly licensed only (CC0, public domain, CC BY, CC BY-SA; no NC/ND), credited in `src/content/photo-credits.json` and on Home. Not precached; cached at runtime when first shown. Drawing is the default view.
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
- Power board layout: the app (`src/views/power/Board.tsx`) is the reference, not the prototype. Terminals were spread for 44 px targets; do not copy them back into `docs/prototype`.

## Workflow
- Work in small steps.
- Run `npm test` and `npm run build` before saying a step is done.
- Then commit with a clear message.
- Do not push unless I ask.
