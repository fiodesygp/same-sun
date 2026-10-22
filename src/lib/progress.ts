// Power progress on this device, for the level buttons and the Home missions: which levels are solved.
import { load, save } from './storage'

const SOLVED = 'buildLabSolved'
/** stars were removed from the game; their old saved data is cleared */
const OLD_STARS = 'samesun:buildLabStars'

export const loadSolved = (): number[] => {
  const xs = load<unknown>(SOLVED, [])
  return Array.isArray(xs) ? xs.filter((x): x is number => Number.isInteger(x)) : []
}

/** Remember a solved level; returns the updated list. */
export function markSolved(level: number): number[] {
  const xs = loadSolved()
  if (!xs.includes(level)) save(SOLVED, [...xs, level].sort((a, b) => a - b))
  return loadSolved()
}

/** Remove the saved stars from earlier versions. */
export function forgetStars() {
  try {
    localStorage.removeItem(OLD_STARS)
  } catch {
    // storage blocked: nothing to remove
  }
}
