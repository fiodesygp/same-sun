import { useEffect, useRef, useState } from 'react'
import { t } from '../i18n/t'
import { ALL, labStatus, LEVELS, panelWatts, partStates, shareLoads, type Part, type PartState, type TermId, type Wire } from '../lab/circuit'
import { markSolved } from '../lib/progress'
import { Board } from './buildLab/Board'

const sameWire = (w: Wire, a: TermId, b: TermId) => (w[0] === a && w[1] === b) || (w[0] === b && w[1] === a)
const CLOUD_MS = 2500
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** checklist icons: shape and text carry the meaning, not colour */
const ICON: Record<PartState, React.ReactNode> = {
  working: <path d="M5 12.5 10 17l9-10" />,
  slow: <path d="M12 7v5l3 3M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z" />,
  noPower: <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9 9v6M15 9v6" />,
  backwards: <path d="M7 7h11l-3-3M17 17H6l3 3" />,
  notConnected: <path d="M6 6l12 12M18 6 6 18" />,
  chain: <path d="M9 15l6-6M8 11l-2 2a3 3 0 0 0 4 4l2-2M16 13l2-2a3 3 0 0 0-4-4l-2 2" />,
  short: <path d="M13 3 6 13h5l-1 8 7-10h-5z" />,
  waiting: <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5" />
}

export function BuildLab() {
  const [level, setLevel] = useState(0)
  const [wires, setWires] = useState<Wire[]>([])
  const [selected, setSelected] = useState<TermId | null>(null)
  const [sunOn, setSunOn] = useState(false)
  const [cloudOn, setCloudOn] = useState(false)
  const [cloud, setCloud] = useState(0) // 0 = clear, 1 = full cloud; animates toward cloudOn
  const cloudRef = useRef(0)

  const loads = shareLoads(panelWatts(cloud))
  const status = labStatus(level, wires, selected !== null, sunOn, cloud > 0)
  const solved = level === ALL && status.done
  const states = level === ALL ? partStates(level, wires, sunOn, loads) : null

  // the cloud drifts in or out over a couple of seconds, so you can watch the pump, then the fan, stop
  useEffect(() => {
    const target = cloudOn ? 1 : 0
    if (reducedMotion()) {
      cloudRef.current = target
      setCloud(target)
      return
    }
    const from = cloudRef.current, t0 = performance.now()
    let id = 0
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / (CLOUD_MS * Math.abs(target - from) || 1))
      cloudRef.current = from + (target - from) * k
      setCloud(cloudRef.current)
      if (k < 1) id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [cloudOn])

  // remember solved levels on this device for the Home missions
  useEffect(() => {
    if (status.done) markSolved(level)
  }, [status.done, level])

  // the cloud only belongs to a solved level 5
  useEffect(() => {
    if (!solved && cloudOn) setCloudOn(false)
  }, [solved, cloudOn])

  function connect(a: TermId, b: TermId) {
    if (!wires.some(w => sameWire(w, a, b))) setWires([...wires, [a, b]])
    setSelected(null)
  }
  // tap one dot, then another: the second tap makes the wire; tapping the same dot again cancels
  function pick(k: TermId) {
    if (!selected) setSelected(k)
    else if (selected === k) setSelected(null)
    else connect(selected, k)
  }
  function chooseLevel(l: number) {
    setLevel(l)
    setWires([])
    setSelected(null)
    setCloudOn(false)
  }

  const L = level as 0 | 1 | 2 | 3 | 4

  return (
    <>
      <div>
        <div className="eyebrow">{t('buildLab.eyebrow')}</div>
        <h1 className="page-title">{t('buildLab.title')}</h1>
        <p className="lede">{t('buildLab.lede')}</p>
      </div>
      <div className="cols lab-cols">
        <div className="card lab stack">
          <div className="levels seg" role="group" aria-label={t('lab.levelLabel')}>
            {LEVELS.map((_, l) => (
              <button key={l} type="button" aria-pressed={level === l} onClick={() => chooseLevel(l)}>
                {t(`lab.level.${l as 0 | 1 | 2 | 3 | 4}`)}
              </button>
            ))}
          </div>
          <Board level={level} wires={wires} selected={selected} sunOn={sunOn} loads={loads} cloud={cloud}
            onPick={pick} onConnect={connect} onCancel={() => setSelected(null)}
            onRemove={i => { setWires(wires.filter((_, j) => j !== i)); setSelected(null) }} />
          <div className="row wrap">
            <button className="btn" type="button" aria-pressed={sunOn} onClick={() => setSunOn(!sunOn)}>
              {t(sunOn ? 'lab.sunOff' : 'lab.sunOn')}
            </button>
            <button className="btn ghost" type="button" onClick={() => { setWires([]); setSelected(null) }}>{t('lab.clear')}</button>
          </div>
        </div>
        <div className="stack">
          <div className="card">
            <div className="eyebrow">{t('lab.goal')}</div>
            <p className="lab-goal">{t(`lab.goal.${L}`)}</p>
            {states && (
              <>
                <h2 className="checklist-title">{t('lab.checklist')}</h2>
                <ul className="checklist" aria-live="polite">
                  {(Object.keys(states) as Part[]).map(p => (
                    <li key={p} className={`part ${states[p]}`}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICON[states[p]]}</svg>
                      <span>{t(`lab.part.${p}.${states[p]}`)}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
          <div className={`status ${status.tone}`} aria-live="polite">{t(`lab.status.${status.id}`)}</div>
          {solved && (
            <button type="button" className="toggle" aria-pressed={cloudOn} onClick={() => setCloudOn(!cloudOn)}>
              <span className="switch" aria-hidden="true">
                <span className="knob">
                  {cloudOn && <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2.5 6.2 5 8.6l4.5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                </span>
              </span>
              <span className="toggle-label">{t('lab.cloud')}</span>
              <span className="toggle-state" aria-hidden="true">{t(cloudOn ? 'controls.on' : 'controls.off')}</span>
            </button>
          )}
          {status.done && (
            <div className="real">
              <div className="eyebrow">{t('lab.real')}</div>
              <p>{t(`lab.real.${L}`)}</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
