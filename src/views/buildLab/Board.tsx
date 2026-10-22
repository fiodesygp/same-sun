// The Build Lab wiring board. Two layouts share the same parts, terminals, wires and logic:
// - portrait (360 x 340) for phones and tablets held upright,
// - landscape (640 x 320) for wide screens, parts spread left to right: small panel, big panel
//   above the plant, resistor, LED, fan, water tank.
// Each part is drawn from one anchor point, and its terminals are fixed offsets from that anchor.
// Terminals shown together sit at least 54 units apart with 27-unit hit circles, so each is a
// 44 px tap target at every size the board is shown.
import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { t, type Key } from '../../i18n/t'
import { Blades, Led, Motor, PanelFace, Pump } from '../../components/parts/art'
import { boardModel } from '../../lab/board'
import { LEVELS, type Power, type TermId, type Wire } from '../../lab/circuit'

const HIT = 27
const FONT = 'Source Sans 3, sans-serif'
const INK = '#2B2F2C', RED = '#D9362B', PLUS = '#B3261E', LOOSE = '#8a8f88'
type Pt = [number, number]

export interface Layout {
  w: number
  h: number
  ground: number
  sun: Pt
  sunLabel: Pt
  /** anchors: big panel and small panel (top-left corner of the panel), plant (pot rim centre),
   *  resistor (top end), LED (top of the bulb), fan (top-left of the motor box), tank (top-left) */
  big: Pt
  small: Pt
  plant: Pt
  res: Pt
  led: Pt
  fan: Pt
  tank: Pt
  /** air arrow from the fan blades, as an offset from the blades' centre */
  air: { from: Pt; to: Pt; text: Pt }
  ledLabel: Pt
  /** resistor label, as an offset from its top end */
  resLabel: Pt
  waterText: Pt
  plantLabel: Pt
  tankLabel: Pt
  motorLabel: Pt
}

export const PORTRAIT: Layout = {
  w: 360, h: 340, ground: 306, sun: [336, 22], sunLabel: [296, 18],
  big: [106, 52], small: [8, 80], plant: [222, 282], res: [150, 146], led: [157, 258], fan: [274, 156], tank: [16, 266],
  air: { from: [-10, 18], to: [-22, 62], text: [12, 78] }, ledLabel: [-31, 4], resLabel: [38, 38], waterText: [268, 296],
  plantLabel: [222, 331], tankLabel: [44, 331], motorLabel: [306, 331]
}

export const LANDSCAPE: Layout = {
  w: 640, h: 320, ground: 286, sun: [612, 24], sunLabel: [552, 20],
  big: [150, 60], small: [16, 96], plant: [250, 262], res: [400, 96], led: [470, 200], fan: [500, 110], tank: [545, 246],
  air: { from: [-6, 20], to: [-14, 48], text: [-44, 62] }, ledLabel: [31, 4], resLabel: [44, 60], waterText: [296, 276],
  plantLabel: [250, 311], tankLabel: [575, 314], motorLabel: [488, 302]
}

const add = (p: Pt, dx: number, dy: number): Pt => [p[0] + dx, p[1] + dy]

/** terminal positions for a layout */
export function terminals(L: Layout): Record<TermId, Pt> {
  return {
    'p+': add(L.big, 84, 38), 'p-': add(L.big, 138, 38),
    'q+': add(L.small, 26, 40), 'q-': add(L.small, 80, 40),
    mA: add(L.fan, 5, -20), mB: add(L.fan, 59, -20),
    lL: add(L.led, -27, 34), lS: add(L.led, 27, 34),
    'w+': add(L.tank, 14, -30), 'w-': add(L.tank, 68, -30),
    rA: L.res, rB: add(L.res, 0, 68)
  }
}

/** label text and offset: below (+) or above (-) each dot */
const LABEL: Record<TermId, [string, number]> = {
  'p+': ['+', 22], 'p-': ['−', 22], 'q+': ['+', 22], 'q-': ['−', 22], mA: ['+', -14], mB: ['−', -14],
  lL: ['lab.svg.long', 24], lS: ['lab.svg.short', 24], 'w+': ['+', -14], 'w-': ['−', -14], rA: ['', 0], rB: ['', 0]
}
const isPlus = (k: TermId) => k === 'p+' || k === 'q+' || k === 'mA' || k === 'lL' || k === 'w+'

/** tube from the pump up out of the tank, down to the ground, along it and into the pot */
function tubePath(tank: Pt, pot: Pt, ground: number) {
  const dir = pot[0] > tank[0] ? 1 : -1
  const px = tank[0] + 29, top = tank[1]
  const wall = dir > 0 ? tank[0] + 78 : tank[0] - 22
  const gy = ground - 4
  return `M${px} ${top + 20} V${top + 10} Q${px} ${top - 4} ${px + dir * 15} ${top - 4} Q${wall} ${top - 4} ${wall} ${top + 14} ` +
    `V${gy - 4} Q${wall} ${gy} ${wall + dir * 8} ${gy} H${pot[0] - dir * 26} Q${pot[0] - dir * 18} ${gy} ${pot[0] - dir * 16} ${gy - 8} L${pot[0] - dir * 10} ${pot[1] + 4}`
}

/** what both the 2D board and the 3D bench need: the circuit, its state, and what a tap does */
export type BoardProps = {
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

export function Board(props: BoardProps & { layout: Layout }) {
  const { layout: Y, level, wires, selected, sunOn, power: pw, cloud, burnt, burntAt, tester, probe, onPick, onConnect, onRemove, onCancel } = props
  const T = terminals(Y)
  const svgRef = useRef<SVGSVGElement>(null)
  const [drag, setDrag] = useState<{ from: TermId; x: number; y: number; moved: boolean } | null>(null)
  const justDragged = useRef(false)
  const Lv = LEVELS[level], m = boardModel(level, wires, sunOn, pw, burnt), terms = m.terms
  const two = Lv.panels.length === 2
  const G = Y.ground, [bx, by] = Y.big, [sx, sy] = Y.small, [px, py] = Y.plant, [rx, ry] = Y.res, [lx, ly] = Y.led, [fx, fy] = Y.fan, [tx, ty] = Y.tank
  const blades: Pt = [fx - 18, fy + 18]

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

  const { motorDir, ledOn, pumpDir, pumpFull } = m
  const sunFill = sunOn ? (cloud > 0.5 ? '#c9b25a' : '#F2B705') : '#c9cdc4'
  const [sunX, sunY] = Y.sun
  const pumpDropX = px + (tx > px ? 10 : -10)
  const airFrom = add(blades, ...Y.air.from), airTo = add(blades, ...Y.air.to), airText = add(blades, ...Y.air.text)
  // arrow head at the end of a line from a to b
  const head = (a: Pt, b: Pt) => {
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), l = 8
    const p = (d: number): Pt => [b[0] - l * Math.cos(ang + d), b[1] - l * Math.sin(ang + d)]
    return `M${p(0.5).join(' ')} L${b.join(' ')} L${p(-0.5).join(' ')}`
  }

  return (
    <svg ref={svgRef} viewBox={`0 0 ${Y.w} ${Y.h}`} role="group" aria-label={t('lab.boardLabel')}
      onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => setDrag(null)}>
      <rect x={0} y={0} width={Y.w} height={Y.h} rx={12} fill={sunOn ? '#FFF3CF' : '#E8EEF0'} />
      <circle cx={sunX} cy={sunY} r={13} fill={sunFill} />
      {cloud > 0 && (
        <g opacity={Math.min(1, cloud * 1.2)} transform={`translate(${sunX - 336 + 60 * (1 - cloud)} ${sunY - 22})`} aria-hidden="true">
          <path d="M312 36 a12 12 0 0 1 7-21 a15 15 0 0 1 28-3 a11 11 0 0 1 9 20 z" fill="#9aa4a8" stroke="#6f7a7e" strokeWidth={1.5} />
        </g>
      )}
      {txt(Y.sunLabel[0], Y.sunLabel[1], t(sunOn ? 'lab.svg.sunIsOn' : 'lab.svg.sunIsOff'), { size: 11 })}
      {sunOn && [add(Y.big, 64, -3), add(Y.big, 124, -7), add(Y.big, 184, -11), ...(two ? [add(Y.small, 52, -4)] : [])].map(([x, y]) => (
        <line key={x} x1={sunX - 12} y1={sunY + 6} x2={x} y2={y} stroke="#F2B705" strokeWidth={1.5} strokeDasharray="4 4" opacity={1 - 0.75 * cloud} />
      ))}

      <rect x={0} y={G} width={Y.w} height={Y.h - G} fill="#C9A779" />
      {sunOn && <rect x={bx + 14} y={G} width={180} height={5} fill="#6b5236" opacity={0.4} />}

      {/* big panel on two posts, above the plant */}
      <line x1={bx + 6} y1={by + 9} x2={bx + 6} y2={G} stroke="#8A7A62" strokeWidth={5} />
      <line x1={bx + 194} y1={by - 4} x2={bx + 194} y2={G} stroke="#8A7A62" strokeWidth={5} />
      <PanelFace x={bx} y={by} w={206} h={10} skew={14} cols={6} rows={1} />
      {txt(bx + 44, by - 18, t(two ? 'lab.svg.bigPanel' : 'lab.svg.panel'), { bold: true })}
      <path d={`M${bx + 90} ${by + 4} L${T['p+'][0]} ${T['p+'][1] - 8}`} stroke={RED} strokeWidth={3} fill="none" />
      <path d={`M${bx + 134} ${by + 1} L${T['p-'][0]} ${T['p-'][1] - 8}`} stroke={INK} strokeWidth={3} fill="none" />

      {two && (
        <g>
          <line x1={sx + 6} y1={sy + 8} x2={sx + 6} y2={G} stroke="#8A7A62" strokeWidth={4} />
          <PanelFace x={sx} y={sy} w={88} h={9} skew={8} cols={3} rows={1} />
          {txt(sx + 44, sy - 18, t('lab.svg.smallPanel'), { bold: true, size: 11 })}
          <path d={`M${sx + 22} ${sy + 7} L${T['q+'][0]} ${T['q+'][1] - 8}`} stroke={RED} strokeWidth={3} fill="none" />
          <path d={`M${sx + 76} ${sy + 2} L${T['q-'][0]} ${T['q-'][1] - 8}`} stroke={INK} strokeWidth={3} fill="none" />
        </g>
      )}

      {/* plant in its pot, under the big panel */}
      <path d={`M${px} ${py} V${py - 34}`} stroke="#3a7a3f" strokeWidth={3} />
      {[[-9, -22, -20], [9, -26, 20], [-6, -12, -25], [6, -14, 25]].map(([dx, dy, r]) => (
        <ellipse key={`${dx}${dy}`} cx={px + dx} cy={py + dy} rx={10} ry={4.5} fill="#3E9B4F" transform={`rotate(${r} ${px + dx} ${py + dy})`} />
      ))}
      <polygon points={`${px - 20},${py} ${px + 20},${py} ${px + 16},${py + 24} ${px - 16},${py + 24}`} fill="#B8693E" />
      <ellipse cx={px} cy={py} rx={20} ry={3} fill="#5a3a1e" />
      {txt(Y.plantLabel[0], Y.plantLabel[1], t('lab.svg.plant'), { size: 11 })}

      {Lv.resistor && (
        <g>
          <path d={`M${rx} ${ry + 8} V${ry + 14} M${rx} ${ry + 54} V${ry + 60}`} stroke="#888" strokeWidth={2} />
          <rect x={rx - 6} y={ry + 14} width={12} height={40} rx={4} fill="#d8c39a" stroke="#7a6a3a" />
          <rect x={rx - 6} y={ry + 22} width={12} height={3} fill="#7a4a1e" />
          <rect x={rx - 6} y={ry + 30} width={12} height={3} fill="#2B2F2C" />
          <rect x={rx - 6} y={ry + 38} width={12} height={3} fill="#B3261E" />
          {txt(rx + Y.resLabel[0], ry + Y.resLabel[1], t('lab.svg.resistor'), { size: 11 })}
        </g>
      )}

      {Lv.parts.includes('led') && (
        <g>
          <line x1={lx - 4} y1={ly + 16} x2={T.lL[0]} y2={T.lL[1]} stroke="#9AA3A8" strokeWidth={2} />
          <line x1={lx + 4} y1={ly + 16} x2={T.lS[0]} y2={T.lS[1]} stroke="#9AA3A8" strokeWidth={2} />
          {burnt && <circle key={burntAt} className="flash" cx={lx} cy={ly} r={24} fill="#fff7c2" opacity={0} />}
          <Led x={lx} y={ly} on={ledOn} burnt={burnt} />
          {txt(lx + Y.ledLabel[0], ly + Y.ledLabel[1], t('lab.svg.led'), { bold: true, size: 11 })}
        </g>
      )}

      {Lv.parts.includes('pump') && (
        <g>
          <rect x={tx} y={ty} width={56} height={40} rx={4} fill="#E9F3FA" stroke="#5c7a8f" strokeWidth={1.5} />
          <rect x={tx + 2} y={ty + 10} width={52} height={28} rx={2} fill="#3E8FD1" opacity={0.75} />
          <Pump x={tx + 29} y={ty + 16} s={0.45} running={pumpFull} />
          <path d={`M${T['w+'][0]} ${T['w+'][1] + 8} Q ${T['w+'][0]} ${ty + 4} ${tx + 22} ${ty + 20} M${T['w-'][0]} ${T['w-'][1] + 8} Q ${T['w-'][0] - 2} ${ty + 4} ${tx + 36} ${ty + 20}`} fill="none" stroke="#888" strokeWidth={2} />
          <path d={tubePath(Y.tank, Y.plant, G)} fill="none" stroke="#5c7a8f" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
          {txt(Y.tankLabel[0], Y.tankLabel[1], t('lab.svg.tank'), { size: 11, bold: true })}
          {pumpDir !== 0 && (
            <g>
              {[0, 1, 2].map(i => <circle key={i} className="drop" cx={pumpDropX} cy={py + 8 + i * 3} r={pumpFull ? 3 : 1.6} fill="#3E8FD1" />)}
              {txt(Y.waterText[0], Y.waterText[1], t(pumpFull ? 'lab.svg.waterIn' : 'lab.svg.trickle'), { size: 11 })}
            </g>
          )}
        </g>
      )}

      {Lv.parts.includes('motor') && (
        <g>
          <rect x={fx + 26} y={fy + 36} width={14} height={G - fy - 36} fill="#7d7a72" />
          <rect x={fx + 14} y={G - 4} width={38} height={4} rx={2} fill="#7d7a72" />
          <Motor x={fx} y={fy} />
          {txt(Y.motorLabel[0], Y.motorLabel[1], t('lab.svg.motor'), { bold: true, size: 11 })}
          <line x1={T.mA[0]} y1={T.mA[1] + 8} x2={T.mA[0]} y2={fy - 7} stroke="#888" strokeWidth={2} />
          <line x1={T.mB[0]} y1={T.mB[1] + 8} x2={T.mB[0]} y2={fy - 7} stroke="#888" strokeWidth={2} />
          {/* the fan spins slower when there is less power for it */}
          <g className={motorDir ? (motorDir < 0 ? 'spin rev' : 'spin') : undefined}
            style={motorDir ? ({ '--spin': `${0.5 / Math.max(0.2, pw.motor)}s` } as React.CSSProperties) : undefined}>
            <Blades x={blades[0]} y={blades[1]} />
          </g>
          {motorDir !== 0 && (
            <g>
              <line x1={airFrom[0]} y1={airFrom[1]} x2={airTo[0]} y2={airTo[1]} stroke={INK} strokeWidth={2} />
              <path d={motorDir > 0 ? head(airFrom, airTo) : head(airTo, airFrom)} fill="none" stroke={INK} strokeWidth={2} />
              {txt(airText[0], airText[1], t(motorDir > 0 ? 'lab.svg.airToPlant' : 'lab.svg.airAway'), { size: 11 })}
            </g>
          )}
        </g>
      )}

      {wires.map(([a, b], i) => {
        const [x1, y1] = T[a], [x2, y2] = T[b]
        const net = m.wireNet[i]
        const col = net === '+' ? RED : net === '−' ? INK : LOOSE
        const my = Math.min(Y.h - 10, Math.max(y1, y2) + 26)
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
        const [x, y] = T[k], [label, dy] = LABEL[k]
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
        const w = label.length * 6.4 + 16, cx = Math.min(Y.w - 4 - w / 2, Math.max(4 + w / 2, x)), cy = y < 60 ? y + 34 : y - 34
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
