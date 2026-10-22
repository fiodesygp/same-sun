// Power path progress on this device: for each step, whether it is done and the evidence the
// learner saved. Nothing leaves the device. The path joins the old Power levels and the old
// Learn missions; migrate() carries both kinds of saved progress over.
import { loadSolved } from './progress'
import { load, save } from './storage'

/** the seven Solar Card Deck missions */
export const CORE = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7'] as const
/** Power circuits with no deck card */
export const CHALLENGES = ['both', 'all', 'fix'] as const
export const BONUS = ['pump', 'agripv', 'reflect'] as const
export type CoreId = (typeof CORE)[number]
export type ChallengeId = (typeof CHALLENGES)[number]
export type BonusId = (typeof BONUS)[number]
export type MissionId = CoreId | ChallengeId | BonusId

/** "Try it": the 10 steps (deck missions, then the bonus cards), then the 3 harder challenges */
export const STEPS: MissionId[] = [...CORE, ...BONUS]
export const PATH: MissionId[] = [...STEPS, ...CHALLENGES]
export const MISSIONS = PATH

/** the old Power levels (0-5) and the step each one became */
export const LEVEL_STEP: MissionId[] = ['m1', 'm1', 'both', 'pump', 'all', 'fix']
/** what a solved old level counts as, in the step's own evidence */
const LEVEL_EVIDENCE: Record<string, unknown>[] = [
  { device: 'fan', worked: ['fan'] }, { device: 'led', worked: ['led'] }, { solved: true }, { pumpRan: true }, { solved: true }, { solved: true }
]

export interface MissionRecord {
  done: boolean
  /** whatever the mission saves: answers, readings, ticks (plain JSON) */
  evidence: Record<string, unknown>
}
export type LearnState = Partial<Record<MissionId, MissionRecord>>

const KEY = 'learn'

/**
 * Carry old Power progress into the path: each solved level marks its step done. Only ever
 * adds: nothing already saved is changed or removed, so running it again changes nothing.
 */
export function migrate(s: LearnState, solved: number[]): LearnState {
  const out: LearnState = { ...s }
  for (const level of solved) {
    const id = LEVEL_STEP[level]
    if (!id) continue
    const was = out[id] ?? { done: false, evidence: {} }, add = LEVEL_EVIDENCE[level]
    const evidence = { ...was.evidence }
    for (const [k, v] of Object.entries(add)) {
      if (k === 'worked') {
        const have = Array.isArray(evidence.worked) ? evidence.worked : []
        evidence.worked = [...have, ...(v as string[]).filter(d => !have.includes(d))]
      } else if (!(k in evidence)) evidence[k] = v
    }
    out[id] = { done: true, evidence }
  }
  return out
}

/** Saved progress, with old Power levels carried over; anything unknown or broken is dropped. */
export function loadLearn(): LearnState {
  const s = readLearn(), merged = migrate(s, loadSolved())
  if (JSON.stringify(merged) !== JSON.stringify(s)) save(KEY, merged)
  return merged
}

function readLearn(): LearnState {
  const x = load<unknown>(KEY, {})
  if (!x || typeof x !== 'object' || Array.isArray(x)) return {}
  const out: LearnState = {}
  for (const id of MISSIONS) {
    const r = (x as Record<string, unknown>)[id]
    if (!r || typeof r !== 'object') continue
    const { done, evidence } = r as Partial<MissionRecord>
    out[id] = { done: done === true, evidence: evidence && typeof evidence === 'object' && !Array.isArray(evidence) ? evidence : {} }
  }
  return out
}

/** Merge new evidence into a mission (does not change done); returns the updated state. */
export function saveEvidence(id: MissionId, evidence: Record<string, unknown>): LearnState {
  const all = loadLearn(), was = all[id] ?? { done: false, evidence: {} }
  const next = { ...all, [id]: { done: was.done, evidence: { ...was.evidence, ...evidence } } }
  save(KEY, next)
  return next
}

/** Mark a mission done; returns the updated state. */
export function markDone(id: MissionId): LearnState {
  const all = loadLearn(), was = all[id] ?? { done: false, evidence: {} }
  const next = { ...all, [id]: { ...was, done: true } }
  save(KEY, next)
  return next
}

/** How many of the 10 steps are done (challenges are counted on their own). */
export const stepsDone = (s: LearnState) => STEPS.filter(id => s[id]?.done).length
/** How many of the 3 challenges are done. */
export const challengesDone = (s: LearnState) => CHALLENGES.filter(id => s[id]?.done).length
/** any step started or done: a returning learner goes straight to "Try it" */
export const hasProgress = (s: LearnState) => PATH.some(id => s[id])
