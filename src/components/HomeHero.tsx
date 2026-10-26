// The Home picture: a calm desert scene, not a diagram. The sun crosses the sky on a high arc that
// never meets the panel, and one solar panel floats above the plant under its dome, its soft shadow
// falling on the plant. Decorative only (the page text explains the mission), so it is hidden from
// screen readers. Same 360 x 230 viewBox and colours as the Sun Day scene; the sky and ground run
// past the edges so the Home sky band shows them full width.
const GY = 196, CX = 180
const PANEL = { x1: 140, y1: 106, x2: 220, y2: 98 }
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

/** where the sun is for a point in the day (0 = sunrise, 1 = sunset): a high arc, clear of the panel */
export function heroSun(day: number) {
  const x = 40 + 280 * clamp(day, 0, 1)
  return { x, y: 30 + 120 * ((x - CX) / 150) ** 2 }
}

// the plant at the same size as before (Scene with growth 0.7)
const TOP = 166 - 34 * 0.7
const LEAVES = [0, 1, 2].flatMap(i => {
  const y = 164 - (166 - TOP) * (0.35 + i * 0.3), sz = (7 + 5 * 0.7) * (1 - i * 0.18)
  return [
    <ellipse key={`l${i}`} cx={CX - sz * 0.9} cy={y} rx={sz} ry={sz * 0.42} fill="#3E9B4F" transform={`rotate(-20 ${CX - sz * 0.9} ${y})`} />,
    <ellipse key={`r${i}`} cx={CX + sz * 0.9} cy={y} rx={sz} ry={sz * 0.42} fill="#3E9B4F" transform={`rotate(20 ${CX + sz * 0.9} ${y})`} />
  ]
})

export function HomeHero({ day, className }: { day: number; className?: string }) {
  const sun = heroSun(day)
  // the shadow leans a little away from the sun but always falls on the plant
  const lean = clamp(-(sun.x - CX) * 0.12, -14, 14)
  return (
    <svg className={className} viewBox="0 0 360 230" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="hero-shade">
          <stop offset="0" stopColor="#1b2a20" stopOpacity="0.2" />
          <stop offset="0.6" stopColor="#1b2a20" stopOpacity="0.12" />
          <stop offset="1" stopColor="#1b2a20" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="hero-pool">
          <stop offset="0" stopColor="#6b5236" stopOpacity="0.4" />
          <stop offset="1" stopColor="#6b5236" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x={-2000} y={0} width={4360} height={230} fill="#bfe3f2" />

      {/* far hills, pale with distance */}
      <path d={`M-2000 ${GY}H-120C-40 ${GY} 10 166 70 166S150 ${GY} 200 ${GY}C240 ${GY} 270 174 310 174S400 ${GY} 470 ${GY}H2360V${GY + 1}H-2000z`} fill="#DCC8A2" />

      <circle cx={sun.x} cy={sun.y} r={20} fill="#FFE7A3" opacity={0.6} />
      <circle cx={sun.x} cy={sun.y} r={13} fill="#F2B705" />

      <rect x={-2000} y={GY} width={4360} height={34} fill="#C9A779" />
      <rect x={-2000} y={GY} width={4360} height={3} fill="#A8865A" />

      {/* a small cactus */}
      <g stroke="#5E8C5A" strokeLinecap="round" fill="none">
        <path d={`M318 ${GY}V170`} strokeWidth={7} />
        <path d="M318 186h-8v-9" strokeWidth={5} strokeLinejoin="round" />
        <path d="M318 181h7v-8" strokeWidth={5} strokeLinejoin="round" />
      </g>

      {/* the plant in its pot under the dome */}
      <polygon points="154,168 206,168 200,196 160,196" fill="#B8693E" />
      <ellipse cx={CX} cy={168} rx={26} ry={4} fill="#5a3a1e" />
      <path d={`M${CX} 167 L${CX} ${TOP}`} stroke="#3a7a3f" strokeWidth={2.5} />
      {LEAVES}
      <path d="M136 196 A 44 60 0 0 1 224 196" fill="rgba(160,215,240,.25)" stroke="#7fb6d6" strokeWidth={1.5} />

      {/* the panel's soft shadow, falling on the plant */}
      <ellipse cx={CX + lean} cy={168} rx={52} ry={34} fill="url(#hero-shade)" />
      <ellipse cx={CX + lean} cy={GY + 2} rx={50} ry={5} fill="url(#hero-pool)" />

      {/* one solar panel, nothing holding it */}
      <line x1={PANEL.x1} y1={PANEL.y1} x2={PANEL.x2} y2={PANEL.y2} stroke="#1B3E66" strokeWidth={7} strokeLinecap="round" />
      <line x1={PANEL.x1 + 3} y1={PANEL.y1 - 1.6} x2={PANEL.x2 - 3} y2={PANEL.y2 - 1.6} stroke="#4F7FB0" strokeWidth={1.2} />
    </svg>
  )
}
