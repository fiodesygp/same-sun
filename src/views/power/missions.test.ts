import { describe, expect, it } from 'vitest'
import { MISSIONS, PATH } from '../../lib/learn'
import { MISSION_DEFS, READY } from './missions'

describe('Power steps', () => {
  it('follow the path: 7 deck missions in deck colours, the bonus cards, then the challenges', () => {
    expect(MISSION_DEFS.map(d => d.id)).toEqual(PATH)
    expect(MISSION_DEFS.map(d => d.colour)).toEqual(['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'magenta', null, null, null, null, null, null])
    expect(MISSION_DEFS.map(d => d.kind).join(' ')).toBe('deck deck deck deck deck deck deck bonus bonus bonus challenge challenge challenge')
  })
  it('none can be marked done with no evidence', () => {
    for (const id of MISSIONS) expect(READY[id]({}), id).toBe(false)
  })
  it('each can be marked done once its "done when" is met', () => {
    const ok = {
      m1: { device: 'led' },
      m2: { tried: ['10|12|0', '25|12|0', '40|12|0'], factors: ['angle'], sentence: 'The fan was fastest at 40°.' },
      m3: { readings: [{}, {}, {}] },
      m4: { switched: true, speeds: [800, 2400], flipped: true, polarity: 'yes', whatHappened: 'The fan spun backwards.' },
      m5: { together: [['led', 'fan']] },
      m6: { newlyPowered: [['pump']] },
      m7: { series: { v: 10, a: 0.2, w: 2 }, parallel: { v: 5, a: 0.4, w: 2 } },
      both: { solved: true },
      all: { solved: true },
      fix: { solved: true },
      agripv: { light: 'Read at night', fan: 'Cool the plant', pump: 'Water it', sunScore: 128 },
      pump: { pumpRan: true },
      reflect: { saved: true }
    }
    for (const id of MISSIONS) expect(READY[id](ok[id]), id).toBe(true)
  })
  it('mission 2 needs 3 settings and an evidence sentence; mission 4 needs all three actions and an answer', () => {
    expect(READY.m2({ tried: ['a', 'b'], factors: ['angle'], sentence: 'x' })).toBe(false)
    expect(READY.m2({ tried: ['a', 'b', 'c'], factors: ['angle'], sentence: '  ' })).toBe(false)
    expect(READY.m4({ switched: true, speeds: [800], flipped: true, polarity: 'yes', whatHappened: 'x' })).toBe(false)
    expect(READY.m4({ switched: true, speeds: [800, 2400], flipped: true, polarity: 'maybe', whatHappened: 'x' })).toBe(false)
  })
})
