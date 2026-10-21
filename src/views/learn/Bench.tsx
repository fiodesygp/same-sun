// The pre-wired test bench for missions 4-7 and the Sun Monitor: one or two panels, a switch,
// a dial (potentiometer) for the fan, and an LED, a fan and a pump side by side. The drawing is a
// picture of the state; every control is an ordinary button or slider below it.
import { getLang, t, type Key } from '../../i18n/t'
import { LOADS, runBench, type Bench as BenchIn, type BenchResult, type Load, type Out } from '../../sim/electric'

export type BenchState = Omit<BenchIn, 'g'>
export type Control = 'switch' | 'pot' | 'polarity' | 'loads' | 'panels' | 'wiring'

export const BENCH_START: BenchState = {
  panels: 1, wiring: 'parallel', switchOn: true, pot: 1, reversed: false, loads: { led: true, fan: true, pump: false }
}

/** the bench sits in full sun unless a light share is given */
export const benchRun = (s: BenchState, g = 1): BenchResult => runBench({ ...s, g })

export const num = (n: number, digits = 1) =>
  new Intl.NumberFormat(getLang(), { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n)

const DEVICE: Record<Load, Key> = { led: 'learn.device.led', fan: 'learn.device.fan', pump: 'learn.device.pump' }

export function fanText(rpm: number) {
  if (rpm === 0) return t('learn.state.stopped')
  return t(rpm < 0 ? 'learn.fan.backwards' : 'learn.fan.rpm', { n: num(Math.abs(rpm), 0) })
}
export function pumpText(r: BenchResult) {
  return t(r.pump.flow === 'full' ? 'learn.state.on' : r.pump.flow === 'trickle' ? 'learn.state.trickle' : 'learn.state.off')
}

type Props = {
  state: BenchState
  onChange: (s: BenchState) => void
  controls: Control[]
  /** which numbers the readout shows: what the panels can give, or what the devices use */
  show?: 'supply' | 'drawn'
  g?: number
}

export function Bench({ state: s, onChange, controls, show = 'drawn', g = 1 }: Props) {
  const r = benchRun(s, g)
  const set = (p: Partial<BenchState>) => onChange({ ...s, ...p })
  const has = (c: Control) => controls.includes(c)
  const state = (load: Load) =>
    !s.loads[load] ? t('learn.state.notConnected')
      : load === 'led' ? t(r.led.on ? 'learn.state.on' : 'learn.state.off')
        : load === 'fan' ? fanText(r.fan.rpm) : pumpText(r)
  const aria = t('learn.bench.aria', {
    panels: t(s.panels === 1 ? 'learn.ctl.panels1' : s.wiring === 'series' ? 'learn.bench.series' : 'learn.bench.parallel'),
    sw: t(s.switchOn ? 'learn.state.on' : 'learn.state.off'), led: state('led'), fan: state('fan'), pump: state('pump')
  })

  return (
    <div className="bench stack">
      <BenchDrawing s={s} r={r} label={aria} />
      <Readouts out={show === 'supply' ? r.supply : r.drawn} title={show === 'supply' ? 'learn.read.supply' : 'learn.read.drawn'}
        rows={LOADS.filter(l => s.loads[l]).map(l => [DEVICE[l], state(l)])} />

      <div className="bench-controls">
        {has('switch') && (
          <button type="button" className="toggle" aria-pressed={s.switchOn} onClick={() => set({ switchOn: !s.switchOn })}>
            <span className="switch" aria-hidden="true"><span className="knob" /></span>
            <span className="toggle-label">{t('learn.ctl.switch')}</span>
            <span className="toggle-state" aria-hidden="true">{t(s.switchOn ? 'controls.on' : 'controls.off')}</span>
          </button>
        )}
        {has('pot') && (
          <label className="slider">
            <span className="slider-top"><span>{t('learn.ctl.pot')}</span><b className="num">{t('learn.ctl.potValue', { n: Math.round(s.pot * 100) })}</b></span>
            <input type="range" min={0} max={100} step={5} value={Math.round(s.pot * 100)}
              aria-valuetext={t('learn.ctl.potValue', { n: Math.round(s.pot * 100) })}
              onChange={e => set({ pot: Number(e.target.value) / 100 })} />
          </label>
        )}
        {has('polarity') && (
          <button type="button" className="toggle" aria-pressed={s.reversed} onClick={() => set({ reversed: !s.reversed })}>
            <span className="switch" aria-hidden="true"><span className="knob" /></span>
            <span className="toggle-label">{t('learn.ctl.flip')}</span>
            <span className="toggle-state" aria-hidden="true">{t(s.reversed ? 'controls.on' : 'controls.off')}</span>
          </button>
        )}
        {has('panels') && (
          <fieldset>
            <legend>{t('learn.ctl.panels')}</legend>
            <div className="seg">
              {([1, 2] as const).map(n => (
                <button key={n} type="button" aria-pressed={s.panels === n} onClick={() => set({ panels: n })}>{t(n === 1 ? 'learn.ctl.panels1' : 'learn.ctl.panels2')}</button>
              ))}
            </div>
          </fieldset>
        )}
        {has('wiring') && s.panels === 2 && (
          <fieldset>
            <legend>{t('learn.ctl.wiring')}</legend>
            <div className="seg">
              {(['series', 'parallel'] as const).map(w => (
                <button key={w} type="button" aria-pressed={s.wiring === w} onClick={() => set({ wiring: w })}>{t(w === 'series' ? 'learn.ctl.series' : 'learn.ctl.parallel')}</button>
              ))}
            </div>
          </fieldset>
        )}
        {has('loads') && (
          <fieldset>
            <legend>{t('learn.ctl.loads')}</legend>
            <div className="seg">
              {LOADS.map(l => (
                <button key={l} type="button" aria-pressed={s.loads[l]} onClick={() => set({ loads: { ...s.loads, [l]: !s.loads[l] } })}>
                  <span aria-hidden="true">{s.loads[l] ? '✓ ' : ''}</span>{t(DEVICE[l])}
                </button>
              ))}
            </div>
          </fieldset>
        )}
      </div>
    </div>
  )
}

/** Volts, amps and watts, then one line per device. Monospace numbers so they do not jump. */
export function Readouts({ out, title, rows }: { out: Out; title: Key; rows: [Key, string][] }) {
  return (
    <div className="readouts">
      <div className="readout-title">{t(title)}</div>
      <dl className="vaw">
        <div><dt>{t('learn.read.v')}</dt><dd className="num">{num(out.v)} V</dd></div>
        <div><dt>{t('learn.read.a')}</dt><dd className="num">{num(out.a, 2)} A</dd></div>
        <div><dt>{t('learn.read.w')}</dt><dd className="num">{num(out.w, 2)} W</dd></div>
      </dl>
      {rows.length > 0 && (
        <dl className="device-states">
          {rows.map(([k, v]) => <div key={k}><dt>{t(k)}</dt><dd>{v}</dd></div>)}
        </dl>
      )}
    </div>
  )
}

// ---------- drawing ----------

const PLUS = '#C62828', INK = '#17241D', OFF = '#9AA59E', FONT = 'Source Sans 3, system-ui, sans-serif'
const TOP = 52, BOTTOM = 178 // the + rail and the − rail
const X: Record<Load, number> = { led: 196, fan: 258, pump: 320 }

function BenchDrawing({ s, r, label }: { s: BenchState; r: BenchResult; label: string }) {
  const live = s.switchOn && r.supply.v > 0
  const plus = live ? PLUS : OFF, minus = live ? INK : OFF
  const spin = r.fan.rpm === 0 ? 0 : Math.min(3, Math.max(0.15, 3000 / Math.abs(r.fan.rpm)))
  // the devices' leads: + on top unless the polarity is flipped
  const topSign = s.reversed ? '−' : '+', bottomSign = s.reversed ? '+' : '−'

  return (
    <svg className="bench-svg" viewBox="0 0 360 200" role="img" aria-label={label}>
      <rect x="0" y="0" width="360" height="200" rx="12" fill="#FFF4D6" />

      {/* panels */}
      {[0, 1].slice(0, s.panels).map(i => {
        const y = s.panels === 1 ? 78 : 30 + i * 84
        return (
          <g key={i}>
            <rect x="12" y={y} width="62" height="40" rx="3" fill="#1D3A5F" stroke="#0E2238" strokeWidth="2" />
            <path d={`M33 ${y}v40M53 ${y}v40M12 ${y + 20}h62`} stroke="#4C79A8" strokeWidth="1.5" />
            <text x="43" y={y - 6} textAnchor="middle" fontSize="12.5" fontWeight="700" fontFamily={FONT} fill={INK}>{t('learn.svg.panel', { n: i + 1 })}</text>
            <text x="82" y={y + 10} fontSize="13" fontWeight="800" fontFamily={FONT} fill={PLUS}>+</text>
            <text x="82" y={y + 38} fontSize="13" fontWeight="800" fontFamily={FONT} fill={INK}>−</text>
          </g>
        )
      })}

      {/* how the panels join, then the + and − rails */}
      {s.panels === 1 ? (
        <>
          <path d={`M74 84H96V${TOP}H118`} fill="none" stroke={plus} strokeWidth="3" />
          <path d={`M74 112H96V${BOTTOM}H${X.pump}`} fill="none" stroke={minus} strokeWidth="3" />
        </>
      ) : s.wiring === 'parallel' ? (
        <>
          <path d={`M74 36H96M74 120H96M96 36V${TOP}M96 120V${TOP}H118`} fill="none" stroke={plus} strokeWidth="3" />
          <path d={`M74 64H104M74 148H104M104 64V${BOTTOM}H${X.pump}`} fill="none" stroke={minus} strokeWidth="3" />
        </>
      ) : (
        <>
          <path d={`M74 36H96V${TOP}H118`} fill="none" stroke={plus} strokeWidth="3" />
          <path d="M74 64H88V120H74" fill="none" stroke={live ? '#6B4F1D' : OFF} strokeWidth="3" />
          <path d={`M74 148H96V${BOTTOM}H${X.pump}`} fill="none" stroke={minus} strokeWidth="3" />
        </>
      )}
      <text x="100" y={TOP - 6} fontSize="12" fontWeight="800" fontFamily={FONT} fill={PLUS}>+</text>
      <text x="112" y={BOTTOM - 6} fontSize="12" fontWeight="800" fontFamily={FONT} fill={INK}>−</text>

      {/* switch */}
      <circle cx="118" cy={TOP} r="4" fill={INK} />
      <circle cx="150" cy={TOP} r="4" fill={INK} />
      <path d={s.switchOn ? `M118 ${TOP}L150 ${TOP}` : `M118 ${TOP}L146 ${TOP - 20}`} stroke={INK} strokeWidth="4" strokeLinecap="round" />
      <text x="134" y={TOP + 20} textAnchor="middle" fontSize="12.5" fontWeight="700" fontFamily={FONT} fill={INK}>{t('learn.svg.switch')}</text>
      <path d={`M150 ${TOP}H${X.pump}`} fill="none" stroke={plus} strokeWidth="3" />

      {/* the three devices, side by side between the rails */}
      {LOADS.map(load => {
        const x = X[load], on = s.loads[load], c = (v: string) => (on ? v : OFF)
        const mid = (TOP + BOTTOM) / 2
        return (
          <g key={load} opacity={on ? 1 : 0.55}>
            <path d={`M${x} ${TOP}V${mid - 24}`} stroke={on ? plus : OFF} strokeWidth="3" strokeDasharray={on ? undefined : '4 5'} />
            <path d={`M${x} ${mid + 24}V${BOTTOM}`} stroke={on ? minus : OFF} strokeWidth="3" strokeDasharray={on ? undefined : '4 5'} />
            {load === 'fan' && s.loads.fan && <Dial x={x} y={TOP + 18} pot={s.pot} />}
            {load === 'led' && (
              <g>
                {r.led.on && <circle cx={x} cy={mid} r="22" fill="#FFE066" opacity=".75" />}
                <circle cx={x} cy={mid} r="13" fill={r.led.on ? '#FFD000' : '#F2F2EA'} stroke={c(INK)} strokeWidth="2.5" />
              </g>
            )}
            {load === 'fan' && (
              <g className={r.fan.rpm !== 0 ? 'spin' : undefined} style={{ ['--spin' as string]: `${spin}s` }}>
                <circle cx={x} cy={mid} r="18" fill="#fff" stroke={c(INK)} strokeWidth="2.5" />
                <g className="blades" style={{ animationDirection: r.fan.rpm < 0 ? 'reverse' : undefined }}>
                  <path d={`M${x} ${mid}l-4 -14a4 4 0 0 1 8 0zM${x} ${mid}l12 8a4 4 0 0 1 -4 7zM${x} ${mid}l-12 8a4 4 0 0 0 4 7z`} fill={c('#2F6F8F')} />
                </g>
                {r.fan.rpm < 0 && <text x={x} y={mid - 26} textAnchor="middle" fontSize="16" fontWeight="800" fontFamily={FONT} fill={INK}>↺</text>}
              </g>
            )}
            {load === 'pump' && (
              <g>
                <rect x={x - 16} y={mid - 14} width="32" height="28" rx="5" fill={r.pump.flow !== 'off' ? '#8EC5E8' : '#F2F2EA'} stroke={c(INK)} strokeWidth="2.5" />
                {r.pump.flow !== 'off' && (
                  <g fill="#2A7AB8">
                    {(r.pump.flow === 'full' ? [0, 1, 2] : [0]).map(i => <circle key={i} className="drop" cx={x - 8 + i * 8} cy={mid + 22} r="2.6" />)}
                  </g>
                )}
              </g>
            )}
            <text x={x + 10} y={TOP + (load === 'fan' && s.loads.fan ? 40 : 18)} fontSize="12" fontWeight="800" fontFamily={FONT} fill={s.reversed ? INK : PLUS}>{on ? topSign : ''}</text>
            <text x={x + 10} y={BOTTOM - 10} fontSize="12" fontWeight="800" fontFamily={FONT} fill={s.reversed ? PLUS : INK}>{on ? bottomSign : ''}</text>
            <text x={x} y="196" textAnchor="middle" fontSize="12.5" fontWeight="700" fontFamily={FONT} fill={INK}>{t(DEVICE[load])}</text>
          </g>
        )
      })}
    </svg>
  )
}

/** The potentiometer: a knob whose pointer turns with the setting. */
function Dial({ x, y, pot }: { x: number; y: number; pot: number }) {
  const a = ((-135 + 270 * pot) * Math.PI) / 180
  return (
    <g>
      <circle cx={x} cy={y} r="9" fill="#fff" stroke={INK} strokeWidth="2" />
      <path d={`M${x} ${y}l${8 * Math.sin(a)} ${-8 * Math.cos(a)}`} stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
      <text x={x - 13} y={y + 4} textAnchor="end" fontSize="11.5" fontWeight="700" fontFamily={FONT} fill={INK}>{t('learn.svg.dial')}</text>
    </g>
  )
}
