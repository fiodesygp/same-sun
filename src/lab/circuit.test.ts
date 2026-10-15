import { describe, expect, it } from 'vitest'
import model from '../config/model.json'
import {
  BASE_WIRES, dealPuzzle, evaluate, FAULTS, faultsLeft, FIX, hasPower, labStatus, levelTerms, LEVELS, makePuzzle, nets, panelWatts,
  partStates, shareLoads, starCheck, starCount, type FaultId, type Wire
} from './circuit'

const FAN = 0, LED = 1, BOTH = 2, PUMP = 3, ALL5 = 4
const st = (level: number, w: Wire[], burnt = false) => partStates(level, w, true, 0, burnt)
const status = (level: number, w: Wire[], burnt = false) => labStatus(level, w, false, true, { burnt })

describe('nets', () => {
  it('joins terminals through chains of wires', () => {
    const f = nets([['p+', 'mA'], ['mA', 'lL']])
    expect(f('p+')).toBe(f('lL'))
    expect(f('p+')).not.toBe(f('p-'))
  })
})

describe('levels 1 and 2 stay simple: big panel only, no resistor', () => {
  it('shows only the big panel and the part', () => {
    expect(levelTerms(FAN)).toEqual(['p+', 'p-', 'mA', 'mB'])
    expect(levelTerms(LED)).toEqual(['p+', 'p-', 'lL', 'lS'])
  })
  it('fan: correct, reversed, missing', () => {
    expect(status(FAN, [['p+', 'mA'], ['p-', 'mB']])).toEqual({ id: 'fanOk', tone: 'ok', done: true })
    expect(status(FAN, [['p+', 'mB'], ['p-', 'mA']])).toMatchObject({ id: 'fanBackwards', tone: 'warn' })
    expect(status(FAN, [['p+', 'mA']]).id).toBe('fanNothing')
  })
  it('LED lights only when + goes to the long leg, and never burns on level 2', () => {
    expect(status(LED, [['p+', 'lL'], ['p-', 'lS']])).toEqual({ id: 'ledOk', tone: 'ok', done: true })
    expect(status(LED, [['p+', 'lS'], ['p-', 'lL']]).id).toBe('ledBackwards')
    expect(evaluate([['p+', 'lL'], ['p-', 'lS']], LED).tooMuch).toBe(false)
  })
  it('short circuit and guidance before the sun', () => {
    expect(status(FAN, [['p+', 'p-']])).toMatchObject({ id: 'short', tone: 'warn' })
    expect(labStatus(FAN, [], false, false).id).toBe('start')
    expect(labStatus(FAN, [], true, false).id).toBe('pickSecond')
    expect(labStatus(FAN, [['p+', 'mA']], false, false).id).toBe('turnOnSun')
  })
})

describe('panel choice', () => {
  it('levels 3 to 6 show both panels and the resistor', () => {
    for (const l of [BOTH, PUMP, ALL5, FIX]) expect(levelTerms(l)).toEqual(expect.arrayContaining(['p+', 'p-', 'q+', 'q-', 'rA', 'rB']))
  })
  it('small panel: LED glows, fan spins slowly, pump only trickles', () => {
    expect(shareLoads(panelWatts('small'), ['led']).led).toBe(true)
    const fan = shareLoads(panelWatts('small'), ['motor']).motor
    expect(fan).toBeGreaterThan(0)
    expect(fan).toBeLessThan(1)
    expect(shareLoads(panelWatts('small'), ['pump']).pump).toBe('trickle')
    expect(st(ALL5, [['q+', 'mA'], ['q-', 'mB']]).motor).toBe('slow')
    expect(st(PUMP, [['q+', 'w+'], ['q-', 'w-']]).pump).toBe('trickle')
    expect(status(PUMP, [['q+', 'w+'], ['q-', 'w-']])).toMatchObject({ id: 'weak', done: false })
  })
  it('big panel: everything at full power', () => {
    expect(shareLoads(panelWatts('big'))).toEqual({ led: true, motor: 1, pump: 'full' })
    expect(status(PUMP, [['p+', 'w+'], ['p-', 'w-']])).toEqual({ id: 'pumpOk', tone: 'ok', done: true })
  })
  it('the panel watts come from model.json', () => {
    expect(panelWatts('small')).toBe(model.lab.panelWatts.small)
    expect(panelWatts('big')).toBe(model.lab.panelWatts.big)
  })
  it('each part can use a different panel', () => {
    const w: Wire[] = [['q+', 'lL'], ['q-', 'lS'], ['p+', 'mA'], ['p-', 'mB']]
    expect(evaluate(w, BOTH).conn).toMatchObject({ led: { panel: 'small', dir: 1 }, motor: { panel: 'big', dir: 1 } })
    expect(status(BOTH, w)).toEqual({ id: 'bothOk', tone: 'ok', done: true })
  })
  it('joining the two panels is explained', () => {
    expect(status(BOTH, [['p+', 'q+'], ['p+', 'mA'], ['p-', 'mB']])).toMatchObject({ id: 'panelsJoined', tone: 'warn' })
  })
})

describe('resistor and LED', () => {
  const fan: Wire[] = [['p+', 'mA'], ['p-', 'mB']]
  it('LED on the big panel without a resistor burns out', () => {
    const w: Wire[] = [...fan, ['p+', 'lL'], ['p-', 'lS']]
    expect(evaluate(w, BOTH).tooMuch).toBe(true)
    expect(st(BOTH, w).led).toBe('tooMuch')
    expect(status(BOTH, w)).toMatchObject({ id: 'ledBurnt', done: false })
    expect(st(BOTH, w, true).led).toBe('burnt')
  })
  it('a burnt LED stays dark until replaced, even after the resistor is added', () => {
    const fixed: Wire[] = [...fan, ['p+', 'rA'], ['rB', 'lL'], ['lS', 'p-']]
    expect(st(BOTH, fixed, true).led).toBe('burnt')
    expect(st(BOTH, fixed, false).led).toBe('working')
  })
  it('the resistor can sit on either leg, in series with the LED inside a parallel circuit', () => {
    const longSide: Wire[] = [...fan, ['p+', 'rA'], ['rB', 'lL'], ['lS', 'p-']]
    const shortSide: Wire[] = [...fan, ['p+', 'lL'], ['lS', 'rB'], ['rA', 'p-']]
    for (const w of [longSide, shortSide]) {
      expect(evaluate(w, BOTH).conn.led).toEqual({ panel: 'big', dir: 1, viaResistor: true })
      expect(evaluate(w, BOTH).tooMuch).toBe(false)
      expect(status(BOTH, w)).toEqual({ id: 'bothOk', tone: 'ok', done: true })
    }
  })
  it('a reversed LED through the resistor is still backwards', () => {
    expect(st(BOTH, [...fan, ['p+', 'rA'], ['rB', 'lS'], ['lL', 'p-']]).led).toBe('backwards')
  })
  it('LED on the small panel needs no resistor', () => {
    const w: Wire[] = [...fan, ['q+', 'lL'], ['q-', 'lS']]
    expect(evaluate(w, BOTH).tooMuch).toBe(false)
    expect(st(BOTH, w).led).toBe('working')
  })
  it('a resistor with both ends joined is not in the path', () => {
    expect(st(BOTH, [...fan, ['p+', 'rA'], ['rA', 'rB'], ['rB', 'lL'], ['lS', 'p-']]).led).toBe('tooMuch')
  })
})

describe('chains (series)', () => {
  it('fan and LED one after the other, even through the resistor', () => {
    const direct: Wire[] = [['p+', 'mA'], ['mB', 'lL'], ['lS', 'p-']]
    const viaR: Wire[] = [['p+', 'mA'], ['mB', 'rA'], ['rB', 'lL'], ['lS', 'p-']]
    for (const w of [direct, viaR]) {
      expect(evaluate(w, BOTH).chain.sort()).toEqual(['led', 'motor'])
      expect(status(BOTH, w)).toMatchObject({ id: 'allSeries', tone: 'warn' })
    }
  })
  it('a working parallel circuit with one wire removed is not a chain', () => {
    const w: Wire[] = [['p-', 'mB'], ['p+', 'rA'], ['rB', 'lL'], ['lS', 'p-']]
    expect(evaluate(w, BOTH).chain).toEqual([])
    expect(status(BOTH, w).id).toBe('allSome')
  })
  it('three parts in a chain on level 5', () => {
    expect(st(ALL5, [['p+', 'mA'], ['mB', 'w+'], ['w-', 'lL'], ['lS', 'p-']])).toEqual({ motor: 'chain', led: 'chain', pump: 'chain' })
  })
})

describe('level 5 · All and the cloud', () => {
  const solved: Wire[] = [['p+', 'mA'], ['p-', 'mB'], ['p+', 'w+'], ['p-', 'w-'], ['q+', 'lL'], ['q-', 'lS']]
  it('is solved with each part on its own path', () => {
    expect(status(ALL5, solved)).toEqual({ id: 'allOk', tone: 'ok', done: true })
    expect(status(ALL5, BASE_WIRES).id).toBe('allOk')
  })
  it('names a part that is not connected or backwards', () => {
    expect(st(ALL5, solved.slice(0, 4)).led).toBe('notConnected')
    expect(st(ALL5, [['p+', 'mB'], ['p-', 'mA'], ...solved.slice(2)]).motor).toBe('backwards')
  })
  it('a cloud keeps level 5 solved and shows the cloud message', () => {
    expect(labStatus(ALL5, solved, false, true, { cloudy: true })).toEqual({ id: 'cloud', tone: '', done: true })
  })
  it('as power drops: the pump stops first, then the fan slows and stops, and the LED last', () => {
    const offAt: Record<string, number> = {}
    let slowedAt = -1
    for (let w = panelWatts('big'); w >= 0; w -= 0.01) {
      const l = shareLoads(w)
      if (l.pump !== 'full') offAt.pump ??= w
      if (l.motor < 1 && l.motor > 0 && slowedAt < 0) slowedAt = w
      if (l.motor === 0) offAt.motor ??= w
      if (!l.led) offAt.led ??= w
    }
    expect(offAt.pump).toBeGreaterThan(offAt.motor)
    expect(slowedAt).toBeGreaterThan(offAt.motor)
    expect(offAt.motor).toBeGreaterThan(offAt.led)
  })
  it('under a full cloud only the LED keeps glowing', () => {
    expect(shareLoads(panelWatts('big', 1))).toEqual({ led: true, motor: 0, pump: 'off' })
  })
})

describe('stars', () => {
  it('1 star for solving, 2 for no more wires than the minimum, 3 for working on the first sun test', () => {
    const min = LEVELS[BOTH].minWires
    const four: Wire[] = [['q+', 'lL'], ['q-', 'lS'], ['p+', 'mA'], ['p-', 'mB']]
    const five: Wire[] = [['p+', 'mA'], ['p-', 'mB'], ['p+', 'rA'], ['rB', 'lL'], ['lS', 'p-']]
    expect(four).toHaveLength(min)
    expect(starCount(starCheck(BOTH, four, true, true))).toBe(3)
    expect(starCount(starCheck(BOTH, four, true, false))).toBe(2)
    expect(starCount(starCheck(BOTH, five, true, true))).toBe(2)
    expect(starCount(starCheck(BOTH, five, true, false))).toBe(1)
    expect(starCount(starCheck(BOTH, four, false, true))).toBe(0)
  })
  it('every level can be solved with exactly its minimum number of wires', () => {
    const best: Wire[][] = [
      [['p+', 'mA'], ['p-', 'mB']],
      [['p+', 'lL'], ['p-', 'lS']],
      [['q+', 'lL'], ['q-', 'lS'], ['p+', 'mA'], ['p-', 'mB']],
      [['p+', 'w+'], ['p-', 'w-']],
      [['p+', 'mA'], ['p-', 'mB'], ['p+', 'w+'], ['p-', 'w-'], ['q+', 'lL'], ['q-', 'lS']],
      BASE_WIRES
    ]
    best.forEach((w, l) => {
      expect(w, `level ${l + 1}`).toHaveLength(LEVELS[l].minWires)
      expect(status(l, w).done, `level ${l + 1}`).toBe(true)
    })
  })
})

describe('tester', () => {
  const w: Wire[] = [['p+', 'rA'], ['rB', 'lL'], ['lS', 'p-']]
  it('finds power along wires and through the resistor, from a panel +', () => {
    expect(hasPower('p+', w, ALL5, true)).toBe(true)
    expect(hasPower('rA', w, ALL5, true)).toBe(true)
    expect(hasPower('lL', w, ALL5, true)).toBe(true)
    expect(hasPower('lS', w, ALL5, true)).toBe(false)
    expect(hasPower('mA', w, ALL5, true)).toBe(false)
    expect(hasPower('q+', w, ALL5, true)).toBe(true)
  })
  it('shows no power with the sun off, and never changes the circuit', () => {
    expect(hasPower('p+', w, ALL5, false)).toBe(false)
    const before = JSON.stringify(w)
    hasPower('lL', w, ALL5, true)
    expect(JSON.stringify(w)).toBe(before)
  })
})

describe('level 6 · Fix it', () => {
  const fix = (wires: Wire[]) => wires
  it('starts from a working base circuit', () => {
    expect(faultsLeft({ faults: [], wires: BASE_WIRES, parts: [] }, BASE_WIRES, false)).toBe(0)
    expect(status(FIX, BASE_WIRES)).toEqual({ id: 'fixOk', tone: 'ok', done: true })
  })
  it('every fault type is detected on its own part and fixed by restoring the wiring', () => {
    const broken: Record<FaultId, { part: string; states: string[] }> = {
      ledReversed: { part: 'led', states: ['backwards'] },
      wireMissing: { part: 'motor', states: ['notConnected'] },
      pumpBackwards: { part: 'pump', states: ['backwards'] },
      ledNoResistor: { part: 'led', states: ['tooMuch'] },
      fanInSeries: { part: 'motor', states: ['chain'] }
    }
    for (const fault of FAULTS) {
      const pz = makePuzzle([fault])
      const s = st(FIX, pz.wires)
      expect(broken[fault].states, fault).toContain(s[broken[fault].part as 'led'])
      expect(faultsLeft(pz, pz.wires, false), fault).toBe(1)
      expect(faultsLeft(pz, fix(BASE_WIRES), false), fault).toBe(0)
    }
  })
  it('a burnt LED from the missing-resistor fault also needs Replace LED', () => {
    const pz = makePuzzle(['ledNoResistor'])
    expect(faultsLeft(pz, BASE_WIRES, true)).toBe(1)
    expect(faultsLeft(pz, BASE_WIRES, false)).toBe(0)
  })
  it('deals exactly 2 faults on different parts, and counts them down as each is fixed', () => {
    let seed = 1
    const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
    for (let i = 0; i < 60; i++) {
      const pz = dealPuzzle(rand)
      expect(pz.faults).toHaveLength(2)
      expect(new Set(pz.faults).size).toBe(2)
      expect(pz.parts[0].some(p => pz.parts[1].includes(p))).toBe(false)
      expect(faultsLeft(pz, pz.wires, false)).toBe(2)
      // fix the first fault only: put back the wiring of the parts it broke
      const fixed = pz.parts[0]
      const partWires = (ws: Wire[], part: string) => ws.filter(w => w.some(t => termPart(t) === part))
      const keep = pz.wires.filter(w => !w.some(t => fixed.includes(termPart(t) as 'led')))
      const restored = [...keep, ...fixed.flatMap(p => partWires(BASE_WIRES, p))]
      expect(faultsLeft(pz, restored, false), pz.faults.join('+')).toBe(1)
      expect(faultsLeft(pz, BASE_WIRES, false)).toBe(0)
    }
  })
})

/** which part a terminal belongs to (the resistor goes with the LED) */
function termPart(t: string) {
  return t.startsWith('m') ? 'motor' : t.startsWith('w') ? 'pump' : t.startsWith('l') || t.startsWith('r') ? 'led' : 'panel'
}
