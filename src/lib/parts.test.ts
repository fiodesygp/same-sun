import { beforeEach, describe, expect, it } from 'vitest'
import { allChecked, answerCheck, CHECKS, isRight, loadParts, PART_IDS, skipParts } from './parts'

const mem = new Map<string, string>()
globalThis.localStorage = {
  getItem: k => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, String(v)), removeItem: k => void mem.delete(k),
  clear: () => mem.clear(), key: i => [...mem.keys()][i] ?? null, get length() { return mem.size }
} as Storage

describe('quick checks', () => {
  beforeEach(() => mem.clear())

  it('have the right answers', () => {
    expect(isRight('panel', 'red')).toBe(true)
    expect(isRight('led', 'long')).toBe(true)
    expect(isRight('led', 'short')).toBe(false)
    expect(isRight('fan', 'backwards')).toBe(true)
    expect(isRight('pump', 'pump')).toBe(true)
    expect(isRight('switch', 'no')).toBe(true)
    expect(isRight('pot', 'slows')).toBe(true)
    expect(isRight('wires', 'black')).toBe(true)
    expect(isRight('lightMeter', 'light')).toBe(true)
    expect(isRight('multimeter', 'both')).toBe(true)
    expect(isRight('tachometer', 'turns')).toBe(true)
  })
  it('every answer is one of its choices, and there is one check per part', () => {
    for (const id of PART_IDS) expect(CHECKS[id].choices).toContain(CHECKS[id].answer)
    expect(Object.keys(CHECKS).sort()).toEqual([...PART_IDS].sort())
  })
  it('a wrong answer is not saved; a right one is, and all 10 unlock Try it', () => {
    expect(answerCheck('led', 'short').right).toBe(false)
    expect(loadParts().checked).toEqual([])
    for (const id of PART_IDS) answerCheck(id, CHECKS[id].answer)
    expect(allChecked(loadParts())).toBe(true)
  })
  it('remembers skipping ahead', () => {
    expect(loadParts().skipped).toBe(false)
    skipParts()
    expect(loadParts()).toEqual({ checked: [], skipped: true })
  })
})
