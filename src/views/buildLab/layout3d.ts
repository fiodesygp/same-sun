// Where things sit on the 3D bench, in metres-ish units (the table top is y = 0, the camera looks
// from +z). Kept free of three.js so it can be tested. Terminals stand in two rows on the front of
// the table, 1.3 apart, so their on-screen buttons stay at least 44 px apart on a 360 px phone.
import type { TermId } from '../../lab/circuit'

export type V3 = [number, number, number]

const COL = [-3.25, -1.95, -0.65, 0.65, 1.95, 3.25]
const FRONT = (c: number): V3 => [COL[c], 0.32, 1.9]
const BACK = (c: number): V3 => [COL[c], 0.72, 0.4]

/** each terminal: front row water pump, big panel, LED; back row small panel, resistor, motor */
export const TERM3D: Record<TermId, V3> = {
  'w+': FRONT(0), 'w-': FRONT(1), 'p+': FRONT(2), 'p-': FRONT(3), lL: FRONT(4), lS: FRONT(5),
  'q+': BACK(0), 'q-': BACK(1), rA: BACK(2), rB: BACK(3), mA: BACK(4), mB: BACK(5)
}

/** the parts' places on the table */
export const PLACE = {
  cup: [0, 0, -0.85] as V3,
  small: [-2.6, 0, -0.9] as V3,
  tank: [-2.6, 0, 1.0] as V3,
  led: [2.6, 0, 1.15] as V3,
  motor: [2.6, 0, -0.55] as V3,
  resistor: [0, 0.72, 0.4] as V3
}

/** what the camera looks at, its height angle, and the area it must fit */
export const VIEW = { target: [0, 0.85, 0.35] as V3, polar: 0.95, fitWidth: 8.3, fitHeight: 3.9 }
/** how far the camera may turn left or right (radians), and the 3D tilt choices */
export const MAX_TURN = 0.45
