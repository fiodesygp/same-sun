import { describe, expect, it } from 'vitest'
import { FakeIdb } from '../test/fakeIdb'
import { idbStore, StoreError } from './storage'

type Entry = { id: number; story: string; photo: string | null }
const make = (idb: FakeIdb) => idbStore<Entry>('samesun', 'growthStory', idb as unknown as IDBFactory)
const byId = (xs: Entry[]) => [...xs].sort((a, b) => a.id - b.id)

describe('idbStore', () => {
  it('saves entries and reads them back', async () => {
    const store = make(new FakeIdb())
    expect(await store.all()).toEqual([])
    await store.put({ id: 1, story: 'Planted basil', photo: null })
    await store.put({ id: 2, story: '', photo: 'data:image/jpeg;base64,AAA' })
    expect(byId(await store.all())).toEqual([
      { id: 1, story: 'Planted basil', photo: null },
      { id: 2, story: '', photo: 'data:image/jpeg;base64,AAA' }
    ])
  })

  it('edits an entry in place by saving the same id', async () => {
    const store = make(new FakeIdb())
    await store.put({ id: 1, story: 'first', photo: null })
    await store.put({ id: 1, story: 'fixed', photo: 'data:x' })
    expect(await store.all()).toEqual([{ id: 1, story: 'fixed', photo: 'data:x' }])
  })

  it('deletes an entry', async () => {
    const store = make(new FakeIdb())
    await store.put({ id: 1, story: 'a', photo: null })
    await store.put({ id: 2, story: 'b', photo: null })
    await store.remove(1)
    expect(await store.all()).toEqual([{ id: 2, story: 'b', photo: null }])
  })

  it('keeps entries after a reload (a new store on the same browser)', async () => {
    const idb = new FakeIdb()
    await make(idb).put({ id: 7, story: 'kept', photo: null })
    expect(await make(idb).all()).toEqual([{ id: 7, story: 'kept', photo: null }])
  })

  it('reports a full disk, and the next save still works', async () => {
    const idb = new FakeIdb(), store = make(idb)
    idb.failWith = 'QuotaExceededError'
    await expect(store.put({ id: 1, story: 'big photo', photo: 'data:x' })).rejects.toMatchObject({ kind: 'full' })
    expect(await store.all()).toEqual([])
    await store.put({ id: 1, story: 'smaller', photo: null })
    expect(await store.all()).toHaveLength(1)
  })

  it('reports other write errors as failed', async () => {
    const idb = new FakeIdb(), store = make(idb)
    idb.failWith = 'UnknownError'
    await expect(store.put({ id: 1, story: 'x', photo: null })).rejects.toMatchObject({ kind: 'failed' })
  })

  it('reports blocked storage, and tries again later', async () => {
    const idb = new FakeIdb()
    idb.blocked = true
    const store = make(idb)
    const err = await store.all().catch(e => e)
    expect(err).toBeInstanceOf(StoreError)
    expect(err.kind).toBe('blocked')
    idb.blocked = false
    expect(await store.all()).toEqual([])
  })

  it('reports blocked when the browser has no IndexedDB', async () => {
    const store = idbStore<Entry>('samesun', 'growthStory', undefined)
    await expect(store.put({ id: 1, story: 'x', photo: null })).rejects.toMatchObject({ kind: 'blocked' })
  })
})
