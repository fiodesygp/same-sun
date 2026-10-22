import { describe, expect, it } from 'vitest'
import { BENCH_START, type BenchState } from './Bench'
import { comboKey, m5Results, newlyPowered } from './benchRules'

const only = (...l: ('led' | 'fan' | 'pump')[]) => ({ led: l.includes('led'), fan: l.includes('fan'), pump: l.includes('pump') })
const bench = (over: Partial<BenchState>): BenchState => ({ ...BENCH_START, ...over })

describe('bench missions', () => {
  it('name the connected devices in a fixed order', () => {
    expect(comboKey(only('pump', 'led'))).toBe('led+pump')
    expect(comboKey(only())).toBeNull()
  })
  it('mission 5: one panel runs the LED and fan together, not the pump', () => {
    let r = m5Results({}, bench({ loads: only('led', 'fan') }))!
    r = m5Results(r, bench({ loads: only('pump') }))!
    expect(r).toEqual({ 'led+fan': true, pump: false })
    expect(m5Results(r, bench({ loads: only('pump') }))).toBeNull()
  })
  it('mission 6: the pump is newly powered by two panels in parallel, not in series', () => {
    expect(newlyPowered(bench({ panels: 2, wiring: 'parallel', loads: only('pump') }))).toBe('pump')
    expect(newlyPowered(bench({ panels: 2, wiring: 'parallel', loads: only('led', 'fan', 'pump') }))).toBe('led+fan+pump')
    expect(newlyPowered(bench({ panels: 2, wiring: 'series', loads: only('pump') }))).toBeNull()
    expect(newlyPowered(bench({ panels: 2, loads: only('led') }))).toBeNull()
    expect(newlyPowered(bench({ panels: 1, loads: only('pump') }))).toBeNull()
  })
})
