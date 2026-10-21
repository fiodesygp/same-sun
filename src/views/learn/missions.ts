// The Learn missions, in the order of the Solar Card Deck: deck colour, how many "Try it" steps
// and support cards each has, and when the learner may mark it done (pure, unit tested).
import type { MissionId } from '../../lib/learn'

export type Colour = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'magenta'
export type Evidence = Record<string, unknown>

export interface MissionDef {
  id: MissionId
  /** deck card colour; bonus cards have none */
  colour: Colour | null
  steps: number
  /** support cards shown with the goal: 0, 1 or 2 */
  info: 0 | 1 | 2
}

export const MISSION_DEFS: MissionDef[] = [
  { id: 'm1', colour: 'red', steps: 4, info: 1 },
  { id: 'm2', colour: 'orange', steps: 4, info: 1 },
  { id: 'm3', colour: 'yellow', steps: 3, info: 1 },
  { id: 'm4', colour: 'green', steps: 4, info: 2 },
  { id: 'm5', colour: 'blue', steps: 3, info: 0 },
  { id: 'm6', colour: 'purple', steps: 3, info: 1 },
  { id: 'm7', colour: 'magenta', steps: 3, info: 2 },
  { id: 'agripv', colour: null, steps: 3, info: 1 },
  { id: 'pump', colour: null, steps: 3, info: 0 },
  { id: 'reflect', colour: null, steps: 2, info: 0 }
]

export const def = (id: MissionId) => MISSION_DEFS.find(m => m.id === id)!

const text = (v: unknown) => typeof v === 'string' && v.trim().length > 0
const list = (v: unknown) => (Array.isArray(v) ? v : [])

/** When "Mark as done" may be pressed, from the evidence the mission saved. */
export const READY: Record<MissionId, (e: Evidence) => boolean> = {
  m1: e => e.device === 'fan' || e.device === 'led',
  m2: e => list(e.tried).length >= 3 && list(e.factors).length >= 1 && text(e.sentence),
  m3: e => list(e.readings).length >= 3,
  m4: e => e.switched === true && list(e.speeds).length >= 2 && e.flipped === true && (e.polarity === 'yes' || e.polarity === 'no') && text(e.whatHappened),
  m5: e => list(e.together).length >= 1,
  m6: e => list(e.newlyPowered).length >= 1,
  m7: e => !!e.series && !!e.parallel,
  agripv: e => text(e.light) && text(e.fan) && text(e.pump) && typeof e.sunScore === 'number',
  pump: e => e.pumpRan === true,
  reflect: e => e.saved === true
}
