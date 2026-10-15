// Sun Day test runs, saved on this device for the Growth Story tab.
import type { ChallengeId } from '../sim/challenges'
import type { Guess } from '../sim/feedback'
import type { Design } from '../sim/types'
import { load, save } from './storage'

export type Reason = 'shade' | 'light' | 'fan' | 'pump'

export interface SavedRun {
  when: number
  design: Design
  challenge: ChallengeId | null
  guess: Guess | null
  why: Reason | null
  /** how the plant really grew compared with the no-panel plant */
  actual: Guess
  /** Sun Score out of 200 */
  score: number
  /** score of the same plant with no panel */
  fullSun: number
  food: number
  energy: number
}

const KEY = 'sunDayRuns'
const KEEP = 30

const BEST = 'sunDayBest'

export const loadRuns = () => load<SavedRun[]>(KEY, [])

export function saveRun(run: SavedRun) {
  save(KEY, [run, ...loadRuns()].slice(0, KEEP))
  // only the last runs are kept, so remember the best score separately
  save(BEST, Math.max(run.score, load<number>(BEST, 0)))
}

/** Best Sun Score ever played on this device, or null if no run yet. */
export function bestScore(): number | null {
  const runs = loadRuns(), best = load<number>(BEST, 0)
  return runs.length || best ? Math.max(best, ...runs.map(r => r.score)) : null
}
