// Build Lab levels solved on this device, for the Home missions.
import { load, save } from './storage'

const KEY = 'buildLabSolved'

export const loadSolved = (): number[] => {
  const xs = load<unknown>(KEY, [])
  return Array.isArray(xs) ? xs.filter((x): x is number => Number.isInteger(x)) : []
}

export function markSolved(level: number) {
  const xs = loadSolved()
  if (!xs.includes(level)) save(KEY, [...xs, level].sort((a, b) => a - b))
}
