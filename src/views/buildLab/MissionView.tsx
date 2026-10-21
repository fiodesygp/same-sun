import { useEffect, useRef } from 'react'
import { t, type Key } from '../../i18n/t'
import type { MissionRecord } from '../../lib/learn'
import { READY, type Evidence, type MissionDef } from './missions'
import { MissionBody } from './bodies'

type Props = {
  def: MissionDef
  record: MissionRecord | undefined
  onEvidence: (patch: Evidence) => void
  onDone: () => void
  onBack: () => void
  /** open another part of the game (Growth Story Card for sketches and Reflect) */
  onSketch: () => void
}

/** One mission: goal, deck card, support cards, "Try it" steps, simulator, evidence and "Mark as done". */
export function MissionView({ def: d, record, onEvidence, onDone, onBack, onSketch }: Props) {
  const evidence = record?.evidence ?? {}
  const done = record?.done ?? false
  const ready = READY[d.id](evidence)
  const backRef = useRef<HTMLButtonElement>(null)
  useEffect(() => backRef.current?.focus(), [])
  const k = (s: string) => `learn.m.${d.id}.${s}` as Key
  const title = t(k('title'))

  return (
    <article className="mission-view" aria-labelledby="mission-title">
      <button className="back" type="button" ref={backRef} onClick={onBack}>{t('learn.back')}</button>
      <header className={`mission-head ${d.colour ? `deck-${d.colour}` : `deck-${d.kind}`}`}>
        <span className="deck-chip">{d.colour ? t(`learn.colour.${d.colour}`) : t(d.kind === 'challenge' ? 'learn.challenge' : 'learn.bonus')}</span>
        <h1 id="mission-title" className="page-title">{title}</h1>
        <p className="card-chip">
          {d.colour ? t('learn.cardChip', { title: t(k('card')), colour: t(`learn.colour.${d.colour}`) })
            : d.kind === 'challenge' ? t('learn.challengeNote') : t('learn.cardChipBonus', { title: t(k('card')) })}
        </p>
      </header>

      <section className="card mission-goal">
        <div className="eyebrow">{t('learn.goal')}</div>
        <p className="measure">{t(k('goal'))}</p>
      </section>

      {d.info > 0 && (
        <div className="support-cards">
          <section className="card support">
            <h2 className="card-title">{t(k('infoTitle'))}</h2>
            <p className="measure">{t(k('info'))}</p>
          </section>
          {d.info === 2 && (
            <section className="card support">
              <h2 className="card-title">{t(k('info2Title'))}</h2>
              <p className="measure">{t(k('info2'))}</p>
            </section>
          )}
        </div>
      )}

      <section className="card">
        <h2 className="card-title">{t('learn.tryIt')}</h2>
        <ol className="try-steps">
          {Array.from({ length: d.steps }, (_, i) => <li key={i}>{t(k(`step.${i}`))}</li>)}
        </ol>
      </section>

      <MissionBody id={d.id} evidence={evidence} save={onEvidence} onSketch={onSketch} />

      <section className="card mission-finish" aria-live="polite">
        {done ? (
          <p className="done-note"><span aria-hidden="true">✓ </span>{t('learn.doneNote')}</p>
        ) : (
          <>
            <button className="btn" type="button" disabled={!ready} onClick={onDone}>{t('learn.markDone')}</button>
            {!ready && <p className="hint flat">{t('learn.notReady')}</p>}
          </>
        )}
      </section>
      <p className="foot">{t('learn.estimates')}</p>
    </article>
  )
}
