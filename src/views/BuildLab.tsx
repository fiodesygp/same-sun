import { useEffect, useRef, useState } from 'react'
import { t } from '../i18n/t'
import {
  ALL, dealPuzzle, evaluate, faultsLeft, FIX, hasPower, labStatus, LEVELS, partStates, power,
  type Part, type PartState, type Puzzle, type TermId, type Wire
} from '../lab/circuit'
import { forgetStars, loadSolved, markSolved } from '../lib/progress'
import { Board, LANDSCAPE, PORTRAIT } from './buildLab/Board'
import { useWide } from '../lib/useWide'

const sameWire = (w: Wire, a: TermId, b: TermId) => (w[0] === a && w[1] === b) || (w[0] === b && w[1] === a)
const CLOUD_MS = 2500
const LADDER = [0, 1, 2] as const
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
type L = 0 | 1 | 2 | 3 | 4 | 5

/** checklist icons: shape and text carry the meaning, not colour */
const ICON: Record<PartState, React.ReactNode> = {
  working: <path d="M5 12.5 10 17l9-10" />,
  slow: <path d="M12 7v5l3 3M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z" />,
  trickle: <path d="M12 4c3 4 5 7 5 10a5 5 0 0 1-10 0c0-3 2-6 5-10z" />,
  noPower: <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9 9v6M15 9v6" />,
  backwards: <path d="M7 7h11l-3-3M17 17H6l3 3" />,
  notConnected: <path d="M6 6l12 12M18 6 6 18" />,
  chain: <path d="M9 15l6-6M8 11l-2 2a3 3 0 0 0 4 4l2-2M16 13l2-2a3 3 0 0 0-4-4l-2 2" />,
  short: <path d="M13 3 6 13h5l-1 8 7-10h-5z" />,
  joined: <path d="M8 12h8M4 8v8M20 8v8" />,
  tooMuch: <path d="M12 3 2 20h20L12 3zM12 10v4M12 17v.5" />,
  burnt: <path d="M12 3c2 3 5 5 5 9a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3-1-3 0-6 1-8z" />,
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
  const [burnt, setBurnt] = useState(false)
  const [burntAt, setBurntAt] = useState(0)
  const [tester, setTester] = useState(false)
  const [probe, setProbe] = useState<TermId | null>(null)
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null)
  // sun tests at this level that did not solve it (two of them show the hint button)
  const [failed, setFailed] = useState(0)
  const [hints, setHints] = useState(0)
  const [solved, setSolved] = useState<number[]>(loadSolved)
  const wide = useWide()

  const Lv = LEVELS[level], L = level as L
  const ev = evaluate(wires, level)
  const pw = power(ev, level, cloud, burnt)
  const status = labStatus(level, wires, selected !== null, sunOn, { cloudy: cloud > 0, burnt })
  const states = level >= 2 ? partStates(level, wires, sunOn, cloud, burnt) : null
  const left = level === FIX && puzzle ? faultsLeft(puzzle, wires, burnt) : 0
  const solvedAll = level === ALL && status.done

  // the LED burns out the moment the sun reaches it with too much power
  useEffect(() => {
    if (sunOn && ev.tooMuch && !burnt) {
      setBurnt(true)
      setBurntAt(Date.now())
    }
  }, [sunOn, ev.tooMuch, burnt])

  // count sun tests that do not solve the level: two of them show a hint
  const prevSun = useRef(false)
  useEffect(() => {
    if (sunOn && !prevSun.current && !status.done) setFailed(n => n + 1)
    prevSun.current = sunOn
  }, [sunOn, status.done])

  // remember solved levels on this device (a check mark on the level button, and the Home missions)
  useEffect(() => {
    if (status.done) setSolved(markSolved(level))
  }, [status.done, level])

  // older versions saved stars; the game no longer has them
  useEffect(() => forgetStars(), [])

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

  // the cloud only belongs to a solved level 5
  useEffect(() => {
    if (!solvedAll && cloudOn) setCloudOn(false)
  }, [solvedAll, cloudOn])

  /** start a level fresh, with the sun off */
  function start(l: number, pz: Puzzle | null = puzzle) {
    let p = pz
    if (l === FIX && !p) p = dealPuzzle()
    setPuzzle(p)
    setLevel(l)
    setWires(l === FIX && p ? p.wires : [])
    setSelected(null)
    setSunOn(false)
    setCloudOn(false)
    setBurnt(false)
    setTester(false)
    setProbe(null)
    setFailed(0)
    setHints(0)
  }

  function connect(a: TermId, b: TermId) {
    if (!wires.some(w => sameWire(w, a, b))) setWires([...wires, [a, b]])
    setSelected(null)
  }
  // tap one dot, then another: the second tap makes the wire; tapping the same dot again cancels.
  // With the Tester on, a tap tests the dot instead.
  function pick(k: TermId) {
    if (tester) return setProbe(k)
    if (!selected) setSelected(k)
    else if (selected === k) setSelected(null)
    else connect(selected, k)
  }

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
              <button key={l} type="button" aria-pressed={level === l} onClick={() => start(l)}
                aria-label={solved.includes(l) ? t('lab.levelSolved', { label: t(`lab.level.${l as L}`) }) : undefined}>
                <span className="lv-name">{t(`lab.level.${l as L}`)}</span>
                {solved.includes(l) && <svg className="lv-check" width="14" height="14" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 6.4 4.8 9 10 3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
              </button>
            ))}
          </div>
          <Board layout={wide ? LANDSCAPE : PORTRAIT} level={level} wires={wires} selected={selected} sunOn={sunOn} power={pw} cloud={cloud} burnt={burnt} burntAt={burntAt}
            tester={tester} probe={tester && probe ? { term: probe, power: hasPower(probe, wires, level, sunOn) } : null}
            onPick={pick} onConnect={connect} onCancel={() => setSelected(null)}
            onRemove={i => { setWires(wires.filter((_, j) => j !== i)); setSelected(null) }} />
          <div className="row wrap">
            <button className="btn" type="button" aria-pressed={sunOn} onClick={() => setSunOn(!sunOn)}>
              {t(sunOn ? 'lab.sunOff' : 'lab.sunOn')}
            </button>
            <button className="btn ghost" type="button" onClick={() => { setWires([]); setSelected(null) }}>{t('lab.clear')}</button>
            {level === FIX && (
              <button type="button" className="toggle compact" aria-pressed={tester} onClick={() => { setTester(!tester); setSelected(null); setProbe(null) }}>
                <span className="switch" aria-hidden="true"><span className="knob">{tester && <Check />}</span></span>
                <span className="toggle-label">{t('lab.tester')}</span>
              </button>
            )}
          </div>
        </div>

        <div className="stack">
          <div className="card">
            <div className="eyebrow">{t('lab.goal')}</div>
            <p className="lab-goal">{t(`lab.goal.${L}`)}</p>
            {level === FIX && <p className="faults" aria-live="polite">{t('lab.faultsLeft', { n: left })}</p>}
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

          {burnt && Lv.parts.includes('led') && (
            <button className="btn" type="button" onClick={() => setBurnt(false)}>{t('lab.replaceLed')}</button>
          )}

          {!status.done && failed >= 2 && (
            <div className="lab-hints">
              {hints > 0 && (
                <div className="ladder" aria-live="polite">
                  {LADDER.slice(0, hints).map(i => <p key={i}><b>{t(`results.ladder.${i}`)}:</b> {t(`lab.hint.${L}.${i}`)}</p>)}
                </div>
              )}
              <button className="btn ghost" type="button" disabled={hints >= LADDER.length} onClick={() => setHints(hints + 1)}>
                {t(hints === 0 ? 'results.hint' : hints < LADDER.length ? 'results.moreHelp' : 'results.allHelp')}
              </button>
            </div>
          )}

          {level === FIX && tester && (
            <p className="probe-readout" aria-live="polite">{probe ? t('lab.probe', { term: t(`lab.term.${probe}`), result: t(hasPower(probe, wires, level, sunOn) ? 'lab.powerHere' : 'lab.noPowerHere') }) : t('lab.testerHint')}</p>
          )}

          {level === FIX && (
            <div className="lab-tools">
              <button className="btn ghost" type="button" onClick={() => start(FIX, dealPuzzle())}>{t('lab.newPuzzle')}</button>
            </div>
          )}

          {solvedAll && (
            <button type="button" className="toggle" aria-pressed={cloudOn} onClick={() => setCloudOn(!cloudOn)}>
              <span className="switch" aria-hidden="true"><span className="knob">{cloudOn && <Check />}</span></span>
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

function Check() {
  return <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2.5 6.2 5 8.6l4.5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
}
