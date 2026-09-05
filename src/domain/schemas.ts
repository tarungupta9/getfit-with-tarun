import { z } from 'zod'
import { getYouTubeVideoId } from './youtube'

export const weekdays = [
  'mon',
  'tue',
  'wed',
  'thu',
  'fri',
  'sat',
  'sun',
] as const
export const startingPoints = [
  'new',
  'lightly_active',
  'returning',
] as const
export const families = [
  'knee',
  'posterior_hip',
  'push',
  'upper_back',
  'trunk',
  'conditioning',
] as const

export const WeekdaySchema = z.enum(weekdays)
export const StartingPointSchema = z.enum(startingPoints)
export const FamilySchema = z.enum(families)
export const SetupRequirementSchema = z.enum([
  'floor',
  'wall',
  'stable_chair',
])

export const PlannerPreferencesSchema = z
  .object({
    minutesPerSession: z.union([z.literal(15), z.literal(30), z.literal(45)]),
    availableDays: z.array(WeekdaySchema).min(2).max(4),
    startingPoint: StartingPointSchema,
  })
  .superRefine(({ availableDays }, context) => {
    if (new Set(availableDays).size !== availableDays.length) {
      context.addIssue({
        code: 'custom',
        path: ['availableDays'],
        message: 'Weekdays must be unique.',
      })
    }

    const sorted = [...availableDays].sort(
      (left, right) => weekdays.indexOf(left) - weekdays.indexOf(right),
    )
    if (sorted.some((day, index) => day !== availableDays[index])) {
      context.addIssue({
        code: 'custom',
        path: ['availableDays'],
        message: 'Weekdays must be ordered Monday through Sunday.',
      })
    }
  })

export const StoredPreferencesSchema = z.object({
  schemaVersion: z.literal(1),
  preferences: PlannerPreferencesSchema,
})

const TempoSchema = z.enum(['natural', 'controlled', 'three_second_lower'])
const RangeSchema = z.enum(['reduced', 'comfortable', 'full_comfortable'])
const StepBaseSchema = z.object({
  sets: z.number().int().positive().max(6),
  tempo: TempoSchema,
  range: RangeSchema,
  restSeconds: z.number().int().nonnegative().max(180),
})
const RepStepSchema = StepBaseSchema.extend({
  mode: z.literal('reps'),
  reps: z.number().int().positive().max(50),
  changedDimension: z.enum(['baseline', 'reps', 'sets', 'tempo', 'range']),
})
const TimedStepSchema = StepBaseSchema.extend({
  mode: z.literal('timed'),
  workSeconds: z.number().int().positive().max(300),
  changedDimension: z.enum(['baseline', 'work', 'sets', 'tempo', 'range']),
})
export const PrescriptionStepSchema = z.discriminatedUnion('mode', [
  RepStepSchema,
  TimedStepSchema,
])
export const PrescriptionTrackSchema = z.tuple([
  PrescriptionStepSchema,
  PrescriptionStepSchema,
  PrescriptionStepSchema,
  PrescriptionStepSchema,
])

const SourceRecordSchema = z.object({
  demonstrationUrl: z
    .url({ protocol: /^https$/ })
    .refine((url) => getYouTubeVideoId(url) !== null, {
      message: 'Demonstration URL must identify a direct YouTube video.',
    }),
  demonstrationTitle: z.string().min(1),
  publisher: z.string().min(1),
  evidenceUrl: z.url({ protocol: /^https$/ }),
  reviewedBy: z.string().min(1),
  lastCheckedAt: z.iso.date(),
  availability: z.enum(['available', 'unavailable']),
})

const ExercisePostureImageSchema = z.object({
  phase: z.enum(['start', 'movement', 'finish']),
  path: z.string().startsWith('/exercises/').endsWith('.webp'),
  alt: z.string().min(1),
  caption: z.string().min(1),
})

export const ExerciseDefinitionSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    name: z.string().min(1),
    family: FamilySchema,
    difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    compatibleStartingPoints: z.array(StartingPointSchema).min(1),
    setup: z.array(SetupRequirementSchema),
    selectionPriority: z.number().int().nonnegative(),
    secondsPerRep: z.number().positive().max(20).optional(),
    easierExerciseId: z.string().nullable(),
    harderExerciseId: z.string().nullable(),
    terminalEasierModification: z.string().min(1).optional(),
    tracks: z.partialRecord(StartingPointSchema, PrescriptionTrackSchema),
    postureImages: z.tuple([
      ExercisePostureImageSchema,
      ExercisePostureImageSchema,
      ExercisePostureImageSchema,
    ]),
    cues: z.array(z.string().min(1)).min(2).max(4),
    stopGuidance: z.string().min(1),
    educationalRationale: z.string().min(1),
    source: SourceRecordSchema,
  })
  .superRefine((exercise, context) => {
    const expectedPhases = ['start', 'movement', 'finish'] as const
    exercise.postureImages.forEach((image, index) => {
      if (image.phase !== expectedPhases[index]) {
        context.addIssue({
          code: 'custom',
          path: ['postureImages', index, 'phase'],
          message: `Posture image ${index + 1} must be ${expectedPhases[index]}.`,
        })
      }
    })
    if (new Set(exercise.postureImages.map((image) => image.path)).size !== 3) {
      context.addIssue({
        code: 'custom',
        path: ['postureImages'],
        message: 'Posture image paths must be unique.',
      })
    }
    const declared = new Set(exercise.compatibleStartingPoints)
    for (const point of startingPoints) {
      const hasTrack = exercise.tracks[point] !== undefined
      if (declared.has(point) !== hasTrack) {
        context.addIssue({
          code: 'custom',
          path: ['tracks', point],
          message: 'Tracks must exactly match compatible starting points.',
        })
      }
    }
    for (const track of Object.values(exercise.tracks)) {
      if (track?.some((step) => step.mode === 'reps') && !exercise.secondsPerRep) {
        context.addIssue({
          code: 'custom',
          path: ['secondsPerRep'],
          message: 'Rep-based tracks require secondsPerRep.',
        })
      }
    }
  })

export const ExerciseCatalogueSchema = z.object({
  metadata: z
    .object({
    version: z.string().min(1),
    reviewStatus: z.enum(['draft', 'approved']),
    reviewedBy: z.string().nullable(),
    reviewedAt: z.iso.date().nullable(),
    })
    .superRefine((metadata, context) => {
      if (
        metadata.reviewStatus === 'approved' &&
        (!metadata.reviewedBy || !metadata.reviewedAt)
      ) {
        context.addIssue({
          code: 'custom',
          message:
            'Approved catalogues require both reviewer identity and review date.',
        })
      }
    }),
  exercises: z.array(ExerciseDefinitionSchema).min(1),
})

export const SequenceCatalogueSchema = z.object({
  version: z.string().min(1),
  sequences: z.array(
    z
      .object({
        id: z.string().regex(/^[a-z0-9-]+$/),
        name: z.string().min(1),
        durationSeconds: z.number().int().positive(),
        steps: z
          .array(
            z.object({
              name: z.string().min(1),
              durationSeconds: z.number().int().positive(),
              cue: z.string().min(1),
            }),
          )
          .min(1),
      })
      .superRefine((sequence, context) => {
        const stepTotal = sequence.steps.reduce(
          (total, step) => total + step.durationSeconds,
          0,
        )
        if (stepTotal !== sequence.durationSeconds) {
          context.addIssue({
            code: 'custom',
            path: ['durationSeconds'],
            message: 'Sequence duration must equal the sum of its steps.',
          })
        }
      }),
  ),
})

const DurationBudgetSchema = z.object({
  warmupSeconds: z.number().int().positive(),
  mainSeconds: z.number().int().positive(),
  cooldownSeconds: z.number().int().positive(),
  bufferSeconds: z.number().int().nonnegative(),
})
const FamilySetSchema = z.object({
  A: z.array(FamilySchema),
  B: z.array(FamilySchema),
})
const SequenceIdSchema = z.object({
  warmup: z.string().min(1),
  cooldown: z.string().min(1),
})

export const ProgramPolicySchema = z.object({
  version: z.string().min(1),
  catalogVersion: z.string().min(1),
  safetyCopyVersion: z.string().min(1),
  transitionSeconds: z.literal(15),
  durationBudgets: z.object({
    '15': DurationBudgetSchema,
    '30': DurationBudgetSchema,
    '45': DurationBudgetSchema,
  }),
  requiredFamilies: z.object({
    '15': FamilySetSchema,
    '30': FamilySetSchema,
    '45': FamilySetSchema,
  }),
  optionalFamilies: z.object({
    '15': FamilySetSchema,
    '30': FamilySetSchema,
    '45': FamilySetSchema,
  }),
  sequenceIds: z.object({
    '15': SequenceIdSchema,
    '30': SequenceIdSchema,
    '45': SequenceIdSchema,
  }),
})

export const SafetyCopySchema = z.object({
  version: z.string().min(1),
  audience: z.string().min(1),
  disclaimer: z.string().min(1),
  acknowledgement: z.string().min(1),
  planStopGuidance: z.string().min(1),
})
