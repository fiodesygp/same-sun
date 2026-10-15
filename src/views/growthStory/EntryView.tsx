import { useState } from 'react'
import { t } from '../../i18n/t'
import { stageKind, type GrowthStoryEntry } from '../../lib/growthStory'
import { fmtDate } from './EntryList'

type Props = { entry: GrowthStoryEntry; onBack: () => void; onEdit: () => void; onDelete: () => Promise<boolean> }

export function EntryView({ entry: x, onBack, onEdit, onDelete }: Props) {
  const [armed, setArmed] = useState(false)
  const [failed, setFailed] = useState(false)
  const step = t(`stage.${x.stage}.label`)

  // delete needs a second tap
  async function del() {
    if (!armed) return setArmed(true)
    setFailed(!(await onDelete()))
  }

  return (
    <article className="card jview">
      <button className="back" type="button" onClick={onBack}>{t('growthStory.back')}</button>
      <div className="meta">
        <span className={`stag ${stageKind(x.stage)}`}>{step}</span>
        <span className="when">{fmtDate(x.when)}</span>
      </div>
      {x.photo && <img src={x.photo} alt={t('growthStory.photoAlt', { step })} />}
      {x.story && <p>{x.story}</p>}
      <div className="row wrap">
        <button className="btn ghost" type="button" onClick={onEdit}>{t('growthStory.edit')}</button>
        <button className="linkbtn danger" type="button" onClick={del}>{t(armed ? 'growthStory.deleteConfirm' : 'growthStory.delete')}</button>
        {failed && <span className="formmsg" role="status">{t('growthStory.deleteError')}</span>}
      </div>
    </article>
  )
}
