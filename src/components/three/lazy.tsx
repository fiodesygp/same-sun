// Shared pieces for the lazy 3D views (Power's bench, Structure's frame). This file has no three.js
// in it, so the main bundle stays small: it only knows how to load the 3D chunk safely.
import { Component, lazy, type ComponentType, type ReactNode } from 'react'
import { t } from '../../i18n/t'
import type { CamApi } from './CameraRig'

/**
 * Can a 3D chunk load right now? Online, yes; offline, only if an earlier visit cached it. Checking
 * first matters: a browser remembers a failed import for the rest of the page's life, so a doomed
 * offline try would also block 3D after the device comes back online.
 */
export async function can3DNow(chunk: string) {
  if (navigator.onLine) return true
  try {
    const keys = await (await caches.open('samesun-3d')).keys()
    return keys.some(k => new URL(k.url).pathname.includes(`/${chunk}-`))
  } catch {
    return false
  }
}

/** a lazy 3D component that can be made fresh after a failed load, so a later try can work */
export function lazy3D<P>(load: () => Promise<{ default: ComponentType<P> }>) {
  const holder = { C: lazy(load) }
  return { get C() { return holder.C }, reset() { holder.C = lazy(load) } }
}

/** catches a 3D chunk that will not load, or a 3D view that crashes, and reports it */
export class Fallback3D extends Component<{ onFail: () => void; onReset: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {
    this.props.onReset()
    this.props.onFail()
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

/** turn, zoom and reset buttons for a 3D view (keyboard and touch) */
export function CameraButtons({ cam }: { cam: React.RefObject<CamApi | null> }) {
  return (
    <div className="cam-buttons" role="group" aria-label={t('lab.cam.label')}>
      <button type="button" className="btn ghost" onClick={() => cam.current?.turn(-0.15)} aria-label={t('lab.cam.left')}><span aria-hidden="true">⟲</span></button>
      <button type="button" className="btn ghost" onClick={() => cam.current?.turn(0.15)} aria-label={t('lab.cam.right')}><span aria-hidden="true">⟳</span></button>
      <button type="button" className="btn ghost" onClick={() => cam.current?.zoom(0.85)} aria-label={t('lab.cam.in')}><span aria-hidden="true">+</span></button>
      <button type="button" className="btn ghost" onClick={() => cam.current?.zoom(1 / 0.85)} aria-label={t('lab.cam.out')}><span aria-hidden="true">−</span></button>
      <button type="button" className="btn ghost" onClick={() => cam.current?.reset()}>{t('lab.cam.reset')}</button>
    </div>
  )
}
