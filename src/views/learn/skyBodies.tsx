// Missions 2 and 3 on the Sun Day scene.
import { useState } from 'react'
import { SPOTS } from '../../components/Scene'
import { t, type Key } from '../../i18n/t'
import { fanText, num } from './Bench'
import { Answer, Sketch } from './benchBodies'
import type { BodyProps } from './bodies'
import { clock, DESIGN, SKY_START, SkyControls, SkyScene, skyRun, TILTS, type Sky } from './sky'

const MAX_W = 1 // one panel's best power in full sun (W), for the power bar
const skyKey = (s: Sky) => `${s.tilt}|${s.hour}|${s.cloud ? 1 : 0}`
const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object'
const asSky = (x: Record<string, unknown>): Sky | null =>
  TILTS.includes(x.tilt as never) && typeof x.hour === 'number' && typeof x.cloud === 'boolean' ? { tilt: x.tilt as Sky['tilt'], hour: x.hour, cloud: x.cloud } : null
const setting = (s: Sky) => `${s.tilt}° · ${clock(s.hour)}${s.cloud ? ' · ' + t('learn.scene.cloudShort') : ''}`

function Simulator({ children }: { children: React.ReactNode }) {
  return (
    <section className="stack">
      <h2 className="card-title">{t('learn.simulator')}</h2>
      {children}
    </section>
  )
}

// ---------- mission 2: the most powerful system ----------

const FACTORS = ['angle', 'time', 'clouds', 'shade', 'size'] as const

type Try = Sky & { w: number }

export function M2({ evidence: e, save, onSketch }: BodyProps) {
  const [sky, setSky] = useState<Sky>(SKY_START)
  const { r } = skyRun(sky)
  const tries: Try[] = (Array.isArray(e.tries) ? e.tries : []).flatMap(x => {
    const s = isObj(x) ? asSky(x) : null
    return s && isObj(x) && typeof x.w === 'number' ? [{ ...s, w: x.w }] : []
  })
  const factors = (Array.isArray(e.factors) ? e.factors : []).filter((f): f is string => typeof f === 'string')
  const saved = tries.some(x => skyKey(x) === skyKey(sky))
  const best = tries.reduce((b, x) => Math.max(b, x.w), 0)

  function saveTry() {
    const next = [...tries, { ...sky, w: r.supply.w }].slice(-8)
    save({ tries: next, tried: next.map(skyKey) })
  }

  return (
    <>
      <Simulator>
        <SkyScene sky={sky} />
        <div className="card stack">
          <div className="power-meter" aria-live="off">
            <div className="slider-top"><span>{t('learn.m2.power')}</span><b className="num">{num(r.supply.w, 2)} W</b></div>
            <div className="learn-bar" aria-hidden="true"><i style={{ width: `${Math.min(100, (r.supply.w / MAX_W) * 100)}%` }} /></div>
            <div className="slider-top"><span>{t('learn.device.fan')}</span><span>{fanText(r.fan.rpm)}</span></div>
          </div>
          <SkyControls sky={sky} onChange={setSky} />
          <button className="btn" type="button" disabled={saved} onClick={saveTry}>{t(saved ? 'learn.m2.saved' : 'learn.m2.save')}</button>
        </div>
      </Simulator>

      <section className="card evidence stack">
        <h2 className="card-title">{t('learn.evidence')}</h2>
        <p className="hint flat" aria-live="polite">{t('learn.m2.count', { n: tries.length })}</p>
        {tries.length > 0 && (
          <div className="table-wrap">
            <table className="readings">
              <thead><tr><th scope="col">{t('learn.m2.setting')}</th><th scope="col">W</th></tr></thead>
              <tbody>
                {tries.map((x, i) => (
                  <tr key={i}>
                    <th scope="row">{setting(x)}</th>
                    <td className="num">{num(x.w, 2)}{x.w === best && best > 0 && <span className="best"> ★ {t('learn.m2.most')}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <fieldset>
          <legend>{t('learn.m2.factors')}</legend>
          <div className="seg">
            {FACTORS.map(f => (
              <button key={f} type="button" aria-pressed={factors.includes(f)}
                onClick={() => save({ factors: factors.includes(f) ? factors.filter(x => x !== f) : [...factors, f] })}>
                <span aria-hidden="true">{factors.includes(f) ? '✓ ' : ''}</span>{t(`learn.factor.${f}` as Key)}
              </button>
            ))}
          </div>
        </fieldset>
        <Answer id="m2-sentence" label="learn.m2.sentence" value={e.sentence} onChange={v => save({ sentence: v })} />
        <Sketch onSketch={onSketch} />
      </section>
    </>
  )
}

// ---------- mission 3: senses, then tools ----------

type Tool = 'fc' | 'v' | 'rpm'
const TOOLS: Tool[] = ['fc', 'v', 'rpm']
const TOOL_SPOT: Record<Tool, 'panel' | 'fan'> = { fc: 'panel', v: 'panel', rpm: 'fan' }
type Reading = Sky & { fc: number | null; v: number | null; rpm: number | null }
const LEVELS = { light: ['low', 'medium', 'high'], fan: ['slow', 'medium', 'fast'] } as const

export function M3({ evidence: e, save }: BodyProps) {
  const [sky, setSky] = useState<Sky>(SKY_START)
  const [tool, setTool] = useState<Tool | null>(null)
  const [got, setGot] = useState<Partial<Record<Tool, number>>>({})
  const [note, setNote] = useState<Key | null>(null)
  const { light, r } = skyRun(sky)
  const senses = isObj(e.senses) ? e.senses : {}
  const sensed = typeof senses.light === 'string' && typeof senses.fan === 'string'
  const readings: Reading[] = (Array.isArray(e.readings) ? e.readings : []).flatMap(x => {
    const s = isObj(x) ? asSky(x) : null
    const n = (k: string) => (isObj(x) && typeof x[k] === 'number' ? (x[k] as number) : null)
    return s ? [{ ...s, fc: n('fc'), v: n('v'), rpm: n('rpm') }] : []
  })

  const value: Record<Tool, number> = { fc: light.fc, v: r.supply.v, rpm: r.fan.rpm }
  const show = (k: Tool, n: number) => (k === 'fc' ? `${num(n, 0)} FC` : k === 'v' ? `${num(n)} V` : fanText(n))

  function changeSky(s: Sky) {
    setSky(s)
    setGot({})
    setNote(null)
  }
  function measure(spot: 'panel' | 'fan') {
    if (!tool) return
    if (TOOL_SPOT[tool] !== spot) return setNote(`learn.tool.${tool}.where` as Key)
    setGot({ ...got, [tool]: value[tool] })
    setNote(null)
  }
  function saveReading() {
    save({ readings: [...readings, { ...sky, fc: got.fc ?? null, v: got.v ?? null, rpm: got.rpm ?? null }].slice(-10) })
    setGot({})
  }

  const [px, py] = SPOTS.panel(DESIGN.height), [fx, fy] = SPOTS.fan
  const target = (spot: 'panel' | 'fan', x: number, y: number) => (
    <g className="tool-target" role="button" tabIndex={0} aria-label={t(spot === 'panel' ? 'learn.tool.onPanel' : 'learn.tool.onFan', { tool: t(`learn.tool.${tool!}` as Key) })}
      onClick={() => measure(spot)} onKeyDown={ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); measure(spot) } }}>
      <rect x={x - 28} y={y - 28} width={56} height={56} rx={10} />
    </g>
  )

  return (
    <>
      <Simulator>
        <SkyScene sky={sky}>{sensed && tool && <>{target('panel', px, py)}{target('fan', fx, fy)}</>}</SkyScene>
        <div className="card stack">
          <SkyControls sky={sky} onChange={changeSky} />
        </div>
      </Simulator>

      <section className="card stack">
        <h2 className="card-title">{t('learn.m3.senses')}</h2>
        {(['light', 'fan'] as const).map(k => (
          <fieldset key={k}>
            <legend>{t(k === 'light' ? 'learn.m3.rateLight' : 'learn.m3.rateFan')}</legend>
            <div className="seg">
              {LEVELS[k].map(v => (
                <button key={v} type="button" aria-pressed={senses[k] === v} onClick={() => save({ senses: { ...senses, [k]: v } })}>{t((k === 'fan' && v === 'medium' ? 'learn.rate.mediumFan' : `learn.rate.${v}`) as Key)}</button>
              ))}
            </div>
          </fieldset>
        ))}
      </section>

      <section className="card stack" aria-labelledby="m3-tools">
        <h2 className="card-title" id="m3-tools">{t('learn.m3.tools')}</h2>
        {!sensed ? <p className="hint flat">{t('learn.m3.locked')}</p> : (
          <>
            <fieldset>
              <legend>{t('learn.m3.pick')}</legend>
              <div className="seg">
                {TOOLS.map(k => (
                  <button key={k} type="button" aria-pressed={tool === k} onClick={() => { setTool(k); setNote(null) }}>{t(`learn.tool.${k}` as Key)}</button>
                ))}
              </div>
            </fieldset>
            <p className="tool-note" aria-live="polite">
              {note ? t(note) : tool ? t(`learn.tool.${tool}.how` as Key) : t('learn.m3.pickFirst')}
            </p>
            <dl className="vaw">
              {TOOLS.map(k => (
                <div key={k}><dt>{t(`learn.tool.${k}` as Key)}</dt><dd className="num">{got[k] === undefined ? '—' : show(k, got[k]!)}</dd></div>
              ))}
            </dl>
            <button className="btn" type="button" disabled={!Object.keys(got).length} onClick={saveReading}>{t('learn.m3.save')}</button>
          </>
        )}
      </section>

      <section className="card evidence stack">
        <h2 className="card-title">{t('learn.evidence')}</h2>
        <p className="hint flat" aria-live="polite">{t('learn.m3.count', { n: readings.length })}</p>
        {readings.length > 0 && (
          <div className="table-wrap">
            <table className="readings">
              <thead><tr><th scope="col">{t('learn.m2.setting')}</th><th scope="col">FC</th><th scope="col">V</th><th scope="col">RPM</th></tr></thead>
              <tbody>
                {readings.map((x, i) => (
                  <tr key={i}>
                    <th scope="row">{setting(x)}</th>
                    <td className="num">{x.fc === null ? '—' : num(x.fc, 0)}</td>
                    <td className="num">{x.v === null ? '—' : num(x.v)}</td>
                    <td className="num">{x.rpm === null ? '—' : num(x.rpm, 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}
