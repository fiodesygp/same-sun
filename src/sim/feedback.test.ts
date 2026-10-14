import { describe, expect, it } from 'vitest'
import en from '../i18n/en.json'
import model from '../config/model.json'
import { compareToFullSun, losses, pickRule, type RuleId } from './feedback'
import { score, simulate } from './simulate'
import type { Design, Hour, Score, SimResult } from './types'

const base: Design = { crop: 'basil', weather: 'october', days: 1, panels: 'big', height: 'low', fan: true, pump: false }
const real = (over: Partial<Design>) => {
  const d = { ...base, ...over }, r = simulate(d)
  return pickRule(d, r, score(d, r))
}

// every design a player can make
const ALL: Design[] = []
for (const crop of ['lettuce', 'basil', 'chili'] as const) for (const weather of ['october', 'july'] as const)
  for (const days of [1, 7] as const) for (const panels of ['none', 'small', 'big', 'both'] as const)
    for (const height of ['low', 'high'] as const) for (const fan of [false, true]) for (const pump of [false, true])
      ALL.push({ crop, weather, days, panels, height, fan, pump })

// a made-up run: every hour sunny and fine unless a test says otherwise
const okHour: Hour = {
  day: 0, h: 12, sun: 900, elev: 50, plantLight: 900, power: 2, airTemp: 80, leafTemp: 80, moisture: 0.6, tank: 1, pumped: 0,
  on: { fan: true, pump: false }, lightFactor: 1, tempFactor: 1, waterFactor: 1, growth: 1, totalGrowth: 1, hot: false, dry: false, soggy: false
}
const fake = (hours: Partial<Hour>[]): SimResult => ({
  hours: hours.map((x, i) => ({ ...okHour, h: model.hours.start + i, ...x })), daily: [{ energy: 10, growth: 10 }], energy: 10, growth: 10, shade: 0.3
})
const times = (n: number, x: Partial<Hour>) => Array.from({ length: n }, () => x)
const fine: Score = { food: 0.5, energy: 0.8, total: 1.3, fullSun: 0.6 } // plant behind the no-panel plant, energy fine
const hotRun = fake(times(10, { tempFactor: 0.2, leafTemp: 100 }))

describe('pickRule across every design', () => {
  const counts: Partial<Record<RuleId, number>> = {}
  for (const d of ALL) {
    const r = simulate(d), id = pickRule(d, r, score(d, r)).id
    counts[id] = (counts[id] ?? 0) + 1
  }

  it('every rule can happen', () => {
    const ids: RuleId[] = ['lowLight', 'hotShade', 'hotFan', 'hotHeight', 'hotPlant', 'hotMax', 'dry', 'tankEmpty', 'lowEnergy', 'noPanel', 'balanced']
    for (const id of ids) expect(counts[id], id).toBeGreaterThan(0)
  })
  it('no rule covers more than 40% of designs', () => {
    for (const [id, n] of Object.entries(counts)) expect(n / ALL.length, id).toBeLessThanOrEqual(0.4)
  })
})

describe('common designs get the matching cause', () => {
  it('light: the starting design (big panel, low) shades basil too much', () => {
    expect(real({}).id).toBe('lowLight')
  })
  it('heat: lettuce in full sun on a 90 °F day', () => {
    expect(real({ crop: 'lettuce', panels: 'none', fan: false })).toMatchObject({ id: 'hotShade', vars: { hi: model.crops.lettuce.hi } })
  })
  it('heat: a heat wave with the fan off asks for the fan', () => {
    expect(real({ weather: 'july', fan: false }).id).toBe('hotFan')
  })
  it('heat: Beat the heat setup (both panels, high, fan on) suggests a hardier plant', () => {
    expect(real({ weather: 'july', days: 7, panels: 'both', height: 'high' }).id).toBe('hotPlant')
    expect(real({ crop: 'chili', weather: 'july', days: 7, panels: 'both', height: 'high' }).id).toBe('hotMax')
  })
  it('water: the pump with no panel cannot water, so the soil dries', () => {
    expect(real({ panels: 'none', pump: true }).id).toBe('dry')
    expect(real({ days: 7, panels: 'small', pump: true }).id).toBe('dry')
  })
})

describe('pickRule decisions', () => {
  it('losses are averaged over sunny hours only', () => {
    const r = fake([...times(4, { tempFactor: 0 }), ...times(4, { sun: 100, waterFactor: 0 })])
    expect(losses(r)).toEqual({ light: 0, heat: 1, water: 0 })
  })
  it('the biggest loss picks the cause', () => {
    const mixed = (light: number, heat: number, water: number) => fake(times(10, { lightFactor: 1 - light, tempFactor: 1 - heat, waterFactor: 1 - water, dry: water > 0 }))
    expect(pickRule(base, mixed(0.6, 0.4, 0.3), fine).id).toBe('lowLight')
    expect(pickRule({ ...base, panels: 'small' }, mixed(0.3, 0.6, 0.4), fine).id).toBe('hotShade')
    expect(pickRule(base, mixed(0.3, 0.4, 0.6), fine)).toEqual({ id: 'dry', vars: { dry: 10 } })
  })
  it('small losses mean a balanced result, or a nudge to add a panel', () => {
    const small = fake(times(10, { tempFactor: 1 - (model.feedback.bigLoss - 0.01) }))
    expect(pickRule(base, small, fine)).toEqual({ id: 'balanced', vars: { energy: 80 } })
    expect(pickRule({ ...base, panels: 'none' }, small, { ...fine, energy: 0 }).id).toBe('noPanel')
  })
  it('energy rule only when the plant beat the no-panel plant and energy is low', () => {
    const lowE: Score = { food: 0.7, energy: 0.3, total: 1, fullSun: 0.6 }
    expect(pickRule(base, hotRun, lowE)).toEqual({ id: 'lowEnergy', vars: { energy: 30 } })
    expect(pickRule(base, hotRun, { ...lowE, food: 0.5 }).id).not.toBe('lowEnergy') // plant fell behind
    expect(pickRule(base, hotRun, { ...lowE, energy: 0.5 }).id).not.toBe('lowEnergy') // energy fine
    expect(pickRule({ ...base, panels: 'none' }, hotRun, { ...lowE, energy: 0 }).id).not.toBe('lowEnergy')
  })
  it('too hot: suggests the next thing the player has not tried', () => {
    const id = (d: Partial<Design>) => pickRule({ ...base, ...d }, hotRun, fine).id
    expect(id({ panels: 'none' })).toBe('hotShade')
    expect(id({ panels: 'small', fan: false })).toBe('hotShade')
    expect(id({ panels: 'big', fan: false })).toBe('hotFan')
    expect(id({ panels: 'both', fan: true, height: 'low' })).toBe('hotHeight')
    expect(id({ panels: 'both', fan: true, height: 'high' })).toBe('hotPlant')
    expect(id({ panels: 'big', fan: true, height: 'high', crop: 'chili' })).toBe('hotMax')
  })
  it('too hot: counts sunny hours above the crop comfort limit', () => {
    expect(pickRule({ ...base, panels: 'none' }, hotRun, fine).vars).toEqual({ hi: model.crops.basil.hi, hours: 10 })
  })
  it('too dry: names the hour the tank ran out when the pump is on', () => {
    const r = fake([{ tank: 0.5, waterFactor: 0.2 }, { tank: 0, h: 13, waterFactor: 0.2 }, ...times(4, { tank: 0, waterFactor: 0, dry: true })])
    expect(pickRule({ ...base, pump: true }, r, fine)).toEqual({ id: 'tankEmpty', vars: { day: 1, hour: 13 } })
    expect(pickRule(base, r, fine).id).toBe('dry') // hand watering has no tank
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

describe('rule wording', () => {
  const RULES: RuleId[] = ['lowLight', 'hotShade', 'hotFan', 'hotHeight', 'hotPlant', 'hotMax', 'dry', 'tankEmpty', 'lowEnergy', 'noPanel', 'balanced']
  const text = (en as Record<string, string>)

  it('every rule has a why, a next step and three hints', () => {
    for (const id of RULES) for (const k of ['why', 'next', 'hint.0', 'hint.1', 'hint.2']) expect(text[`rules.${id}.${k}`], `${id}.${k}`).toBeTruthy()
  })
  it('never mentions a control the player cannot see', () => {
    const rules = Object.entries(text).filter(([k]) => k.startsWith('rules.'))
    for (const [k, v] of rules) expect(v, k).not.toMatch(/smart|setting|45%|tilt|\bgap\b|watering choices|soggy/i)
  })
})
