// Drawings of Structure's materials, on the same light workbench plate and with the same callouts
// as the Power parts. Labels come from en.json / es.json.
import { t, type Key } from '../../i18n/t'
import type { MaterialId } from '../../structure/materials'
import { ArtPlate, Callout, L, R } from '../parts/art'

const CLEAR = '#DCEEF6', EDGE = '#7FA6BC', WOOD = '#E2C48E', WOOD_D = '#9C7A45', CARD = '#F4E9D2'

/** a straw seen from the side, from (x1, y) to (x2, y), with stripes */
function Straw({ x1, x2, y, r, color }: { x1: number; x2: number; y: number; r: number; color: string }) {
  return (
    <g>
      <rect x={x1} y={y - r} width={x2 - x1} height={2 * r} rx={r * 0.6} fill={color} stroke="#5F6A70" strokeWidth={1.2} />
      {Array.from({ length: Math.floor((x2 - x1) / 18) }, (_, i) => (
        <path key={i} d={`M${x1 + 8 + i * 18} ${y - r}l8 ${2 * r}`} stroke="#fff" strokeWidth={2.4} opacity={0.6} />
      ))}
      <ellipse cx={x2} cy={y} rx={r * 0.45} ry={r} fill="#fff" stroke="#5F6A70" strokeWidth={1.2} />
    </g>
  )
}

const ART: Record<MaterialId, () => React.ReactNode> = {
  cup: () => (
    <>
      {/* a clear cup, upside down: wide rim on the table, the cut-open bottom on top */}
      <path d="M134 196L148 46H212L226 196Z" fill={CLEAR} fillOpacity={0.7} stroke={EDGE} strokeWidth={2} />
      <ellipse cx={180} cy={196} rx={46} ry={8} fill="none" stroke={EDGE} strokeWidth={2.4} />
      <ellipse cx={180} cy={46} rx={32} ry={6} fill="#FBF7EE" stroke={EDGE} strokeWidth={2} strokeDasharray="5 4" />
      <path d="M160 34q6 -10 0 -18M180 32q6 -10 0 -18M200 34q6 -10 0 -18" fill="none" stroke="#D9362B" strokeWidth={2} strokeLinecap="round" />
      <path d="M150 70L154 180" stroke="#fff" strokeWidth={4} opacity={0.7} strokeLinecap="round" />
      <Callout to={[200, 46]} at={[R, 46]} side="right" k="st.art.cup.open" />
      <Callout to={[180, 22]} at={[L, 28]} side="left" k="st.art.cup.air" />
      <Callout to={[146, 120]} at={[L, 120]} side="left" k="st.art.cup.clear" />
      <Callout to={[222, 190]} at={[R, 178]} side="right" k="st.art.cup.rim" />
    </>
  ),
  straws: () => (
    <>
      <Straw x1={120} x2={250} y={78} r={11} color="#E58A3A" />
      <Straw x1={140} x2={270} y={150} r={5} color="#4F7FB0" />
      <path d="M262 78h18" stroke="#4F7FB0" strokeWidth={8} strokeLinecap="round" opacity={0.85} />
      <Callout to={[160, 70]} at={[L, 52]} side="left" k="st.art.straws.thick" />
      <Callout to={[170, 152]} at={[L, 172]} side="left" k="st.art.straws.thin" />
      <Callout to={[276, 80]} at={[R, 112]} side="right" k="st.art.straws.fits" />
    </>
  ),
  bands: () => (
    <>
      <ellipse cx={160} cy={96} rx={42} ry={22} fill="none" stroke="#C0392B" strokeWidth={5} />
      <ellipse cx={204} cy={130} rx={30} ry={18} fill="none" stroke="#D9A21B" strokeWidth={5} />
      {/* a band wrapped three times around a post */}
      <rect x={168} y={160} width={24} height={50} rx={4} fill={WOOD} stroke={WOOD_D} />
      <path d="M166 174h28M166 180h28M166 186h28" stroke="#C0392B" strokeWidth={3.4} strokeLinecap="round" />
      <Callout to={[118, 96]} at={[L, 62]} side="left" k="st.art.bands.loop" />
      <Callout to={[194, 180]} at={[R, 184]} side="right" k="st.art.bands.wrap" />
    </>
  ),
  pipe: () => (
    <>
      {/* fuzzy outside: a thick soft line with little hairs, and the metal core showing at the cut end */}
      <path d="M118 150C150 70 210 70 236 120" fill="none" stroke="#2F9E6A" strokeWidth={16} strokeLinecap="round" />
      <path d="M118 150C150 70 210 70 236 120" fill="none" stroke="#7FD3A8" strokeWidth={16} strokeLinecap="round" strokeDasharray="1.5 3" />
      <path d="M236 120l18 22" stroke="#9AA3A8" strokeWidth={3} strokeLinecap="round" />
      <path d="M128 196c14 -6 28 6 42 0s28 -6 42 0 28 6 42 0" fill="none" stroke="#2F9E6A" strokeWidth={9} strokeLinecap="round" />
      <path d="M128 196c14 6 28 -6 42 0s28 6 42 0 28 -6 42 0" fill="none" stroke="#1F7A50" strokeWidth={9} strokeLinecap="round" opacity={0.8} />
      <Callout to={[150, 92]} at={[L, 60]} side="left" k="st.art.pipe.fuzzy" />
      <Callout to={[252, 140]} at={[R + 20, 110]} side="right" k="st.art.pipe.core" />
      <Callout to={[170, 196]} at={[L, 176]} side="left" k="st.art.pipe.twist" />
    </>
  ),
  sticks: () => (
    <>
      <rect x={126} y={40} width={36} height={164} rx={18} fill={WOOD} stroke={WOOD_D} strokeWidth={1.6} />
      <path d="M134 60v124M144 52v140M154 60v124" stroke="#C9A86E" strokeWidth={1} />
      <rect x={196} y={40} width={36} height={164} rx={18} fill={WOOD} stroke={WOOD_D} strokeWidth={1.6} />
      {/* notches cut in the side by the facilitator */}
      {[80, 112, 144].map(y => <path key={y} d={`M232 ${y}h-10l-6 7l6 7h10`} fill="#FBF7EE" stroke={WOOD_D} strokeWidth={1.6} />)}
      <Callout to={[144, 70]} at={[L, 60]} side="left" k="st.art.sticks.stick" />
      <Callout to={[226, 119]} at={[R + 6, 119]} side="right" k="st.art.sticks.notch" />
      <Callout to={[144, 190]} at={[L, 180]} side="left" k="st.art.sticks.stiff" />
    </>
  ),
  cardstock: () => (
    <>
      {/* a tray folded from cardstock: flat bottom, raised front lip */}
      <path d="M120 120L190 92L250 116L180 146Z" fill={CARD} stroke="#A68B5B" strokeWidth={1.6} />
      <path d="M120 120L180 146V162L120 136Z" fill="#E8D6B0" stroke="#A68B5B" strokeWidth={1.6} />
      <path d="M180 146L250 116V132L180 162Z" fill="#F0E2C2" stroke="#A68B5B" strokeWidth={1.6} />
      <path d="M150 106L210 132" stroke="#A68B5B" strokeWidth={1.4} strokeDasharray="5 4" />
      {/* a wedge */}
      <path d="M126 200H206L206 176Z" fill={CARD} stroke="#A68B5B" strokeWidth={1.6} />
      <Callout to={[150, 140]} at={[L, 150]} side="left" k="st.art.cardstock.lip" />
      <Callout to={[208, 128]} at={[R, 96]} side="right" k="st.art.cardstock.fold" />
      <Callout to={[196, 186]} at={[R, 190]} side="right" k="st.art.cardstock.wedge" />
    </>
  ),
  clothespins: () => (
    <>
      <path d="M122 96L244 80L246 92L124 110Z" fill={WOOD} stroke={WOOD_D} strokeWidth={1.6} />
      <path d="M122 118L244 132L242 144L120 132Z" fill={WOOD} stroke={WOOD_D} strokeWidth={1.6} />
      {/* the metal spring */}
      <circle cx={196} cy={112} r={10} fill="none" stroke="#7A8288" strokeWidth={3.5} />
      <path d="M186 106L156 98M186 118L156 128" stroke="#7A8288" strokeWidth={3} strokeLinecap="round" />
      <path d="M122 100l-4 8 4 8" fill="none" stroke={WOOD_D} strokeWidth={1.6} />
      <Callout to={[196, 102]} at={[R, 52]} side="right" k="st.art.clothespins.spring" />
      <Callout to={[124, 112]} at={[L, 150]} side="left" k="st.art.clothespins.jaws" />
      <Callout to={[236, 138]} at={[R, 176]} side="right" k="st.art.clothespins.press" />
    </>
  ),
  tape: () => (
    <>
      <circle cx={170} cy={110} r={56} fill="#EFE6CF" stroke="#A68B5B" strokeWidth={1.6} />
      <circle cx={170} cy={110} r={30} fill="#FBF7EE" stroke="#A68B5B" strokeWidth={1.6} />
      <path d="M214 146L262 186L272 176L224 136Z" fill="#F6EED8" stroke="#A68B5B" strokeWidth={1.4} />
      <path d="M232 160l6 5M244 170l6 5" stroke="#C9B48A" strokeWidth={1.4} />
      <Callout to={[146, 66]} at={[L, 40]} side="left" k="st.art.tape.roll" />
      <Callout to={[250, 172]} at={[R, 128]} side="right" k="st.art.tape.sticky" />
      <Callout to={[150, 160]} at={[L, 180]} side="left" k="st.art.tape.heat" />
    </>
  )
}

/** a material's labelled drawing, for its card */
export function MaterialIllustration({ id }: { id: MaterialId }) {
  return <ArtPlate label={t(`st.art.${id}.alt` as Key)}>{ART[id]()}</ArtPlate>
}

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

/** a simple line drawing for each material's tile */
export function MaterialIcon({ id }: { id: MaterialId }) {
  const d: Record<MaterialId, React.ReactNode> = {
    cup: <><path d="M10 34 14 8h12l4 26z" {...S} /><path d="M10 34h20M16 4c1 2 1 3 0 4M24 4c1 2 1 3 0 4" {...S} /></>,
    straws: <><path d="M6 14h28M6 20h28M10 28h24" {...S} /></>,
    bands: <><ellipse cx={18} cy={18} rx={12} ry={7} {...S} /><ellipse cx={24} cy={24} rx={9} ry={5} {...S} /></>,
    pipe: <><path d="M6 30c6-20 22-20 28-6" {...S} strokeWidth={4} /></>,
    sticks: <><rect x={8} y={6} width={9} height={28} rx={4.5} {...S} /><rect x={23} y={6} width={9} height={28} rx={4.5} {...S} /></>,
    cardstock: <><path d="M6 22 20 14l14 8-14 8z" {...S} /><path d="M6 22v5l14 8 14-8v-5" {...S} /></>,
    clothespins: <><path d="M6 15 34 11M6 25l28 4" {...S} /><circle cx={24} cy={20} r={3} {...S} /></>,
    tape: <><circle cx={18} cy={20} r={12} {...S} /><circle cx={18} cy={20} r={5} {...S} /><path d="M28 27l6 6" {...S} /></>
  }
  return <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">{d[id]}</svg>
}

