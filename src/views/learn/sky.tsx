// The Sun Day scene for missions 2, 3 and the Sun Monitor: the panel's angle, the time of day
// and a cloud change the light on the panel, which runs an LED and a fan.
import { Scene } from '../../components/Scene'
import { getLang, t } from '../../i18n/t'
import { lightAt, type Light } from '../../sim/electric'
import type { Design } from '../../sim/types'
import { benchRun, BENCH_START, fanText } from './Bench'

export const TILTS = [10, 25, 40] as const
export type Tilt = (typeof TILTS)[number]
export interface Sky { tilt: Tilt; hour: number; cloud: boolean }
export const SKY_START: Sky = { tilt: 25, hour: 12, cloud: false }
export const HOURS = { from: 7, to: 18 }

export const DESIGN: Pick<Design, 'panels' | 'height' | 'weather' | 'fan' | 'pump'> = { panels: 'big', height: 'high', weather: 'october', fan: true, pump: false }

/** light on the panel, and what one panel does with the LED and the fan */
export function skyRun(s: Sky) {
  const light: Light = lightAt({ hour: s.hour, weather: 'october', tilt: s.tilt, cloud: s.cloud })
  return { light, r: benchRun({ ...BENCH_START, loads: { led: true, fan: true, pump: false } }, light.g) }
}

export const clock = (h: number) =>
  new Intl.DateTimeFormat(getLang(), { hour: 'numeric', minute: '2-digit' }).format(new Date(2026, 9, 1, Math.floor(h), Math.round((h % 1) * 60)))

export const spinSeconds = (rpm: number) => Math.min(3, Math.max(0.15, 3000 / Math.abs(rpm)))

export function SkyScene({ sky, children }: { sky: Sky; children?: React.ReactNode }) {
  const { r } = skyRun(sky)
  const label = t('learn.scene.aria', {
    tilt: sky.tilt, time: clock(sky.hour), cloud: t(sky.cloud ? 'learn.scene.cloudy' : 'learn.scene.clear'),
    led: t(r.led.on ? 'learn.state.on' : 'learn.state.off'), fan: fanText(r.fan.rpm)
  })
  return (
    <div className="scene-wrap card learn-scene">
      <Scene design={DESIGN} hour={null} idleHour={sky.hour} growth={0.6} led tilt={sky.tilt} cloud={sky.cloud}
        fanOn={r.fan.rpm > 0} fanSpin={r.fan.rpm > 0 ? spinSeconds(r.fan.rpm) : undefined} ledOn={r.led.on} label={label}>
        {children}
      </Scene>
    </div>
  )
}

export function SkyControls({ sky, onChange }: { sky: Sky; onChange: (s: Sky) => void }) {
  const set = (p: Partial<Sky>) => onChange({ ...sky, ...p })
  return (
    <div className="bench-controls">
      <fieldset>
        <legend>{t('learn.ctl.tilt')}</legend>
        <div className="seg">
          {TILTS.map(a => <button key={a} type="button" aria-pressed={sky.tilt === a} onClick={() => set({ tilt: a })}>{a}°</button>)}
        </div>
      </fieldset>
      <label className="slider">
        <span className="slider-top"><span>{t('learn.ctl.time')}</span><b className="num">{clock(sky.hour)}</b></span>
        <input type="range" min={HOURS.from} max={HOURS.to} step={0.5} value={sky.hour} aria-valuetext={clock(sky.hour)}
          onChange={e => set({ hour: Number(e.target.value) })} />
      </label>
      <button type="button" className="toggle" aria-pressed={sky.cloud} onClick={() => set({ cloud: !sky.cloud })}>
        <span className="switch" aria-hidden="true"><span className="knob" /></span>
        <span className="toggle-label">{t('learn.ctl.cloud')}</span>
        <span className="toggle-state" aria-hidden="true">{t(sky.cloud ? 'controls.on' : 'controls.off')}</span>
      </button>
    </div>
  )
}
