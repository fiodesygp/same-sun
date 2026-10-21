// What missions 5-7 record from the bench. Pure, so the rules are easy to test.
import { LOADS, type BenchResult, type Load } from '../../sim/electric'
import { benchRun, type BenchState } from './Bench'

/** every set of devices you can connect: three alone, three pairs, all three */
export const COMBOS: string[] = ['led', 'fan', 'pump', 'led+fan', 'led+pump', 'fan+pump', 'led+fan+pump']

/** the connected devices as a key like "led+fan", or null when nothing is connected */
export const comboKey = (loads: Record<Load, boolean>) => LOADS.filter(l => loads[l]).join('+') || null
export const comboLoads = (key: string) => key.split('+') as Load[]

/** every connected device runs properly (the fan spins forwards, the pump at full flow) */
export function allRan(r: BenchResult, loads: Record<Load, boolean>) {
  return LOADS.filter(l => loads[l]).every(l => (l === 'led' ? r.led.on : l === 'fan' ? r.fan.rpm > 0 : r.pump.on))
}

/** Mission 5: one panel; remember whether each set of devices ran. */
export function m5Results(prev: Record<string, boolean>, s: BenchState): Record<string, boolean> | null {
  const key = comboKey(s.loads)
  if (!key) return null
  const ran = allRan(benchRun(s), s.loads)
  return prev[key] === ran ? null : { ...prev, [key]: ran }
}

/** Mission 6: a set of devices that runs now, with two panels, but not with one. */
export function newlyPowered(s: BenchState): string | null {
  const key = comboKey(s.loads)
  if (!key || s.panels !== 2) return null
  return allRan(benchRun(s), s.loads) && !allRan(benchRun({ ...s, panels: 1 }), s.loads) ? key : null
}
