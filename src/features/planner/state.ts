import { weekdays } from '../../domain/schemas'
import type {
  GeneratedPlan,
  PlannerPreferences,
  StartingPoint,
  Weekday,
} from '../../domain/types'
import { defaultPreferences } from '../../persistence/preferences'

export interface PlannerState {
  phase: 'hydrating' | 'intake' | 'plan'
  preferences: PlannerPreferences
  acknowledged: boolean
  plan: GeneratedPlan | null
  error: string | null
  persistenceNotice: string | null
  persistenceAvailable: boolean
}

export type PlannerAction =
  | {
      type: 'hydrated'
      preferences: PlannerPreferences
      persistenceNotice: string | null
      persistenceAvailable: boolean
    }
  | { type: 'set-minutes'; minutes: 15 | 30 | 45 }
  | { type: 'toggle-day'; day: Weekday }
  | { type: 'set-starting-point'; startingPoint: StartingPoint }
  | { type: 'set-acknowledged'; acknowledged: boolean }
  | { type: 'generated'; plan: GeneratedPlan }
  | { type: 'generation-failed'; message: string }
  | { type: 'edit' }
  | {
      type: 'reset'
      persistenceAvailable: boolean
      persistenceNotice: string | null
    }
  | { type: 'storage-failed' }
  | { type: 'dismiss-persistence-notice' }

export const initialPlannerState: PlannerState = {
  phase: 'hydrating',
  preferences: defaultPreferences,
  acknowledged: false,
  plan: null,
  error: null,
  persistenceNotice: null,
  persistenceAvailable: true,
}

export function plannerReducer(
  state: PlannerState,
  action: PlannerAction,
): PlannerState {
  switch (action.type) {
    case 'hydrated':
      return {
        ...state,
        phase: 'intake',
        preferences: action.preferences,
        persistenceNotice: action.persistenceNotice,
        persistenceAvailable: action.persistenceAvailable,
      }
    case 'set-minutes':
      return {
        ...state,
        preferences: {
          ...state.preferences,
          minutesPerSession: action.minutes,
        },
        error: null,
      }
    case 'toggle-day': {
      const selected = state.preferences.availableDays.includes(action.day)
      if (!selected && state.preferences.availableDays.length >= 4) return state
      const availableDays = (selected
        ? state.preferences.availableDays.filter((day) => day !== action.day)
        : [...state.preferences.availableDays, action.day]
      ).sort((left, right) => weekdays.indexOf(left) - weekdays.indexOf(right))
      return {
        ...state,
        preferences: { ...state.preferences, availableDays },
        error: null,
      }
    }
    case 'set-starting-point':
      return {
        ...state,
        preferences: {
          ...state.preferences,
          startingPoint: action.startingPoint,
        },
        error: null,
      }
    case 'set-acknowledged':
      return { ...state, acknowledged: action.acknowledged, error: null }
    case 'generated':
      return { ...state, phase: 'plan', plan: action.plan, error: null }
    case 'generation-failed':
      return { ...state, error: action.message }
    case 'edit':
      return { ...state, phase: 'intake', error: null }
    case 'reset':
      return {
        ...initialPlannerState,
        phase: 'intake',
        persistenceAvailable: action.persistenceAvailable,
        persistenceNotice: action.persistenceNotice,
      }
    case 'storage-failed':
      return {
        ...state,
        persistenceAvailable: false,
        persistenceNotice:
          'Preferences cannot be retained on this device. You can still create and use a plan in this session.',
      }
    case 'dismiss-persistence-notice':
      return { ...state, persistenceNotice: null }
  }
}
