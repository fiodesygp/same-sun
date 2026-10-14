import { Seg } from '../../components/Seg'
import { t } from '../../i18n/t'
import type { Reason } from '../../lib/runs'
import type { Guess } from '../../sim/feedback'

export type Pred = { guess: Guess | null; why: Reason | null }

const GUESSES: Guess[] = ['more', 'same', 'less']
const REASONS: Reason[] = ['shade', 'light', 'fan', 'pump']

export function Prediction({ pred, onChange }: { pred: Pred; onChange: (p: Pred) => void }) {
  return (
    <div className="card predict" id="predictCard">
      <div className="eyebrow warn">{t('predict.eyebrow')}</div>
      <h2 className="card-title">{t('predict.title')}</h2>
      <p>{t('predict.prompt')}</p>
      <Seg label={t('predict.guessLabel')} options={GUESSES.map(v => ({ v, label: t(`predict.${v}`) }))}
        isOn={v => pred.guess === v} onPick={guess => onChange({ ...pred, guess })} />
      <p className="because">{t('predict.because')}</p>
      <Seg label={t('predict.whyLabel')} options={REASONS.map(v => ({ v, label: t(`predict.why.${v}`) }))}
        isOn={v => pred.why === v} onPick={why => onChange({ ...pred, why })} />
    </div>
  )
}
