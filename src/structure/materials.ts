// Structure's materials: the order of the cards, the facility check on each (things an adult has
// to check or prepare first), and each card's quick check.
export const MATERIAL_IDS = ['cup', 'straws', 'bands', 'pipe', 'sticks', 'cardstock', 'clothespins', 'tape'] as const
export type MaterialId = (typeof MATERIAL_IDS)[number]

/** metal: has a metal part; sharp: has a sharp edge once cut; tool: needs a tool the facilitator uses first */
export type Facility = 'metal' | 'sharp' | 'tool'

export const FACILITY: Record<MaterialId, Facility[]> = {
  cup: ['sharp', 'tool'],
  straws: ['tool'],
  bands: [],
  pipe: ['metal'],
  sticks: ['tool'],
  cardstock: [],
  clothespins: ['metal'],
  tape: []
}

/** each quick check: the answer choices (keys into st.check.<material>.<choice>) and the right one */
export const MATERIAL_CHECKS: Record<MaterialId, { choices: string[]; answer: string }> = {
  cup: { choices: ['air', 'light'], answer: 'air' },
  straws: { choices: ['thin', 'thick'], answer: 'thin' },
  bands: { choices: ['hold', 'cool'], answer: 'hold' },
  pipe: { choices: ['metal', 'fuzzy'], answer: 'metal' },
  sticks: { choices: ['stiff', 'bendy'], answer: 'stiff' },
  cardstock: { choices: ['tray', 'posts'], answer: 'tray' },
  clothespins: { choices: ['pinch', 'glue'], answer: 'pinch' },
  tape: { choices: ['soft', 'stronger'], answer: 'soft' }
}

export const isRightMaterial = (id: MaterialId, choice: string) => MATERIAL_CHECKS[id].answer === choice
