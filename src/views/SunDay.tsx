import { useEffect, useRef, useState } from 'react'
import model from '../config/model.json'
import { Scene } from '../components/Scene'
import { t } from '../i18n/t'
import { saveRun } from '../lib/runs'
import { load, save } from '../lib/storage'
import { applyChallenge, type ChallengeId } from '../sim/challenges'
import { compareToFullSun } from '../sim/feedback'
import { idealGrowth, score, simulate } from '../sim/simulate'
import type { Design } from '../sim/types'
import { Controls, CROPS, DAYS, HEIGHTS, PANELS, WEATHERS } from './sunDay/Controls'
import { Gauges } from './sunDay/Gauges'
import { Prediction, type Pred } from './sunDay/Prediction'
import { Results, type Run } from './sunDay/Results'

// playback speed: one day in about 9 s (14 hours x 650 ms); a week runs faster per hour
const MS_PER_HOUR = { 1: 650, 7: 120 }
const DEFAULT: Design = { crop: 'basil', weather: 'october', days: 1, panels: 'big', height: 'low', fan: true, pump: false }
const NO_PRED: Pred = { guess: null, why: null }
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

type Phase = 'ready' | 'playing' | 'done'

/** The last design, if it was saved on this device; anything unknown falls back to the default. */
function savedDesign(): Design {
  const x = load<Record<string, unknown>>('design', {})
  const pick = <T,>(v: unknown, ok: readonly T[], d: T) => (ok.includes(v as T) ? (v as T) : d)
  return {
    crop: pick(x.crop, CROPS, DEFAULT.crop),
    weather: pick(x.weather, WEATHERS, DEFAULT.weather),
    days: pick(x.days, DAYS, DEFAULT.days),
    panels: pick(x.panels, PANELS, DEFAULT.panels),
    height: pick(x.height, HEIGHTS, DEFAULT.height),
    fan: typeof x.fan === 'boolean' ? x.fan : DEFAULT.fan,
    pump: typeof x.pump === 'boolean' ? x.pump : DEFAULT.pump
  }
}

export function SunDay() {
  const [design, setDesign] = useState<Design>(savedDesign)
  const [challenge, setChallenge] = useState<ChallengeId | null>(null)
  const [pred, setPred] = useState<Pred>(NO_PRED)
  const [phase, setPhase] = useState<Phase>('ready')
  const [run, setRun] = useState<(Run & { ideal: number; id: number }) | null>(null)
  const [frame, setFrame] = useState(0)
  const [finished, setFinished] = useState(false)
  const resultsRef = useRef<HTMLDivElement>(null)
  const skipRef = useRef<HTMLButtonElement>(null)

  // any change starts over: new prediction, no results
  function change(next: Design, nextChallenge = challenge) {
    const d = nextChallenge ? applyChallenge(next, nextChallenge) : next
    setDesign(d)
    setChallenge(nextChallenge)
    save('design', d)
    setPhase('ready')
    setRun(null)
    setPred(NO_PRED)
    setFinished(false)
  }

  function play() {
    const r = simulate(design), s = score(design, r)
    setRun({ r, s, design, pred, challenge, ideal: idealGrowth(design), id: Date.now() })
    setFrame(0)
    setPhase(reducedMotion() ? 'done' : 'playing')
  }

  // the Run button is disabled while playing, so give keyboard focus to Skip instead of losing it
  useEffect(() => {
    if (phase === 'playing') skipRef.current?.focus()
  }, [phase])

  useEffect(() => {
    if (phase !== 'playing' || !run) return
    const n = run.r.hours.length, per = MS_PER_HOUR[run.design.days], t0 = performance.now()
    let id = 0
    const tick = (now: number) => {
      setFrame(Math.max(0, Math.min(n - 1, Math.floor((now - t0) / per))))
      if (now - t0 >= n * per) setPhase('done')
      else id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [phase, run])

  // when a run finishes: save it for the Growth Story tab and bring the results into view
  useEffect(() => {
    if (phase !== 'done' || !run) return
    setFinished(true)
    const { s } = run
    saveRun({
      when: run.id, design: run.design, challenge: run.challenge, guess: run.pred.guess, why: run.pred.why,
      actual: compareToFullSun(s), score: Math.round((s.food + s.energy) * 100), fullSun: Math.round(s.fullSun * 100),
      food: Math.round(s.food * 100), energy: Math.round(s.energy * 100)
    })
    // move focus to the results so keyboard and screen-reader users land on them
    resultsRef.current?.focus({ preventScroll: true })
    resultsRef.current?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'nearest' })
  }, [phase, run])

  // the hour on screen: the current frame while playing, the last sunny hour when done
  const i = run ? (phase === 'done' ? run.r.hours.length - 2 : frame) : -1
  const hr = run && i >= 0 ? run.r.hours[i] : null
  let energy = 0
  if (run) for (let k = 0; k <= i; k++) energy += run.r.hours[k].power
  const growth = hr && run ? hr.totalGrowth / run.ideal : 0
  const span = t(design.days === 1 ? 'sunDay.spanDay' : 'sunDay.spanWeek')
  const loads = design.fan && design.pump ? 'both' : design.fan ? 'fan' : design.pump ? 'pump' : 'none'
  const sceneLabel = t('sunDay.sceneLabel', {
    crop: t(`crops.${design.crop}`).toLowerCase(),
    panel: design.panels === 'none' ? t('growthStory.panel.none')
      : t('scene.panelAt', { panel: t(`growthStory.panel.${design.panels}`), height: t(`height.${design.height}`).toLowerCase() }),
    loads: t(`scene.loads.${loads}`)
  })

  return (
    <>
      <div>
        <div className="eyebrow">{t('sunDay.eyebrow')}</div>
        <h1 className="page-title">{t('sunDay.title')}</h1>
        <p className="lede">{t('sunDay.lede')}</p>
      </div>
      {/* one flat list in phone order (scene, gauges, controls, prediction, results) so the
          keyboard order matches what you see; on wide screens CSS moves the controls to a right column */}
      <div className="sunday">
          <div className="card scene-wrap">
            <Scene
              design={design} hour={hr} growth={hr ? 0.25 + 0.75 * growth : 0.35}
              tank={hr && design.pump ? hr.tank / model.tankSize.large : 1} label={sceneLabel}
            />
            <div className="playbar">
              <button className="btn" type="button" disabled={phase === 'playing'} onClick={play}>
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M2 1 L13 7 L2 13 Z" fill="currentColor" /></svg>
                <span>{t(finished ? 'sunDay.runAgain' : design.days === 1 ? 'sunDay.runDay' : 'sunDay.runWeek')}</span>
              </button>
              {phase === 'playing' && <button className="btn ghost" type="button" ref={skipRef} onClick={() => setPhase('done')}>{t('sunDay.skip')}</button>}
              <span className="clock">{hr ? t('sunDay.clock', { hour: hr.h, day: hr.day + 1 }) : t('sunDay.ready')}</span>
              <div className="progress" aria-hidden="true"><i style={{ width: run ? `${((i + 1) / run.r.hours.length) * 100}%` : 0 }} /></div>
            </div>
          </div>
          <Gauges design={design} hour={hr} energy={energy} growth={growth} />
          <p className="sr" role="status">
            {phase === 'playing' ? t('sunDay.statusRunning', { span }) : phase === 'done' && run ? t('sunDay.statusDone', { total: Math.round((run.s.food + run.s.energy) * 100) }) : ''}
          </p>
          <Controls design={design} challenge={challenge} onDesign={d => change(d)} onChallenge={c => change(design, c)} />
          {phase === 'ready' && <Prediction pred={pred} onChange={setPred} />}
          {phase === 'done' && run && <Results key={run.id} ref={resultsRef} run={run} />}
      </div>
    </>
  )
}
