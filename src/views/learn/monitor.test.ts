import { describe, expect, it } from 'vitest'
import { monitorAt } from './monitor'

describe('Sun Monitor', () => {
  it('shows more light and power at noon than early morning', () => {
    const early = monitorAt(7, 25, false), noon = monitorAt(12.5, 25, false)
    expect(noon.fc).toBeGreaterThan(early.fc)
    expect(noon.w).toBeGreaterThan(0)
  })
  it('a cloud cuts the light', () => {
    expect(monitorAt(12, 25, true).fc).toBeLessThan(monitorAt(12, 25, false).fc)
  })
  it('the pump runs at some point in the day, and soil moisture goes up after it', () => {
    const day = Array.from({ length: 12 }, (_, i) => monitorAt(7 + i, 25, false))
    const i = day.findIndex(r => r.pump)
    expect(i).toBeGreaterThan(0)
    expect(day[i].soil).toBeGreaterThan(day[i - 1].soil)
  })
  it('gives soil moisture as a percent and watts as volts times amps', () => {
    const r = monitorAt(14, 40, false)
    expect(r.soil).toBeGreaterThanOrEqual(0)
    expect(r.soil).toBeLessThanOrEqual(100)
    expect(r.w).toBeCloseTo(r.v * r.a, 9)
  })
})
