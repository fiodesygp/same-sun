// Build Lab circuit checker. Wires join terminals into nets (union-find). Parts do not conduct,
// so a part works when one of its terminals is on a panel's + net and the other on that panel's
// - net. The resistor is the one part that passes power along: an LED may reach its panel through
// it. Levels 1-2 use only the big panel; from level 3 there is a small panel and a resistor too.
import defaultModel from '../config/model.json'
import type { Model } from '../sim/types'

export type TermId = 'p+' | 'p-' | 'q+' | 'q-' | 'mA' | 'mB' | 'lL' | 'lS' | 'w+' | 'w-' | 'rA' | 'rB'
export type Part = 'motor' | 'led' | 'pump'
export type Panel = 'big' | 'small'
export type Wire = [TermId, TermId]
export type Dir = -1 | 0 | 1

export const TERMS: TermId[] = ['p+', 'p-', 'q+', 'q-', 'mA', 'mB', 'lL', 'lS', 'w+', 'w-', 'rA', 'rB']
/** the + side first: motor A, LED long leg, pump red wire */
export const PART_TERMS: Record<Part, [TermId, TermId]> = { motor: ['mA', 'mB'], led: ['lL', 'lS'], pump: ['w+', 'w-'] }
export const PANEL_TERMS: Record<Panel, [TermId, TermId]> = { big: ['p+', 'p-'], small: ['q+', 'q-'] }

export interface Level {
  parts: Part[]
  panels: Panel[]
  resistor: boolean
  /** level 6: starts pre-wired with faults */
  fix: boolean
  /** fewest wires that solve it (for the second star) */
  minWires: number
}
const BIG: Panel[] = ['big'], BOTH: Panel[] = ['big', 'small']
export const LEVELS: Level[] = [
  { parts: ['motor'], panels: BIG, resistor: false, fix: false, minWires: 2 },
  { parts: ['led'], panels: BIG, resistor: false, fix: false, minWires: 2 },
  { parts: ['motor', 'led'], panels: BOTH, resistor: true, fix: false, minWires: 4 },
  { parts: ['pump'], panels: BOTH, resistor: true, fix: false, minWires: 2 },
  { parts: ['motor', 'led', 'pump'], panels: BOTH, resistor: true, fix: false, minWires: 6 },
  { parts: ['motor', 'led', 'pump'], panels: BOTH, resistor: true, fix: true, minWires: 7 }
]
export const ALL = 4 // level 5 · All
export const FIX = 5 // level 6 · Fix it

/** Terminals on the board for a level. */
export const levelTerms = (level: number): TermId[] => {
  const L = LEVELS[level]
  return [...L.panels.flatMap(p => PANEL_TERMS[p]), ...L.parts.flatMap(p => PART_TERMS[p]), ...(L.resistor ? (['rA', 'rB'] as TermId[]) : [])]
}

/** Returns a find() that maps each terminal to the root of its net. */
export function nets(wires: Wire[]): (t: TermId) => TermId {
  const parent = Object.fromEntries(TERMS.map(t => [t, t])) as Record<TermId, TermId>
  const find = (t: TermId): TermId => (parent[t] === t ? t : (parent[t] = find(parent[t])))
  for (const [a, b] of wires) parent[find(a)] = find(b)
  return find
}

export interface Conn {
  panel: Panel | null
  dir: Dir
  /** the LED reaches its panel through the resistor */
  viaResistor: boolean
}
export interface Eval {
  /** panels whose + and - are joined directly */
  shorted: Panel[]
  /** the two panels are wired to each other */
  joined: boolean
  conn: Record<Part, Conn>
  /** parts wired one after the other between + and - (a chain), or empty */
  chain: Part[]
  /** LED wired forward straight to the big panel on a level with a resistor: it will burn out */
  tooMuch: boolean
}

const NONE: Conn = { panel: null, dir: 0, viaResistor: false }

export function evaluate(wires: Wire[], level: number): Eval {
  const L = LEVELS[level], f = nets(wires)
  const used = new Set(wires.flat().map(f))
  const shorted = L.panels.filter(p => f(PANEL_TERMS[p][0]) === f(PANEL_TERMS[p][1]) && used.has(f(PANEL_TERMS[p][0])))
  const panelNets = L.panels.map(p => new Set(PANEL_TERMS[p].map(f)))
  const joined = panelNets.length === 2 && [...panelNets[0]].some(n => panelNets[1].has(n))
  const conn = { motor: NONE, led: NONE, pump: NONE } as Record<Part, Conn>
  const out: Eval = { shorted, joined, conn, chain: [], tooMuch: false }
  if (joined) return out
  const res = L.resistor ? [f('rA'), f('rB')] : null
  const across = (a: TermId, b: TermId, pos: TermId, neg: TermId): Dir => {
    // a part straight across the panel, or (for the LED) through the resistor on either leg
    if (f(a) === pos && f(b) === neg) return 1
    if (f(a) === neg && f(b) === pos) return -1
    return 0
  }
  const viaRes = (a: TermId, b: TermId, pos: TermId, neg: TermId): boolean => {
    if (!res || res[0] === res[1]) return false
    const pair = (x: TermId, y: TermId) => (res[0] === x && res[1] === y) || (res[0] === y && res[1] === x)
    const mid = (n: TermId) => n !== pos && n !== neg
    return (pair(pos, f(a)) && mid(f(a)) && f(b) === neg) || (f(a) === pos && pair(f(b), neg) && mid(f(b)))
  }
  for (const part of L.parts) {
    const [a, b] = PART_TERMS[part]
    for (const panel of L.panels) {
      if (shorted.includes(panel)) continue
      const [pos, neg] = PANEL_TERMS[panel].map(f)
      let dir = across(a, b, pos, neg), via = false
      if (!dir && part === 'led') {
        if (viaRes(a, b, pos, neg)) (dir = 1), (via = true)
        else if (viaRes(b, a, pos, neg)) (dir = -1), (via = true)
      }
      if (dir) {
        conn[part] = { panel, dir, viaResistor: via }
        break
      }
    }
  }
  out.chain = findChain(f, L, res, shorted)
  out.tooMuch = L.resistor && conn.led.dir === 1 && conn.led.panel === 'big' && !conn.led.viaResistor
  return out
}

/** every ordering of k items picked from xs */
function orderings<T>(xs: T[], k: number): T[][] {
  if (k === 0) return [[]]
  return xs.flatMap((x, i) => orderings([...xs.slice(0, i), ...xs.slice(i + 1)], k - 1).map(rest => [x, ...rest]))
}

/**
 * A chain: a panel's + reaches the first part, each part's other end joins the next part (directly
 * or through the resistor), and the last part's other end reaches that panel's -. Any order, each
 * part either way round; the joints must not touch + or -. Longest chain first.
 */
function findChain(f: (t: TermId) => TermId, L: Level, res: TermId[] | null, shorted: Panel[]): Part[] {
  const linked = (x: TermId, y: TermId) => x === y || (!!res && res[0] !== res[1] && ((res[0] === x && res[1] === y) || (res[0] === y && res[1] === x)))
  for (const panel of L.panels) {
    if (shorted.includes(panel)) continue
    const [pos, neg] = PANEL_TERMS[panel].map(f)
    for (let k = L.parts.length; k >= 2; k--)
      for (const order of orderings(L.parts, k))
        for (let flips = 0; flips < 1 << k; flips++) {
          const ends = order.map((p, i) => ((flips >> i) & 1 ? [...PART_TERMS[p]].reverse() : PART_TERMS[p]) as [TermId, TermId])
          if (f(ends[0][0]) !== pos || f(ends[k - 1][1]) !== neg) continue
          const ok = ends.slice(1).every((e, i) => {
            const x = f(ends[i][1]), y = f(e[0])
            return linked(x, y) && ![x, y].some(n => n === pos || n === neg)
          })
          if (ok) return order
        }
  }
  return []
}

// ---------- power ----------

export type PumpFlow = 'full' | 'trickle' | 'off'
/** What each part gets: LED lit or not, fan speed 0-1 (0 = stopped), pump flow. */
export interface Power {
  led: boolean
  motor: number
  pump: PumpFlow
}

const LOAD_KEY: Record<Part, keyof Model['loads']> = { motor: 'fan', led: 'led', pump: 'pump' }

/** A panel's power in watts, less under a cloud (0 = clear, 1 = full cloud). */
export function panelWatts(panel: Panel, cloud = 0, m: Model = defaultModel) {
  return m.lab.panelWatts[panel] * (1 - cloud * (1 - m.lab.cloudShare))
}

/**
 * Share one panel's power between the parts on it (in parallel). The part that needs the least is
 * served first, so as power drops the pump stops first (after a trickle), then the fan slows and
 * stops, and the LED goes last.
 */
export function shareLoads(watts: number, parts: Part[] = ['motor', 'led', 'pump'], m: Model = defaultModel): Power {
  const order = [...parts].sort((a, b) => m.loads[LOAD_KEY[a]] - m.loads[LOAD_KEY[b]])
  const out: Power = { led: false, motor: 0, pump: 'off' }
  let left = watts
  for (const p of order) {
    const need = m.loads[LOAD_KEY[p]]
    if (p === 'pump') {
      out.pump = left >= need ? 'full' : left >= m.lab.trickleWatts ? 'trickle' : 'off'
      left -= Math.min(left, need)
      continue
    }
    if (left < need) continue
    if (p === 'motor') out.motor = Math.min(1, left / (2 * need))
    else out.led = true
    left -= need
  }
  return out
}

/** What every part gets right now: each panel shares its own power between the parts wired to it. */
export function power(ev: Eval, level: number, cloud = 0, burnt = false, m: Model = defaultModel): Power {
  const out: Power = { led: false, motor: 0, pump: 'off' }
  for (const panel of LEVELS[level].panels) {
    // a reversed LED or a burnt one draws nothing; reversed fans and pumps still run (backwards)
    const on = LEVELS[level].parts.filter(p => ev.conn[p].panel === panel && !ev.chain.includes(p) && !(p === 'led' && (ev.conn.led.dir < 0 || burnt || ev.tooMuch)))
    if (!on.length) continue
    const share = shareLoads(panelWatts(panel, cloud, m), on, m)
    if (on.includes('led')) out.led = share.led
    if (on.includes('motor')) out.motor = share.motor
    if (on.includes('pump')) out.pump = share.pump
  }
  return out
}

// ---------- what to tell the player ----------

export type PartState =
  | 'waiting' | 'working' | 'slow' | 'trickle' | 'noPower' | 'backwards' | 'notConnected' | 'chain' | 'short' | 'joined' | 'tooMuch' | 'burnt'

/** One state per part, for the checklist. */
export function partStates(level: number, wires: Wire[], sunOn: boolean, cloud = 0, burnt = false): Record<Part, PartState> {
  const parts = LEVELS[level].parts, ev = evaluate(wires, level), pw = power(ev, level, cloud, burnt)
  const state = (p: Part): PartState => {
    if (!sunOn) return 'waiting'
    if (ev.joined) return 'joined'
    if (ev.shorted.length) return 'short'
    if (ev.chain.includes(p)) return 'chain'
    if (p === 'led' && burnt) return 'burnt'
    if (p === 'led' && ev.tooMuch) return 'tooMuch'
    const d = ev.conn[p].dir
    if (d === -1) return 'backwards'
    if (d === 0) return 'notConnected'
    if (p === 'led') return pw.led ? 'working' : 'noPower'
    if (p === 'motor') return pw.motor === 0 ? 'noPower' : pw.motor < 1 ? 'slow' : 'working'
    return pw.pump === 'full' ? 'working' : pw.pump === 'trickle' ? 'trickle' : 'noPower'
  }
  return Object.fromEntries(parts.map(p => [p, state(p)])) as Record<Part, PartState>
}

export type StatusId =
  | 'pickSecond' | 'start' | 'turnOnSun' | 'short' | 'panelsJoined' | 'ledBurnt' | 'weak'
  | 'fanOk' | 'fanBackwards' | 'fanNothing'
  | 'ledOk' | 'ledBackwards' | 'ledNothing'
  | 'bothOk' | 'bothNothing' | 'pumpOk' | 'pumpNothing'
  | 'allOk' | 'allSeries' | 'allBackwards' | 'allSome' | 'allNothing' | 'cloud' | 'fixOk'
export type Tone = '' | 'ok' | 'warn'
export interface Status {
  id: StatusId
  tone: Tone
  done: boolean
}

const s = (id: StatusId, tone: Tone = '', done = false): Status => ({ id, tone, done })

/** What to tell the player about the board right now. */
export function labStatus(level: number, wires: Wire[], selected: boolean, sunOn: boolean, opts: { cloudy?: boolean; burnt?: boolean } = {}): Status {
  if (selected) return s('pickSecond')
  if (!sunOn) return s(wires.length ? 'turnOnSun' : 'start')
  const ev = evaluate(wires, level)
  if (ev.joined) return s('panelsJoined', 'warn')
  if (ev.shorted.length) return s('short', 'warn')
  if (level === 0) return ev.conn.motor.dir > 0 ? s('fanOk', 'ok', true) : ev.conn.motor.dir < 0 ? s('fanBackwards', 'warn') : s('fanNothing')
  if (level === 1) return ev.conn.led.dir > 0 ? s('ledOk', 'ok', true) : ev.conn.led.dir < 0 ? s('ledBackwards', 'warn') : s('ledNothing')
  const states = Object.values(partStates(level, wires, true, opts.cloudy ? 1 : 0, opts.burnt))
  if (states.includes('burnt') || states.includes('tooMuch')) return s('ledBurnt', 'warn')
  // under a cloud, a solved level 5 stays solved: the wiring is right, there is just less power
  const wiredRight = Object.values(partStates(level, wires, true, 0, opts.burnt)).every(x => x === 'working')
  if (wiredRight) {
    if (level === ALL && opts.cloudy) return s('cloud', '', true)
    return s((['bothOk', 'pumpOk', 'allOk', 'fixOk'] as const)[level - 2], 'ok', true)
  }
  if (states.includes('chain')) return s('allSeries', 'warn')
  if (states.includes('backwards')) return s('allBackwards', 'warn')
  if (states.includes('slow') || states.includes('trickle')) return s('weak', 'warn')
  if (states.includes('working')) return s('allSome', 'warn')
  return s((['bothNothing', 'pumpNothing', 'allNothing', 'allNothing'] as const)[level - 2])
}

// ---------- stars ----------

export interface StarCheck {
  solved: boolean
  /** wires used is no more than the level's minimum */
  fewWires: boolean
  /** it worked the first time the sun was turned on */
  firstTry: boolean
}
export const starCount = (c: StarCheck) => (c.solved ? 1 + (c.fewWires ? 1 : 0) + (c.firstTry ? 1 : 0) : 0)
export function starCheck(level: number, wires: Wire[], solved: boolean, solvedOnFirstSun: boolean): StarCheck {
  return { solved, fewWires: solved && wires.length <= LEVELS[level].minWires, firstTry: solved && solvedOnFirstSun }
}

// ---------- tester ----------

/** Is there power at this terminal? Only with the sun on, and only along wires and the resistor from a panel's +. */
export function hasPower(term: TermId, wires: Wire[], level: number, sunOn: boolean): boolean {
  if (!sunOn) return false
  const L = LEVELS[level], f = nets(wires), ev = evaluate(wires, level)
  const live = new Set(L.panels.filter(p => !ev.shorted.includes(p)).map(p => f(PANEL_TERMS[p][0])))
  if (L.resistor) {
    const [a, b] = [f('rA'), f('rB')]
    if (live.has(a)) live.add(b)
    else if (live.has(b)) live.add(a)
  }
  return live.has(f(term))
}

// ---------- level 6 · Fix it ----------

export type FaultId = 'ledReversed' | 'wireMissing' | 'pumpBackwards' | 'ledNoResistor' | 'fanInSeries'
export const FAULTS: FaultId[] = ['ledReversed', 'wireMissing', 'pumpBackwards', 'ledNoResistor', 'fanInSeries']

/** the working circuit the puzzle starts from: everything on the big panel, the LED through the resistor */
export const BASE_WIRES: Wire[] = [['p+', 'mA'], ['p-', 'mB'], ['p+', 'w+'], ['p-', 'w-'], ['p+', 'rA'], ['rB', 'lL'], ['lS', 'p-']]
const PART_WIRES: Record<Part, Wire[]> = { motor: [['p+', 'mA'], ['p-', 'mB']], pump: [['p+', 'w+'], ['p-', 'w-']], led: [['p+', 'rA'], ['rB', 'lL'], ['lS', 'p-']] }
const FAULT_PARTS: Record<Exclude<FaultId, 'wireMissing'>, Part[]> = { ledReversed: ['led'], pumpBackwards: ['pump'], ledNoResistor: ['led'], fanInSeries: ['motor', 'led'] }

export interface Puzzle {
  faults: FaultId[]
  wires: Wire[]
  /** the parts each fault breaks, in the same order as faults */
  parts: Part[][]
}

const same = (a: Wire, b: Wire) => (a[0] === b[0] && a[1] === b[1]) || (a[0] === b[1] && a[1] === b[0])
const without = (ws: Wire[], drop: Wire[]) => ws.filter(w => !drop.some(d => same(w, d)))

/** Build a puzzle from two faults that break different parts; `pick` chooses which wire goes missing. */
export function makePuzzle(faults: FaultId[], pick: (n: number) => number = () => 0): Puzzle {
  let wires = [...BASE_WIRES]
  const parts: Part[][] = []
  for (const fault of faults.filter(x => x !== 'wireMissing')) {
    if (fault === 'ledReversed') wires = [...without(wires, [['rB', 'lL'], ['lS', 'p-']]), ['rB', 'lS'], ['lL', 'p-']]
    if (fault === 'pumpBackwards') wires = [...without(wires, [['p+', 'w+'], ['p-', 'w-']]), ['p+', 'w-'], ['p-', 'w+']]
    if (fault === 'ledNoResistor') wires = [...without(wires, [['p+', 'rA'], ['rB', 'lL']]), ['p+', 'lL']]
    if (fault === 'fanInSeries') wires = [...without(wires, [['p-', 'mB'], ['p+', 'rA']]), ['mB', 'rA']]
    parts.push(FAULT_PARTS[fault])
  }
  if (faults.includes('wireMissing')) {
    const taken = new Set(parts.flat())
    const choices = (['motor', 'pump', 'led'] as Part[]).filter(p => !taken.has(p)).flatMap(p => PART_WIRES[p].map(w => [p, w] as const))
    const [part, wire] = choices[pick(choices.length)]
    wires = without(wires, [wire])
    parts.splice(faults.indexOf('wireMissing'), 0, [part])
  }
  return { faults, wires, parts }
}

/** Deal two faults that break different parts. */
export function dealPuzzle(rand: () => number = Math.random): Puzzle {
  const pairs: [FaultId, FaultId][] = []
  for (const a of FAULTS) for (const b of FAULTS) {
    if (a >= b) continue
    const pa = a === 'wireMissing' ? [] : FAULT_PARTS[a], pb = b === 'wireMissing' ? [] : FAULT_PARTS[b]
    if (!pa.some(p => pb.includes(p))) pairs.push([a, b])
  }
  const pair = pairs[Math.floor(rand() * pairs.length)]
  return makePuzzle(pair, n => Math.floor(rand() * n))
}

/** Faults still to fix: a fault is fixed when every part it broke works again. */
export function faultsLeft(puzzle: Puzzle, wires: Wire[], burnt: boolean): number {
  const st = partStates(FIX, wires, true, 0, burnt)
  return puzzle.parts.filter(ps => ps.some(p => st[p] !== 'working')).length
}
