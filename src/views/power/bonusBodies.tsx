// Bonus missions: AgriPV (the whole Sun Day garden) and Reflect (saved to the Growth Story Card).
import { useState } from 'react'
import { Scene } from '../../components/Scene'
import { t, type Key } from '../../i18n/t'
import { growthStoryStore } from '../../lib/growthStory'
import { score, simulate } from '../../sim/simulate'
import type { Design, PanelKey } from '../../sim/types'
import { Answer } from './benchBodies'
import type { BodyProps } from './bodies'
import { TILTS, type Tilt } from './sky'

// ---------- AgriPV ----------

/** how much the panel shades the plant: a small panel, the big one, or both */
const SHADE: { panels: PanelKey; label: Key }[] = [
  { panels: 'small', label: 'learn.agripv.shade.little' },
  { panels: 'big', label: 'learn.agripv.shade.some' },
  { panels: 'both', label: 'learn.agripv.shade.lot' }
]

export function AgriPV({ evidence: e, save }: BodyProps) {
  const [tilt, setTilt] = useState<Tilt>(25)
  const [panels, setPanels] = useState<PanelKey>('big')
  const [run, setRun] = useState<{ sunScore: number; food: number; energy: number; growth: number } | null>(null)
  const design: Design = { crop: 'chili', weather: 'october', days: 1, panels, height: 'high', fan: true, pump: true, tilt }
  const saved = typeof e.sunScore === 'number' ? e.sunScore : null

  function runDay() {
    const r = simulate(design), s = score(design, r)
    const x = { sunScore: Math.round((s.food + s.energy) * 100), food: Math.round(s.food * 100), energy: Math.round(s.energy * 100), growth: r.growth }
    setRun(x)
    save({ sunScore: x.sunScore, tilt, panels })
  }
  const change = (f: () => void) => { f(); setRun(null) }

  return (
    <>
      <section className="stack">
        <h2 className="card-title">{t('learn.simulator')}</h2>
        <div className="scene-wrap card learn-scene">
          <Scene design={design} hour={null} idleHour={12} growth={run ? Math.min(1, 0.3 + run.growth) : 0.5} led ledOn fanOn tilt={tilt}
            label={t('learn.agripv.aria', { tilt, shade: t(SHADE.find(x => x.panels === panels)!.label) })} />
        </div>
        <div className="card stack">
          <fieldset>
            <legend>{t('learn.ctl.tilt')}</legend>
            <div className="seg">
              {TILTS.map(a => <button key={a} type="button" aria-pressed={tilt === a} onClick={() => change(() => setTilt(a))}>{a}°</button>)}
            </div>
          </fieldset>
          <fieldset>
            <legend>{t('learn.agripv.shade')}</legend>
            <div className="seg">
              {SHADE.map(x => <button key={x.panels} type="button" aria-pressed={panels === x.panels} onClick={() => change(() => setPanels(x.panels))}>{t(x.label)}</button>)}
            </div>
          </fieldset>
          <button className="btn" type="button" onClick={runDay}>{t('learn.agripv.run')}</button>
          <div aria-live="polite">
            {run && (
              <dl className="vaw">
                <div><dt>{t('learn.agripv.food')}</dt><dd className="num">{run.food}</dd></div>
                <div><dt>{t('learn.agripv.energy')}</dt><dd className="num">{run.energy}</dd></div>
                <div><dt>{t('learn.agripv.score')}</dt><dd className="num">{run.sunScore}</dd></div>
              </dl>
            )}
          </div>
        </div>
      </section>

      <section className="card evidence stack">
        <h2 className="card-title">{t('learn.agripv.do')}</h2>
        {saved !== null && <p className="hint flat">{t('learn.agripv.saved', { n: saved })}</p>}
        <Answer id="agripv-light" label="learn.agripv.light" value={e.light} onChange={v => save({ light: v })} />
        <Answer id="agripv-fan" label="learn.agripv.fan" value={e.fan} onChange={v => save({ fan: v })} />
        <Answer id="agripv-pump" label="learn.agripv.pump" value={e.pump} onChange={v => save({ pump: v })} />
      </section>
    </>
  )
}

// ---------- Reflect ----------

const Q = [0, 1, 2, 3] as const

export function Reflect({ evidence: e, save }: BodyProps) {
  const [msg, setMsg] = useState<Key | null>(null)
  const answer = (i: number) => (typeof e[`a${i}`] === 'string' ? (e[`a${i}`] as string) : '')
  const complete = Q.every(i => answer(i).trim())

  async function toStory() {
    const now = Date.now()
    const story = Q.map(i => `${t(`learn.m.reflect.q.${i}`)}\n${answer(i).trim()}`).join('\n\n')
    try {
      await growthStoryStore.put({ id: now, when: now, stage: 'reflect', story, photo: null, mission: 'reflect' })
    } catch {
      return setMsg('learn.reflect.error')
    }
    save({ saved: true })
    setMsg('learn.reflect.saved')
  }

  return (
    <section className="card evidence stack">
      <h2 className="card-title">{t('learn.reflect.title')}</h2>
      {Q.map(i => (
        <Answer key={i} id={`reflect-${i}`} label={`learn.m.reflect.q.${i}`} value={answer(i)} onChange={v => { setMsg(null); save({ [`a${i}`]: v }) }} />
      ))}
      <div className="row wrap">
        <button className="btn" type="button" disabled={!complete} onClick={toStory}>{t('learn.reflect.save')}</button>
      </div>
      <p className="hint flat" role="status">
        {msg ? t(msg) : !complete ? t('learn.reflect.answerAll') : e.saved === true ? t('learn.reflect.savedBefore') : ''}
      </p>
    </section>
  )
}
