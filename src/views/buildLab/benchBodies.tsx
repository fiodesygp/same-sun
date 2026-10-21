// Missions 4-7 on the pre-wired bench.
import { useEffect, useState } from 'react'
import { t, type Key } from '../../i18n/t'
import type { Load } from '../../sim/electric'
import { Bench, BENCH_START, benchRun, fanText, num, type BenchState } from './Bench'
import { COMBOS, comboLoads, m5Results, newlyPowered } from './benchRules'
import type { BodyProps } from './bodies'

const DEVICE: Record<Load, Key> = { led: 'learn.device.led', fan: 'learn.device.fan', pump: 'learn.device.pump' }
const list = (x: unknown): string[] => (Array.isArray(x) ? x.filter((v): v is string => typeof v === 'string') : [])
const comboName = (key: string) => comboLoads(key).map(l => t(DEVICE[l])).join(' + ')
const record = (x: unknown): Record<string, boolean> =>
  x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).filter(([k, v]) => COMBOS.includes(k) && typeof v === 'boolean')) : {}

function Simulator({ children }: { children: React.ReactNode }) {
  return (
    <section className="stack">
      <h2 className="card-title">{t('learn.simulator')}</h2>
      <div className="card">{children}</div>
    </section>
  )
}

function Check({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return <li className={ok ? 'ok' : undefined}><span aria-hidden="true">{ok ? '✓' : '○'}</span> {children}{ok && <span className="sr"> {t('learn.checkDone')}</span>}</li>
}

/** a short written answer, saved as you type */
export function Answer({ id, label, value, onChange, optional }: { id: string; label: Key; value: unknown; onChange: (v: string) => void; optional?: boolean }) {
  return (
    <div className="answer">
      <label htmlFor={id}>{t(label)}{optional && <span className="optional"> {t('learn.optional')}</span>}</label>
      <textarea id={id} rows={2} maxLength={300} value={typeof value === 'string' ? value : ''} onChange={e => onChange(e.target.value)} />
    </div>
  )
}

// ---------- mission 4: switch, dial, polarity ----------

export function M4({ evidence: e, save }: BodyProps) {
  const [s, setS] = useState<BenchState>(BENCH_START)
  const speeds = (Array.isArray(e.speeds) ? e.speeds : []).filter((v): v is number => typeof v === 'number')

  function change(n: BenchState) {
    const patch: Record<string, unknown> = {}
    if (n.switchOn && !s.switchOn && e.switched !== true) patch.switched = true
    if (n.reversed !== s.reversed && n.switchOn && e.flipped !== true) patch.flipped = true
    const rpm = Math.abs(benchRun(n).fan.rpm)
    if (n.pot !== s.pot && rpm > 0 && !speeds.includes(rpm) && speeds.length < 6) patch.speeds = [...speeds, rpm]
    if (Object.keys(patch).length) save(patch)
    setS(n)
  }

  return (
    <>
      <Simulator><Bench state={s} onChange={change} controls={['switch', 'pot', 'polarity']} /></Simulator>
      <section className="card evidence stack">
        <h2 className="card-title">{t('learn.evidence')}</h2>
        <ul className="evidence-list checks" aria-live="polite">
          <Check ok={e.switched === true}>{t('learn.m4.check.switched')}</Check>
          <Check ok={speeds.length >= 2}>{t('learn.m4.check.speeds', { n: Math.min(speeds.length, 2) })}</Check>
          <Check ok={e.flipped === true}>{t('learn.m4.check.flipped')}</Check>
        </ul>
        <fieldset>
          <legend>{t('learn.m4.q')}</legend>
          <div className="seg">
            {(['yes', 'no'] as const).map(v => (
              <button key={v} type="button" aria-pressed={e.polarity === v} onClick={() => save({ polarity: v })}>{t(v === 'yes' ? 'learn.yes' : 'learn.no')}</button>
            ))}
          </div>
        </fieldset>
        <Answer id="m4-what" label="learn.m4.what" value={e.whatHappened} onChange={v => save({ whatHappened: v })} />
      </section>
    </>
  )
}

// ---------- mission 5: one panel's limits, with a map ----------

export function M5({ evidence: e, save }: BodyProps) {
  const [s, setS] = useState<BenchState>({ ...BENCH_START, loads: { led: true, fan: false, pump: false } })
  const results = record(e.results)
  const remember = (n: BenchState, prev = results) => {
    const next = m5Results(prev, n)
    if (next) save({ results: next, together: Object.keys(next).filter(k => k.includes('+')) })
  }
  // the starting set (the LED alone) counts as tried the first time you open the mission
  useEffect(() => {
    if (!Object.keys(results).length) remember(s, {})
  }, [])

  return (
    <>
      <Simulator><Bench state={s} onChange={n => { setS(n); remember(n) }} controls={['loads']} /></Simulator>
      <section className="card evidence stack">
        <h2 className="card-title">{t('learn.m5.mapTitle')}</h2>
        <PowerMap results={results} />
        <h3 className="sub">{t('learn.m5.alone')}</h3>
        <ResultList keys={COMBOS.filter(k => !k.includes('+') && k in results)} results={results} />
        <h3 className="sub">{t('learn.m5.together')}</h3>
        <ResultList keys={COMBOS.filter(k => k.includes('+') && k in results)} results={results} />
      </section>
    </>
  )
}

function ResultList({ keys, results }: { keys: string[]; results: Record<string, boolean> }) {
  if (!keys.length) return <p className="hint flat">{t('learn.m5.untested')}</p>
  return (
    <ul className="evidence-list results">
      {keys.map(k => (
        <li key={k} className={results[k] ? 'ok' : 'no'}>
          <span aria-hidden="true">{results[k] ? '✓' : '✗'}</span> {t(results[k] ? 'learn.m5.ran' : 'learn.m5.notRan', { items: comboName(k) })}
        </li>
      ))}
    </ul>
  )
}

const NODE: Record<Load, [number, number]> = { led: [120, 34], fan: [44, 118], pump: [196, 118] }

/** The deck's map: a circle for a device that ran by itself, a line for two that ran together. */
function PowerMap({ results }: { results: Record<string, boolean> }) {
  const pairs = COMBOS.filter(k => k.split('+').length === 2)
  return (
    <svg className="power-map" viewBox="0 0 240 160" aria-hidden="true">
      {results['led+fan+pump'] && <path d="M120 34L44 118H196Z" fill="#DCEFE4" />}
      {pairs.filter(k => k in results).map(k => {
        const [a, b] = comboLoads(k), [x1, y1] = NODE[a], [x2, y2] = NODE[b]
        return (
          <g key={k}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={results[k] ? '#0B6B47' : '#8A5A00'} strokeWidth={results[k] ? 5 : 3} strokeDasharray={results[k] ? undefined : '6 6'} />
            {!results[k] && <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 + 5} textAnchor="middle" fontSize="16" fontWeight="800" fill="#8A5A00" stroke="#fff" strokeWidth="4" paintOrder="stroke">✗</text>}
          </g>
        )
      })}
      {(Object.keys(NODE) as Load[]).map(l => {
        const [x, y] = NODE[l], r = results[l]
        return (
          <g key={l}>
            <circle cx={x} cy={y} r="24" fill={r ? '#DCEFE4' : '#fff'} stroke={r === undefined ? '#9AA59E' : r ? '#0B6B47' : '#8A5A00'} strokeWidth={r ? 4 : 2.5} strokeDasharray={r === false ? '5 4' : undefined} />
            <text x={x} y={y + 6} textAnchor="middle" fontSize="16" fontWeight="800" fill={r ? '#0B6B47' : '#8A5A00'}>{r === undefined ? '' : r ? '✓' : '✗'}</text>
            <text x={x} y={y + 40} textAnchor="middle" fontSize="12" fontWeight="700" fill="#17241D">{t(DEVICE[l])}</text>
          </g>
        )
      })}
    </svg>
  )
}

// ---------- mission 6: a second panel ----------

export function M6({ evidence: e, save, onSketch }: BodyProps) {
  const [s, setS] = useState<BenchState>({ ...BENCH_START, loads: { led: false, fan: false, pump: true } })
  const newly = list(e.newlyPowered)
  function change(n: BenchState) {
    setS(n)
    const k = newlyPowered(n)
    if (k && !newly.includes(k)) save({ newlyPowered: [...newly, k] })
  }
  return (
    <>
      <Simulator><Bench state={s} onChange={change} controls={['panels', 'wiring', 'loads']} /></Simulator>
      <section className="card evidence stack">
        <h2 className="card-title">{t('learn.evidence')}</h2>
        <h3 className="sub">{t('learn.m6.newly')}</h3>
        {newly.length
          ? <ul className="evidence-list results" aria-live="polite">{newly.map(k => <li key={k} className="ok"><span aria-hidden="true">✓</span> {comboName(k)}</li>)}</ul>
          : <p className="hint flat" aria-live="polite">{t('learn.m6.none')}</p>}
        <Answer id="m6-sentence" label="learn.m6.sentence" value={e.sentence} onChange={v => save({ sentence: v })} optional />
        <Sketch onSketch={onSketch} />
      </section>
    </>
  )
}

export function Sketch({ onSketch }: { onSketch: () => void }) {
  return (
    <div className="sketch">
      <p className="flat">{t('learn.sketch.prompt')}</p>
      <button className="btn ghost" type="button" onClick={onSketch}>{t('learn.sketch.btn')}</button>
    </div>
  )
}

// ---------- mission 7: series and parallel ----------

type Reading = { v: number; a: number; w: number; rpm: number }
const reading = (x: unknown): Reading | null =>
  x && typeof x === 'object' && ['v', 'a', 'w', 'rpm'].every(k => typeof (x as Record<string, unknown>)[k] === 'number') ? (x as Reading) : null

export function M7({ evidence: e, save }: BodyProps) {
  const [s, setS] = useState<BenchState>({ ...BENCH_START, panels: 2, wiring: 'series', loads: { led: false, fan: true, pump: false } })
  const r = benchRun(s)
  const rows = { series: reading(e.series), parallel: reading(e.parallel) }
  return (
    <>
      <Simulator>
        <Bench state={s} onChange={setS} controls={['wiring']} show="supply" />
        <button className="btn save-reading" type="button"
          onClick={() => save({ [s.wiring]: { v: r.supply.v, a: r.supply.a, w: r.supply.w, rpm: r.fan.rpm } })}>
          {t(s.wiring === 'series' ? 'learn.m7.saveSeries' : 'learn.m7.saveParallel')}
        </button>
      </Simulator>
      <section className="card evidence stack">
        <h2 className="card-title">{t('learn.evidence')}</h2>
        <div className="table-wrap">
          <table className="readings">
            <thead>
              <tr><th scope="col">{t('learn.m7.how')}</th><th scope="col">V</th><th scope="col">A</th><th scope="col">W</th><th scope="col">{t('learn.read.rpm')}</th></tr>
            </thead>
            <tbody aria-live="polite">
              {(['series', 'parallel'] as const).map(w => {
                const x = rows[w]
                return (
                  <tr key={w}>
                    <th scope="row">{t(w === 'series' ? 'learn.ctl.series' : 'learn.ctl.parallel')}</th>
                    {x ? <><td className="num">{num(x.v)}</td><td className="num">{num(x.a, 2)}</td><td className="num">{num(x.w, 2)}</td><td className="num">{fanText(x.rpm)}</td></>
                      : <td colSpan={4} className="hint">{t('learn.m7.notYet')}</td>}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {rows.series && rows.parallel && <p className="support-line">{t('learn.m7.compare')}</p>}
      </section>
    </>
  )
}
