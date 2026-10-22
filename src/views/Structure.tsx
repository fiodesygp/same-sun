// Structure: choose materials, build a frame that holds the solar panel above the plant, and test
// it. The key idea: an adjustable panel needs a hinge (a pivot) and an angle stop (something that
// holds it at 10°, 25° or 40°).
import { useEffect, useRef, useState } from 'react'
import { MaterialIcon } from '../components/materials/art'
import { t, type Key } from '../i18n/t'
import { MATERIAL_IDS, type MaterialId } from '../structure/materials'
import { allMaterialsChecked, answerMaterial, loadStructure, type StructureState } from '../structure/progress'
import { FacilityTag, MaterialView } from './structure/MaterialView'

type Stage = 'materials'

export function Structure({ active }: { active: boolean }) {
  const [state, setState] = useState<StructureState>(loadStructure)
  const [stage, setStage] = useState<Stage>('materials')
  const [open, setOpen] = useState<MaterialId | null>(null)
  const tileRefs = useRef<Partial<Record<MaterialId, HTMLButtonElement | null>>>({})
  const returnTo = useRef<MaterialId | null>(null)

  useEffect(() => {
    if (active) setState(loadStructure())
  }, [active])

  // back from a card: return focus to its tile
  useEffect(() => {
    if (open || !returnTo.current) return
    tileRefs.current[returnTo.current]?.focus()
    returnTo.current = null
  }, [open])

  function show(id: MaterialId | null) {
    if (!id) returnTo.current = open
    setOpen(id)
    window.scrollTo(0, 0)
  }

  if (open) {
    return (
      <MaterialView id={open} checked={state.checked.includes(open)} onBack={() => show(null)}
        onAnswer={c => { const r = answerMaterial(open, c); setState(r.state); return r.right }} />
    )
  }

  const checked = state.checked.length, unlocked = allMaterialsChecked(state)

  return (
    <>
      <div>
        <div className="eyebrow">{t('st.eyebrow')}</div>
        <h1 className="page-title">{t('st.title')}</h1>
        <p className="lede">{t('st.lede')}</p>
      </div>
      <aside className="card support key-idea" aria-labelledby="st-key">
        <h2 className="card-title" id="st-key">{t('st.key.title')}</h2>
        <p className="measure"><b>{t('st.key.hinge')}</b> {t('st.key.hingeText')}</p>
        <p className="measure"><b>{t('st.key.stop')}</b> {t('st.key.stopText')}</p>
      </aside>

      <div className="seg stages" role="group" aria-label={t('st.stages')}>
        <button type="button" aria-pressed={stage === 'materials'} onClick={() => setStage('materials')}>
          {t('st.stage.materials')}<small>{t('power.checks', { n: checked, total: MATERIAL_IDS.length })}</small>
        </button>
      </div>

      <section aria-labelledby="st-materials">
        <h2 className="h2" id="st-materials">{t('st.materialsTitle')}</h2>
        <p className="hint">{t('st.materialsHint')}</p>
        <div className="learn-grid parts-grid">
          {MATERIAL_IDS.map(m => {
            const ok = state.checked.includes(m), name = t(`st.mat.${m}.name` as Key)
            return (
              <button key={m} type="button" ref={el => { tileRefs.current[m] = el }} className={`card part-tile${ok ? ' is-done' : ''}`}
                aria-label={t('power.openPart', { title: name, status: t(ok ? 'power.checkDone' : 'power.checkTodo') })}
                onClick={() => show(m)}>
                <span className="part-icon"><MaterialIcon id={m} /></span>
                <span className="learn-card-title">{name}</span>
                <FacilityTag id={m} />
                {ok && <span className="done-tag"><span aria-hidden="true">✓</span> {t('power.checkDone')}</span>}
              </button>
            )
          })}
        </div>
      </section>
      <div className="card unlock" aria-live="polite">
        <p className="flat">{unlocked ? <b>{t('st.unlocked')}</b> : t('st.toUnlock', { n: MATERIAL_IDS.length - checked })}</p>
      </div>
    </>
  )
}
