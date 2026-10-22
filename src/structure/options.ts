// The builder's slots and the options in each, in the order the learner picks them, and which
// materials each option uses.
import type { MaterialId } from './materials'

export const SLOTS = ['base', 'posts', 'join', 'hinge', 'stop', 'holder'] as const
export type Slot = (typeof SLOTS)[number]

export const OPTIONS = {
  base: ['cup', 'tower', 'easel'],
  posts: ['thickStraw', 'pipe', 'stick', 'none'],
  join: ['bands', 'pipeWrap', 'tape', 'notches'],
  hinge: ['axle', 'eyeLoops', 'fig8', 'tapeHinge', 'none'],
  stop: ['bandStops', 'ladder', 'notches', 'wedges', 'clothespin', 'none'],
  holder: ['tray', 'tape', 'loose']
} as const satisfies Record<Slot, readonly string[]>

export type Base = (typeof OPTIONS.base)[number]
export type Posts = (typeof OPTIONS.posts)[number]
/** 'none' only when there are no posts to join */
export type Join = (typeof OPTIONS.join)[number] | 'none'
export type Hinge = (typeof OPTIONS.hinge)[number]
export type Stop = (typeof OPTIONS.stop)[number]
export type Holder = (typeof OPTIONS.holder)[number]

export interface Design {
  base: Base
  /** the upside-down cup's bottom is cut open (only matters with the cup base) */
  cupOpen: boolean
  posts: Posts
  join: Join
  hinge: Hinge
  stop: Stop
  holder: Holder
}

/** a design while it is being built: slots not picked yet are missing */
export type Draft = Partial<Design> & { cupOpen: boolean }

/** the materials each option uses */
export const USES: Record<string, MaterialId[]> = {
  'base.cup': ['cup'], 'base.tower': ['sticks', 'bands'], 'base.easel': ['cardstock'],
  'posts.thickStraw': ['straws'], 'posts.pipe': ['pipe'], 'posts.stick': ['sticks'],
  'join.bands': ['bands'], 'join.pipeWrap': ['pipe'], 'join.tape': ['tape'], 'join.notches': ['sticks'],
  'hinge.axle': ['straws'], 'hinge.eyeLoops': ['pipe'], 'hinge.fig8': ['bands'], 'hinge.tapeHinge': ['tape'],
  'stop.bandStops': ['bands'], 'stop.ladder': ['pipe'], 'stop.notches': ['sticks'], 'stop.wedges': ['cardstock'], 'stop.clothespin': ['clothespins', 'cardstock'],
  'holder.tray': ['cardstock', 'bands'], 'holder.tape': ['tape']
}
