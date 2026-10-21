// Each mission's simulator and evidence box. Missions fill in step by step.
import { t } from '../../i18n/t'
import type { MissionId } from '../../lib/learn'
import type { Evidence } from './missions'

export interface BodyProps {
  evidence: Evidence
  save: (patch: Evidence) => void
  onSketch: () => void
}

const BODIES: Partial<Record<MissionId, (p: BodyProps) => React.ReactNode>> = {}

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
