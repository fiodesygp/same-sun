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

  it('remembers which stars each level earned, and never takes one away', async () => {
    const { loadEarned, saveEarned, loadStars, totalStars } = await import('./progress')
    expect(loadEarned()).toEqual({})
    saveEarned(0, { solved: true, fewWires: true, firstTry: false })
    saveEarned(0, { solved: true, fewWires: false, firstTry: true })
    saveEarned(2, { solved: true, fewWires: false, firstTry: false })
    expect(loadEarned()[0]).toEqual({ solved: true, fewWires: true, firstTry: true })
    expect(loadStars()).toEqual({ 0: 3, 2: 1 })
    expect(totalStars()).toBe(4)
  })
  it('reads older saves that kept only a count', async () => {
    const { loadEarned } = await import('./progress')
    mem.set('samesun:buildLabStars', '{"0": 2, "1": 3, "x": 2, "4": 9}')
    expect(loadEarned()).toEqual({ 0: { solved: true, fewWires: true, firstTry: false }, 1: { solved: true, fewWires: true, firstTry: true } })
  })
})
