import { Seg } from '../../components/Seg'
import { t } from '../../i18n/t'
import type { Reason } from '../../lib/runs'
import type { Guess } from '../../sim/feedback'

export type Pred = { guess: Guess | null; why: Reason | null }

const GUESSES: Guess[] = ['more', 'same', 'less']
const REASONS: Reason[] = ['shade', 'light', 'fan', 'pump']

type Props = {
  pred: Pred
  onChange: (p: Pred) => void
  /** same label as the Run button on the scene */
  runLabel: string
  /** full name for the skip link, e.g. "Skip prediction and run the day" */
  skipLabel: string
  onRun: () => void
  onSkip: () => void
  running: boolean
}

/** Step 4 of the controls: guess, then run the day from here. */
export function Prediction({ pred, onChange, runLabel, skipLabel, onRun, onSkip, running }: Props) {
  return (
    <div className="group" id="predictCard">
      <h3>{t('controls.group4')}</h3>
      <div className="predict">
        <p>{t('predict.prompt')}</p>
        <Seg label={t('predict.guessLabel')} options={GUESSES.map(v => ({ v, label: t(`predict.${v}`) }))}
          isOn={v => pred.guess === v} onPick={guess => onChange({ ...pred, guess })} />
        <p className="because">{t('predict.because')}</p>
        <Seg label={t('predict.whyLabel')} options={REASONS.map(v => ({ v, label: t(`predict.why.${v}`) }))}
          isOn={v => pred.why === v} onPick={why => onChange({ ...pred, why })} />
      </div>
      <button className="btn big-run" type="button" disabled={running} onClick={onRun}>
        <svg width="16" height="16" viewBox="0 0 14 14" aria-hidden="true"><path d="M2 1 L13 7 L2 13 Z" fill="currentColor" /></svg>
        <span>{runLabel}</span>
      </button>
      <button className="linkbtn skip-pred" type="button" disabled={running} aria-label={skipLabel} onClick={onSkip}>{t('predict.skip')}</button>
    </div>
  )
}
