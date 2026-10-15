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

/** Best stars per level, e.g. { 0: 3, 2: 1 }. */
export function loadStars(): Record<number, number> {
  const x = load<unknown>(STARS, {})
  if (!x || typeof x !== 'object' || Array.isArray(x)) return {}
  return Object.fromEntries(Object.entries(x).filter(([k, v]) => /^\d+$/.test(k) && Number.isInteger(v) && v >= 1 && v <= 3)) as Record<number, number>
}

/** Keep the best stars for a level; returns the updated table. */
export function saveStars(level: number, stars: number): Record<number, number> {
  const all = loadStars()
  if (stars > (all[level] ?? 0)) save(STARS, { ...all, [level]: stars })
  return loadStars()
}

export const totalStars = () => Object.values(loadStars()).reduce((a, b) => a + b, 0)
