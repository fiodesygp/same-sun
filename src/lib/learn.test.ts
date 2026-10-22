import { beforeEach, describe, expect, it } from 'vitest'
import { challengesDone, CHALLENGES, loadLearn, markDone, migrate, PATH, saveEvidence, STEPS, stepsDone } from './learn'

const mem = new Map<string, string>()
globalThis.localStorage = {
  getItem: k => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, String(v)), removeItem: k => void mem.delete(k),
  clear: () => mem.clear(), key: i => [...mem.keys()][i] ?? null, get length() { return mem.size }
} as Storage

describe('Power path progress', () => {
  beforeEach(() => mem.clear())

  it('starts empty', () => {
    expect(loadLearn()).toEqual({})
    expect(stepsDone(loadLearn())).toBe(0)
    expect(challengesDone(loadLearn())).toBe(0)
  })
  it('saves evidence and done, and reloads them', () => {
    saveEvidence('m4', { polarityMatters: 'yes' })
    saveEvidence('m4', { whatHappened: 'The fan spun backwards.' })
    markDone('m4')
    markDone('reflect')
    const again = loadLearn()
    expect(again.m4).toEqual({ done: true, evidence: { polarityMatters: 'yes', whatHappened: 'The fan spun backwards.' } })
    expect(stepsDone(again)).toBe(2)
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

describe('the merged path', () => {
  it('has 10 steps (7 deck missions, then 3 bonus cards) and 3 challenges, in order', () => {
    expect(STEPS).toEqual(['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'pump', 'agripv', 'reflect'])
    expect(CHALLENGES).toEqual(['both', 'all', 'fix'])
    expect(PATH).toEqual([...STEPS, ...CHALLENGES])
    expect(new Set(PATH).size).toBe(13)
  })
})

describe('carrying old progress over', () => {
  beforeEach(() => mem.clear())

  it('each solved Power level marks its step done', () => {
    const s = migrate({}, [0, 1, 2, 3, 4, 5])
    expect(s.m1).toEqual({ done: true, evidence: { device: 'fan', worked: ['fan', 'led'] } })
    expect(s.both).toEqual({ done: true, evidence: { solved: true } })
    expect(s.pump).toEqual({ done: true, evidence: { pumpRan: true } })
    expect(s.all?.done && s.fix?.done).toBe(true)
    // levels 1-2 (fan, LED) and 4 (pump) count as steps; levels 3, 5 and 6 as challenges
    expect(stepsDone(s)).toBe(2)
    expect(challengesDone(s)).toBe(3)
  })
  it('only adds: Learn evidence is kept, and running it again changes nothing', () => {
    const learn = { m1: { done: false, evidence: { device: 'led', worked: ['led'] } }, m4: { done: true, evidence: { polarity: 'yes' } }, pump: { done: false, evidence: { ml: 40 } } }
    const once = migrate(learn, [0, 3])
    expect(once.m1).toEqual({ done: true, evidence: { device: 'led', worked: ['led', 'fan'] } })
    expect(once.m4).toEqual(learn.m4)
    expect(once.pump).toEqual({ done: true, evidence: { ml: 40, pumpRan: true } })
    expect(migrate(once, [0, 3])).toEqual(once)
  })
  it('loads both old keys together, saves the merge, and never deletes the old keys', () => {
    mem.set('samesun:buildLabSolved', JSON.stringify([1, 5]))
    mem.set('samesun:learn', JSON.stringify({ m7: { done: true, evidence: { series: { v: 10, a: 0.2, w: 2 } } } }))
    const s = loadLearn()
    expect(s.m1?.done && s.fix?.done && s.m7?.done).toBe(true)
    expect(mem.get('samesun:buildLabSolved')).toBe('[1,5]')
    expect(JSON.parse(mem.get('samesun:learn')!).fix.done).toBe(true)
  })
  it('ignores levels that do not exist', () => {
    expect(migrate({}, [9, -1])).toEqual({})
  })
})
