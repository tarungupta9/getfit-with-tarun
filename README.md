# GetFit with Tarun

A browser-only prototype that turns a beginner's available time, weekdays, and starting point into an explained four-week home-fitness plan.

**Live prototype:** [getfit-with-tarun.netlify.app](https://getfit-with-tarun.netlify.app/)

> **Prototype:** The bundled exercise catalogue and safety copy have not been professionally reviewed. Do not publish or present the generated routines as approved exercise prescriptions until the release gates in [`TODOS.md`](TODOS.md) are complete.

## Product development approach

This project is built as a sequence of small, explicit product iterations. Each version starts with one user problem, protects the existing product and safety boundaries, delivers a complete vertical slice, and records what remains intentionally deferred. Earlier plans stay unchanged so the reasoning and tradeoffs remain inspectable instead of being rewritten after the fact.

| Iteration | Product question | Increment delivered |
|---|---|---|
| [V1](docs/version-plans/01-initial-mvp.md) | Can a beginner turn limited time and availability into one coherent plan? | An end-to-end, deterministic four-week planner with explanations, privacy boundaries, and print output. |
| [V2](docs/version-plans/02-exercise-media-and-form-guidance.md) | Can every prescribed movement be easier to understand without introducing remote runtime content? | Exercise-specific posture sequences, curated form links, and stronger content validation. |
| [V3](docs/version-plans/03-focused-exercise-modal.md) | Can detailed guidance remain focused without overwhelming the workout layout? | A keyboard-accessible exercise-detail modal with responsive and print-safe behavior. |

The iteration pattern is deliberate:

1. Prove the narrowest useful user outcome before expanding scope.
2. Keep business rules deterministic and safety-sensitive content reviewable.
3. Improve one source of user friction at a time without destabilizing the core.
4. Validate the increment, document its acceptance checks, and carry deferred work forward explicitly.

Read the [version-plan index](docs/version-plans/README.md) for the progression, the [V1 design record](docs/designs/home-fitness-mvp.md) for the original product reasoning, and [`TODOS.md`](TODOS.md) for known release blockers.

## Stack

- Node.js 24 and npm
- React 19 with TanStack Start and TanStack Router
- Vite static prerendering and Netlify's TanStack Start adapter
- Strict TypeScript, Zod, ESLint, and plain CSS
- Local versioned JSON content and browser `localStorage`; no API or database

## Local development

```sh
npm install
npm run dev
```

Open `http://localhost:3000`.

Local development intentionally runs without Netlify's Vite adapter because the planner uses no platform APIs. The adapter remains enabled for production builds, where it emits the deployment entrypoint.

## Required checks

```sh
npm run lint
npm run typecheck
npm run validate:content
npm run build
```

Automated unit and browser tests are intentionally deferred for this prototype and remain a public-release blocker in `TODOS.md`.

## Content workflow

Production reads these versioned local files:

- `src/content/exercises.v1.json`
- `src/content/sequences.v1.json`
- `src/content/policy.v1.json`
- `src/content/safety-copy.v1.json`

The current draft catalogue is generated from `scripts/generate-content.mjs` so repeated four-week prescription structures remain consistent:

```sh
npm run generate:content
npm run validate:content
```

Content validation checks schemas, versions, unique and resolved IDs, progression tracks, harder-exercise cycles, sequence totals, direct YouTube demonstration URLs, and all local posture assets. Each exercise owns three WebP frames under `public/exercises/{exercise-id}/`. A qualified fitness reviewer must approve the prescriptions, posture imagery, videos, and generated JSON before public launch.

## Browser persistence

Only planner preferences are stored under `getfit:planner-preferences:v1`:

- minutes per session;
- two to four selected weekdays;
- starting point.

The generated plan, disclaimer acknowledgment, and health information are never stored. If storage is unavailable or corrupt, the application continues in memory and tells the user that preferences will not be retained.

## Deployment

`netlify.toml` pins Node.js 24, runs the production build, and publishes `dist/client`. Netlify creates deploy previews for pull requests and publishes production from `main` at [getfit-with-tarun.netlify.app](https://getfit-with-tarun.netlify.app/). The official Vite plugin also emits the server entry Netlify needs for TanStack Start; personalized planning still happens entirely in the browser.
