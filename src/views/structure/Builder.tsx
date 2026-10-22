// Stage 2: build the frame one slot at a time. Each slot opens once the one before it is picked;
// the drawing updates after every pick, and the status line says whether the pick fits, or in one
// line why it will not attach. Picks that do not fit are allowed: testing them shows why.
import { useEffect, useRef, useState } from 'react'
import { t, type Key } from '../../i18n/t'
import { OPTIONS, SLOTS, type Draft, type Slot } from '../../structure/options'
import { EMPTY_DRAFT, saveDraft } from '../../structure/progress'
import { attach, isComplete, joinFor } from '../../structure/rules'
import { Frame2D, SLOT_LABEL } from './Frame2D'

const optLabel = (s: Slot, o: string) => t(`st.opt.${s}.${o}` as Key)

/** a short sentence listing the picks, for the drawing's label */
export function describe(d: Draft) {
  const picked = SLOTS.filter(s => d[s] && !(s === 'join' && d.join === 'none')).map(s => `${t(SLOT_LABEL[s])}: ${optLabel(s, d[s]!)}`)
  return t('st.scene.alt', { picks: picked.length ? picked.join('; ') : t('st.scene.none') })
}

type Props = {
  draft: Draft
  onChange: (d: Draft) => void
  onDone?: () => void
  /** move to the first slot that is not picked yet (after "Start building") */
  focusFirstEmpty?: boolean
  onFocused?: () => void
}

export function Builder({ draft: d, onChange, onDone, focusFirstEmpty, onFocused }: Props) {
  const [said, setSaid] = useState('')
  const slotRefs = useRef<(HTMLLIElement | null)[]>([])

  // "Start building": scroll to the first empty slot and put focus on its first option
  useEffect(() => {
    if (!focusFirstEmpty) return
    const i = SLOTS.findIndex(s => d[s] === undefined && !(s === 'join' && d.posts === 'none'))
    const li = i >= 0 ? slotRefs.current[i] : null
    if (li) {
      li.scrollIntoView({ block: 'center' })
      li.querySelector<HTMLButtonElement>('.options button')?.focus({ preventScroll: true })
    }
    onFocused?.()
  }, [focusFirstEmpty]) // eslint-disable-line react-hooks/exhaustive-deps
  const a = attach(d)
  // a slot opens once every slot before it is picked (the join is skipped when there are no posts)
  const open = (s: Slot) => SLOTS.slice(0, SLOTS.indexOf(s)).every(x => d[x] !== undefined)

  function pick(s: Slot, o: string) {
    const next: Draft = { ...d, [s]: o }
    if (s === 'posts') next.join = joinFor(next.posts, d.join)
    onChange(next)
    saveDraft(next)
    const why = attach(next)[s]
    setSaid(t('st.said', { slot: t(SLOT_LABEL[s]), option: optLabel(s, o) }) + ' ' + (why ? t('st.wontAttach', { why: t(`st.why.${why}` as Key) }) : t('st.fits')))
  }
  function setCup(open: boolean) {
    const next = { ...d, cupOpen: open }
    onChange(next)
    saveDraft(next)
    setSaid(t(open ? 'st.cupOpenSaid' : 'st.cupClosedSaid'))
  }
  function startOver() {
    onChange(EMPTY_DRAFT)
    saveDraft(EMPTY_DRAFT)
    setSaid(t('st.cleared'))
  }

  return (
    <section className="builder" aria-labelledby="st-build">
      <h2 className="h2" id="st-build">{t('st.buildTitle')}</h2>
      <p className="hint">{t('st.buildHint')}</p>
      <div className="builder-cols">
        <div className="builder-scene card">
          <Frame2D draft={d} label={describe(d)} />
          <p className="builder-said" role="status" aria-live="polite">{said}</p>
        </div>
        <ol className="slots">
          {SLOTS.map((s, i) => {
            const can = open(s), noJoin = s === 'join' && d.posts === 'none'
            return (
              <li key={s} ref={el => { slotRefs.current[i] = el }} className={`slot card${can ? '' : ' locked'}`}>
                <fieldset disabled={!can || noJoin}>
                  <legend><span className="slot-n">{i + 1}</span> {t(SLOT_LABEL[s])}</legend>
                  <p className="hint flat">{noJoin ? t('st.noJoin') : can ? t(`st.slotHelp.${s}` as Key) : t('st.locked')}</p>
                  {!noJoin && (
                    <div className="seg options">
                      {OPTIONS[s].map(o => (
                        <button key={o} type="button" aria-pressed={d[s] === o} onClick={() => pick(s, o)}>{optLabel(s, o)}</button>
                      ))}
                    </div>
                  )}
                  {d[s] && a[s] && <p className="wont" role="note"><span aria-hidden="true">✗ </span>{t('st.wontAttach', { why: t(`st.why.${a[s]}` as Key) })}</p>}
                  {s === 'base' && d.base === 'cup' && (
                    <div className="cup-q">
                      <p className="flat"><b>{t('st.cupQ')}</b></p>
                      <div className="seg">
                        <button type="button" aria-pressed={d.cupOpen} onClick={() => setCup(true)}>{t('st.cupYes')}</button>
                        <button type="button" aria-pressed={!d.cupOpen} onClick={() => setCup(false)}>{t('st.cupNo')}</button>
                      </div>
                    </div>
                  )}
                </fieldset>
              </li>
            )
          })}
        </ol>
      </div>
      <div className="row wrap">
        {isComplete(d) && onDone && <button className="btn" type="button" onClick={onDone}>{t('st.goTest')}</button>}
        <button className="btn ghost" type="button" onClick={startOver}>{t('st.startOver')}</button>
      </div>
      {isComplete(d) && <p className="done-note">{t('st.ready')}</p>}
    </section>
  )
}
