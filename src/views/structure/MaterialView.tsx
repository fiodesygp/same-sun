// One material's card: What it is · Good for · Watch out, its safety & prep check, and a quick check.
// The learner makes every choice in Build, so the card does not suggest picks.
import { InfoCard } from '../../components/InfoCard'
import { MaterialIcon, MaterialIllustration } from '../../components/materials/art'
import { t, type Key } from '../../i18n/t'
import { FACILITY, MATERIAL_CHECKS, type MaterialId } from '../../structure/materials'

type Props = {
  id: MaterialId
  checked: boolean
  onAnswer: (choice: string) => boolean
  onBack: () => void
  /** on the last card: open Build */
  onStartBuilding?: () => void
}

/** "Facility check: metal, sharp" or "Facility check: nothing to prepare" */
export function FacilityTag({ id }: { id: MaterialId }) {
  const f = FACILITY[id]
  return (
    <span className={`facility-tag${f.length ? ' flag' : ''}`}>
      {t('st.facility.label')}: {f.length ? f.map(x => t(`st.facility.${x}` as Key)).join(', ') : t('st.facility.none')}
    </span>
  )
}

export function MaterialView({ id, checked, onAnswer, onBack, onStartBuilding }: Props) {
  const k = (s: string) => `st.mat.${id}.${s}` as Key
  return (
    <InfoCard title={t(k('name'))} icon={<MaterialIcon id={id} />} figure={<MaterialIllustration id={id} />} backLabel={t('st.back')} onBack={onBack}
      tag={<FacilityTag id={id} />}
      tabs={[
        { id: 'what', label: t('st.tab.what'), content: <p className="measure">{t(k('what'))}</p> },
        { id: 'good', label: t('st.tab.good'), content: <p className="measure">{t(k('good'))}</p> },
        { id: 'watch', label: t('st.tab.watch'), content: <p className="measure">{t(k('watch'))}</p> }
      ]}
      footer={onStartBuilding && (
        <div className="card unlock">
          <p className="flat">{t('st.lastCard')}</p>
          <button className="btn" type="button" onClick={onStartBuilding}>{t('st.startBuilding')}</button>
        </div>
      )}
      check={{
        question: t(k('check')), checked, onAnswer,
        choices: MATERIAL_CHECKS[id].choices.map(c => ({ id: c, label: t(`st.check.${id}.${c}` as Key) })),
        feedback: right => t(k(right ? 'checkWhy' : 'checkHint'))
      }} />
  )
}
