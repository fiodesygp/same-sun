import type { ReactNode } from 'react'
import model from '../../config/model.json'
import { Seg } from '../../components/Seg'
import { t } from '../../i18n/t'
import { CHALLENGES, type ChallengeId } from '../../sim/challenges'
import type { Design } from '../../sim/types'

// what players can pick (bush bean stays in model.json but not in the game)
export const CROPS = ['lettuce', 'basil', 'chili'] as const
export const WEATHERS = ['october', 'july'] as const
export const DAYS = [1, 7] as const
export const PANELS = ['none', 'small', 'big', 'both'] as const
export const HEIGHTS = ['low', 'high'] as const

type Props = {
  design: Design
  challenge: ChallengeId | null
  onDesign: (d: Design) => void
  onChallenge: (c: ChallengeId | null) => void
  /** step 4, the prediction */
  children?: ReactNode
}

export function Controls({ design: d, challenge, onDesign, onChallenge, children }: Props) {
  const rules = challenge ? model.challenges[challenge] : null
  const locked = (rules?.set ?? {}) as Partial<Design>
  const needs = rules && 'needs' in rules ? rules.needs : null
  const isLocked = <K extends keyof Design>(k: K, v: Design[K]) => k in locked && locked[k] !== v
  const set = <K extends keyof Design>(k: K) => (v: Design[K]) => onDesign({ ...d, [k]: v })

  return (
    <div className="card ctl" id="controls">
      <fieldset>
        <legend><label htmlFor="challenge">{t('controls.playMode')}</label></legend>
        <select id="challenge" aria-describedby={challenge ? 'goal' : undefined} value={challenge ?? 'free'}
          onChange={e => onChallenge(e.target.value === 'free' ? null : (e.target.value as ChallengeId))}>
          <option value="free">{t('controls.free')}</option>
          {CHALLENGES.map(c => <option key={c} value={c}>{t(`challenge.${c}.name`)}</option>)}
        </select>
        {challenge && <div className="goal" id="goal">{t(`challenge.${challenge}.goal`)}</div>}
      </fieldset>

      <div className="group">
        <h3>{t('controls.group1')}</h3>
        <fieldset>
          <legend>{t('controls.plant')}</legend>
          <Seg options={CROPS.map(v => ({ v, label: t(`crops.${v}`), disabled: isLocked('crop', v) }))} isOn={v => d.crop === v} onPick={set('crop')} />
          <p className="hint">{d.crop !== 'bean' && t(`cropHint.${d.crop}`)}</p>
        </fieldset>
        <fieldset>
          <legend>{t('controls.weather')}</legend>
          <Seg options={WEATHERS.map(v => ({ v, label: t(`weather.${v}`), disabled: isLocked('weather', v) }))} isOn={v => d.weather === v} onPick={set('weather')} />
        </fieldset>
        <fieldset>
          <legend>{t('controls.howLong')}</legend>
          <Seg options={DAYS.map(v => ({ v, label: t(`days.${v}`), disabled: isLocked('days', v) }))} isOn={v => d.days === v} onPick={set('days')} />
        </fieldset>
      </div>

      <div className="group">
        <h3>{t('controls.group2')}</h3>
        <fieldset>
          <legend>{t('controls.panelSize')}</legend>
          <Seg options={PANELS.map(v => ({ v, label: t(`panels.${v}`) }))} isOn={v => d.panels === v} onPick={set('panels')} />
          <p className="hint">{t('controls.panelHint')}</p>
        </fieldset>
        <fieldset>
          <legend>{t('controls.height')}</legend>
          <Seg options={HEIGHTS.map(v => ({ v, label: t(`height.${v}`) }))} isOn={v => d.height === v} onPick={set('height')} />
          <p className="hint">{t('controls.heightHint')}</p>
        </fieldset>
      </div>

      <div className="group">
        <h3>{t('controls.group3')}</h3>
        <fieldset>
          <legend>{t('controls.turnOn')}</legend>
          {/* two independent on/off switches, not a choice between them */}
          <div className="toggles">
            {(['fan', 'pump'] as const).map(v => (
              <button key={v} type="button" className="toggle" aria-pressed={d[v]} disabled={needs === v} onClick={() => onDesign({ ...d, [v]: !d[v] })}>
                <span className="switch" aria-hidden="true">
                  <span className="knob">
                    {d[v] && <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2.5 6.2 5 8.6l4.5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                  </span>
                </span>
                <span className="toggle-label">{t(`controls.${v}`)}</span>
                <span className="toggle-state" aria-hidden="true">{t(d[v] ? 'controls.on' : 'controls.off')}</span>
              </button>
            ))}
          </div>
          <p className="hint">{t(d.pump ? 'controls.waterPump' : 'controls.waterHand')}</p>
        </fieldset>
      </div>
      {children}
    </div>
  )
}
