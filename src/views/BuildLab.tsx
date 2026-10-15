import { useEffect, useRef, useState } from 'react'
import { t } from '../i18n/t'
import {
  ALL, dealPuzzle, evaluate, faultsLeft, FIX, hasPower, labStatus, LEVELS, partStates, power, starCheck,
  type Part, type PartState, type Puzzle, type TermId, type Wire
} from '../lab/circuit'
import { countStars, loadEarned, markSolved, saveEarned, type Earned } from '../lib/progress'
import { Board, LANDSCAPE, PORTRAIT } from './buildLab/Board'

const sameWire = (w: Wire, a: TermId, b: TermId) => (w[0] === a && w[1] === b) || (w[0] === b && w[1] === a)
const CLOUD_MS = 2500
const LADDER = [0, 1, 2] as const
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
// wide screens (tablet landscape, computer) get the landscape board; same query as the CSS layouts
const WIDE = '(min-width: 1024px), (min-width: 600px) and (orientation: landscape)'
function useWide() {
  const [wide, setWide] = useState(() => window.matchMedia(WIDE).matches)
  useEffect(() => {
    const mq = window.matchMedia(WIDE), on = () => setWide(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return wide
}
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
const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(3 - n)

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
  // this try at the level: sun tests, failed ones, and whether it worked on the very first test
  const [tests, setTests] = useState({ count: 0, failed: 0, firstTry: false })
  const [hints, setHints] = useState(0)
  const [earned, setEarned] = useState<Record<number, Earned>>(loadEarned)
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

  // count each time the sun is turned on: the first test decides the third star; two misses show a hint
  const prevSun = useRef(false)
  useEffect(() => {
    if (sunOn && !prevSun.current) {
      setTests(x => ({ count: x.count + 1, failed: x.failed + (status.done ? 0 : 1), firstTry: x.firstTry || (x.count === 0 && status.done) }))
    }
    prevSun.current = sunOn
  }, [sunOn, status.done])

  // when the level is solved: add the stars it earned to the ones kept on this device
  useEffect(() => {
    if (!status.done) return
    markSolved(level)
    setEarned(saveEarned(level, starCheck(level, wires, true, tests.firstTry)))
  }, [status.done, level, wires, tests.firstTry])

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

  /** start a level fresh: the sun off, so the first-test star is fair */
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
    setTests({ count: 0, failed: 0, firstTry: false })
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
                aria-label={t('lab.levelButton', { label: t(`lab.level.${l as L}`), n: countStars(earned[l]) })}>
                <span className="lv-name">{t(`lab.level.${l as L}`)}</span>
                <span className="lv-stars" aria-hidden="true">{stars(countStars(earned[l]))}</span>
              </button>
            ))}
          </div>
          <p className="star-legend">
            {t('lab.legend.title')} <span aria-hidden="true">★</span> {t('lab.legend.solve')} · <span aria-hidden="true">★</span> {t('lab.legend.wires')} · <span aria-hidden="true">★</span> {t('lab.legend.first')}
          </p>
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
            <GoalStars earned={earned[level]} solvedNow={status.done} wires={wires.length} min={Lv.minWires} />
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

          {!status.done && tests.failed >= 2 && (
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

/** this level's three stars, each with its rule: filled when earned, outlined when not */
function GoalStars({ earned, solvedNow, wires, min }: { earned?: Earned; solvedNow: boolean; wires: number; min: number }) {
  const e = earned ?? { solved: false, fewWires: false, firstTry: false }
  const wiresText = e.fewWires ? t('lab.goalStar.wires') : solvedNow && wires > min ? t('lab.goalStar.wiresTry', { n: wires, min }) : t('lab.goalStar.wiresMin', { min })
  const items: [boolean, string][] = [[e.solved, t('lab.goalStar.solved')], [e.fewWires, wiresText], [e.firstTry, t('lab.goalStar.first')]]
  return (
    <ul className="goal-stars" aria-label={t('lab.goalStars')}>
      {items.map(([ok, text], i) => (
        <li key={i} className={ok ? 'ok' : undefined}>
          <span className="star" aria-hidden="true">{ok ? '★' : '☆'}</span>
          <span>{text}<span className="sr"> ({t(ok ? 'lab.goalStar.earned' : 'lab.goalStar.notYet')})</span></span>
        </li>
      ))}
    </ul>
  )
}
