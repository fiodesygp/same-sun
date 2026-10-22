// The Power bench in 3D: the same circuit, props and wiring as the 2D board (tap a terminal,
// then another), drawn as a small table scene built from simple shapes. Loaded on demand as its own
// chunk. The terminals and wires are real HTML buttons laid over the canvas at their on-screen
// spots, so Tab, Enter and screen readers work exactly as in 2D. Draws only when something changes,
// or while a part is moving.
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { CanvasTexture, CatmullRomCurve3, DoubleSide, SRGBColorSpace, Spherical, Vector3, type Group, type PerspectiveCamera } from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { t } from '../../i18n/t'
import { boardModel, type WireNet } from '../../lab/board'
import { LEVELS, type TermId } from '../../lab/circuit'
import type { BoardProps } from './Board'
import { MAX_TURN, PLACE, TERM3D, VIEW, type V3 } from './layout3d'

type Props = BoardProps & {
  /** the panels' angle on the straw frame (only changes the look) */
  tilt: number
  /** WebGL stopped working: go back to 2D */
  onFail: () => void
}

const RED = '#C62828', BLACK = '#262B2E', LOOSE = '#9AA0A6', BRASS = '#C9A04A'
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const v = (p: V3) => new Vector3(...p)
const rad = (d: number) => (d * Math.PI) / 180

/** a learner wire: up out of one terminal, over, and down into the other */
function wireCurve(a: V3, b: V3) {
  const lift = 0.45 + Math.hypot(a[0] - b[0], a[2] - b[2]) * 0.12
  const A = v(a), B = v(b), mid = A.clone().add(B).multiplyScalar(0.5)
  return new CatmullRomCurve3([A, A.clone().setY(a[1] + lift * 0.6), mid.setY(Math.max(a[1], b[1]) + lift), B.clone().setY(b[1] + lift * 0.6), B])
}

/** a lead from a part to its terminal (part of the kit, so always the same colour) */
function leadCurve(a: V3, b: V3, sag = 0.25) {
  const A = v(a), B = v(b), mid = A.clone().add(B).multiplyScalar(0.5)
  mid.y = Math.max(a[1], b[1]) + sag
  return new CatmullRomCurve3([A, mid, B])
}

/** solar cells and busbars painted onto a small canvas, used as the panel's top */
function cellTexture(cols: number, rows: number) {
  const c = document.createElement('canvas')
  c.width = 64 * cols
  c.height = 64 * rows
  const g = c.getContext('2d')!
  g.fillStyle = '#0C2A47'
  g.fillRect(0, 0, c.width, c.height)
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    g.fillStyle = '#1B3E66'
    g.fillRect(i * 64 + 3, j * 64 + 3, 58, 58)
    g.fillStyle = '#C9D3DA'
    g.fillRect(i * 64 + 22, j * 64 + 5, 2, 54)
    g.fillRect(i * 64 + 42, j * 64 + 5, 2, 54)
  }
  const tex = new CanvasTexture(c)
  tex.colorSpace = SRGBColorSpace
  return tex
}

function Tube({ curve, r = 0.045, color }: { curve: CatmullRomCurve3; r?: number; color: string }) {
  return (
    <mesh castShadow>
      <tubeGeometry args={[curve, 24, r, 6, false]} />
      <meshStandardMaterial color={color} roughness={0.6} />
    </mesh>
  )
}

/** a panel held by straws with rubber bands, tilted toward the camera (the sun) */
function StrawPanel({ at, w, d, front, tilt, cols, rows }: { at: V3; w: number; d: number; front: number; tilt: number; cols: number; rows: number }) {
  const tex = useMemo(() => cellTexture(cols, rows), [cols, rows])
  const rise = d * Math.sin(rad(tilt)), depth = d * Math.cos(rad(tilt))
  const back = front + rise
  const corners: [number, number, number][] = [[-w / 2 + 0.05, front, depth / 2], [w / 2 - 0.05, front, depth / 2], [-w / 2 + 0.05, back, -depth / 2], [w / 2 - 0.05, back, -depth / 2]]
  return (
    <group position={at}>
      {corners.map(([x, h, z], i) => (
        <group key={i}>
          <mesh position={[x, h / 2, z]} castShadow>
            <cylinderGeometry args={[0.035, 0.035, h, 8]} />
            <meshStandardMaterial color="#F4F1EA" />
          </mesh>
          <mesh position={[x, h - 0.06, z]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.05, 0.016, 6, 12]} />
            <meshStandardMaterial color="#C0392B" />
          </mesh>
        </group>
      ))}
      <group position={[0, (front + back) / 2 + 0.03, 0]} rotation={[rad(tilt), 0, 0]}>
        <mesh castShadow>
          <boxGeometry args={[w, 0.05, d]} />
          <meshStandardMaterial color="#9AA3A8" metalness={0.3} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.027, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[w - 0.08, d - 0.08]} />
          <meshStandardMaterial map={tex} roughness={0.35} metalness={0.2} />
        </mesh>
      </group>
    </group>
  )
}

/** keeps the camera fitted, limited and controllable from buttons; tells the overlay to move */
type CamApi = { turn: (d: number) => void; zoom: (k: number) => void; reset: () => void }
function CameraRig({ apiRef, onMove }: { apiRef: React.RefObject<CamApi | null>; onMove: () => void }) {
  const { camera, gl, size, invalidate } = useThree()
  const ctl = useRef<OrbitControls | null>(null)
  const fit = useRef(10)

  useEffect(() => {
    const cam = camera as PerspectiveCamera
    const c = new OrbitControls(cam, gl.domElement)
    c.enablePan = false
    c.minAzimuthAngle = -MAX_TURN
    c.maxAzimuthAngle = MAX_TURN
    c.minPolarAngle = 0.55
    c.maxPolarAngle = 1.2
    c.target.set(...VIEW.target)
    const move = () => { invalidate(); onMove() }
    c.addEventListener('change', move)
    ctl.current = c
    const place = (az: number, polar: number, r: number) => {
      const s = new Spherical(r, polar, az), p = new Vector3().setFromSpherical(s).add(c.target)
      cam.position.copy(p)
      c.update()
      move()
    }
    const now = () => new Spherical().setFromVector3(cam.position.clone().sub(c.target))
    apiRef.current = {
      turn: d => { const s = now(); place(Math.max(-MAX_TURN, Math.min(MAX_TURN, s.theta + d)), s.phi, s.radius) },
      zoom: k => { const s = now(); place(s.theta, s.phi, Math.max(c.minDistance, Math.min(c.maxDistance, s.radius * k))) },
      reset: () => place(0, VIEW.polar, fit.current)
    }
    return () => {
      c.removeEventListener('change', move)
      c.dispose()
      apiRef.current = null
    }
  }, [camera, gl, invalidate, onMove, apiRef])

  // fit the bench to the canvas: far enough that the whole bench (and every terminal button) shows
  useEffect(() => {
    const cam = camera as PerspectiveCamera, c = ctl.current
    if (!c || !size.width) return
    const vf = rad(cam.fov), hf = 2 * Math.atan(Math.tan(vf / 2) * (size.width / size.height))
    fit.current = Math.max(VIEW.fitWidth / 2 / Math.tan(hf / 2), VIEW.fitHeight / 2 / Math.tan(vf / 2))
    c.maxDistance = fit.current
    c.minDistance = fit.current * 0.5
    apiRef.current?.reset()
  }, [camera, size.width, size.height, apiRef])
  return null
}

/** finds where 3D points land on screen, for the HTML buttons */
function Projector({ points, onProject, tick }: { points: Record<string, V3>; onProject: (p: Record<string, [number, number]>) => void; tick: number }) {
  const { camera, size } = useThree()
  useEffect(() => {
    const out: Record<string, [number, number]> = {}
    for (const [k, p] of Object.entries(points)) {
      const s = v(p).project(camera)
      out[k] = [((s.x + 1) / 2) * size.width, ((1 - s.y) / 2) * size.height]
    }
    onProject(out)
  }, [camera, size, points, onProject, tick])
  return null
}

function Bench({ p, tilt, wireCurves, nets }: { p: Props; tilt: number; wireCurves: CatmullRomCurve3[]; nets: WireNet[] }) {
  const Lv = LEVELS[p.level], m = boardModel(p.level, p.wires, p.sunOn, p.power, p.burnt)
  const blades = useRef<Group>(null)
  const drops = useRef<Group>(null)
  const { invalidate, gl } = useThree()
  const still = reducedMotion()
  const moving = !still && (m.motorDir !== 0 || m.pumpDir !== 0)
  const sun = p.sunOn ? 1 - 0.7 * p.cloud : 0

  // pump tube: from the pump up out of the tank, over to the pot
  const pumpAt: V3 = [PLACE.tank[0] + 0.1, 0.32, PLACE.tank[2]]
  const tube = useMemo(() => new CatmullRomCurve3([v(pumpAt), v([pumpAt[0], 1.0, pumpAt[2]]), v([-1.4, 0.95, 0.1]), v([PLACE.cup[0] - 0.25, 0.6, PLACE.cup[2] + 0.25])]), [pumpAt[0], pumpAt[2]])

  // shadows are drawn again only when the scene changes, never just because the fan turns
  useEffect(() => {
    gl.shadowMap.autoUpdate = false
    gl.shadowMap.needsUpdate = true
    invalidate()
  }, [gl, invalidate, moving, p.sunOn, p.cloud, m.ledOn, tilt, wireCurves, p.level, p.selected])

  useFrame((state, dt) => {
    if (!moving) return
    if (blades.current && m.motorDir) blades.current.rotation.x += m.motorDir * dt * (8 + 10 * p.power.motor)
    if (drops.current && m.pumpDir) {
      const speed = m.pumpFull ? 0.35 : 0.08
      drops.current.children.forEach((d, i) => {
        const u = ((state.clock.elapsedTime * speed + i / 3) % 1 + 1) % 1
        d.position.copy(tube.getPoint(m.pumpDir > 0 ? u : 1 - u))
      })
    }
    state.invalidate()
  })

  const has = (k: 'motor' | 'led' | 'pump') => Lv.parts.includes(k)
  const two = Lv.panels.length === 2
  const cup = PLACE.cup

  return (
    <>
      <color attach="background" args={['#F6F0E3']} />
      <hemisphereLight args={['#ffffff', '#d8c9a8', 0.75]} />
      <directionalLight position={[3.5, 7, 4]} intensity={0.5 + 1.9 * sun} castShadow shadow-mapSize={[768, 768]}
        shadow-camera-left={-6} shadow-camera-right={6} shadow-camera-top={6} shadow-camera-bottom={-6} shadow-radius={4} />
      <mesh position={[5.5, 6.5, -5]}>
        <sphereGeometry args={[0.45, 16, 12]} />
        <meshStandardMaterial color={p.sunOn ? '#F2B705' : '#C9CDC4'} emissive={p.sunOn ? '#F2B705' : '#000000'} emissiveIntensity={sun} />
      </mesh>

      {/* table and the terminal strips */}
      <mesh position={[0, -0.15, 0.2]} receiveShadow>
        <boxGeometry args={[9.8, 0.3, 4.8]} />
        <meshStandardMaterial color="#DDBF94" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.08, 1.9]} receiveShadow castShadow>
        <boxGeometry args={[8.4, 0.16, 0.42]} />
        <meshStandardMaterial color="#8C6B4A" />
      </mesh>

      {/* the plant: pot, soil, leaves, dome, and the clear cup over them */}
      <group position={cup}>
        <mesh position={[0, 0.25, 0]} castShadow>
          <cylinderGeometry args={[0.42, 0.32, 0.5, 20]} />
          <meshStandardMaterial color="#B8693E" />
        </mesh>
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.4, 0.4, 0.02, 20]} />
          <meshStandardMaterial color="#5A3A1E" />
        </mesh>
        <mesh position={[0, 0.68, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 0.36, 6]} />
          <meshStandardMaterial color="#3A7A3F" />
        </mesh>
        {[[-0.14, 0.78, 0.4], [0.14, 0.82, -0.4], [-0.1, 0.65, 0.6], [0.1, 0.68, -0.6]].map(([x, y, r], i) => (
          <mesh key={i} position={[x, y, 0]} rotation={[0, 0, r]} scale={[1, 0.35, 0.6]} castShadow>
            <sphereGeometry args={[0.13, 10, 8]} />
            <meshStandardMaterial color="#3E9B4F" />
          </mesh>
        ))}
        <mesh position={[0, 0.5, 0]}>
          <sphereGeometry args={[0.5, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#BFE3F2" transparent opacity={0.25} depthWrite={false} side={DoubleSide} />
        </mesh>
        <mesh position={[0, 0.78, 0]}>
          <cylinderGeometry args={[0.62, 0.8, 1.56, 24, 1, false]} />
          <meshStandardMaterial color="#E6F2F8" transparent opacity={0.16} depthWrite={false} side={DoubleSide} roughness={0.1} />
        </mesh>
      </group>
      <StrawPanel at={[cup[0], 0, cup[2]]} w={2.4} d={1.5} front={1.85} tilt={tilt} cols={6} rows={4} />
      <Tube curve={leadCurve([cup[0] - 0.3, 1.85, cup[2] + 0.75], TERM3D['p+'], 0.05)} r={0.03} color={RED} />
      <Tube curve={leadCurve([cup[0] + 0.3, 1.85, cup[2] + 0.75], TERM3D['p-'], 0.05)} r={0.03} color={BLACK} />

      {two && (
        <>
          <StrawPanel at={PLACE.small} w={1.3} d={0.85} front={1.1} tilt={tilt} cols={3} rows={2} />
          <Tube curve={leadCurve([PLACE.small[0] - 0.2, 1.1, PLACE.small[2] + 0.42], TERM3D['q+'], 0.05)} r={0.028} color={RED} />
          <Tube curve={leadCurve([PLACE.small[0] + 0.2, 1.1, PLACE.small[2] + 0.42], TERM3D['q-'], 0.05)} r={0.028} color={BLACK} />
        </>
      )}

      {/* back-row posts */}
      {m.terms.filter(k => TERM3D[k][2] < 1).map(k => (
        <mesh key={k} position={[TERM3D[k][0], TERM3D[k][1] / 2, TERM3D[k][2]]} castShadow>
          <cylinderGeometry args={[0.06, 0.08, TERM3D[k][1], 8]} />
          <meshStandardMaterial color="#8C6B4A" />
        </mesh>
      ))}

      {/* terminals */}
      {m.terms.map(k => (
        <group key={k} position={TERM3D[k]}>
          <mesh castShadow>
            <sphereGeometry args={[0.13, 14, 10]} />
            <meshStandardMaterial color={BRASS} metalness={0.6} roughness={0.35} emissive={p.selected === k ? '#0B6B47' : '#000000'} emissiveIntensity={p.selected === k ? 0.9 : 0} />
          </mesh>
          {p.selected === k && (
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.22, 0.03, 6, 20]} />
              <meshStandardMaterial color="#0B6B47" />
            </mesh>
          )}
        </group>
      ))}

      {Lv.resistor && (
        <group position={PLACE.resistor}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <capsuleGeometry args={[0.09, 0.55, 4, 10]} />
            <meshStandardMaterial color="#D8C39A" />
          </mesh>
          {[-0.15, 0, 0.15].map((x, i) => (
            <mesh key={x} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.095, 0.095, 0.05, 10]} />
              <meshStandardMaterial color={['#7A4A1E', '#2B2F2C', '#B3261E'][i]} />
            </mesh>
          ))}
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.015, 0.015, 1.3, 6]} />
            <meshStandardMaterial color="#9AA3A8" />
          </mesh>
        </group>
      )}

      {has('led') && (
        <group position={PLACE.led}>
          <mesh position={[0, 0.2, 0]} castShadow>
            <boxGeometry args={[0.6, 0.4, 0.4]} />
            <meshStandardMaterial color="#8C6B4A" />
          </mesh>
          <mesh position={[0, 0.48, 0]}>
            <cylinderGeometry args={[0.2, 0.2, 0.06, 18]} />
            <meshStandardMaterial color={m.ledOn ? '#F5C400' : '#E2DED0'} />
          </mesh>
          <mesh position={[0, 0.62, 0]} castShadow>
            <capsuleGeometry args={[0.16, 0.18, 6, 14]} />
            <meshStandardMaterial color={p.burnt ? '#5B5650' : m.ledOn ? '#FFD000' : '#F3EFE2'} emissive={m.ledOn ? '#FFC400' : '#000000'} emissiveIntensity={m.ledOn ? 1.4 : 0} transparent opacity={0.92} />
          </mesh>
          {m.ledOn && <pointLight position={[0, 0.8, 0.2]} color="#FFD54A" intensity={2.2} distance={2.5} />}
          <Tube curve={leadCurve([-0.08, 0.4, 0.15], TERM3D.lL.map((c, i) => c - PLACE.led[i]) as V3, 0.1)} r={0.018} color="#B9C0C5" />
          <Tube curve={leadCurve([0.08, 0.4, 0.15], TERM3D.lS.map((c, i) => c - PLACE.led[i]) as V3, 0.06)} r={0.018} color="#B9C0C5" />
        </group>
      )}

      {has('motor') && (
        <group position={PLACE.motor}>
          <mesh position={[0, 0.25, 0]} castShadow>
            <boxGeometry args={[0.9, 0.5, 0.5]} />
            <meshStandardMaterial color="#8C6B4A" />
          </mesh>
          <mesh position={[0.1, 0.72, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.24, 0.24, 0.75, 18]} />
            <meshStandardMaterial color="#C3C1B8" metalness={0.3} roughness={0.45} />
          </mesh>
          <mesh position={[-0.37, 0.72, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.03, 0.03, 0.3, 8]} />
            <meshStandardMaterial color="#6F6E68" />
          </mesh>
          <group ref={blades} position={[-0.52, 0.72, 0]}>
            {[0, Math.PI].map(r => (
              <mesh key={r} rotation={[r, 0, 0]} position={[0, 0, 0]}>
                <boxGeometry args={[0.04, 0.62, 0.16]} />
                <meshStandardMaterial color="#378ADD" />
              </mesh>
            ))}
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.07, 0.07, 0.08, 12]} />
              <meshStandardMaterial color="#1F5F9E" />
            </mesh>
          </group>
          <Tube curve={leadCurve([0.0, 0.96, 0], TERM3D.mA.map((c, i) => c - PLACE.motor[i]) as V3, 0.15)} r={0.018} color="#B9C0C5" />
          <Tube curve={leadCurve([0.3, 0.96, 0], TERM3D.mB.map((c, i) => c - PLACE.motor[i]) as V3, 0.15)} r={0.018} color="#B9C0C5" />
        </group>
      )}

      {has('pump') && (
        <>
          <group position={PLACE.tank}>
            <mesh position={[0, 0.3, 0]}>
              <boxGeometry args={[1.0, 0.6, 0.7]} />
              <meshStandardMaterial color="#E9F3FA" transparent opacity={0.3} depthWrite={false} side={DoubleSide} />
            </mesh>
            <mesh position={[0, 0.22, 0]}>
              <boxGeometry args={[0.96, 0.42, 0.66]} />
              <meshStandardMaterial color="#3E8FD1" transparent opacity={0.55} depthWrite={false} />
            </mesh>
            <mesh position={[0.1, 0.18, 0]}>
              <cylinderGeometry args={[0.12, 0.12, 0.28, 14]} />
              <meshStandardMaterial color={m.pumpFull ? '#F2B705' : '#3D474E'} />
            </mesh>
          </group>
          <Tube curve={tube} r={0.05} color="#7FA6BC" />
          <Tube curve={leadCurve([pumpAt[0] - 0.05, 0.36, pumpAt[2] + 0.05], TERM3D['w+'], 0.25)} r={0.018} color={RED} />
          <Tube curve={leadCurve([pumpAt[0] + 0.05, 0.36, pumpAt[2] + 0.05], TERM3D['w-'], 0.25)} r={0.018} color={BLACK} />
          {m.pumpDir !== 0 && (
            <group ref={drops}>
              {[0, 1, 2].map(i => (
                <mesh key={i} position={tube.getPoint(i / 3)}>
                  <sphereGeometry args={[m.pumpFull ? 0.07 : 0.045, 8, 6]} />
                  <meshStandardMaterial color="#2A7AB8" />
                </mesh>
              ))}
            </group>
          )}
        </>
      )}

      {/* the learner's wires, coloured by side */}
      {wireCurves.map((c, i) => <Tube key={i} curve={c} r={0.05} color={nets[i] === '+' ? RED : nets[i] === '−' ? BLACK : LOOSE} />)}
    </>
  )
}

export default function Board3D(p: Props) {
  const { level, wires, selected, sunOn, power, burnt, tilt, onPick, onRemove, onCancel, onFail } = p
  const m = boardModel(level, wires, sunOn, power, burnt)
  const cam = useRef<CamApi | null>(null)
  const [screen, setScreen] = useState<Record<string, [number, number]>>({})
  const [tick, setTick] = useState(0)
  const curves = useMemo(() => wires.map(([a, b]) => wireCurve(TERM3D[a], TERM3D[b])), [wires])
  const points = useMemo(() => {
    const out: Record<string, V3> = {}
    for (const k of m.terms) out[k] = TERM3D[k]
    curves.forEach((c, i) => { const q = c.getPoint(0.5); out[`w${i}`] = [q.x, q.y, q.z] })
    return out
  }, [m.terms, curves])
  const onMove = useMemo(() => () => setTick(n => n + 1), [])

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onCancel()
  }
  // the visible mark on each terminal button (its full name, e.g. "LED long leg +", is the button's label)
  const sign = (k: TermId) => (k.endsWith('+') || k === 'mA' || k === 'lL' ? '+' : k.endsWith('-') || k === 'mB' || k === 'lS' ? '−' : '')

  return (
    <div className="board3d" onKeyDown={onKey}>
      <div className="board3d-stage" role="group" aria-label={t('lab.board3dLabel')}>
        <Canvas frameloop="demand" shadows dpr={[1, 1.5]} camera={{ fov: 42, near: 0.1, far: 60 }} aria-hidden="true"
          onCreated={({ gl }) => gl.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); onFail() })}>
          <Bench p={p} tilt={tilt} wireCurves={curves} nets={m.wireNet} />
          <CameraRig apiRef={cam} onMove={onMove} />
          <Projector points={points} onProject={setScreen} tick={tick} />
        </Canvas>
        {m.terms.map(k => screen[k] && (
          <button key={k} type="button" className={`t3d${selected === k ? ' sel' : ''}`} style={{ left: screen[k][0], top: screen[k][1] }}
            aria-label={t(`lab.term.${k}`)} aria-pressed={p.tester ? undefined : selected === k} onClick={() => onPick(k)}>
            <span aria-hidden="true">{sign(k)}</span>
          </button>
        ))}
        {wires.map(([a, b], i) => screen[`w${i}`] && (
          <button key={`${a}-${b}`} type="button" className={`w3d ${m.wireNet[i] === '+' ? 'plus' : m.wireNet[i] === '−' ? 'minus' : 'loose'}`}
            style={{ left: screen[`w${i}`][0], top: screen[`w${i}`][1] }}
            aria-label={t('lab.removeWire', { a: t(`lab.term.${a}`), b: t(`lab.term.${b}`) })} onClick={() => onRemove(i)}>
            <span aria-hidden="true">{m.wireNet[i] ?? '×'}</span>
          </button>
        ))}
      </div>
      <div className="cam-buttons" role="group" aria-label={t('lab.cam.label')}>
        <button type="button" className="btn ghost" onClick={() => cam.current?.turn(-0.15)} aria-label={t('lab.cam.left')}><span aria-hidden="true">⟲</span></button>
        <button type="button" className="btn ghost" onClick={() => cam.current?.turn(0.15)} aria-label={t('lab.cam.right')}><span aria-hidden="true">⟳</span></button>
        <button type="button" className="btn ghost" onClick={() => cam.current?.zoom(0.85)} aria-label={t('lab.cam.in')}><span aria-hidden="true">+</span></button>
        <button type="button" className="btn ghost" onClick={() => cam.current?.zoom(1 / 0.85)} aria-label={t('lab.cam.out')}><span aria-hidden="true">−</span></button>
        <button type="button" className="btn ghost" onClick={() => cam.current?.reset()}>{t('lab.cam.reset')}</button>
      </div>
    </div>
  )
}
