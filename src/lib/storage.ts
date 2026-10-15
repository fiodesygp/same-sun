// Storage on this device only. Nothing here talks to a server.
// - load/save: small settings in localStorage (last Sun Day design, test runs).
// - idbStore: records with photos in IndexedDB, which holds far more than localStorage.
// Storage can be missing, blocked (private windows) or full, so every call is safe to fail.
const PREFIX = 'samesun:'

export function load<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(PREFIX + key)
    return v ? (JSON.parse(v) as T) : fallback
  } catch {
    return fallback
  }
}

/** Returns false when the browser could not keep the value. */
export function save(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

/** full = out of space; blocked = the browser will not let us store anything; failed = anything else */
export type StoreErrorKind = 'full' | 'blocked' | 'failed'

export class StoreError extends Error {
  kind: StoreErrorKind
  constructor(kind: StoreErrorKind, cause?: unknown) {
    super(`storage ${kind}`, { cause })
    this.kind = kind
  }
}

const toStoreError = (e: unknown) =>
  e instanceof StoreError ? e : new StoreError((e as { name?: string } | null)?.name === 'QuotaExceededError' ? 'full' : 'failed', e)

export interface IdbStore<T> {
  all(): Promise<T[]>
  put(value: T): Promise<void>
  remove(id: number): Promise<void>
}

/** One IndexedDB object store keyed by `id`. Rejects with a StoreError. */
export function idbStore<T extends { id: number }>(
  dbName: string,
  storeName: string,
  factory: IDBFactory | undefined = globalThis.indexedDB
): IdbStore<T> {
  let db: Promise<IDBDatabase> | null = null

  function open() {
    db ??= new Promise<IDBDatabase>((resolve, reject) => {
      if (!factory) return reject(new StoreError('blocked'))
      let req: IDBOpenDBRequest
      try {
        req = factory.open(dbName, 1)
      } catch (e) {
        return reject(new StoreError('blocked', e))
      }
      req.onupgradeneeded = () => req.result.createObjectStore(storeName, { keyPath: 'id' })
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(new StoreError('blocked', req.error))
    }).catch(e => {
      db = null // let the next call try again
      throw e
    })
    return db
  }

  async function run<R>(mode: IDBTransactionMode, op: (s: IDBObjectStore) => IDBRequest<R>): Promise<R> {
    const conn = await open()
    return new Promise<R>((resolve, reject) => {
      try {
        const tx = conn.transaction(storeName, mode)
        const req = op(tx.objectStore(storeName))
        // resolve only when the transaction commits, so a full disk is reported, not lost
        tx.oncomplete = () => resolve(req.result)
        tx.onerror = tx.onabort = () => reject(toStoreError(tx.error ?? req.error))
      } catch (e) {
        reject(toStoreError(e))
      }
    })
  }

  return {
    all: () => run('readonly', s => s.getAll() as IDBRequest<T[]>),
    put: value => run('readwrite', s => s.put(value)).then(() => undefined),
    remove: id => run('readwrite', s => s.delete(id)).then(() => undefined)
  }
}
