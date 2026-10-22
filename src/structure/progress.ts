// Structure progress on this device: which material checks were answered right, whether the
// learner skipped ahead, the frame being built, and the last test results. Nothing leaves the device.
import { load, save } from '../lib/storage'
import { isRightMaterial, MATERIAL_IDS, type MaterialId } from './materials'
import { OPTIONS, SLOTS, type Draft } from './options'

export interface StructureState {
  checked: MaterialId[]
  skipped: boolean
}

const KEY = 'structure'

function read(): Record<string, unknown> {
  const x = load<unknown>(KEY, {})
  return x && typeof x === 'object' && !Array.isArray(x) ? (x as Record<string, unknown>) : {}
}
function write(patch: Record<string, unknown>) {
  save(KEY, { ...read(), ...patch })
}

export function loadStructure(): StructureState {
  const o = read()
  const checked = Array.isArray(o.checked) ? MATERIAL_IDS.filter(id => (o.checked as unknown[]).includes(id)) : []
  return { checked, skipped: o.skipped === true }
}

/** Answer a material's quick check; a right answer is remembered. */
export function answerMaterial(id: MaterialId, choice: string): { right: boolean; state: StructureState } {
  const s = loadStructure(), right = isRightMaterial(id, choice)
  if (right && !s.checked.includes(id)) write({ checked: MATERIAL_IDS.filter(m => m === id || s.checked.includes(m)) })
  return { right, state: loadStructure() }
}

export function skipMaterials(): StructureState {
  write({ skipped: true })
  return loadStructure()
}

export const allMaterialsChecked = (s: StructureState) => s.checked.length === MATERIAL_IDS.length

// ---------- the frame being built ----------

export const EMPTY_DRAFT: Draft = { cupOpen: true }

/** the saved draft; picks that are not real options are dropped */
export function loadDraft(): Draft {
  const x = read().design
  const o = x && typeof x === 'object' ? (x as Record<string, unknown>) : {}
  const d: Draft = { cupOpen: o.cupOpen !== false }
  for (const s of SLOTS) {
    const v = o[s]
    if (typeof v === 'string' && ((OPTIONS[s] as readonly string[]).includes(v) || (s === 'join' && v === 'none'))) (d as Record<string, unknown>)[s] = v
  }
  return d
}

export const saveDraft = (d: Draft) => write({ design: d })
