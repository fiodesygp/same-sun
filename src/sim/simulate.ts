// Same Sun simulation: pure functions ported from the first <script> in
// docs/prototype/same-sun-prototype.html. Every constant lives in model.json;
// each function takes the model as its last argument so tests can tune it.
import defaultModel from '../config/model.json'
import type { Design, Hour, LoadsOn, Model, PanelKey, Score, SimResult } from './types'

type Weather = Model['weather'][keyof Model['weather']]

const rad = (d: number) => (d * Math.PI) / 180
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

/** Sunlight (W/m2) and sun height (degrees) at hour h; a smooth arc from sunrise to sunset. */
export function sunAt(h: number, w: Weather, m: Model = defaultModel) {
  const { start, end } = m.hours
  const s = Math.max(0, Math.sin((Math.PI * (h - start)) / (end - start)))
  return { sun: m.sMax * s, elev: w.sunPeak * s }
}

/** Air temperature (degF): coolest before dawn, hottest mid-afternoon. */
export function airTemp(h: number, w: Weather, m: Model = defaultModel) {
  const mid = (w.min + w.max) / 2, amp = (w.max - w.min) / 2
  return mid + amp * Math.cos((2 * Math.PI * (h - m.airTempPeakHour)) / 24)
}

/** Share of the plant the panels shade (0-1). A high panel lets side light in; the gap only exists with both panels. */
export function shadeShare(d: Pick<Design, 'panels' | 'height'>, m: Model = defaultModel) {
  if (d.panels === 'none') return 0
  const gap = d.panels === 'both' ? m.gapShare[m.fixed.gap as keyof Model['gapShare']] : 0
  return m.panels[d.panels].cover * (1 - gap) * (1 - m.heightSideLight[d.height])
}

function powerAt(h: number, panels: PanelKey, tilt: number, w: Weather, m: Model) {
  if (panels === 'none') return 0
  const { sun, elev } = sunAt(h, w, m)
  if (sun <= 0) return 0
  const tiltFactor = Math.max(0, Math.cos(rad(tilt - (90 - elev))))
  return sun * m.panels[panels].area * m.eta * tiltFactor
}

/** Panel power (W) at hour h, at the fixed tilt (or the design's own, in Learn). */
export function panelPower(h: number, d: Pick<Design, 'panels' | 'weather' | 'tilt'>, m: Model = defaultModel) {
  return powerAt(h, d.panels, d.tilt ?? m.fixed.tilt, m.weather[d.weather], m)
}

/**
 * Which loads run this hour. Loads take power in priority order, each only if
 * enough is left. The smart pump also needs soil below the trigger and water in the tank.
 */
export function chooseLoads(
  s: { power: number; moisture: number; tank: number; fan: boolean; pump: boolean },
  m: Model = defaultModel
): LoadsOn {
  const on: LoadsOn = { fan: false, pump: false }
  const wants = { fan: s.fan, pump: s.pump && s.tank > 0 && s.moisture < m.fixed.trigger }
  const order: (keyof LoadsOn)[] = m.fixed.priority === 'pump' ? ['pump', 'fan'] : ['fan', 'pump']
  let avail = s.power
  for (const k of order) {
    if (wants[k] && avail >= m.loads[k]) {
      on[k] = true
      avail -= m.loads[k]
    }
  }
  return on
}

/** Run the design hour by hour, from sunrise to sunset, for 1 or 7 days. */
export function simulate(d: Design, m: Model = defaultModel): SimResult {
  const w = m.weather[d.weather], crop = m.crops[d.crop]
  const shade = shadeShare(d, m)
  let moisture = m.startMoisture
  let tank = d.pump ? m.tankSize[m.fixed.tank as keyof Model['tankSize']] : 0
  let total = 0
  const hours: Hour[] = [], daily: SimResult['daily'] = []

  for (let day = 0; day < d.days; day++) {
    if (day > 0) moisture = Math.max(0, moisture - m.nightLoss)
    if (!d.pump) moisture = Math.max(moisture, m.handWaterTo)
    let dayEnergy = 0, dayGrowth = 0

    for (let h = m.hours.start; h <= m.hours.end; h++) {
      const { sun, elev } = sunAt(h, w, m)
      const plantLight = sun * (1 - shade) + m.diffuse * sun * shade
      const light = plantLight / m.sMax
      const power = panelPower(h, d, m)
      const on = chooseLoads({ power, moisture, tank, fan: d.fan, pump: d.pump }, m)

      const air = airTemp(h, w, m)
      // hot air escapes under a higher panel; with no panel, height does nothing
      const leafTemp = air - (d.panels === 'none' ? 0 : m.heightCooling[d.height]) + m.domeHeat + m.leafHeat * light - (on.fan ? m.fanCooling : 0)

      let pumped = 0
      if (on.pump) {
        pumped = Math.min(m.pumpFlow, tank)
        tank -= pumped
        moisture += pumped
      }
      const { base, light: lightLoss, heat, heatAbove } = m.soilLoss
      const loss = crop.water * (base + lightLoss * light + heat * Math.max(0, leafTemp - heatAbove))
      moisture = clamp(moisture - loss, 0, 1)

      const lightFactor = Math.min(1, plantLight / crop.sat)
      const top = crop.stress + m.heatZeroAbove
      const tempFactor = leafTemp <= crop.hi ? 1 : leafTemp >= top ? 0 : 1 - (leafTemp - crop.hi) / (top - crop.hi)
      const waterFactor =
        moisture < m.wilt ? 0
        : moisture < m.dryBelow ? (moisture - m.wilt) / (m.dryBelow - m.wilt)
        : moisture > m.fieldCapacity ? m.soggyGrowth
        : 1
      const growth = sun > 0 ? m.growMax * lightFactor * tempFactor * waterFactor : 0

      total += growth
      dayEnergy += power
      dayGrowth += growth
      hours.push({
        day, h, sun, elev, plantLight, power, airTemp: air, leafTemp, moisture, tank, pumped, on,
        lightFactor, tempFactor, waterFactor, growth, totalGrowth: total,
        hot: leafTemp > crop.stress, dry: moisture < m.dryBelow, soggy: moisture > m.fieldCapacity
      })
    }
    daily.push({ energy: dayEnergy, growth: dayGrowth })
  }

  return { hours, daily, energy: daily.reduce((a, x) => a + x.energy, 0), growth: total, shade }
}

/** Growth of the same plant in full sun with no panel, watered by hand. */
export function fullSunGrowth(d: Design, m: Model = defaultModel) {
  return simulate({ ...d, panels: 'none', fan: false, pump: false }, m).growth
}

/** Energy (Wh) of the best panel setup: both panels at their best fixed tilt. */
export function bestEnergy(d: Pick<Design, 'weather' | 'days'>, m: Model = defaultModel) {
  const { panels, tiltFrom, tiltTo, tiltStep } = m.bestPanel
  let best = 0
  for (let tilt = tiltFrom; tilt <= tiltTo; tilt += tiltStep) {
    let e = 0
    for (let h = m.hours.start; h <= m.hours.end; h++) e += powerAt(h, panels as PanelKey, tilt, m.weather[d.weather], m)
    best = Math.max(best, e * d.days)
  }
  return best
}

/** Growth on a perfect run: full sun, never too hot, never too dry. */
export function idealGrowth(d: Pick<Design, 'crop' | 'weather' | 'days'>, m: Model = defaultModel) {
  const crop = m.crops[d.crop]
  let n = 0
  for (let h = m.hours.start; h <= m.hours.end; h++) n += Math.min(1, sunAt(h, m.weather[d.weather], m).sun / crop.sat)
  return n * d.days * m.growMax
}

/**
 * Sun Score, after the land equivalent ratio used for real agrivoltaics:
 * food as a share of a perfect run plus energy as a share of the best panel setup.
 */
export function score(d: Design, r: SimResult, m: Model = defaultModel): Score {
  const ideal = idealGrowth(d, m)
  const food = r.growth / ideal
  const energy = r.energy / Math.max(0.001, bestEnergy(d, m))
  return { food, energy, total: food + energy, fullSun: fullSunGrowth(d, m) / ideal }
}
