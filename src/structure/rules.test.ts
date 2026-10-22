import { describe, expect, it } from 'vitest'
import type { Design } from './options'
import {
  angleTest, attach, facilityFlags, facilityTest, heatTest, matchPrototype, materialsFor, PROTOTYPES, runTests,
  shadeTest, slipTest, stepsFor, tryNext, wobbleTest
} from './rules'

const straw: Design = PROTOTYPES.find(p => p.id === 'strawFrame')!.design
const d = (over: Partial<Design>): Design => ({ ...straw, ...over })

describe('attaching', () => {
  it('explains picks that will not attach', () => {
    expect(attach(d({ posts: 'thickStraw', join: 'notches' })).join).toBe('notchesNeedSticks')
    expect(attach(d({ posts: 'pipe', hinge: 'axle' })).hinge).toBe('axleNeedsHoles')
    expect(attach(d({ posts: 'none', join: 'none', hinge: 'fig8' })).hinge).toBe('hingeNeedsPosts')
    expect(attach(d({ posts: 'none', join: 'none', stop: 'bandStops' })).stop).toBe('stopNeedsPosts')
    expect(attach(d({ posts: 'pipe', stop: 'notches' })).stop).toBe('notchesNeedSticks')
  })
  it('a wedge fits anywhere, and the named frames attach everywhere', () => {
    expect(attach(d({ posts: 'none', join: 'none', hinge: 'none', stop: 'wedges' })).stop).toBeNull()
    for (const p of PROTOTYPES) expect(Object.values(attach(p.design)).every(x => x === null), p.id).toBe(true)
  })
})

describe('the angle test: needs a hinge AND an angle stop', () => {
  it('no hinge: stuck at one angle', () => {
    const t = angleTest(d({ hinge: 'none' }))
    expect([t.status, t.why]).toEqual(['needsWork', 'stuck'])
  })
  it('no angle stop: flops down', () => {
    const t = angleTest(d({ stop: 'none' }))
    expect([t.status, t.why]).toEqual(['needsWork', 'flops'])
  })
  it('hinge and stop: all three angles', () => {
    expect(angleTest(straw)).toMatchObject({ status: 'pass', angles: [10, 25, 40] })
  })
  it('a hinge that will not attach does not count', () => {
    expect(angleTest(d({ posts: 'pipe', join: 'pipeWrap', hinge: 'axle', stop: 'ladder' })).why).toBe('stuck')
  })
  it('posts that are not joined fall over', () => {
    expect(angleTest(d({ posts: 'thickStraw', join: 'notches' })).why).toBe('falls')
  })
  it('swap-in wedges are hinge and stop together', () => {
    expect(angleTest(d({ posts: 'none', join: 'none', hinge: 'none', stop: 'wedges' }))).toMatchObject({ status: 'pass', why: 'wedge' })
  })
})

describe('the other tests', () => {
  it('slip at 40°: a tray with a lip tied to the hinge stays; a loose panel slides', () => {
    expect(slipTest(straw)).toMatchObject({ status: 'pass' })
    expect(slipTest(d({ holder: 'tape' }))).toMatchObject({ status: 'pass', why: 'tied' })
    expect(slipTest(d({ holder: 'loose' }))).toMatchObject({ status: 'needsWork', why: 'slides' })
  })
  it('heat: a closed cup over the dome is too hot', () => {
    expect(heatTest(d({ cupOpen: false }))).toMatchObject({ status: 'needsWork', why: 'closed' })
    expect(heatTest(straw).status).toBe('pass')
  })
  it('wobble: stiff posts held tight are steady; tape in the heat lets go', () => {
    expect(wobbleTest(d({ posts: 'stick', join: 'bands', hinge: 'fig8', stop: 'notches' })).status).toBe('pass')
    expect(wobbleTest(d({ join: 'tape' }))).toMatchObject({ status: 'needsWork', why: 'tape' })
  })
  it('shade: the panel must sit above the dome', () => {
    expect(shadeTest(d({ base: 'easel', posts: 'none', join: 'none', hinge: 'none', stop: 'wedges' })).status).toBe('needsWork')
    expect(shadeTest(d({ base: 'easel' })).status).toBe('pass')
  })
  it('facility: pipe cleaners and clothespins are metal; a fine design with prep says "ask"', () => {
    expect(facilityFlags(d({ posts: 'pipe', join: 'pipeWrap', hinge: 'eyeLoops', stop: 'ladder' }))).toContain('metal')
    expect(facilityFlags(d({ base: 'tower', stop: 'clothespin' }))).toContain('metal')
    expect(facilityFlags(d({ base: 'easel', posts: 'thickStraw', join: 'bands', hinge: 'fig8', stop: 'bandStops' }))).toEqual([])
    expect(facilityTest(straw).status).toBe('ask')
  })
  it('each named frame passes angle, slip and shade', () => {
    for (const p of PROTOTYPES) {
      const res = runTests(p.design)
      for (const id of ['angle', 'slip', 'shade'] as const) expect(res.find(x => x.id === id)!.status, `${p.id} ${id}`).toBe('pass')
    }
  })
  it('a test that needs work has a "try next" idea', () => {
    for (const t of runTests(d({ hinge: 'none', holder: 'loose', cupOpen: false, join: 'tape' }))) if (t.status === 'needsWork') expect(tryNext(t, straw), t.id).not.toBeNull()
  })
})

describe('materials, steps and the printed sheets', () => {
  it('lists the materials and steps from the choices', () => {
    expect(materialsFor(straw)).toEqual(['cup', 'straws', 'bands', 'cardstock'])
    expect(stepsFor(straw)).toEqual(['base.cup', 'base.cutCup', 'posts.thickStraw', 'join.bands', 'hinge.axle', 'stop.bandStops', 'holder.tray'])
  })
  it('names the matching printed sheet', () => {
    for (const p of PROTOTYPES) expect(matchPrototype(p.design)).toBe(p.id)
    expect(matchPrototype(d({ holder: 'tape' }))).toBeNull()
  })
})
