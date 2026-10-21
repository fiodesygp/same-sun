// Each mission's simulator and evidence box. Missions fill in step by step.
import { t } from '../../i18n/t'
import type { MissionId } from '../../lib/learn'
import type { Evidence } from './missions'
import { MiniLab } from './MiniLab'

export interface BodyProps {
  evidence: Evidence
  save: (patch: Evidence) => void
  onSketch: () => void
}

const list = (x: unknown): string[] => (Array.isArray(x) ? x.filter((v): v is string => typeof v === 'string') : [])

/** Mission 1: free wiring with the fan or the LED; the evidence is which device worked. */
function M1({ evidence, save }: BodyProps) {
  const worked = list(evidence.worked)
  return (
    <section className="stack">
      <h2 className="card-title">{t('learn.simulator')}</h2>
      <MiniLab levels={[{ level: 0, label: 'learn.device.fan' }, { level: 1, label: 'learn.device.led' }]} groupLabel="learn.device"
        onSolved={l => {
          const device = l === 0 ? 'fan' : 'led'
          save({ device, worked: worked.includes(device) ? worked : [...worked, device] })
        }} />
      <div className="card evidence" aria-live="polite">
        <h2 className="card-title">{t('learn.evidence')}</h2>
        {worked.length
          ? <ul className="evidence-list">{worked.map(d => <li key={d}><span aria-hidden="true">✓ </span>{t(d === 'fan' ? 'learn.m1.worked.fan' : 'learn.m1.worked.led')}</li>)}</ul>
          : <p className="hint flat">{t('learn.m1.none')}</p>}
      </div>
    </section>
  )
}

/** Bonus: the Build Lab pump level, with a count of the water pumped. */
function Pump({ evidence, save }: BodyProps) {
  const ml = typeof evidence.ml === 'number' ? evidence.ml : 0
  return (
    <section className="stack">
      <h2 className="card-title">{t('learn.simulator')}</h2>
      <MiniLab levels={[{ level: 3, label: 'learn.m.pump.title' }]} onSolved={() => { if (evidence.pumpRan !== true) save({ pumpRan: true }) }}
        water={{ ml, onMl: n => { if (n % 10 === 0) save({ ml: n }) } }} />
      {evidence.pumpRan === true && <p className="done-note" aria-live="polite"><span aria-hidden="true">✓ </span>{t('learn.pump.ran')}</p>}
    </section>
  )
}

const BODIES: Partial<Record<MissionId, (p: BodyProps) => React.ReactNode>> = {
  m1: p => <M1 {...p} />,
  pump: p => <Pump {...p} />
}

export function MissionBody({ id, ...props }: BodyProps & { id: MissionId }) {
  const Body = BODIES[id]
  if (Body) return <>{Body(props)}</>
  return (
    <section className="card">
      <h2 className="card-title">{t('learn.simulator')}</h2>
      <p className="hint flat">{t('learn.comingNext')}</p>
    </section>
  )
}
