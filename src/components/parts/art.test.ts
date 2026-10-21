import { describe, expect, it } from 'vitest'
import { wrap } from './art'

describe('callout labels', () => {
  it('wrap to short lines', () => {
    expect(wrap('Use the middle pin and one side')).toEqual(['Use the', 'middle pin', 'and one side'])
  })
  it('keep short words with the words after them', () => {
    expect(wrap('Selector: V o A')).toEqual(['Selector:', 'V o A'])
    expect(wrap('Cables rojo + y negro −')).toEqual(['Cables rojo +', 'y negro −'])
  })
})
