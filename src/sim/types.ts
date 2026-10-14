import type defaultModel from '../config/model.json'

export type Model = typeof defaultModel

export type CropKey = keyof Model['crops']
export type WeatherKey = keyof Model['weather']
export type PanelKey = 'none' | keyof Model['panels']
/** Players pick low or high; "mid" stays in model.json from the prototype for tuning. */
export type Height = 'low' | 'high'
export type Days = 1 | 7

/** Everything the player can choose. All other settings are fixed in model.json. */
export interface Design {
  crop: CropKey
  weather: WeatherKey
  days: Days
  panels: PanelKey
  height: Height
  fan: boolean
  /** true = smart pump from the tank; false = hand watering each morning */
  pump: boolean
}

export interface LoadsOn {
  fan: boolean
  pump: boolean
}

export interface Hour {
  day: number
  h: number
  /** sunlight on open ground, W/m2 */
  sun: number
  /** sun height above the horizon, degrees */
  elev: number
  /** sunlight that reaches the plant, W/m2 */
  plantLight: number
  /** panel power, W */
  power: number
  airTemp: number
  leafTemp: number
  /** soil moisture at the end of the hour, 0-1 */
  moisture: number
  /** water left in the tank at the end of the hour */
  tank: number
  pumped: number
  on: LoadsOn
  lightFactor: number
  tempFactor: number
  waterFactor: number
  /** growth this hour */
  growth: number
  /** growth so far in the run */
  totalGrowth: number
  hot: boolean
  dry: boolean
  soggy: boolean
}

export interface SimResult {
  hours: Hour[]
  daily: { energy: number; growth: number }[]
  /** Wh over the whole run */
  energy: number
  growth: number
  /** share of the plant the panels shade, 0-1 */
  shade: number
}

export interface Score {
  /** growth as a share of a perfect run */
  food: number
  /** energy as a share of the best panel setup */
  energy: number
  total: number
  /** food score of the same plant in full sun with no panel */
  fullSun: number
}
