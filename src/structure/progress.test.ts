import { beforeEach, describe, expect, it } from 'vitest'
import { FACILITY, isRightMaterial, MATERIAL_CHECKS, MATERIAL_IDS } from './materials'
import { allMaterialsChecked, answerMaterial, loadStructure, skipMaterials } from './progress'

const mem = new Map<string, string>()
globalThis.localStorage = {
  getItem: k => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, String(v)), removeItem: k => void mem.delete(k),
  clear: () => mem.clear(), key: i => [...mem.keys()][i] ?? null, get length() { return mem.size }
} as Storage

describe('Structure materials', () => {
  beforeEach(() => mem.clear())

  it('has 8 materials, each with a quick check whose answer is one of its choices', () => {
    expect(MATERIAL_IDS).toHaveLength(8)
    for (const id of MATERIAL_IDS) expect(MATERIAL_CHECKS[id].choices).toContain(MATERIAL_CHECKS[id].answer)
  })
  it('flags metal on pipe cleaners and clothespins, and the cut cup as sharp', () => {
    expect(FACILITY.pipe).toContain('metal')
    expect(FACILITY.clothespins).toContain('metal')
    expect(FACILITY.cup).toContain('sharp')
    expect(FACILITY.bands).toEqual([])
  })
  it('remembers right answers only, and all 8 open the builder', () => {
    expect(isRightMaterial('straws', 'thin')).toBe(true)
    expect(answerMaterial('straws', 'thick').right).toBe(false)
    expect(loadStructure().checked).toEqual([])
    for (const id of MATERIAL_IDS) answerMaterial(id, MATERIAL_CHECKS[id].answer)
    expect(allMaterialsChecked(loadStructure())).toBe(true)
    expect(JSON.parse(mem.get('samesun:structure')!).checked).toHaveLength(8)
  })
  it('remembers skipping ahead', () => {
    skipMaterials()
    expect(loadStructure().skipped).toBe(true)
  })
})
