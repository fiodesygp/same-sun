// A card for one thing in the kit (a Power part or a Structure material): its drawing, four tabs
// (the ARIA tabs pattern, arrow keys move between them) and a one-question quick check.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { t } from '../i18n/t'

export type CardTab = { id: string; label: string; content: ReactNode }
export type QuickCheck = {
  question: string
  choices: { id: string; label: string }[]
  /** answered right before */
  checked: boolean
  /** answer it; returns whether the answer was right */
  onAnswer: (choice: string) => boolean
  /** what to say after an answer: why it is right, or a hint */
  feedback: (right: boolean) => string
}

type Props = {
  title: string
  icon: ReactNode
  figure: ReactNode
  tabs: CardTab[]
  /** shown under the title (for example a facility check tag) */
  tag?: ReactNode
  backLabel: string
  onBack: () => void
  check: QuickCheck
}

export function InfoCard({ title, icon, figure, tabs, tag, backLabel, onBack, check }: Props) {
  const [tab, setTab] = useState(tabs[0].id)
  const [answer, setAnswer] = useState<{ choice: string; right: boolean } | null>(null)
  const backRef = useRef<HTMLButtonElement>(null)
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  useEffect(() => backRef.current?.focus(), [])
  const ids = tabs.map(x => x.id), n = ids.length

  function onKey(e: React.KeyboardEvent) {
    const i = ids.indexOf(tab)
    const next = e.key === 'ArrowRight' ? ids[(i + 1) % n] : e.key === 'ArrowLeft' ? ids[(i + n - 1) % n] : e.key === 'Home' ? ids[0] : e.key === 'End' ? ids[n - 1] : null
    if (!next) return
    e.preventDefault()
    setTab(next)
    tabRefs.current[next]?.focus()
  }

  return (
    <article className="mission-view" aria-labelledby="part-title">
      <button className="back" type="button" ref={backRef} onClick={onBack}>{backLabel}</button>
      <header className="mission-head deck-tool part-head">
        <span className="part-icon">{icon}</span>
        <h1 id="part-title" className="page-title">{title}</h1>
        {tag && <div className="part-tag">{tag}</div>}
      </header>

      <figure className="part-figure">{figure}</figure>

      <div className="card part-card">
        <div className="part-tabs" role="tablist" aria-label={title} onKeyDown={onKey}>
          {tabs.map(x => (
            <button key={x.id} type="button" role="tab" id={`pt-${x.id}`} aria-controls="part-panel" aria-selected={tab === x.id} tabIndex={tab === x.id ? 0 : -1}
              ref={el => { tabRefs.current[x.id] = el }} onClick={() => setTab(x.id)}>{x.label}</button>
          ))}
        </div>
        <div className="part-panel" role="tabpanel" id="part-panel" aria-labelledby={`pt-${tab}`} tabIndex={0}>
          {tabs.find(x => x.id === tab)?.content}
        </div>
      </div>

      <section className="card quick-check" aria-labelledby="qc-title">
        <h2 className="card-title" id="qc-title">{t('learn.check.title')}</h2>
        <fieldset>
          <legend className="qc-question">{check.question}</legend>
          <div className="seg">
            {check.choices.map(c => (
              <button key={c.id} type="button" aria-pressed={answer?.choice === c.id}
                onClick={() => setAnswer({ choice: c.id, right: check.onAnswer(c.id) })}>{c.label}</button>
            ))}
          </div>
        </fieldset>
        <p className={`qc-result${answer ? (answer.right ? ' ok' : ' no') : ''}`} role="status">
          {answer ? <><span aria-hidden="true">{answer.right ? '✓ ' : '✗ '}</span>{t(answer.right ? 'learn.check.right' : 'learn.check.wrong')} {check.feedback(answer.right)}</>
            : check.checked ? <><span aria-hidden="true">✓ </span>{t('learn.check.before')}</> : ''}
        </p>
      </section>
    </article>
  )
}
