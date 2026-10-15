// Growth Story Card entries: a photo and a few words for each step of the project.
// Saved in IndexedDB on this device only; nothing is ever uploaded.
import { idbStore } from './storage'

export const STAGES = ['s1', 'h1', 's2', 'h2', 's3'] as const
export type StageId = (typeof STAGES)[number]
/** s = troop session (green), h = at home (yellow) */
export const stageKind = (s: StageId) => (s.startsWith('s') ? 's' : 'h')

export interface GrowthStoryEntry {
  id: number
  when: number
  edited?: number
  stage: StageId
  story: string
  /** a shrunk JPEG as a data URL, or null */
  photo: string | null
}

export const growthStoryStore = idbStore<GrowthStoryEntry>('samesun', 'growthStory')

/** Newest first. */
export const newestFirst = (xs: GrowthStoryEntry[]) => [...xs].sort((a, b) => b.when - a.when)
