# Deferred Work

## Release blocker: automated verification and source monitoring

**What:** Add the complete automated test pyramid and scheduled source-link validation before public launch.

**Why:** The prototype contains deterministic exercise selection, safety-sensitive draft content, browser persistence, hydration behavior, responsive interaction, and print output. Manual smoke checks cannot prove all supported combinations or prevent regressions.

**Pros:** Proves all compiler combinations remain within policy, catches malformed or stale content before deployment, verifies the no-health-data persistence boundary, and gives accessibility and browser regressions a release gate.

**Cons:** Adds Vitest, Testing Library, Playwright, axe integration, browser binaries, fixtures, snapshots, CI time, and a human review process for reachable-but-changed external demonstrations.

**Context:** Use `/Users/tannu/.gstack/projects/Projects/tannu-master-eng-review-test-plan-20260901.md` as the starting test inventory. Required coverage includes:

- all 819 combinations of 91 valid weekday subsets × 3 durations × 3 starting points;
- compiler invariants, duration budgets, A/B alternation, adjacent-day separation, explanation completeness, and fail-closed behavior;
- catalogue schemas, IDs, references, assets, provenance, tracks, versions, and progression cycles;
- missing, valid, malformed, future-version, quota-failed, and blocked `localStorage` behavior;
- disclaimer acknowledgment remaining session-only and health answers never being collected;
- keyboard and screen-reader behavior, focus management, WCAG 2.2 AA checks, 320px layout, and reduced motion;
- Letter/A4 print output and critical flows in Chromium, Firefox, and WebKit;
- a scheduled URL reachability and 180-day review-age report, with human approval required before source replacement.

**Depends on / blocked by:** The current compiler/content contracts and stable page behavior. Public launch is also blocked by qualified fitness review of the catalogue, prescriptions, sources, and safety copy.

## Monitor: Netlify build-adapter advisories

The latest `@netlify/vite-plugin-tanstack-start` currently brings six high-severity `sharp`/libvips advisories through its development and image-tooling dependency chain, with no upstream fix available. The application does not use Netlify Images, the adapter is excluded from the local development server, and `npm audit --omit=dev` reports no high or critical production dependency. Re-run the full audit when Netlify updates the adapter and upgrade as soon as the vulnerable chain is removed.
