// "Meet the parts": the kit's parts in order, each card's quick-check question, and which ones the
// learner has answered correctly. Saved on this device only.
import { load, save } from './storage'

export const PART_IDS = ['panel', 'led', 'fan', 'pump', 'switch', 'pot', 'wires', 'lightMeter', 'multimeter', 'tachometer'] as const
export type PartId = (typeof PART_IDS)[number]

/** each quick check: the answer choices (keys into learn.check.<part>.<choice>) and the right one */
export const CHECKS: Record<PartId, { choices: string[]; answer: string }> = {
  panel: { choices: ['red', 'black'], answer: 'red' },
  led: { choices: ['long', 'short'], answer: 'long' },
  fan: { choices: ['backwards', 'stops', 'faster'], answer: 'backwards' },
  pump: { choices: ['pump', 'led'], answer: 'pump' },
  switch: { choices: ['yes', 'no'], answer: 'no' },
  pot: { choices: ['slows', 'faster'], answer: 'slows' },
  wires: { choices: ['black', 'red'], answer: 'black' },
  lightMeter: { choices: ['light', 'volts'], answer: 'light' },
  multimeter: { choices: ['both', 'plus'], answer: 'both' },
  tachometer: { choices: ['turns', 'volts'], answer: 'turns' }
}

export const isRight = (id: PartId, choice: string) => CHECKS[id].answer === choice

export interface PartsState {
  /** parts whose quick check was answered correctly */
  checked: PartId[]
  /** the learner chose to skip ahead to "Try it" */
  skipped: boolean
}

const KEY = 'parts'

export function loadParts(): PartsState {
  const x = load<unknown>(KEY, {})
  const o = x && typeof x === 'object' && !Array.isArray(x) ? (x as Record<string, unknown>) : {}
  const checked = Array.isArray(o.checked) ? PART_IDS.filter(id => (o.checked as unknown[]).includes(id)) : []
  return { checked, skipped: o.skipped === true }
}

/** Answer a quick check; a right answer is remembered. Returns whether it was right and the new state. */
export function answerCheck(id: PartId, choice: string): { right: boolean; state: PartsState } {
  const s = loadParts(), right = isRight(id, choice)
  const next = right && !s.checked.includes(id) ? { ...s, checked: PART_IDS.filter(p => p === id || s.checked.includes(p)) } : s
  save(KEY, next)
  return { right, state: next }
}

export function skipParts(): PartsState {
  const next = { ...loadParts(), skipped: true }
  save(KEY, next)
  return next
}

/** every quick check answered: "Try it" is unlocked */
export const allChecked = (s: PartsState) => s.checked.length === PART_IDS.length
