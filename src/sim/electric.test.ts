import { describe, expect, it } from 'vitest'
import model from '../config/model.json'
import { arrayOut, lightAt, lightToFc, openVoltage, panelOut, runBench, type Bench } from './electric'

const FULL = 1
const bench = (over: Partial<Bench> = {}): Bench => ({
  g: FULL, panels: 1, wiring: 'parallel', switchOn: true, pot: 1, reversed: false, loads: { fan: true, led: false, pump: false }, ...over
})

describe('panels', () => {
  it('series doubles the voltage and keeps the current', () => {
    const one = panelOut(FULL), two = arrayOut(FULL, 2, 'series')
    expect(two.v).toBeCloseTo(2 * one.v, 9)
    expect(two.a).toBeCloseTo(one.a, 9)
  })
  it('parallel doubles the current and keeps the voltage', () => {
    const one = panelOut(FULL), two = arrayOut(FULL, 2, 'parallel')
    expect(two.a).toBeCloseTo(2 * one.a, 9)
    expect(two.v).toBeCloseTo(one.v, 9)
  })
  it('identical panels give the same total watts in series or parallel', () => {
    for (const g of [0.1, 0.5, 1]) expect(arrayOut(g, 2, 'series').w).toBeCloseTo(arrayOut(g, 2, 'parallel').w, 9)
    expect(arrayOut(FULL, 2, 'series').w).toBeCloseTo(2 * panelOut(FULL).w, 9)
  })
  it('power is voltage times current', () => {
    const p = panelOut(0.6)
    expect(p.w).toBeCloseTo(p.v * p.a, 9)
  })
  it('no light gives 0 V, 0 A and 0 W', () => {
    expect(panelOut(0)).toEqual({ v: 0, a: 0, w: 0 })
    expect(openVoltage(0)).toBe(0)
    expect(arrayOut(0, 2, 'series')).toEqual({ v: 0, a: 0, w: 0 })
    expect(runBench(bench({ g: 0 })).fan.rpm).toBe(0)
  })
  it('current follows the light, voltage holds once there is some light', () => {
    expect(panelOut(0.5).a).toBeCloseTo(panelOut(1).a / 2, 9)
    expect(panelOut(0.5).v).toBe(panelOut(1).v)
    expect(panelOut(0.05).v).toBeLessThan(panelOut(1).v)
  })
  it('a bare panel reads its open voltage, a little more than at its best point', () => {
    expect(openVoltage(FULL)).toBe(model.electric.panel.voc)
    expect(openVoltage(FULL)).toBeGreaterThan(panelOut(FULL).v)
    expect(openVoltage(FULL, 2, 'series')).toBe(2 * model.electric.panel.voc)
  })
})

describe('light', () => {
  it('is zero at night and lower under a cloud', () => {
    expect(lightAt({ hour: 3, weather: 'october', tilt: 25 })).toEqual({ g: 0, fc: 0 })
    const clear = lightAt({ hour: 12, weather: 'october', tilt: 40 }), cloudy = lightAt({ hour: 12, weather: 'october', tilt: 40, cloud: true })
    expect(cloudy.g).toBeCloseTo(clear.g * model.electric.cloudLight, 9)
  })
  it('depends on the panel angle and the time of day', () => {
    const noon = (tilt: number) => lightAt({ hour: 12.5, weather: 'october', tilt }).g
    expect(new Set([noon(10), noon(25), noon(40)]).size).toBe(3)
    expect(lightAt({ hour: 8, weather: 'october', tilt: 40 }).g).toBeLessThan(lightAt({ hour: 12.5, weather: 'october', tilt: 40 }).g)
  })
  it('shade lowers the light on the panel', () => {
    expect(lightAt({ hour: 12, weather: 'october', tilt: 40, shade: 0.5 }).g).toBeCloseTo(lightAt({ hour: 12, weather: 'october', tilt: 40 }).g / 2, 9)
  })
  it('the light meter reads foot-candles', () => {
    expect(lightToFc(1)).toBe(model.electric.fcFullSun)
    expect(lightToFc(0.5)).toBe(model.electric.fcFullSun / 2)
  })
})

describe('bench: switch, potentiometer and polarity', () => {
  it('switch off: no current, nothing runs', () => {
    const r = runBench(bench({ switchOn: false, loads: { fan: true, led: true, pump: true } }))
    expect(r.drawn).toEqual({ v: 0, a: 0, w: 0 })
    expect(r.fan.rpm).toBe(0)
    expect(r.led.on).toBe(false)
  })
  it('potentiometer at 0% stops the fan; higher settings spin it faster', () => {
    expect(runBench(bench({ pot: 0 })).fan.rpm).toBe(0)
    const half = runBench(bench({ pot: 0.5 })).fan.rpm, full = runBench(bench({ pot: 1 })).fan.rpm
    expect(half).toBeGreaterThan(0)
    expect(full).toBeGreaterThan(half)
  })
  it('reversed polarity: the LED stays off and the fan spins backwards', () => {
    const r = runBench(bench({ reversed: true, loads: { fan: true, led: true, pump: false } }))
    expect(r.led.on).toBe(false)
    expect(r.fan.rpm).toBeLessThan(0)
    expect(Math.abs(r.fan.rpm)).toBe(runBench(bench({ loads: { fan: true, led: true, pump: false } })).fan.rpm)
  })
  it('reversed polarity: the pump only trickles', () => {
    const r = runBench(bench({ panels: 2, reversed: true, loads: { fan: false, led: false, pump: true } }))
    expect(r.pump).toMatchObject({ on: false, flow: 'trickle' })
  })
})

describe('bench: limits, two panels, series and parallel', () => {
  const only = (load: 'fan' | 'led' | 'pump') => ({ fan: load === 'fan', led: load === 'led', pump: load === 'pump' })
  it('one panel runs the LED and the fan alone and together, but not the pump', () => {
    expect(runBench(bench({ loads: only('led') })).led.on).toBe(true)
    expect(runBench(bench({ loads: only('fan') })).fan.rpm).toBeGreaterThan(0)
    expect(runBench(bench({ loads: only('pump') })).pump.on).toBe(false)
    const both = runBench(bench({ loads: { fan: true, led: true, pump: false } }))
    expect(both.led.on && both.fan.rpm > 0).toBe(true)
  })
  it('two panels in parallel run the pump, and all three together', () => {
    expect(runBench(bench({ panels: 2, wiring: 'parallel', loads: only('pump') })).pump.on).toBe(true)
    const all = runBench(bench({ panels: 2, wiring: 'parallel', loads: { fan: true, led: true, pump: true } }))
    expect(all.led.on && all.fan.rpm > 0 && all.pump.on).toBe(true)
  })
  it('series spins the fan faster; parallel helps run several loads', () => {
    const s = runBench(bench({ panels: 2, wiring: 'series' })), p = runBench(bench({ panels: 2, wiring: 'parallel' }))
    expect(s.fan.rpm).toBeGreaterThan(p.fan.rpm)
    expect(runBench(bench({ panels: 2, wiring: 'series', loads: { fan: true, led: true, pump: true } })).pump.on).toBe(false)
  })
  it('the devices share the current: what they draw is never more than the panels give', () => {
    const r = runBench(bench({ panels: 2, loads: { fan: true, led: true, pump: true } }))
    expect(r.drawn.a).toBeLessThanOrEqual(r.supply.a + 1e-9)
    expect(r.drawn.w).toBeCloseTo(r.drawn.v * r.drawn.a, 9)
  })
})
