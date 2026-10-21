// Learn path progress on this device: for each mission, whether it is done and the evidence the
// learner saved. Nothing leaves the device.
import { load, save } from './storage'

export const CORE = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7'] as const
export const BONUS = ['agripv', 'pump', 'reflect'] as const
export type CoreId = (typeof CORE)[number]
export type BonusId = (typeof BONUS)[number]
export type MissionId = CoreId | BonusId
export const MISSIONS: MissionId[] = [...CORE, ...BONUS]

export interface MissionRecord {
  done: boolean
  /** whatever the mission saves: answers, readings, ticks (plain JSON) */
  evidence: Record<string, unknown>
}
export type LearnState = Partial<Record<MissionId, MissionRecord>>

const KEY = 'learn'

/** Saved progress; anything unknown or broken is dropped. */
export function loadLearn(): LearnState {
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

/** How many of the 7 core missions are done. */
export const coreDone = (s: LearnState) => CORE.filter(id => s[id]?.done).length
