import exerciseData from './exercises.v1.json'
import policyData from './policy.v1.json'
import safetyData from './safety-copy.v1.json'
import sequenceData from './sequences.v1.json'
import {
  ExerciseCatalogueSchema,
  ProgramPolicySchema,
  SafetyCopySchema,
  SequenceCatalogueSchema,
  startingPoints,
} from '../domain/schemas'
import type {
  ContentBundle,
  ExerciseDefinition,
  PrescriptionStep,
} from '../domain/types'

export class ContentValidationError extends Error {
  constructor(readonly problems: readonly string[]) {
    super(`Content validation failed:\n${problems.join('\n')}`)
    this.name = 'ContentValidationError'
  }
}

function changedFields(
  previous: PrescriptionStep,
  current: PrescriptionStep,
): string[] {
  if (previous.mode !== current.mode) return ['mode']

  const fields = ['sets', 'tempo', 'range', 'restSeconds'] as const
  const changed = fields.filter((field) => previous[field] !== current[field])
  if (previous.mode === 'reps' && current.mode === 'reps') {
    if (previous.reps !== current.reps) changed.push('reps' as never)
  }
  if (previous.mode === 'timed' && current.mode === 'timed') {
    if (previous.workSeconds !== current.workSeconds) {
      changed.push('work' as never)
    }
  }
  return changed
}

function validateExerciseGraph(
  exercises: readonly ExerciseDefinition[],
): string[] {
  const problems: string[] = []
  const byId = new Map(exercises.map((exercise) => [exercise.id, exercise]))
  if (byId.size !== exercises.length) problems.push('Exercise IDs must be unique.')

  for (const exercise of exercises) {
    for (const [field, targetId] of [
      ['easierExerciseId', exercise.easierExerciseId],
      ['harderExerciseId', exercise.harderExerciseId],
    ] as const) {
      if (targetId && !byId.has(targetId)) {
        problems.push(`${exercise.id}.${field} references missing ${targetId}.`)
      }
    }
    const easier = exercise.easierExerciseId
      ? byId.get(exercise.easierExerciseId)
      : undefined
    const harder = exercise.harderExerciseId
      ? byId.get(exercise.harderExerciseId)
      : undefined
    if (easier && easier.family !== exercise.family) {
      problems.push(`${exercise.id}.easierExerciseId must stay in its family.`)
    }
    if (harder && harder.family !== exercise.family) {
      problems.push(`${exercise.id}.harderExerciseId must stay in its family.`)
    }
    if (!exercise.easierExerciseId && !exercise.terminalEasierModification) {
      problems.push(
        `${exercise.id} needs an easier exercise or terminal modification.`,
      )
    }

    for (const point of startingPoints) {
      const track = exercise.tracks[point]
      if (!track) continue
      track.forEach((step, index) => {
        if (index === 0 && step.changedDimension !== 'baseline') {
          problems.push(`${exercise.id}.${point}.week1 must be baseline.`)
        }
        if (index === 0) return
        const previous = track[index - 1]
        if (!previous) return
        const changed = changedFields(previous, step)
        const declared = step.changedDimension === 'work' ? 'work' : step.changedDimension
        if (changed.length !== 1 || changed[0] !== declared) {
          problems.push(
            `${exercise.id}.${point}.week${index + 1} changes ${changed.join(', ') || 'nothing'} but declares ${step.changedDimension}.`,
          )
        }
      })
    }
  }

  const visiting = new Set<string>()
  const visited = new Set<string>()
  const visit = (exerciseId: string) => {
    if (visiting.has(exerciseId)) {
      problems.push(`Harder-exercise progression contains a cycle at ${exerciseId}.`)
      return
    }
    if (visited.has(exerciseId)) return
    visiting.add(exerciseId)
    const harderId = byId.get(exerciseId)?.harderExerciseId
    if (harderId) visit(harderId)
    visiting.delete(exerciseId)
    visited.add(exerciseId)
  }
  for (const exercise of exercises) visit(exercise.id)

  return problems
}

export function loadContent(): ContentBundle {
  const catalogue = ExerciseCatalogueSchema.parse(exerciseData)
  const sequences = SequenceCatalogueSchema.parse(sequenceData)
  const policy = ProgramPolicySchema.parse(policyData)
  const safety = SafetyCopySchema.parse(safetyData)
  const problems = validateExerciseGraph(catalogue.exercises)

  if (policy.catalogVersion !== catalogue.metadata.version) {
    problems.push('Policy catalogVersion does not match the catalogue version.')
  }
  if (policy.safetyCopyVersion !== safety.version) {
    problems.push('Policy safetyCopyVersion does not match the safety copy.')
  }

  const sequenceIds = new Set(sequences.sequences.map((sequence) => sequence.id))
  if (sequenceIds.size !== sequences.sequences.length) {
    problems.push('Sequence IDs must be unique.')
  }
  for (const duration of ['15', '30', '45'] as const) {
    const references = policy.sequenceIds[duration]
    const warmup = sequences.sequences.find(
      (sequence) => sequence.id === references.warmup,
    )
    const cooldown = sequences.sequences.find(
      (sequence) => sequence.id === references.cooldown,
    )
    if (!warmup) {
      problems.push(`${duration}-minute policy references a missing warm-up.`)
    }
    if (!cooldown) {
      problems.push(`${duration}-minute policy references a missing cool-down.`)
    }
    const budget = policy.durationBudgets[duration]
    const totalBudget =
      budget.warmupSeconds +
      budget.mainSeconds +
      budget.cooldownSeconds +
      budget.bufferSeconds
    if (totalBudget !== Number(duration) * 60) {
      problems.push(`${duration}-minute policy budget must total ${duration} minutes.`)
    }
    if (warmup && warmup.durationSeconds !== budget.warmupSeconds) {
      problems.push(`${duration}-minute warm-up does not match its budget.`)
    }
    if (cooldown && cooldown.durationSeconds !== budget.cooldownSeconds) {
      problems.push(`${duration}-minute cool-down does not match its budget.`)
    }
  }

  if (problems.length > 0) throw new ContentValidationError(problems)

  return {
    metadata: catalogue.metadata,
    exercises: catalogue.exercises,
    sequences: sequences.sequences,
    policy,
    safety,
  }
}

export const content = loadContent()
