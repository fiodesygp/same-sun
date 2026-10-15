// A tiny in-memory IndexedDB for tests: just enough of open / transaction / put / getAll /
// delete for src/lib/storage.ts. Values are cloned like the real thing. Set failWith to make
// the next write fail (for example 'QuotaExceededError'); set blocked to make open() fail.

type Rows = Map<IDBValidKey, unknown>
type Req = { result?: unknown; error: { name: string } | null; onsuccess?: () => void; onerror?: () => void; onupgradeneeded?: () => void; onblocked?: () => void }

export class FakeIdb {
  data = new Map<string, Map<string, Rows>>()
  blocked = false
  failWith: string | null = null

  open(name: string) {
    const req: Req = { error: null }
    setTimeout(() => {
      if (this.blocked) {
        req.error = { name: 'InvalidStateError' }
        return req.onerror?.()
      }
      const isNew = !this.data.has(name)
      if (isNew) this.data.set(name, new Map())
      req.result = this.db(this.data.get(name)!)
      if (isNew) req.onupgradeneeded?.()
      req.onsuccess?.()
    })
    return req as unknown as IDBOpenDBRequest
  }

  private db(stores: Map<string, Rows>) {
    const fake = this
    return {
      createObjectStore(name: string, opts: { keyPath: string }) {
        stores.set(name, new Map())
        return { keyPath: opts.keyPath }
      },
      transaction(name: string) {
        const rows = stores.get(name)!
        const tx = { error: null as { name: string } | null, oncomplete: undefined as undefined | (() => void), onerror: undefined as undefined | (() => void), onabort: undefined as undefined | (() => void) }
        const finish = (req: Req, run: () => unknown, write: boolean) => {
          setTimeout(() => {
            if (write && fake.failWith) {
              req.error = tx.error = { name: fake.failWith }
              fake.failWith = null
              req.onerror?.()
              return tx.onabort?.()
            }
            req.result = run()
            req.onsuccess?.()
            tx.oncomplete?.()
          })
          return req
        }
        return Object.assign(tx, {
          objectStore: () => ({
            put: (v: { id: number }) => finish({ error: null }, () => (rows.set(v.id, structuredClone(v)), v.id), true),
            delete: (id: number) => finish({ error: null }, () => void rows.delete(id), true),
            getAll: () => finish({ error: null }, () => [...rows.values()].map(v => structuredClone(v)), false)
          })
        })
      }
    }
  }
}
