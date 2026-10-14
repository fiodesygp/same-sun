import { useState } from 'react'
import { Header, TABS, type TabId } from './components/Header'
import { BuildLab } from './views/BuildLab'
import { GrowthStory } from './views/GrowthStory'
import { Home } from './views/Home'
import { SunDay } from './views/SunDay'

const VIEWS: Record<TabId, () => React.JSX.Element> = { home: Home, sunDay: SunDay, buildLab: BuildLab, growthStory: GrowthStory }

export function App() {
  const [tab, setTab] = useState<TabId>('home')

  function select(id: TabId) {
    setTab(id)
    window.scrollTo(0, 0)
  }

  // every view stays mounted (hidden when inactive) so a tab keeps its state when you switch away
  return (
    <>
      <Header tab={tab} onSelect={select} />
      <main>
        {TABS.map(({ id }) => {
          const View = VIEWS[id]
          return (
            <section key={id} className="view" id={`v-${id}`} role="tabpanel" aria-labelledby={`t-${id}`} hidden={tab !== id}>
              <View />
            </section>
          )
        })}
      </main>
    </>
  )
}
