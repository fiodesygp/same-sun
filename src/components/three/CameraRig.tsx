// The 3D camera shared by the Power bench and the Structure frame: orbit by drag, pinch or scroll,
// limited so the scene stays readable, fitted to the canvas, and driven by on-screen buttons too.
// Lives inside the lazy 3D chunks only (it imports three).
import { useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { Spherical, Vector3, type PerspectiveCamera } from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

export type CamApi = { turn: (d: number) => void; zoom: (k: number) => void; reset: () => void }
export type CamView = {
  target: [number, number, number]
  /** starting height angle from straight down (radians) */
  polar: number
  /** the area that must fit on screen */
  fitWidth: number
  fitHeight: number
  /** how far the camera may turn left or right (radians) */
  maxTurn: number
}

const rad = (d: number) => (d * Math.PI) / 180

export function CameraRig({ view, apiRef, onMove }: { view: CamView; apiRef: React.RefObject<CamApi | null>; onMove?: () => void }) {
  const { camera, gl, size, invalidate } = useThree()
  const ctl = useRef<OrbitControls | null>(null)
  const fit = useRef(10)

  useEffect(() => {
    const cam = camera as PerspectiveCamera
    const c = new OrbitControls(cam, gl.domElement)
    c.enablePan = false
    c.minAzimuthAngle = -view.maxTurn
    c.maxAzimuthAngle = view.maxTurn
    c.minPolarAngle = 0.55
    c.maxPolarAngle = 1.2
    c.target.set(...view.target)
    const move = () => { invalidate(); onMove?.() }
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
      turn: d => { const s = now(); place(Math.max(-view.maxTurn, Math.min(view.maxTurn, s.theta + d)), s.phi, s.radius) },
      zoom: k => { const s = now(); place(s.theta, s.phi, Math.max(c.minDistance, Math.min(c.maxDistance, s.radius * k))) },
      reset: () => place(0, view.polar, fit.current)
    }
    return () => {
      c.removeEventListener('change', move)
      c.dispose()
      apiRef.current = null
    }
  }, [camera, gl, invalidate, onMove, apiRef, view])

  // fit the scene to the canvas: far enough that all of it shows
  useEffect(() => {
    const cam = camera as PerspectiveCamera, c = ctl.current
    if (!c || !size.width) return
    const vf = rad(cam.fov), hf = 2 * Math.atan(Math.tan(vf / 2) * (size.width / size.height))
    fit.current = Math.max(view.fitWidth / 2 / Math.tan(hf / 2), view.fitHeight / 2 / Math.tan(vf / 2))
    c.maxDistance = fit.current
    c.minDistance = fit.current * 0.5
    apiRef.current?.reset()
  }, [camera, size.width, size.height, apiRef, view])
  return null
}
