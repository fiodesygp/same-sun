// A card for one thing in the kit (a Power part or a Structure material): its drawing, four tabs
// (the ARIA tabs pattern, arrow keys move between them) and a one-question quick check.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { t } from '../i18n/t'
import { tabColumns } from '../lib/tabFit'

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
  /** shown after the quick check (for example "Start building" on the last card) */
  footer?: ReactNode
}

export function InfoCard({ title, icon, figure, tabs, tag, backLabel, onBack, check, footer }: Props) {
  const [tab, setTab] = useState(tabs[0].id)
  const [answer, setAnswer] = useState<{ choice: string; right: boolean } | null>(null)
  const backRef = useRef<HTMLButtonElement>(null)
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const listRef = useRef<HTMLDivElement>(null)
  const [cols, setCols] = useState<number>()
  useEffect(() => backRef.current?.focus(), [])
  const ids = tabs.map(x => x.id), n = ids.length
  const labels = tabs.map(x => x.label).join('|')

  // wide screens: one row of tabs only if every label fits on one line, else 2 x 2 (see learn.css)
  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const fit = () => {
      const buttons = [...list.querySelectorAll('button')]
      if (!buttons.length) return
      const range = document.createRange()
      const widths = buttons.map(b => { range.selectNodeContents(b); return range.getBoundingClientRect().width })
      const bs = getComputedStyle(buttons[0]), ls = getComputedStyle(list)
      const extra = ['paddingLeft', 'paddingRight', 'borderLeftWidth', 'borderRightWidth'].reduce((a, k) => a + parseFloat(bs[k as 'paddingLeft']), 0) + 1
      setCols(tabColumns(widths, { width: list.clientWidth, gap: parseFloat(ls.columnGap) || 0, extra }))
    }
    fit()
    document.fonts?.ready.then(fit)
    const ro = new ResizeObserver(fit)
    ro.observe(list)
    return () => ro.disconnect()
  }, [labels])

  function onKey(e: React.KeyboardEvent) {
    const i = ids.indexOf(tab)
    const next = e.key === 'ArrowRight' ? ids[(i + 1) % n] : e.key === 'ArrowLeft' ? ids[(i + n - 1) % n] : e.key === 'Home' ? ids[0] : e.key === 'End' ? ids[n - 1] : null
    if (!next) return
    e.preventDefault()
    setTab(next)
    tabRefs.current[next]?.focus()
  }

  return (
    <article className="mission-view info-view" aria-labelledby="part-title">
      <button className="back" type="button" ref={backRef} onClick={onBack}>{backLabel}</button>
      <header className="mission-head deck-tool part-head">
        <span className="part-icon">{icon}</span>
        <h1 id="part-title" className="page-title">{title}</h1>
        {tag && <div className="part-tag">{tag}</div>}
      </header>

      {/* wide screens: picture on the left, tabs and quick check on the right (source order = focus order) */}
      <div className="info-cols">
      <figure className="part-figure info-media">{figure}</figure>

      <div className="info-text">
      <div className="card part-card">
        <div className={`part-tabs tabs-${n}`} role="tablist" aria-label={title} onKeyDown={onKey} ref={listRef} data-cols={cols}>
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
      {footer}
      </div>
      </div>
    </article>
  )
}
