import { describe, expect, it } from 'vitest'
import { evaluate, labStatus, levelTerms, nets, type Wire } from './circuit'

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
})

describe('levelTerms', () => {
  it('shows the panel plus the parts for each level', () => {
    expect(levelTerms(FAN)).toEqual(['p+', 'p-', 'mA', 'mB'])
    expect(levelTerms(BOTH)).toEqual(['p+', 'p-', 'mA', 'mB', 'lL', 'lS'])
    expect(levelTerms(PUMP)).toEqual(['p+', 'p-', 'w+', 'w-'])
  })
})
