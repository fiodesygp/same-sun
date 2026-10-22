// One part's card, with four tabs (What it is · How it works · Try it · Numbers) and a quick check.
import { useEffect, useRef, useState } from 'react'
import { t, type Key } from '../../i18n/t'
import type { MissionId } from '../../lib/learn'
import { PartIllustration } from '../../components/parts/art'
import { CHECKS } from '../../lib/parts'
import { part, PartIcon, type PartId } from './parts'

const TABS = ['what', 'how', 'try', 'numbers'] as const
type Tab = (typeof TABS)[number]

type Props = {
  id: PartId
  /** this part's quick check was answered right before */
  checked: boolean
  /** answer the quick check; returns whether it was right */
  onAnswer: (choice: string) => boolean
  onBack: () => void
  onMission: (id: MissionId) => void
}

export function PartView({ id, checked, onAnswer, onBack, onMission }: Props) {
  const p = part(id)
  const [tab, setTab] = useState<Tab>('what')
  const [answer, setAnswer] = useState<{ choice: string; right: boolean } | null>(null)
  const backRef = useRef<HTMLButtonElement>(null)
  const tabRefs = useRef<Partial<Record<Tab, HTMLButtonElement | null>>>({})
  useEffect(() => backRef.current?.focus(), [])
  const k = (s: string) => `learn.part.${id}.${s}` as Key

  // arrow keys move between tabs (the ARIA tabs pattern)
  function onKey(e: React.KeyboardEvent) {
    const i = TABS.indexOf(tab)
    const next = e.key === 'ArrowRight' ? TABS[(i + 1) % 4] : e.key === 'ArrowLeft' ? TABS[(i + 3) % 4] : e.key === 'Home' ? TABS[0] : e.key === 'End' ? TABS[3] : null
    if (!next) return
    e.preventDefault()
    setTab(next)
    tabRefs.current[next]?.focus()
  }

  return (
    <article className="mission-view" aria-labelledby="part-title">
      <button className="back" type="button" ref={backRef} onClick={onBack}>{t('learn.back')}</button>
      <header className="mission-head deck-tool part-head">
        <span className="part-icon"><PartIcon id={id} /></span>
        <h1 id="part-title" className="page-title">{t(k('name'))}</h1>
      </header>

      <figure className="part-figure">
        <PartIllustration id={id} />
      </figure>

      <div className="card part-card">
        <div className="part-tabs" role="tablist" aria-label={t(k('name'))} onKeyDown={onKey}>
          {TABS.map(x => (
            <button key={x} type="button" role="tab" id={`pt-${x}`} aria-controls="part-panel" aria-selected={tab === x} tabIndex={tab === x ? 0 : -1}
              ref={el => { tabRefs.current[x] = el }} onClick={() => setTab(x)}>{t(`learn.partTab.${x}` as Key)}</button>
          ))}
        </div>
        <div className="part-panel" role="tabpanel" id="part-panel" aria-labelledby={`pt-${tab}`} tabIndex={0}>
          {tab === 'what' && <p className="measure">{t(k('what'))}</p>}
          {tab === 'how' && <p className="measure">{t(k('how'))}</p>}
          {tab === 'try' && (
            <>
              <p className="measure">{t(k('try'))}</p>
              <button className="btn" type="button" onClick={() => onMission(p.mission)}>
                {t('learn.part.go', { title: t(`learn.m.${p.mission}.title` as Key) })}
              </button>
            </>
          )}
          {tab === 'numbers' && (
            <>
              <p className="measure">{t(k('numbers'), p.numbers())}</p>
              <p className="foot flat">{t('learn.estimates')}</p>
            </>
          )}
        </div>
      </div>

      <section className="card quick-check" aria-labelledby="qc-title">
        <h2 className="card-title" id="qc-title">{t('learn.check.title')}</h2>
        <fieldset>
          <legend className="qc-question">{t(k('check'))}</legend>
          <div className="seg">
            {CHECKS[id].choices.map(c => (
              <button key={c} type="button" aria-pressed={answer?.choice === c}
                onClick={() => setAnswer({ choice: c, right: onAnswer(c) })}>{t(`learn.check.${id}.${c}` as Key)}</button>
            ))}
          </div>
        </fieldset>
        <p className={`qc-result${answer ? (answer.right ? ' ok' : ' no') : ''}`} role="status">
          {answer ? <><span aria-hidden="true">{answer.right ? '✓ ' : '✗ '}</span>{t(answer.right ? 'learn.check.right' : 'learn.check.wrong')} {t(k(answer.right ? 'checkWhy' : 'checkHint'))}</>
            : checked ? <><span aria-hidden="true">✓ </span>{t('learn.check.before')}</> : ''}
        </p>
      </section>
    </article>
  )
}
