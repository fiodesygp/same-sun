// Explain-after feedback, ported from pickRule() in the prototype. Returns a rule id and the
// numbers to show; the words live in src/i18n under rules.<id>.*. Thresholds live in model.json.
import defaultModel from '../config/model.json'
import type { Design, Model, Score, SimResult } from './types'

export type Guess = 'more' | 'same' | 'less'
export type RuleId = 'soggy' | 'tankEmpty' | 'dry' | 'hot' | 'lowLight' | 'fanWeak' | 'lowEnergy' | 'noPanel' | 'balanced'
export interface Rule {
  id: RuleId
  vars: Record<string, number>
}

/** Did the plant grow more, about the same or less than the same plant in full sun with no panel? */
export function compareToFullSun(s: Score, m: Model = defaultModel): Guess {
  const w = m.feedback.sameWithin
  return s.food > s.fullSun + w ? 'more' : s.food < s.fullSun - w ? 'less' : 'same'
}

const pct = (x: number) => Math.round(x * 100)

/** Pick the one cause that best explains the run. Rules are checked in order; the first match wins. */
export function pickRule(d: Design, r: SimResult, s: Score, m: Model = defaultModel): Rule {
  const f = m.feedback, crop = m.crops[d.crop]
  const hot = r.hours.filter(x => x.hot).length
  const dry = r.hours.filter(x => x.dry && x.sun > 0).length
  const soggy = r.hours.filter(x => x.soggy).length
  const fanHours = r.hours.filter(x => x.on.fan).length / r.daily.length
  const sunny = r.hours.filter(x => x.sun > f.sunnyAbove)
  const light = sunny.reduce((a, x) => a + x.plantLight / x.sun, 0) / Math.max(1, sunny.length)
  const lightFactor = sunny.reduce((a, x) => a + x.lightFactor, 0) / Math.max(1, sunny.length)
  const empty = d.pump ? r.hours.findIndex(x => x.tank <= f.tankEmptyBelow) : -1

  if (d.pump && soggy >= f.soggyHours) return { id: 'soggy', vars: { soggy } }
  if (d.pump && empty >= 0 && dry >= f.dryHours) return { id: 'tankEmpty', vars: { day: r.hours[empty].day + 1, hour: r.hours[empty].h } }
  if (dry >= f.dryHours) return { id: 'dry', vars: { dry } }
  if (hot >= f.hotHours) return { id: 'hot', vars: { stress: crop.stress, hot } }
  if (lightFactor < f.lowLightFactor && r.shade > f.lowLightShade) return { id: 'lowLight', vars: { light: pct(light) } }
  if (d.fan && fanHours < f.fanHoursPerDay && d.panels !== 'none') return { id: 'fanWeak', vars: { hours: Math.round(fanHours) } }
  if (d.panels !== 'none' && s.energy < f.lowEnergy) return { id: 'lowEnergy', vars: { energy: pct(s.energy) } }
  if (d.panels === 'none') return { id: 'noPanel', vars: {} }
  return { id: 'balanced', vars: { energy: pct(s.energy) } }
}
