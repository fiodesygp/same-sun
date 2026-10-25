import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import en from '../i18n/en.json'
import es from '../i18n/es.json'
import { MATERIAL_IDS } from '../structure/materials'
import { PART_IDS } from './parts'
import { photoFor, PHOTO_CREDITS, shareAlike } from './photos'

/** the file's bytes as text, to look for metadata block names */
const latin1 = (b: Uint8Array) => new TextDecoder('latin1').decode(b)

const OK_LICENSES = ['Public domain', 'CC0 1.0', 'CC BY 2.0', 'CC BY-SA 2.0', 'CC BY-SA 3.0', 'CC BY-SA 4.0']

describe('photo credits', () => {
  it('every part and material card has a credited photo', () => {
    for (const id of [...PART_IDS, ...MATERIAL_IDS]) expect(photoFor(id), id).not.toBeNull()
    expect(PHOTO_CREDITS).toHaveLength(PART_IDS.length + MATERIAL_IDS.length)
  })
  it('each entry is complete, openly licensed (no NC or ND), and says what was changed', () => {
    for (const c of PHOTO_CREDITS) {
      expect(OK_LICENSES, c.id).toContain(c.license)
      expect(c.author && c.title && c.changes, c.id).toBeTruthy()
      expect(c.source, c.id).toMatch(/^https:\/\/(commons\.wikimedia\.org|www\.flickr\.com)\//)
      expect(c.licenseUrl, c.id).toMatch(/^https:\/\/creativecommons\.org\//)
      if (shareAlike(c)) expect(c.changes, c.id).toMatch(/same license/)
    }
  })
  it('each file exists at its stated size, at most 800 px and about 80 KB', () => {
    for (const c of PHOTO_CREDITS) {
      const b = readFileSync(`public/${c.file}`)
      expect(existsSync(`public/${c.file}`), c.file).toBe(true)
      expect(Math.max(c.width, c.height), c.id).toBeLessThanOrEqual(800)
      expect(b.length, c.id).toBeLessThanOrEqual(82000)
      // no EXIF, XMP or IPTC block (location data lives there)
      expect(latin1(b).includes('Exif\0'), c.id).toBe(false)
      expect(latin1(b).includes('Photoshop'), c.id).toBe(false)
    }
  })
  it('the cup photo is cropped and resized, and says so', () => {
    const cup = photoFor('cup')!
    expect(cup.cropped).toBe(true)
    expect(cup.changes).toMatch(/^Cropped and resized/)
    expect(Math.max(cup.width, cup.height)).toBe(800)
  })
  it('every photo has alt text in English and Spanish', () => {
    for (const c of PHOTO_CREDITS) {
      expect((en as Record<string, string>)[`photo.alt.${c.id}`], c.id).toBeTruthy()
      expect((es as Record<string, string>)[`photo.alt.${c.id}`], c.id).toBeTruthy()
    }
  })
})
