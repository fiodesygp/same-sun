import en from './en.json'
import es from './es.json'

export type Lang = 'en' | 'es'
export type Key = keyof typeof en
export type Vars = Record<string, string | number>

const strings: Record<Lang, Record<Key, string>> = { en, es }
let lang: Lang = 'en'

export function setLang(next: Lang) {
  lang = next
}

/** Look up UI text for the current language, falling back to English. Fills {name} slots from vars. */
export function t(key: Key, vars?: Vars): string {
  const s = strings[lang][key] ?? en[key]
  return vars ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : s
}
