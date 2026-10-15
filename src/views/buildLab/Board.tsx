// The Build Lab wiring board, ported from drawLab() in the prototype and laid out so all five
// levels share one picture: panel on posts above the plant, the LED beside the pot, the fan on a
// stand blowing toward the plant, and the water tank with its pump and a tube into the pot.
// Coordinates are in a 360 x 300 viewBox. Terminals sit at least 54 units apart with 27-unit hit
// circles, so each is a 44 px tap target even on a 360 px phone (board about 296 px wide).
import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { t, type Key } from '../../i18n/t'
import { evaluate, levelTerms, LEVELS, nets, type Loads, type TermId, type Wire } from '../../lab/circuit'

const HIT = 27
const FONT = 'Source Sans 3, sans-serif'
const INK = '#2B2F2C', RED = '#D9362B', PLUS = '#B3261E', LOOSE = '#8a8f88'
const GROUND = 266

/** x, y, label, label offset below (+) or above (-) the dot */
const T: Record<TermId, [number, number, string, number]> = {
  'p+': [140, 100, '+', 22], 'p-': [194, 100, '−', 22],
  mA: [246, 122, '+', -14], mB: [300, 122, '−', -14],
  lL: [52, 258, 'lab.svg.long', 24], lS: [106, 258, 'lab.svg.short', 24],
  'w+': [279, 196, '+', 24], 'w-': [333, 196, '−', 24]
}
const isPlus = (k: TermId) => k === 'p+' || k === 'mA' || k === 'lL' || k === 'w+'

type Props = {
  level: number
  wires: Wire[]
  selected: TermId | null
  sunOn: boolean
  /** what the panel can power right now (less under a cloud) */
  loads: Loads
  /** 0 = clear sky, 1 = full cloud */
  cloud: number
  onPick: (k: TermId) => void
  onConnect: (a: TermId, b: TermId) => void
  onRemove: (i: number) => void
  onCancel: () => void
}

export function Board({ level, wires, selected, sunOn, loads, cloud, onPick, onConnect, onRemove, onCancel }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [drag, setDrag] = useState<{ from: TermId; x: number; y: number; moved: boolean } | null>(null)
  const justDragged = useRef(false)
  const parts = LEVELS[level], terms = levelTerms(level)
  const ev = sunOn ? evaluate(wires, parts) : null
  const f = nets(wires), pos = f('p+'), neg = f('p-')

  const txt = (x: number, y: number, s: string, o: { size?: number; bold?: boolean; fill?: string } = {}) => (
    <text x={x} y={y} textAnchor="middle" fontSize={o.size ?? 12} fontWeight={o.bold ? 700 : undefined} fontFamily={FONT} fill={o.fill ?? INK}>{s}</text>
  )

  // --- drag a wire from one terminal to another (tap-then-tap also works) ---
  function toSvg(e: PointerEvent) {
    const m = svgRef.current?.getScreenCTM()
    if (!m) return { x: 0, y: 0 }
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse())
    return { x: p.x, y: p.y }
  }
  function termAt(x: number, y: number) {
    return terms.find(k => Math.hypot(T[k][0] - x, T[k][1] - y) <= HIT) ?? null
  }
  function onDown(k: TermId, e: PointerEvent) {
    const p = toSvg(e)
    setDrag({ from: k, ...p, moved: false })
  }
  function onMove(e: PointerEvent) {
    if (!drag) return
    const p = toSvg(e)
    const [x0, y0] = T[drag.from]
    setDrag({ ...drag, ...p, moved: drag.moved || Math.hypot(p.x - x0, p.y - y0) > 8 })
  }
  function onUp(e: PointerEvent) {
    if (!drag) return
    if (drag.moved) {
      const p = toSvg(e), to = termAt(p.x, p.y)
      if (to && to !== drag.from) onConnect(drag.from, to)
      justDragged.current = true // swallow the click that may follow a drag
    }
    setDrag(null)
  }
  function onTermClick(k: TermId) {
    if (justDragged.current) {
      justDragged.current = false
      return
    }
    onPick(k)
  }
  // Enter or Space acts like a tap; Escape drops a half-made wire
  const onKey = (fn: () => void) => (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      fn()
    } else if (e.key === 'Escape') onCancel()
  }

  // a part runs only when it is wired and the panel has enough power left for it
  const motorDir = ev && loads.fan > 0 ? ev.motor : 0
  const ledOn = !!ev?.led && loads.led
  const pump = ev && loads.pump ? ev.pump : 0
  const sunFill = sunOn ? (cloud > 0.5 ? '#c9b25a' : '#F2B705') : '#c9cdc4'

  return (
    <svg ref={svgRef} viewBox="0 0 360 300" role="group" aria-label={t('lab.boardLabel')}
      onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => setDrag(null)}>
      <rect x={0} y={0} width={360} height={300} rx={12} fill={sunOn ? '#FFF3CF' : '#E8EEF0'} />
      <circle cx={306} cy={30} r={16} fill={sunFill} />
      {cloud > 0 && (
        <g opacity={Math.min(1, cloud * 1.2)} transform={`translate(${70 * (1 - cloud)} 0)`} aria-hidden="true">
          <path d="M276 44 a14 14 0 0 1 8-25 a18 18 0 0 1 33-4 a13 13 0 0 1 22 9 a11 11 0 0 1-3 20 z" fill="#9aa4a8" stroke="#6f7a7e" strokeWidth={1.5} />
        </g>
      )}
      {txt(306, 62, t(sunOn ? 'lab.svg.sunIsOn' : 'lab.svg.sunIsOff'), { size: 11 })}
      {sunOn && [[90, 66], [150, 60], [205, 55]].map(([x, y]) => (
        <line key={x} x1={292} y1={38} x2={x} y2={y} stroke="#F2B705" strokeWidth={1.5} strokeDasharray="4 4" opacity={1 - 0.75 * cloud} />
      ))}

      <rect x={0} y={GROUND} width={360} height={34} fill="#C9A779" />
      {sunOn && <rect x={60} y={GROUND} width={150} height={5} fill="#6b5236" opacity={0.4} />}
      <line x1={34} y1={70} x2={34} y2={GROUND} stroke="#8A7A62" strokeWidth={5} />
      <line x1={214} y1={56} x2={214} y2={GROUND} stroke="#8A7A62" strokeWidth={5} />
      <polygon points="30,64 222,50 222,60 30,74" fill="#1B3E66" stroke="#0C2A47" />
      <path d="M78 60.5 V70.5 M126 57 V67 M174 53.5 V63.5" stroke="#4F7FB0" strokeWidth={1.2} />
      {txt(70, 44, t('lab.svg.panel'), { bold: true })}
      <path d="M152 62 L140 92" stroke={RED} strokeWidth={3} fill="none" />
      <path d="M202 58 L194 92" stroke={INK} strokeWidth={3} fill="none" />

      {/* plant in its pot, under the panel */}
      <path d="M140 242 V208" stroke="#3a7a3f" strokeWidth={3} />
      {[[131, 220, -20], [149, 216, 20], [134, 230, -25], [146, 228, 25]].map(([x, y, r]) => (
        <ellipse key={`${x}${y}`} cx={x} cy={y} rx={10} ry={4.5} fill="#3E9B4F" transform={`rotate(${r} ${x} ${y})`} />
      ))}
      <polygon points="120,242 160,242 156,266 124,266" fill="#B8693E" />
      <ellipse cx={140} cy={242} rx={20} ry={3} fill="#5a3a1e" />
      {txt(140, 294, t('lab.svg.plant'), { size: 11 })}

      {parts.includes('led') && (
        <g>
          {ledOn && <circle cx={82} cy={226} r={20} fill="#FFE066" opacity={0.75} />}
          <path d="M72 238 V226 A10 10 0 0 1 92 226 V238 Z" fill={ledOn ? '#FFD000' : '#E2DED0'} stroke="#7a6a3a" />
          <line x1={78} y1={238} x2={52} y2={258} stroke="#888" strokeWidth={2} />
          <line x1={86} y1={238} x2={106} y2={258} stroke="#888" strokeWidth={2} />
          {txt(82, 206, t('lab.svg.led'), { bold: true, size: 11 })}
        </g>
      )}

      {parts.includes('pump') && (
        <g>
          <rect x={276} y={226} width={60} height={40} rx={4} fill="#E9F3FA" stroke="#5c7a8f" strokeWidth={1.5} />
          <rect x={278} y={236} width={56} height={28} rx={2} fill="#3E8FD1" opacity={0.75} />
          <rect x={298} y={246} width={22} height={14} rx={4} fill={pump > 0 ? '#F2B705' : '#9aa7ad'} stroke="#4a5a62" />
          <path d="M279 204 Q 282 236 300 246 M333 204 Q 330 236 318 246" fill="none" stroke="#888" strokeWidth={2} />
          {/* tube: up out of the tank, down to the ground, along it and into the pot */}
          <path d="M309 246 V232 Q309 218 295 218 Q 272 218 270 238 V256 Q 270 262 262 262 H170 Q 160 262 158 252 L 152 243" fill="none" stroke="#5c7a8f" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
          {txt(306, 297, t('lab.svg.tank'), { size: 11, bold: true })}
          {pump !== 0 && (
            <g>
              {[0, 1, 2].map(i => <circle key={i} className="drop" cx={150} cy={246 + i * 3} r={pump > 0 ? 3 : 1.6} fill="#3E8FD1" />)}
              {txt(204, 254, t(pump > 0 ? 'lab.svg.waterIn' : 'lab.svg.trickle'), { size: 11 })}
            </g>
          )}
        </g>
      )}

      {parts.includes('motor') && (
        <g>
          <rect x={251} y={172} width={14} height={GROUND - 172} fill="#7d7a72" />
          <rect x={234} y={GROUND - 4} width={38} height={4} rx={2} fill="#7d7a72" />
          <rect x={240} y={134} width={64} height={38} rx={8} fill="#B4B2A9" stroke="#5F5E5A" />
          <rect x={226} y={150} width={14} height={6} fill="#5F5E5A" />
          {txt(252, 279, t('lab.svg.motor'), { bold: true, size: 11 })}
          <line x1={246} y1={130} x2={246} y2={134} stroke="#888" strokeWidth={2} />
          <line x1={300} y1={130} x2={300} y2={134} stroke="#888" strokeWidth={2} />
          {/* the fan spins slower when there is less power for it */}
          <g className={motorDir ? (motorDir < 0 ? 'spin rev' : 'spin') : undefined}
            style={motorDir ? ({ '--spin': `${0.5 / Math.max(0.2, loads.fan)}s` } as React.CSSProperties) : undefined}>
            <g className="blades">
              <ellipse cx={222} cy={139} rx={4} ry={14} fill="#378ADD" />
              <ellipse cx={222} cy={167} rx={4} ry={14} fill="#378ADD" />
              <circle cx={222} cy={153} r={4} fill="#1f5f9e" />
            </g>
          </g>
          {motorDir > 0 && (
            <g>
              <line x1={212} y1={170} x2={168} y2={204} stroke={INK} strokeWidth={2} />
              <path d="M177 204 L168 204 L170 195" fill="none" stroke={INK} strokeWidth={2} />
              {txt(200, 238, t('lab.svg.airToPlant'), { size: 11 })}
            </g>
          )}
          {motorDir < 0 && (
            <g>
              <line x1={168} y1={204} x2={212} y2={170} stroke={INK} strokeWidth={2} />
              <path d="M203 170 L212 170 L210 179" fill="none" stroke={INK} strokeWidth={2} />
              {txt(200, 238, t('lab.svg.airAway'), { size: 11 })}
            </g>
          )}
        </g>
      )}

      {wires.map(([a, b], i) => {
        const [x1, y1] = T[a], [x2, y2] = T[b]
        const net = f(a) === pos ? '+' : f(a) === neg ? '−' : null
        const col = net === '+' ? RED : net === '−' ? INK : LOOSE
        const my = Math.min(290, Math.max(y1, y2) + 26)
        const d = `M${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`
        const mx = (x1 + x2) / 2, mY = (y1 + 6 * my + y2) / 8 // midpoint of the curve
        const remove = () => onRemove(i)
        return (
          <g key={`${a}-${b}`}>
            <path d={d} fill="none" stroke={col} strokeWidth={4} strokeLinecap="round" />
            {net && (
              <g>
                <circle cx={mx} cy={mY} r={7} fill="#fff" stroke={col} strokeWidth={2} />
                <text x={mx} y={mY + 4} textAnchor="middle" fontSize={11} fontWeight={700} fontFamily={FONT} fill={net === '+' ? PLUS : INK}>{net}</text>
              </g>
            )}
            <path className="wire" d={d} fill="none" stroke="transparent" strokeWidth={54} tabIndex={0} role="button"
              aria-label={t('lab.removeWire', { a: t(`lab.term.${a}`), b: t(`lab.term.${b}`) })}
              onClick={remove} onKeyDown={onKey(remove)} />
          </g>
        )
      })}

      {drag?.moved && (
        <line x1={T[drag.from][0]} y1={T[drag.from][1]} x2={drag.x} y2={drag.y} stroke={INK} strokeWidth={3} strokeDasharray="6 5" pointerEvents="none" />
      )}

      {terms.map(k => {
        const [x, y, label, dy] = T[k]
        const text = label.startsWith('lab.') ? t(label as Key) : label
        return (
          <g key={k} className={selected === k ? 'term sel' : 'term'} tabIndex={0} role="button"
            aria-label={t(`lab.term.${k}`)} aria-pressed={selected === k}
            onPointerDown={e => onDown(k, e)} onClick={() => onTermClick(k)} onKeyDown={onKey(() => onPick(k))}>
            <circle className="hit" cx={x} cy={y} r={HIT} />
            <circle className="ring" cx={x} cy={y} r={8} fill="#C9A04A" stroke="#6b5520" strokeWidth={2} />
            <text x={x} y={y + dy} textAnchor="middle" fontSize={12} fontWeight={700} fontFamily={FONT} fill={isPlus(k) ? PLUS : INK}>{text}</text>
          </g>
        )
      })}
    </svg>
  )
}
