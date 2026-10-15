# Same Sun

**Play it:** https://fiodesygp.github.io/same-sun/

Same Sun is a short design-and-test game for the **miniAgriPV** project (Girl Scouts Beyond Bars × ASU Mary Lou Fulton College for Teaching and Learning Innovation). Players, about 7th grade, build a mini agrivoltaic system: a small solar panel above a plant, so one sunny spot makes energy and grows food.

- **Sun Day:** pick a plant, panel and day, predict, then watch a sunny Arizona day and see the Sun Score with feedback.
- **Build Lab:** wire the panel to a fan, an LED, both, or a water pump.
- **Growth Story Card:** add a photo and a few words at each step of the real project.

It works on phones, tablets and computers, in English and Spanish, and offline after the first visit.

## Privacy: everything stays on the device

Players are minors, so the game has no accounts, no backend, no analytics and no tracking. Growth Story entries and photos are stored only in the browser on the device (IndexedDB); the last Sun Day design, test runs and language choice are stored in localStorage. Nothing is uploaded or shared. Clearing the browser's site data removes it all.

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

Every push to `main` runs [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml): it installs dependencies, runs the tests, builds, and publishes `dist/` to GitHub Pages. If the tests or build fail, nothing is published. The workflow can also be started by hand from the Actions tab ("Deploy to GitHub Pages" → Run workflow).

The site lives under `/same-sun/`, set as `base` in `vite.config.ts` and as the app manifest's `start_url` and `scope`. `public/404.html` sends any other address back to the app.

## Project layout

- `src/sim/`: the simulation, feedback rules and challenges (pure functions, unit tested)
- `src/config/model.json`: every simulation constant, to tune with the real kit
- `src/i18n/en.json`, `src/i18n/es.json`: all UI text
- `src/lab/`: the Build Lab circuit checker
- `src/views/`, `src/components/`, `src/styles/`: screens and styles
- `docs/`: the prototype (`docs/prototype/same-sun-prototype.html`) and the game concept
- `CLAUDE.md`: project rules for contributors

Fonts: Montserrat and Source Sans 3, self-hosted under the SIL Open Font License (`public/fonts/`).
