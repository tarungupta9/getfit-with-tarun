export type Weekday =
  | 'mon'
  | 'tue'
  | 'wed'
  | 'thu'
  | 'fri'
  | 'sat'
  | 'sun'

export type StartingPoint = 'new' | 'lightly_active' | 'returning'
export type Family =
  | 'knee'
  | 'posterior_hip'
  | 'push'
  | 'upper_back'
  | 'trunk'
  | 'conditioning'
export type SetupRequirement = 'floor' | 'wall' | 'stable_chair'

export interface PlannerPreferences {
  minutesPerSession: 15 | 30 | 45
  availableDays: readonly Weekday[]
  startingPoint: StartingPoint
}

export interface StoredPreferences {
  schemaVersion: 1
  preferences: PlannerPreferences
}

export interface CatalogueMetadata {
  version: string
  reviewStatus: 'draft' | 'approved'
  reviewedBy: string | null
  reviewedAt: string | null
}

export interface RepPrescriptionStep {
  mode: 'reps'
  sets: number
  reps: number
  tempo: 'natural' | 'controlled' | 'three_second_lower'
  range: 'reduced' | 'comfortable' | 'full_comfortable'
  restSeconds: number
  changedDimension: 'baseline' | 'reps' | 'sets' | 'tempo' | 'range'
}

export interface TimedPrescriptionStep {
  mode: 'timed'
  sets: number
  workSeconds: number
  tempo: 'natural' | 'controlled' | 'three_second_lower'
  range: 'reduced' | 'comfortable' | 'full_comfortable'
  restSeconds: number
  changedDimension: 'baseline' | 'work' | 'sets' | 'tempo' | 'range'
}

export type PrescriptionStep =
  | RepPrescriptionStep
  | TimedPrescriptionStep
export type PrescriptionTrack = readonly [
  PrescriptionStep,
  PrescriptionStep,
  PrescriptionStep,
  PrescriptionStep,
]

export interface SourceRecord {
  demonstrationUrl: string
  publisher: string
  evidenceUrl: string
  reviewedBy: string
  lastCheckedAt: string
  availability: 'available' | 'unavailable'
}

export interface ExerciseDefinition {
  id: string
  name: string
  family: Family
  difficulty: 1 | 2 | 3
  compatibleStartingPoints: readonly StartingPoint[]
  setup: readonly SetupRequirement[]
  selectionPriority: number
  secondsPerRep?: number
  easierExerciseId: string | null
  harderExerciseId: string | null
  terminalEasierModification?: string
  tracks: Partial<Record<StartingPoint, PrescriptionTrack>>
  illustrationPath: string
  illustrationAlt: string
  cues: readonly string[]
  stopGuidance: string
  educationalRationale: string
  source: SourceRecord
}

export interface ReviewedSequence {
  id: string
  name: string
  durationSeconds: number
  steps: readonly {
    name: string
    durationSeconds: number
    cue: string
  }[]
}

export interface ProgramPolicy {
  version: string
  catalogVersion: string
  safetyCopyVersion: string
  transitionSeconds: 15
  durationBudgets: Record<
    '15' | '30' | '45',
    {
      warmupSeconds: number
      mainSeconds: number
      cooldownSeconds: number
      bufferSeconds: number
    }
  >
  requiredFamilies: Record<
    '15' | '30' | '45',
    { A: readonly Family[]; B: readonly Family[] }
  >
  optionalFamilies: Record<
    '15' | '30' | '45',
    { A: readonly Family[]; B: readonly Family[] }
  >
  sequenceIds: Record<
    '15' | '30' | '45',
    { warmup: string; cooldown: string }
  >
}

export interface SafetyCopy {
  version: string
  audience: string
  disclaimer: string
  acknowledgement: string
  planStopGuidance: string
}

export interface ContentBundle {
  metadata: CatalogueMetadata
  exercises: readonly ExerciseDefinition[]
  sequences: readonly ReviewedSequence[]
  policy: ProgramPolicy
  safety: SafetyCopy
}

export type ExplanationCode =
  | 'schedule.selected_days'
  | 'schedule.adjacent_days'
  | 'duration.allocation'
  | 'level.starting_point'
  | 'exercise.selection'
  | 'progression.week_step'

export interface ExplanationEntry {
  code: ExplanationCode
  message: string
  causedBy: string
}

export interface GeneratedExercise {
  exerciseId: string
  prescription: PrescriptionStep
}

export interface GeneratedSession {
  label: 'A' | 'B'
  weekday: Weekday
  warmupSequenceId: string
  cooldownSequenceId: string
  estimatedDurationSeconds: number
  exercises: readonly GeneratedExercise[]
}

export interface GeneratedWeek {
  weekNumber: 1 | 2 | 3 | 4
  sessions: readonly GeneratedSession[]
}

export interface GeneratedPlan {
  policyVersion: string
  catalogVersion: string
  safetyCopyVersion: string
  estimatedMinutesPerSession: 15 | 30 | 45
  weeks: readonly [GeneratedWeek, GeneratedWeek, GeneratedWeek, GeneratedWeek]
  explanations: readonly ExplanationEntry[]
}

export type PlanGenerationResult =
  | { status: 'ok'; plan: GeneratedPlan }
  | {
      status: 'error'
      code: 'invalid_input' | 'invalid_content' | 'no_valid_plan'
    }
