// What the board shows, from the circuit: which parts run and which way, and which side (+ or −)
// each wire is on. The 2D board and the 3D bench both draw from this one function, so the same
// wiring always gives the same result in both views.
import { evaluate, levelTerms, LEVELS, nets, type Dir, type Power, type TermId, type Wire } from './circuit'

export type WireNet = '+' | '−' | null

export interface BoardModel {
  /** the terminals on the board for this circuit */
  terms: TermId[]
  /** the fan: 1 forwards, -1 backwards, 0 stopped */
  motorDir: Dir
  ledOn: boolean
  /** the pump: 1 forwards, -1 backwards, 0 stopped; full = enough power for full flow */
  pumpDir: Dir
  pumpFull: boolean
  /** each wire's side, in the order of the wires */
  wireNet: WireNet[]
}

export function boardModel(level: number, wires: Wire[], sunOn: boolean, pw: Power, burnt: boolean): BoardModel {
  const Lv = LEVELS[level], ev = sunOn ? evaluate(wires, level) : null, f = nets(wires)
  const posNets = new Set(Lv.panels.map(p => f(p === 'big' ? 'p+' : 'q+'))), negNets = new Set(Lv.panels.map(p => f(p === 'big' ? 'p-' : 'q-')))
  // a part runs only when it is wired and its panel has enough power left for it
  const motorDir: Dir = ev && pw.motor > 0 && !ev.chain.includes('motor') ? ev.conn.motor.dir : 0
  const ledOn = !!ev && ev.conn.led.dir === 1 && pw.led && !burnt && !ev.chain.includes('led')
  const pumpDir: Dir = ev && pw.pump !== 'off' && !ev.chain.includes('pump') ? ev.conn.pump.dir : 0
  return {
    terms: levelTerms(level),
    motorDir, ledOn, pumpDir,
    pumpFull: pumpDir > 0 && pw.pump === 'full',
    wireNet: wires.map(([a]) => (posNets.has(f(a)) ? '+' : negNets.has(f(a)) ? '−' : null))
  }
}
