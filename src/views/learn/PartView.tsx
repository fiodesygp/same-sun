// One part's card, with four tabs: What it is · How it works · Try it · Numbers.
import { useEffect, useRef, useState } from 'react'
import { t, type Key } from '../../i18n/t'
import type { MissionId } from '../../lib/learn'
import { part, PartIcon, type PartId } from './parts'

const TABS = ['what', 'how', 'try', 'numbers'] as const
type Tab = (typeof TABS)[number]

type Props = { id: PartId; onBack: () => void; onMission: (id: MissionId) => void }

export function PartView({ id, onBack, onMission }: Props) {
  const p = part(id)
  const [tab, setTab] = useState<Tab>('what')
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
    </article>
  )
}
