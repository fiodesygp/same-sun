// Real photos of the kit's parts and materials, shown on their cards next to the drawings. Every
// photo is openly licensed; src/content/photo-credits.json says who took it, under which license,
// and what was changed. Photos are not precached: the service worker keeps each one after its card
// is first opened.
import credits from '../content/photo-credits.json'
import { load, save } from './storage'

export type Credit = (typeof credits)[number]
export const PHOTO_CREDITS: Credit[] = credits

export const photoFor = (id: string): Credit | null => PHOTO_CREDITS.find(c => c.id === id) ?? null

/** share-alike licenses: the edited copy is shared under the same license */
export const shareAlike = (c: Credit) => c.license.includes('BY-SA')

/** the license name as learners read it (public domain is translated; CC names stay as they are) */
export const licenseKey = (c: Credit) => (c.license === 'Public domain' ? 'photo.publicDomain' : null)

/** what was changed, as i18n keys: resized or kept at its size, re-encoded, metadata removed, share-alike */
export function changeKeys(c: Credit) {
  const keys = [Math.max(c.width, c.height) === 800 ? 'photo.changes.resized' : 'photo.changes.kept']
  if (shareAlike(c)) keys.push('photo.changes.shareAlike')
  return keys
}

/** the card picture: the drawing (default) or the photo, remembered on this device */
export type CardImage = 'drawing' | 'photo'
export const loadCardImage = (): CardImage => (load<unknown>('cardImage', 'drawing') === 'photo' ? 'photo' : 'drawing')
export const saveCardImage = (v: CardImage) => save('cardImage', v)
