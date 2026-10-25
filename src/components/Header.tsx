import { useEffect, useRef, type KeyboardEvent } from 'react'
import { t, type Key, type Lang } from '../i18n/t'
import { Logo } from './Logo'

export const TABS = [
  { id: 'home', label: 'tabs.home' },
  { id: 'sunDay', label: 'tabs.sunDay' },
  { id: 'power', label: 'tabs.power' },
  { id: 'structure', label: 'tabs.structure' },
  { id: 'growthStory', label: 'tabs.growthStory' }
] as const satisfies readonly { id: string; label: Key }[]

export type TabId = (typeof TABS)[number]['id']

type Props = { tab: TabId; onSelect: (id: TabId) => void; lang: Lang; onLang: (l: Lang) => void }

const LANGS: Lang[] = ['en', 'es']

// icons for the phone's bottom tab bar (hidden on tablet and computer)
const ICON_PROPS = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const
const ICONS: Record<TabId, React.ReactNode> = {
  home: <svg {...ICON_PROPS}><path d="M3 11 12 4l9 7" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></svg>,
  sunDay: <svg {...ICON_PROPS}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>,
  structure: <svg {...ICON_PROPS}><path d="M4 20h16" /><path d="M7 20V9M17 20V6" /><path d="M5 9l14-4" /><circle cx="7" cy="9" r="1.6" /></svg>,
  power: <svg {...ICON_PROPS}><path d="M13 2 4 14h7l-1 8 9-12h-7z" /></svg>,
  growthStory: <svg {...ICON_PROPS}><path d="M12 21V11" /><path d="M12 13c-5 0-7-3-7-7 4 0 7 2 7 7z" /><path d="M12 11c0-4 2-6 6-6 0 4-2 6-6 6z" /></svg>
}

export function Header({ tab, onSelect, lang, onLang }: Props) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const barRef = useRef<HTMLElement>(null)
  const navRef = useRef<HTMLElement>(null)

  // share the top bar and (on phones) bottom tab bar heights with CSS, for scroll padding and
  // layout, so focused items never hide under them
  useEffect(() => {
    const bar = barRef.current, nav = navRef.current
    if (!bar || !nav) return
    const root = document.documentElement.style
    const set = () => {
      root.setProperty('--header-h', `${bar.offsetHeight}px`)
      root.setProperty('--tabbar-h', getComputedStyle(nav).position === 'fixed' ? `${nav.offsetHeight}px` : '0px')
    }
    set()
    const ro = new ResizeObserver(set)
    ro.observe(bar)
    ro.observe(nav)
    return () => ro.disconnect()
  }, [])

  // arrow keys, Home and End move between tabs (WAI-ARIA tabs pattern)
  function onKeyDown(e: KeyboardEvent, i: number) {
    const n = TABS.length
    const next = { ArrowRight: (i + 1) % n, ArrowLeft: (i - 1 + n) % n, Home: 0, End: n - 1 }[e.key]
    if (next === undefined) return
    e.preventDefault()
    onSelect(TABS[next].id)
    refs.current[next]?.focus()
  }

  return (
    <header className="bar" ref={barRef}>
      <div className="bar-in">
        <div className="brand">
          <Logo />
          <div>
            <b>{t('app.name')}</b>
            <small>{t('app.tagline')}</small>
          </div>
        </div>
        <nav className="tabs" role="tablist" aria-label={t('tabs.label')} ref={navRef}>
          {TABS.map((x, i) => (
            <button
              key={x.id}
              ref={el => { refs.current[i] = el }}
              className="tab"
              role="tab"
              type="button"
              id={`t-${x.id}`}
              aria-selected={tab === x.id}
              aria-controls={`v-${x.id}`}
              tabIndex={tab === x.id ? 0 : -1}
              onClick={() => onSelect(x.id)}
              onKeyDown={e => onKeyDown(e, i)}
            >
              <span className="tab-icon" aria-hidden="true">{ICONS[x.id]}</span>
              {x.id === 'growthStory' ? (
                // under 390 px the English label does not fit a fifth of the bar, so it shortens to "Story"
                <span className="tab-label"><span className="label-full">{t(x.label)}</span><span className="label-short" aria-hidden="true">{t('tabs.growthStoryShort')}</span></span>
              ) : (
                <span className="tab-label">{t(x.label)}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="lang" role="group" aria-label={t('lang.label')}>
          {LANGS.map(l => (
            <button key={l} type="button" lang={l} aria-pressed={lang === l} onClick={() => onLang(l)}>
              {l.toUpperCase()}<span className="sr"> {t(`lang.${l}`)}</span>
            </button>
          ))}
        </div>
      </div>
    </header>
  )
}
