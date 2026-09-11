# V1 — Initial explained home-fitness MVP

**Status:** Implemented prototype  
**Recorded:** 2026-09-04

## Goal

Turn a beginner's available time, weekdays, and starting point into a deterministic, explained four-week home-fitness plan without an account, API, or database.

## Why this iteration came first

V1 closes one complete user loop before adding adjacent product areas: provide a few commitment inputs, receive a usable plan, understand why it fits, and take it away through print or PDF. Accounts, tracking, nutrition, and open-ended generation stay out because none is required to test whether the core planning outcome is useful.

## Included scope

- Intake for 15, 30, or 45-minute sessions; two to four weekdays; and three starting points.
- Two alternating full-body workouts placed on selected days across four weeks.
- Local, versioned exercise, sequence, policy, and safety JSON.
- Reviewed-track data model with explicit weekly progression, easier/harder relationships, setup requirements, cues, stop guidance, and provenance.
- Duration-aware deterministic plan compiler with typed explanations and fail-closed validation.
- Six generic family-level SVG illustrations.
- Expandable exercise cards, external draft demonstration links, and a separate visible Source record section.
- Local persistence for planner preferences only.
- Responsive layout and print/PDF output.

## Deferred at V1

- Professionally approved exercise prescriptions and form media.
- Exercise-specific human posture imagery.
- Direct, exercise-specific YouTube form guidance.
- Accounts, remote content, analytics, CMS, API, and database.
- Automated unit and browser tests.

See [`docs/designs/home-fitness-mvp.md`](../designs/home-fitness-mvp.md) for full V1 product, safety, and compiler decisions.
