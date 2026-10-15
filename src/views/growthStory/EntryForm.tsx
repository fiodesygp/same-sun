import { useEffect, useRef, useState, type FormEvent } from 'react'
import { t, type Key } from '../../i18n/t'
import { STAGES, stageKind, type GrowthStoryEntry, type StageId } from '../../lib/growthStory'
import { shrinkPhoto } from '../../lib/photo'
import type { StoreErrorKind } from '../../lib/storage'

export type Draft = { stage: StageId; story: string; photo: string | null }

type Props = {
  /** the entry being edited, or null for a new one */
  editing: GrowthStoryEntry | null
  /** step to start on: the newest entry's step */
  defaultStage: StageId | null
  /** message to show when the form opens (after saving an edit) */
  initialMsg?: Key
  onSave: (d: Draft) => Promise<StoreErrorKind | null>
  onCancelEdit: () => void
}

const ERR: Record<StoreErrorKind, Key> = { full: 'growthStory.errFull', blocked: 'growthStory.errBlocked', failed: 'growthStory.errFailed' }

export function EntryForm({ editing, defaultStage, initialMsg, onSave, onCancelEdit }: Props) {
  const [stage, setStage] = useState<StageId | null>(editing?.stage ?? defaultStage)
  const [story, setStory] = useState(editing?.story ?? '')
  const [photo, setPhoto] = useState<string | null>(editing?.photo ?? null)
  const [photoState, setPhotoState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [msg, setMsg] = useState<Key | null>(initialMsg ?? null)
  const [busy, setBusy] = useState(false)
  const storyRef = useRef<HTMLTextAreaElement>(null)
  const stepsRef = useRef<HTMLDivElement>(null)
  const caretToEnd = useRef(false)

  // when an entry is loaded for editing, put the cursor in its text
  useEffect(() => {
    if (editing) storyRef.current?.focus()
  }, [editing])

  // entries load after the form opens; start on the newest entry's step if none is picked yet
  useEffect(() => {
    if (!stage && defaultStage) setStage(defaultStage)
  }, [defaultStage, stage])

  // after a sentence starter is added, put the cursor at the end of the text
  useEffect(() => {
    if (!caretToEnd.current || !storyRef.current) return
    caretToEnd.current = false
    const ta = storyRef.current
    ta.focus()
    ta.setSelectionRange(ta.value.length, ta.value.length)
  }, [story])

  function addStarter(s: string) {
    setMsg(null)
    caretToEnd.current = true
    setStory(prev => (prev ? prev.replace(/\s*$/, '') + ' ' : '') + s.replace('…', ' '))
  }

  async function onPhoto(file: File | undefined) {
    if (!file) return
    setMsg(null)
    setPhotoState('loading')
    try {
      setPhoto(await shrinkPhoto(file))
      setPhotoState('idle')
    } catch {
      setPhoto(null)
      setPhotoState('error')
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    const text = story.trim()
    if (!stage) {
      setMsg('growthStory.pickStep')
      stepsRef.current?.querySelector('button')?.focus()
      return
    }
    if (!text && !photo) {
      setMsg('growthStory.addSomething')
      storyRef.current?.focus()
      return
    }
    setBusy(true)
    const err = await onSave({ stage, story: text, photo })
    setBusy(false)
    if (err) return setMsg(ERR[err]) // keep everything on screen so nothing is lost
    if (!editing) {
      setStory('')
      setPhoto(null)
      setMsg('growthStory.saved')
    }
  }

  const starters = stage ? ([0, 1, 2] as const).map(i => t(`stage.${stage}.starter.${i}`)) : ([0, 1, 2] as const).map(i => t(`stage.none.starter.${i}`))
  const dropText = photoState === 'loading' ? 'growthStory.loadingPhoto' : photoState === 'error' ? 'growthStory.photoError' : photo ? 'growthStory.changePhoto' : 'growthStory.addPhoto'

  return (
    <form className="card jform" noValidate onSubmit={submit}>
      <h2 className="form-title">{t(editing ? 'growthStory.editEntry' : 'growthStory.newEntry')}</h2>
      <fieldset>
        <legend>{t('growthStory.whichStep')}</legend>
        <div className="stepbtns" role="group" aria-label={t('growthStory.stepLabel')} ref={stepsRef}>
          {STAGES.map(s => (
            <button key={s} type="button" className={stageKind(s)} aria-pressed={stage === s} onClick={() => { setStage(s); setMsg(null) }}>
              {t(`stage.${s}.name`)}<small>{t(`stage.${s}.sub`)}</small>
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>{t('growthStory.photo')} <span className="opt">{t('growthStory.optional')}</span></legend>
        <input type="file" id="gsPhoto" accept="image/*" className="sr photo-input"
          onChange={e => { onPhoto(e.target.files?.[0]); e.target.value = '' }} />
        <label className="photo-drop" htmlFor="gsPhoto">
          {photo && <img src={photo} alt="" />}
          <span>{t(dropText)}</span>
        </label>
        <div className="row wrap between">
          <span className="hint flat">{t('growthStory.photoHint')}</span>
          {photo && <button type="button" className="linkbtn" onClick={() => setPhoto(null)}>{t('growthStory.removePhoto')}</button>}
        </div>
      </fieldset>
      <fieldset>
        <legend><label htmlFor="gsStory">{t('growthStory.whatHappened')}</label></legend>
        <textarea id="gsStory" ref={storyRef} rows={5} maxLength={1200} placeholder={t('growthStory.placeholder')}
          value={story} onChange={e => { setStory(e.target.value); setMsg(null) }} />
        <div className="starters" role="group" aria-label={t('growthStory.starters')}>
          {starters.map(s => <button key={s} type="button" onClick={() => addStarter(s)}>{s}</button>)}
        </div>
      </fieldset>
      <div className="row wrap">
        <button className="btn" type="submit" disabled={busy}>{t(editing ? 'growthStory.saveChanges' : 'growthStory.save')}</button>
        {editing && <button className="linkbtn" type="button" onClick={onCancelEdit}>{t('growthStory.cancelEdit')}</button>}
        <span className="formmsg" role="status">{msg && t(msg)}</span>
      </div>
    </form>
  )
}
