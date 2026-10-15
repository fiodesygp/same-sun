// Build Lab progress on this device, for the level buttons and the Home missions:
// which levels are solved, and the most stars earned on each (0-3).
import { load, save } from './storage'

const SOLVED = 'buildLabSolved'
const STARS = 'buildLabStars'

export const loadSolved = (): number[] => {
  const xs = load<unknown>(SOLVED, [])
  return Array.isArray(xs) ? xs.filter((x): x is number => Number.isInteger(x)) : []
}

export function markSolved(level: number) {
  const xs = loadSolved()
  if (!xs.includes(level)) save(SOLVED, [...xs, level].sort((a, b) => a - b))
}

/** Which stars a level has earned on this device (ever). */
export interface Earned {
  solved: boolean
  fewWires: boolean
  firstTry: boolean
}
const NONE: Earned = { solved: false, fewWires: false, firstTry: false }

/** Stars earned per level. Older saves kept only a count (1-3): read it as solved, then fewest wires, then first try. */
export function loadEarned(): Record<number, Earned> {
  const x = load<unknown>(STARS, {})
  if (!x || typeof x !== 'object' || Array.isArray(x)) return {}
  const out: Record<number, Earned> = {}
  for (const [k, v] of Object.entries(x)) {
    if (!/^\d+$/.test(k)) continue
    if (Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 3) out[+k] = { solved: true, fewWires: (v as number) >= 2, firstTry: (v as number) >= 3 }
    else if (v && typeof v === 'object') {
      const e = v as Partial<Earned>
      if (e.solved === true) out[+k] = { solved: true, fewWires: e.fewWires === true, firstTry: e.firstTry === true }
    }
  }
  return out
}

/** Add newly earned stars to a level (never takes any away); returns the updated table. */
export function saveEarned(level: number, e: Earned): Record<number, Earned> {
  const all = loadEarned(), was = all[level] ?? NONE
  const next = { solved: was.solved || e.solved, fewWires: was.fewWires || e.fewWires, firstTry: was.firstTry || e.firstTry }
  if (next.solved) save(STARS, { ...all, [level]: next })
  return loadEarned()
}

export const countStars = (e: Earned | undefined) => (e ? +e.solved + +e.fewWires + +e.firstTry : 0)

/** Stars per level, e.g. { 0: 3, 2: 1 }. */
export const loadStars = (): Record<number, number> => Object.fromEntries(Object.entries(loadEarned()).map(([k, e]) => [k, countStars(e)]))

export const totalStars = () => Object.values(loadStars()).reduce((a, b) => a + b, 0)
