// Each step's simulator and evidence box.
import { t } from '../../i18n/t'
import type { MissionId } from '../../lib/learn'
import type { Evidence } from './missions'
import { LevelLab } from './LevelLab'
import { M4, M5, M6, M7 } from './benchBodies'
import { M2, M3 } from './skyBodies'
import { AgriPV, Reflect } from './bonusBodies'

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
      <LevelLab levels={[{ level: 0, label: 'learn.device.fan' }, { level: 1, label: 'learn.device.led' }]} groupLabel="learn.device"
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
      <LevelLab levels={[{ level: 3, label: 'learn.m.pump.title' }]} onSolved={() => { if (evidence.pumpRan !== true) save({ pumpRan: true }) }}
        water={{ ml, onMl: n => { if (n % 10 === 0) save({ ml: n }) } }} />
      {evidence.pumpRan === true && <p className="done-note" aria-live="polite"><span aria-hidden="true">✓ </span>{t('learn.pump.ran')}</p>}
    </section>
  )
}

/** Challenges: a Build Lab circuit (both, all three, fix it); done once it works with the sun on. */
function Challenge({ level, evidence, save }: BodyProps & { level: number }) {
  return (
    <section className="stack">
      <h2 className="card-title">{t('learn.simulator')}</h2>
      <LevelLab levels={[{ level, label: 'learn.simulator' }]} onSolved={() => { if (evidence.solved !== true) save({ solved: true }) }} />
      {evidence.solved === true && <p className="done-note" aria-live="polite"><span aria-hidden="true">✓ </span>{t('learn.challenge.solved')}</p>}
    </section>
  )
}

const BODIES: Record<MissionId, (p: BodyProps) => React.ReactNode> = {
  m1: p => <M1 {...p} />,
  m2: p => <M2 {...p} />,
  m3: p => <M3 {...p} />,
  m4: p => <M4 {...p} />,
  m5: p => <M5 {...p} />,
  m6: p => <M6 {...p} />,
  m7: p => <M7 {...p} />,
  both: p => <Challenge level={2} {...p} />,
  pump: p => <Pump {...p} />,
  all: p => <Challenge level={4} {...p} />,
  fix: p => <Challenge level={5} {...p} />,
  agripv: p => <AgriPV {...p} />,
  reflect: p => <Reflect {...p} />
}

export function MissionBody({ id, ...props }: BodyProps & { id: MissionId }) {
  return <>{BODIES[id](props)}</>
}
