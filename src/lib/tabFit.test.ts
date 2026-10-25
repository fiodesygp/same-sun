import { describe, expect, it } from 'vitest'
import { tabColumns } from './tabFit'

const box = { width: 400, gap: 6, extra: 24 }

describe('tabColumns', () => {
  it('keeps one row when the widest label fits', () => {
    expect(tabColumns([50, 60, 70, 60], box)).toBe(4) // 4 * 94 + 18 = 394
    expect(tabColumns([80, 90, 100], box)).toBe(3)
  })
  it('goes 2 x 2 when one label would wrap', () => {
    expect(tabColumns([50, 60, 72, 60], box)).toBe(2) // 4 * 96 + 18 = 402
    expect(tabColumns([40, 40, 120, 40], box)).toBe(2)
  })
  it('never asks for more columns than tabs', () => {
    expect(tabColumns([300, 300], box)).toBe(2)
  })
})
