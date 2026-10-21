// Sun Monitor numbers: one October day in the garden with two panels in parallel, an LED, the fan
// and the smart pump. Soil moisture and when the fan and pump switch on come from the Sun Day
// simulation; volts, amps, watts, light and fan speed come from the deck missions' electrical model.
// While the smart pump waters, the fan pauses so the pump gets the current it needs.
import { lightAt, runBench } from '../../sim/electric'
import { simulate } from '../../sim/simulate'
import type { Hour } from '../../sim/types'

export const DAY = { from: 7, to: 18, step: 0.25 }

let day: Hour[] | null = null
const today = () => (day ??= simulate({ crop: 'chili', weather: 'october', days: 1, panels: 'both', height: 'high', fan: true, pump: true }).hours)

export interface Reading {
  h: number
  fc: number
  v: number
  a: number
  w: number
  rpm: number
  led: boolean
  fan: boolean
  pump: boolean
  /** soil moisture, 0-100 % */
  soil: number
}

export function monitorAt(h: number, tilt: number, cloud: boolean): Reading {
  const hours = today()
  const hr = hours.find(x => x.h === Math.floor(h)) ?? hours[0]
  const light = lightAt({ hour: h, weather: 'october', tilt, cloud })
  const r = runBench({ g: light.g, panels: 2, wiring: 'parallel', switchOn: true, pot: 1, reversed: false, loads: { led: true, fan: hr.on.fan && !hr.on.pump, pump: hr.on.pump } })
  return {
    h, fc: light.fc, v: r.drawn.v, a: r.drawn.a, w: r.drawn.w, rpm: r.fan.rpm, led: r.led.on,
    fan: r.fan.rpm > 0, pump: r.pump.on, soil: Math.round(Math.min(1, hr.moisture) * 100)
  }
}
