# V4 — Restored plans and embedded exercise video

**Status:** Implemented draft; qualified form review required  
**Recorded:** 2026-09-05

## Goal

Return users with valid saved planner preferences directly to their deterministic workout and let them view the manually selected exercise demonstration without leaving the application.

## Included scope

- Valid saved preferences are parsed and recompiled against the currently bundled content during browser hydration. A complete result opens the plan; missing, invalid, unavailable, or non-compilable state fails closed on the landing page.
- Only planner preferences remain persisted. Generated plans, disclaimer acknowledgment, media-tab selection, and playback state remain session-only.
- A restored plan does not ask for another disclaimer acknowledgment. Creating or updating a plan still requires the existing acknowledgment.
- Exercise details provide keyboard-accessible Photos and Video tabs. Photos is the default every time the dialog opens.
- Selecting Video lazily mounts a privacy-enhanced `youtube-nocookie.com` iframe. Leaving Video or closing the dialog removes the iframe and stops playback.
- The player does not autoplay. Local photos and written instructions remain usable without YouTube, and the reviewed direct link remains available as a fallback.
- Production limits frame sources to `https://www.youtube-nocookie.com` through Content Security Policy.

## Architecture delta

V2's local-media architecture and manually curated source records remain authoritative, but its “links are never embedded” rule is superseded by this document. YouTube is now a user-initiated runtime trust boundary: selecting Video sends ordinary browser and network metadata to YouTube. The application does not intentionally send planner preferences, generated-plan data, health data, or analytics.

There is no YouTube API, API key, runtime search, source substitution, new package, backend service, or storage-format change. Embed URLs are derived locally from schema-validated direct video URLs and are restricted to the privacy-enhanced host.

## Failure behavior

- Invalid or unsupported saved data is never used to create a partial plan.
- If valid preferences cannot produce a complete plan with current content, the landing page explains that the choices must be reviewed and keeps them available for editing.
- If a video is unavailable, blocked, age-restricted, or disallows embedding, the local photos and cues remain the primary guidance and the direct YouTube link remains the fallback.

## Acceptance checks

- Refresh with valid saved preferences returns directly to the same deterministic workout without showing Start after hydration.
- Empty, malformed, future-version, and blocked storage remain on the landing page with the correct behavior or notice.
- Photos loads first without a YouTube iframe; Video mounts one privacy-enhanced iframe; leaving Video or closing the modal removes it.
- Tab and modal interactions remain operable by keyboard with correct focus behavior.
- Desktop, 320px, reduced-motion, and print layouts remain usable.
- Lint, typecheck, content validation, and production build pass.
