// Build Lab circuit checker, ported from nets() / evalLab() / update() in the prototype.
// Wires join terminals into nets (union-find). Parts do not conduct, so a part works
// only when one of its terminals is on the panel's + net and the other on the - net.
import defaultModel from '../config/model.json'
import type { Model } from '../sim/types'

export type TermId = 'p+' | 'p-' | 'mA' | 'mB' | 'lL' | 'lS' | 'w+' | 'w-'
export type Part = 'motor' | 'led' | 'pump'
export type Wire = [TermId, TermId]

export const TERMS: TermId[] = ['p+', 'p-', 'mA', 'mB', 'lL', 'lS', 'w+', 'w-']
/** the + side of each part: motor A, LED long leg, pump red wire */
export const PART_TERMS: Record<Part, [TermId, TermId]> = { motor: ['mA', 'mB'], led: ['lL', 'lS'], pump: ['w+', 'w-'] }
export const LEVELS: Part[][] = [['motor'], ['led'], ['motor', 'led'], ['pump'], ['motor', 'led', 'pump']]
export const ALL = 4 // level 5 · All

/** Terminals on the board for a level: the panel's two, plus each part's two. */
export const levelTerms = (level: number): TermId[] => ['p+', 'p-', ...LEVELS[level].flatMap(p => PART_TERMS[p])]

/** Returns a find() that maps each terminal to the root of its net. */
export function nets(wires: Wire[]): (t: TermId) => TermId {
  const parent = Object.fromEntries(TERMS.map(t => [t, t])) as Record<TermId, TermId>
  const find = (t: TermId): TermId => (parent[t] === t ? t : (parent[t] = find(parent[t])))
  for (const [a, b] of wires) parent[find(a)] = find(b)
  return find
}

/** 1 = runs the right way, -1 = runs backwards (fan blows away, LED dark, pump only trickles), 0 = off */
export type Dir = -1 | 0 | 1
export interface Eval {
  short: boolean
  motor: Dir
  led: boolean
  ledRev: boolean
  pump: Dir
  /** each part on this level, by direction */
  dirs: Partial<Record<Part, Dir>>
  /** parts wired one after the other between + and - (a chain), or empty */
  chain: Part[]
  series: boolean
}

export function evaluate(wires: Wire[], parts: Part[]): Eval {
  const f = nets(wires), pos = f('p+'), neg = f('p-')
  const out: Eval = { short: pos === neg && wires.length > 0, motor: 0, led: false, ledRev: false, pump: 0, dirs: {}, chain: [], series: false }
  if (out.short) return out
  const dir = (p: Part): Dir => {
    const [a, b] = PART_TERMS[p]
    return f(a) === pos && f(b) === neg ? 1 : f(a) === neg && f(b) === pos ? -1 : 0
  }
  for (const p of parts) out.dirs[p] = dir(p)
  out.motor = out.dirs.motor ?? 0
  out.led = out.dirs.led === 1
  out.ledRev = out.dirs.led === -1
  out.pump = out.dirs.pump ?? 0
  out.chain = findChain(f, pos, neg, parts)
  out.series = out.chain.length > 0
  return out
}

/** every ordering of k items picked from xs */
function orderings<T>(xs: T[], k: number): T[][] {
  if (k === 0) return [[]]
  return xs.flatMap((x, i) => orderings([...xs.slice(0, i), ...xs.slice(i + 1)], k - 1).map(rest => [x, ...rest]))
}

/**
 * A chain: + reaches the first part, each part's other end joins the next part, and the last
 * part's other end reaches -. Any order, each part either way round; the joints between parts
 * must not touch + or - (or it would be a parallel or shorted circuit). Longest chain first.
 */
function findChain(f: (t: TermId) => TermId, pos: TermId, neg: TermId, parts: Part[]): Part[] {
  for (let k = parts.length; k >= 2; k--)
    for (const order of orderings(parts, k))
      for (let flips = 0; flips < 1 << k; flips++) {
        const ends = order.map((p, i) => ((flips >> i) & 1 ? [...PART_TERMS[p]].reverse() : PART_TERMS[p]) as [TermId, TermId])
        if (f(ends[0][0]) !== pos || f(ends[k - 1][1]) !== neg) continue
        const joints = ends.slice(1).map((e, i) => [f(ends[i][1]), f(e[0])])
        if (joints.every(([a, b]) => a === b && a !== pos && a !== neg)) return order
      }
  return []
}

// ---------- power on the board ----------

/** What the panel can run: LED on or off, fan speed 0-1 (0 = stopped), pump on or off. */
export interface Loads {
  led: boolean
  fan: number
  pump: boolean
}

const LOAD_KEY: Record<Part, keyof Model['loads']> = { motor: 'fan', led: 'led', pump: 'pump' }

/** Panel power in watts: the big panel in full sun, less under a cloud (0 = clear, 1 = full cloud). */
export function panelWatts(cloud: number, m: Model = defaultModel) {
  const full = m.sMax * m.panels[m.lab.panel as keyof Model['panels']].area * m.eta
  return full * (1 - cloud * (1 - m.lab.cloudShare))
}

/**
 * Share the panel's power between the parts in parallel. The part that needs the least is served
 * first, so as power drops the pump (needs the most) stops first, then the fan, and the LED last.
 * The fan slows down as the power left for it gets close to what it needs.
 */
export function shareLoads(watts: number, m: Model = defaultModel): Loads {
  const order = (['led', 'motor', 'pump'] as Part[]).sort((a, b) => m.loads[LOAD_KEY[a]] - m.loads[LOAD_KEY[b]])
  const out: Loads = { led: false, fan: 0, pump: false }
  let left = watts
  for (const p of order) {
    const need = m.loads[LOAD_KEY[p]]
    if (left < need) continue
    if (p === 'motor') out.fan = Math.min(1, left / (2 * need))
    else out[p] = true
    left -= need
  }
  return out
}

// ---------- what to tell the player ----------

export type PartState = 'waiting' | 'working' | 'slow' | 'noPower' | 'backwards' | 'notConnected' | 'chain' | 'short'

/** One line per part for the level 5 checklist. */
export function partStates(level: number, wires: Wire[], sunOn: boolean, loads: Loads): Record<Part, PartState> {
  const parts = LEVELS[level], ev = evaluate(wires, parts)
  const powered: Record<Part, number> = { motor: loads.fan, led: loads.led ? 1 : 0, pump: loads.pump ? 1 : 0 }
  const state = (p: Part): PartState => {
    if (!sunOn) return 'waiting'
    if (ev.short) return 'short'
    if (ev.chain.includes(p)) return 'chain'
    const d = ev.dirs[p] ?? 0
    if (d === -1) return 'backwards'
    if (d === 0) return 'notConnected'
    return powered[p] === 0 ? 'noPower' : powered[p] < 1 ? 'slow' : 'working'
  }
  return Object.fromEntries(parts.map(p => [p, state(p)])) as Record<Part, PartState>
}

export type StatusId =
  | 'pickSecond' | 'start' | 'turnOnSun' | 'short'
  | 'fanOk' | 'fanBackwards' | 'fanNothing'
  | 'ledOk' | 'ledBackwards' | 'ledNothing'
  | 'pumpOk' | 'pumpBackwards' | 'pumpNothing'
  | 'bothOk' | 'bothFanOnly' | 'bothLedOnly' | 'bothLedBackwards' | 'bothSeries' | 'bothNothing'
  | 'allOk' | 'allSeries' | 'allBackwards' | 'allSome' | 'allNothing' | 'cloud'
export type Tone = '' | 'ok' | 'warn'
export interface Status {
  id: StatusId
  tone: Tone
  done: boolean
}

const s = (id: StatusId, tone: Tone = '', done = false): Status => ({ id, tone, done })

/** What to tell the player about the board right now. `cloudy` only matters once level 5 is solved. */
export function labStatus(level: number, wires: Wire[], selected: boolean, sunOn: boolean, cloudy = false): Status {
  if (selected) return s('pickSecond')
  if (!sunOn) return s(wires.length ? 'turnOnSun' : 'start')
  const ev = evaluate(wires, LEVELS[level])
  if (ev.short) return s('short', 'warn')
  switch (level) {
    case 0:
      return ev.motor > 0 ? s('fanOk', 'ok', true) : ev.motor < 0 ? s('fanBackwards', 'warn') : s('fanNothing')
    case 1:
      return ev.led ? s('ledOk', 'ok', true) : ev.ledRev ? s('ledBackwards', 'warn') : s('ledNothing')
    case 2:
      if (ev.motor && ev.led) return s('bothOk', 'ok', true)
      if (ev.motor) return s('bothFanOnly', 'warn')
      if (ev.led) return s('bothLedOnly', 'warn')
      if (ev.ledRev) return s('bothLedBackwards', 'warn')
      if (ev.series) return s('bothSeries', 'warn')
      return s('bothNothing')
    case 3:
      return ev.pump > 0 ? s('pumpOk', 'ok', true) : ev.pump < 0 ? s('pumpBackwards', 'warn') : s('pumpNothing')
    default: {
      const dirs = Object.values(ev.dirs)
      if (dirs.every(d => d === 1)) return cloudy ? s('cloud', '', true) : s('allOk', 'ok', true)
      if (ev.series) return s('allSeries', 'warn')
      if (dirs.some(d => d === -1)) return s('allBackwards', 'warn')
      if (dirs.some(d => d === 1)) return s('allSome', 'warn')
      return s('allNothing')
    }
  }
}
