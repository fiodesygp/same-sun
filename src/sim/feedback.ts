// Explain-after feedback. Picks the one cause that cost the plant the most growth, then the
// next step the player can actually take. Returns a rule id and the numbers to show; the words
// live in src/i18n under rules.<id>.*. Thresholds live in model.json (feedback).
import defaultModel from '../config/model.json'
import type { Design, Hour, Model, Score, SimResult } from './types'

export type Guess = 'more' | 'same' | 'less'
export type Cause = 'light' | 'heat' | 'water'
export type RuleId =
  | 'lowLight'
  | 'hotShade' | 'hotFan' | 'hotHeight' | 'hotPlant' | 'hotMax'
  | 'dry' | 'tankEmpty'
  | 'lowEnergy' | 'noPanel' | 'balanced'
export interface Rule {
  id: RuleId
  vars: Record<string, number>
}

/** Did the plant grow more, about the same or less than the same plant in full sun with no panel? */
export function compareToFullSun(s: Score, m: Model = defaultModel): Guess {
  const w = m.feedback.sameWithin
  return s.food > s.fullSun + w ? 'more' : s.food < s.fullSun - w ? 'less' : 'same'
}

/**
 * Average growth lost per sunny hour to each cause: light (1 - light factor),
 * heat (1 - temperature factor) and water (1 - water factor). 0 = no loss, 1 = no growth.
 */
export function losses(r: SimResult, m: Model = defaultModel): Record<Cause, number> {
  const sunny = r.hours.filter(x => x.sun > m.feedback.sunnyAbove)
  const avg = (f: (x: Hour) => number) => sunny.reduce((a, x) => a + 1 - f(x), 0) / Math.max(1, sunny.length)
  return { light: avg(x => x.lightFactor), heat: avg(x => x.tempFactor), water: avg(x => x.waterFactor) }
}

const pct = (x: number) => Math.round(x * 100)

export function pickRule(d: Design, r: SimResult, s: Score, m: Model = defaultModel): Rule {
  const f = m.feedback, crop = m.crops[d.crop]
  const sunny = r.hours.filter(x => x.sun > f.sunnyAbove)

  // the plant beat the no-panel plant, so energy is the side to improve
  if (d.panels !== 'none' && s.food > s.fullSun && s.energy < f.lowEnergy) return { id: 'lowEnergy', vars: { energy: pct(s.energy) } }

  const loss = losses(r, m)
  const cause = (Object.keys(loss) as Cause[]).reduce((a, b) => (loss[b] > loss[a] ? b : a))
  if (loss[cause] < f.bigLoss) return d.panels === 'none' ? { id: 'noPanel', vars: {} } : { id: 'balanced', vars: { energy: pct(s.energy) } }

  if (cause === 'light') {
    const light = sunny.reduce((a, x) => a + x.plantLight / x.sun, 0) / Math.max(1, sunny.length)
    return { id: 'lowLight', vars: { light: pct(light) } }
  }

  if (cause === 'heat') {
    const vars = { hi: crop.hi, hours: sunny.filter(x => x.leafTemp > crop.hi).length }
    // suggest the next thing the player has not tried yet
    if (d.panels === 'none' || d.panels === 'small') return { id: 'hotShade', vars }
    if (!d.fan) return { id: 'hotFan', vars }
    if (d.height === 'low') return { id: 'hotHeight', vars }
    return { id: d.crop === 'chili' ? 'hotMax' : 'hotPlant', vars }
  }

  const empty = d.pump ? r.hours.findIndex(x => x.tank <= f.tankEmptyBelow) : -1
  if (empty >= 0) return { id: 'tankEmpty', vars: { day: r.hours[empty].day + 1, hour: r.hours[empty].h } }
  return { id: 'dry', vars: { dry: sunny.filter(x => x.dry).length } }
}
