import model from '../../config/model.json'
import { t } from '../../i18n/t'
import type { Design, Hour } from '../../sim/types'

type Props = {
  design: Design
  /** the hour to show: the playing hour, or 6:00 of a preview run before the first run */
  hour: Hour
  energy: number
  growth: number
  /** true once a run has started: show what is running; false shows the sunrise values */
  live: boolean
}

export function Gauges({ design: d, hour: hr, energy, growth, live }: Props) {
  const crop = model.crops[d.crop]
  const temp = (hr.leafTemp > crop.stress ? ['gauges.tooHot', 'var(--bad)'] as const
    : hr.leafTemp > crop.hi ? ['gauges.warm', 'var(--warn)'] as const : ['gauges.comfy', 'var(--good)'] as const)
  const soil = (hr.moisture < model.dryBelow ? ['gauges.dry', 'var(--warn)'] as const
    : hr.moisture > model.fieldCapacity ? ['gauges.soggy', 'var(--bad)'] as const : ['gauges.good', 'var(--good)'] as const)
  const soilPct = Math.round(hr.moisture * 100)

  return (
    <>
      <div className="gauges">
        <div className="g"><span>{t('gauges.energy')}</span><b>{energy.toFixed(1)}</b> <em>{t('gauges.wh')}</em></div>
        <div className="g">
          <span>{t('gauges.leafTemp')}</span>
          <b>{t('gauges.degF', { n: Math.round(hr.leafTemp) })}</b> <em style={{ color: temp[1] }}>{t(temp[0])}</em>
        </div>
        <div className="g">
          <span>{t('gauges.soil')}</span>
          <b>{soilPct}%</b> <em style={{ color: soil[1] }}>{t(soil[0])}</em>
          <div className="meter"><i style={{ width: `${soilPct}%`, background: soil[1] }} /></div>
        </div>
        <div className="g">
          <span>{t('gauges.growth')}</span><b>{Math.round(growth * 100)}%</b>
          <div className="meter"><i style={{ width: `${Math.min(100, growth * 100)}%` }} /></div>
        </div>
      </div>
      {!live && <p className="gauge-note">{t('gauges.atSunrise')}</p>}
      {live && (
        <div className="chips" id="chips" aria-label={t('chips.label')}>
          {d.fan && <span className={hr.on.fan ? 'chip on' : 'chip'}>{t(hr.on.fan ? 'chips.fanOn' : 'chips.fanOff')}</span>}
          {d.pump && <span className={hr.on.pump ? 'chip on' : 'chip'}>{t(hr.on.pump ? 'chips.pumpOn' : 'chips.pumpOff')}</span>}
          {d.pump && <span className="chip">{t('chips.tank', { n: Math.round((hr.tank / model.tankSize.large) * 100) })}</span>}
          {hr.sun > 0 && <span className="chip">{t('chips.light', { n: Math.round((hr.plantLight / hr.sun) * 100) })}</span>}
        </div>
      )}
    </>
  )
}
