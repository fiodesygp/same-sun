// Growth Story Card entries: a photo and a few words for each step of the project.
// Saved in IndexedDB on this device only; nothing is ever uploaded.
import type { MissionId } from './learn'
import { idbStore } from './storage'

export const STAGES = ['s1', 'h1', 's2', 'h2', 's3', 'reflect', 'build'] as const
export type StageId = (typeof STAGES)[number]
/** s = troop session (green), h = at home (yellow), r = Reflect, from Power (purple), b = Build, from Structure (blue) */
export const stageKind = (s: StageId) => (s === 'reflect' ? 'r' : s === 'build' ? 'b' : s.startsWith('s') ? 's' : 'h')

/** where an entry came from: a Power step, or Structure */
export type EntryTag = MissionId | 'structure'

export interface GrowthStoryEntry {
  id: number
  when: number
  edited?: number
  stage: StageId
  story: string
  /** a shrunk JPEG as a data URL, or null */
  photo: string | null
  /** where this is from: a Power step (a sketch photo, or Reflect), or Structure (a saved frame) */
  mission?: EntryTag
}

export const growthStoryStore = idbStore<GrowthStoryEntry>('samesun', 'growthStory')

/** Newest first. */
export const newestFirst = (xs: GrowthStoryEntry[]) => [...xs].sort((a, b) => b.when - a.when)
