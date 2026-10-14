// The three Sun Day challenges from the prototype. Thresholds live in model.json.
import defaultModel from '../config/model.json'
import type { Design, Model, Score, SimResult } from './types'

export type ChallengeId = keyof Model['challenges']
export const CHALLENGES: ChallengeId[] = ['heat', 'fan', 'tank']

/** Apply a challenge's locked settings (weather, days, crop) and turn on the load it needs. */
export function applyChallenge(d: Design, id: ChallengeId, m: Model = defaultModel): Design {
  const c = m.challenges[id]
  const next = { ...d, ...(c.set as Partial<Design>) }
  if ('needs' in c) next[c.needs as 'fan' | 'pump'] = true
  return next
}

export function passesChallenge(id: ChallengeId, r: SimResult, s: Score, m: Model = defaultModel): boolean {
  switch (id) {
    case 'heat': {
      const c = m.challenges.heat
      return s.food >= c.foodTimesNoPanel * s.fullSun && s.food > c.minFood
    }
    case 'fan': {
      const c = m.challenges.fan
      return r.hours.filter(x => x.h >= c.fromHour && x.h <= c.toHour).every(x => x.on.fan) && s.food >= s.fullSun
    }
    case 'tank': {
      const c = m.challenges.tank
      return r.hours.filter(x => x.dry).length <= c.maxDryHours && r.hours.filter(x => x.soggy).length <= c.maxSoggyHours
    }
  }
}
