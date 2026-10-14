import { useRef, type KeyboardEvent } from 'react'
import { t, type Key } from '../i18n/t'
import { Logo } from './Logo'

export const TABS = [
  { id: 'home', label: 'tabs.home' },
  { id: 'sunDay', label: 'tabs.sunDay' },
  { id: 'buildLab', label: 'tabs.buildLab' },
  { id: 'growthStory', label: 'tabs.growthStory' }
] as const satisfies readonly { id: string; label: Key }[]

export type TabId = (typeof TABS)[number]['id']

type Props = { tab: TabId; onSelect: (id: TabId) => void }

export function Header({ tab, onSelect }: Props) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])

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
    <header className="bar">
      <div className="bar-in">
        <div className="brand">
          <Logo />
          <div>
            <b>{t('app.name')}</b>
            <small>{t('app.tagline')}</small>
          </div>
        </div>
        <nav className="tabs" role="tablist" aria-label={t('tabs.label')}>
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
              {t(x.label)}
            </button>
          ))}
        </nav>
      </div>
    </header>
  )
}
