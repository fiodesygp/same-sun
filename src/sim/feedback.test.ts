import { describe, expect, it } from 'vitest'
import model from '../config/model.json'
import { compareToFullSun, pickRule } from './feedback'
import { score, simulate } from './simulate'
import type { Design, Hour, Score, SimResult } from './types'

const base: Design = { crop: 'basil', weather: 'october', days: 1, panels: 'big', height: 'low', fan: true, pump: false }
const real = (over: Partial<Design>) => {
  const d = { ...base, ...over }, r = simulate(d)
  return pickRule(d, r, score(d, r))
}

// a made-up run where every hour is fine unless a test says otherwise
const okHour: Hour = {
  day: 0, h: 12, sun: 900, elev: 50, plantLight: 900, power: 2, airTemp: 80, leafTemp: 80, moisture: 0.6, tank: 1, pumped: 0,
  on: { fan: true, pump: false }, lightFactor: 1, tempFactor: 1, waterFactor: 1, growth: 1, totalGrowth: 1, hot: false, dry: false, soggy: false
}
const fake = (hours: Partial<Hour>[], shade = 0.3): SimResult => ({
  hours: hours.map((x, i) => ({ ...okHour, h: model.hours.start + i, ...x })), daily: [{ energy: 10, growth: 10 }], energy: 10, growth: 10, shade
})
const goodScore: Score = { food: 0.8, energy: 0.8, total: 1.6, fullSun: 0.6 }
const times = (n: number, x: Partial<Hour>) => Array.from({ length: n }, () => x)

describe('pickRule with real runs', () => {
  it('soil too dry', () => {
    expect(real({ crop: 'lettuce', panels: 'none', fan: false })).toMatchObject({ id: 'dry' })
  })
  it('leaves too hot', () => {
    const rule = real({ crop: 'lettuce', panels: 'small', fan: false })
    expect(rule.id).toBe('hot')
    expect(rule.vars.stress).toBe(model.crops.lettuce.stress)
  })
  it('tank ran dry', () => {
    const rule = real({ crop: 'lettuce', weather: 'july', days: 7, fan: false, pump: true })
    expect(rule.id).toBe('tankEmpty')
    expect(rule.vars.day).toBeGreaterThanOrEqual(1)
    expect(rule.vars.day).toBeLessThanOrEqual(7)
  })
  it('too little light under a low big panel', () => {
    expect(real({})).toMatchObject({ id: 'lowLight' })
  })
  it('low energy from a small panel', () => {
    expect(real({ panels: 'small' })).toMatchObject({ id: 'lowEnergy', vars: { energy: expect.any(Number) } })
  })
  it('a good balance', () => {
    expect(real({ height: 'high', fan: false })).toMatchObject({ id: 'balanced' })
  })
})

describe('pickRule order and edge cases', () => {
  it('soggy soil with the pump comes first', () => {
    const r = fake([...times(6, { soggy: true }), ...times(5, { dry: true, hot: true })])
    expect(pickRule({ ...base, pump: true }, r, goodScore)).toEqual({ id: 'soggy', vars: { soggy: 6 } })
    // without the pump, soggy soil is not the reason
    expect(pickRule(base, r, goodScore).id).toBe('dry')
  })
  it('an empty tank needs dry hours too', () => {
    const empty = fake([{ tank: 0.5 }, { tank: 0, h: 9 }, ...times(4, { tank: 0, dry: true })])
    expect(pickRule({ ...base, pump: true }, empty, goodScore)).toEqual({ id: 'tankEmpty', vars: { day: 1, hour: 9 } })
    const stillMoist = fake([{ tank: 0 }, ...times(3, { tank: 0, dry: true })])
    expect(pickRule({ ...base, pump: true }, stillMoist, goodScore).id).not.toBe('tankEmpty')
  })
  it('dry hours count only while the sun is up', () => {
    expect(pickRule(base, fake(times(4, { dry: true, sun: 0 })), goodScore).id).not.toBe('dry')
    expect(pickRule(base, fake(times(4, { dry: true })), goodScore)).toEqual({ id: 'dry', vars: { dry: 4 } })
  })
  it('dry comes before hot', () => {
    expect(pickRule(base, fake(times(4, { dry: true, hot: true })), goodScore).id).toBe('dry')
    expect(pickRule(base, fake(times(3, { hot: true })), goodScore).id).toBe('hot')
  })
  it('weak fan: fan ran under 5 hours a day', () => {
    const r = fake([...times(4, { on: { fan: true, pump: false } }), ...times(10, { on: { fan: false, pump: false } })])
    expect(pickRule(base, r, goodScore)).toEqual({ id: 'fanWeak', vars: { hours: 4 } })
    expect(pickRule({ ...base, fan: false }, r, goodScore).id).toBe('balanced')
  })
  it('fan hours are per day on a week run', () => {
    const week = fake(times(28, { on: { fan: true, pump: false } }))
    week.daily = Array.from({ length: 7 }, () => ({ energy: 1, growth: 1 }))
    expect(pickRule(base, week, goodScore)).toEqual({ id: 'fanWeak', vars: { hours: 4 } })
  })
  it('no panel', () => {
    expect(pickRule({ ...base, panels: 'none', fan: false }, fake(times(14, {}), 0), { ...goodScore, energy: 0 })).toEqual({ id: 'noPanel', vars: {} })
  })
})

describe('compareToFullSun', () => {
  const s = (food: number): Score => ({ food, energy: 0, total: food, fullSun: 0.5 })
  it('uses a small band for "about the same"', () => {
    expect(compareToFullSun(s(0.6))).toBe('more')
    expect(compareToFullSun(s(0.52))).toBe('same')
    expect(compareToFullSun(s(0.48))).toBe('same')
    expect(compareToFullSun(s(0.4))).toBe('less')
  })
})
