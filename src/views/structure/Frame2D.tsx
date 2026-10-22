// The frame, drawn from the side as the learner builds it: the table, the potted plant under its
// dome, then the base, posts, joins, hinge, angle stop, holder and panel. The panel's pose shows
// what the frame really does: tilted when it has a hinge and an angle stop, flat when it is stuck,
// drooping when it flops. A pick that will not attach is drawn faded with a cross.
import config from '../../config/structure.json'
import { t, type Key } from '../../i18n/t'
import type { Draft, Slot } from '../../structure/options'
import { attach, type Why } from '../../structure/rules'

const CM = 7.2 // px per cm
const GROUND = 226, PX = 180 // table top, and the plant's centre
const FRONT = 148, BACK = 212 // the two posts (the panel tilts up from the front post)
const INK = '#2B2F2C', WOOD = '#E2C48E', WOOD_D = '#9C7A45', CARD = '#F4E9D2', CARD_D = '#A68B5B', RED = '#C0392B', GREEN = '#2F9E6A', STRAW = '#E58A3A'
const FONT = 'Source Sans 3, system-ui, sans-serif'
const rad = (d: number) => (d * Math.PI) / 180

/** where things are drawn, for the tests' overlays */
export const FRAME2D = { GROUND, PX, FRONT, BACK, CM }

/** the panel's pose for a draft: angle (degrees, up toward the back) */
export function panelPose(d: Draft, hinge: boolean, stop: boolean, angle = 25) {
  if (!d.posts) return null
  if (hinge && stop) return angle
  if (hinge) return -38 // flops down
  return 0 // stuck at one angle
}

function Faded({ off, children, at }: { off: Why | null; children: React.ReactNode; at: [number, number] }) {
  if (!off) return <>{children}</>
  return (
    <g>
      <g opacity={0.35}>{children}</g>
      <text x={at[0]} y={at[1]} textAnchor="middle" fontSize={16} fontWeight={800} fontFamily={FONT} fill={RED}>✗</text>
    </g>
  )
}

type Props = {
  draft: Draft
  /** the panel's angle when the frame can hold one (the angle test sets it) */
  angle?: number
  /** a short line for screen readers */
  label: string
  /** slip test: how far the panel has slid down its slope (0 to 1) */
  slide?: number
  /** extra drawings on top (heat, sun and shadow in the tests) */
  overlay?: React.ReactNode
  /** the frame's own group gets this class (the wobble test sways it) */
  frameClass?: string
}

export function Frame2D({ draft: d, angle = 25, label, slide = 0, overlay, frameClass }: Props) {
  const a = attach(d)
  const baseTop = d.base ? GROUND - config.base[d.base].height * CM : GROUND
  const hasPosts = !!d.posts && d.posts !== 'none'
  const postsUp = hasPosts && d.join !== undefined && !a.join && !a.posts
  const postTop = hasPosts ? baseTop - config.posts[d.posts!].height * CM : baseTop
  const hingeOk = !!d.hinge && d.hinge !== 'none' && !a.hinge && postsUp
  const stopOk = !!d.stop && d.stop !== 'none' && !a.stop && (postsUp || d.stop === 'wedges')
  const wedgeOnly = d.posts === 'none' && d.stop === 'wedges'
  const pose = wedgeOnly ? angle : hasPosts ? panelPose(d, hingeOk, stopOk, angle) : null
  // the hinge point the panel turns on
  const H: [number, number] = wedgeOnly ? [FRONT - 4, baseTop] : [FRONT, postTop]
  const L = 86 // panel length
  // where the panel rests on the back post at an angle; the back post is tall enough for 40°
  const contact = (g: number) => H[1] - (BACK - H[0]) * Math.tan(rad(g))
  const stopY = pose !== null && pose > 0 ? contact(pose) : postTop
  const backExtra = (BACK - FRONT) * Math.tan(rad(Math.max(...config.angles))) + 6

  const post = (x: number, lean: number, extra = 0) => {
    const h = config.posts[d.posts as 'thickStraw'].height * CM + extra
    return (
      <g transform={`rotate(${lean} ${x} ${baseTop})`}>
        {d.posts === 'thickStraw' && (
          <g>
            <rect x={x - 5} y={baseTop - h} width={10} height={h} rx={4} fill={STRAW} stroke="#8A4E1A" />
            {Array.from({ length: Math.floor(h / 11) }, (_, i) => <path key={i} d={`M${x - 5} ${baseTop - h + 6 + i * 11}l10 6`} stroke="#fff" strokeWidth={2} opacity={0.6} />)}
          </g>
        )}
        {d.posts === 'pipe' && (
          <g>
            <path d={`M${x - 2} ${baseTop}V${baseTop - h}`} stroke={GREEN} strokeWidth={5} strokeLinecap="round" />
            <path d={`M${x + 2} ${baseTop}V${baseTop - h}`} stroke="#1F7A50" strokeWidth={5} strokeLinecap="round" />
            <path d={`M${x - 4} ${baseTop}V${baseTop - h}`} stroke="#7FD3A8" strokeWidth={9} strokeLinecap="round" strokeDasharray="1.5 5" opacity={0.7} />
          </g>
        )}
        {d.posts === 'stick' && <rect x={x - 5} y={baseTop - h} width={10} height={h} rx={5} fill={WOOD} stroke={WOOD_D} />}
      </g>
    )
  }
  const lean = postsUp ? 0 : 28

  return (
    <svg className="frame2d" viewBox="0 0 360 250" role="img" aria-label={label}>
      <rect x={0} y={0} width={360} height={250} rx={12} fill="#EAF4F8" />
      <rect x={0} y={GROUND} width={360} height={24} fill="#C9A779" />

      {/* plant, pot and dome */}
      <polygon points={`${PX - 22},${GROUND - 34} ${PX + 22},${GROUND - 34} ${PX + 17},${GROUND} ${PX - 17},${GROUND}`} fill="#B8693E" />
      <path d={`M${PX} ${GROUND - 34}V${GROUND - 58}`} stroke="#3A7A3F" strokeWidth={2.5} />
      {[[-9, -50, -20], [9, -54, 20], [-7, -42, -25], [7, -44, 25]].map(([dx, dy, rot]) => (
        <ellipse key={`${dx}${dy}`} cx={PX + dx} cy={GROUND + dy} rx={9} ry={4} fill="#3E9B4F" transform={`rotate(${rot} ${PX + dx} ${GROUND + dy})`} />
      ))}
      <path d={`M${PX - 30} ${GROUND - 34}A30 ${config.plant.domeTop * CM - 34} 0 0 1 ${PX + 30} ${GROUND - 34}`} fill="rgba(160,215,240,.3)" stroke="#7FB6D6" strokeWidth={1.5} />

      <g className={frameClass} style={{ transformOrigin: `${PX}px ${GROUND}px` }}>
      {/* base */}
      {d.base === 'cup' && (
        <g>
          <path d={`M${PX - 52} ${GROUND}L${PX - 34} ${baseTop}H${PX + 34}L${PX + 52} ${GROUND}`} fill="#DCEEF6" fillOpacity={0.45} stroke="#7FA6BC" strokeWidth={2} />
          {d.cupOpen
            ? <path d={`M${PX - 34} ${baseTop}h12M${PX + 22} ${baseTop}h12`} stroke="#7FA6BC" strokeWidth={3} />
            : <path d={`M${PX - 34} ${baseTop}H${PX + 34}`} stroke="#7FA6BC" strokeWidth={3} />}
        </g>
      )}
      {d.base === 'tower' && (
        <g>
          {[FRONT, BACK].map(x => <rect key={x} x={x - 6} y={baseTop} width={12} height={GROUND - baseTop} rx={3} fill={WOOD} stroke={WOOD_D} />)}
          <path d={`M${FRONT} ${baseTop + 10}L${BACK} ${GROUND - 12}M${BACK} ${baseTop + 10}L${FRONT} ${GROUND - 12}`} stroke={WOOD_D} strokeWidth={5} opacity={0.8} />
          <rect x={FRONT - 8} y={baseTop - 4} width={BACK - FRONT + 16} height={6} rx={2} fill={WOOD} stroke={WOOD_D} />
        </g>
      )}
      {d.base === 'easel' && (
        <g>
          {[FRONT, BACK].map(x => <path key={x} d={`M${x - 14} ${GROUND}L${x} ${baseTop}L${x + 14} ${GROUND}`} fill={CARD} stroke={CARD_D} strokeWidth={1.5} />)}
        </g>
      )}

      {/* posts and how they are joined to the base */}
      {hasPosts && (
        <Faded off={a.join ?? a.posts} at={[FRONT - 20, baseTop - 10]}>
          {post(FRONT, -lean)}
          {post(BACK, lean, backExtra)}
          {postsUp && d.join === 'bands' && [FRONT, BACK].map(x => <path key={x} d={`M${x - 7} ${baseTop - 6}h14M${x - 7} ${baseTop - 11}h14`} stroke={RED} strokeWidth={3} />)}
          {postsUp && d.join === 'pipeWrap' && [FRONT, BACK].map(x => <path key={x} d={`M${x - 7} ${baseTop - 4}l14 -4M${x - 7} ${baseTop - 10}l14 -4`} stroke={GREEN} strokeWidth={3} />)}
          {postsUp && d.join === 'tape' && [FRONT, BACK].map(x => <rect key={x} x={x - 8} y={baseTop - 12} width={16} height={9} fill="#F6EED8" stroke={CARD_D} opacity={0.9} />)}
          {d.join === 'notches' && [FRONT, BACK].map(x => <path key={x} d={`M${x - 6} ${baseTop - 4}l4 -4 4 4 4 -4`} fill="none" stroke={WOOD_D} strokeWidth={2} />)}
        </Faded>
      )}

      {/* angle stop on the back post, or wedges */}
      {d.stop && d.stop !== 'none' && (
        <Faded off={a.stop} at={[BACK + 22, postTop + 20]}>
          {d.stop === 'bandStops' && hasPosts && <path d={`M${BACK - 8} ${stopY + 5}h16M${BACK - 8} ${stopY + 10}h16`} stroke={RED} strokeWidth={3.5} />}
          {d.stop === 'ladder' && hasPosts && config.angles.map(g => <ellipse key={g} cx={BACK - 7} cy={contact(g) + 5} rx={5} ry={4} fill="none" stroke={GREEN} strokeWidth={2.6} />)}
          {d.stop === 'notches' && hasPosts && config.angles.map(g => <path key={g} d={`M${BACK - 5} ${contact(g)}l-5 3 5 4`} fill="#EAF4F8" stroke={WOOD_D} strokeWidth={1.6} />)}
          {d.stop === 'clothespin' && hasPosts && (
            <g>
              <circle cx={BACK + 24} cy={contact(25)} r={15} fill="#fff" stroke={INK} />
              {config.angles.map(g => <path key={g} d={`M${BACK + 24} ${contact(25)}l${-13 * Math.cos(rad(g))} ${-13 * Math.sin(rad(g))}`} stroke={INK} strokeWidth={1} />)}
              <path d={`M${BACK - 2} ${stopY + 2}l16 -2v6z`} fill={WOOD} stroke={WOOD_D} />
            </g>
          )}
          {d.stop === 'wedges' && (
            <path d={`M${wedgeOnly ? PX + 4 : BACK - 26} ${wedgeOnly ? baseTop : postTop}h${28}v${-config.wedgeHeight * CM}z`} fill={CARD} stroke={CARD_D} strokeWidth={1.5} />
          )}
        </Faded>
      )}

      {/* the panel, its holder, and the hinge it turns on */}
      {pose !== null && (
        <g>
          <g transform={`rotate(${-pose} ${H[0]} ${H[1]}) translate(${-slide * 70} ${slide * 40})`} opacity={1 - slide * 0.6}>
            {d.holder === 'tray' && <path d={`M${H[0] - 6} ${H[1] - 2}V${H[1] - 14}M${H[0] - 6} ${H[1] - 2}H${H[0] + L + 2}`} fill="none" stroke={CARD_D} strokeWidth={4} />}
            <rect x={H[0]} y={H[1] - 10} width={L} height={7} rx={1.5} fill="#1B3E66" stroke="#9AA3A8" strokeWidth={1.5} />
            <path d={`M${H[0] + 21} ${H[1] - 10}v7M${H[0] + 43} ${H[1] - 10}v7M${H[0] + 64} ${H[1] - 10}v7`} stroke="#4F7FB0" strokeWidth={1} />
            {d.holder === 'tray' && <path d={`M${H[0] + 30} ${H[1] - 12}v10M${H[0] + 60} ${H[1] - 12}v10`} stroke={RED} strokeWidth={2.5} />}
            {d.holder === 'tape' && <path d={`M${H[0] + 4} ${H[1] - 12}v10M${H[0] + L - 6} ${H[1] - 12}v10`} stroke="#E9DFC4" strokeWidth={6} />}
          </g>
          {d.hinge && d.hinge !== 'none' && (
            <Faded off={a.hinge} at={[H[0] - 18, H[1] - 14]}>
              {d.hinge === 'axle' && <circle cx={H[0]} cy={H[1]} r={5} fill="#4F7FB0" stroke={INK} strokeWidth={1.2} />}
              {d.hinge === 'eyeLoops' && <circle cx={H[0]} cy={H[1]} r={6} fill="none" stroke={GREEN} strokeWidth={3} />}
              {d.hinge === 'fig8' && <path d={`M${H[0]} ${H[1]}c-8 -8 -8 8 0 0c8 -8 8 8 0 0`} fill="none" stroke={RED} strokeWidth={2.6} />}
              {d.hinge === 'tapeHinge' && <rect x={H[0] - 6} y={H[1] - 6} width={12} height={12} fill="#F6EED8" stroke={CARD_D} />}
            </Faded>
          )}
        </g>
      )}

      </g>
      {overlay}
      {/* a short caption, in case of no picks yet */}
      {!d.base && <text x={180} y={40} textAnchor="middle" fontSize={14} fontWeight={700} fontFamily={FONT} fill={INK}>{t('st.scene.start' as Key)}</text>}
    </svg>
  )
}

export const SLOT_LABEL: Record<Slot, Key> = {
  base: 'st.slot.base', posts: 'st.slot.posts', join: 'st.slot.join', hinge: 'st.slot.hinge', stop: 'st.slot.stop', holder: 'st.slot.holder'
}
