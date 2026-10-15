// The Build Lab wiring board, ported from drawLab() in the prototype. Coordinates are in a
// 360 x 270 viewBox. Terminals sit at least 54 units apart with 27-unit hit circles, so each
// is a 44 px tap target even on a 360 px phone (board about 296 px wide).
import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { t, type Key } from '../../i18n/t'
import { evaluate, levelTerms, LEVELS, nets, type TermId, type Wire } from '../../lab/circuit'

const HIT = 27
const FONT = 'Source Sans 3, sans-serif'
const INK = '#2B2F2C', RED = '#D9362B', PLUS = '#B3261E', LOOSE = '#8a8f88'

/** x, y, label, label offset below (+) or above (-) the dot */
const T: Record<TermId, [number, number, string, number]> = {
  'p+': [152, 106, '+', 24], 'p-': [236, 106, '−', 24],
  mA: [276, 146, '+', -16], mB: [330, 146, '−', -16],
  lL: [52, 228, 'lab.svg.long', 26], lS: [106, 228, 'lab.svg.short', 26],
  'w+': [50, 160, '+', -14], 'w-': [104, 160, '−', -14]
}
const isPlus = (k: TermId) => k === 'p+' || k === 'mA' || k === 'lL' || k === 'w+'

type Props = {
  level: number
  wires: Wire[]
  selected: TermId | null
  sunOn: boolean
  onPick: (k: TermId) => void
  onConnect: (a: TermId, b: TermId) => void
  onRemove: (i: number) => void
  onCancel: () => void
}

export function Board({ level, wires, selected, sunOn, onPick, onConnect, onRemove, onCancel }: Props) {
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

  const motorOn = ev?.motor ?? 0, ledOn = !!ev?.led, pump = ev?.pump ?? 0

  return (
    <svg ref={svgRef} viewBox="0 0 360 270" role="group" aria-label={t('lab.boardLabel')}
      onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => setDrag(null)}>
      <rect x={0} y={0} width={360} height={270} rx={12} fill={sunOn ? '#FFF3CF' : '#E8EEF0'} />
      <circle cx={300} cy={34} r={17} fill={sunOn ? '#F2B705' : '#c9cdc4'} />
      {txt(300, 66, t(sunOn ? 'lab.svg.sunIsOn' : 'lab.svg.sunIsOff'), { size: 11 })}
      {sunOn && [[90, 66], [150, 62], [205, 60]].map(([x, y]) => (
        <line key={x} x1={285} y1={44} x2={x} y2={y} stroke="#F2B705" strokeWidth={1.5} strokeDasharray="4 4" />
      ))}

      <rect x={0} y={236} width={360} height={34} fill="#C9A779" />
      {sunOn && <rect x={60} y={236} width={150} height={5} fill="#6b5236" opacity={0.4} />}
      <line x1={38} y1={77} x2={38} y2={236} stroke="#8A7A62" strokeWidth={5} />
      <line x1={216} y1={66} x2={216} y2={236} stroke="#8A7A62" strokeWidth={5} />
      <polygon points="34,72 226,58 226,68 34,82" fill="#1B3E66" stroke="#0C2A47" />
      <path d="M82 68.5 V78.5 M130 65 V75 M178 61.5 V71.5" stroke="#4F7FB0" strokeWidth={1.2} />
      {txt(70, 50, t('lab.svg.panel'), { bold: true })}
      <path d="M168 72 L152 98" stroke={RED} strokeWidth={3} fill="none" />
      <path d="M212 69 L236 98" stroke={INK} strokeWidth={3} fill="none" />

      <path d="M140 212 V178" stroke="#3a7a3f" strokeWidth={3} />
      {[[131, 190, -20], [149, 186, 20], [134, 200, -25], [146, 198, 25]].map(([x, y, r]) => (
        <ellipse key={`${x}${y}`} cx={x} cy={y} rx={10} ry={4.5} fill="#3E9B4F" transform={`rotate(${r} ${x} ${y})`} />
      ))}
      <polygon points="120,212 160,212 156,236 124,236" fill="#B8693E" />
      <ellipse cx={140} cy={212} rx={20} ry={3} fill="#5a3a1e" />
      {txt(140, 258, t('lab.svg.plant'), { size: 11 })}

      {parts.includes('motor') && (
        <g>
          <rect x={295} y={206} width={16} height={30} fill="#7d7a72" />
          <rect x={270} y={166} width={66} height={42} rx={8} fill="#B4B2A9" stroke="#5F5E5A" />
          <rect x={256} y={184} width={14} height={6} fill="#5F5E5A" />
          {txt(303, 258, t('lab.svg.motor'), { bold: true, size: 11 })}
          <line x1={276} y1={154} x2={276} y2={166} stroke="#888" strokeWidth={2} />
          <line x1={330} y1={154} x2={330} y2={166} stroke="#888" strokeWidth={2} />
          <g className={motorOn ? (motorOn < 0 ? 'spin rev' : 'spin') : undefined}>
            <g className="blades">
              <ellipse cx={252} cy={171} rx={4} ry={15} fill="#378ADD" />
              <ellipse cx={252} cy={203} rx={4} ry={15} fill="#378ADD" />
              <circle cx={252} cy={187} r={4} fill="#1f5f9e" />
            </g>
          </g>
          {motorOn > 0 && (
            <g>
              <line x1={240} y1={222} x2={170} y2={222} stroke={INK} strokeWidth={2} />
              <path d="M178 216 L170 222 L178 228" fill="none" stroke={INK} strokeWidth={2} />
              {txt(205, 215, t('lab.svg.airToPlant'), { size: 11 })}
            </g>
          )}
          {motorOn < 0 && (
            <g>
              <line x1={172} y1={222} x2={240} y2={222} stroke={INK} strokeWidth={2} />
              <path d="M232 216 L240 222 L232 228" fill="none" stroke={INK} strokeWidth={2} />
              {txt(205, 215, t('lab.svg.airAway'), { size: 11 })}
            </g>
          )}
        </g>
      )}

      {parts.includes('led') && (
        <g>
          {ledOn && <circle cx={80} cy={196} r={20} fill="#FFE066" opacity={0.75} />}
          <path d="M70 208 V196 A10 10 0 0 1 90 196 V208 Z" fill={ledOn ? '#FFD000' : '#E2DED0'} stroke="#7a6a3a" />
          <line x1={76} y1={208} x2={52} y2={228} stroke="#888" strokeWidth={2} />
          <line x1={84} y1={208} x2={106} y2={228} stroke="#888" strokeWidth={2} />
          {txt(80, 176, t('lab.svg.led'), { bold: true, size: 11 })}
        </g>
      )}

      {parts.includes('pump') && (
        <g>
          <rect x={52} y={182} width={50} height={54} rx={4} fill="#E9F3FA" stroke="#5c7a8f" strokeWidth={1.5} />
          <rect x={54} y={196} width={46} height={38} rx={2} fill="#3E8FD1" opacity={0.75} />
          <rect x={66} y={214} width={22} height={16} rx={4} fill={pump > 0 ? '#F2B705' : '#9aa7ad'} stroke="#4a5a62" />
          <path d="M50 168 Q 56 204 70 214 M104 168 Q 96 204 84 214" fill="none" stroke="#888" strokeWidth={2} />
          <path d="M88 218 Q 106 214 106 196 V176 Q 108 156 124 158 Q 138 160 138 200" fill="none" stroke="#5c7a8f" strokeWidth={4} strokeLinecap="round" />
          {txt(77, 258, t('lab.svg.tank'), { size: 11, bold: true })}
          {pump !== 0 && (
            <g>
              {[0, 1, 2].map(i => <circle key={i} className="drop" cx={138} cy={202 + i * 3} r={pump > 0 ? 3 : 1.6} fill="#3E8FD1" />)}
              {txt(196, 226, t(pump > 0 ? 'lab.svg.waterIn' : 'lab.svg.trickle'), { size: 11 })}
            </g>
          )}
        </g>
      )}

      {wires.map(([a, b], i) => {
        const [x1, y1] = T[a], [x2, y2] = T[b]
        const net = f(a) === pos ? '+' : f(a) === neg ? '−' : null
        const col = net === '+' ? RED : net === '−' ? INK : LOOSE
        const my = Math.max(y1, y2) + 26
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
