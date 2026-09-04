# GetFit with Tarun

A browser-only prototype that turns a beginner's available time, weekdays, and starting point into an explained four-week home-fitness plan.

Product progression is recorded in [`docs/version-plans/`](docs/version-plans/README.md).

> **Prototype:** The bundled exercise catalogue and safety copy have not been professionally reviewed. Do not publish or present the generated routines as approved exercise prescriptions until the release gates in `TODOS.md` are complete.

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

`netlify.toml` pins Node.js 24, runs the production build, and publishes `dist/client`. Connect the repository to Netlify to receive deploy previews for pull requests and production deploys from `main`. The official Vite plugin also emits the server entry Netlify needs for TanStack Start; personalized planning still happens entirely in the browser.
