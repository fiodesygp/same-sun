import { useEffect, useState } from 'react'
import { Header, TABS, type TabId } from './components/Header'
import { setLang, type Lang } from './i18n/t'
import { load, save } from './lib/storage'
import { BuildLab } from './views/BuildLab'
import { GrowthStory } from './views/GrowthStory'
import { Home } from './views/Home'
import { SunDay } from './views/SunDay'

const savedLang = (): Lang => (load<string>('lang', 'en') === 'es' ? 'es' : 'en')

export function App() {
  const [tab, setTab] = useState<TabId>('home')
  const [lang, setLangState] = useState<Lang>(savedLang)
  // t() reads the language when each view renders, so set it before rendering the tree
  setLang(lang)

  useEffect(() => {
    document.documentElement.lang = lang
    save('lang', lang)
  }, [lang])

  function select(id: TabId) {
    setTab(id)
    window.scrollTo(0, 0)
    // buttons inside a page (Start Sun Day, ...) hide themselves, so keep focus on the new tab
    document.getElementById(`t-${id}`)?.focus()
  }

  const views: Record<TabId, React.ReactNode> = {
    home: <Home onGo={select} active={tab === 'home'} />,
    sunDay: <SunDay />,
    buildLab: <BuildLab />,
    growthStory: <GrowthStory active={tab === 'growthStory'} />
  }

  // every view stays mounted (hidden when inactive) so a tab keeps its state when you switch away
  return (
    <>
      <Header tab={tab} onSelect={select} lang={lang} onLang={setLangState} />
      <main>
        {TABS.map(({ id }) => (
          <section key={id} className={`view ${id}`} id={`v-${id}`} role="tabpanel" aria-labelledby={`t-${id}`} hidden={tab !== id}>
            {views[id]}
          </section>
        ))}
      </main>
    </>
  )
}
