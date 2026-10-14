// Small localStorage wrapper. Everything stays on this device; storage can be
// missing or full (private windows, old phones), so every call is safe to fail.
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
