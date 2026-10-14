// Build Lab circuit checker, ported from nets() / evalLab() / update() in the prototype.
// Wires join terminals into nets (union-find). Parts do not conduct, so a part works
// only when one of its terminals is on the panel's + net and the other on the - net.

export type TermId = 'p+' | 'p-' | 'mA' | 'mB' | 'lL' | 'lS' | 'w+' | 'w-'
export type Part = 'motor' | 'led' | 'pump'
export type Wire = [TermId, TermId]

export const TERMS: TermId[] = ['p+', 'p-', 'mA', 'mB', 'lL', 'lS', 'w+', 'w-']
/** the + side of each part: motor A, LED long leg, pump red wire */
export const PART_TERMS: Record<Part, [TermId, TermId]> = { motor: ['mA', 'mB'], led: ['lL', 'lS'], pump: ['w+', 'w-'] }
export const LEVELS: Part[][] = [['motor'], ['led'], ['motor', 'led'], ['pump']]

/** Terminals on the board for a level: the panel's two, plus each part's two. */
export const levelTerms = (level: number): TermId[] => ['p+', 'p-', ...LEVELS[level].flatMap(p => PART_TERMS[p])]

/** Returns a find() that maps each terminal to the root of its net. */
export function nets(wires: Wire[]): (t: TermId) => TermId {
  const parent = Object.fromEntries(TERMS.map(t => [t, t])) as Record<TermId, TermId>
  const find = (t: TermId): TermId => (parent[t] === t ? t : (parent[t] = find(parent[t])))
  for (const [a, b] of wires) parent[find(a)] = find(b)
  return find
}

/** 1 = runs the right way, -1 = runs backwards (fan blows away, pump only trickles), 0 = off */
export type Dir = -1 | 0 | 1
export interface Eval {
  short: boolean
  motor: Dir
  led: boolean
  ledRev: boolean
  pump: Dir
  /** fan and LED wired one after the other between + and - (a chain) */
  series: boolean
}

export function evaluate(wires: Wire[], parts: Part[]): Eval {
  const f = nets(wires), pos = f('p+'), neg = f('p-')
  const out: Eval = { short: pos === neg && wires.length > 0, motor: 0, led: false, ledRev: false, pump: 0, series: false }
  if (out.short) return out
  const dir = (p: Part): Dir => {
    const [a, b] = PART_TERMS[p]
    return f(a) === pos && f(b) === neg ? 1 : f(a) === neg && f(b) === pos ? -1 : 0
  }
  if (parts.includes('motor')) out.motor = dir('motor')
  if (parts.includes('led')) {
    const d = dir('led')
    out.led = d === 1
    out.ledRev = d === -1
  }
  if (parts.includes('pump')) out.pump = dir('pump')
  if (parts.includes('motor') && parts.includes('led')) out.series = isSeries(f, pos, neg)
  return out
}

/**
 * A chain: + reaches one part, that part's other end joins the second part, and the second
 * part's other end reaches -. Either part can come first, each either way round, and the
 * middle joint must not touch + or - (or it would be a parallel or shorted circuit).
 */
function isSeries(f: (t: TermId) => TermId, pos: TermId, neg: TermId) {
  const ends = (p: Part): [TermId, TermId][] => {
    const [a, b] = PART_TERMS[p]
    return [[a, b], [b, a]]
  }
  for (const [first, second] of [['motor', 'led'], ['led', 'motor']] as const)
    for (const [in1, out1] of ends(first))
      for (const [in2, out2] of ends(second)) {
        const mid = f(out1)
        if (f(in1) === pos && mid === f(in2) && f(out2) === neg && mid !== pos && mid !== neg) return true
      }
  return false
}

export type StatusId =
  | 'pickSecond' | 'start' | 'turnOnSun' | 'short'
  | 'fanOk' | 'fanBackwards' | 'fanNothing'
  | 'ledOk' | 'ledBackwards' | 'ledNothing'
  | 'pumpOk' | 'pumpBackwards' | 'pumpNothing'
  | 'bothOk' | 'bothFanOnly' | 'bothLedOnly' | 'bothLedBackwards' | 'bothSeries' | 'bothNothing'
export type Tone = '' | 'ok' | 'warn'
export interface Status {
  id: StatusId
  tone: Tone
  done: boolean
}

const s = (id: StatusId, tone: Tone = '', done = false): Status => ({ id, tone, done })

/** What to tell the player about the board right now. */
export function labStatus(level: number, wires: Wire[], selected: boolean, sunOn: boolean): Status {
  if (selected) return s('pickSecond')
  if (!sunOn) return s(wires.length ? 'turnOnSun' : 'start')
  const ev = evaluate(wires, LEVELS[level])
  if (ev.short) return s('short', 'warn')
  switch (level) {
    case 0:
      return ev.motor > 0 ? s('fanOk', 'ok', true) : ev.motor < 0 ? s('fanBackwards', 'warn') : s('fanNothing')
    case 1:
      return ev.led ? s('ledOk', 'ok', true) : ev.ledRev ? s('ledBackwards', 'warn') : s('ledNothing')
    case 3:
      return ev.pump > 0 ? s('pumpOk', 'ok', true) : ev.pump < 0 ? s('pumpBackwards', 'warn') : s('pumpNothing')
    default:
      if (ev.motor && ev.led) return s('bothOk', 'ok', true)
      if (ev.motor) return s('bothFanOnly', 'warn')
      if (ev.led) return s('bothLedOnly', 'warn')
      if (ev.ledRev) return s('bothLedBackwards', 'warn')
      if (ev.series) return s('bothSeries', 'warn')
      return s('bothNothing')
  }
}
