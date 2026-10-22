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

describe('t() slots', () => {
  it('fills {name} slots and leaves unknown ones alone', () => {
    expect(t('chips.tank', { n: 40 })).toBe('Tank 40%')
    expect(t('sunDay.clock', { hour: 9 })).toBe('9:00 · Day {day}')
  })
})

describe('Spanish', () => {
  // brand names, units and labels that are the same in both languages
  const SAME = new Set(['app.name', 'lang.en', 'lang.es', 'growthStory.runsDesignValue', 'lab.level.1', 'lab.svg.led', 'scene.led',
    'lab.term.mA', 'lab.term.mB', 'lab.probe', 'scene.panelAt', 'learn.openMission', 'learn.device.led', 'learn.ml', 'lab.view.2d', 'lab.view.3d', 'power.openPart', 'learn.check.switch.no', 'learn.part.led.name', 'learn.fan.rpm', 'learn.svg.panel', 'learn.ctl.panels1', 'learn.no', 'learn.colour.magenta', 'learn.m.agripv.title', 'gauges.wh', 'gauges.degF'])
  const slots = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort()

  it('uses the same {slots} as English', () => {
    for (const [k, v] of Object.entries(en)) expect(slots(es[k as keyof typeof es]), k).toEqual(slots(v))
  })
  it('is translated, apart from names and units', () => {
    for (const [k, v] of Object.entries(en)) if (!SAME.has(k)) expect(es[k as keyof typeof es], k).not.toBe(v)
  })
})
