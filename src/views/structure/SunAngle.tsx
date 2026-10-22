// The sun angle demo: drag the time of day and see the panel's power change as its tilt faces the
// sun more or less. Uses the same light model as the Power missions (src/sim/electric.ts).
import { useState } from 'react'
import config from '../../config/structure.json'
import { t } from '../../i18n/t'
import { lightAt, panelOut } from '../../sim/electric'
import { sunAt } from '../../sim/simulate'
import defaultModel from '../../config/model.json'
import { num } from '../power/Bench'
import { clock, HOURS } from '../power/sky'

const rad = (d: number) => (d * Math.PI) / 180
const MAX_W = 1

export function SunAngle({ canTilt }: { canTilt: boolean }) {
  const [hour, setHour] = useState(12)
  const [picked, setTilt] = useState(25)
  // a frame stuck at one angle stays at 25° here
  const tilt = canTilt ? picked : 25
  const g = lightAt({ hour, weather: 'october', tilt }).g
  const w = panelOut(g).w
  const { elev } = sunAt(hour, defaultModel.weather.october)
  // the drawing: the sun rises on the left, is highest at midday, and sets on the right
  const cx = 180, cy = 150, R = 110
  const sy = cy - R * Math.sin(rad(elev))
  const sunX = hour < 12.5 ? cx - R * Math.cos(rad(elev)) : cx + R * Math.cos(rad(elev))
  const L = 56, p1 = [cx - (L / 2) * Math.cos(rad(tilt)), cy - 8 + (L / 2) * Math.sin(rad(tilt))], p2 = [cx + (L / 2) * Math.cos(rad(tilt)), cy - 8 - (L / 2) * Math.sin(rad(tilt))]

  return (
    <section className="card sun-angle" aria-labelledby="st-sun">
      <h3 className="card-title" id="st-sun">{t('st.sun.title')}</h3>
      <p className="hint flat">{t('st.sun.hint')}</p>
      <svg className="sun-svg" viewBox="0 0 360 170" role="img" aria-label={t('st.sun.alt', { time: clock(hour), tilt, w: num(w, 2) })}>
        <rect x={0} y={0} width={360} height={170} rx={12} fill="#EAF4F8" />
        <path d={`M${cx - R} ${cy}A${R} ${R} 0 0 1 ${cx + R} ${cy}`} fill="none" stroke="#C9D3DA" strokeWidth={2} strokeDasharray="4 5" />
        <rect x={0} y={cy} width={360} height={20} fill="#C9A779" />
        {elev > 0 && (
          <>
            <path d={`M${sunX} ${sy}L${cx} ${cy - 8}`} stroke="#F2B705" strokeWidth={2} strokeDasharray="6 5" />
            <circle cx={sunX} cy={sy} r={12} fill="#F2B705" />
          </>
        )}
        <path d={`M${p1[0]} ${p1[1]}L${p2[0]} ${p2[1]}`} stroke="#1B3E66" strokeWidth={7} strokeLinecap="round" />
        <path d={`M${cx} ${cy - 8}V${cy}`} stroke="#8A7A62" strokeWidth={3} />
        <text x={cx} y={cy + 16} textAnchor="middle" fontSize={12} fontWeight={700} fontFamily="Source Sans 3, sans-serif" fill="#2B2F2C">{tilt}°</text>
      </svg>
      <div className="power-meter">
        <div className="slider-top"><span>{t('learn.m2.power')}</span><b className="num">{num(w, 2)} W</b></div>
        <div className="learn-bar" aria-hidden="true"><i style={{ width: `${Math.min(100, (w / MAX_W) * 100)}%` }} /></div>
      </div>
      <label className="slider">
        <span className="slider-top"><span>{t('learn.ctl.time')}</span><b className="num">{clock(hour)}</b></span>
        <input type="range" min={HOURS.from} max={HOURS.to} step={0.5} value={hour} aria-valuetext={`${clock(hour)}, ${num(w, 2)} W`}
          onChange={e => setHour(Number(e.target.value))} />
      </label>
      {canTilt ? (
        <fieldset>
          <legend>{t('learn.ctl.tilt')}</legend>
          <div className="seg">
            {config.angles.map(a => <button key={a} type="button" aria-pressed={picked === a} onClick={() => setTilt(a)}>{a}°</button>)}
          </div>
        </fieldset>
      ) : <p className="flat try-next">{t('st.sun.stuck')}</p>}
    </section>
  )
}
