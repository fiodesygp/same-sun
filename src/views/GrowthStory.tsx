import { useEffect, useRef, useState } from 'react'
import { t, type Key } from '../i18n/t'
import { growthStoryStore, newestFirst, type GrowthStoryEntry } from '../lib/growthStory'
import { loadRuns, type SavedRun } from '../lib/runs'
import { StoreError } from '../lib/storage'
import { EntryForm, type Draft } from './growthStory/EntryForm'
import { EntryList } from './growthStory/EntryList'
import { EntryView } from './growthStory/EntryView'
import { RunsTable } from './growthStory/RunsTable'

export function GrowthStory({ active }: { active: boolean }) {
  const [entries, setEntries] = useState<GrowthStoryEntry[]>([])
  const [loadFailed, setLoadFailed] = useState(false)
  const [openId, setOpenId] = useState<number | null>(null)
  const [editing, setEditing] = useState<GrowthStoryEntry | null>(null)
  // a new key remounts the form fresh (after an edit is saved or cancelled)
  const [form, setForm] = useState<{ key: number; msg?: Key }>({ key: 0 })
  const [runs, setRuns] = useState<SavedRun[]>([])
  const [pinned, setPinned] = useState(false)
  const formRef = useRef<HTMLDivElement>(null)
  const listHeadingRef = useRef<HTMLHeadingElement>(null)
  const focusList = useRef(false)

  useEffect(() => {
    growthStoryStore.all().then(xs => setEntries(newestFirst(xs)), () => setLoadFailed(true))
  }, [])
  // pin the form (wide layouts) only while it fits under the header; a photo or a long story
  // can make it taller, and then it should scroll with the page so Save is never out of reach
  useEffect(() => {
    const el = formRef.current
    if (!el) return
    const check = () => {
      const header = document.querySelector('header')?.offsetHeight ?? 0
      setPinned(el.offsetHeight <= window.innerHeight - header - 24)
    }
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    window.addEventListener('resize', check)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', check)
    }
  }, [openId])

  // Sun Day saves runs while this tab is hidden, so refresh them each time it opens
  useEffect(() => {
    if (active) setRuns(loadRuns())
  }, [active])

  function show(id: number | null) {
    setOpenId(id)
    focusList.current = id === null
    window.scrollTo(0, 0)
  }
  // back from an entry: land on My entries instead of losing focus
  useEffect(() => {
    if (openId !== null || !focusList.current) return
    focusList.current = false
    listHeadingRef.current?.focus({ preventScroll: true })
  }, [openId])

  async function save(d: Draft) {
    const now = Date.now()
    const entry: GrowthStoryEntry = editing ? { ...editing, ...d, edited: now } : { id: now, when: now, ...d }
    try {
      await growthStoryStore.put(entry)
    } catch (e) {
      return e instanceof StoreError ? e.kind : 'failed'
    }
    setEntries(xs => newestFirst([entry, ...xs.filter(x => x.id !== entry.id)]))
    if (editing) {
      setEditing(null)
      setForm({ key: form.key + 1, msg: 'growthStory.changesSaved' })
    }
    return null
  }

  async function remove(id: number) {
    try {
      await growthStoryStore.remove(id)
    } catch {
      return false
    }
    setEntries(xs => xs.filter(x => x.id !== id))
    if (editing?.id === id) {
      setEditing(null)
      setForm({ key: form.key + 1 })
    }
    show(null)
    return true
  }

  function edit(x: GrowthStoryEntry) {
    setEditing(x)
    setForm({ key: form.key + 1 })
    setOpenId(null)
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ block: 'start' }))
  }

  const open = entries.find(x => x.id === openId)

  return (
    <>
      <div>
        <div className="eyebrow">{t('growthStory.eyebrow')}</div>
        <h1 className="page-title">{t('growthStory.title')}</h1>
        <p className="lede">{t('growthStory.lede')}</p>
      </div>

      {open ? (
        <EntryView key={open.id} entry={open} onBack={() => show(null)} onEdit={() => edit(open)} onDelete={() => remove(open.id)} />
      ) : (
        <div className="cols jcols">
          <div ref={formRef} className={pinned ? 'gs-form pinned' : 'gs-form'}>
            <EntryForm key={form.key} editing={editing} defaultStage={entries[0]?.stage ?? null} initialMsg={form.msg} onSave={save}
              onCancelEdit={() => { setEditing(null); setForm({ key: form.key + 1 }) }} />
          </div>
          <div className="stack">
            <h2 className="h2 flat" ref={listHeadingRef} tabIndex={-1}>{t('growthStory.myEntries')}</h2>
            {loadFailed && <p className="notice" role="status">{t('growthStory.errLoad')}</p>}
            <EntryList entries={entries} onOpen={show} />
            <RunsTable runs={runs} />
          </div>
        </div>
      )}
    </>
  )
}
