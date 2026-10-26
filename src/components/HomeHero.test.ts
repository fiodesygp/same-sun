import { describe, expect, it } from 'vitest'
import { heroSun } from './HomeHero'

// the sun and its glow (r 20) stay fully visible all day: inside the picture, clear of the panel
// (x 140-220, top at y 98) and above the far hills (tops at y 166)
describe('heroSun', () => {
  it('is never covered or cut off', () => {
    for (let i = 0; i <= 100; i++) {
      const { x, y } = heroSun(i / 100)
      expect(x - 20).toBeGreaterThanOrEqual(0)
      expect(x + 20).toBeLessThanOrEqual(360)
      expect(y - 20).toBeGreaterThanOrEqual(0)
      expect(y + 20).toBeLessThan(166)
      if (x + 20 > 140 && x - 20 < 220) expect(y + 20).toBeLessThan(98)
    }
  })
  it('rises on the left, is highest at midday and sets on the right', () => {
    expect(heroSun(0).x).toBeLessThan(heroSun(1).x)
    expect(heroSun(0.5).y).toBeLessThan(heroSun(0).y)
    expect(heroSun(0.5).y).toBeLessThan(heroSun(1).y)
  })
})
