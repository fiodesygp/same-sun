// 2D or 3D for the Power board. 3D is the default only where it should run well: WebGL works,
// reduced motion is off, and the device does not look low-power. The learner's own choice is
// remembered on the device and wins after that (3D is never offered without WebGL).
import { load, save } from './storage'

export type View = '2d' | '3d'
export interface Device {
  webgl: boolean
  reducedMotion: boolean
  /** CPU cores, if the browser says */
  cores?: number
  /** memory in GB, if the browser says (Chrome only) */
  memoryGb?: number
  /** the Save-Data setting is on */
  saveData?: boolean
}

export const lowPower = (d: Device) => (d.cores !== undefined && d.cores <= 4) || (d.memoryGb !== undefined && d.memoryGb <= 4) || !!d.saveData
export const defaultView = (d: Device): View => (!d.webgl || d.reducedMotion || lowPower(d) ? '2d' : '3d')

/** the view to start with: the saved choice if there is one (and 3D can run), else the default */
export function startView(saved: unknown, d: Device): View {
  if (!d.webgl) return '2d'
  return saved === '2d' || saved === '3d' ? saved : defaultView(d)
}

const KEY = 'benchView'
export const loadView = () => load<unknown>(KEY, null)
export const saveView = (v: View) => save(KEY, v)

/** what this browser can do (called once in the page) */
export function detectDevice(): Device {
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } }
  let webgl = false
  try {
    const c = document.createElement('canvas')
    const gl = (c.getContext('webgl2') ?? c.getContext('webgl')) as WebGLRenderingContext | null
    webgl = !!gl
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
  } catch {
    webgl = false
  }
  return {
    webgl,
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    cores: nav.hardwareConcurrency || undefined,
    memoryGb: nav.deviceMemory,
    saveData: nav.connection?.saveData
  }
}
