// Stage 3: run the six tests on the finished frame. Each plays a short animation (none with reduced
// motion), then shows a text result (pass / needs work / ask your facilitator), one sentence why,
// and an idea to try next. The last two runs are kept, so after changing one part the learner can
// compare before and after.
import { useEffect, useRef, useState } from 'react'
import config from '../../config/structure.json'
import { t, type Key } from '../../i18n/t'
import { SLOTS, type Design } from '../../structure/options'
import { loadRuns, saveRun, type Run } from '../../structure/progress'
import { runTests, TESTS, tryNext, type Status, type TestId, type TestResult } from '../../structure/rules'
import { describe } from './Builder'
import { Frame2D, FRAME2D } from './Frame2D'
import { SunAngle } from './SunAngle'

const STEP_MS = 1400
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const { GROUND, PX, CM } = FRAME2D

export const statusLabel = (s: Status) => t(`st.status.${s}` as Key)
const testName = (id: TestId) => t(`st.test.${id}.name` as Key)
const whyText = (r: TestResult) => t(`st.test.${r.id}.${r.why}` as Key, { flags: (r.flags ?? []).map(f => t(`st.facility.${f}` as Key)).join(', ') })

/** the parts that differ between two designs (for "you changed: …") */
function changed(a: Design, b: Design) {
  const parts = SLOTS.filter(s => a[s] !== b[s]).map(s => t(`st.slot.${s}` as Key))
  if (a.cupOpen !== b.cupOpen) parts.push(t('st.cupShort'))
  return parts
}

function ResultRow({ status, label }: { status: Record<TestId, Status>; label: string }) {
  return (
    <div className="result-row">
      <h3 className="sub">{label}</h3>
      <ul>
        {TESTS.map(id => <li key={id} className={`result ${status[id]}`}><span>{testName(id)}</span> <b>{statusLabel(status[id])}</b></li>)}
      </ul>
    </div>
  )
}

/** the picture for one test, after (or while) it runs */
function TestFigure({ r, d, live }: { r: TestResult; d: Design; live: boolean }) {
  const [angle, setAngle] = useState(r.status === 'pass' && r.id === 'angle' ? 40 : 25)
  const [slide, setSlide] = useState(0)
  // the angle test steps through 10°, 25°, 40°; the slip test slides the panel off
  useEffect(() => {
    if (!live || reducedMotion()) {
      setSlide(r.id === 'slip' && r.why === 'slides' ? 1 : 0)
      return
    }
    let id = 0
    if (r.id === 'angle' && r.status === 'pass') {
      let i = 0
      setAngle(config.angles[0])
      id = window.setInterval(() => { i = Math.min(i + 1, config.angles.length - 1); setAngle(config.angles[i]) }, STEP_MS / 3)
      return () => clearInterval(id)
    }
    if (r.id === 'slip' && r.why === 'slides') {
      const t0 = performance.now()
      const tick = (now: number) => { const k = Math.min(1, (now - t0) / (STEP_MS * 0.7)); setSlide(k); if (k < 1) id = requestAnimationFrame(tick) }
      id = requestAnimationFrame(tick)
      return () => cancelAnimationFrame(id)
    }
  }, [live, r.id, r.status, r.why])

  if (r.id === 'facility') {
    return (
      <ul className="facility-list">
        {(r.flags ?? []).length ? r.flags!.map(f => <li key={f}><span aria-hidden="true">⚠ </span>{t(`st.facility.${f}` as Key)}</li>) : <li><span aria-hidden="true">✓ </span>{t('st.facility.none')}</li>}
      </ul>
    )
  }
  const cupTop = GROUND - config.base.cup.height * CM
  const overlay = r.id === 'heat' ? (
    <g className={`heat ${r.why}`} aria-hidden="true">
      {[-14, 0, 14].map(dx => <path key={dx} className="wave" d={`M${PX + dx} ${GROUND - 44}q-5 -8 0 -16q5 -8 0 -16`} fill="none" stroke="#E05A2A" strokeWidth={2.5} strokeLinecap="round" />)}
      {r.why === 'closed' && (
        <g>
          <rect x={PX + 60} y={cupTop - 4} width={10} height={44} rx={5} fill="#fff" stroke="#2B2F2C" />
          <rect x={PX + 62} y={cupTop + 6} width={6} height={32} rx={3} fill="#D9362B" />
          <circle cx={PX + 65} cy={cupTop + 42} r={8} fill="#D9362B" stroke="#2B2F2C" />
        </g>
      )}
    </g>
  ) : r.id === 'shade' ? (
    <g aria-hidden="true">
      <circle cx={PX} cy={18} r={12} fill="#F2B705" />
      {r.status === 'pass'
        ? <ellipse className="shadow" cx={PX + 12} cy={GROUND - 30} rx={44} ry={30} fill="#1b2a20" opacity={0.28} />
        : <path d={`M${PX} 30L${PX} ${GROUND - 60}`} stroke="#F2B705" strokeWidth={3} strokeDasharray="5 5" />}
    </g>
  ) : null
  const sway = r.id === 'wobble' ? (r.status === 'pass' ? 'sway small' : 'sway big') : undefined
  return <Frame2D draft={d} angle={r.id === 'slip' ? 40 : angle} slide={slide} overlay={overlay} frameClass={live ? sway : undefined} label={`${testName(r.id)}: ${whyText(r)}`} />
}

type Props = { design: Design; onChangePart: () => void; onRuns: (runs: Run[]) => void }

export function TestBench({ design: d, onChangePart, onRuns }: Props) {
  const results = runTests(d)
  const [shown, setShown] = useState(-1) // how many results are showing; -1 before a run
  const [runs, setRuns] = useState<Run[]>(loadRuns)
  const [said, setSaid] = useState('')
  const timer = useRef(0)
  useEffect(() => () => clearTimeout(timer.current), [])
  // a new design starts fresh
  const key = JSON.stringify(d)
  useEffect(() => setShown(-1), [key])

  function finish() {
    const status = Object.fromEntries(results.map(r => [r.id, r.status])) as Record<TestId, Status>
    const next = saveRun({ design: d, status })
    setRuns(next)
    onRuns(next)
    const n = (s: Status) => results.filter(r => r.status === s).length
    setSaid(t('st.summary', { pass: n('pass'), work: n('needsWork'), ask: n('ask') }))
  }
  function run() {
    clearTimeout(timer.current)
    if (reducedMotion()) {
      setShown(results.length)
      finish()
      return
    }
    const step = (i: number) => {
      setShown(i)
      if (i > 0) { const r = results[i - 1]; setSaid(`${testName(r.id)}: ${statusLabel(r.status)}. ${whyText(r)}`) }
      if (i < results.length) timer.current = window.setTimeout(() => step(i + 1), STEP_MS)
      else finish()
    }
    step(0)
  }

  const done = shown >= results.length
  const before = runs.length > 1 && done ? runs[1] : null
  const diff = before ? changed(runs[0].design, before.design) : []

  return (
    <section className="testbench" aria-labelledby="st-test">
      <h2 className="h2" id="st-test">{t('st.testTitle')}</h2>
      <p className="hint">{t('st.testHint')}</p>
      <div className="row wrap">
        <button className="btn" type="button" onClick={run} disabled={shown >= 0 && !done}>{t(done ? 'st.runAgain' : 'st.run')}</button>
        <button className="btn ghost" type="button" onClick={onChangePart}>{t('st.changePart')}</button>
      </div>
      <p className="builder-said" role="status" aria-live="polite">{said}</p>

      {done && (
        <div className="card results">
          <ResultRow status={runs[0].status} label={t('st.resultsNow')} />
          {before && <ResultRow status={before.status} label={diff.length ? t('st.resultsBefore', { parts: diff.join(', ') }) : t('st.resultsSame')} />}
        </div>
      )}

      <ol className="tests">
        {results.map((r, i) => {
          const visible = shown > i || (shown === i && !done)
          const live = shown === i && !done
          const next = tryNext(r, d)
          return (
            <li key={r.id} className={`card test${visible ? '' : ' waiting'}`} aria-busy={live}>
              <div className="test-head">
                <h3 className="card-title">{testName(r.id)}</h3>
                {shown > i && <span className={`chip-status ${r.status}`}>{statusLabel(r.status)}</span>}
              </div>
              {visible ? (
                <>
                  <div className="test-fig"><TestFigure r={r} d={d} live={live} /></div>
                  {shown > i && <p className="flat">{whyText(r)}</p>}
                  {shown > i && next && <p className="try-next flat"><b>{t('st.tryNext')}</b> {t(`st.next.${next}` as Key)}</p>}
                </>
              ) : <p className="hint flat">{t(`st.test.${r.id}.what` as Key)}</p>}
            </li>
          )
        })}
      </ol>

      <SunAngle canTilt={results[0].status === 'pass'} />
      <p className="sr">{describe(d)}</p>
    </section>
  )
}
