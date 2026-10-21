// A small Build Lab board for Learn: free wiring on one of the Build Lab levels, with the sun
// button and the status line. Mission 1 uses the fan and LED levels; the pump bonus the pump level.
import { useEffect, useRef, useState } from 'react'
import { t, type Key } from '../../i18n/t'
import { evaluate, labStatus, power, type TermId, type Wire } from '../../lab/circuit'
import { useWide } from '../../lib/useWide'
import model from '../../config/model.json'
import { Board, LANDSCAPE, PORTRAIT } from '../buildLab/Board'

const sameWire = (w: Wire, a: TermId, b: TermId) => (w[0] === a && w[1] === b) || (w[0] === b && w[1] === a)

type Props = {
  /** Build Lab levels to choose from, with a label for each */
  levels: { level: number; label: Key }[]
  groupLabel?: Key
  /** called each time a level is solved with the sun on */
  onSolved: (level: number) => void
  /** count the water the pump moves (mL), starting from this amount */
  water?: { ml: number; onMl: (ml: number) => void }
}

export function MiniLab({ levels, groupLabel, onSolved, water }: Props) {
  const [level, setLevel] = useState(levels[0].level)
  const [wires, setWires] = useState<Wire[]>([])
  const [selected, setSelected] = useState<TermId | null>(null)
  const [sunOn, setSunOn] = useState(false)
  const wide = useWide()
  const pw = power(evaluate(wires, level), level)
  const status = labStatus(level, wires, selected !== null, sunOn)

  const solvedRef = useRef(onSolved)
  solvedRef.current = onSolved
  useEffect(() => {
    if (status.done) solvedRef.current(level)
  }, [status.done, level])

  // the pump moves water while it runs: full flow, or a trickle when it is short of power
  const [ml, setMl] = useState(water?.ml ?? 0)
  const mlRef = useRef(ml)
  const onMl = useRef(water?.onMl)
  onMl.current = water?.onMl
  const flow = sunOn && water ? (pw.pump === 'full' ? 1 : pw.pump === 'trickle' ? 0.1 : 0) : 0
  useEffect(() => {
    if (!flow) return
    const id = setInterval(() => {
      mlRef.current += (model.electric.pump.mlPerMinute / 60) * flow
      setMl(mlRef.current)
      onMl.current?.(Math.round(mlRef.current))
    }, 1000)
    return () => clearInterval(id)
  }, [flow])

  function start(l: number) {
    setLevel(l)
    setWires([])
    setSelected(null)
    setSunOn(false)
  }
  function connect(a: TermId, b: TermId) {
    if (!wires.some(w => sameWire(w, a, b))) setWires([...wires, [a, b]])
    setSelected(null)
  }
  function pick(k: TermId) {
    if (!selected) setSelected(k)
    else if (selected === k) setSelected(null)
    else connect(selected, k)
  }

  return (
    <div className="card lab stack mini-lab">
      {levels.length > 1 && (
        <div className="seg" role="group" aria-label={groupLabel ? t(groupLabel) : undefined}>
          {levels.map(l => (
            <button key={l.level} type="button" aria-pressed={level === l.level} onClick={() => start(l.level)}>{t(l.label)}</button>
          ))}
        </div>
      )}
      <Board layout={wide ? LANDSCAPE : PORTRAIT} level={level} wires={wires} selected={selected} sunOn={sunOn} power={pw} cloud={0} burnt={false} burntAt={0}
        tester={false} probe={null} onPick={pick} onConnect={connect} onCancel={() => setSelected(null)}
        onRemove={i => { setWires(wires.filter((_, j) => j !== i)); setSelected(null) }} />
      <div className="row wrap">
        <button className="btn" type="button" aria-pressed={sunOn} onClick={() => setSunOn(!sunOn)}>{t(sunOn ? 'lab.sunOff' : 'lab.sunOn')}</button>
        <button className="btn ghost" type="button" onClick={() => { setWires([]); setSelected(null) }}>{t('lab.clear')}</button>
      </div>
      <div className={`status ${status.tone}`} aria-live="polite">{t(`lab.status.${status.id}`)}</div>
      {water && (
        <p className="readout" aria-live="off">
          <span>{t('learn.pump.water')}</span> <b className="num">{t('learn.ml', { n: Math.round(ml) })}</b>
        </p>
      )}
    </div>
  )
}
