import { describe, expect, it } from 'vitest'
import model from '../config/model.json'
import { evaluate, labStatus, levelTerms, nets, panelWatts, partStates, shareLoads, type Wire } from './circuit'

const FAN = 0, LED = 1, BOTH = 2, PUMP = 3

describe('nets', () => {
  it('joins terminals through chains of wires', () => {
    const f = nets([['p+', 'mA'], ['mA', 'lL']])
    expect(f('p+')).toBe(f('lL'))
    expect(f('p+')).not.toBe(f('p-'))
  })
})

describe('evaluate', () => {
  it('correct fan wiring blows air toward the plant', () => {
    expect(evaluate([['p+', 'mA'], ['p-', 'mB']], ['motor']).motor).toBe(1)
  })
  it('reversed fan wiring blows air away', () => {
    expect(evaluate([['p+', 'mB'], ['p-', 'mA']], ['motor']).motor).toBe(-1)
  })
  it('the LED lights only when + goes to the long leg', () => {
    expect(evaluate([['p+', 'lL'], ['p-', 'lS']], ['led'])).toMatchObject({ led: true, ledRev: false })
    expect(evaluate([['p+', 'lS'], ['p-', 'lL']], ['led'])).toMatchObject({ led: false, ledRev: true })
  })
  it('correct pump wiring flows; reversed only trickles', () => {
    expect(evaluate([['p+', 'w+'], ['p-', 'w-']], ['pump']).pump).toBe(1)
    expect(evaluate([['p+', 'w-'], ['p-', 'w+']], ['pump']).pump).toBe(-1)
  })
  it('one wire is not a circuit', () => {
    expect(evaluate([['p+', 'mA']], ['motor']).motor).toBe(0)
  })
  it('a direct + to - wire is a short circuit, and nothing runs', () => {
    expect(evaluate([['p+', 'p-']], ['motor'])).toMatchObject({ short: true, motor: 0 })
  })
  it('a short through a terminal still counts, even if the part looks wired', () => {
    const ev = evaluate([['p+', 'mA'], ['p-', 'mB'], ['mA', 'mB']], ['motor'])
    expect(ev).toMatchObject({ short: true, motor: 0 })
  })
  it('no wires is not a short', () => {
    expect(evaluate([], ['motor']).short).toBe(false)
  })
  it('parallel: fan and LED each get their own + and - path', () => {
    const ev = evaluate([['p+', 'mA'], ['p-', 'mB'], ['mA', 'lL'], ['mB', 'lS']], ['motor', 'led'])
    expect(ev).toMatchObject({ short: false, motor: 1, led: true })
  })
  it('series: a chain through the fan and LED runs neither', () => {
    const ev = evaluate([['p+', 'mA'], ['mB', 'lL'], ['lS', 'p-']], ['motor', 'led'])
    expect(ev).toMatchObject({ short: false, motor: 0, led: false, ledRev: false })
  })
  it('ignores parts that are not on this level', () => {
    expect(evaluate([['p+', 'lL'], ['p-', 'lS']], ['motor'])).toMatchObject({ led: false })
  })
})

describe('labStatus', () => {
  const ok: Wire[] = [['p+', 'mA'], ['p-', 'mB']]
  it('guides before the sun is on', () => {
    expect(labStatus(FAN, [], false, false).id).toBe('start')
    expect(labStatus(FAN, [], true, false).id).toBe('pickSecond')
    expect(labStatus(FAN, ok, false, false).id).toBe('turnOnSun')
  })
  it('solves each level only with correct wiring', () => {
    expect(labStatus(FAN, ok, false, true)).toEqual({ id: 'fanOk', tone: 'ok', done: true })
    expect(labStatus(FAN, [['p+', 'mB'], ['p-', 'mA']], false, true)).toEqual({ id: 'fanBackwards', tone: 'warn', done: false })
    expect(labStatus(LED, [['p+', 'lL'], ['p-', 'lS']], false, true).id).toBe('ledOk')
    expect(labStatus(LED, [['p+', 'lS'], ['p-', 'lL']], false, true).id).toBe('ledBackwards')
    expect(labStatus(PUMP, [['p+', 'w+'], ['p-', 'w-']], false, true).id).toBe('pumpOk')
    expect(labStatus(PUMP, [['p+', 'w-'], ['p-', 'w+']], false, true).id).toBe('pumpBackwards')
  })
  it('warns about a short circuit on any level', () => {
    for (const level of [FAN, LED, BOTH, PUMP]) expect(labStatus(level, [['p+', 'p-']], false, true)).toMatchObject({ id: 'short', tone: 'warn' })
  })
  it('level 3 explains parallel, half-done and series wiring', () => {
    expect(labStatus(BOTH, [['p+', 'mA'], ['p-', 'mB'], ['p+', 'lL'], ['p-', 'lS']], false, true)).toMatchObject({ id: 'bothOk', done: true })
    expect(labStatus(BOTH, ok, false, true).id).toBe('bothFanOnly')
    expect(labStatus(BOTH, [['p+', 'lL'], ['p-', 'lS']], false, true).id).toBe('bothLedOnly')
    expect(labStatus(BOTH, [['p+', 'lS'], ['p-', 'lL']], false, true).id).toBe('bothLedBackwards')
    expect(labStatus(BOTH, [['p+', 'mA'], ['mB', 'lL'], ['lS', 'p-']], false, true)).toMatchObject({ id: 'bothSeries', done: false })
    expect(labStatus(BOTH, [['p+', 'mA']], false, true).id).toBe('bothNothing')
  })

  it('calls it a chain only when fan and LED are really in series', () => {
    const chains: Wire[][] = [
      [['p+', 'mA'], ['mB', 'lL'], ['lS', 'p-']], // fan first
      [['p+', 'lL'], ['lS', 'mB'], ['mA', 'p-']], // LED first, motor turned round
      [['p-', 'mB'], ['mA', 'lS'], ['lL', 'p+']] // drawn from the - side, LED backwards
    ]
    for (const w of chains) expect(labStatus(BOTH, w, false, true)).toMatchObject({ id: 'bothSeries', tone: 'warn' })
  })

  it('a working parallel circuit with one wire removed is not a chain', () => {
    const parallel: Wire[] = [['p+', 'mA'], ['p-', 'mB'], ['mA', 'lL'], ['mB', 'lS']]
    expect(labStatus(BOTH, parallel, false, true).id).toBe('bothOk')
    expect(labStatus(BOTH, parallel.slice(1), false, true).id).toBe('bothNothing')
    expect(labStatus(BOTH, [parallel[0], parallel[1], parallel[3]], false, true).id).toBe('bothFanOnly')
  })

  it('three loose wires are not a chain', () => {
    expect(labStatus(BOTH, [['p+', 'mA'], ['mB', 'lL'], ['lS', 'mA']], false, true).id).toBe('bothNothing')
    expect(labStatus(BOTH, [['p+', 'mA'], ['mB', 'lL'], ['p-', 'mA']], false, true).id).not.toBe('bothSeries')
  })
})

describe('levelTerms', () => {
  it('shows the panel plus the parts for each level', () => {
    expect(levelTerms(FAN)).toEqual(['p+', 'p-', 'mA', 'mB'])
    expect(levelTerms(BOTH)).toEqual(['p+', 'p-', 'mA', 'mB', 'lL', 'lS'])
    expect(levelTerms(PUMP)).toEqual(['p+', 'p-', 'w+', 'w-'])
  })
})

describe('level 5 · All', () => {
  const ALL5 = 4
  // fan, LED and pump each wired straight to the panel
  const fan: Wire[] = [['p+', 'mA'], ['p-', 'mB']]
  const led: Wire[] = [['p+', 'lL'], ['p-', 'lS']]
  const pump: Wire[] = [['p+', 'w+'], ['p-', 'w-']]
  const full = shareLoads(panelWatts(0))
  const states = (w: Wire[]) => partStates(ALL5, w, true, full)

  it('shows all eight terminals', () => {
    expect(levelTerms(ALL5)).toEqual(['p+', 'p-', 'mA', 'mB', 'lL', 'lS', 'w+', 'w-'])
  })
  it('is solved when all three parts have their own + and - path', () => {
    expect(labStatus(ALL5, [...fan, ...led, ...pump], false, true)).toEqual({ id: 'allOk', tone: 'ok', done: true })
    expect(states([...fan, ...led, ...pump])).toEqual({ motor: 'working', led: 'working', pump: 'working' })
    // joining the reds and blacks through other parts' terminals is still parallel
    expect(labStatus(ALL5, [['p+', 'mA'], ['mA', 'lL'], ['lL', 'w+'], ['p-', 'mB'], ['mB', 'lS'], ['lS', 'w-']], false, true).id).toBe('allOk')
  })
  it('names each part that is wired backwards', () => {
    const rev = { motor: [['p+', 'mB'], ['p-', 'mA']], led: [['p+', 'lS'], ['p-', 'lL']], pump: [['p+', 'w-'], ['p-', 'w+']] } as const
    for (const part of ['motor', 'led', 'pump'] as const) {
      const w = [...(part === 'motor' ? rev.motor : fan), ...(part === 'led' ? rev.led : led), ...(part === 'pump' ? rev.pump : pump)] as Wire[]
      expect(labStatus(ALL5, w, false, true)).toMatchObject({ id: 'allBackwards', tone: 'warn', done: false })
      expect(states(w)[part]).toBe('backwards')
      for (const other of (['motor', 'led', 'pump'] as const).filter(p => p !== part)) expect(states(w)[other]).toBe('working')
    }
  })
  it('names a part that is not connected', () => {
    expect(labStatus(ALL5, [...fan, ...led], false, true).id).toBe('allSome')
    expect(states([...fan, ...led])).toEqual({ motor: 'working', led: 'working', pump: 'notConnected' })
    expect(states([['p+', 'w+'], ...fan, ...led]).pump).toBe('notConnected') // only one wire
  })
  it('spots a chain of all three parts, or of two', () => {
    const chain3: Wire[] = [['p+', 'mA'], ['mB', 'lL'], ['lS', 'w+'], ['w-', 'p-']]
    expect(labStatus(ALL5, chain3, false, true)).toMatchObject({ id: 'allSeries', tone: 'warn' })
    expect(states(chain3)).toEqual({ motor: 'chain', led: 'chain', pump: 'chain' })
    const chain2: Wire[] = [['p+', 'w+'], ['w-', 'mA'], ['mB', 'p-'], ...led]
    expect(labStatus(ALL5, chain2, false, true).id).toBe('allSeries')
    expect(states(chain2)).toEqual({ motor: 'chain', led: 'working', pump: 'chain' })
  })
  it('a short circuit stops everything', () => {
    const w: Wire[] = [...fan, ...led, ...pump, ['p+', 'p-']]
    expect(labStatus(ALL5, w, false, true)).toMatchObject({ id: 'short', tone: 'warn' })
    expect(states(w)).toEqual({ motor: 'short', led: 'short', pump: 'short' })
  })
  it('waits for the sun', () => {
    expect(partStates(ALL5, [...fan, ...led, ...pump], false, full)).toEqual({ motor: 'waiting', led: 'waiting', pump: 'waiting' })
  })
  it('shows the cloud message once solved', () => {
    expect(labStatus(ALL5, [...fan, ...led, ...pump], false, true, true)).toEqual({ id: 'cloud', tone: '', done: true })
    expect(labStatus(ALL5, [...fan, ...led], false, true, true).id).toBe('allSome')
  })
})

describe('shared power under a cloud', () => {
  it('runs everything in full sun', () => {
    expect(shareLoads(panelWatts(0))).toEqual({ led: true, fan: 1, pump: true })
  })
  it('as power drops: the pump stops first, then the fan slows and stops, and the LED last', () => {
    const offAt: Record<string, number> = {}
    let slowedAt = -1
    for (let w = panelWatts(0); w >= 0; w -= 0.01) {
      const l = shareLoads(w)
      if (!l.pump) offAt.pump ??= w
      if (l.fan < 1 && l.fan > 0 && slowedAt < 0) slowedAt = w
      if (l.fan === 0) offAt.fan ??= w
      if (!l.led) offAt.led ??= w
    }
    expect(offAt.pump).toBeGreaterThan(offAt.fan)
    expect(slowedAt).toBeGreaterThan(offAt.fan)
    expect(offAt.fan).toBeGreaterThan(offAt.led)
  })
  it('under a full cloud only the LED keeps glowing', () => {
    expect(shareLoads(panelWatts(1))).toEqual({ led: true, fan: 0, pump: false })
  })
  it('uses the load thresholds from model.json', () => {
    expect(shareLoads(model.loads.led + model.loads.fan - 0.001)).toEqual({ led: true, fan: 0, pump: false })
    expect(shareLoads(model.loads.led + model.loads.fan + model.loads.pump)).toMatchObject({ led: true, pump: true })
    expect(shareLoads(model.loads.led + model.loads.fan + model.loads.pump - 0.001).pump).toBe(false)
  })
})
