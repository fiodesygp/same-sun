// Power: one guided path in two stages. "Meet the parts" (a card and a quick check for each
// part of the kit) unlocks "Try it" (the Solar Card Deck missions, the Power challenges and the
// bonus cards, in order). A learner can skip ahead, and anyone with saved progress starts on Try it.
import { useEffect, useRef, useState } from 'react'
import { t, type Key } from '../i18n/t'
import { challengesDone, CHALLENGES, CORE, hasProgress, loadLearn, markDone, saveEvidence, STEPS, stepsDone, type LearnState, type MissionId } from '../lib/learn'
import { allChecked, answerCheck, loadParts, PART_IDS, skipParts, type PartsState } from '../lib/parts'
import { forgetStars } from '../lib/progress'
import { MissionView } from './power/MissionView'
import { def, type Evidence } from './power/missions'
import { PartView } from './power/PartView'
import { PartIcon, type PartId } from './power/parts'
import { SunMonitor } from './power/SunMonitor'

type Props = { active: boolean; onSketch: (mission: MissionId) => void }
type Stage = 'parts' | 'try'
/** what is open: a step, a part card, or the Sun Monitor */
type Open = MissionId | 'monitor' | `part:${PartId}`

const TOTAL = STEPS.length

export function Power({ active, onSketch }: Props) {
  const [state, setState] = useState<LearnState>(loadLearn)
  const [parts, setParts] = useState<PartsState>(loadParts)
  const [stage, setStage] = useState<Stage>(() => (hasProgress(loadLearn()) || allChecked(loadParts()) || loadParts().skipped ? 'try' : 'parts'))
  const [open, setOpen] = useState<Open | null>(null)
  const cardRefs = useRef<Partial<Record<Open, HTMLButtonElement | null>>>({})
  const returnTo = useRef<Open | null>(null)

  // older versions saved stars; the game no longer has them
  useEffect(() => forgetStars(), [])

  // other tabs (Growth Story's Reflect entry) can change progress, so reload when Power opens
  useEffect(() => {
    if (active) setState(loadLearn())
  }, [active])

  // back from a step or a card: return focus to its card
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
  function goTry(skip: boolean) {
    if (skip) setParts(skipParts())
    setStage('try')
  }

  if (open === 'monitor') return <SunMonitor onBack={() => show(null)} />
  if (open?.startsWith('part:')) {
    const id = open.slice(5) as PartId
    return (
      <PartView id={id} checked={parts.checked.includes(id)} onBack={() => show(null)}
        onAnswer={c => { const r = answerCheck(id, c); setParts(r.state); return r.right }}
        onMission={m => { returnTo.current = null; setStage('try'); show(m) }} />
    )
  }
  if (open) {
    const id = open as MissionId
    return (
      <MissionView def={def(id)} record={state[id]} onBack={() => show(null)} onSketch={() => onSketch(id)}
        onEvidence={(patch: Evidence) => setState(saveEvidence(id, patch))} onDone={() => setState(markDone(id))} />
    )
  }

  const n = stepsDone(state), nc = challengesDone(state), checked = parts.checked.length, unlocked = allChecked(parts)
  let deckNo = 0
  const stepCard = (id: MissionId) => {
    const d = def(id), done = !!state[id]?.done, title = t(`learn.m.${id}.title`)
    const no = d.kind === 'deck' ? ++deckNo : null
    const label = no ? t('learn.missionNumber', { n: no }) : t(d.kind === 'challenge' ? 'learn.challenge' : 'learn.bonus')
    return (
      <button key={id} type="button" ref={el => { cardRefs.current[id] = el }}
        className={`card learn-card ${d.colour ? `deck-${d.colour}` : `deck-${d.kind}`}${done ? ' is-done' : ''}`}
        aria-label={t('learn.openMission', { label, title, status: t(done ? 'learn.statusDone' : 'learn.statusTodo') })}
        onClick={() => show(id)}>
        <span className="learn-card-top">
          <span className="deck-chip">{no ?? label}</span>
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
        <div className="eyebrow">{t('power.eyebrow')}</div>
        <h1 className="page-title">{t('power.title')}</h1>
        <p className="lede">{t('power.lede')}</p>
      </div>

      <div className="seg stages" role="group" aria-label={t('power.stages')}>
        <button type="button" aria-pressed={stage === 'parts'} onClick={() => setStage('parts')}>
          {t('power.stage.parts')}<small>{t('power.checks', { n: checked, total: PART_IDS.length })}</small>
        </button>
        <button type="button" aria-pressed={stage === 'try'} onClick={() => goTry(!unlocked)}>
          {t('power.stage.try')}<small>{unlocked || parts.skipped || hasProgress(state) ? t('learn.progress', { n, total: TOTAL }) : t('power.skipAhead')}</small>
        </button>
      </div>

      {stage === 'parts' ? (
        <>
          <section aria-labelledby="bl-parts">
            <h2 className="h2" id="bl-parts">{t('learn.partsTitle')}</h2>
            <p className="hint">{t('power.partsHint')}</p>
            <div className="learn-grid parts-grid">
              {PART_IDS.map(p => {
                const ok = parts.checked.includes(p)
                return (
                  <button key={p} type="button" ref={el => { cardRefs.current[`part:${p}`] = el }} className={`card part-tile${ok ? ' is-done' : ''}`}
                    aria-label={t('power.openPart', { title: t(`learn.part.${p}.name` as Key), status: t(ok ? 'power.checkDone' : 'power.checkTodo') })}
                    onClick={() => show(`part:${p}`)}>
                    <span className="part-icon"><PartIcon id={p} /></span>
                    <span className="learn-card-title">{t(`learn.part.${p}.name` as Key)}</span>
                    {ok && <span className="done-tag"><span aria-hidden="true">✓</span> {t('power.checkDone')}</span>}
                  </button>
                )
              })}
            </div>
          </section>
          <div className="card unlock" aria-live="polite">
            {unlocked ? (
              <>
                <p className="flat"><b>{t('power.unlocked')}</b></p>
                <button className="btn" type="button" onClick={() => goTry(false)}>{t('power.goTry')}</button>
              </>
            ) : (
              <>
                <p className="flat">{t('power.toUnlock', { n: PART_IDS.length - checked })}</p>
                <button className="btn ghost" type="button" onClick={() => goTry(true)}>{t('power.skip')}</button>
              </>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="card learn-progress">
            <div className="learn-progress-row">
              <b>{t('learn.progress', { n, total: TOTAL })}</b>
            </div>
            <div className="learn-bar" role="progressbar" aria-label={t('learn.progressLabel')} aria-valuemin={0} aria-valuemax={TOTAL} aria-valuenow={n} aria-valuetext={t('learn.progress', { n, total: TOTAL })}>
              <i style={{ width: `${(n / TOTAL) * 100}%` }} />
            </div>
            {/* the seven missions' goals, always shown; each ticks when its mission is done */}
            <div className="learn-checklist">
              <h3 className="checklist-title" id="bl-learned">{t('learn.checklistTitle')}</h3>
              <ul aria-labelledby="bl-learned">
                {CORE.map(id => (
                  <li key={id} className={state[id]?.done ? 'ok' : undefined}>
                    <span aria-hidden="true">{state[id]?.done ? '✓' : '○'}</span> {t(`learn.m.${id}.goal`)}
                    <span className="sr"> ({t(state[id]?.done ? 'learn.statusDone' : 'learn.statusTodo')})</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <section aria-labelledby="bl-steps">
            <h2 className="h2" id="bl-steps">{t('power.stepsTitle')}</h2>
            <div className="learn-grid">{STEPS.map(stepCard)}</div>
          </section>
          <section aria-labelledby="bl-challenges">
            <h2 className="h2" id="bl-challenges">{t('power.challengesTitle')}</h2>
            <p className="hint flat">{t('power.challengesIntro')}</p>
            <p className="challenge-count">{t('power.challengesProgress', { n: nc, total: CHALLENGES.length })}</p>
            <div className="learn-grid">{CHALLENGES.map(stepCard)}</div>
          </section>
          <section aria-labelledby="bl-tools">
            <h2 className="h2" id="bl-tools">{t('learn.toolsTitle')}</h2>
            <div className="learn-grid">
              <button type="button" ref={el => { cardRefs.current.monitor = el }} className="card learn-card deck-tool" onClick={() => show('monitor')}>
                <span className="learn-card-top"><span className="deck-chip">{t('learn.toolsChip')}</span></span>
                <span className="learn-card-title">{t('learn.mon.title')}</span>
                <span className="learn-card-goal">{t('learn.mon.lede')}</span>
              </button>
            </div>
          </section>
        </>
      )}
    </>
  )
}
