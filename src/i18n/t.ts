import en from './en.json'
import es from './es.json'

export type Lang = 'en' | 'es'
export type Key = keyof typeof en

const strings: Record<Lang, Record<Key, string>> = { en, es }
let lang: Lang = 'en'

export function setLang(next: Lang) {
  lang = next
}

/** Look up UI text for the current language, falling back to English. */
export function t(key: Key): string {
  return strings[lang][key] ?? en[key]
}
