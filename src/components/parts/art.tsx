// Detailed drawings of the kit's parts, shared by the part cards, the Power board and the bench,
// so a part looks the same everywhere. Each glyph is drawn around its own anchor point, so the board
// keeps its terminals exactly where they were. The colours are the real parts' colours; the card
// view puts them on a light "workbench" plate so they keep their contrast in dark mode too.
import { t, type Key } from '../../i18n/t'

export const ART_FONT = 'Source Sans 3, system-ui, sans-serif'
export const INK = '#2B2F2C', RED = '#C62828', BLACK = '#1E2326', COPPER = '#B87333', SILVER = '#B9C0C5', METAL = '#9AA3A8'

// ---------- glyphs ----------

/**
 * A solar panel face: aluminium frame, dark blue cells and thin silver busbars. skew raises the
 * right edge (the board shows the panel tilted); cols and rows set the cell grid.
 */
export function PanelFace({ x, y, w, h, skew = 0, cols, rows }: { x: number; y: number; w: number; h: number; skew?: number; cols: number; rows: number }) {
  const P = (u: number, v: number) => `${x + u * w} ${y - u * skew + v * h}`
  const lines: string[] = []
  for (let c = 1; c < cols; c++) lines.push(`M${P(c / cols, 0)}L${P(c / cols, 1)}`)
  for (let r = 1; r < rows; r++) lines.push(`M${P(0, r / rows)}L${P(1, r / rows)}`)
  const bars: string[] = []
  for (let c = 0; c < cols; c++) for (const k of [1 / 3, 2 / 3]) bars.push(`M${P((c + k) / cols, 0.04)}L${P((c + k) / cols, 0.96)}`)
  return (
    <g>
      <path d={`M${P(0, 0)}L${P(1, 0)}L${P(1, 1)}L${P(0, 1)}Z`} fill="#1B3E66" stroke={METAL} strokeWidth={Math.max(1.5, h / 30)} strokeLinejoin="round" />
      <path d={bars.join('')} stroke="#C9D3DA" strokeWidth={Math.max(0.5, h / 120)} opacity={0.8} />
      <path d={lines.join('')} stroke="#0C2A47" strokeWidth={Math.max(0.8, h / 80)} />
    </g>
  )
}

/** An LED: a round dome with a rim that is cut flat on the − side (right). Anchor: the dome's centre. */
export function Led({ x, y, s = 1, on = false, burnt = false }: { x: number; y: number; s?: number; on?: boolean; burnt?: boolean }) {
  const lens = burnt ? '#5b5650' : on ? '#FFD000' : '#F3EFE2'
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {on && <circle r={20} fill="#FFE066" opacity={0.75} />}
      <path d="M-10 12V0A10 10 0 0 1 10 0V12Z" fill={lens} stroke="#7a6a3a" strokeWidth={1.2 / Math.sqrt(s)} />
      <path d="M-6 -4A6 6 0 0 1 -1 -8" fill="none" stroke="#fff" strokeWidth={1.4} strokeLinecap="round" opacity={burnt ? 0 : 0.8} />
      {/* rim: rounded on the + side, flat on the − side */}
      <path d="M-12 12H10V16H-12A2 2 0 0 1 -12 12Z" fill={on ? '#F5C400' : '#E2DED0'} stroke="#7a6a3a" strokeWidth={1 / Math.sqrt(s)} />
      {burnt && (
        <g>
          <ellipse cx={0} cy={2} rx={6} ry={4} fill="#1d1a17" opacity={0.75} />
          <path d="M-5 -12q3 -5 0 -9M3 -12q3 -5 0 -9" fill="none" stroke="#6f6a64" strokeWidth={1.5} strokeLinecap="round" />
        </g>
      )}
    </g>
  )
}

/**
 * The fan motor seen from the side: can-shaped body with a rear end cap, two copper terminal tabs on
 * top, and the shaft out of the front (left). Anchor: the body's top-left corner (as on the board).
 */
export function Motor({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x={-14} y={15} width={14} height={6} rx={1.5} fill="#6F6E68" />
      <rect x={-4} y={10} width={6} height={16} rx={2} fill="#8F8D86" />
      <rect x={0} y={0} width={54} height={36} rx={8} fill="#C3C1B8" stroke="#5F5E5A" strokeWidth={1.2} />
      <path d="M14 3v30M40 3v30" stroke="#9E9C93" strokeWidth={1.2} />
      <rect x={52} y={3} width={12} height={30} rx={4} fill="#8F8D86" stroke="#5F5E5A" strokeWidth={1.2} />
      <path d="M56 10h4M56 15h4M56 20h4M56 25h4" stroke="#5F5E5A" strokeWidth={1.2} />
      <rect x={2} y={-7} width={6} height={8} rx={1} fill={COPPER} stroke="#7A4A1E" strokeWidth={0.8} />
      <rect x={56} y={-7} width={6} height={8} rx={1} fill={COPPER} stroke="#7A4A1E" strokeWidth={0.8} />
    </g>
  )
}

/** Fan blades (front view of the two-blade propeller). Spins when its parent has the "spin" class. */
export function Blades({ x, y, s = 1, reverse = false }: { x: number; y: number; s?: number; reverse?: boolean }) {
  return (
    <g className="blades" style={reverse ? { animationDirection: 'reverse' } : undefined}>
      <path d={`M${x} ${y - 2 * s}C${x - 6 * s} ${y - 10 * s} ${x - 5 * s} ${y - 27 * s} ${x} ${y - 28 * s}C${x + 5 * s} ${y - 27 * s} ${x + 5 * s} ${y - 10 * s} ${x} ${y - 2 * s}Z`} fill="#378ADD" stroke="#1f5f9e" strokeWidth={0.8} />
      <path d={`M${x} ${y + 2 * s}C${x + 6 * s} ${y + 10 * s} ${x + 5 * s} ${y + 27 * s} ${x} ${y + 28 * s}C${x - 5 * s} ${y + 27 * s} ${x - 5 * s} ${y + 10 * s} ${x} ${y + 2 * s}Z`} fill="#378ADD" stroke="#1f5f9e" strokeWidth={0.8} />
      <circle cx={x} cy={y} r={4.5 * s} fill="#1f5f9e" />
    </g>
  )
}

/**
 * The mini water pump: a dark body with the water inlet (slots) at the bottom and the outlet nozzle
 * on top, where the tube goes. Anchor: the top of the outlet nozzle. running colours the stripe.
 */
export function Pump({ x, y, s = 1, running = false }: { x: number; y: number; s?: number; running?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x={-4} y={0} width={8} height={11} rx={1.5} fill="#8A969E" stroke="#4a5a62" strokeWidth={1} />
      <rect x={-15} y={10} width={30} height={36} rx={7} fill="#3D474E" stroke="#22292E" strokeWidth={1.2} />
      <rect x={-15} y={19} width={30} height={5} fill={running ? '#F2B705' : '#6B7780'} />
      <path d="M-9 36v6M-4 36v6M1 36v6M6 36v6" stroke="#9AA7AD" strokeWidth={1.6} strokeLinecap="round" />
    </g>
  )
}

/** A toggle switch on a base: the lever leans to "on" (left) or "off" (right). Anchor: the lever's pivot. */
export function Switch({ x, y, s = 1, on }: { x: number; y: number; s?: number; on: boolean }) {
  const tip = on ? [-14, -26] : [14, -26]
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x={-30} y={0} width={60} height={26} rx={6} fill="#3D474E" stroke="#22292E" strokeWidth={1.2} />
      <rect x={-12} y={-4} width={24} height={8} rx={4} fill="#8A969E" />
      <path d={`M0 0L${tip[0]} ${tip[1]}`} stroke="#C9D0D4" strokeWidth={7} strokeLinecap="round" />
      <path d="M-14 26v12M14 26v12" stroke={COPPER} strokeWidth={4} strokeLinecap="round" />
    </g>
  )
}

/** A potentiometer: metal body, ridged knob with a pointer, and three pins (the middle one is the wiper). Anchor: the knob's centre. */
export function Pot({ x, y, s = 1, value = 0.7 }: { x: number; y: number; s?: number; value?: number }) {
  const a = ((-135 + 270 * value) * Math.PI) / 180
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-20 26v22M0 26v22M20 26v22" stroke={COPPER} strokeWidth={4} strokeLinecap="round" />
      <circle r={30} fill={METAL} stroke="#5F6A70" strokeWidth={1.4} />
      <circle r={17} fill="#30363B" />
      {Array.from({ length: 16 }, (_, i) => {
        const b = (i * Math.PI) / 8
        return <path key={i} d={`M${15 * Math.cos(b)} ${15 * Math.sin(b)}L${17 * Math.cos(b)} ${17 * Math.sin(b)}`} stroke="#5C656B" strokeWidth={1.5} />
      })}
      <path d={`M0 0L${12 * Math.sin(a)} ${-12 * Math.cos(a)}`} stroke="#F4F6F8" strokeWidth={3} strokeLinecap="round" />
    </g>
  )
}

/** An alligator clip on a wire end, jaws pointing left. Anchor: the jaws' tip. */
export function Clip({ x, y, s = 1, color }: { x: number; y: number; s?: number; color: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 -1L22 -7L26 -3L22 0Z" fill={SILVER} stroke="#6F777C" strokeWidth={0.8} />
      <path d="M0 1L22 7L26 3L22 0Z" fill={SILVER} stroke="#6F777C" strokeWidth={0.8} />
      <path d="M4 -2l2 1.5l2 -2l2 1.5l2 -2l2 1.5" fill="none" stroke="#6F777C" strokeWidth={0.8} />
      <rect x={22} y={-8} width={22} height={16} rx={5} fill={color} />
    </g>
  )
}

// ---------- card illustrations ----------

/** wrap a label into short lines so it fits beside the drawing */
export function wrap(s: string, max = 13) {
  const out: string[] = []
  for (const w of s.split(' ')) {
    const last = out[out.length - 1]
    if (last !== undefined && (last + ' ' + w).length <= max) out[out.length - 1] = last + ' ' + w
    else out.push(w)
  }
  // keep short words ("o", "y", "V") with the words after them, not at the end of a line
  for (let i = 0; i < out.length - 1; i++) {
    let words = out[i].split(' ')
    while (words.length > 1 && /^\p{L}{1,2}$/u.test(words[words.length - 1])) {
      out[i + 1] = words.pop() + ' ' + out[i + 1]
      out[i] = words.join(' ')
      words = out[i].split(' ')
    }
  }
  return out
}

/** a label with a leader line to the thing it names; side says where the text sits */
export function Callout({ to, at, side, k }: { to: [number, number]; at: [number, number]; side: 'left' | 'right'; k: Key }) {
  const lines = wrap(t(k)), tx = side === 'left' ? at[0] - 5 : at[0] + 5
  return (
    <g>
      <path d={`M${to[0]} ${to[1]}L${at[0]} ${at[1]}`} stroke={INK} strokeWidth={1.3} />
      <circle cx={to[0]} cy={to[1]} r={2.6} fill={INK} />
      <text x={tx} y={at[1] + 5 - (lines.length - 1) * 8} textAnchor={side === 'left' ? 'end' : 'start'} fontSize={14.5} fontWeight={700} fontFamily={ART_FONT} fill={INK}>
        {lines.map((l, i) => <tspan key={i} x={tx} dy={i ? 16 : 0}>{l}</tspan>)}
      </text>
    </g>
  )
}

export type ArtId = 'panel' | 'led' | 'fan' | 'pump' | 'switch' | 'pot' | 'wires' | 'lightMeter' | 'multimeter' | 'tachometer'

export const L = 112, R = 248 // where left and right labels end and start

const ART: Record<ArtId, () => React.ReactNode> = {
  panel: () => (
    <>
      <PanelFace x={124} y={18} w={112} h={92} cols={4} rows={3} />
      <rect x={168} y={110} width={24} height={12} rx={2} fill="#30363B" />
      <path d="M174 122C174 150 150 160 148 192" fill="none" stroke={RED} strokeWidth={4} strokeLinecap="round" />
      <path d="M186 122C186 150 210 160 212 192" fill="none" stroke={BLACK} strokeWidth={4} strokeLinecap="round" />
      <Clip x={146} y={198} s={0.7} color={RED} />
      <Clip x={214} y={198} s={0.7} color={BLACK} />
      <Callout to={[138, 34]} at={[L, 26]} side="left" k="learn.art.panel.cells" />
      <Callout to={[160, 84]} at={[L, 82]} side="left" k="learn.art.panel.busbars" />
      <Callout to={[236, 40]} at={[R, 40]} side="right" k="learn.art.panel.frame" />
      <Callout to={[157, 168]} at={[L, 158]} side="left" k="learn.art.panel.plus" />
      <Callout to={[204, 168]} at={[R, 158]} side="right" k="learn.art.panel.minus" />
    </>
  ),
  led: () => (
    <>
      <path d="M170 113V208" stroke={SILVER} strokeWidth={3.2} strokeLinecap="round" />
      <path d="M190 113V176" stroke={SILVER} strokeWidth={3.2} strokeLinecap="round" />
      <Led x={180} y={66} s={2.6} on />
      <Callout to={[180, 52]} at={[L, 40]} side="left" k="learn.art.led.bulb" />
      <Callout to={[206, 109]} at={[R, 104]} side="right" k="learn.art.led.flat" />
      <Callout to={[170, 196]} at={[L, 192]} side="left" k="learn.art.led.long" />
      <Callout to={[190, 168]} at={[R, 160]} side="right" k="learn.art.led.short" />
    </>
  ),
  fan: () => (
    <>
      <Motor x={152} y={70} s={1.4} />
      <g><Blades x={128} y={95} s={1.5} /></g>
      <Callout to={[196, 112]} at={[R, 140]} side="right" k="learn.art.fan.body" />
      <Callout to={[140, 95]} at={[L, 170]} side="left" k="learn.art.fan.shaft" />
      <Callout to={[128, 60]} at={[L, 34]} side="left" k="learn.art.fan.blades" />
      <path d="M159 58V46H237V58" fill="none" stroke={INK} strokeWidth={1.3} />
      <Callout to={[237, 46]} at={[R, 30]} side="right" k="learn.art.fan.terminals" />
    </>
  ),
  pump: () => (
    <>
      <path d="M180 58C180 22 210 14 236 22" fill="none" stroke="#7FA6BC" strokeWidth={9} strokeLinecap="round" />
      <path d="M196 92C222 92 232 120 240 150" fill="none" stroke={RED} strokeWidth={3.4} strokeLinecap="round" />
      <path d="M196 102C216 104 222 132 226 160" fill="none" stroke={BLACK} strokeWidth={3.4} strokeLinecap="round" />
      <Pump x={180} y={58} s={2} running />
      <path d="M172 204l0 -14m-4 5 4 -6 4 6M188 204l0 -14m-4 5 4 -6 4 6" fill="none" stroke="#2A7AB8" strokeWidth={2} strokeLinecap="round" />
      <Callout to={[180, 146]} at={[L, 168]} side="left" k="learn.art.pump.inlet" />
      <Callout to={[180, 64]} at={[L, 52]} side="left" k="learn.art.pump.outlet" />
      <Callout to={[226, 20]} at={[R, 28]} side="right" k="learn.art.pump.tube" />
      <Callout to={[233, 140]} at={[R, 120]} side="right" k="learn.art.pump.wires" />
    </>
  ),
  switch: () => (
    <>
      <g opacity={0.35}><path d="M180 108L200 72" stroke="#7a8288" strokeWidth={10} strokeLinecap="round" strokeDasharray="4 5" /></g>
      <Switch x={180} y={108} s={1.4} on />
      <Callout to={[160, 74]} at={[L, 48]} side="left" k="learn.art.switch.on" />
      <Callout to={[200, 74]} at={[R, 48]} side="right" k="learn.art.switch.off" />
      <Callout to={[170, 96]} at={[L, 100]} side="left" k="learn.art.switch.lever" />
      <Callout to={[200, 156]} at={[R, 160]} side="right" k="learn.art.switch.pins" />
    </>
  ),
  pot: () => (
    <>
      <Pot x={180} y={88} s={1.5} />
      <path d="M144 170h40" stroke="#0B6B47" strokeWidth={3} strokeLinecap="round" />
      <Callout to={[180, 78]} at={[L, 40]} side="left" k="learn.art.pot.knob" />
      <Callout to={[150, 150]} at={[L, 150]} side="left" k="learn.art.pot.pins" />
      <Callout to={[180, 170]} at={[R, 176]} side="right" k="learn.art.pot.used" />
    </>
  ),
  wires: () => (
    <>
      <path d="M158 70C190 50 210 90 236 70" fill="none" stroke={RED} strokeWidth={5} strokeLinecap="round" />
      <path d="M236 70h12" stroke={COPPER} strokeWidth={3} strokeLinecap="round" />
      <Clip x={128} y={70} s={1.1} color={RED} />
      <path d="M158 150C190 130 210 170 236 150" fill="none" stroke={BLACK} strokeWidth={5} strokeLinecap="round" />
      <path d="M236 150h12" stroke={COPPER} strokeWidth={3} strokeLinecap="round" />
      <Clip x={128} y={150} s={1.1} color={BLACK} />
      <Callout to={[136, 72]} at={[L, 104]} side="left" k="learn.art.wires.clip" />
      <Callout to={[246, 70]} at={[R + 12, 100]} side="right" k="learn.art.wires.bare" />
      <Callout to={[196, 66]} at={[R, 30]} side="right" k="learn.art.wires.red" />
      <Callout to={[196, 146]} at={[R, 190]} side="right" k="learn.art.wires.black" />
    </>
  ),
  lightMeter: () => (
    <>
      <rect x={146} y={46} width={68} height={150} rx={14} fill="#E9A23B" stroke="#8A5A1A" strokeWidth={1.4} />
      <path d="M162 46A18 18 0 0 1 198 46Z" fill="#F7F7F2" stroke="#8A8F88" strokeWidth={1.4} />
      <rect x={156} y={78} width={48} height={34} rx={4} fill="#CFE3C8" stroke="#5E6F58" />
      <text x={180} y={96} textAnchor="middle" fontSize={13} fontWeight={700} fontFamily="ui-monospace, Menlo, monospace" fill={INK}>9658</text>
      <text x={180} y={108} textAnchor="middle" fontSize={9} fontWeight={700} fontFamily={ART_FONT} fill={INK}>FC</text>
      <circle cx={170} cy={140} r={7} fill="#30363B" /><circle cx={190} cy={140} r={7} fill="#30363B" />
      <Callout to={[180, 36]} at={[L, 30]} side="left" k="learn.art.lightMeter.sensor" />
      <Callout to={[204, 96]} at={[R, 96]} side="right" k="learn.art.lightMeter.display" />
    </>
  ),
  multimeter: () => (
    <>
      <path d="M196 168C208 188 236 186 246 206" fill="none" stroke={RED} strokeWidth={3} strokeLinecap="round" />
      <path d="M164 168C152 188 124 186 114 206" fill="none" stroke={BLACK} strokeWidth={3} strokeLinecap="round" />
      <path d="M246 206l8 10" stroke={SILVER} strokeWidth={3} strokeLinecap="round" />
      <path d="M114 206l-8 10" stroke={SILVER} strokeWidth={3} strokeLinecap="round" />
      <rect x={138} y={18} width={84} height={152} rx={10} fill="#F2B705" stroke="#8A6A00" strokeWidth={1.4} />
      <rect x={146} y={26} width={68} height={136} rx={6} fill="#2E3338" />
      <rect x={152} y={32} width={56} height={26} rx={3} fill="#CFE3C8" />
      <text x={180} y={50} textAnchor="middle" fontSize={14} fontWeight={700} fontFamily="ui-monospace, Menlo, monospace" fill={INK}>5.00 V</text>
      <circle cx={180} cy={104} r={24} fill="#4A5157" stroke="#151A1D" strokeWidth={1.4} />
      <path d="M180 104L163 87" stroke="#F4F6F8" strokeWidth={4} strokeLinecap="round" />
      <text x={156} y={80} textAnchor="middle" fontSize={11} fontWeight={800} fontFamily={ART_FONT} fill="#F4F6F8">V</text>
      <text x={206} y={80} textAnchor="middle" fontSize={11} fontWeight={800} fontFamily={ART_FONT} fill="#F4F6F8">A</text>
      <text x={180} y={142} textAnchor="middle" fontSize={9} fontWeight={800} fontFamily={ART_FONT} fill="#F4F6F8">OFF</text>
      <circle cx={164} cy={154} r={5} fill="#151A1D" stroke="#9AA3A8" /><circle cx={196} cy={154} r={5} fill={RED} stroke="#9AA3A8" />
      <Callout to={[152, 40]} at={[L, 30]} side="left" k="learn.art.multimeter.display" />
      <Callout to={[196, 104]} at={[R, 96]} side="right" k="learn.art.multimeter.dial" />
      <Callout to={[240, 200]} at={[R, 160]} side="right" k="learn.art.multimeter.red" />
      <Callout to={[120, 200]} at={[L, 160]} side="left" k="learn.art.multimeter.black" />
    </>
  ),
  tachometer: () => (
    <>
      <path d="M128 76H96" stroke="#D9362B" strokeWidth={2} strokeDasharray="5 4" />
      <rect x={128} y={50} width={100} height={56} rx={12} fill="#3F6FB0" stroke="#1F3F6B" strokeWidth={1.4} />
      <rect x={178} y={100} width={32} height={86} rx={10} fill="#3F6FB0" stroke="#1F3F6B" strokeWidth={1.4} />
      <rect x={186} y={118} width={16} height={12} rx={3} fill="#F2B705" />
      <circle cx={134} cy={76} r={8} fill="#1C2328" stroke="#9AA3A8" strokeWidth={1.4} />
      <rect x={150} y={60} width={68} height={32} rx={4} fill="#CFE3C8" />
      <text x={184} y={76} textAnchor="middle" fontSize={13} fontWeight={700} fontFamily="ui-monospace, Menlo, monospace" fill={INK}>5500</text>
      <text x={184} y={88} textAnchor="middle" fontSize={9} fontWeight={700} fontFamily={ART_FONT} fill={INK}>RPM</text>
      <Callout to={[134, 76]} at={[L, 140]} side="left" k="learn.art.tachometer.sensor" />
      <Callout to={[214, 76]} at={[R, 40]} side="right" k="learn.art.tachometer.display" />
      <Callout to={[202, 124]} at={[R, 150]} side="right" k="learn.art.tachometer.button" />
    </>
  )
}

/** A labelled drawing on a light workbench plate (readable in light and dark mode). */
export function ArtPlate({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <svg className="part-art" viewBox="0 0 360 224" role="img" aria-label={label}>
      <rect x={1} y={1} width={358} height={222} rx={14} fill="#FBF7EE" stroke="#E2DBC9" strokeWidth={2} />
      {children}
    </svg>
  )
}

/** A part's labelled drawing on a light workbench plate, for its card. */
export function PartIllustration({ id }: { id: ArtId }) {
  return (
    <ArtPlate label={t(`learn.art.${id}.alt` as Key)}>{ART[id]()}</ArtPlate>
  )
}
