import { useState } from 'react'
import { t } from '../i18n/t'
import { labStatus, LEVELS, type TermId, type Wire } from '../lab/circuit'
import { Board } from './buildLab/Board'

const sameWire = (w: Wire, a: TermId, b: TermId) => (w[0] === a && w[1] === b) || (w[0] === b && w[1] === a)

export function BuildLab() {
  const [level, setLevel] = useState(0)
  const [wires, setWires] = useState<Wire[]>([])
  const [selected, setSelected] = useState<TermId | null>(null)
  const [sunOn, setSunOn] = useState(false)
  const status = labStatus(level, wires, selected !== null, sunOn)

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
  }

  return (
    <>
      <div>
        <div className="eyebrow">{t('buildLab.eyebrow')}</div>
        <h1 className="page-title">{t('buildLab.title')}</h1>
        <p className="lede">{t('buildLab.lede')}</p>
      </div>
      <div className="cols">
        <div className="card lab stack">
          <div className="levels seg" role="group" aria-label={t('lab.levelLabel')}>
            {LEVELS.map((_, l) => (
              <button key={l} type="button" aria-pressed={level === l} onClick={() => chooseLevel(l)}>
                {t(`lab.level.${l as 0 | 1 | 2 | 3}`)}
              </button>
            ))}
          </div>
          <Board level={level} wires={wires} selected={selected} sunOn={sunOn}
            onPick={pick} onConnect={connect} onCancel={() => setSelected(null)} onRemove={i => { setWires(wires.filter((_, j) => j !== i)); setSelected(null) }} />
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
            <p className="lab-goal">{t(`lab.goal.${level as 0 | 1 | 2 | 3}`)}</p>
          </div>
          <div className={`status ${status.tone}`} aria-live="polite">{t(`lab.status.${status.id}`)}</div>
          {status.done && (
            <div className="real">
              <div className="eyebrow">{t('lab.real')}</div>
              <p>{t(`lab.real.${level as 0 | 1 | 2 | 3}`)}</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
