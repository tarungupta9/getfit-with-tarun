import { PlannerPreferencesSchema, weekdays } from './schemas'
import type {
  ContentBundle,
  ExerciseDefinition,
  ExplanationEntry,
  Family,
  GeneratedExercise,
  GeneratedPlan,
  GeneratedSession,
  GeneratedWeek,
  PlannerPreferences,
  PlanGenerationResult,
  PrescriptionStep,
  StartingPoint,
} from './types'

type SessionTemplate = {
  label: 'A' | 'B'
  exercises: readonly ExerciseDefinition[]
}

const targetDifficulty: Record<StartingPoint, 1 | 2 | 3> = {
  new: 1,
  lightly_active: 2,
  returning: 3,
}

export function calculateExerciseDurationSeconds(
  exercise: ExerciseDefinition,
  step: PrescriptionStep,
  transitionSeconds: number,
): number {
  const workSeconds =
    step.mode === 'reps'
      ? step.sets * step.reps * (exercise.secondsPerRep ?? 0)
      : step.sets * step.workSeconds
  return (
    workSeconds +
    Math.max(0, step.sets - 1) * step.restSeconds +
    transitionSeconds
  )
}

function maximumTrackDuration(
  exercise: ExerciseDefinition,
  startingPoint: StartingPoint,
  transitionSeconds: number,
): number {
  const track = exercise.tracks[startingPoint]
  if (!track) return Number.POSITIVE_INFINITY
  return Math.max(
    ...track.map((step) =>
      calculateExerciseDurationSeconds(exercise, step, transitionSeconds),
    ),
  )
}

function rankedCandidates(
  content: ContentBundle,
  family: Family,
  startingPoint: StartingPoint,
  excludedIds: ReadonlySet<string>,
): ExerciseDefinition[] {
  const desiredDifficulty = targetDifficulty[startingPoint]
  return content.exercises
    .filter(
      (exercise) =>
        exercise.family === family &&
        exercise.compatibleStartingPoints.includes(startingPoint) &&
        exercise.tracks[startingPoint] !== undefined &&
        !excludedIds.has(exercise.id),
    )
    .sort(
      (left, right) =>
        Math.abs(left.difficulty - desiredDifficulty) -
          Math.abs(right.difficulty - desiredDifficulty) ||
        left.selectionPriority - right.selectionPriority ||
        left.id.localeCompare(right.id),
    )
}

function buildTemplate(
  label: 'A' | 'B',
  preferences: PlannerPreferences,
  content: ContentBundle,
  adjacentTemplateIds: ReadonlySet<string>,
): SessionTemplate | null {
  const duration = String(preferences.minutesPerSession) as '15' | '30' | '45'
  const budget = content.policy.durationBudgets[duration].mainSeconds
  const required = content.policy.requiredFamilies[duration][label]
  const optional = content.policy.optionalFamilies[duration][label]
  const selected: ExerciseDefinition[] = []
  const usedIds = new Set(adjacentTemplateIds)
  let usedSeconds = 0

  for (const [family, requiredFamily] of [
    ...required.map((family) => [family, true] as const),
    ...optional.map((family) => [family, false] as const),
  ]) {
    const candidate = rankedCandidates(
      content,
      family,
      preferences.startingPoint,
      usedIds,
    ).find((exercise) => {
      const durationSeconds = maximumTrackDuration(
        exercise,
        preferences.startingPoint,
        content.policy.transitionSeconds,
      )
      return usedSeconds + durationSeconds <= budget
    })

    if (!candidate) {
      if (requiredFamily) return null
      continue
    }

    selected.push(candidate)
    usedIds.add(candidate.id)
    usedSeconds += maximumTrackDuration(
      candidate,
      preferences.startingPoint,
      content.policy.transitionSeconds,
    )
  }

  return { label, exercises: selected }
}

function hasAdjacentDays(days: readonly string[]): boolean {
  const dayIndexes = days.map((day) => weekdays.indexOf(day as never))
  return dayIndexes.some((day, index) => {
    const next = dayIndexes[index + 1]
    return next !== undefined && next - day === 1
  })
}

function buildExplanations(
  preferences: PlannerPreferences,
  templates: readonly SessionTemplate[],
): ExplanationEntry[] {
  const explanations: ExplanationEntry[] = [
    {
      code: 'schedule.selected_days',
      message: `Your sessions use the ${preferences.availableDays.length} weekdays you selected and alternate Workout A and B in calendar order.`,
      causedBy: 'availableDays',
    },
    {
      code: 'duration.allocation',
      message: `Every session fits warm-up, main work, transitions, cool-down, and buffer inside your ${preferences.minutesPerSession}-minute limit.`,
      causedBy: 'minutesPerSession',
    },
    {
      code: 'level.starting_point',
      message: `Exercise difficulty and starting volume use your “${preferences.startingPoint.replace('_', ' ')}” starting point.`,
      causedBy: 'startingPoint',
    },
  ]

  if (hasAdjacentDays(preferences.availableDays)) {
    explanations.push({
      code: 'schedule.adjacent_days',
      message:
        'Some selected days are adjacent, so Workout A and B use different exercise records and emphasis.',
      causedBy: 'availableDays',
    })
  }

  for (const template of templates) {
    for (const exercise of template.exercises) {
      explanations.push({
        code: 'exercise.selection',
        message: `${exercise.name} supplies ${exercise.family.replace('_', ' ')} work at a suitable starting difficulty.`,
        causedBy: exercise.id,
      })
    }
  }

  for (const week of [2, 3, 4]) {
    explanations.push({
      code: 'progression.week_step',
      message: `Week ${week} advances one reviewed prescription dimension at a time while keeping the exercise selection stable.`,
      causedBy: `week-${week}`,
    })
  }

  return explanations
}

export function generatePlan(
  input: unknown,
  content: ContentBundle,
): PlanGenerationResult {
  const parsed = PlannerPreferencesSchema.safeParse(input)
  if (!parsed.success) return { status: 'error', code: 'invalid_input' }
  const preferences = parsed.data

  if (
    content.policy.catalogVersion !== content.metadata.version ||
    content.policy.safetyCopyVersion !== content.safety.version
  ) {
    return { status: 'error', code: 'invalid_content' }
  }

  const templateA = buildTemplate('A', preferences, content, new Set())
  if (!templateA) return { status: 'error', code: 'no_valid_plan' }
  const templateB = buildTemplate(
    'B',
    preferences,
    content,
    new Set(templateA.exercises.map((exercise) => exercise.id)),
  )
  if (!templateB) return { status: 'error', code: 'no_valid_plan' }

  const templates = { A: templateA, B: templateB }
  const duration = String(preferences.minutesPerSession) as '15' | '30' | '45'
  const sequenceIds = content.policy.sequenceIds[duration]
  const warmup = content.sequences.find(
    (sequence) => sequence.id === sequenceIds.warmup,
  )
  const cooldown = content.sequences.find(
    (sequence) => sequence.id === sequenceIds.cooldown,
  )
  if (!warmup || !cooldown) return { status: 'error', code: 'invalid_content' }

  let sessionIndex = 0
  const weeks = ([1, 2, 3, 4] as const).map((weekNumber) => {
    const sessions: GeneratedSession[] = preferences.availableDays.map(
      (weekday) => {
        const label = sessionIndex % 2 === 0 ? 'A' : 'B'
        sessionIndex += 1
        const template = templates[label]
        const exercises: GeneratedExercise[] = template.exercises.map(
          (exercise) => ({
            exerciseId: exercise.id,
            prescription: exercise.tracks[preferences.startingPoint]![
              weekNumber - 1
            ]!,
          }),
        )
        const mainSeconds = exercises.reduce((total, plannedExercise) => {
          const definition = template.exercises.find(
            (exercise) => exercise.id === plannedExercise.exerciseId,
          )!
          return (
            total +
            calculateExerciseDurationSeconds(
              definition,
              plannedExercise.prescription,
              content.policy.transitionSeconds,
            )
          )
        }, 0)

        return {
          label,
          weekday,
          warmupSequenceId: warmup.id,
          cooldownSequenceId: cooldown.id,
          estimatedDurationSeconds:
            warmup.durationSeconds + mainSeconds + cooldown.durationSeconds,
          exercises,
        }
      },
    )
    return {
      weekNumber: weekNumber as 1 | 2 | 3 | 4,
      sessions,
    }
  }) as unknown as [GeneratedWeek, GeneratedWeek, GeneratedWeek, GeneratedWeek]

  const plan: GeneratedPlan = {
    policyVersion: content.policy.version,
    catalogVersion: content.metadata.version,
    safetyCopyVersion: content.safety.version,
    estimatedMinutesPerSession: preferences.minutesPerSession,
    weeks,
    explanations: buildExplanations(preferences, [templateA, templateB]),
  }
  return { status: 'ok', plan }
}
