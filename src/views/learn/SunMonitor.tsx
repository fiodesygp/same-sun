// Sun Monitor: watch one day go by and read every number live, like the real kit's data logger.
import { useEffect, useRef, useState } from 'react'
import { t } from '../../i18n/t'
import { fanText, num } from './Bench'
import { DAY, monitorAt, type Reading } from './monitor'
import { clock, SkyScene, TILTS, type Sky } from './sky'

const TICK_MS = 500
const onOff = (b: boolean) => t(b ? 'learn.state.on' : 'learn.state.off')

export function SunMonitor({ onBack }: { onBack: () => void }) {
  const [sky, setSky] = useState<Sky>({ tilt: 25, hour: DAY.from, cloud: false })
  const [running, setRunning] = useState(false)
  const [log, setLog] = useState<Reading[]>([])
  // what screen readers hear: only on the hour and when you stop, so it never chatters
  const [spoken, setSpoken] = useState('')
  const backRef = useRef<HTMLButtonElement>(null)
  useEffect(() => backRef.current?.focus(), [])

  const r = monitorAt(sky.hour, sky.tilt, sky.cloud)
  const summary = (x: Reading) => t('learn.mon.summary', { time: clock(x.h), w: num(x.w, 2), fan: fanText(x.rpm), pump: onOff(x.pump), soil: x.soil })

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      setSky(s => ({ ...s, hour: Math.min(DAY.to, s.hour + DAY.step) }))
    }, TICK_MS)
    return () => clearInterval(id)
  }, [running])

  // log and announce each whole hour while running
  useEffect(() => {
    if (!running || sky.hour % 1 !== 0) return
    const x = monitorAt(sky.hour, sky.tilt, sky.cloud)
    setLog(l => [x, ...l].slice(0, 10))
    setSpoken(summary(x))
    if (sky.hour >= DAY.to) setRunning(false)
  }, [sky.hour, running]) // eslint-disable-line react-hooks/exhaustive-deps

  function run() {
    if (running) {
      setRunning(false)
      setSpoken(summary(r))
      return
    }
    if (sky.hour >= DAY.to) setSky({ ...sky, hour: DAY.from })
    setRunning(true)
  }

  const rows: [string, string][] = [
    [t('learn.mon.time'), clock(r.h)],
    [t('learn.mon.light'), `${num(r.fc, 0)} FC`],
    [t('learn.read.v'), `${num(r.v)} V`],
    [t('learn.read.a'), `${num(r.a, 2)} A`],
    [t('learn.read.w'), `${num(r.w, 2)} W`],
    [t('learn.read.rpm'), fanText(r.rpm)],
    [t('learn.device.led'), onOff(r.led)],
    [t('learn.device.pump'), onOff(r.pump)],
    [t('learn.mon.soil'), `${r.soil} %`]
  ]

  return (
    <article className="mission-view" aria-labelledby="monitor-title">
      <button className="back" type="button" ref={backRef} onClick={onBack}>{t('learn.back')}</button>
      <header className="mission-head deck-tool">
        <span className="deck-chip">{t('learn.toolsChip')}</span>
        <h1 id="monitor-title" className="page-title">{t('learn.mon.title')}</h1>
        <p className="card-chip">{t('learn.mon.lede')}</p>
      </header>

      <SkyScene sky={sky} />

      <section className="card stack">
        <div className="row wrap">
          <button className="btn" type="button" aria-pressed={running} onClick={run}>{t(running ? 'learn.mon.stop' : 'learn.mon.run')}</button>
        </div>
        <dl className="monitor-grid">
          {rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd className="num">{v}</dd></div>)}
        </dl>
        <p className="sr" aria-live="polite">{spoken}</p>
        <fieldset>
          <legend>{t('learn.ctl.tilt')}</legend>
          <div className="seg">
            {TILTS.map(a => <button key={a} type="button" aria-pressed={sky.tilt === a} onClick={() => setSky({ ...sky, tilt: a })}>{a}°</button>)}
          </div>
        </fieldset>
        <label className="slider">
          <span className="slider-top"><span>{t('learn.ctl.time')}</span><b className="num">{clock(sky.hour)}</b></span>
          <input type="range" min={DAY.from} max={DAY.to} step={DAY.step} value={sky.hour} aria-valuetext={clock(sky.hour)}
            onChange={e => setSky({ ...sky, hour: Number(e.target.value) })} />
        </label>
        <button type="button" className="toggle" aria-pressed={sky.cloud} onClick={() => setSky({ ...sky, cloud: !sky.cloud })}>
          <span className="switch" aria-hidden="true"><span className="knob" /></span>
          <span className="toggle-label">{t('learn.ctl.cloud')}</span>
          <span className="toggle-state" aria-hidden="true">{t(sky.cloud ? 'controls.on' : 'controls.off')}</span>
        </button>
      </section>

      <section className="card stack">
        <h2 className="card-title">{t('learn.mon.log')}</h2>
        {!log.length ? <p className="hint flat">{t('learn.mon.logEmpty')}</p> : (
          <div className="table-wrap">
            <table className="readings">
              <thead>
                <tr>
                  <th scope="col">{t('learn.mon.time')}</th><th scope="col">FC</th><th scope="col">W</th><th scope="col">RPM</th>
                  <th scope="col">{t('learn.device.pump')}</th><th scope="col">{t('learn.mon.soilShort')}</th>
                </tr>
              </thead>
              <tbody>
                {log.map((x, i) => (
                  <tr key={i}>
                    <th scope="row" className="num">{clock(x.h)}</th><td className="num">{num(x.fc, 0)}</td><td className="num">{num(x.w, 2)}</td>
                    <td className="num">{num(x.rpm, 0)}</td><td>{onOff(x.pump)}</td><td className="num">{x.soil} %</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <p className="foot">{t('learn.estimates')}</p>
    </article>
  )
}
