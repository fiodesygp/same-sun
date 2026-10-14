import { forwardRef, useState } from 'react'
import { t } from '../../i18n/t'
import { passesChallenge, type ChallengeId } from '../../sim/challenges'
import { compareToFullSun, pickRule } from '../../sim/feedback'
import type { Design, Score, SimResult } from '../../sim/types'
import type { Pred } from './Prediction'

export type Run = { r: SimResult; s: Score; design: Design; pred: Pred; challenge: ChallengeId | null }

const pct = (x: number) => Math.round(x * 100)
const LADDER = [0, 1, 2] as const

export const Results = forwardRef<HTMLDivElement, { run: Run }>(function Results({ run }, ref) {
  const { r, s, design: d, pred, challenge } = run
  const [hints, setHints] = useState(0)
  const total = pct(s.food + s.energy), fs = pct(s.fullSun)
  const actual = compareToFullSun(s)
  const rule = pickRule(d, r, s)
  const crop = t(`crops.${d.crop}`)
  const vars = { ...rule.vars, crop: rule.id === 'hot' ? crop : crop.toLowerCase() }
  const passed = challenge ? passesChallenge(challenge, r, s) : null

  const word = (g: 'more' | 'same' | 'less') => t(`results.word.${g}`)
  const predText = pred.guess
    ? (pred.why
        ? t('results.guessedBecause', { guess: word(pred.guess), why: t(`predict.why.${pred.why}`), actual: word(actual) })
        : t('results.guessed', { guess: word(pred.guess), actual: word(actual) })) +
      ' ' + t(pred.guess === actual ? 'results.matched' : 'results.surprise')
    : t('results.skipped')
  let what = t('results.what', {
    crop: crop.toLowerCase(), food: pct(s.food), span: t(d.days === 1 ? 'sunDay.spanDay' : 'sunDay.spanWeek'),
    fs, wh: r.energy.toFixed(1), energy: pct(s.energy)
  })
  if (challenge) what += ' ' + t(`challenge.${challenge}.${passed ? 'pass' : 'fail'}`)

  return (
    <div className="card" id="results" ref={ref} tabIndex={-1}>
      <div className="eyebrow">{t('results.eyebrow')}</div>
      <div className="total">
        <b>{total}</b><span>{t('results.outOf')}</span>
        {challenge && <span className={passed ? 'badge pass' : 'badge fail'}>{t(passed ? 'results.passed' : 'results.notYet')}</span>}
      </div>
      <p className="hint">{t('results.ref', { fs })}</p>
      <div className="score">
        <div className="sbar">
          <span>{t('results.food')}</span>
          <div className="track">
            <div className="fill" style={{ width: `${Math.min(100, pct(s.food))}%`, background: 'var(--leaf)' }} />
            <div className="ref" style={{ left: `${Math.min(100, fs)}%` }} title={t('results.fullSunMark')} />
          </div>
          <span>{pct(s.food)}</span>
        </div>
        <div className="sbar">
          <span>{t('results.energy')}</span>
          <div className="track"><div className="fill" style={{ width: `${Math.min(100, pct(s.energy))}%`, background: 'var(--sun)' }} /></div>
          <span>{pct(s.energy)}</span>
        </div>
      </div>
      <p className="hint">{t('results.note')}</p>
      <div className="fb">
        <div><span className="k">{t('results.yourPrediction')}</span><span>{predText}</span></div>
        <div><span className="k">{t('results.whatHappened')}</span><span>{what}</span></div>
        <div className="why"><span className="k">{t('results.why')}</span><span>{t(`rules.${rule.id}.why`, vars)}</span></div>
        <div className="next"><span className="k">{t('results.tryNext')}</span><span>{t(`rules.${rule.id}.next`, vars)}</span></div>
      </div>
      {hints > 0 && (
        <div className="ladder" aria-live="polite">
          {LADDER.slice(0, hints).map(i => (
            <p key={i}><b>{t(`results.ladder.${i}`)}:</b> {t(`rules.${rule.id}.hint.${i}`)}</p>
          ))}
        </div>
      )}
      <div className="row wrap">
        <button className="btn ghost" type="button" disabled={hints >= LADDER.length} onClick={() => setHints(hints + 1)}>
          {t(hints === 0 ? 'results.hint' : hints < LADDER.length ? 'results.moreHelp' : 'results.allHelp')}
        </button>
      </div>
    </div>
  )
})
