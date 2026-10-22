# Same Sun

**Play it:**

- GitHub Pages: https://fiodesygp.github.io/same-sun/
- Vercel: _link to be added_

Same Sun is a short design-and-test game for the **miniAgriPV** project (Girl Scouts Beyond Bars × ASU Mary Lou Fulton College for Teaching and Learning Innovation). Players, about 7th grade, build a mini agrivoltaic system: a small solar panel above a plant, so one sunny spot makes energy and grows food.

**Our big question:** *In a desert where land, water, and shade are hard to come by, how can you use STEM to build a micro-lab that shows your family how one sunny space can grow food and power other things at once?*

- **Sun Day:** pick a plant, panel and day, predict, then watch a sunny Arizona day and see the Sun Score with feedback.
- **Power:** meet the parts of the kit (a card and a quick check for each), then try 10 steps: the seven SCN 202 Solar Card Deck missions (circuits, measuring, switch and dial, series and parallel) and three bonus missions; then three harder wiring challenges, and a Sun Monitor.
- **Structure:** meet the materials (cup, straws, rubber bands, pipe cleaners, craft sticks, cardstock, clothespins, tape), build a frame that holds the panel above the plant, and test it (angle, slip, wobble, heat, shade and a safety & prep check). An adjustable panel needs a hinge and an angle stop. Save the design, with its materials list and steps, to the Growth Story Card.
- **Growth Story Card:** add a photo and a few words at each step of the real project.

It works on phones, tablets and computers, in English and Spanish, and offline after the first visit. The Power bench can also be shown in 3D: that part (about 240 KB zipped) downloads only the first time someone opens it, then works offline too. Devices without WebGL, with reduced motion on, or that look low-power start in 2D.

## Privacy: everything stays on the device

Players are minors, so the game has no accounts, no backend, no analytics and no tracking. Growth Story entries and photos are stored only in the browser on the device (IndexedDB); the last Sun Day design, test runs, Power progress and language choice are stored in localStorage. Nothing is uploaded or shared. Clearing the browser's site data removes it all.

## For adults: the numbers are estimates

The simulation is built for learning, not for engineering. Its numbers (sunlight, panel power, leaf temperature, soil water, growth) are estimates chosen to behave sensibly, not measurements. They all live in one file, [`src/config/model.json`](src/config/model.json), so the team can tune them once the real kit has been measured. The game says this to players in one line at the bottom of the Home page.

## Run it locally

Needs Node.js 20.19 or newer (the current LTS is fine).

```sh
npm install
npm run dev        # http://localhost:5173/same-sun/
npm test           # unit tests (Vitest)
npm run build      # production build in dist/
npm run preview    # serve the build at http://localhost:4173/same-sun/ (offline mode works here)
```

To try it on a phone on the same Wi-Fi: `npm run dev -- --host`, then open the Network address Vite prints, ending in `/same-sun/`.

## How deployment works

The same code deploys to two places. Both rebuild on every push to `main`.

| | GitHub Pages | Vercel |
|---|---|---|
| Address | `https://fiodesygp.github.io/same-sun/` | the project's Vercel domain, at `/` |
| Base path | `/same-sun/` | `/` |
| Triggered by | [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) (or "Run workflow" in the Actions tab) | Vercel's Git integration for this repository |
| Steps | `npm ci`, `npm test`, `npm run build`, publish `dist/` | `npm ci`, `npm test && npm run build`, publish `dist/` (set in [`vercel.json`](vercel.json)) |
| Unknown addresses | `404.html` (generated at build time) sends visitors back to the app | a rewrite in `vercel.json` serves `index.html` |

If the tests or build fail, nothing is published on either host.

**Base path.** `vite.config.ts` uses `/` when the `VERCEL` environment variable is set (Vercel sets it during its builds) and `/same-sun/` otherwise. The asset links, the app manifest's `start_url` and `scope`, the service worker and the 404 page all follow that one value. To build the Vercel version locally: `VERCEL=1 npm run build`, then `VERCEL=1 npm run preview` and open `http://localhost:4173/`.

**Updates.** On Vercel, `vercel.json` sends `Cache-Control: no-cache` for `sw.js` and `index.html`, so players get new versions quickly. Hashed files in `assets/` can be cached for a long time.

**No tracking.** Do not turn on Vercel Analytics, Speed Insights or any other tracking; see the privacy note above.

## Project layout

- `src/sim/`: the simulation, feedback rules and challenges (pure functions, unit tested); `electric.ts` is the volts/amps/watts model for the Power deck missions
- `src/config/model.json`: every simulation constant, to tune with the real kit
- `src/i18n/en.json`, `src/i18n/es.json`: all UI text
- `src/lab/`: the Power circuit checker
- `src/structure/`, `src/config/structure.json`: Structure's materials, options and rule model (pure, unit tested)
- `src/views/structure/`: Structure's builder, drawings, tests and save page
- `src/views/power/`: the Power board (2D, and `Board3D.tsx` for 3D), steps, bench, Sun Monitor and part cards
- `src/components/parts/`: the part drawings shared by the part cards, the board and the bench
- `src/lab/board.ts`: what the board shows for a circuit, shared by the 2D and 3D views
- `src/views/`, `src/components/`, `src/styles/`: screens and styles
- `docs/`: the prototype (`docs/prototype/same-sun-prototype.html`) and the game concept
- `CLAUDE.md`: project rules for contributors

Fonts: Montserrat and Source Sans 3, self-hosted under the SIL Open Font License (`public/fonts/`).
