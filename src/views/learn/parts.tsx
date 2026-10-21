// The kit's parts, each with a card: what it is, how it works, a mission to try it in, and its
// numbers (from model.json, all estimates until the real kit is measured).
import model from '../../config/model.json'
import type { Vars } from '../../i18n/t'
import { arrayOut, lightToFc, openVoltage, panelOut } from '../../sim/electric'
import type { MissionId } from '../../lib/learn'
import { num } from './Bench'

export type PartId = 'panel' | 'led' | 'fan' | 'pump' | 'switch' | 'pot' | 'lightMeter' | 'multimeter' | 'tachometer'

export interface PartDef {
  id: PartId
  /** the mission where you use it */
  mission: MissionId
  /** values for the Numbers tab */
  numbers: () => Vars
}

const e = model.electric
const full = () => panelOut(1)

export const PARTS: PartDef[] = [
  { id: 'panel', mission: 'm2', numbers: () => ({ v: num(full().v), a: num(full().a, 2), w: num(full().w, 2), voc: num(openVoltage(1)) }) },
  { id: 'led', mission: 'm1', numbers: () => ({ v: num(e.led.minV), a: num(e.led.amps, 2) }) },
  { id: 'fan', mission: 'm4', numbers: () => ({ v: num(e.fan.startV), a: num(e.fan.amps, 2), rpm: num(e.fan.rpmPerVolt, 0) }) },
  { id: 'pump', mission: 'pump', numbers: () => ({ v: num(e.pump.minV), a: num(e.pump.amps, 2), ml: num(e.pump.mlPerMinute, 0) }) },
  { id: 'switch', mission: 'm4', numbers: () => ({}) },
  { id: 'pot', mission: 'm4', numbers: () => ({}) },
  { id: 'lightMeter', mission: 'm3', numbers: () => ({ fc: num(lightToFc(1), 0), cloudFc: num(lightToFc(e.cloudLight), 0) }) },
  { id: 'multimeter', mission: 'm3', numbers: () => ({ v: num(full().v), v2: num(arrayOut(1, 2, 'series').v) }) },
  { id: 'tachometer', mission: 'm3', numbers: () => ({ v: num(full().v), rpm: num(Math.round(e.fan.rpmPerVolt * full().v), 0) }) }
]

export const part = (id: PartId) => PARTS.find(p => p.id === id)!

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

/** a simple line drawing for each part's card */
export function PartIcon({ id }: { id: PartId }) {
  const d: Record<PartId, React.ReactNode> = {
    panel: <><rect x="5" y="9" width="30" height="18" rx="2" {...S} /><path d="M15 9v18M25 9v18M5 18h30M20 27v6M13 33h14" {...S} /></>,
    led: <><path d="M14 22v-7a6 6 0 0 1 12 0v7zM12 22h16M17 22v12M23 22v8" {...S} /><path d="M30 8l3-3M32 13h4M8 13H4M10 8 7 5" {...S} /></>,
    fan: <><circle cx="20" cy="20" r="14" {...S} /><path d="M20 20c0-6 3-9 6-8s-1 7-6 8zM20 20c5 3 6 7 3 9s-5-4-3-9zM20 20c-5 3-9 2-9-1s6-3 9 1z" {...S} /></>,
    pump: <><rect x="8" y="14" width="18" height="16" rx="3" {...S} /><path d="M26 18h6v-8M32 10h-4M14 30v4M20 30v4" {...S} /><path d="M33 26c1.5 2 2 3 2 4a2 2 0 0 1-4 0c0-1 .5-2 2-4z" {...S} /></>,
    switch: <><circle cx="9" cy="24" r="3" {...S} /><circle cx="31" cy="24" r="3" {...S} /><path d="M11 22 28 12M3 24h3M34 24h3" {...S} /></>,
    pot: <><circle cx="20" cy="20" r="12" {...S} /><path d="M20 20l6-7M11 31l-3 3M29 31l3 3" {...S} /></>,
    lightMeter: <><rect x="10" y="12" width="20" height="24" rx="3" {...S} /><rect x="14" y="16" width="12" height="7" rx="1" {...S} /><path d="M20 4v4M10 7l2 3M30 7l-2 3" {...S} /></>,
    multimeter: <><rect x="9" y="4" width="22" height="28" rx="3" {...S} /><rect x="13" y="8" width="14" height="7" rx="1" {...S} /><circle cx="20" cy="24" r="4" {...S} /><path d="M14 32l-4 6M26 32l4 6" {...S} /></>,
    tachometer: <><path d="M6 28a14 14 0 1 1 28 0" {...S} /><path d="M20 28l7-9M6 28h28" {...S} /></>
  }
  return <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">{d[id]}</svg>
}
