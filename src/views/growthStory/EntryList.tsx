import { t } from '../../i18n/t'
import { STAGES, stageKind, type GrowthStoryEntry } from '../../lib/growthStory'

export const fmtDate = (ms: number) => new Date(ms).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })

export function EntryList({ entries, onOpen }: { entries: GrowthStoryEntry[]; onOpen: (id: number) => void }) {
  if (!entries.length) return <p className="none flat">{t('growthStory.noEntries')}</p>
  return (
    <div className="jsteps">
      {STAGES.map(s => {
        const items = entries.filter(x => x.stage === s).sort((a, b) => a.when - b.when)
        return (
          <section key={s} className="jstep">
            <h3>
              <span className={`dot ${stageKind(s)}`} aria-hidden="true" />
              {t(`stage.${s}.label`)}
              {items.length > 0 && <span className="n">{items.length}</span>}
            </h3>
            {!items.length && <p className="none">{t('growthStory.nothingYet')}</p>}
            {items.map(x => (
              <button key={x.id} type="button" className="erow" aria-label={t('growthStory.openEntry', { date: fmtDate(x.when) })} onClick={() => onOpen(x.id)}>
                {x.photo ? <img className="thumb" src={x.photo} alt="" /> : <span className="thumb" aria-hidden="true">✎</span>}
                <div>
                  <div className="when">{fmtDate(x.when)}</div>
                  <div className="txt">{x.story || t('growthStory.photoOnly')}</div>
                </div>
                <span className="chev" aria-hidden="true">{t('growthStory.open')}</span>
              </button>
            ))}
          </section>
        )
      })}
    </div>
  )
}
