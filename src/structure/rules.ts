// Structure's rule model: does each pick attach, and how does the finished frame do in the six
// tests? Pure functions; every number is in config/structure.json (all to be tuned with the real
// prototypes). The key idea it teaches: the panel can only be set to 10°, 25° and 40° when the frame
// has a hinge (a pivot) AND an angle stop (something that holds it there).
import defaultConfig from '../config/structure.json'
import type { Facility, MaterialId } from './materials'
import { MATERIAL_IDS } from './materials'
import { SLOTS, USES, type Design, type Draft, type Slot } from './options'

export type Config = typeof defaultConfig

// ---------- attaching ----------

/** why a pick will not attach to the picks before it (a key in st.why.*), or null if it fits */
export type Why = 'noPostsToJoin' | 'notchesNeedSticks' | 'hingeNeedsPosts' | 'axleNeedsHoles' | 'stopNeedsPosts' | 'postsNotJoined'

/** For each slot: null when the pick fits, or the reason it will not attach. Unpicked slots are null. */
export function attach(d: Draft): Record<Slot, Why | null> {
  const posts = d.posts, hasPosts = !!posts && posts !== 'none'
  const out: Record<Slot, Why | null> = { base: null, posts: null, join: null, hinge: null, stop: null, holder: null }
  if (d.join && d.join !== 'none') {
    if (posts === 'none') out.join = 'noPostsToJoin'
    else if (d.join === 'notches' && posts !== 'stick') out.join = 'notchesNeedSticks'
  }
  if (hasPosts && d.join === 'none') out.posts = 'postsNotJoined'
  if (d.hinge && d.hinge !== 'none') {
    if (posts === 'none') out.hinge = 'hingeNeedsPosts'
    else if (d.hinge === 'axle' && posts !== 'thickStraw' && posts !== 'stick') out.hinge = 'axleNeedsHoles'
  }
  if (d.stop && d.stop !== 'none' && d.stop !== 'wedges') {
    if (posts === 'none') out.stop = 'stopNeedsPosts'
    else if (d.stop === 'notches' && posts !== 'stick') out.stop = 'notchesNeedSticks'
  }
  return out
}

/** the join a design needs when there are no posts */
export const joinFor = (posts: Draft['posts'], join: Draft['join']): Draft['join'] => (posts === 'none' ? 'none' : join === 'none' ? undefined : join)

export const isComplete = (d: Draft): d is Design => SLOTS.every(s => d[s] !== undefined)

// ---------- what the frame does ----------

export interface Frame {
  /** the posts stand up (joined to the base), or there are none */
  standing: boolean
  /** the frame has a working pivot */
  hinge: boolean
  /** the frame has a working angle stop */
  stop: boolean
  /** panel height above the table (cm) */
  height: number
}

export function frame(d: Design, c: Config = defaultConfig): Frame {
  const a = attach(d)
  const standing = d.posts === 'none' || (d.join !== 'none' && !a.join)
  const stopOk = d.stop !== 'none' && !a.stop
  const hinge = standing && ((d.hinge !== 'none' && !a.hinge && c.hinge[d.hinge]) || (stopOk && c.stop[d.stop].hinge))
  const stop = standing && stopOk && c.stop[d.stop].stop
  const raise = d.posts === 'none' ? (d.stop === 'wedges' ? c.wedgeHeight : 0) : standing ? c.posts[d.posts].height : 0
  return { standing, hinge, stop, height: c.base[d.base].height + raise }
}

// ---------- the six tests ----------

export const TESTS = ['angle', 'slip', 'wobble', 'heat', 'shade', 'facility'] as const
export type TestId = (typeof TESTS)[number]
/** pass; needs work (a real problem); ask your facilitator (fine, but needs adult prep) */
export type Status = 'pass' | 'needsWork' | 'ask'

export interface TestResult {
  id: TestId
  status: Status
  /** the one-sentence "why" (a key in st.test.<id>.<why>) */
  why: string
  /** angle test: the angles the panel can be set to */
  angles?: number[]
  /** facility test: what to prepare */
  flags?: Facility[]
}

const r = (id: TestId, status: Status, why: string, extra: Partial<TestResult> = {}): TestResult => ({ id, status, why, ...extra })

export function angleTest(d: Design, c: Config = defaultConfig): TestResult {
  const f = frame(d, c)
  if (!f.standing) return r('angle', 'needsWork', 'falls')
  if (f.hinge && f.stop) return r('angle', 'pass', d.stop === 'wedges' ? 'wedge' : 'ok', { angles: c.angles })
  if (f.hinge) return r('angle', 'needsWork', 'flops', { angles: [] })
  return r('angle', 'needsWork', 'stuck', { angles: [] })
}

export function slipTest(d: Design, c: Config = defaultConfig): TestResult {
  if (angleTest(d, c).status !== 'pass') return r('slip', 'needsWork', 'cantTilt')
  const h = c.holder[d.holder]
  if (h.lip) return r('slip', 'pass', 'lip')
  if (h.tied) return r('slip', 'pass', 'tied')
  return r('slip', 'needsWork', 'slides')
}

/** how much the panel sways in the wind (bigger is worse) */
export function sway(d: Design, c: Config = defaultConfig) {
  if (d.posts === 'none' || d.join === 'none') return 0
  const grip = c.joinGrip[d.join] * (d.join === 'tape' ? c.heat.tapeGrip : 1)
  return c.posts[d.posts].height / (c.posts[d.posts].stiffness * grip)
}

export function wobbleTest(d: Design, c: Config = defaultConfig): TestResult {
  const f = frame(d, c)
  if (!f.standing) return r('wobble', 'needsWork', 'falls')
  if (d.posts === 'none') return r('wobble', 'pass', 'low')
  return sway(d, c) <= c.wobble.limit ? r('wobble', 'pass', 'steady') : r('wobble', 'needsWork', d.join === 'tape' ? 'tape' : 'sways')
}

export function heatTest(d: Design): TestResult {
  if (d.base !== 'cup') return r('heat', 'pass', 'noCover')
  return d.cupOpen ? r('heat', 'pass', 'open') : r('heat', 'needsWork', 'closed')
}

export function shadeTest(d: Design, c: Config = defaultConfig): TestResult {
  return frame(d, c).height >= c.plant.domeTop + c.plant.clearance ? r('shade', 'pass', 'above') : r('shade', 'needsWork', 'low')
}

/** what an adult must check or prepare first: metal parts, sharp cut edges, tools */
export function facilityFlags(d: Design): Facility[] {
  const used = (slot: Slot, ...ids: string[]) => ids.includes(d[slot] as string)
  const flags = new Set<Facility>()
  if (used('posts', 'pipe') || used('join', 'pipeWrap') || used('hinge', 'eyeLoops') || used('stop', 'ladder', 'clothespin')) flags.add('metal')
  if (d.base === 'cup' && d.cupOpen) {
    flags.add('sharp')
    flags.add('tool')
  }
  if (used('hinge', 'axle') || used('join', 'notches') || used('stop', 'notches')) flags.add('tool')
  return (['metal', 'sharp', 'tool'] as Facility[]).filter(f => flags.has(f))
}

export function facilityTest(d: Design): TestResult {
  const flags = facilityFlags(d)
  return flags.length ? r('facility', 'ask', 'prep', { flags }) : r('facility', 'pass', 'none', { flags })
}

export function runTests(d: Design, c: Config = defaultConfig): TestResult[] {
  return [angleTest(d, c), slipTest(d, c), wobbleTest(d, c), heatTest(d), shadeTest(d, c), facilityTest(d)]
}

/** one "try next" idea for a test that needs work (a key in st.next.*) */
export function tryNext(t: TestResult, d: Design): string | null {
  if (t.status !== 'needsWork') return null
  switch (t.id) {
    case 'angle': return t.why === 'falls' ? 'join' : t.why === 'flops' ? 'stop' : d.posts === 'none' ? 'wedges' : 'hinge'
    case 'slip': return t.why === 'cantTilt' ? 'angleFirst' : 'tray'
    case 'wobble': return t.why === 'falls' ? 'join' : d.join === 'tape' ? 'bands' : 'stiffer'
    case 'heat': return 'cutCup'
    case 'shade': return 'higher'
    default: return null
  }
}

// ---------- materials, steps and the printed sheets ----------

/** the materials a design uses, in the order of the material cards */
export function materialsFor(d: Design): MaterialId[] {
  const used = new Set<MaterialId>()
  for (const s of SLOTS) for (const m of USES[`${s}.${d[s]}`] ?? []) used.add(m)
  return MATERIAL_IDS.filter(m => used.has(m))
}

/** the build steps, one per slot that has something to do (keys in st.how.<slot>.<option>) */
export function stepsFor(d: Design): string[] {
  const out: string[] = []
  for (const s of SLOTS) {
    if (d[s] === 'none' || (s === 'holder' && d.holder === 'loose')) continue
    out.push(`${s}.${d[s]}`)
    if (s === 'base' && d.base === 'cup' && d.cupOpen) out.push('base.cutCup')
  }
  return out
}

export const PROTOTYPES: { id: string; design: Design }[] = [
  { id: 'pipeFrame', design: { base: 'cup', cupOpen: true, posts: 'pipe', join: 'pipeWrap', hinge: 'eyeLoops', stop: 'ladder', holder: 'tray' } },
  { id: 'strawFrame', design: { base: 'cup', cupOpen: true, posts: 'thickStraw', join: 'bands', hinge: 'axle', stop: 'bandStops', holder: 'tray' } },
  { id: 'stickFrame', design: { base: 'cup', cupOpen: true, posts: 'stick', join: 'bands', hinge: 'fig8', stop: 'notches', holder: 'tray' } },
  { id: 'wedge', design: { base: 'cup', cupOpen: true, posts: 'none', join: 'none', hinge: 'none', stop: 'wedges', holder: 'tray' } }
]

/** the printed sheet that matches this design, if any */
export function matchPrototype(d: Design): string | null {
  return PROTOTYPES.find(p => SLOTS.every(s => p.design[s] === d[s]) && p.design.cupOpen === d.cupOpen)?.id ?? null
}
