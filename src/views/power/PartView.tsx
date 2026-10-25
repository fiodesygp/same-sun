// One part's card: What it is · How it works · Try it · Numbers, and a quick check.
import { CardImage } from '../../components/CardImage'
import { InfoCard } from '../../components/InfoCard'
import { PartIllustration } from '../../components/parts/art'
import { t, type Key } from '../../i18n/t'
import type { MissionId } from '../../lib/learn'
import { CHECKS } from '../../lib/parts'
import { part, PartIcon, type PartId } from './parts'

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
  const k = (s: string) => `learn.part.${id}.${s}` as Key
  return (
    <InfoCard title={t(k('name'))} icon={<PartIcon id={id} />} figure={<CardImage id={id} drawing={<PartIllustration id={id} />} />} backLabel={t('learn.back')} onBack={onBack}
      tabs={[
        { id: 'what', label: t('learn.partTab.what'), content: <p className="measure">{t(k('what'))}</p> },
        { id: 'how', label: t('learn.partTab.how'), content: <p className="measure">{t(k('how'))}</p> },
        {
          id: 'try', label: t('learn.partTab.try'), content: (
            <>
              <p className="measure">{t(k('try'))}</p>
              <button className="btn" type="button" onClick={() => onMission(p.mission)}>
                {t('learn.part.go', { title: t(`learn.m.${p.mission}.title` as Key) })}
              </button>
            </>
          )
        },
        {
          id: 'numbers', label: t('learn.partTab.numbers'), content: (
            <>
              <p className="measure">{t(k('numbers'), p.numbers())}</p>
              <p className="foot flat">{t('learn.estimates')}</p>
            </>
          )
        }
      ]}
      check={{
        question: t(k('check')), checked, onAnswer,
        choices: CHECKS[id].choices.map(c => ({ id: c, label: t(`learn.check.${id}.${c}` as Key) })),
        feedback: right => t(k(right ? 'checkWhy' : 'checkHint'))
      }} />
  )
}
