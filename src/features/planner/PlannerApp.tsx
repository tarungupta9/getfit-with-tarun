import { useEffect, useReducer, useRef } from 'react'
import { content } from '../../content'
import { generatePlan } from '../../domain/compiler'
import { PlannerPreferencesSchema, weekdays } from '../../domain/schemas'
import type {
  ExerciseDefinition,
  GeneratedPlan,
  GeneratedSession,
  PlannerPreferences,
  PrescriptionStep,
  StartingPoint,
  Weekday,
} from '../../domain/types'
import {
  clearPreferences,
  loadPreferences,
  savePreferences,
} from '../../persistence/preferences'
import {
  initialPlannerState,
  plannerReducer,
} from './state'

const weekdayLabels: Record<Weekday, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
}

const startingPointOptions: readonly {
  value: StartingPoint
  label: string
  description: string
}[] = [
  {
    value: 'new',
    label: 'New to structured exercise',
    description: 'No structured exercise more than once weekly in the last three months.',
  },
  {
    value: 'lightly_active',
    label: 'Some regular activity',
    description: 'Walking, recreation, or exercise 1–3 times weekly, without a consistent full-body program.',
  },
  {
    value: 'returning',
    label: 'Returning after a break',
    description: 'Previously trained at least twice weekly, then stopped for 8 weeks to 12 months.',
  },
]

export function PlannerApp() {
  const [state, dispatch] = useReducer(plannerReducer, initialPlannerState)
  const dayGroupRef = useRef<HTMLFieldSetElement>(null)
  const acknowledgementRef = useRef<HTMLInputElement>(null)
  const planHeadingRef = useRef<HTMLHeadingElement>(null)
  const skipNextPersistenceWriteRef = useRef(false)

  useEffect(() => {
    const result = loadPreferences()
    const notice =
      result.status === 'reset'
        ? 'Saved preferences were invalid or out of date, so they were reset.'
        : result.status === 'unavailable'
          ? 'Preferences cannot be retained on this device. You can still create and use a plan in this session.'
          : null
    dispatch({
      type: 'hydrated',
      preferences: result.preferences,
      persistenceNotice: notice,
      persistenceAvailable: result.status !== 'unavailable',
    })
  }, [])

  useEffect(() => {
    if (state.phase === 'hydrating' || !state.persistenceAvailable) return
    if (skipNextPersistenceWriteRef.current) {
      skipNextPersistenceWriteRef.current = false
      return
    }
    if (!PlannerPreferencesSchema.safeParse(state.preferences).success) return
    if (!savePreferences(state.preferences)) dispatch({ type: 'storage-failed' })
  }, [state.phase, state.preferences, state.persistenceAvailable])

  useEffect(() => {
    if (state.phase === 'plan') {
      planHeadingRef.current?.focus()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [state.phase])

  const createPlan = () => {
    const parsed = PlannerPreferencesSchema.safeParse(state.preferences)
    if (!parsed.success) {
      dispatch({
        type: 'generation-failed',
        message: 'Choose between two and four weekdays before creating your plan.',
      })
      dayGroupRef.current?.focus()
      return
    }
    if (!state.acknowledged) {
      dispatch({
        type: 'generation-failed',
        message: 'Acknowledge the safety disclaimer before creating your plan.',
      })
      acknowledgementRef.current?.focus()
      return
    }

    const result = generatePlan(parsed.data, content)
    if (result.status === 'ok') {
      dispatch({ type: 'generated', plan: result.plan })
      return
    }
    dispatch({
      type: 'generation-failed',
      message:
        'We could not create a complete plan from the current draft catalogue. Your choices are still here; please try another duration or starting point.',
    })
  }

  const reset = () => {
    skipNextPersistenceWriteRef.current = true
    const cleared = clearPreferences()
    dispatch({
      type: 'reset',
      persistenceAvailable: cleared,
      persistenceNotice: cleared
        ? 'Saved preferences were cleared.'
        : 'Preferences cannot be retained on this device. You can still use the planner in this session.',
    })
  }

  return (
    <>
      <header className="site-header no-print">
        <a className="brand" href="/" aria-label="GetFit home">
          <span className="brand-mark" aria-hidden="true">GF</span>
          <span>GetFit</span>
        </a>
        <span className="header-note">No account · Browser-only preferences</span>
      </header>

      {content.metadata.reviewStatus === 'draft' && (
        <div className="prototype-banner" role="status">
          <strong>Prototype:</strong> exercise content has not been professionally reviewed. Do not use it as an exercise prescription.
        </div>
      )}

      <main id="main-content">
        {state.phase === 'plan' && state.plan ? (
          <PlanView
            plan={state.plan}
            preferences={state.preferences}
            headingRef={planHeadingRef}
            onEdit={() => dispatch({ type: 'edit' })}
          />
        ) : (
          <>
            <section className="hero no-print" aria-labelledby="hero-title">
              <div>
                <p className="eyebrow">Four weeks · bodyweight · explained</p>
                <h1 id="hero-title">A home routine built around the time you actually have.</h1>
                <p className="hero-copy">
                  Pick your available minutes and weekdays. GetFit turns them into two alternating full-body workouts and explains every choice.
                </p>
              </div>
              <div className="hero-proof" aria-label="Planner highlights">
                <span>15–45 min</span><span>2–4 days</span><span>No equipment</span>
              </div>
            </section>

            <section className="planner-shell no-print" aria-labelledby="planner-title">
              <div className="section-heading">
                <p className="eyebrow">Your commitment</p>
                <h2 id="planner-title">Build your four-week plan</h2>
                <p>About one minute. Your choices stay in this browser.</p>
              </div>

              {state.persistenceNotice && (
                <div className="notice notice-info" role="status">
                  <span>{state.persistenceNotice}</span>
                  <button type="button" className="text-button" onClick={() => dispatch({ type: 'dismiss-persistence-notice' })}>Dismiss</button>
                </div>
              )}

              {state.phase === 'hydrating' ? (
                <div className="intake-placeholder" aria-busy="true" aria-label="Restoring saved preferences">
                  <div /><div /><div />
                  <p>Restoring your saved preferences…</p>
                </div>
              ) : (
                <IntakeForm
                  preferences={state.preferences}
                  acknowledged={state.acknowledged}
                  error={state.error}
                  dayGroupRef={dayGroupRef}
                  acknowledgementRef={acknowledgementRef}
                  onMinutes={(minutes) => dispatch({ type: 'set-minutes', minutes })}
                  onDay={(day) => dispatch({ type: 'toggle-day', day })}
                  onStartingPoint={(startingPoint) => dispatch({ type: 'set-starting-point', startingPoint })}
                  onAcknowledged={(acknowledged) => dispatch({ type: 'set-acknowledged', acknowledged })}
                  onSubmit={createPlan}
                  onReset={reset}
                />
              )}
            </section>
          </>
        )}
      </main>
      <footer className="site-footer no-print">
        <p>General educational guidance only. No account, analytics, or health answers.</p>
        <p>Catalogue {content.metadata.version}</p>
      </footer>
    </>
  )
}

interface IntakeFormProps {
  preferences: PlannerPreferences
  acknowledged: boolean
  error: string | null
  dayGroupRef: React.RefObject<HTMLFieldSetElement | null>
  acknowledgementRef: React.RefObject<HTMLInputElement | null>
  onMinutes: (minutes: 15 | 30 | 45) => void
  onDay: (day: Weekday) => void
  onStartingPoint: (startingPoint: StartingPoint) => void
  onAcknowledged: (acknowledged: boolean) => void
  onSubmit: () => void
  onReset: () => void
}

function IntakeForm({
  preferences,
  acknowledged,
  error,
  dayGroupRef,
  acknowledgementRef,
  onMinutes,
  onDay,
  onStartingPoint,
  onAcknowledged,
  onSubmit,
  onReset,
}: IntakeFormProps) {
  const maxDaysSelected = preferences.availableDays.length === 4
  return (
    <form onSubmit={(event) => { event.preventDefault(); onSubmit() }} noValidate>
      <fieldset className="field-group">
        <legend>How long can you train?</legend>
        <p className="field-help">Choose a realistic upper limit, including warm-up and cool-down.</p>
        <div className="choice-grid choice-grid-small">
          {([15, 30, 45] as const).map((minutes) => (
            <label className="choice-card" key={minutes}>
              <input type="radio" name="minutes" checked={preferences.minutesPerSession === minutes} onChange={() => onMinutes(minutes)} />
              <span><strong>{minutes}</strong> minutes</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="field-group" ref={dayGroupRef} tabIndex={-1}>
        <legend>Which weekdays are available?</legend>
        <p className="field-help">Choose 2–4. Adjacent days are allowed and use different workout emphasis.</p>
        <div className="weekday-grid">
          {weekdays.map((day) => {
            const selected = preferences.availableDays.includes(day)
            return (
              <label className="day-choice" key={day}>
                <input type="checkbox" checked={selected} disabled={!selected && maxDaysSelected} onChange={() => onDay(day)} />
                <span aria-hidden="true">{weekdayLabels[day].slice(0, 3)}</span>
                <span className="sr-only">{weekdayLabels[day]}</span>
              </label>
            )
          })}
        </div>
        <p className={preferences.availableDays.length < 2 ? 'field-count field-count-error' : 'field-count'}>
          {preferences.availableDays.length} of 2–4 days selected
        </p>
      </fieldset>

      <fieldset className="field-group">
        <legend>What best describes your starting point?</legend>
        <div className="choice-grid">
          {startingPointOptions.map((option) => (
            <label className="choice-card choice-card-tall" key={option.value}>
              <input type="radio" name="starting-point" checked={preferences.startingPoint === option.value} onChange={() => onStartingPoint(option.value)} />
              <span><strong>{option.label}</strong><small>{option.description}</small></span>
            </label>
          ))}
        </div>
      </fieldset>

      <section className="safety-card" aria-labelledby="safety-title">
        <p className="eyebrow">Before you create a plan</p>
        <h3 id="safety-title">Know what this prototype cannot assess</h3>
        <p>{content.safety.audience}</p>
        <p>{content.safety.disclaimer}</p>
        <label className="acknowledgement">
          <input ref={acknowledgementRef} type="checkbox" checked={acknowledged} onChange={(event) => onAcknowledged(event.target.checked)} />
          <span>{content.safety.acknowledgement}</span>
        </label>
      </section>

      {error && <div className="notice notice-error" role="alert">{error}</div>}

      <div className="form-actions">
        <button className="primary-button" type="submit">Create my explained plan <span aria-hidden="true">→</span></button>
        <button className="text-button" type="button" onClick={onReset}>Reset saved preferences</button>
      </div>
      <p className="privacy-note">Nothing is uploaded. Your generated plan and acknowledgment disappear when this page reloads.</p>
    </form>
  )
}

function PlanView({
  plan,
  preferences,
  headingRef,
  onEdit,
}: {
  plan: GeneratedPlan
  preferences: PlannerPreferences
  headingRef: React.RefObject<HTMLHeadingElement | null>
  onEdit: () => void
}) {
  const exerciseMap = new Map(content.exercises.map((exercise) => [exercise.id, exercise]))
  const firstSessions = plan.weeks.flatMap((week) => week.sessions)
  const sessionA = firstSessions.find((session) => session.label === 'A')
  const sessionB = firstSessions.find((session) => session.label === 'B')

  return (
    <article className="plan-page">
      <section className="plan-hero">
        <div>
          <p className="eyebrow">Your four-week plan</p>
          <h1 id="plan-heading" ref={headingRef} tabIndex={-1}>{preferences.availableDays.length} balanced sessions each week</h1>
          <p className="hero-copy">Two alternating full-body workouts built to stay inside your {preferences.minutesPerSession}-minute limit.</p>
        </div>
        <div className="plan-actions no-print">
          <button className="secondary-button" type="button" onClick={onEdit}>Change preferences</button>
          <button className="primary-button" type="button" onClick={() => window.print()}>Print / save PDF</button>
        </div>
      </section>

      <div className="notice notice-warning">{content.safety.planStopGuidance}</div>

      <section className="plan-section" aria-labelledby="calendar-title">
        <div className="section-heading"><p className="eyebrow">Calendar</p><h2 id="calendar-title">Your weekly schedule</h2></div>
        <div className="week-grid">
          {plan.weeks.map((week) => (
            <section className="week-card" key={week.weekNumber} aria-labelledby={`week-${week.weekNumber}`}>
              <h3 id={`week-${week.weekNumber}`}>Week {week.weekNumber}</h3>
              <ol>
                {week.sessions.map((session, index) => (
                  <li key={`${session.weekday}-${index}`}>
                    <span>{weekdayLabels[session.weekday]}</span>
                    <strong>Workout {session.label}</strong>
                    <small>~{Math.ceil(session.estimatedDurationSeconds / 60)} min</small>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      </section>

      <section className="plan-section explanation-section" aria-labelledby="explanation-title">
        <div className="section-heading"><p className="eyebrow">Why this fits</p><h2 id="explanation-title">Every choice has a reason</h2></div>
        <ul className="explanation-list">
          {plan.explanations.filter((entry) => entry.code !== 'exercise.selection').map((entry) => <li key={`${entry.code}-${entry.causedBy}`}>{entry.message}</li>)}
        </ul>
      </section>

      <section className="plan-section" aria-labelledby="workouts-title">
        <div className="section-heading"><p className="eyebrow">Workout details</p><h2 id="workouts-title">Learn the movement, then do the work</h2></div>
        <div className="workout-grid">
          {sessionA && <WorkoutDetails label="A" session={sessionA} plan={plan} exerciseMap={exerciseMap} />}
          {sessionB && <WorkoutDetails label="B" session={sessionB} plan={plan} exerciseMap={exerciseMap} />}
        </div>
      </section>

      <section className="plan-section source-section" aria-labelledby="sources-title">
        <div className="section-heading"><p className="eyebrow">Source record</p><h2 id="sources-title">Draft demonstrations and provenance</h2></div>
        <p>Every external demonstration is selected manually. Links open only when you choose them; the planner makes no background request.</p>
        <ol>
          {[...new Set(plan.weeks.flatMap((week) => week.sessions.flatMap((session) => session.exercises.map((exercise) => exercise.exerciseId))))].map((id) => {
            const exercise = exerciseMap.get(id)
            if (!exercise) return null
            return <li key={id}><strong>{exercise.name}:</strong> {exercise.source.publisher}, draft reviewer: {exercise.source.reviewedBy}, checked {exercise.source.lastCheckedAt}. <a href={exercise.source.evidenceUrl} target="_blank" rel="noopener noreferrer">Evidence/source <span className="sr-only">for {exercise.name} (opens in a new tab)</span><span aria-hidden="true">↗</span></a></li>
          })}
        </ol>
      </section>
    </article>
  )
}

function WorkoutDetails({
  label,
  session,
  plan,
  exerciseMap,
}: {
  label: 'A' | 'B'
  session: GeneratedSession
  plan: GeneratedPlan
  exerciseMap: ReadonlyMap<string, ExerciseDefinition>
}) {
  const warmup = content.sequences.find((sequence) => sequence.id === session.warmupSequenceId)
  const cooldown = content.sequences.find((sequence) => sequence.id === session.cooldownSequenceId)
  return (
    <section className="workout-card" aria-labelledby={`workout-${label}`}>
      <div className="workout-heading"><span>Workout</span><h3 id={`workout-${label}`}>{label}</h3></div>
      {warmup && <SequenceDetails title="Warm-up" sequence={warmup} />}
      <div className="exercise-list">
        {session.exercises.map((planned) => {
          const exercise = exerciseMap.get(planned.exerciseId)
          if (!exercise) return null
          const easier = exercise.easierExerciseId ? exerciseMap.get(exercise.easierExerciseId) : null
          const weeklySteps = plan.weeks.map((week) => week.sessions.find((item) => item.label === label)?.exercises.find((item) => item.exerciseId === exercise.id)?.prescription).filter((step): step is PrescriptionStep => step !== undefined)
          return <ExerciseDetails key={exercise.id} exercise={exercise} easier={easier ?? null} weeklySteps={weeklySteps} />
        })}
      </div>
      {cooldown && <SequenceDetails title="Cool-down" sequence={cooldown} />}
    </section>
  )
}

function SequenceDetails({ title, sequence }: { title: string; sequence: (typeof content.sequences)[number] }) {
  return <div className="sequence"><h4>{title} · {Math.round(sequence.durationSeconds / 60)} min</h4><p>{sequence.steps.map((step) => step.name).join(' · ')}</p></div>
}

function ExerciseDetails({
  exercise,
  easier,
  weeklySteps,
}: {
  exercise: ExerciseDefinition
  easier: ExerciseDefinition | null
  weeklySteps: readonly PrescriptionStep[]
}) {
  return (
    <details className="exercise-card">
      <summary>
        <img src={exercise.illustrationPath} alt={exercise.illustrationAlt} width="120" height="90" loading="lazy" />
        <span><strong>{exercise.name}</strong><small>{formatPrescription(weeklySteps[0])}</small></span>
        <span className="details-label">Details</span>
      </summary>
      <div className="exercise-body">
        <p>{exercise.educationalRationale}</p>
        <ul>{exercise.cues.map((cue) => <li key={cue}>{cue}</li>)}</ul>
        <div className="progression-row">
          {weeklySteps.map((step, index) => <span key={index}><small>Week {index + 1}</small><strong>{formatPrescription(step)}</strong></span>)}
        </div>
        <p><strong>Easier option:</strong> {easier?.name ?? exercise.terminalEasierModification}</p>
        <p className="stop-copy">{exercise.stopGuidance}</p>
        {exercise.source.availability === 'available' ? (
          <a href={exercise.source.demonstrationUrl} target="_blank" rel="noopener noreferrer">Watch draft demonstration <span className="sr-only">for {exercise.name} (opens in a new tab)</span><span aria-hidden="true">↗</span></a>
        ) : <p>External demonstration currently unavailable. Use the written cues above.</p>}
      </div>
    </details>
  )
}

function formatPrescription(step: PrescriptionStep | undefined): string {
  if (!step) return 'Prescription unavailable'
  return step.mode === 'reps'
    ? `${step.sets} × ${step.reps} reps · ${step.restSeconds}s rest`
    : `${step.sets} × ${step.workSeconds}s · ${step.restSeconds}s rest`
}
