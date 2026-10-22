import { useEffect, useState } from 'react'
import { LINKS } from '../config/links'
import { Scene } from '../components/Scene'
import type { TabId } from '../components/Header'
import { t } from '../i18n/t'
import { growthStoryStore } from '../lib/growthStory'
import { loadLearn, STEPS, stepsDone } from '../lib/learn'
import { bestScore } from '../lib/runs'
import { MATERIAL_IDS } from '../structure/materials'
import { loadStructure } from '../structure/progress'

const HERO_DESIGN = { panels: 'both', height: 'high', weather: 'october', fan: true, pump: true } as const
// the sun crosses the sky once every 40 s; the scene is redrawn about 12 times a second
const DAY_MS = 40000, FRAME_MS = 80, SUNRISE = 6.4, SUNSET = 18.6
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

type Progress = { best: number | null; solved: number; materials: number; stories: number }

const ICON_PROPS = { width: 28, height: 28, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const
const ICONS = {
  sun: <svg {...ICON_PROPS}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>,
  bolt: <svg {...ICON_PROPS}><path d="M13 2 4 14h7l-1 8 9-12h-7z" /></svg>,
  frame: <svg {...ICON_PROPS}><path d="M4 20h16" /><path d="M7 20V9M17 20V6" /><path d="M5 9l14-4" /><circle cx="7" cy="9" r="1.6" /></svg>,
  sprout: <svg {...ICON_PROPS}><path d="M12 21V11" /><path d="M12 13c-5 0-7-3-7-7 4 0 7 2 7 7z" /><path d="M12 11c0-4 2-6 6-6 0 4-2 6-6 6z" /></svg>,
  panel: <svg {...ICON_PROPS}><path d="M3 9 19 5l2 6-16 4z" /><path d="M8 14v6M16 12v8" /></svg>,
  decide: <svg {...ICON_PROPS}><path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /></svg>
}

type Props = { onGo: (tab: TabId) => void; active: boolean }

export function Home({ onGo, active }: Props) {
  const [hour, setHour] = useState(10)
  const [progress, setProgress] = useState<Progress>({ best: null, solved: 0, materials: 0, stories: 0 })

  // the sun moves along its arc while Home is open (still with reduced motion)
  useEffect(() => {
    if (!active || reducedMotion()) return
    const t0 = performance.now() - ((10 - SUNRISE) / (SUNSET - SUNRISE)) * DAY_MS
    let id = 0, last = 0
    const tick = (now: number) => {
      if (now - last >= FRAME_MS) {
        last = now
        setHour(SUNRISE + (((now - t0) % DAY_MS) / DAY_MS) * (SUNSET - SUNRISE))
      }
      id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [active])

  // progress read from this device each time Home opens
  useEffect(() => {
    if (!active) return
    setProgress(p => ({ ...p, best: bestScore(), solved: stepsDone(loadLearn()), materials: loadStructure().checked.length }))
    growthStoryStore.all().then(xs => setProgress(p => ({ ...p, stories: xs.length })), () => setProgress(p => ({ ...p, stories: 0 })))
  }, [active])

  const missions = [
    { tab: 'sunDay', icon: ICONS.sun, title: t('tabs.sunDay'), goal: t('home.m.sunDay.goal'),
      progress: progress.best === null ? t('home.m.sunDay.none') : t('home.m.sunDay.progress', { score: progress.best }) },
    { tab: 'power', icon: ICONS.bolt, title: t('tabs.power'), goal: t('home.m.power.goal'),
      progress: t('home.m.power.progress', { n: progress.solved, total: STEPS.length }) },
    { tab: 'structure', icon: ICONS.frame, title: t('tabs.structure'), goal: t('home.m.structure.goal'),
      progress: t('home.m.structure.materials', { n: progress.materials, total: MATERIAL_IDS.length }) },
    { tab: 'growthStory', icon: ICONS.sprout, title: t('growthStory.eyebrow'), goal: t('home.m.growthStory.goal'),
      progress: progress.stories ? t('home.m.growthStory.progress', { n: progress.stories }) : t('home.m.growthStory.none') }
  ] as const

  return (
    <>
      <div className="splash">
        <div className="sky-band">
          <Scene className="band-scene" design={HERO_DESIGN} hour={null} growth={0.7} idleHour={hour} led shadows={false} label={t('home.heroLabel')} />
        </div>
        <div className="splash-body">
          <div className="splash-title">
            <h1 className="game-title">{t('app.name')}</h1>
            <p className="game-tagline">{t('home.tagline')}</p>
          </div>
          <div className="splash-mission">
            <div className="mission">
              <div className="mission-label">{t('home.missionLabel')}</div>
              <p>{t('home.mission')}</p>
            </div>
            <div className="big-question">
              <div className="big-question-label">{t('home.bigQuestionLabel')}</div>
              <p>{t('home.bigQuestion')}</p>
            </div>
            <div className="row wrap">
              <button className="btn play" type="button" onClick={() => onGo('sunDay')}>
                <svg width="16" height="16" viewBox="0 0 14 14" aria-hidden="true"><path d="M2 1 L13 7 L2 13 Z" fill="currentColor" /></svg>
                {t('home.start')}
              </button>
              <button className="btn ghost" type="button" onClick={() => onGo('power')}>{t('home.wire')}</button>
            </div>
          </div>
        </div>
      </div>

      <ul className="how-chips" aria-label={t('home.chipsLabel')}>
        <li>{ICONS.panel}{t('home.chip.panel')}</li>
        <li>{ICONS.sprout}{t('home.chip.plant')}</li>
        <li>{ICONS.decide}{t('home.chip.decide')}</li>
      </ul>

      <section aria-labelledby="missions-title">
        <h2 className="h2" id="missions-title">{t('home.missionsTitle')}</h2>
        <div className="trio missions">
          {missions.map(m => (
            // the progress line is part of each button's name, so screen readers read it with the goal
            <button key={m.tab} type="button" className={`card mission-card ${m.tab}`} onClick={() => onGo(m.tab)}>
              <span className="mission-icon">{m.icon}</span>
              <span className="mission-title">{m.title}</span>
              <span className="mission-goal">{m.goal}</span>
              <span className="mission-progress">{m.progress}</span>
            </button>
          ))}
        </div>
      </section>

      <footer className="home-foot">
        <p>{t('home.credits')}</p>
        <p>{t('home.estimates')}</p>
        {LINKS.projectSite && (
          <a href={LINKS.projectSite} target="_blank" rel="noopener noreferrer">
            {t('home.siteLink')} <span className="sr">{t('home.newTab')}</span>
          </a>
        )}
      </footer>
    </>
  )
}
