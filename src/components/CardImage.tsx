// A card's picture: the labelled drawing, or a real photo of the part. A Photo / Drawing toggle
// switches between them (drawing by default; the choice is remembered). Cards without a photo show
// only the drawing. Every photo has alt text and a credit line linking to its source and license.
import { useState, type ReactNode } from 'react'
import { t, type Key } from '../i18n/t'
import { licenseKey, loadCardImage, photoFor, saveCardImage, shareAlike, type CardImage as Pick } from '../lib/photos'

/** photos that need a word of explanation */
const CAPTIONS: Partial<Record<string, Key>> = { fan: 'photo.caption.fan' }

type Props = { id: string; drawing: ReactNode }

export function CardImage({ id, drawing }: Props) {
  const photo = photoFor(id)
  const [pick, setPick] = useState<Pick>(loadCardImage)
  if (!photo) return <>{drawing}</>
  const choose = (v: Pick) => { setPick(v); saveCardImage(v) }

  return (
    <div className="card-image">
      <div className="seg image-toggle" role="group" aria-label={t('photo.toggle')}>
        <button type="button" aria-pressed={pick === 'photo'} onClick={() => choose('photo')}>{t('photo.photo')}</button>
        <button type="button" aria-pressed={pick === 'drawing'} onClick={() => choose('drawing')}>{t('photo.drawing')}</button>
      </div>
      {pick === 'drawing' ? drawing : (
        <>
          <div className="photo-plate">
            <img src={import.meta.env.BASE_URL + photo.file} width={photo.width} height={photo.height} loading="lazy" decoding="async" alt={t(`photo.alt.${id}` as Key)} />
          </div>
          {CAPTIONS[id] && <p className="photo-caption flat">{t(CAPTIONS[id]!)}</p>}
          <p className="photo-credit flat">
            {t('photo.by')} <a href={photo.source} target="_blank" rel="noopener noreferrer">{photo.author}</a>,{' '}
            <a href={photo.licenseUrl} target="_blank" rel="noopener noreferrer">{licenseKey(photo) ? t(licenseKey(photo) as Key) : photo.license}</a>
            {shareAlike(photo) && <>. {t('photo.shareAlike')}</>}
          </p>
        </>
      )}
    </div>
  )
}
