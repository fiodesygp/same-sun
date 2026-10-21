// Electrical model for the Build Lab deck missions: volts, amps and watts from one or two small panels
// to a fan, an LED and a pump. Kept simple and correct for 12-year-olds:
// - Light on the panel comes from the sun's position (sunAt), the panel's tilt and clouds.
// - One panel: current follows the light; voltage rises quickly in dim light, then holds.
// - Two panels: series adds the voltages (same current); parallel adds the currents (same voltage).
//   Power = voltage × current, so identical panels give the same best power either way.
// - Bench: a switch (off = no current), a potentiometer that scales the fan's voltage, polarity,
//   and loads that share the current (a fan short of current slows down). Every constant is in model.json (electric), all estimates.
// The free-wiring circuits keep their own watts budget (src/lab/circuit.ts).
import defaultModel from '../config/model.json'
import { sunAt } from './simulate'
import type { Model, WeatherKey } from './types'

const rad = (d: number) => (d * Math.PI) / 180
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

export type Wiring = 'series' | 'parallel'
export type Load = 'fan' | 'led' | 'pump'
export const LOADS: Load[] = ['led', 'fan', 'pump']

/** Light reaching the panel: g is the share of full sun straight on (0-1); fc is foot-candles. */
export interface Light {
  g: number
  fc: number
}

/**
 * Light on a panel at a time of day. The panel catches most when it faces the sun:
 * tilt is the panel's angle from flat (the real frame has loops at 10°, 25° and 40°).
 */
export function lightAt(
  o: { hour: number; weather: WeatherKey; tilt: number; cloud?: boolean; shade?: number },
  m: Model = defaultModel
): Light {
  const { sun, elev } = sunAt(o.hour, m.weather[o.weather], m)
  if (sun <= 0) return { g: 0, fc: 0 }
  const facing = Math.max(0, Math.cos(rad(o.tilt - (90 - elev))))
  const g = clamp((sun / m.sMax) * facing * (o.cloud ? m.electric.cloudLight : 1) * (1 - (o.shade ?? 0)), 0, 1)
  return { g, fc: lightToFc(g, m) }
}

/** Light meter reading in foot-candles. */
export const lightToFc = (g: number, m: Model = defaultModel) => Math.round(g * m.electric.fcFullSun)

/** Volts, amps and watts at the best working point. */
export interface Out {
  v: number
  a: number
  w: number
}

const out = (v: number, a: number): Out => ({ v, a, w: v * a })

/** One panel at its best working point: current follows the light; voltage holds above the knee. */
export function panelOut(g: number, m: Model = defaultModel): Out {
  const e = m.electric
  if (g <= 0) return out(0, 0)
  return out(e.panel.vmp * clamp(g / e.voltageKnee, 0, 1), e.panel.imp * clamp(g, 0, 1))
}

/** Panel voltage with nothing connected (what a multimeter reads on a bare panel). */
export function openVoltage(g: number, panels: 1 | 2 = 1, wiring: Wiring = 'parallel', m: Model = defaultModel) {
  const v = g <= 0 ? 0 : m.electric.panel.voc * clamp(g / m.electric.voltageKnee, 0, 1)
  return panels === 2 && wiring === 'series' ? 2 * v : v
}

/** One or two identical panels: series adds the voltages, parallel adds the currents. */
export function arrayOut(g: number, panels: 1 | 2, wiring: Wiring, m: Model = defaultModel): Out {
  const p = panelOut(g, m)
  if (panels === 1) return p
  return wiring === 'series' ? out(2 * p.v, p.a) : out(p.v, 2 * p.a)
}

export interface Bench {
  /** light on the panels (0-1) */
  g: number
  panels: 1 | 2
  wiring: Wiring
  switchOn: boolean
  /** potentiometer 0-1: the share of the voltage that reaches the fan */
  pot: number
  /** the devices' wires swapped (+ to -) */
  reversed: boolean
  loads: Record<Load, boolean>
}

export interface BenchResult {
  /** what the panels can give at their best point */
  supply: Out
  /** what the connected devices actually draw */
  drawn: Out
  fan: { v: number; a: number; rpm: number }
  led: { on: boolean; a: number }
  pump: { on: boolean; flow: 'full' | 'trickle' | 'off'; a: number; mlPerMinute: number }
}

/**
 * Run the bench. The devices sit side by side (in parallel) across the panels and share their
 * current: the device that needs the least is served first, so when there is not enough current,
 * the pump (needs the most) is the one that misses out.
 */
export function runBench(b: Bench, m: Model = defaultModel): BenchResult {
  const e = m.electric
  const supply = arrayOut(b.g, b.panels, b.wiring, m)
  const res: BenchResult = {
    supply,
    drawn: out(0, 0),
    fan: { v: 0, a: 0, rpm: 0 },
    led: { on: false, a: 0 },
    pump: { on: false, flow: 'off', a: 0, mlPerMinute: 0 }
  }
  if (!b.switchOn || supply.v <= 0) return res
  const v = supply.v
  let left = supply.a
  const dir = b.reversed ? -1 : 1

  for (const load of LOADS) {
    if (!b.loads[load]) continue
    if (load === 'led') {
      // an LED only lets current through one way
      if (b.reversed || v < e.led.minV || left < e.led.amps) continue
      res.led = { on: true, a: e.led.amps }
      left -= e.led.amps
    } else if (load === 'fan') {
      const fv = v * clamp(b.pot, 0, 1)
      res.fan.v = fv
      // short of current, the motor slows down; below startShare of what it needs, it stalls
      const share = Math.min(1, left / e.fan.amps)
      if (fv < e.fan.startV || share < e.fan.startShare) continue
      res.fan = { v: fv, a: e.fan.amps * share, rpm: dir * Math.round(e.fan.rpmPerVolt * fv * share) }
      left -= res.fan.a
    } else {
      if (v < e.pump.minV || left < e.pump.amps) continue
      // pumps have a + and a - side: wired backwards they only trickle
      const flow = b.reversed ? 'trickle' : 'full'
      res.pump = { on: !b.reversed, flow, a: e.pump.amps, mlPerMinute: b.reversed ? Math.round(e.pump.mlPerMinute * 0.1) : e.pump.mlPerMinute }
      left -= e.pump.amps
    }
  }
  const a = res.led.a + res.fan.a + res.pump.a
  res.drawn = out(a > 0 ? v : 0, a)
  return res
}
