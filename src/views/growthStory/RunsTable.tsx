import { t } from '../../i18n/t'
import type { SavedRun } from '../../lib/runs'

const SHOW = 10

export function RunsTable({ runs }: { runs: SavedRun[] }) {
  return (
    <details className="card" aria-label={t('growthStory.runsTitle')}>
      <summary><b>{t('growthStory.runsTitle')}</b></summary>
      <div className="tablewrap">
        <table>
          <thead>
            <tr>
              <th>{t('growthStory.runsDesign')}</th>
              <th>{t('growthStory.runsGuess')}</th>
              <th>{t('growthStory.runsGrew')}</th>
              <th>{t('growthStory.runsScore')}</th>
            </tr>
          </thead>
          <tbody>
            {!runs.length && <tr><td colSpan={4} className="empty">{t('growthStory.runsEmpty')}</td></tr>}
            {runs.slice(0, SHOW).map(x => (
              <tr key={x.when}>
                <td>{t('growthStory.runsDesignValue', {
                  crop: t(`crops.${x.design.crop}`), panel: t(`growthStory.panel.${x.design.panels}`), height: t(`height.${x.design.height}`).toLowerCase()
                })}</td>
                <td>{x.guess ? t(`growthStory.word.${x.guess}`) : '—'}</td>
                <td>{t(`growthStory.word.${x.actual}`)}</td>
                <td>{t('growthStory.runsScoreValue', { score: x.score, fs: x.fullSun })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}
