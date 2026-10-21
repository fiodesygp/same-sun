import { useEffect, useRef, useState } from 'react'
import { t } from '../i18n/t'
import { coreDone, loadLearn, markDone, saveEvidence, type LearnState, type MissionId } from '../lib/learn'
import { MissionView } from './learn/MissionView'
import { def, MISSION_DEFS, type Evidence } from './learn/missions'
import { SunMonitor } from './learn/SunMonitor'
import { PartView } from './learn/PartView'
import { PARTS, PartIcon, type PartId } from './learn/parts'

type Props = { active: boolean; onSketch: () => void }
/** what is open: a mission, or one of the tools */
type Open = MissionId | 'monitor' | `part:${PartId}`

export function Learn({ active, onSketch }: Props) {
  const [state, setState] = useState<LearnState>(loadLearn)
  const [open, setOpen] = useState<Open | null>(null)
  const cardRefs = useRef<Partial<Record<Open, HTMLButtonElement | null>>>({})
  const returnTo = useRef<Open | null>(null)

  // other tabs (Growth Story's Reflect entry) can change progress, so reload when Learn opens
  useEffect(() => {
    if (active) setState(loadLearn())
  }, [active])

  // back from a mission: return focus to its card
  useEffect(() => {
    if (open || !returnTo.current) return
    cardRefs.current[returnTo.current]?.focus()
    returnTo.current = null
  }, [open])

  function show(id: Open | null) {
    if (!id) returnTo.current = open
    setOpen(id)
    window.scrollTo(0, 0)
  }

  if (open === 'monitor') return <SunMonitor onBack={() => show(null)} />
  if (open?.startsWith('part:')) {
    return <PartView id={open.slice(5) as PartId} onBack={() => show(null)} onMission={id => { returnTo.current = null; show(id) }} />
  }
  if (open) {
    const id = open as MissionId
    return (
      <MissionView def={def(id)} record={state[id]} onBack={() => show(null)} onSketch={onSketch}
        onEvidence={(patch: Evidence) => setState(saveEvidence(id, patch))} onDone={() => setState(markDone(id))} />
    )
  }

  const n = coreDone(state)
  const card = (id: MissionId, i: number) => {
    const d = def(id), done = !!state[id]?.done, title = t(`learn.m.${id}.title`)
    const label = d.colour ? t('learn.missionNumber', { n: i + 1 }) : t('learn.bonus')
    return (
      <button key={id} type="button" ref={el => { cardRefs.current[id] = el }}
        className={`card learn-card ${d.colour ? `deck-${d.colour}` : 'deck-bonus'}${done ? ' is-done' : ''}`}
        aria-label={t('learn.openMission', { label, title, status: t(done ? 'learn.statusDone' : 'learn.statusTodo') })}
        onClick={() => show(id)}>
        <span className="learn-card-top">
          <span className="deck-chip">{d.colour ? i + 1 : '★'}</span>
          {done && <span className="done-tag"><span aria-hidden="true">✓</span> {t('learn.statusDone')}</span>}
        </span>
        <span className="learn-card-title">{title}</span>
        <span className="learn-card-goal">{t(`learn.m.${id}.goal`)}</span>
      </button>
    )
  }

  return (
    <>
      <div>
        <div className="eyebrow">{t('learn.eyebrow')}</div>
        <h1 className="page-title">{t('learn.title')}</h1>
        <p className="lede">{t('learn.lede')}</p>
      </div>

      <div className="card learn-progress">
        <div className="learn-progress-row">
          <b>{t('learn.progress', { n })}</b>
        </div>
        <div className="learn-bar" role="progressbar" aria-label={t('learn.progressLabel')} aria-valuemin={0} aria-valuemax={7} aria-valuenow={n} aria-valuetext={t('learn.progress', { n })}>
          <i style={{ width: `${(n / 7) * 100}%` }} />
        </div>
        <details className="learn-checklist">
          <summary>{t('learn.checklistTitle')}</summary>
          <ul>
            {MISSION_DEFS.filter(d => d.colour).map(d => (
              <li key={d.id} className={state[d.id]?.done ? 'ok' : undefined}>
                <span aria-hidden="true">{state[d.id]?.done ? '✓' : '○'}</span> {t(`learn.m.${d.id}.title`)}
                <span className="sr"> ({t(state[d.id]?.done ? 'learn.statusDone' : 'learn.statusTodo')})</span>
              </li>
            ))}
          </ul>
        </details>
      </div>

      <section aria-labelledby="learn-missions">
        <h2 className="h2" id="learn-missions">{t('learn.missionsTitle')}</h2>
        <div className="learn-grid">{MISSION_DEFS.filter(d => d.colour).map((d, i) => card(d.id, i))}</div>
      </section>
      <section aria-labelledby="learn-bonus">
        <h2 className="h2" id="learn-bonus">{t('learn.bonusTitle')}</h2>
        <div className="learn-grid">{MISSION_DEFS.filter(d => !d.colour).map((d, i) => card(d.id, i))}</div>
      </section>
      <section aria-labelledby="learn-parts">
        <h2 className="h2" id="learn-parts">{t('learn.partsTitle')}</h2>
        <div className="learn-grid parts-grid">
          {PARTS.map(p => (
            <button key={p.id} type="button" ref={el => { cardRefs.current[`part:${p.id}`] = el }} className="card part-tile" onClick={() => show(`part:${p.id}`)}>
              <span className="part-icon"><PartIcon id={p.id} /></span>
              <span className="learn-card-title">{t(`learn.part.${p.id}.name`)}</span>
            </button>
          ))}
        </div>
      </section>
      <section aria-labelledby="learn-tools">
        <h2 className="h2" id="learn-tools">{t('learn.toolsTitle')}</h2>
        <div className="learn-grid">
          <button type="button" ref={el => { cardRefs.current.monitor = el }} className="card learn-card deck-tool" onClick={() => show('monitor')}>
            <span className="learn-card-top"><span className="deck-chip" aria-hidden="true">◷</span></span>
            <span className="learn-card-title">{t('learn.mon.title')}</span>
            <span className="learn-card-goal">{t('learn.mon.lede')}</span>
          </button>
        </div>
      </section>
    </>
  )
}
