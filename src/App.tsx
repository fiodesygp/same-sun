import { useState } from 'react'
import { Header, TABS, type TabId } from './components/Header'
import { BuildLab } from './views/BuildLab'
import { GrowthStory } from './views/GrowthStory'
import { Home } from './views/Home'
import { SunDay } from './views/SunDay'

export function App() {
  const [tab, setTab] = useState<TabId>('home')

  function select(id: TabId) {
    setTab(id)
    window.scrollTo(0, 0)
    // buttons inside a page (Start Sun Day, ...) hide themselves, so keep focus on the new tab
    document.getElementById(`t-${id}`)?.focus()
  }

  const views: Record<TabId, React.ReactNode> = {
    home: <Home onGo={select} />,
    sunDay: <SunDay />,
    buildLab: <BuildLab />,
    growthStory: <GrowthStory active={tab === 'growthStory'} />
  }

  // every view stays mounted (hidden when inactive) so a tab keeps its state when you switch away
  return (
    <>
      <Header tab={tab} onSelect={select} />
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
