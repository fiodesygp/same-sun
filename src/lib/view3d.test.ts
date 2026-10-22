import { describe, expect, it } from 'vitest'
import { defaultView, lowPower, startView } from './view3d'

const good = { webgl: true, reducedMotion: false, cores: 8, memoryGb: 8 }

describe('2D or 3D', () => {
  it('3D by default only with WebGL, no reduced motion and a strong enough device', () => {
    expect(defaultView(good)).toBe('3d')
    expect(defaultView({ ...good, webgl: false })).toBe('2d')
    expect(defaultView({ ...good, reducedMotion: true })).toBe('2d')
    expect(defaultView({ ...good, cores: 4 })).toBe('2d')
    expect(defaultView({ ...good, memoryGb: 2 })).toBe('2d')
    expect(defaultView({ ...good, saveData: true })).toBe('2d')
  })
  it('unknown cores or memory do not count as low-power', () => {
    expect(lowPower({ webgl: true, reducedMotion: false })).toBe(false)
  })
  it('the saved choice wins, but never 3D without WebGL', () => {
    expect(startView('3d', { ...good, reducedMotion: true })).toBe('3d')
    expect(startView('2d', good)).toBe('2d')
    expect(startView('3d', { ...good, webgl: false })).toBe('2d')
    expect(startView('weird', good)).toBe('3d')
  })
})
