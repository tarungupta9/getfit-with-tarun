import { StoredPreferencesSchema } from '../domain/schemas'
import type { PlannerPreferences } from '../domain/types'

export const PREFERENCES_STORAGE_KEY = 'getfit:planner-preferences:v1'

export const defaultPreferences: PlannerPreferences = {
  minutesPerSession: 30,
  availableDays: ['mon', 'wed', 'fri'],
  startingPoint: 'new',
}

export type LoadPreferencesResult =
  | { status: 'loaded'; preferences: PlannerPreferences }
  | { status: 'empty'; preferences: PlannerPreferences }
  | { status: 'reset'; preferences: PlannerPreferences }
  | { status: 'unavailable'; preferences: PlannerPreferences }

export function loadPreferences(): LoadPreferencesResult {
  try {
    const raw = window.localStorage.getItem(PREFERENCES_STORAGE_KEY)
    if (raw === null) {
      return { status: 'empty', preferences: defaultPreferences }
    }
    let storedValue: unknown
    try {
      storedValue = JSON.parse(raw)
    } catch {
      window.localStorage.removeItem(PREFERENCES_STORAGE_KEY)
      return { status: 'reset', preferences: defaultPreferences }
    }
    const parsed = StoredPreferencesSchema.safeParse(storedValue)
    if (parsed.success) {
      return { status: 'loaded', preferences: parsed.data.preferences }
    }
    window.localStorage.removeItem(PREFERENCES_STORAGE_KEY)
    return { status: 'reset', preferences: defaultPreferences }
  } catch {
    return { status: 'unavailable', preferences: defaultPreferences }
  }
}

export function savePreferences(preferences: PlannerPreferences): boolean {
  try {
    window.localStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({ schemaVersion: 1, preferences }),
    )
    return true
  } catch {
    return false
  }
}

export function clearPreferences(): boolean {
  try {
    window.localStorage.removeItem(PREFERENCES_STORAGE_KEY)
    return true
  } catch {
    return false
  }
}
