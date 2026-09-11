import { useEffect, useReducer, useRef, useState } from 'react'
import { content } from '../../content'
import { generatePlan } from '../../domain/compiler'
import { PlannerPreferencesSchema, weekdays } from '../../domain/schemas'
import { getYouTubeEmbedUrl } from '../../domain/youtube'
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
import { initialPlannerState, plannerReducer, type PlannerStep } from './state'

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
    description:
      'No structured exercise more than once weekly in the last three months.',
  },
  {
    value: 'lightly_active',
    label: 'Some regular activity',
    description:
      'Walking, recreation, or exercise 1–3 times weekly, without a consistent full-body program.',
  },
  {
    value: 'returning',
    label: 'Returning after a break',
    description:
      'Previously trained at least twice weekly, then stopped for 8 weeks to 12 months.',
  },
]

const stepTitles: Record<PlannerStep, string> = {
  1: 'How long can you train?',
  2: 'Which days work for you?',
  3: 'Where are you starting?',
  4: 'Review before you begin',
}

export function PlannerApp() {
  const [state, dispatch] = useReducer(plannerReducer, initialPlannerState)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const stepHeadingRef = useRef<HTMLHeadingElement>(null)
  const dayGroupRef = useRef<HTMLFieldSetElement>(null)
  const acknowledgementRef = useRef<HTMLInputElement>(null)
  const planHeadingRef = useRef<HTMLHeadingElement>(null)
  const workoutHeadingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const result = loadPreferences()
    const restoredResult =
      result.status === 'loaded'
        ? generatePlan(result.preferences, content)
        : null
    const restoredPlan =
      restoredResult?.status === 'ok' ? restoredResult.plan : null
    dispatch({
      type: 'hydrated',
      preferences: result.preferences,
      plan: restoredPlan,
      persistenceNotice:
        result.status === 'loaded' && restoredResult?.status === 'error'
          ? 'Your saved preferences could not produce a complete plan with the current catalogue. Review them to continue.'
          : result.status === 'reset'
          ? 'Saved preferences were invalid or out of date, so they were reset.'
          : result.status === 'unavailable'
            ? 'Preferences cannot be retained on this device. You can still create and use a plan in this session.'
            : null,
      persistenceAvailable: result.status !== 'unavailable',
    })
  }, [])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (state.modalOpen && !dialog.open) dialog.showModal()
    if (!state.modalOpen && dialog.open) dialog.close()
    document.body.classList.toggle('modal-open', state.modalOpen)
    return () => document.body.classList.remove('modal-open')
  }, [state.modalOpen])

  useEffect(() => {
    if (state.modalOpen) stepHeadingRef.current?.focus()
  }, [state.modalOpen, state.step])

  useEffect(() => {
    if (state.phase === 'plan' && !state.modalOpen) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      planHeadingRef.current?.focus()
    }
  }, [state.phase, state.modalOpen])

  useEffect(() => {
    if (state.phase !== 'plan' || !state.persistenceAvailable) return
    if (!PlannerPreferencesSchema.safeParse(state.preferences).success) return
    if (!savePreferences(state.preferences))
      dispatch({ type: 'storage-failed' })
  }, [state.phase, state.preferences, state.persistenceAvailable])

  const continueFromStep = () => {
    if (state.step === 2 && state.draftPreferences.availableDays.length < 2) {
      dispatch({
        type: 'generation-failed',
        message: 'Choose at least two weekdays to continue.',
      })
      dayGroupRef.current?.focus()
      return
    }
    if (state.step < 4)
      dispatch({ type: 'set-step', step: (state.step + 1) as PlannerStep })
  }

  const createPlan = () => {
    const parsed = PlannerPreferencesSchema.safeParse(state.draftPreferences)
    if (!parsed.success) {
      dispatch({ type: 'set-step', step: 2 })
      requestAnimationFrame(() => dayGroupRef.current?.focus())
      return
    }
    if (!state.draftAcknowledged) {
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
    } else {
      dispatch({
        type: 'generation-failed',
        message:
          'We could not create a complete plan from these choices. Try another duration or starting point.',
      })
    }
  }

  const resetDraft = () => {
    const cleared = clearPreferences()
    dispatch({
      type: 'reset-draft',
      persistenceAvailable: cleared,
      persistenceNotice: cleared
        ? 'Saved preferences were cleared.'
        : 'Preferences cannot be retained on this device. You can still use the planner in this session.',
    })
  }

  const openPlanner = () => dispatch({ type: 'open-modal' })

  return (
    <>
      <header className="site-header no-print">
        <a className="brand" href="/" aria-label="GetFit home">
          <span className="brand-mark" aria-hidden="true">
            GF
          </span>
          <span>GetFit</span>
        </a>
        <span className="header-note">
          No account · Browser-only preferences
        </span>
      </header>

      {content.metadata.reviewStatus === 'draft' && (
        <div className="prototype-banner" role="status">
          <strong>Prototype:</strong> exercise content has not been
          professionally reviewed. Do not use it as an exercise prescription.
        </div>
      )}

      <main id="main-content">
        {state.phase === 'plan' && state.plan ? (
          <PlanView
            plan={state.plan}
            preferences={state.preferences}
            selectedWeek={state.selectedWeek}
            selectedDay={state.selectedDay}
            headingRef={planHeadingRef}
            workoutHeadingRef={workoutHeadingRef}
            onEdit={openPlanner}
            onSelectWeek={(week) => dispatch({ type: 'select-week', week })}
            onSelectDay={(day) => dispatch({ type: 'select-day', day })}
          />
        ) : (
          <LandingView
            hydrating={state.phase === 'hydrating'}
            onStart={openPlanner}
          />
        )}

        {state.persistenceNotice && (
          <div
            className="notice notice-info persistence-notice no-print"
            role="status"
          >
            <span>{state.persistenceNotice}</span>
            <button
              type="button"
              className="text-button"
              onClick={() => dispatch({ type: 'dismiss-persistence-notice' })}
            >
              Dismiss
            </button>
          </div>
        )}
      </main>

      <PlannerDialog
        dialogRef={dialogRef}
        stepHeadingRef={stepHeadingRef}
        dayGroupRef={dayGroupRef}
        acknowledgementRef={acknowledgementRef}
        step={state.step}
        preferences={state.draftPreferences}
        acknowledged={state.draftAcknowledged}
        error={state.error}
        updating={state.plan !== null}
        onCancel={() => dispatch({ type: 'close-modal' })}
        onBack={() =>
          dispatch({ type: 'set-step', step: (state.step - 1) as PlannerStep })
        }
        onContinue={continueFromStep}
        onMinutes={(minutes) => dispatch({ type: 'set-minutes', minutes })}
        onDay={(day) => dispatch({ type: 'toggle-day', day })}
        onStartingPoint={(startingPoint) =>
          dispatch({ type: 'set-starting-point', startingPoint })
        }
        onAcknowledged={(acknowledged) =>
          dispatch({ type: 'set-acknowledged', acknowledged })
        }
        onSubmit={createPlan}
        onReset={resetDraft}
      />

      <footer className="site-footer no-print">
        <p>
          General educational guidance only. No account, analytics, or health
          answers.
        </p>
        <p>Catalogue {content.metadata.version}</p>
      </footer>
    </>
  )
}

function LandingView({
  hydrating,
  onStart,
}: {
  hydrating: boolean
  onStart: () => void
}) {
  return (
    <section className="landing no-print" aria-labelledby="hero-title">
      <p className="eyebrow">Four weeks · bodyweight · explained</p>
      <h1 id="hero-title">A home routine built around your time.</h1>
      <p className="hero-copy">
        Tell us when you can train and where you’re starting. Get a practical
        four-week plan with every movement explained.
      </p>
      <div className="landing-action">
        <button
          className="primary-button start-button"
          type="button"
          onClick={onStart}
          disabled={hydrating}
        >
          {hydrating ? 'Loading…' : 'Start'}
        </button>
        <span>About one minute · nothing uploaded</span>
      </div>
      <ol className="journey" aria-label="How GetFit works">
        <li>
          <span>1</span>
          <strong>Choose preferences</strong>
        </li>
        <li>
          <span>2</span>
          <strong>Get four-week plan</strong>
        </li>
        <li>
          <span>3</span>
          <strong>Explore workouts</strong>
        </li>
      </ol>
      <div className="landing-proof">
        <span>15–45 min</span>
        <span>2–4 days</span>
        <span>No equipment</span>
      </div>
    </section>
  )
}

interface PlannerDialogProps {
  dialogRef: React.RefObject<HTMLDialogElement | null>
  stepHeadingRef: React.RefObject<HTMLHeadingElement | null>
  dayGroupRef: React.RefObject<HTMLFieldSetElement | null>
  acknowledgementRef: React.RefObject<HTMLInputElement | null>
  step: PlannerStep
  preferences: PlannerPreferences
  acknowledged: boolean
  error: string | null
  updating: boolean
  onCancel: () => void
  onBack: () => void
  onContinue: () => void
  onMinutes: (minutes: 15 | 30 | 45) => void
  onDay: (day: Weekday) => void
  onStartingPoint: (startingPoint: StartingPoint) => void
  onAcknowledged: (acknowledged: boolean) => void
  onSubmit: () => void
  onReset: () => void
}

function PlannerDialog({
  dialogRef,
  stepHeadingRef,
  dayGroupRef,
  acknowledgementRef,
  step,
  preferences,
  acknowledged,
  error,
  updating,
  onCancel,
  onBack,
  onContinue,
  onMinutes,
  onDay,
  onStartingPoint,
  onAcknowledged,
  onSubmit,
  onReset,
}: PlannerDialogProps) {
  const maxDaysSelected = preferences.availableDays.length === 4
  return (
    <dialog
      ref={dialogRef}
      className="planner-dialog no-print"
      aria-labelledby="dialog-title"
      onCancel={(event) => {
        event.preventDefault()
        onCancel()
      }}
    >
      <form
        className="dialog-form"
        onSubmit={(event) => {
          event.preventDefault()
          if (step === 4) onSubmit()
          else onContinue()
        }}
        noValidate
      >
        <header className="dialog-header">
          <div>
            <p>Step {step} of 4</p>
            <h2 id="dialog-title" ref={stepHeadingRef} tabIndex={-1}>
              {stepTitles[step]}
            </h2>
          </div>
          <button
            className="close-button"
            type="button"
            onClick={onCancel}
            aria-label="Close planner"
          >
            ×
          </button>
        </header>
        <div className="step-progress" aria-hidden="true">
          <span style={{ width: `${step * 25}%` }} />
        </div>

        <div className="dialog-content">
          {step === 1 && (
            <fieldset className="field-group modal-field">
              <legend className="sr-only">Training duration</legend>
              <p className="field-help">
                Include warm-up and cool-down. Pick a limit you can repeat.
              </p>
              <div className="choice-grid choice-grid-small">
                {([15, 30, 45] as const).map((minutes) => (
                  <label className="choice-card" key={minutes}>
                    <input
                      type="radio"
                      name="minutes"
                      checked={preferences.minutesPerSession === minutes}
                      onChange={() => onMinutes(minutes)}
                    />
                    <span>
                      <strong>{minutes}</strong> minutes
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {step === 2 && (
            <fieldset
              className="field-group modal-field"
              ref={dayGroupRef}
              tabIndex={-1}
            >
              <legend className="sr-only">Available weekdays</legend>
              <p className="field-help">
                Choose 2–4 days. Adjacent days are fine; workouts alternate
                emphasis.
              </p>
              <div className="weekday-grid">
                {weekdays.map((day) => {
                  const selected = preferences.availableDays.includes(day)
                  return (
                    <label className="day-choice" key={day}>
                      <input
                        type="checkbox"
                        checked={selected}
                        disabled={!selected && maxDaysSelected}
                        onChange={() => onDay(day)}
                      />
                      <span aria-hidden="true">
                        {weekdayLabels[day].slice(0, 3)}
                      </span>
                      <span className="sr-only">{weekdayLabels[day]}</span>
                    </label>
                  )
                })}
              </div>
              <p
                className={
                  preferences.availableDays.length < 2
                    ? 'field-count field-count-error'
                    : 'field-count'
                }
              >
                {preferences.availableDays.length} of 2–4 days selected
                {maxDaysSelected ? ' · Maximum reached' : ''}
              </p>
            </fieldset>
          )}

          {step === 3 && (
            <fieldset className="field-group modal-field">
              <legend className="sr-only">Starting point</legend>
              <div className="choice-grid starting-grid">
                {startingPointOptions.map((option) => (
                  <label
                    className="choice-card choice-card-tall"
                    key={option.value}
                  >
                    <input
                      type="radio"
                      name="starting-point"
                      checked={preferences.startingPoint === option.value}
                      onChange={() => onStartingPoint(option.value)}
                    />
                    <span>
                      <strong>{option.label}</strong>
                      <small>{option.description}</small>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {step === 4 && (
            <>
              <dl className="preference-summary">
                <div>
                  <dt>Duration</dt>
                  <dd>{preferences.minutesPerSession} minutes</dd>
                </div>
                <div>
                  <dt>Days</dt>
                  <dd>
                    {preferences.availableDays
                      .map((day) => weekdayLabels[day].slice(0, 3))
                      .join(', ')}
                  </dd>
                </div>
                <div>
                  <dt>Starting point</dt>
                  <dd>
                    {
                      startingPointOptions.find(
                        (option) => option.value === preferences.startingPoint,
                      )?.label
                    }
                  </dd>
                </div>
              </dl>
              <section className="safety-card" aria-labelledby="safety-title">
                <p className="eyebrow">Safety</p>
                <h3 id="safety-title">
                  Know what this prototype cannot assess
                </h3>
                <p>{content.safety.audience}</p>
                <p>{content.safety.disclaimer}</p>
                <label className="acknowledgement">
                  <input
                    ref={acknowledgementRef}
                    type="checkbox"
                    checked={acknowledged}
                    onChange={(event) => onAcknowledged(event.target.checked)}
                  />
                  <span>{content.safety.acknowledgement}</span>
                </label>
              </section>
            </>
          )}

          {error && (
            <div className="notice notice-error" role="alert">
              {error}
            </div>
          )}
          <button
            className="text-button reset-button"
            type="button"
            onClick={onReset}
          >
            Reset saved preferences
          </button>
        </div>

        <footer className="dialog-actions">
          {step > 1 ? (
            <button className="secondary-button" type="button" onClick={onBack}>
              Back
            </button>
          ) : (
            <span />
          )}
          <button className="primary-button" type="submit">
            {step === 4
              ? updating
                ? 'Update my plan'
                : 'Create my plan'
              : 'Continue'}
          </button>
        </footer>
      </form>
    </dialog>
  )
}

function PlanView({
  plan,
  preferences,
  selectedWeek,
  selectedDay,
  headingRef,
  workoutHeadingRef,
  onEdit,
  onSelectWeek,
  onSelectDay,
}: {
  plan: GeneratedPlan
  preferences: PlannerPreferences
  selectedWeek: 1 | 2 | 3 | 4
  selectedDay: Weekday
  headingRef: React.RefObject<HTMLHeadingElement | null>
  workoutHeadingRef: React.RefObject<HTMLHeadingElement | null>
  onEdit: () => void
  onSelectWeek: (week: 1 | 2 | 3 | 4) => void
  onSelectDay: (day: Weekday) => void
}) {
  const [activeExercise, setActiveExercise] =
    useState<ExerciseModalData | null>(null)
  const exerciseTriggerRef = useRef<HTMLButtonElement | null>(null)
  const exerciseMap = new Map(
    content.exercises.map((exercise) => [exercise.id, exercise]),
  )
  const week = plan.weeks[selectedWeek - 1]!
  const selectedSession =
    week.sessions.find((session) => session.weekday === selectedDay) ??
    week.sessions[0]!

  const openExercise = (
    data: ExerciseModalData,
    trigger: HTMLButtonElement,
  ) => {
    exerciseTriggerRef.current = trigger
    setActiveExercise(data)
  }
  const closeExercise = () => {
    setActiveExercise(null)
    window.requestAnimationFrame(() => exerciseTriggerRef.current?.focus())
  }

  const selectSession = (weekNumber: 1 | 2 | 3 | 4, day: Weekday) => {
    onSelectWeek(weekNumber)
    onSelectDay(day)
    requestAnimationFrame(() => {
      workoutHeadingRef.current?.focus()
      workoutHeadingRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    })
  }

  return (
    <article className="plan-page">
      <section className="plan-hero">
        <div>
          <p className="eyebrow">Your four-week plan</p>
          <h1 id="plan-heading" ref={headingRef} tabIndex={-1}>
            {preferences.availableDays.length} balanced sessions each week
          </h1>
          <p className="plan-summary">
            {preferences.minutesPerSession} minutes ·{' '}
            {preferences.availableDays
              .map((day) => weekdayLabels[day].slice(0, 3))
              .join(', ')}{' '}
            ·{' '}
            {
              startingPointOptions.find(
                (option) => option.value === preferences.startingPoint,
              )?.label
            }
          </p>
        </div>
        <div className="plan-actions no-print">
          <button className="secondary-button" type="button" onClick={onEdit}>
            Change preferences
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={() => window.print()}
          >
            Print / save PDF
          </button>
        </div>
      </section>

      <div className="notice notice-warning compact-warning">
        {content.safety.planStopGuidance}
      </div>

      <section
        className="session-picker no-print"
        aria-label="Choose workout session"
      >
        <div className="week-tabs" role="group" aria-label="Choose week">
          {plan.weeks.map((item) => (
            <button
              type="button"
              key={item.weekNumber}
              className={item.weekNumber === selectedWeek ? 'is-selected' : ''}
              aria-pressed={item.weekNumber === selectedWeek}
              onClick={() => onSelectWeek(item.weekNumber)}
            >
              Week {item.weekNumber}
            </button>
          ))}
        </div>
        <div className="session-tabs">
          {week.sessions.map((session) => (
            <button
              type="button"
              key={session.weekday}
              className={
                session.weekday === selectedSession.weekday ? 'is-selected' : ''
              }
              aria-pressed={session.weekday === selectedSession.weekday}
              onClick={() => onSelectDay(session.weekday)}
            >
              <span>{weekdayLabels[session.weekday]}</span>
              <strong>Workout {session.label}</strong>
              <small>
                ~{Math.ceil(session.estimatedDurationSeconds / 60)} min
              </small>
            </button>
          ))}
        </div>
      </section>

      <section
        className="active-workout"
        aria-labelledby="active-workout-title"
      >
        <div className="active-workout-heading">
          <div>
            <p className="eyebrow">
              Week {selectedWeek} · {weekdayLabels[selectedSession.weekday]}
            </p>
            <h2 id="active-workout-title" ref={workoutHeadingRef} tabIndex={-1}>
              Workout {selectedSession.label}
            </h2>
          </div>
          <span>
            ~{Math.ceil(selectedSession.estimatedDurationSeconds / 60)} min
          </span>
        </div>
        <WorkoutDetails
          session={selectedSession}
          plan={plan}
          exerciseMap={exerciseMap}
          headingId="screen-workout"
          onOpenExercise={openExercise}
        />
      </section>

      <div className="supporting-sections no-print">
        <details className="plan-disclosure">
          <summary>
            <span>Full four-week schedule</span>
            <small>See every planned session</small>
          </summary>
          <Schedule plan={plan} interactive onSelect={selectSession} />
        </details>
        <details className="plan-disclosure">
          <summary>
            <span>Why this fits</span>
            <small>How your choices shaped the plan</small>
          </summary>
          <ul className="explanation-list">
            {plan.explanations
              .filter((entry) => entry.code !== 'exercise.selection')
              .map((entry) => (
                <li key={`${entry.code}-${entry.causedBy}`}>{entry.message}</li>
              ))}
          </ul>
        </details>
        <details className="plan-disclosure source-section">
          <summary>
            <span>Sources</span>
            <small>Draft demonstrations and provenance</small>
          </summary>
          <Sources plan={plan} exerciseMap={exerciseMap} />
        </details>
      </div>

      <div className="print-only">
        <section className="plan-section">
          <h2>Full four-week schedule</h2>
          <Schedule plan={plan} />
        </section>
        <section className="plan-section">
          <h2>Why this fits</h2>
          <ul className="explanation-list">
            {plan.explanations
              .filter((entry) => entry.code !== 'exercise.selection')
              .map((entry) => (
                <li key={`${entry.code}-${entry.causedBy}`}>{entry.message}</li>
              ))}
          </ul>
        </section>
        {(['A', 'B'] as const).map((label) => {
          const session = plan.weeks
            .flatMap((item) => item.sessions)
            .find((item) => item.label === label)
          return session ? (
            <section className="plan-section" key={label}>
              <h2>Workout {label}</h2>
              <WorkoutDetails
                session={session}
                plan={plan}
                exerciseMap={exerciseMap}
                headingId={`print-workout-${label}`}
                onOpenExercise={openExercise}
              />
            </section>
          ) : null
        })}
        <section className="plan-section source-section">
          <h2>Sources</h2>
          <Sources plan={plan} exerciseMap={exerciseMap} />
        </section>
      </div>
      {activeExercise && (
        <ExerciseModal data={activeExercise} onClose={closeExercise} />
      )}
    </article>
  )
}

interface ExerciseModalData {
  exercise: ExerciseDefinition
  easier: ExerciseDefinition | null
  selectedStep: PrescriptionStep
  weeklySteps: readonly PrescriptionStep[]
}

function Schedule({
  plan,
  interactive = false,
  onSelect,
}: {
  plan: GeneratedPlan
  interactive?: boolean
  onSelect?: (week: 1 | 2 | 3 | 4, day: Weekday) => void
}) {
  return (
    <div className="week-grid">
      {plan.weeks.map((week) => (
        <section className="week-card" key={week.weekNumber}>
          <h3>Week {week.weekNumber}</h3>
          <ol>
            {week.sessions.map((session) => (
              <li key={session.weekday}>
                {interactive ? (
                  <button
                    type="button"
                    onClick={() => onSelect?.(week.weekNumber, session.weekday)}
                  >
                    <span>{weekdayLabels[session.weekday]}</span>
                    <strong>Workout {session.label}</strong>
                    <small>
                      ~{Math.ceil(session.estimatedDurationSeconds / 60)} min
                    </small>
                  </button>
                ) : (
                  <>
                    <span>{weekdayLabels[session.weekday]}</span>
                    <strong>Workout {session.label}</strong>
                    <small>
                      ~{Math.ceil(session.estimatedDurationSeconds / 60)} min
                    </small>
                  </>
                )}
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  )
}

function Sources({
  plan,
  exerciseMap,
}: {
  plan: GeneratedPlan
  exerciseMap: ReadonlyMap<string, ExerciseDefinition>
}) {
  const ids = [
    ...new Set(
      plan.weeks.flatMap((week) =>
        week.sessions.flatMap((session) =>
          session.exercises.map((exercise) => exercise.exerciseId),
        ),
      ),
    ),
  ]
  return (
    <div className="sources-content">
      <p>
        Every external demonstration is selected manually. Links open only when
        you choose them.
      </p>
      <ol>
        {ids.map((id) => {
          const exercise = exerciseMap.get(id)
          return exercise ? (
            <li key={id}>
              <strong>{exercise.name}:</strong> {exercise.source.publisher},
              draft reviewer: {exercise.source.reviewedBy}, checked{' '}
              {exercise.source.lastCheckedAt}.{' '}
              <a
                href={exercise.source.evidenceUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Evidence/source{' '}
                <span className="sr-only">
                  for {exercise.name} (opens in a new tab)
                </span>
                <span aria-hidden="true">↗</span>
              </a>
            </li>
          ) : null
        })}
      </ol>
    </div>
  )
}

function WorkoutDetails({
  session,
  plan,
  exerciseMap,
  onOpenExercise,
  headingId,
}: {
  session: GeneratedSession
  plan: GeneratedPlan
  exerciseMap: ReadonlyMap<string, ExerciseDefinition>
  onOpenExercise: (data: ExerciseModalData, trigger: HTMLButtonElement) => void
  headingId: string
}) {
  const warmup = content.sequences.find(
    (sequence) => sequence.id === session.warmupSequenceId,
  )
  const cooldown = content.sequences.find(
    (sequence) => sequence.id === session.cooldownSequenceId,
  )
  return (
    <section className="workout-card" aria-labelledby={headingId}>
      <h3 id={headingId} className="sr-only">
        Workout {session.label} details
      </h3>
      {warmup && <SequenceDetails title="Warm-up" sequence={warmup} />}
      <div className="exercise-list">
        {session.exercises.map((planned) => {
          const exercise = exerciseMap.get(planned.exerciseId)
          if (!exercise) return null
          const easier = exercise.easierExerciseId
            ? exerciseMap.get(exercise.easierExerciseId)
            : null
          const weeklySteps = plan.weeks
            .map(
              (week) =>
                week.sessions
                  .find((item) => item.label === session.label)
                  ?.exercises.find((item) => item.exerciseId === exercise.id)
                  ?.prescription,
            )
            .filter((step): step is PrescriptionStep => step !== undefined)
          return (
            <ExerciseDetails
              key={exercise.id}
              exercise={exercise}
              easier={easier ?? null}
              selectedStep={planned.prescription}
              weeklySteps={weeklySteps}
              onOpen={onOpenExercise}
            />
          )
        })}
      </div>
      {cooldown && <SequenceDetails title="Cool-down" sequence={cooldown} />}
    </section>
  )
}

function SequenceDetails({
  title,
  sequence,
}: {
  title: string
  sequence: (typeof content.sequences)[number]
}) {
  return (
    <div className="sequence">
      <h4>
        {title} · {Math.round(sequence.durationSeconds / 60)} min
      </h4>
      <p>{sequence.steps.map((step) => step.name).join(' · ')}</p>
    </div>
  )
}

function ExerciseDetails({
  exercise,
  easier,
  selectedStep,
  weeklySteps,
  onOpen,
}: {
  exercise: ExerciseDefinition
  easier: ExerciseDefinition | null
  selectedStep: PrescriptionStep
  weeklySteps: readonly PrescriptionStep[]
  onOpen: (data: ExerciseModalData, trigger: HTMLButtonElement) => void
}) {
  return (
    <div className="exercise-card">
      <button
        aria-haspopup="dialog"
        className="exercise-summary"
        onClick={(event) =>
          onOpen(
            { exercise, easier, selectedStep, weeklySteps },
            event.currentTarget,
          )
        }
        type="button"
      >
        <img
          src={exercise.postureImages[0].path}
          alt=""
          width="120"
          height="120"
          loading="lazy"
          decoding="async"
        />
        <span>
          <strong>{exercise.name}</strong>
          <small>{formatPrescription(selectedStep)}</small>
        </span>
        <span className="details-label">Details</span>
      </button>
      <div className="print-exercise-body" aria-hidden="true">
        <ExerciseInstructions
          exercise={exercise}
          easier={easier}
          weeklySteps={weeklySteps}
          includeMedia={false}
        />
      </div>
    </div>
  )
}

function ExerciseModal({
  data,
  onClose,
}: {
  data: ExerciseModalData
  onClose: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    dialog.showModal()
    document.body.classList.add('modal-open')
    closeButtonRef.current?.focus()
    return () => {
      document.body.classList.remove('modal-open')
      if (dialog.open) dialog.close()
    }
  }, [])

  return (
    <dialog
      aria-labelledby={`exercise-modal-${data.exercise.id}`}
      className="exercise-modal no-print"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      ref={dialogRef}
    >
      <div className="exercise-modal-shell">
        <header className="exercise-modal-header">
          <div>
            <p className="eyebrow">Exercise details</p>
            <h2 id={`exercise-modal-${data.exercise.id}`}>
              {data.exercise.name}
            </h2>
            <p>{formatPrescription(data.selectedStep)}</p>
          </div>
          <button
            ref={closeButtonRef}
            className="modal-close"
            onClick={onClose}
            type="button"
            aria-label={`Close ${data.exercise.name} details`}
          >
            ×
          </button>
        </header>
        <ExerciseInstructions {...data} includeMedia />
      </div>
    </dialog>
  )
}

function ExerciseInstructions({
  exercise,
  easier,
  weeklySteps,
  includeMedia,
}: Omit<ExerciseModalData, 'selectedStep'> & { includeMedia: boolean }) {
  return (
    <div className={includeMedia ? 'exercise-modal-content' : undefined}>
      {includeMedia && <ExerciseMediaTabs exercise={exercise} />}
      <div className="exercise-instructions">
        <p>{exercise.educationalRationale}</p>
        <ul>
          {exercise.cues.map((cue) => (
            <li key={cue}>{cue}</li>
          ))}
        </ul>
        <div className="progression-row">
          {weeklySteps.map((step, index) => (
            <span key={index}>
              <small>Week {index + 1}</small>
              <strong>{formatPrescription(step)}</strong>
            </span>
          ))}
        </div>
        <p>
          <strong>Easier option:</strong>{' '}
          {easier?.name ?? exercise.terminalEasierModification}
        </p>
        <p className="stop-copy">{exercise.stopGuidance}</p>
        {!includeMedia && <ExerciseVideoFallback exercise={exercise} />}
      </div>
    </div>
  )
}

type ExerciseMediaTab = 'photos' | 'video'

function ExerciseMediaTabs({ exercise }: { exercise: ExerciseDefinition }) {
  const [activeTab, setActiveTab] = useState<ExerciseMediaTab>('photos')
  const photoTabRef = useRef<HTMLButtonElement>(null)
  const videoTabRef = useRef<HTMLButtonElement>(null)
  const embedUrl = getYouTubeEmbedUrl(exercise.source.demonstrationUrl)
  const videoAvailable =
    exercise.source.availability === 'available' && embedUrl !== null
  const tabIds: readonly ExerciseMediaTab[] = ['photos', 'video']
  const tabRefs = {
    photos: photoTabRef,
    video: videoTabRef,
  }

  const selectTabFromKey = (
    event: React.KeyboardEvent<HTMLButtonElement>,
  ) => {
    const currentIndex = tabIds.indexOf(activeTab)
    let nextIndex: number | null = null
    if (event.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + tabIds.length) % tabIds.length
    } else if (event.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % tabIds.length
    } else if (event.key === 'Home') {
      nextIndex = 0
    } else if (event.key === 'End') {
      nextIndex = tabIds.length - 1
    }
    if (nextIndex === null) return

    event.preventDefault()
    const nextTab = tabIds[nextIndex]!
    setActiveTab(nextTab)
    requestAnimationFrame(() => tabRefs[nextTab].current?.focus())
  }

  const photosTabId = `exercise-photos-tab-${exercise.id}`
  const photosPanelId = `exercise-photos-panel-${exercise.id}`
  const videoTabId = `exercise-video-tab-${exercise.id}`
  const videoPanelId = `exercise-video-panel-${exercise.id}`

  return (
    <section className="exercise-media" aria-label={`${exercise.name} media`}>
      <div
        className="exercise-media-tabs"
        role="tablist"
        aria-label="Exercise media"
      >
        <button
          aria-controls={photosPanelId}
          aria-selected={activeTab === 'photos'}
          id={photosTabId}
          onClick={() => setActiveTab('photos')}
          onKeyDown={selectTabFromKey}
          ref={photoTabRef}
          role="tab"
          tabIndex={activeTab === 'photos' ? 0 : -1}
          type="button"
        >
          Photos
        </button>
        <button
          aria-controls={videoPanelId}
          aria-selected={activeTab === 'video'}
          id={videoTabId}
          onClick={() => setActiveTab('video')}
          onKeyDown={selectTabFromKey}
          ref={videoTabRef}
          role="tab"
          tabIndex={activeTab === 'video' ? 0 : -1}
          type="button"
        >
          Video
        </button>
      </div>
      <div
        aria-labelledby={photosTabId}
        hidden={activeTab !== 'photos'}
        id={photosPanelId}
        role="tabpanel"
      >
        <ExerciseMediaCarousel exercise={exercise} />
      </div>
      <div
        aria-labelledby={videoTabId}
        hidden={activeTab !== 'video'}
        id={videoPanelId}
        role="tabpanel"
      >
        {activeTab === 'video' && videoAvailable ? (
          <div className="exercise-video-panel">
            <div className="exercise-video-frame">
              <iframe
                allow="encrypted-media; fullscreen; picture-in-picture"
                allowFullScreen
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                src={embedUrl}
                title={`${exercise.name}: ${exercise.source.demonstrationTitle}`}
              />
            </div>
            <p className="exercise-video-notice">
              Video provided by YouTube. Selecting this tab loads third-party
              content.
            </p>
            <p className="exercise-video-source">
              {exercise.source.publisher} · checked{' '}
              {exercise.source.lastCheckedAt}
            </p>
            <ExerciseVideoFallback exercise={exercise} label="Open on YouTube" />
          </div>
        ) : activeTab === 'video' ? (
          <p className="exercise-video-unavailable">
            External demonstration currently unavailable. Use the photos and
            written cues instead.
          </p>
        ) : null}
      </div>
    </section>
  )
}

function ExerciseVideoFallback({
  exercise,
  label = 'Watch correct form on YouTube',
}: {
  exercise: ExerciseDefinition
  label?: string
}) {
  return exercise.source.availability === 'available' ? (
    <a
      className="form-video-link"
      href={exercise.source.demonstrationUrl}
      target="_blank"
      rel="noopener noreferrer"
      title={exercise.source.demonstrationTitle}
    >
      {label}{' '}
      <span className="sr-only">
        for {exercise.name} (opens in a new tab)
      </span>
      <span aria-hidden="true">↗</span>
    </a>
  ) : (
    <p>
      External demonstration currently unavailable. Use the written cues above.
    </p>
  )
}

function ExerciseMediaCarousel({ exercise }: { exercise: ExerciseDefinition }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const frameCount = exercise.postureImages.length
  const selectFrame = (index: number) => {
    setActiveIndex((index + frameCount) % frameCount)
  }

  return (
    <section
      className="exercise-carousel no-print-controls"
      aria-label={`${exercise.name} posture carousel`}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') {
          event.preventDefault()
          selectFrame(activeIndex - 1)
        }
        if (event.key === 'ArrowRight') {
          event.preventDefault()
          selectFrame(activeIndex + 1)
        }
      }}
      role="region"
      tabIndex={0}
    >
      <div className="carousel-slides">
        {exercise.postureImages.map((image, index) => (
          <figure
            aria-hidden={index !== activeIndex}
            className={`carousel-slide${index === activeIndex ? ' carousel-slide-active' : ''}`}
            key={image.phase}
          >
            <img
              src={image.path}
              alt={image.alt}
              width="960"
              height="960"
              loading="lazy"
              decoding="async"
            />
            <figcaption>
              <strong>{image.phase}</strong>
              {image.caption}
            </figcaption>
          </figure>
        ))}
      </div>
      <div className="carousel-controls">
        <button
          type="button"
          onClick={() => selectFrame(activeIndex - 1)}
          aria-label={`Previous posture for ${exercise.name}`}
        >
          <span aria-hidden="true">←</span>
        </button>
        <div className="carousel-dots" aria-label="Choose posture">
          {exercise.postureImages.map((image, index) => (
            <button
              aria-label={`Show ${image.phase} posture`}
              aria-pressed={index === activeIndex}
              className={
                index === activeIndex ? 'carousel-dot-active' : undefined
              }
              key={image.phase}
              onClick={() => selectFrame(index)}
              type="button"
            />
          ))}
        </div>
        <span className="carousel-status" aria-live="polite">
          {activeIndex + 1} of {frameCount}
        </span>
        <button
          type="button"
          onClick={() => selectFrame(activeIndex + 1)}
          aria-label={`Next posture for ${exercise.name}`}
        >
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </section>
  )
}

function formatPrescription(step: PrescriptionStep | undefined): string {
  if (!step) return 'Prescription unavailable'
  return step.mode === 'reps'
    ? `${step.sets} × ${step.reps} reps · ${step.restSeconds}s rest`
    : `${step.sets} × ${step.workSeconds}s · ${step.restSeconds}s rest`
}
