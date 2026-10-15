// Side view of the mini agrivoltaic plot, ported from drawScene() in the prototype.
// Coordinates are in a 360 x 230 viewBox.
import model from '../config/model.json'
import { t } from '../i18n/t'
import { sunAt } from '../sim/simulate'
import type { Design, Hour } from '../sim/types'

const GY = 196, CX = 180
const PANEL_Y = { low: 122, high: 84 }
const GAP_PX = { none: 0, small: 11, wide: 22 }
const FONT = 'Source Sans 3, sans-serif'
const INK = '#2B2F2C'
const rad = (d: number) => (d * Math.PI) / 180

function mix(a: string, b: string, k: number) {
  const pa = a.match(/\w\w/g)!.map(x => parseInt(x, 16)), pb = b.match(/\w\w/g)!.map(x => parseInt(x, 16))
  return '#' + pa.map((v, i) => Math.round(v + (pb[i] - v) * k).toString(16).padStart(2, '0')).join('')
}

type Seg = { big: boolean; x1: number; y1: number; x2: number; y2: number }

function panelSegs(d: Pick<Design, 'panels' | 'height'>): Seg[] {
  const tilt = rad(model.fixed.tilt * 0.6), py = PANEL_Y[d.height]
  const g = GAP_PX[model.fixed.gap as keyof typeof GAP_PX]
  let parts: [number, number, boolean][] = []
  if (d.panels === 'small') parts = [[-32, 32, false]]
  else if (d.panels === 'big') parts = [[-56, 56, true]]
  else if (d.panels === 'both') {
    const tot = 100 + 56 + g, s = -tot / 2
    parts = [[s, s + 100, true], [s + 100 + g, s + tot, false]]
  }
  return parts.map(([a, b, big]) => ({
    big, x1: CX + a * Math.cos(tilt), y1: py - a * Math.sin(tilt), x2: CX + b * Math.cos(tilt), y2: py - b * Math.sin(tilt)
  }))
}

type Props = {
  design: Pick<Design, 'panels' | 'height' | 'weather' | 'fan' | 'pump'>
  /** the hour being played; null shows the set-up view */
  hour: Hour | null
  /** plant size, 0-1 */
  growth: number
  /** tank level, 0-1 */
  tank?: number
  /** clock hour for the set-up view */
  idleHour?: number
  led?: boolean
  label: string
  className?: string
  /** draw the panels' shadows (off in the Home sky band, where long shadows would end at the picture's edge) */
  shadows?: boolean
}

export function Scene({ design: d, hour: hr, growth, tank = 1, idleHour = 12, led = false, label, className = 'scene', shadows: showShadows = true }: Props) {
  const w = model.weather[d.weather]
  const h = hr ? hr.h : idleHour
  const sun = sunAt(h, w)
  const sky = hr ? (sun.sun > 0 ? mix('f7d7a8', 'bfe3f2', Math.min(1, sun.elev / 40)) : '#4a5a78') : '#bfe3f2'
  const sx = 20 + ((h - model.hours.start) / (model.hours.end - model.hours.start)) * 320
  const sy = 186 - (sun.elev / 85) * 168
  const sunUp = sun.sun > 0 || !hr
  const segs = panelSegs(d)

  // shadow of each panel, cast from the sun onto the ground
  const shadows = sunUp && showShadows
    ? segs.flatMap((p, i) => {
        const proj = (x: number, y: number) => {
          const dx = x - sx, dy = y - sy
          return dy <= 0 ? null : x + (dx * (GY - y)) / dy
        }
        const a = proj(p.x1, p.y1), b = proj(p.x2, p.y2)
        if (a == null || b == null) return []
        const xa = Math.max(-20, Math.min(a, b)), xb = Math.min(380, Math.max(a, b))
        return [
          <polygon key={`s${i}`} points={`${p.x1},${p.y1} ${p.x2},${p.y2} ${xb},${GY} ${xa},${GY}`} fill="#1b2a20" opacity={0.1} />,
          <rect key={`g${i}`} x={xa} y={GY} width={Math.max(0, xb - xa)} height={6} fill="#6b5236" opacity={0.45} />
        ]
      })
    : null

  // plant: grows taller and leafier; droops and yellows when too hot or too dry
  const gf = Math.max(0.22, Math.min(1, growth || 0.22))
  const stressed = !!hr && (hr.hot || hr.moisture < model.wilt + 0.05)
  const leaf = stressed ? '#B9A54A' : '#3E9B4F'
  const top = 166 - 34 * gf
  const droop = stressed ? 6 : 0
  const leaves = [0, 1, 2].flatMap(i => {
    const y = 164 - (166 - top) * (0.35 + i * 0.3), sz = (7 + 5 * gf) * (1 - i * 0.18), cy = y + droop * (1 - i * 0.3)
    return [
      <ellipse key={`l${i}`} cx={180 - sz * 0.9} cy={cy} rx={sz} ry={sz * 0.42} fill={leaf} transform={`rotate(${-20 + droop * 3} ${180 - sz * 0.9} ${y})`} />,
      <ellipse key={`r${i}`} cx={180 + sz * 0.9} cy={cy} rx={sz} ry={sz * 0.42} fill={leaf} transform={`rotate(${20 - droop * 3} ${180 + sz * 0.9} ${y})`} />
    ]
  })

  const pumpOn = !!hr?.on.pump, fanOn = !!hr?.on.fan
  const L = segs[0], R = segs[segs.length - 1]

  return (
    <svg className={className} viewBox="0 0 360 230" role="img" aria-label={label}>
      {/* sky and ground run far past the edges: the Home band shows them full width; elsewhere the svg clips them */}
      <rect x={-2000} y={0} width={4360} height={230} fill={sky} />
      {sunUp && (
        <>
          <circle cx={sx} cy={sy} r={20} fill="#FFE7A3" opacity={0.6} />
          <circle cx={sx} cy={sy} r={13} fill="#F2B705" />
        </>
      )}
      <rect x={-2000} y={GY} width={4360} height={34} fill="#C9A779" />
      <rect x={-2000} y={GY} width={4360} height={3} fill="#A8865A" />
      {shadows}

      {d.pump && (
        <g>
          <rect x={26} y={150} width={36} height={46} rx={4} fill="#E9F3FA" stroke="#5c7a8f" strokeWidth={1.5} />
          <rect x={28} y={194 - 42 * tank} width={32} height={42 * tank} rx={2} fill="#3E8FD1" opacity={0.8} />
          <path d="M62 160 Q 110 136 162 166" fill="none" stroke="#5c7a8f" strokeWidth={2.5} />
          <rect x={52} y={176} width={14} height={12} rx={2} fill={pumpOn ? '#F2B705' : '#9aa7ad'} />
          {pumpOn && <g>{[0, 1, 2].map(i => <circle key={i} className="drop" cx={166} cy={172 + i * 4} r={2.4} fill="#3E8FD1" />)}</g>}
          <text x={44} y={145} textAnchor="middle" fontSize={9} fontFamily={FONT} fill={INK}>{t('scene.tank')}</text>
        </g>
      )}

      {segs.length > 0 && (
        <>
          <line x1={Math.min(L.x1, L.x2) + 4} y1={L.x1 < L.x2 ? L.y1 : L.y2} x2={Math.min(L.x1, L.x2) + 4} y2={GY} stroke="#8A7A62" strokeWidth={4} />
          <line x1={Math.max(R.x1, R.x2) - 4} y1={R.x2 > R.x1 ? R.y2 : R.y1} x2={Math.max(R.x1, R.x2) - 4} y2={GY} stroke="#8A7A62" strokeWidth={4} />
        </>
      )}

      <polygon points="154,168 206,168 200,196 160,196" fill="#B8693E" />
      <ellipse cx={180} cy={168} rx={26} ry={4} fill="#5a3a1e" />
      <path d={`M180 167 L180 ${top}`} stroke="#3a7a3f" strokeWidth={2.5} />
      {leaves}
      <path d="M136 196 A 44 60 0 0 1 224 196" fill="rgba(160,215,240,.25)" stroke="#7fb6d6" strokeWidth={1.5} />

      {segs.map((p, i) => (
        <g key={i}>
          <line x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} stroke="#1B3E66" strokeWidth={p.big ? 7 : 6} strokeLinecap="round" />
          <line x1={p.x1} y1={p.y1 - 1.5} x2={p.x2} y2={p.y2 - 1.5} stroke="#4F7FB0" strokeWidth={1.2} strokeDasharray="7 3" />
        </g>
      ))}
      {segs.length === 2 && model.fixed.gap !== 'none' && (
        <text x={(segs[0].x2 + segs[1].x1) / 2} y={Math.min(segs[0].y2, segs[1].y1) - 8} textAnchor="middle" fontSize={9} fontFamily={FONT} fill={INK}>
          {t('scene.gap')}
        </text>
      )}

      {led && (
        <g>
          <circle cx={226} cy={186} r={5} fill="#d9d4c2" stroke="#7a6a3a" strokeWidth={1} />
          <text x={226} y={210} textAnchor="middle" fontSize={9} fontFamily={FONT} fill={INK}>{t('scene.led')}</text>
        </g>
      )}

      {d.fan && (
        <g>
          <rect x={296} y={172} width={8} height={24} fill="#7d7a72" />
          <rect x={286} y={192} width={28} height={5} rx={2} fill="#7d7a72" />
          <rect x={296} y={152} width={22} height={16} rx={4} fill="#B4B2A9" stroke="#5F5E5A" />
          <g className={fanOn ? 'spin' : undefined}>
            <g className="blades">
              <ellipse cx={292} cy={147} rx={3} ry={13} fill="#378ADD" />
              <ellipse cx={292} cy={173} rx={3} ry={13} fill="#378ADD" />
              <circle cx={292} cy={160} r={4} fill="#1f5f9e" />
            </g>
          </g>
          {fanOn && (
            <>
              <line className="air" x1={280} y1={150} x2={232} y2={150} stroke={INK} strokeWidth={1.5} />
              <line className="air" x1={280} y1={168} x2={230} y2={168} stroke={INK} strokeWidth={1.5} />
              <path d="M236 146 L230 150 L236 154 M234 164 L228 168 L234 172" fill="none" stroke={INK} strokeWidth={1.5} />
            </>
          )}
        </g>
      )}

      {hr && sun.sun <= 0 && (
        <text x={180} y={30} textAnchor="middle" fontSize={12} fill="#fff" fontFamily={FONT}>{t('scene.night')}</text>
      )}
    </svg>
  )
}
