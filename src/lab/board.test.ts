import { describe, expect, it } from 'vitest'
import { TERM3D } from '../views/buildLab/layout3d'
import { boardModel } from './board'
import { evaluate, LEVELS, levelTerms, partStates, power, TERMS, type Wire } from './circuit'

/** wire sets that cover working, backwards, chained and loose parts */
const CASES: [number, Wire[]][] = [
  [0, [['p+', 'mA'], ['p-', 'mB']]],
  [0, [['p+', 'mB'], ['p-', 'mA']]],
  [1, [['p+', 'lL'], ['p-', 'lS']]],
  [1, [['p+', 'lS'], ['p-', 'lL']]],
  [2, [['p+', 'mA'], ['p-', 'mB'], ['q+', 'lL'], ['q-', 'lS']]],
  [2, [['p+', 'rA'], ['rB', 'lL'], ['lS', 'p-'], ['q+', 'mA'], ['q-', 'mB']]],
  [3, [['q+', 'w+'], ['q-', 'w-']]],
  [3, [['p+', 'w+'], ['p-', 'w-']]],
  [4, [['p+', 'mA'], ['mB', 'lL'], ['lS', 'p-']]],
  [4, [['p+', 'mA'], ['p-', 'mB'], ['p+', 'w+'], ['p-', 'w-'], ['q+', 'lL'], ['q-', 'lS']]],
  [4, [['mA', 'lL']]]
]

describe('the board model (shared by 2D and 3D)', () => {
  it('agrees with the circuit checker on every part', () => {
    for (const [level, wires] of CASES) {
      const pw = power(evaluate(wires, level), level), m = boardModel(level, wires, true, pw, false)
      const st = partStates(level, wires, true)
      if (LEVELS[level].parts.includes('motor')) expect(m.motorDir, `${level} motor`).toBe(st.motor === 'working' || st.motor === 'slow' ? 1 : st.motor === 'backwards' ? -1 : 0)
      if (LEVELS[level].parts.includes('led')) expect(m.ledOn, `${level} led`).toBe(st.led === 'working')
      if (LEVELS[level].parts.includes('pump')) expect(m.pumpFull, `${level} pump`).toBe(st.pump === 'working')
    }
  })
  it('nothing runs with the sun off', () => {
    const [level, wires] = CASES[0], m = boardModel(level, wires, false, power(evaluate(wires, level), level), false)
    expect([m.motorDir, m.ledOn, m.pumpDir]).toEqual([0, false, 0])
  })
  it('colours each wire by its side', () => {
    const wires: Wire[] = [['p+', 'mA'], ['p-', 'mB']]
    expect(boardModel(0, wires, true, power(evaluate(wires, 0), 0), false).wireNet).toEqual(['+', '−'])
    // a wire that touches neither side is loose
    const loose: Wire[] = [['mA', 'mB']]
    expect(boardModel(0, loose, true, power(evaluate(loose, 0), 0), false).wireNet).toEqual([null])
  })
  it('3D has a place for every terminal, and the same terminals as 2D', () => {
    for (let level = 0; level < LEVELS.length; level++) expect(boardModel(level, [], false, power(evaluate([], level), level), false).terms).toEqual(levelTerms(level))
    expect(Object.keys(TERM3D).sort()).toEqual([...TERMS].sort())
  })
  it('3D terminals in the same row are at least 1.3 apart', () => {
    const ps = Object.values(TERM3D)
    for (const a of ps) for (const b of ps) if (a !== b && a[2] === b[2]) expect(Math.abs(a[0] - b[0])).toBeGreaterThanOrEqual(1.3 - 1e-9)
  })
})
