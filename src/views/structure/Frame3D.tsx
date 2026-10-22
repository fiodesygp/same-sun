// Structure's finished frame in 3D: the same design as the 2D drawing, built from simple shapes on a
// table (pot, dome and cup; posts; hinge; angle stop; tray; panel). Loaded on demand as its own
// chunk, like Power's bench, and drawn only when something changes.
import { Canvas } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { DoubleSide } from 'three'
import config from '../../config/structure.json'
import { CameraRig, type CamApi } from '../../components/three/CameraRig'
import { CameraButtons } from '../../components/three/lazy'
import { cellTexture } from '../../components/three/textures'
import type { Design } from '../../structure/options'
import { attach, frame } from '../../structure/rules'

const U = 0.25 // scene units per cm
const CAM = { target: [0, 3.0, 0] as [number, number, number], polar: 1.12, fitWidth: 5.6, fitHeight: 7.6, maxTurn: 0.9 }
const rad = (d: number) => (d * Math.PI) / 180
const FRONT = 0.75, BACK = -0.75, SIDE = 0.75 // post positions (z front/back, x left/right)
const WOOD = '#E2C48E', RED = '#C0392B', GREEN = '#2F9E6A', STRAW = '#E58A3A'

type Props = { design: Design; angle: number; label: string; onFail: () => void }

function Post({ x, z, h, kind }: { x: number; z: number; h: number; kind: Design['posts'] }) {
  if (kind === 'stick') return <mesh position={[x, h / 2, z]} castShadow><boxGeometry args={[0.14, h, 0.04]} /><meshStandardMaterial color={WOOD} /></mesh>
  return (
    <mesh position={[x, h / 2, z]} castShadow>
      <cylinderGeometry args={[kind === 'pipe' ? 0.05 : 0.07, kind === 'pipe' ? 0.05 : 0.07, h, 10]} />
      <meshStandardMaterial color={kind === 'pipe' ? GREEN : STRAW} roughness={kind === 'pipe' ? 1 : 0.5} />
    </mesh>
  )
}

function Scene({ d, angle }: { d: Design; angle: number }) {
  const tex = useMemo(() => cellTexture(4, 3), [])
  const a = attach(d), f = frame(d)
  const baseH = config.base[d.base].height * U
  const hasPosts = d.posts !== 'none'
  const postH = hasPosts ? config.posts[d.posts].height * U : 0
  const wedgeOnly = d.posts === 'none' && d.stop === 'wedges'
  // the panel's pose: tilted with a hinge and a stop, flopped with only a hinge, flat otherwise
  const pose = wedgeOnly || (f.hinge && f.stop) ? angle : f.hinge ? -38 : 0
  const hingeY = baseH + (f.standing ? postH : 0)
  const contact = (g: number) => hingeY + (FRONT - BACK) * Math.tan(rad(g))
  const backH = postH + (FRONT - BACK) * Math.tan(rad(40)) + 0.1
  const lean = f.standing ? 0 : 0.5

  return (
    <>
      <color attach="background" args={['#F6F0E3']} />
      <hemisphereLight args={['#ffffff', '#d8c9a8', 0.8]} />
      <directionalLight position={[3, 7, 4]} intensity={2} castShadow shadow-mapSize={[768, 768]} shadow-camera-left={-4} shadow-camera-right={4} shadow-camera-top={4} shadow-camera-bottom={-4} />
      <mesh position={[0, -0.1, 0]} receiveShadow><boxGeometry args={[6, 0.2, 4.5]} /><meshStandardMaterial color="#DDBF94" roughness={0.9} /></mesh>

      {/* pot, plant and dome */}
      <mesh position={[0, 0.3, 0]} castShadow><cylinderGeometry args={[0.5, 0.38, 0.6, 20]} /><meshStandardMaterial color="#B8693E" /></mesh>
      {[[-0.14, 0.95, 0.4], [0.14, 1.05, -0.4], [-0.1, 0.8, 0.6], [0.1, 0.85, -0.6]].map(([x, y, r], i) => (
        <mesh key={i} position={[x, y, 0]} rotation={[0, 0, r]} scale={[1, 0.35, 0.6]}><sphereGeometry args={[0.16, 10, 8]} /><meshStandardMaterial color="#3E9B4F" /></mesh>
      ))}
      <mesh position={[0, 0.6, 0]} scale={[1, (config.plant.domeTop * U - 0.6) / 0.62, 1]}>
        <sphereGeometry args={[0.62, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#BFE3F2" transparent opacity={0.25} depthWrite={false} side={DoubleSide} />
      </mesh>

      {/* base */}
      {d.base === 'cup' && (
        <group>
          <mesh position={[0, baseH / 2, 0]}>
            <cylinderGeometry args={[0.85, 1.25, baseH, 28, 1, true]} />
            <meshStandardMaterial color="#E6F2F8" transparent opacity={0.22} depthWrite={false} side={DoubleSide} />
          </mesh>
          {d.cupOpen
            ? <mesh position={[0, baseH, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.85, 0.03, 6, 28]} /><meshStandardMaterial color="#7FA6BC" /></mesh>
            : <mesh position={[0, baseH, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.85, 28]} /><meshStandardMaterial color="#CFE6F1" transparent opacity={0.6} side={DoubleSide} /></mesh>}
        </group>
      )}
      {d.base === 'tower' && [[-SIDE, FRONT], [SIDE, FRONT], [-SIDE, BACK], [SIDE, BACK]].map(([x, z], i) => (
        <mesh key={i} position={[x, baseH / 2, z]} castShadow><boxGeometry args={[0.14, baseH, 0.14]} /><meshStandardMaterial color={WOOD} /></mesh>
      ))}
      {d.base === 'tower' && <mesh position={[0, baseH, 0]} castShadow><boxGeometry args={[1.7, 0.06, 1.7]} /><meshStandardMaterial color={WOOD} /></mesh>}
      {d.base === 'easel' && [FRONT, BACK].map(z => (
        <mesh key={z} position={[0, baseH / 2, z]} rotation={[0, 0, Math.PI / 4]} castShadow>
          <boxGeometry args={[baseH * 1.2, baseH * 1.2, 0.02]} /><meshStandardMaterial color="#F4E9D2" side={DoubleSide} />
        </mesh>
      ))}

      {/* posts: two at the front, two taller ones at the back */}
      {hasPosts && (
        <group position={[0, baseH, 0]} rotation={[lean, 0, 0]}>
          {[-SIDE, SIDE].map(x => <Post key={`f${x}`} x={x} z={FRONT} h={postH} kind={d.posts} />)}
          {[-SIDE, SIDE].map(x => <Post key={`b${x}`} x={x} z={BACK} h={backH} kind={d.posts} />)}
          {f.standing && d.join === 'bands' && [[-SIDE, FRONT], [SIDE, FRONT], [-SIDE, BACK], [SIDE, BACK]].map(([x, z], i) => (
            <mesh key={i} position={[x, 0.12, z]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.1, 0.025, 6, 14]} /><meshStandardMaterial color={RED} /></mesh>
          ))}
          {f.standing && d.join === 'tape' && [[-SIDE, FRONT], [SIDE, FRONT], [-SIDE, BACK], [SIDE, BACK]].map(([x, z], i) => (
            <mesh key={i} position={[x, 0.12, z]}><boxGeometry args={[0.2, 0.14, 0.2]} /><meshStandardMaterial color="#F0E6CC" /></mesh>
          ))}
        </group>
      )}

      {/* hinge across the front posts */}
      {f.hinge && !wedgeOnly && !a.hinge && (
        d.hinge === 'axle'
          ? <mesh position={[0, hingeY, FRONT]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.035, 0.035, SIDE * 2 + 0.2, 8]} /><meshStandardMaterial color="#4F7FB0" /></mesh>
          : <>{[-SIDE, SIDE].map(x => (
            <mesh key={x} position={[x, hingeY, FRONT]} rotation={[0, Math.PI / 2, 0]}>
              <torusGeometry args={[0.09, 0.025, 6, 14]} />
              <meshStandardMaterial color={d.hinge === 'eyeLoops' ? GREEN : d.hinge === 'fig8' ? RED : '#F0E6CC'} />
            </mesh>
          ))}</>
      )}

      {/* angle stops on the back posts, or a wedge on the cup */}
      {hasPosts && !a.stop && d.stop !== 'none' && d.stop !== 'wedges' && [-SIDE, SIDE].map(x => (
        <group key={x}>
          {(d.stop === 'bandStops' || d.stop === 'clothespin' ? [pose > 0 ? pose : 25] : config.angles).map(g => (
            <mesh key={g} position={[x, contact(g) - 0.08, BACK]} rotation={d.stop === 'ladder' ? [0, Math.PI / 2, 0] : [Math.PI / 2, 0, 0]}>
              {d.stop === 'notches' || d.stop === 'clothespin'
                ? <boxGeometry args={[0.16, 0.06, d.stop === 'clothespin' ? 0.3 : 0.08]} />
                : <torusGeometry args={[0.09, 0.025, 6, 14]} />}
              <meshStandardMaterial color={d.stop === 'ladder' ? GREEN : d.stop === 'bandStops' ? RED : d.stop === 'notches' ? '#9C7A45' : WOOD} />
            </mesh>
          ))}
        </group>
      ))}
      {d.stop === 'wedges' && (
        <mesh position={[0, baseH + (config.wedgeHeight * U) / 2, wedgeOnly ? -0.35 : BACK]} castShadow>
          <boxGeometry args={[1.4, config.wedgeHeight * U, 0.3]} /><meshStandardMaterial color="#F4E9D2" />
        </mesh>
      )}

      {/* the panel on its holder, turning on the hinge */}
      <group position={[0, wedgeOnly ? baseH : hingeY, wedgeOnly ? 0.6 : FRONT]} rotation={[rad(pose), 0, 0]}>
        <group position={[0, 0.05, -0.85]}>
          {d.holder === 'tray' && (
            <>
              <mesh position={[0, -0.04, 0]}><boxGeometry args={[1.95, 0.03, 1.8]} /><meshStandardMaterial color="#F4E9D2" /></mesh>
              <mesh position={[0, 0.04, 0.9]}><boxGeometry args={[1.95, 0.16, 0.03]} /><meshStandardMaterial color="#F4E9D2" /></mesh>
              {[-0.5, 0.5].map(x => <mesh key={x} position={[x, 0, 0]} rotation={[0, Math.PI / 2, 0]}><torusGeometry args={[0.9, 0.012, 4, 24, Math.PI]} /><meshStandardMaterial color={RED} /></mesh>)}
            </>
          )}
          <mesh castShadow><boxGeometry args={[1.8, 0.05, 1.6]} /><meshStandardMaterial color="#9AA3A8" metalness={0.3} roughness={0.5} /></mesh>
          <mesh position={[0, 0.027, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[1.72, 1.52]} /><meshStandardMaterial map={tex} roughness={0.35} /></mesh>
          {d.holder === 'tape' && [-0.7, 0.7].map(x => <mesh key={x} position={[x, 0.03, 0.75]}><boxGeometry args={[0.2, 0.02, 0.3]} /><meshStandardMaterial color="#F0E6CC" /></mesh>)}
        </group>
      </group>
    </>
  )
}

export default function Frame3D({ design, angle, label, onFail }: Props) {
  const cam = useRef<CamApi | null>(null)
  return (
    <div className="board3d">
      <div className="board3d-stage frame3d" role="img" aria-label={label}>
        <Canvas frameloop="demand" shadows dpr={[1, 1.5]} camera={{ fov: 42, near: 0.1, far: 60 }} aria-hidden="true"
          onCreated={({ gl }) => gl.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); onFail() })}>
          <Scene d={design} angle={angle} />
          <CameraRig view={CAM} apiRef={cam} />
        </Canvas>
      </div>
      <CameraButtons cam={cam} />
    </div>
  )
}
