import { weekdays } from '../../domain/schemas'
import type {
  GeneratedPlan,
  PlannerPreferences,
  StartingPoint,
  Weekday,
} from '../../domain/types'
import { defaultPreferences } from '../../persistence/preferences'

export type PlannerStep = 1 | 2 | 3 | 4

export interface PlannerState {
  phase: 'hydrating' | 'landing' | 'plan'
  preferences: PlannerPreferences
  acknowledged: boolean
  plan: GeneratedPlan | null
  modalOpen: boolean
  step: PlannerStep
  draftPreferences: PlannerPreferences
  draftAcknowledged: boolean
  selectedWeek: 1 | 2 | 3 | 4
  selectedDay: Weekday
  error: string | null
  persistenceNotice: string | null
  persistenceAvailable: boolean
}

export type PlannerAction =
  | {
      type: 'hydrated'
      preferences: PlannerPreferences
      plan: GeneratedPlan | null
      persistenceNotice: string | null
      persistenceAvailable: boolean
    }
  | { type: 'open-modal' }
  | { type: 'close-modal' }
  | { type: 'set-step'; step: PlannerStep }
  | { type: 'set-minutes'; minutes: 15 | 30 | 45 }
  | { type: 'toggle-day'; day: Weekday }
  | { type: 'set-starting-point'; startingPoint: StartingPoint }
  | { type: 'set-acknowledged'; acknowledged: boolean }
  | { type: 'generated'; plan: GeneratedPlan }
  | { type: 'generation-failed'; message: string }
  | { type: 'select-week'; week: 1 | 2 | 3 | 4 }
  | { type: 'select-day'; day: Weekday }
  | {
      type: 'reset-draft'
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
  modalOpen: false,
  step: 1,
  draftPreferences: defaultPreferences,
  draftAcknowledged: false,
  selectedWeek: 1,
  selectedDay: defaultPreferences.availableDays[0]!,
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
        phase: action.plan ? 'plan' : 'landing',
        preferences: action.preferences,
        draftPreferences: action.preferences,
        plan: action.plan,
        selectedDay: action.preferences.availableDays[0]!,
        persistenceNotice: action.persistenceNotice,
        persistenceAvailable: action.persistenceAvailable,
      }
    case 'open-modal':
      return {
        ...state,
        modalOpen: true,
        step: 1,
        draftPreferences: state.preferences,
        draftAcknowledged: state.acknowledged,
        error: null,
      }
    case 'close-modal':
      return { ...state, modalOpen: false, error: null }
    case 'set-step':
      return { ...state, step: action.step, error: null }
    case 'set-minutes':
      return {
        ...state,
        draftPreferences: {
          ...state.draftPreferences,
          minutesPerSession: action.minutes,
        },
        error: null,
      }
    case 'toggle-day': {
      const selected = state.draftPreferences.availableDays.includes(action.day)
      if (!selected && state.draftPreferences.availableDays.length >= 4)
        return state
      const availableDays = (
        selected
          ? state.draftPreferences.availableDays.filter(
              (day) => day !== action.day,
            )
          : [...state.draftPreferences.availableDays, action.day]
      ).sort((left, right) => weekdays.indexOf(left) - weekdays.indexOf(right))
      return {
        ...state,
        draftPreferences: { ...state.draftPreferences, availableDays },
        error: null,
      }
    }
    case 'set-starting-point':
      return {
        ...state,
        draftPreferences: {
          ...state.draftPreferences,
          startingPoint: action.startingPoint,
        },
        error: null,
      }
    case 'set-acknowledged':
      return { ...state, draftAcknowledged: action.acknowledged, error: null }
    case 'generated':
      return {
        ...state,
        phase: 'plan',
        preferences: state.draftPreferences,
        acknowledged: state.draftAcknowledged,
        plan: action.plan,
        modalOpen: false,
        selectedWeek: 1,
        selectedDay: state.draftPreferences.availableDays[0]!,
        error: null,
      }
    case 'generation-failed':
      return { ...state, error: action.message }
    case 'select-week':
      return { ...state, selectedWeek: action.week }
    case 'select-day':
      return { ...state, selectedDay: action.day }
    case 'reset-draft':
      return {
        ...state,
        step: 1,
        draftPreferences: defaultPreferences,
        draftAcknowledged: false,
        acknowledged: false,
        error: null,
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
