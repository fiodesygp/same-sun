import { beforeEach, describe, expect, it } from 'vitest'
import { bestScore, saveRun, type SavedRun } from './runs'
import { loadSolved, markSolved } from './progress'

// a tiny localStorage for Node
const mem = new Map<string, string>()
globalThis.localStorage = {
  getItem: k => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, String(v)), removeItem: k => void mem.delete(k),
  clear: () => mem.clear(), key: i => [...mem.keys()][i] ?? null, get length() { return mem.size }
} as Storage

const run = (score: number): SavedRun => ({
  when: Date.now(), design: { crop: 'basil', weather: 'october', days: 1, panels: 'big', height: 'low', fan: true, pump: false },
  challenge: null, guess: null, why: null, actual: 'more', score, fullSun: 57, food: 61, energy: 67
})

describe('Home mission progress', () => {
  beforeEach(() => mem.clear())

  it('best Sun Score: none until a run, then the highest ever', () => {
    expect(bestScore()).toBeNull()
    saveRun(run(90)); saveRun(run(128)); saveRun(run(100))
    expect(bestScore()).toBe(128)
  })
  it('keeps the best score after it falls out of the last 30 runs', () => {
    saveRun(run(150))
    for (let i = 0; i < 30; i++) saveRun(run(80))
    expect(bestScore()).toBe(150)
  })
  it('remembers each solved Build Lab level once', () => {
    expect(loadSolved()).toEqual([])
    markSolved(2); markSolved(0); markSolved(2)
    expect(loadSolved()).toEqual([0, 2])
  })
  it('ignores broken saved data', () => {
    mem.set('samesun:buildLabSolved', '"oops"')
    expect(loadSolved()).toEqual([])
  })
})

describe('Build Lab stars', () => {
  beforeEach(() => mem.clear())

  it('keeps the best stars per level and adds them up', async () => {
    const { loadStars, saveStars, totalStars } = await import('./progress')
    expect(loadStars()).toEqual({})
    saveStars(0, 2); saveStars(0, 1); saveStars(2, 3)
    expect(loadStars()).toEqual({ 0: 2, 2: 3 })
    saveStars(0, 3)
    expect(totalStars()).toBe(6)
  })
  it('ignores broken saved stars', async () => {
    const { loadStars } = await import('./progress')
    mem.set('samesun:buildLabStars', '{"0": 7, "x": 2, "1": 2}')
    expect(loadStars()).toEqual({ 1: 2 })
  })
})
