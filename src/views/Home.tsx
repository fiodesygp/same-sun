import { Scene } from '../components/Scene'
import type { TabId } from '../components/Header'
import { t } from '../i18n/t'

const HERO_DESIGN = { panels: 'both', height: 'high', weather: 'october', fan: true, pump: false } as const

type Props = { onGo: (tab: TabId) => void }

export function Home({ onGo }: Props) {
  return (
    <>
      <div className="hero">
        <div className="hero-text">
          <div className="eyebrow maroon">{t('home.eyebrow')}</div>
          <h1 className="big">{t('home.title')}</h1>
          <p className="lede">{t('home.lede')}</p>
          <div className="dq">
            <div className="eyebrow">{t('home.dqLabel')}</div>
            <p>{t('home.dq')}</p>
          </div>
          <div className="row wrap">
            <button className="btn" type="button" onClick={() => onGo('sunDay')}>{t('home.start')}</button>
            <button className="btn ghost" type="button" onClick={() => onGo('buildLab')}>{t('home.wire')}</button>
          </div>
        </div>
        <div className="card scene-wrap">
          <Scene design={HERO_DESIGN} hour={null} growth={0.7} idleHour={9.5} led label={t('home.heroLabel')} />
        </div>
      </div>

      <div>
        <h2 className="h2">{t('home.whatTitle')}</h2>
        <div className="trio">
          <div className="card feat">
            <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
              <circle cx="14" cy="14" r="5" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M14 2v4M14 22v4M2 14h4M22 14h4M5.5 5.5l2.8 2.8M19.7 19.7l2.8 2.8M5.5 22.5l2.8-2.8M19.7 8.3l2.8-2.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <h3>{t('home.panelTitle')}</h3>
            <p>{t('home.panelText')}</p>
          </div>
          <div className="card feat">
            <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
              <path d="M14 26V13M14 15c-6 0-8-4-8-8 5 0 8 3 8 8zM14 13c0-5 3-8 8-8 0 4-2 8-8 8z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            </svg>
            <h3>{t('home.plantsTitle')}</h3>
            <p>{t('home.plantsText')}</p>
          </div>
          <div className="card feat">
            <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
              <path d="M5 25V9l18-4v20M5 13h18M11 25v-6h6v6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            </svg>
            <h3>{t('home.designTitle')}</h3>
            <p>{t('home.designText')}</p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="h2">{t('home.howTitle')}</h2>
        <p className="lede">{t('home.howLede')}</p>
        <div className="trio steps">
          <button className="card step" type="button" onClick={() => onGo('sunDay')}>
            <span className="tag">{t('home.step1Tag')}</span>
            <span className="step-title">{t('home.step1Title')}</span>
            <span className="step-text">{t('home.step1Text')}</span>
            <span className="go">{t('home.step1Go')}</span>
          </button>
          <button className="card step" type="button" onClick={() => onGo('buildLab')}>
            <span className="tag">{t('home.step2Tag')}</span>
            <span className="step-title">{t('home.step2Title')}</span>
            <span className="step-text">{t('home.step2Text')}</span>
            <span className="go">{t('home.step2Go')}</span>
          </button>
          <button className="card step" type="button" onClick={() => onGo('growthStory')}>
            <span className="tag">{t('home.step3Tag')}</span>
            <span className="step-title">{t('home.step3Title')}</span>
            <span className="step-text">{t('home.step3Text')}</span>
            <span className="go">{t('home.step3Go')}</span>
          </button>
        </div>
      </div>
    </>
  )
}
