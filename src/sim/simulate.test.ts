import { describe, expect, it } from 'vitest'
import model from '../config/model.json'
import { applyChallenge, passesChallenge } from './challenges'
import { chooseLoads, panelPower, score, simulate, sunAt } from './simulate'
import type { Design, Model } from './types'

const base: Design = { crop: 'basil', weather: 'october', days: 1, panels: 'big', height: 'low', fan: true, pump: false }
const noon = (d: Design) => simulate(d).hours.find(x => x.h === 12)!

describe('sunlight and panel power', () => {
  it('no sun means no panel power', () => {
    for (const h of [0, 3, 5, 6, 20, 23]) {
      expect(sunAt(h, model.weather.october).sun).toBe(0)
      expect(panelPower(h, base)).toBe(0)
    }
    for (const x of simulate({ ...base, days: 7 }).hours) if (x.sun === 0) expect(x.power).toBe(0)
  })

  it('no panel means no power at any hour', () => {
    expect(simulate({ ...base, panels: 'none' }).energy).toBe(0)
  })

  it('Sun Day uses the fixed angle; Power can set its own', () => {
    expect(simulate({ ...base, tilt: model.fixed.tilt })).toEqual(simulate(base))
    expect(simulate({ ...base, tilt: 10 }).energy).not.toBe(simulate({ ...base, tilt: 40 }).energy)
  })
})

describe('shade', () => {
  it('more panel cover lowers plant light and leaf temperature', () => {
    const rows = (['none', 'small', 'big', 'both'] as const).map(panels => noon({ ...base, panels, fan: false }))
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].plantLight).toBeLessThan(rows[i - 1].plantLight)
      expect(rows[i].leafTemp).toBeLessThan(rows[i - 1].leafTemp)
    }
  })

  it('a high panel lets more light reach the plant than a low one', () => {
    for (const panels of ['small', 'big', 'both'] as const) {
      expect(noon({ ...base, panels, height: 'high' }).plantLight).toBeGreaterThan(noon({ ...base, panels, height: 'low' }).plantLight)
    }
  })

  it('a high panel cools the leaves', () => {
    const low = noon({ ...base, fan: false }), high = noon({ ...base, height: 'high', fan: false })
    expect(high.leafTemp).toBeLessThan(low.leafTemp)
  })

  it('with no panel, height changes nothing: same hours and same Sun Score at low and high', () => {
    for (const weather of ['october', 'july'] as const) for (const pump of [false, true]) {
      const low: Design = { ...base, weather, days: 7, panels: 'none', height: 'low', pump }
      const high: Design = { ...low, height: 'high' }
      const rl = simulate(low), rh = simulate(high)
      expect(rh.hours).toEqual(rl.hours)
      expect(score(high, rh)).toEqual(score(low, rl))
    }
  })
})

describe('fan', () => {
  it('a running fan lowers leaf temperature', () => {
    const on = simulate(base), off = simulate({ ...base, fan: false })
    const ran = on.hours.filter(x => x.on.fan)
    expect(ran.length).toBeGreaterThan(0)
    for (const x of ran) {
      const y = off.hours.find(o => o.day === x.day && o.h === x.h)!
      expect(x.leafTemp).toBeCloseTo(y.leafTemp - model.fanCooling, 9)
    }
  })
})

describe('pump', () => {
  const need = model.loads.pump, trigger = model.fixed.trigger
  const dry = trigger - 0.1, wet = trigger + 0.1

  it('runs only with enough power, soil below the trigger and water in the tank', () => {
    const run = (power: number, moisture: number, tank: number) => chooseLoads({ power, moisture, tank, fan: false, pump: true }).pump
    expect(run(need, dry, 1)).toBe(true)
    expect(run(need - 0.01, dry, 1)).toBe(false) // not enough power
    expect(run(need, wet, 1)).toBe(false) // soil already wet
    expect(run(need, trigger, 1)).toBe(false) // at the trigger is not below it
    expect(run(need, dry, 0)).toBe(false) // empty tank
    expect(chooseLoads({ power: 5, moisture: dry, tank: 1, fan: false, pump: false }).pump).toBe(false) // pump turned off
  })

  it('shares power with the fan, and the fan goes first', () => {
    const both = (power: number) => chooseLoads({ power, moisture: dry, tank: 1, fan: true, pump: true })
    expect(both(need)).toEqual({ fan: true, pump: false })
    expect(both(need + model.loads.fan)).toEqual({ fan: true, pump: true })
  })

  it('holds the same rules over a whole week', () => {
    const r = simulate({ ...base, days: 7, panels: 'both', fan: false, pump: true })
    expect(r.hours.some(x => x.on.pump)).toBe(true)
    r.hours.forEach((x, i) => {
      const before = i === 0 ? { moisture: model.startMoisture, tank: model.tankSize.large } : r.hours[i - 1]
      if (!x.on.pump) return
      expect(x.power).toBeGreaterThanOrEqual(need)
      expect(before.tank).toBeGreaterThan(0)
      if (x.h !== model.hours.start) expect(before.moisture).toBeLessThan(trigger)
    })
  })

  it('an empty tank stops the pump', () => {
    const tiny: Model = { ...model, tankSize: { ...model.tankSize, large: 0.3 } }
    const r = simulate({ ...base, weather: 'july', days: 7, panels: 'both', fan: false, pump: true }, tiny)
    const empty = r.hours.findIndex(x => x.tank <= 0)
    expect(empty).toBeGreaterThan(0)
    expect(r.hours.slice(empty + 1).some(x => x.on.pump)).toBe(false)
    expect(r.hours.reduce((a, x) => a + x.pumped, 0)).toBeCloseTo(0.3, 9)
  })

  it('without the pump, the plant is watered by hand each morning', () => {
    const r = simulate({ ...base, days: 7 })
    for (const x of r.hours) expect(x.on.pump).toBe(false)
    // each morning the soil is wetter than at the end of the day before
    r.hours.forEach((x, i) => { if (x.day > 0 && x.h === model.hours.start) expect(x.moisture).toBeGreaterThan(r.hours[i - 1].moisture) })
  })
})

describe('challenges can be passed', () => {
  const play = (d: Design, id: Parameters<typeof applyChallenge>[1]) => {
    const design = applyChallenge(d, id), r = simulate(design)
    return passesChallenge(id, r, score(design, r))
  }

  it('Beat the heat: both panels, high', () => {
    expect(play({ ...base, panels: 'both', height: 'high' }, 'heat')).toBe(true)
  })
  it('Fan all afternoon: big panel', () => {
    expect(play({ ...base, panels: 'big' }, 'fan')).toBe(true)
  })
  it('Water by itself all week: both panels, pump on, fan off', () => {
    expect(play({ ...base, panels: 'both', pump: true, fan: false }, 'tank')).toBe(true)
  })
  it('a bad design does not pass', () => {
    expect(play({ ...base, panels: 'none' }, 'heat')).toBe(false)
    expect(play({ ...base, panels: 'small' }, 'fan')).toBe(false)
  })
  it('a challenge sets its weather and days, and turns on what it needs', () => {
    expect(applyChallenge({ ...base, fan: false }, 'fan')).toMatchObject({ weather: 'october', days: 1, fan: true })
    expect(applyChallenge(base, 'tank')).toMatchObject({ days: 7, pump: true })
    expect(applyChallenge({ ...base, fan: false }, 'heat')).toMatchObject({ weather: 'july', days: 7, crop: 'basil', fan: true })
  })
})

describe('matches the prototype', () => {
  // from simulate() and score() in docs/prototype/same-sun-prototype.html, run in Node
  it('basil, October, 1 day, big panel, low, fan on', () => {
    const r = simulate(base), s = score(base, r)
    const near = (got: number, want: number) => expect(Math.abs(got - want) / want).toBeLessThan(0.01)
    near(r.energy, 13.75779172780757)
    near(r.growth, 6.442536914605849)
    near(r.shade, 0.62)
    near(s.food, 0.6127331996535602)
    near(s.energy, 0.6694406517759541)
    near(s.fullSun, 0.5746632397495403)
    near(s.total, 1.2821738514295142)
    expect(r.hours.filter(x => x.on.fan)).toHaveLength(10)
  })
})
