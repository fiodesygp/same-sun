// Stage 4: build it for real. The materials list and the steps come from the learner's picks; if
// the design is one of the printed prototypes, its sheet is named. The frame can be seen in 2D or,
// where it runs well, in 3D. Saving puts the design in the Growth Story Card (step "Build", tagged
// "From Structure"), on this device only.
import { Suspense, useEffect, useState } from 'react'
import { MaterialIcon } from '../../components/materials/art'
import { can3DNow, Fallback3D, lazy3D } from '../../components/three/lazy'
import config from '../../config/structure.json'
import { t, type Key } from '../../i18n/t'
import { growthStoryStore } from '../../lib/growthStory'
import { detectDevice, loadView, saveView, startView, type View } from '../../lib/view3d'
import type { Design } from '../../structure/options'
import type { Run } from '../../structure/progress'
import { angleTest, materialsFor, matchPrototype, runTests, stepsFor, TESTS } from '../../structure/rules'
import { describe } from './Builder'
import { Frame2D } from './Frame2D'
import { FacilityTag } from './MaterialView'
import { statusLabel } from './TestBench'

const Frame3D = lazy3D(() => import('./Frame3D'))
const device = typeof window === 'undefined' ? null : detectDevice()
const VIEW_KEY = 'frameView'

/** the Growth Story text for a design: the sheet, the materials, the steps and the test results */
export function storyFor(d: Design) {
  const sheet = matchPrototype(d)
  const lines = [t('st.save.heading')]
  if (sheet) lines.push(t('st.save.sheet', { name: t(`st.proto.${sheet}` as Key) }))
  lines.push('', t('st.save.materials'), ...materialsFor(d).map(m => `• ${t(`st.mat.${m}.name` as Key)}`))
  lines.push('', t('st.save.steps'), ...stepsFor(d).map((s, i) => `${i + 1}. ${t(`st.how.${s}` as Key)}`))
  lines.push('', t('st.save.tests'), ...runTests(d).map(r => `• ${t(`st.test.${r.id}.name` as Key)}: ${statusLabel(r.status)}`))
  return lines.join('\n')
}

type Props = { design: Design; runs: Run[] }

export function SaveBuild({ design: d, runs }: Props) {
  const sheet = matchPrototype(d), canTilt = angleTest(d).status === 'pass'
  const [angle, setAngle] = useState(25)
  const [view, setView] = useState<View>('2d')
  const [viewMsg, setViewMsg] = useState<Key | null>(null)
  const [msg, setMsg] = useState<Key | null>(null)
  const can3d = !!device?.webgl
  const tested = runs[0] && JSON.stringify(runs[0].design) === JSON.stringify(d)

  useEffect(() => {
    if (device && startView(loadView(VIEW_KEY), device) === '3d') choose('3d', false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function choose(v: View, remember = true) {
    setViewMsg(null)
    if (remember) saveView(v, VIEW_KEY)
    if (v === '3d' && !(await can3DNow('Frame3D'))) {
      setView('2d')
      setViewMsg('lab.view.offline')
      return
    }
    setView(v)
  }
  function fail3D() {
    setView('2d')
    setViewMsg(navigator.onLine ? 'lab.view.failed' : 'lab.view.offline')
  }
  async function save() {
    const now = Date.now()
    try {
      await growthStoryStore.put({ id: now, when: now, stage: 'build', story: storyFor(d), photo: null, mission: 'structure' })
      setMsg('st.save.saved')
    } catch {
      setMsg('st.save.error')
    }
  }

  return (
    <section className="savebuild" aria-labelledby="st-save">
      <h2 className="h2" id="st-save">{t('st.saveTitle')}</h2>
      <p className="hint">{t('st.saveHint')}</p>
      {sheet && <p className="card sheet-match"><b>{t('st.save.sheet', { name: t(`st.proto.${sheet}` as Key) })}</b></p>}
      {!tested && <p className="notice flat">{t('st.save.untested')}</p>}

      <div className="builder-cols">
        <div className="card stack">
          <div className="row wrap between view-row">
            <h3 className="card-title flat">{t('st.save.look')}</h3>
            <div className="seg view-seg" role="group" aria-label={t('lab.view.label')}>
              <button type="button" aria-pressed={view === '2d'} onClick={() => choose('2d')}>{t('lab.view.2d')}</button>
              <button type="button" aria-pressed={view === '3d'} disabled={!can3d} onClick={() => choose('3d')}>{t('lab.view.3d')}</button>
            </div>
          </div>
          {!can3d && <p className="hint flat">{t('lab.view.noWebgl')}</p>}
          {viewMsg && <p className="notice flat" role="status">{t(viewMsg)}</p>}
          {view === '3d' ? (
            <Fallback3D onFail={fail3D} onReset={Frame3D.reset}>
              <Suspense fallback={<p className="board3d-loading" role="status">{t('lab.view.loading')}</p>}>
                <Frame3D.C design={d} angle={angle} label={describe(d)} onFail={fail3D} />
              </Suspense>
            </Fallback3D>
          ) : <Frame2D draft={d} angle={angle} label={describe(d)} />}
          {canTilt && (
            <fieldset>
              <legend>{t('learn.ctl.tilt')}</legend>
              <div className="seg">
                {config.angles.map(a => <button key={a} type="button" aria-pressed={angle === a} onClick={() => setAngle(a)}>{a}°</button>)}
              </div>
            </fieldset>
          )}
        </div>

        <div className="stack">
          <div className="card">
            <h3 className="card-title">{t('st.save.materials')}</h3>
            <ul className="mat-list">
              {materialsFor(d).map(m => (
                <li key={m}><span className="mat-icon"><MaterialIcon id={m} /></span><span><b>{t(`st.mat.${m}.name` as Key)}</b><br /><FacilityTag id={m} /></span></li>
              ))}
            </ul>
          </div>
          <div className="card">
            <h3 className="card-title">{t('st.save.steps')}</h3>
            <ol className="try-steps">{stepsFor(d).map(s => <li key={s}>{t(`st.how.${s}` as Key)}</li>)}</ol>
          </div>
          {tested && (
            <div className="card">
              <h3 className="card-title">{t('st.save.tests')}</h3>
              <ul className="result-row-list">
                {TESTS.map(id => <li key={id} className={`result ${runs[0].status[id]}`}><span>{t(`st.test.${id}.name` as Key)}</span> <b>{statusLabel(runs[0].status[id])}</b></li>)}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="row wrap">
        <button className="btn" type="button" onClick={save}>{t('st.save.button')}</button>
        <span className="formmsg" role="status">{msg && t(msg)}</span>
      </div>
    </section>
  )
}
