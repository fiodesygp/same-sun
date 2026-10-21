import { beforeEach, describe, expect, it } from 'vitest'
import { coreDone, loadLearn, markDone, saveEvidence } from './learn'

const mem = new Map<string, string>()
globalThis.localStorage = {
  getItem: k => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, String(v)), removeItem: k => void mem.delete(k),
  clear: () => mem.clear(), key: i => [...mem.keys()][i] ?? null, get length() { return mem.size }
} as Storage

describe('Learn mission progress', () => {
  beforeEach(() => mem.clear())

  it('starts empty', () => {
    expect(loadLearn()).toEqual({})
    expect(coreDone(loadLearn())).toBe(0)
  })
  it('saves evidence and done, and reloads them', () => {
    saveEvidence('m4', { polarityMatters: 'yes' })
    saveEvidence('m4', { whatHappened: 'The fan spun backwards.' })
    markDone('m4')
    markDone('reflect')
    const again = loadLearn()
    expect(again.m4).toEqual({ done: true, evidence: { polarityMatters: 'yes', whatHappened: 'The fan spun backwards.' } })
    expect(coreDone(again)).toBe(1) // bonus missions are not counted in the 7
  })
  it('saving evidence keeps a mission done', () => {
    markDone('m1')
    saveEvidence('m1', { device: 'fan' })
    expect(loadLearn().m1).toEqual({ done: true, evidence: { device: 'fan' } })
  })
  it('ignores broken or unknown saved data', () => {
    mem.set('samesun:learn', JSON.stringify({ m1: { done: 'yes', evidence: [1] }, zz: { done: true }, m2: 7 }))
    expect(loadLearn()).toEqual({ m1: { done: false, evidence: {} } })
    mem.set('samesun:learn', '"oops"')
    expect(loadLearn()).toEqual({})
  })
})
