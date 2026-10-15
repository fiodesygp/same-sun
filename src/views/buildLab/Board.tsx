// The Build Lab wiring board. All six levels share one picture in a 360 x 340 viewBox: the big
// panel on posts above the plant, the small panel at the top left (levels 3-6), the resistor
// (levels 3-6), the LED beside the pot, the fan on the right post blowing toward the plant, and the
// water tank at the bottom left with a tube to the pot. Terminals shown together sit at least 54
// units apart with 27-unit hit circles: 44 px tap targets on a 360 px phone (board about 296 px wide).
import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { t, type Key } from '../../i18n/t'
import { evaluate, levelTerms, LEVELS, nets, type Power, type TermId, type Wire } from '../../lab/circuit'

const HIT = 27
const FONT = 'Source Sans 3, sans-serif'
const INK = '#2B2F2C', RED = '#D9362B', PLUS = '#B3261E', LOOSE = '#8a8f88'
const GROUND = 306

/** x, y, label, label offset below (+) or above (-) the dot */
const T: Record<TermId, [number, number, string, number]> = {
  'p+': [190, 90, '+', 22], 'p-': [244, 90, '−', 22],
  'q+': [34, 120, '+', 22], 'q-': [88, 120, '−', 22],
  mA: [279, 136, '+', -14], mB: [333, 136, '−', -14],
  lL: [130, 292, 'lab.svg.long', 24], lS: [184, 292, 'lab.svg.short', 24],
  'w+': [30, 236, '+', -14], 'w-': [84, 236, '−', -14],
  rA: [150, 146, '', 0], rB: [150, 214, '', 0]
}
const isPlus = (k: TermId) => k === 'p+' || k === 'q+' || k === 'mA' || k === 'lL' || k === 'w+'

type Props = {
  level: number
  wires: Wire[]
  selected: TermId | null
  sunOn: boolean
  /** what each part gets from its panel right now */
  power: Power
  /** 0 = clear sky, 1 = full cloud */
  cloud: number
  /** the LED has burnt out; burntAt changes each time it burns, to replay the flash */
  burnt: boolean
  burntAt: number
  /** tester on: tapping a dot tests it instead of starting a wire */
  tester: boolean
  probe: { term: TermId; power: boolean } | null
  onPick: (k: TermId) => void
  onConnect: (a: TermId, b: TermId) => void
  onRemove: (i: number) => void
  onCancel: () => void
}

export function Board(props: Props) {
  const { level, wires, selected, sunOn, power: pw, cloud, burnt, burntAt, tester, probe, onPick, onConnect, onRemove, onCancel } = props
  const svgRef = useRef<SVGSVGElement>(null)
  const [drag, setDrag] = useState<{ from: TermId; x: number; y: number; moved: boolean } | null>(null)
  const justDragged = useRef(false)
  const L = LEVELS[level], terms = levelTerms(level)
  const ev = sunOn ? evaluate(wires, level) : null
  const f = nets(wires)
  const posNets = new Set(L.panels.map(p => f(p === 'big' ? 'p+' : 'q+'))), negNets = new Set(L.panels.map(p => f(p === 'big' ? 'p-' : 'q-')))
  const two = L.panels.length === 2

  const txt = (x: number, y: number, s: string, o: { size?: number; bold?: boolean; fill?: string } = {}) => (
    <text x={x} y={y} textAnchor="middle" fontSize={o.size ?? 12} fontWeight={o.bold ? 700 : undefined} fontFamily={FONT} fill={o.fill ?? INK}>{s}</text>
  )

  // --- drag a wire from one terminal to another (tap-then-tap also works; off while testing) ---
  function toSvg(e: PointerEvent) {
    const m = svgRef.current?.getScreenCTM()
    if (!m) return { x: 0, y: 0 }
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse())
    return { x: p.x, y: p.y }
  }
  const termAt = (x: number, y: number) => terms.find(k => Math.hypot(T[k][0] - x, T[k][1] - y) <= HIT) ?? null
  function onDown(k: TermId, e: PointerEvent) {
    if (tester) return
    setDrag({ from: k, ...toSvg(e), moved: false })
  }
  function onMove(e: PointerEvent) {
    if (!drag) return
    const p = toSvg(e), [x0, y0] = T[drag.from]
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

  // a part runs only when it is wired and its panel has enough power left for it
  const motorDir = ev && pw.motor > 0 && !ev.chain.includes('motor') ? ev.conn.motor.dir : 0
  const ledOn = !!ev && ev.conn.led.dir === 1 && pw.led && !burnt && !ev.chain.includes('led')
  const pumpDir = ev && pw.pump !== 'off' && !ev.chain.includes('pump') ? ev.conn.pump.dir : 0
  const pumpFull = pumpDir > 0 && pw.pump === 'full'
  const sunFill = sunOn ? (cloud > 0.5 ? '#c9b25a' : '#F2B705') : '#c9cdc4'

  return (
    <svg ref={svgRef} viewBox="0 0 360 340" role="group" aria-label={t('lab.boardLabel')}
      onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => setDrag(null)}>
      <rect x={0} y={0} width={360} height={340} rx={12} fill={sunOn ? '#FFF3CF' : '#E8EEF0'} />
      <circle cx={336} cy={22} r={13} fill={sunFill} />
      {cloud > 0 && (
        <g opacity={Math.min(1, cloud * 1.2)} transform={`translate(${60 * (1 - cloud)} 0)`} aria-hidden="true">
          <path d="M312 36 a12 12 0 0 1 7-21 a15 15 0 0 1 28-3 a11 11 0 0 1 9 20 z" fill="#9aa4a8" stroke="#6f7a7e" strokeWidth={1.5} />
        </g>
      )}
      {txt(296, 18, t(sunOn ? 'lab.svg.sunIsOn' : 'lab.svg.sunIsOff'), { size: 11 })}
      {sunOn && [[170, 49], [230, 45], [290, 41], ...(two ? [[60, 76]] : [])].map(([x, y]) => (
        <line key={x} x1={324} y1={28} x2={x} y2={y} stroke="#F2B705" strokeWidth={1.5} strokeDasharray="4 4" opacity={1 - 0.75 * cloud} />
      ))}

      <rect x={0} y={GROUND} width={360} height={34} fill="#C9A779" />
      {sunOn && <rect x={120} y={GROUND} width={180} height={5} fill="#6b5236" opacity={0.4} />}

      {/* big panel on two posts, above the plant */}
      <line x1={112} y1={61} x2={112} y2={GROUND} stroke="#8A7A62" strokeWidth={5} />
      <line x1={300} y1={48} x2={300} y2={GROUND} stroke="#8A7A62" strokeWidth={5} />
      <polygon points="106,52 312,38 312,48 106,62" fill="#1B3E66" stroke="#0C2A47" />
      <path d="M154 48.7 V58.7 M206 45.2 V55.2 M258 41.7 V51.7" stroke="#4F7FB0" strokeWidth={1.2} />
      {txt(150, 34, t(two ? 'lab.svg.bigPanel' : 'lab.svg.panel'), { bold: true })}
      <path d="M196 56 L190 82" stroke={RED} strokeWidth={3} fill="none" />
      <path d="M240 53 L244 82" stroke={INK} strokeWidth={3} fill="none" />

      {two && (
        <g>
          <line x1={14} y1={88} x2={14} y2={GROUND} stroke="#8A7A62" strokeWidth={4} />
          <polygon points="8,80 96,72 96,81 8,89" fill="#1B3E66" stroke="#0C2A47" />
          <path d="M52 76 V85" stroke="#4F7FB0" strokeWidth={1.2} />
          {txt(52, 62, t('lab.svg.smallPanel'), { bold: true, size: 11 })}
          <path d="M30 87 L34 112" stroke={RED} strokeWidth={3} fill="none" />
          <path d="M84 82 L88 112" stroke={INK} strokeWidth={3} fill="none" />
        </g>
      )}

      {/* plant in its pot, under the big panel */}
      <path d="M222 282 V248" stroke="#3a7a3f" strokeWidth={3} />
      {[[213, 260, -20], [231, 256, 20], [216, 270, -25], [228, 268, 25]].map(([x, y, r]) => (
        <ellipse key={`${x}${y}`} cx={x} cy={y} rx={10} ry={4.5} fill="#3E9B4F" transform={`rotate(${r} ${x} ${y})`} />
      ))}
      <polygon points="202,282 242,282 238,306 206,306" fill="#B8693E" />
      <ellipse cx={222} cy={282} rx={20} ry={3} fill="#5a3a1e" />
      {txt(222, 331, t('lab.svg.plant'), { size: 11 })}

      {L.resistor && (
        <g>
          <path d="M150 154 V160 M150 200 V206" stroke="#888" strokeWidth={2} />
          <rect x={144} y={160} width={12} height={40} rx={4} fill="#d8c39a" stroke="#7a6a3a" />
          <rect x={144} y={168} width={12} height={3} fill="#7a4a1e" />
          <rect x={144} y={176} width={12} height={3} fill="#2B2F2C" />
          <rect x={144} y={184} width={12} height={3} fill="#B3261E" />
          {txt(188, 184, t('lab.svg.resistor'), { size: 11 })}
        </g>
      )}

      {L.parts.includes('led') && (
        <g>
          {ledOn && <circle cx={157} cy={258} r={20} fill="#FFE066" opacity={0.75} />}
          {burnt && <circle key={burntAt} className="flash" cx={157} cy={258} r={24} fill="#fff7c2" opacity={0} />}
          <path d="M147 270 V258 A10 10 0 0 1 167 258 V270 Z" fill={burnt ? '#5b5650' : ledOn ? '#FFD000' : '#E2DED0'} stroke="#7a6a3a" />
          {burnt && (
            <g aria-hidden="true">
              <ellipse cx={157} cy={260} rx={6} ry={4} fill="#1d1a17" opacity={0.75} />
              <path d="M152 246 q3 -5 0 -9 M160 246 q3 -5 0 -9" fill="none" stroke="#6f6a64" strokeWidth={1.5} strokeLinecap="round" />
            </g>
          )}
          <line x1={153} y1={270} x2={130} y2={292} stroke="#888" strokeWidth={2} />
          <line x1={161} y1={270} x2={184} y2={292} stroke="#888" strokeWidth={2} />
          {txt(126, 262, t('lab.svg.led'), { bold: true, size: 11 })}
        </g>
      )}

      {L.parts.includes('pump') && (
        <g>
          <rect x={16} y={266} width={56} height={40} rx={4} fill="#E9F3FA" stroke="#5c7a8f" strokeWidth={1.5} />
          <rect x={18} y={276} width={52} height={28} rx={2} fill="#3E8FD1" opacity={0.75} />
          <rect x={34} y={286} width={22} height={14} rx={4} fill={pumpFull ? '#F2B705' : '#9aa7ad'} stroke="#4a5a62" />
          <path d="M30 244 Q 30 270 38 286 M84 244 Q 82 270 52 286" fill="none" stroke="#888" strokeWidth={2} />
          {/* tube: up out of the tank, down to the ground, along it and into the pot */}
          <path d="M45 286 V276 Q45 262 60 262 Q 92 262 94 280 V298 Q 94 302 102 302 H196 Q 204 302 206 294 L 212 286" fill="none" stroke="#5c7a8f" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
          {txt(44, 331, t('lab.svg.tank'), { size: 11, bold: true })}
          {pumpDir !== 0 && (
            <g>
              {[0, 1, 2].map(i => <circle key={i} className="drop" cx={212} cy={290 + i * 3} r={pumpFull ? 3 : 1.6} fill="#3E8FD1" />)}
              {txt(268, 296, t(pumpFull ? 'lab.svg.waterIn' : 'lab.svg.trickle'), { size: 11 })}
            </g>
          )}
        </g>
      )}

      {L.parts.includes('motor') && (
        <g>
          <rect x={274} y={156} width={66} height={36} rx={8} fill="#B4B2A9" stroke="#5F5E5A" />
          <rect x={260} y={171} width={14} height={6} fill="#5F5E5A" />
          {txt(306, 331, t('lab.svg.motor'), { bold: true, size: 11 })}
          <line x1={279} y1={144} x2={279} y2={156} stroke="#888" strokeWidth={2} />
          <line x1={333} y1={144} x2={333} y2={156} stroke="#888" strokeWidth={2} />
          {/* the fan spins slower when there is less power for it */}
          <g className={motorDir ? (motorDir < 0 ? 'spin rev' : 'spin') : undefined}
            style={motorDir ? ({ '--spin': `${0.5 / Math.max(0.2, pw.motor)}s` } as React.CSSProperties) : undefined}>
            <g className="blades">
              <ellipse cx={256} cy={160} rx={4} ry={14} fill="#378ADD" />
              <ellipse cx={256} cy={188} rx={4} ry={14} fill="#378ADD" />
              <circle cx={256} cy={174} r={4} fill="#1f5f9e" />
            </g>
          </g>
          {motorDir > 0 && (
            <g>
              <line x1={246} y1={192} x2={234} y2={236} stroke={INK} strokeWidth={2} />
              <path d="M230 228 L234 236 L240 229" fill="none" stroke={INK} strokeWidth={2} />
              {txt(268, 252, t('lab.svg.airToPlant'), { size: 11 })}
            </g>
          )}
          {motorDir < 0 && (
            <g>
              <line x1={234} y1={236} x2={246} y2={192} stroke={INK} strokeWidth={2} />
              <path d="M240 199 L246 192 L250 200" fill="none" stroke={INK} strokeWidth={2} />
              {txt(268, 252, t('lab.svg.airAway'), { size: 11 })}
            </g>
          )}
        </g>
      )}

      {wires.map(([a, b], i) => {
        const [x1, y1] = T[a], [x2, y2] = T[b]
        const net = posNets.has(f(a)) ? '+' : negNets.has(f(a)) ? '−' : null
        const col = net === '+' ? RED : net === '−' ? INK : LOOSE
        const my = Math.min(330, Math.max(y1, y2) + 26)
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
          <g key={k} className={selected === k ? 'term sel' : tester ? 'term probe' : 'term'} tabIndex={0} role="button"
            aria-label={t(`lab.term.${k}`)} aria-pressed={tester ? undefined : selected === k}
            onPointerDown={e => onDown(k, e)} onClick={() => onTermClick(k)} onKeyDown={onKey(() => onPick(k))}>
            <circle className="hit" cx={x} cy={y} r={HIT} />
            <circle className="ring" cx={x} cy={y} r={8} fill="#C9A04A" stroke="#6b5520" strokeWidth={2} />
            {text && <text x={x} y={y + dy} textAnchor="middle" fontSize={12} fontWeight={700} fontFamily={FONT} fill={isPlus(k) ? PLUS : INK}>{text}</text>}
          </g>
        )
      })}

      {/* tester reading, next to the dot that was tested */}
      {tester && probe && (() => {
        const [x, y] = T[probe.term], label = t(probe.power ? 'lab.powerHere' : 'lab.noPowerHere')
        const w = label.length * 6.4 + 16, cx = Math.min(356 - w / 2, Math.max(4 + w / 2, x)), cy = y < 60 ? y + 34 : y - 34
        return (
          <g pointerEvents="none" aria-hidden="true">
            <rect x={cx - w / 2} y={cy - 12} width={w} height={22} rx={11} fill={probe.power ? '#1A7547' : '#2B2F2C'} />
            <text x={cx} y={cy + 4} textAnchor="middle" fontSize={12} fontWeight={700} fontFamily={FONT} fill="#fff">{label}</text>
          </g>
        )
      })()}
    </svg>
  )
}
