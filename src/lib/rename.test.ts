// Build Lab was renamed Power. Its saved progress keeps the old storage keys, so nothing is lost.
import { beforeEach, describe, expect, it } from 'vitest'
import { challengesDone, loadLearn, stepsDone } from './learn'
import { loadParts } from './parts'
import { loadSolved } from './progress'
import { loadView } from './view3d'

const mem = new Map<string, string>()
globalThis.localStorage = {
  getItem: k => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, String(v)), removeItem: k => void mem.delete(k),
  clear: () => mem.clear(), key: i => [...mem.keys()][i] ?? null, get length() { return mem.size }
} as Storage

describe('renaming Build Lab to Power', () => {
  beforeEach(() => mem.clear())

  it('keeps all saved progress under the old keys', () => {
    mem.set('samesun:buildLabSolved', JSON.stringify([0, 3, 5]))
    mem.set('samesun:learn', JSON.stringify({ m4: { done: true, evidence: { polarity: 'yes' } }, m7: { done: false, evidence: { series: { v: 10, a: 0.2, w: 2 } } } }))
    mem.set('samesun:parts', JSON.stringify({ checked: ['led', 'panel'], skipped: false }))
    mem.set('samesun:benchView', '"3d"')
    const s = loadLearn()
    expect(loadSolved()).toEqual([0, 3, 5])
    expect(s.m4).toEqual({ done: true, evidence: { polarity: 'yes' } })
    expect(s.m7?.evidence).toEqual({ series: { v: 10, a: 0.2, w: 2 } })
    expect(stepsDone(s)).toBe(3) // mission 1 (level 1), the pump (level 4) and mission 4
    expect(challengesDone(s)).toBe(1) // Fix it (level 6)
    expect(loadParts().checked).toEqual(['panel', 'led'])
    expect(loadView()).toBe('3d')
    expect([...mem.keys()].sort()).toEqual(['samesun:benchView', 'samesun:buildLabSolved', 'samesun:learn', 'samesun:parts'])
  })
})
