import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const contentDirectory = resolve(scriptDirectory, '../src/content')

const points = ['new', 'lightly_active', 'returning']
const stopGuidance =
  'Stop if you feel sharp pain, chest discomfort, faintness, or unusual shortness of breath.'
const source = {
  demonstrationUrl:
    'https://www.nhs.uk/live-well/exercise/strength-exercises/',
  publisher: 'NHS',
  evidenceUrl: 'https://www.nhs.uk/live-well/exercise/strength-exercises/',
  reviewedBy: 'Pending qualified fitness review',
  lastCheckedAt: '2026-09-01',
  availability: 'available',
}

function repTrack(startingPoint) {
  const values = {
    new: [
      [2, 6, 'controlled', 'reduced', 'baseline'],
      [2, 7, 'controlled', 'reduced', 'reps'],
      [3, 7, 'controlled', 'reduced', 'sets'],
      [3, 7, 'three_second_lower', 'reduced', 'tempo'],
    ],
    lightly_active: [
      [2, 8, 'controlled', 'comfortable', 'baseline'],
      [2, 9, 'controlled', 'comfortable', 'reps'],
      [3, 9, 'controlled', 'comfortable', 'sets'],
      [3, 9, 'three_second_lower', 'comfortable', 'tempo'],
    ],
    returning: [
      [2, 10, 'controlled', 'comfortable', 'baseline'],
      [3, 10, 'controlled', 'comfortable', 'sets'],
      [3, 10, 'three_second_lower', 'comfortable', 'tempo'],
      [3, 10, 'three_second_lower', 'full_comfortable', 'range'],
    ],
  }[startingPoint]

  return values.map(([sets, reps, tempo, range, changedDimension]) => ({
    mode: 'reps',
    sets,
    reps,
    tempo,
    range,
    restSeconds: 30,
    changedDimension,
  }))
}

function timedTrack(startingPoint) {
  const values = {
    new: [
      [1, 20, 'baseline'],
      [1, 25, 'work'],
      [2, 25, 'sets'],
      [2, 30, 'work'],
    ],
    lightly_active: [
      [2, 20, 'baseline'],
      [2, 25, 'work'],
      [3, 25, 'sets'],
      [3, 30, 'work'],
    ],
    returning: [
      [2, 25, 'baseline'],
      [3, 25, 'sets'],
      [3, 30, 'work'],
      [3, 35, 'work'],
    ],
  }[startingPoint]

  return values.map(([sets, workSeconds, changedDimension]) => ({
    mode: 'timed',
    sets,
    workSeconds,
    tempo: 'natural',
    range: 'comfortable',
    restSeconds: 30,
    changedDimension,
  }))
}

const definitions = [
  ['sit-to-stand-supported', 'Supported sit-to-stand', 'knee', 1, ['stable_chair'], 'knee.svg', 'Use your hands lightly on a stable chair as you stand.', 'Press through your whole foot and stand tall.', 'Builds confidence with the squat pattern using extra support.'],
  ['chair-squat', 'Chair squat', 'knee', 2, ['stable_chair'], 'knee.svg', 'Reach your hips back toward a stable chair.', 'Keep your knees tracking in the same direction as your toes.', 'Practises controlled sitting and standing strength.'],
  ['bodyweight-squat-chair-target', 'Bodyweight squat to chair target', 'knee', 3, ['stable_chair'], 'knee.svg', 'Hover above the chair instead of sitting down.', 'Keep your chest comfortably tall and your whole foot grounded.', 'Adds control and range while keeping a clear depth target.'],
  ['short-range-glute-bridge', 'Short-range glute bridge', 'posterior_hip', 1, ['floor'], 'posterior.svg', 'Press through your feet and lift only as high as feels comfortable.', 'Keep your ribs relaxed instead of arching your lower back.', 'Introduces hip extension with a deliberately small range.'],
  ['glute-bridge', 'Glute bridge', 'posterior_hip', 2, ['floor'], 'posterior.svg', 'Press through your feet and lift your hips smoothly.', 'Finish with your body in a comfortable line from shoulders to knees.', 'Builds posterior-chain strength without standing balance demands.'],
  ['paused-glute-bridge', 'Paused glute bridge', 'posterior_hip', 3, ['floor'], 'posterior.svg', 'Pause briefly at the top while breathing normally.', 'Lower with control and reset before the next repetition.', 'Adds control to a familiar posterior-chain movement.'],
  ['reduced-wall-hinge', 'Reduced-range wall hinge', 'posterior_hip', 1, ['wall'], 'posterior.svg', 'Stand close to a wall and send your hips back gently.', 'Keep your spine long and stop at a comfortable range.', 'Teaches the hip-hinge pattern with a short target distance.'],
  ['wall-hip-hinge', 'Wall hip-hinge drill', 'posterior_hip', 2, ['wall'], 'posterior.svg', 'Reach your hips back to touch the wall behind you.', 'Keep soft knees and feel the movement come from the hips.', 'Makes the hip-hinge direction easy to understand.'],
  ['unsupported-bodyweight-hinge', 'Unsupported bodyweight hinge', 'posterior_hip', 3, [], 'posterior.svg', 'Push your hips back without using the wall as a target.', 'Stand by squeezing your glutes rather than leaning backward.', 'Practises an independent hip hinge for daily lifting patterns.'],
  ['upright-wall-push-up', 'More upright wall push-up', 'push', 1, ['wall'], 'push.svg', 'Stand close enough to the wall that the movement feels easy.', 'Move your body as one line from head to heel.', 'Introduces pushing strength with a highly adjustable load.'],
  ['wall-push-up', 'Wall push-up', 'push', 2, ['wall'], 'push.svg', 'Place your hands slightly wider than shoulder width.', 'Bend your elbows, bring your chest toward the wall, then press away.', 'Builds upper-body pushing strength without floor transitions.'],
  ['knee-push-up', 'Knee push-up', 'push', 3, ['floor'], 'push.svg', 'Set a straight line from your head through your knees.', 'Lower only as far as you can keep your trunk steady.', 'Increases pushing demand while retaining a shorter lever.'],
  ['standing-wall-w', 'Standing wall W', 'upper_back', 1, ['wall'], 'upper-back.svg', 'Stand comfortably against a wall with your arms in a W shape.', 'Draw your shoulder blades gently down and together.', 'Introduces upper-back engagement in a supported position.'],
  ['prone-w-raise', 'Prone W raise', 'upper_back', 2, ['floor'], 'upper-back.svg', 'Lie face down with your arms in a W shape.', 'Lift your hands slightly without shrugging your shoulders.', 'Builds awareness and endurance around the upper back.'],
  ['prone-reverse-snow-angel', 'Prone reverse snow angel', 'upper_back', 3, ['floor'], 'upper-back.svg', 'Sweep your arms slowly while keeping them just above the floor.', 'Use a pain-free range and keep your neck relaxed.', 'Adds controlled shoulder movement to upper-back endurance work.'],
  ['heel-taps', 'Heel taps', 'trunk', 1, ['floor'], 'trunk.svg', 'Keep your lower back comfortably heavy on the floor.', 'Tap one heel away and return before changing sides.', 'Introduces trunk control with one short moving lever.'],
  ['dead-bug', 'Dead bug', 'trunk', 2, ['floor'], 'trunk.svg', 'Move the opposite arm and leg without arching your back.', 'Exhale as the limbs move away and return with control.', 'Builds trunk control while the arms and legs move.'],
  ['extended-dead-bug', 'Extended dead bug', 'trunk', 3, ['floor'], 'trunk.svg', 'Reach the moving arm and leg farther only if your trunk stays steady.', 'Make the range smaller when your back begins to lift.', 'Progresses dead-bug control through a longer lever.'],
  ['single-limb-bird-dog', 'Single-limb bird-dog reach', 'trunk', 1, ['floor'], 'trunk.svg', 'From hands and knees, reach only one arm or one leg.', 'Keep your hips level and your movement slow.', 'Introduces quadruped trunk stability one limb at a time.'],
  ['bird-dog', 'Bird dog', 'trunk', 2, ['floor'], 'trunk.svg', 'Reach the opposite arm and leg while keeping your hips square.', 'Return gently without shifting your weight quickly.', 'Challenges trunk stability with opposite-limb movement.'],
  ['paused-bird-dog', 'Paused bird dog', 'trunk', 3, ['floor'], 'trunk.svg', 'Pause in the extended position while breathing normally.', 'Keep your ribs and pelvis facing the floor.', 'Adds control and time under tension to bird dog.'],
  ['supported-march', 'Supported march in place', 'conditioning', 1, ['stable_chair'], 'conditioning.svg', 'Keep one hand near a stable chair and march at an easy pace.', 'Stay tall and place each foot down quietly.', 'Raises movement volume while keeping balance support nearby.'],
  ['march-in-place', 'March in place', 'conditioning', 2, [], 'conditioning.svg', 'March at a pace that lets you speak in full sentences.', 'Land softly and let your arms swing naturally.', 'Adds accessible low-impact conditioning without equipment.'],
  ['low-impact-step-jack', 'Low-impact step jack', 'conditioning', 3, [], 'conditioning.svg', 'Step one foot out as your arms rise, then return and change sides.', 'Keep the movement smooth and avoid jumping.', 'Adds whole-body rhythm and a modest conditioning challenge.'],
]

const progressionChains = [
  ['sit-to-stand-supported', 'chair-squat', 'bodyweight-squat-chair-target'],
  ['short-range-glute-bridge', 'glute-bridge', 'paused-glute-bridge'],
  ['reduced-wall-hinge', 'wall-hip-hinge', 'unsupported-bodyweight-hinge'],
  ['upright-wall-push-up', 'wall-push-up', 'knee-push-up'],
  ['standing-wall-w', 'prone-w-raise', 'prone-reverse-snow-angel'],
  ['heel-taps', 'dead-bug', 'extended-dead-bug'],
  ['single-limb-bird-dog', 'bird-dog', 'paused-bird-dog'],
  ['supported-march', 'march-in-place', 'low-impact-step-jack'],
]
const progressionChainById = new Map(
  progressionChains.flatMap((chain) => chain.map((id) => [id, chain])),
)

const exercises = definitions.map((definition, index) => {
  const [id, name, family, difficulty, setup, illustration, cueOne, cueTwo, rationale] = definition
  const familyIds = progressionChainById.get(id)
  if (!familyIds) throw new Error(`Missing progression chain for ${id}.`)
  const familyIndex = familyIds.indexOf(id)
  const mode = family === 'conditioning' ? 'timed' : 'reps'
  return {
    id,
    name,
    family,
    difficulty,
    compatibleStartingPoints: points,
    setup,
    selectionPriority: index + 1,
    ...(mode === 'reps' ? { secondsPerRep: 4 } : {}),
    easierExerciseId: familyIndex > 0 ? familyIds[familyIndex - 1] : null,
    harderExerciseId:
      familyIndex < familyIds.length - 1 ? familyIds[familyIndex + 1] : null,
    ...(familyIndex === 0
      ? { terminalEasierModification: 'Use a smaller comfortable range and move more slowly.' }
      : {}),
    tracks: Object.fromEntries(
      points.map((point) => [point, mode === 'timed' ? timedTrack(point) : repTrack(point)]),
    ),
    illustrationPath: `/exercises/${illustration}`,
    illustrationAlt: `Simple line illustration for ${name.toLowerCase()}.`,
    cues: [cueOne, cueTwo],
    stopGuidance,
    educationalRationale: rationale,
    source,
  }
})

const catalogue = {
  metadata: {
    version: 'catalogue-2026-09-01-draft.1',
    reviewStatus: 'draft',
    reviewedBy: null,
    reviewedAt: null,
  },
  exercises,
}

const sequences = {
  version: 'sequences-2026-09-01-draft.1',
  sequences: [
    { id: 'warmup-2', name: 'Two-minute warm-up', durationSeconds: 120, steps: [
      { name: 'Easy march', durationSeconds: 60, cue: 'Move at a conversational pace.' },
      { name: 'Shoulder rolls and hip hinges', durationSeconds: 60, cue: 'Use a comfortable range.' },
    ] },
    { id: 'warmup-4', name: 'Four-minute warm-up', durationSeconds: 240, steps: [
      { name: 'Easy march', durationSeconds: 90, cue: 'Move at a conversational pace.' },
      { name: 'Shoulder circles', durationSeconds: 60, cue: 'Keep your neck relaxed.' },
      { name: 'Wall hip hinges', durationSeconds: 90, cue: 'Move slowly through a comfortable range.' },
    ] },
    { id: 'warmup-5', name: 'Five-minute warm-up', durationSeconds: 300, steps: [
      { name: 'Easy march', durationSeconds: 120, cue: 'Gradually settle into a steady pace.' },
      { name: 'Shoulder circles', durationSeconds: 60, cue: 'Keep your neck relaxed.' },
      { name: 'Wall hip hinges', durationSeconds: 60, cue: 'Move slowly through a comfortable range.' },
      { name: 'Supported sit-to-stands', durationSeconds: 60, cue: 'Use the chair and move smoothly.' },
    ] },
    { id: 'cooldown-2', name: 'Two-minute cool-down', durationSeconds: 120, steps: [
      { name: 'Slow walk', durationSeconds: 60, cue: 'Let your breathing settle.' },
      { name: 'Easy reach and breathe', durationSeconds: 60, cue: 'Avoid forcing a stretch.' },
    ] },
    { id: 'cooldown-3', name: 'Three-minute cool-down', durationSeconds: 180, steps: [
      { name: 'Slow walk', durationSeconds: 90, cue: 'Let your breathing settle.' },
      { name: 'Easy reach and breathe', durationSeconds: 90, cue: 'Avoid forcing a stretch.' },
    ] },
    { id: 'cooldown-4', name: 'Four-minute cool-down', durationSeconds: 240, steps: [
      { name: 'Slow walk', durationSeconds: 120, cue: 'Let your breathing settle.' },
      { name: 'Easy reach and breathe', durationSeconds: 120, cue: 'Avoid forcing a stretch.' },
    ] },
  ],
}

const policy = {
  version: 'policy-2026-09-01-draft.1',
  catalogVersion: catalogue.metadata.version,
  safetyCopyVersion: 'safety-2026-09-01-draft.1',
  transitionSeconds: 15,
  durationBudgets: {
    '15': { warmupSeconds: 120, mainSeconds: 600, cooldownSeconds: 120, bufferSeconds: 60 },
    '30': { warmupSeconds: 240, mainSeconds: 1260, cooldownSeconds: 180, bufferSeconds: 120 },
    '45': { warmupSeconds: 300, mainSeconds: 1980, cooldownSeconds: 240, bufferSeconds: 180 },
  },
  requiredFamilies: {
    '15': { A: ['knee', 'push', 'trunk'], B: ['posterior_hip', 'upper_back', 'trunk'] },
    '30': { A: ['knee', 'push', 'trunk', 'conditioning'], B: ['posterior_hip', 'upper_back', 'trunk', 'conditioning'] },
    '45': { A: ['knee', 'push', 'trunk', 'posterior_hip', 'conditioning'], B: ['posterior_hip', 'upper_back', 'trunk', 'knee', 'conditioning'] },
  },
  optionalFamilies: {
    '15': { A: [], B: [] },
    '30': { A: ['posterior_hip', 'upper_back'], B: ['knee', 'push'] },
    '45': {
      A: ['upper_back', 'knee', 'push', 'trunk', 'posterior_hip', 'conditioning'],
      B: ['push', 'posterior_hip', 'upper_back', 'trunk'],
    },
  },
  sequenceIds: {
    '15': { warmup: 'warmup-2', cooldown: 'cooldown-2' },
    '30': { warmup: 'warmup-4', cooldown: 'cooldown-3' },
    '45': { warmup: 'warmup-5', cooldown: 'cooldown-4' },
  },
}

const safety = {
  version: policy.safetyCopyVersion,
  audience: 'General educational exercise guidance for apparently healthy adults aged 18–64.',
  disclaimer: 'GetFit cannot assess your health, injuries, pregnancy or postpartum needs, medications, or movement quality. If you have chest pain, fainting or dizziness, unusual shortness of breath, an active injury or pain, a condition or exercise restriction, or are pregnant or postpartum, get guidance from a qualified healthcare or fitness professional before following a plan. Stop and seek appropriate care if you feel acutely unwell.',
  acknowledgement: 'I understand this is general guidance and not medical advice.',
  planStopGuidance: 'Stop for sharp pain, faintness, chest discomfort, or unusual shortness of breath. This plan cannot assess your form or health.',
}

await mkdir(contentDirectory, { recursive: true })
await Promise.all([
  writeFile(resolve(contentDirectory, 'exercises.v1.json'), `${JSON.stringify(catalogue, null, 2)}\n`),
  writeFile(resolve(contentDirectory, 'sequences.v1.json'), `${JSON.stringify(sequences, null, 2)}\n`),
  writeFile(resolve(contentDirectory, 'policy.v1.json'), `${JSON.stringify(policy, null, 2)}\n`),
  writeFile(resolve(contentDirectory, 'safety-copy.v1.json'), `${JSON.stringify(safety, null, 2)}\n`),
])

console.log(`Generated ${exercises.length} draft exercises and supporting content.`)
