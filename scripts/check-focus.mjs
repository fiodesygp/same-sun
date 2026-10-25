// Keyboard check for the part and material cards (Power "Meet the parts", Structure "Meet the materials").
// Serves the production build with `vite preview`, opens it in a local headless Chrome and presses real
// keys (Tab, Shift+Tab, arrow keys) at 1280 x 800, in English and Spanish, in Drawing and Photo view.
// It checks that focus goes Back > Photo/Drawing toggle > picture > selected tab > tab text > quick check
// > end of page, that Shift+Tab is the exact reverse, that the tab list is one Tab stop and that arrow
// keys move between tabs.
//
// Run: npm run check:focus (builds first). Needs Chrome or Chromium, and Node 22+ (built-in WebSocket).
// Set CHROME_PATH if Chrome is somewhere unusual. No dependencies beyond the repo's own Vite.
import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const PORT = 4317
const BASE = process.env.VERCEL ? '/' : '/same-sun/'
const URL = `http://localhost:${PORT}${BASE}`
const sleep = ms => new Promise(r => setTimeout(r, ms))

const CHROMES = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
].filter(Boolean)
const chromePath = CHROMES.find(p => existsSync(p))
if (!chromePath) {
  console.error('check:focus needs Chrome or Chromium. Install it, or set CHROME_PATH to its program file.')
  process.exit(2)
}
if (typeof WebSocket === 'undefined') {
  console.error('check:focus needs Node 22 or newer (for the built-in WebSocket).')
  process.exit(2)
}
if (!existsSync('dist/index.html')) {
  console.error('No build found in dist/. Run `npm run check:focus` (it builds first) or `npm run build`.')
  process.exit(2)
}

// --- start the preview server and Chrome; stop both on any exit ---
const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' })
const profile = mkdtempSync(join(tmpdir(), 'samesun-focus-'))
const chrome = spawn(chromePath, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' })
let cleaned = false
function cleanup() {
  if (cleaned) return
  cleaned = true
  chrome.kill(); vite.kill()
  try { rmSync(profile, { recursive: true, force: true }) } catch { /* Chrome may still hold files */ }
}
process.on('exit', cleanup)
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { cleanup(); process.exit(130) })

async function waitUntil(what, test, ms = 20000) {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) { try { const v = await test(); if (v) return v } catch { /* not ready */ } await sleep(250) }
  throw new Error('timed out waiting for ' + what)
}

// --- a tiny DevTools protocol client ---
await waitUntil('the preview server', async () => (await fetch(URL)).ok)
const port = await waitUntil('Chrome', () => readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0])
const target = await waitUntil('a Chrome page', async () => (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(t => t.type === 'page'))
const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j })
let id = 0
const pending = new Map(), errors = []
ws.onmessage = m => {
  const d = JSON.parse(m.data)
  if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id) }
  else if (d.method === 'Runtime.exceptionThrown') errors.push(d.params.exceptionDetails.exception?.description?.slice(0, 200))
  else if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errors.push(d.params.args.map(a => a.value ?? a.description).join(' ').slice(0, 200))
}
const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })
async function ev(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })
  if (r.result.exceptionDetails) throw new Error(expr.slice(0, 80) + ': ' + r.result.exceptionDetails.exception?.description)
  return r.result.result.value
}
const waitFor = (expr, ms) => waitUntil(expr.slice(0, 60), () => ev(expr), ms)
// real key presses, as a keyboard sends them
async function key(k, shift = false) {
  const code = { Tab: 9, ArrowRight: 39, ArrowLeft: 37 }[k], modifiers = shift ? 8 : 0
  await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: k, code: k, windowsVirtualKeyCode: code, modifiers })
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code: k, windowsVirtualKeyCode: code, modifiers })
  await sleep(40)
}

// where focus is, as a short name
const WHERE = `(() => { const a = document.activeElement; if (!a || a === document.body) return 'body'
  if (a.closest('header.bar')) return 'header:' + a.textContent.trim()
  if (a.classList.contains('back')) return 'back'
  if (a.closest('.image-toggle')) return 'toggle:' + a.textContent.trim()
  if (a.closest('.info-media')) return 'picture:' + (a.textContent || a.getAttribute('aria-label') || '').trim().slice(0, 30)
  if (a.getAttribute('role') === 'tab') return 'tab:' + a.textContent.trim()
  if (a.id === 'part-panel') return 'panel'
  if (a.closest('.part-panel')) return 'panel-item:' + a.textContent.trim().slice(0, 20)
  if (a.closest('.quick-check')) return 'check:' + a.textContent.trim().slice(0, 20)
  if (a.closest('.info-view')) return 'footer:' + a.textContent.trim().slice(0, 20)
  return 'outside:' + a.tagName + ' ' + (a.id || a.className) })()`
// the page order the focus order should follow: title > toggle > picture > tabs > quick check
const DOM_ORDER = `(() => { const q = s => document.querySelector('.info-view ' + s), f = (a, b) => !!(a && b && a.compareDocumentPosition(b) & 4)
  return f(q('#part-title'), q('.image-toggle')) && f(q('.image-toggle'), q('.info-media .part-art, .info-media .photo-plate')) && f(q('.info-media'), q('[role=tablist]')) && f(q('[role=tablist]'), q('.quick-check')) })()`
const STAGES = ['back', 'toggle', 'picture', 'tab', 'panel', 'check', 'footer']
const rank = s => { const i = STAGES.findIndex(x => s === x || s.startsWith(x + ':') || s.startsWith(x + '-')); return i < 0 ? 99 : i }

const results = {}, fails = []
try {
  await send('Runtime.enable'); await send('Page.enable')
  await send('Emulation.setFocusEmulationEnabled', { enabled: true })
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false })
  for (const lang of ['en', 'es']) {
    await send('Page.navigate', { url: URL }); await waitFor(`document.querySelectorAll('.tab').length === 5`)
    await ev(`localStorage.clear(); localStorage.setItem('samesun:lang', '"${lang}"'); localStorage.setItem('samesun:parts', '{"skipped":true}'); true`)
    await send('Page.reload'); await waitFor(`document.querySelectorAll('.tab').length === 5`)
    await ev(`document.fonts.ready.then(() => true)`); await sleep(200)
    // the LED card (Power) and the cup card (Structure)
    for (const [view, tile, name] of [['power', 1, 'part'], ['structure', 0, 'material']]) for (const image of ['drawing', 'photo']) {
      const k = `${lang} ${name} ${image}`, bad = m => fails.push(`${k}: ${m}`)
      await ev(`document.getElementById('t-${view}').click(); true`); await sleep(150)
      await ev(`document.querySelectorAll('#v-${view} .stages button')[0].click(); true`); await sleep(150)
      await ev(`document.querySelectorAll('#v-${view} .part-tile')[${tile}].click(); true`); await sleep(300)
      await ev(`document.querySelectorAll('.info-view .image-toggle button')[${image === 'photo' ? 0 : 1}].click(); true`); await sleep(300)
      if (image === 'photo') await waitFor(`!!document.querySelector('.photo-plate img')?.complete`)
      if (!(await ev(DOM_ORDER))) bad('page order is not title > toggle > picture > tabs > quick check')

      // Tab from Back (where the card puts focus) to the end of the page
      await ev(`document.querySelector('.info-view .back').focus(); true`)
      const fwd = [await ev(WHERE)]
      for (let i = 0; i < 20; i++) {
        await key('Tab')
        const w = await ev(WHERE)
        fwd.push(w)
        if (w === 'body' || w.startsWith('header') || w.startsWith('outside')) break
      }
      const end = fwd.pop() // past the end, focus wraps to the browser, then the header
      if (end !== 'body' && !end.startsWith('header')) bad(`Tab leaves the card for ${end} instead of the end of the page`)
      const ranks = fwd.map(rank)
      if (ranks.some((r, i) => i && r < ranks[i - 1])) bad('Tab order goes backwards: ' + fwd.join(' > '))
      for (const stage of ['back', 'toggle', 'tab', 'panel', 'check']) if (!ranks.includes(STAGES.indexOf(stage))) bad('Tab never reaches ' + stage)
      if (image === 'photo' && !ranks.includes(STAGES.indexOf('picture'))) bad('Tab never reaches the photo credit links')
      if (fwd.filter(s => s.startsWith('tab:')).length !== 1) bad('the tab list should be one Tab stop')

      // Shift+Tab from the last stop goes back the same way
      await ev(`(() => { const f = [...document.querySelectorAll('.info-view button, .info-view a[href], .info-view [tabindex]')].filter(e => e.tabIndex >= 0 && e.getClientRects().length); f.at(-1).focus(); return true })()`)
      const last = await ev(WHERE)
      if (last !== fwd.at(-1)) bad(`the last stop on the card is ${last}, but Tab ended on ${fwd.at(-1)}`)
      const back = []
      for (let i = 0; i < fwd.length - 1; i++) { await key('Tab', true); back.push(await ev(WHERE)) }
      if (back.join() !== fwd.slice(0, -1).reverse().join()) bad('Shift+Tab is not the reverse: ' + back.join(' > '))

      // arrow keys move between tabs, wrap at the ends, and the text follows
      await ev(`document.querySelector('.info-view [role=tab][aria-selected=true]').focus(); true`)
      const arrows = [await ev(WHERE)]
      for (let i = 0; i < 4; i++) { await key('ArrowRight'); arrows.push(await ev(WHERE)) }
      await key('ArrowLeft'); arrows.push(await ev(WHERE))
      const labels = await ev(`[...document.querySelectorAll('.info-view [role=tab]')].map(b => 'tab:' + b.textContent.trim())`), L = labels.length
      const want = [0, 1, 2, 3, 4].map(i => labels[i % L]).concat(labels[(4 % L - 1 + L) % L])
      if (arrows.join() !== want.join()) bad(`arrow keys: ${arrows.join(' > ')}, expected ${want.join(' > ')}`)
      const follows = await ev(`document.querySelector('.info-view [role=tab][aria-selected=true]') === document.activeElement && document.getElementById('part-panel').getAttribute('aria-labelledby') === document.activeElement.id`)
      if (!follows) bad('the focused tab is not the selected one, or the text does not follow it')

      // focus can be seen
      const ring = await ev(`(() => { document.querySelector('.info-view .image-toggle button').focus(); const s = getComputedStyle(document.activeElement); return s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 2 })()`)
      if (!ring) bad('no visible focus ring on the Photo/Drawing toggle')

      results[k] = fwd.join(' > ') + ' > (end of page)'
      // back to the default Drawing view, then out of the card
      await ev(`document.querySelectorAll('.info-view .image-toggle button')[1].click(); document.querySelector('.info-view .back').click(); true`); await sleep(200)
    }
  }
} catch (e) {
  fails.push('the check could not finish: ' + e.message)
}

for (const [k, v] of Object.entries(results)) console.log(`${k}\n  ${v}`)
for (const e of errors) fails.push('page error: ' + e)
ws.close()
cleanup()
if (fails.length) {
  console.error(`\n${fails.length} problem(s):\n` + fails.map(f => '  ✗ ' + f).join('\n'))
  process.exit(1)
}
console.log(`\n✓ Keyboard focus order OK (${Object.keys(results).length} cards checked at 1280 px)`)
