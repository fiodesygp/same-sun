import { afterEach, describe, expect, it } from 'vitest'
import en from './en.json'
import es from './es.json'
import { setLang, t } from './t'

describe('i18n', () => {
  afterEach(() => setLang('en'))

  it('en.json and es.json have the same keys', () => {
    expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort())
  })

  it('has no empty strings', () => {
    for (const v of [...Object.values(en), ...Object.values(es)]) expect(v.trim()).not.toBe('')
  })

  it('t() returns text for the current language', () => {
    expect(t('tabs.growthStory')).toBe('Growth Story')
    setLang('es')
    expect(t('tabs.growthStory')).toBe(es['tabs.growthStory'])
  })
})
