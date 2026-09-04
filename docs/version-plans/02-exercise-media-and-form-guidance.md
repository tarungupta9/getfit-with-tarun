# V2 — Exercise media and form guidance

**Status:** Implemented draft; qualified form review required  
**Recorded:** 2026-09-04

## Goal

Make every catalog exercise easier to understand through local, human-looking posture sequences and a reviewed direct YouTube form link while keeping runtime content local.

## Included scope

- All 24 exercises receive three photoreal AI frames: start, key movement, and controlled finish.
- Final WebP assets live at `public/exercises/{exercise-id}/{start|movement|finish}.webp`.
- Each exercise record contains an ordered three-image tuple with phase, local path, alt text, and caption.
- Collapsed cards use the start frame. Expanded cards expose a keyboard-accessible carousel with previous/next buttons, frame dots, captions, and position status.
- Print/PDF output shows all three frames as a static strip.
- Each exercise links directly to a manually selected YouTube demonstration using the label “Watch correct form on YouTube.” Links are never embedded or fetched in the background.
- Source/reviewer/evidence metadata stays in local JSON. The separate visible Source record section is removed.
- Content validation checks exact phase order, unique WebP paths, local file existence, and direct HTTPS YouTube hosts.
- Generic family SVGs are retired after all references are removed.

## Media policy

- Same person, clothing, camera, and background within each three-frame set; varied adult representation across the catalog.
- Full body and required support equipment remain visible. Images contain no text, logos, or watermarks.
- AI-generated form images are illustrative, not proof of biomechanical correctness. Catalogue remains draft until a qualified reviewer checks every frame, cue, progression, and linked video.
- Video sources favor public-health bodies, hospitals, physical-therapy organizations, and credentialed fitness organizations. Reachability alone does not equal approval.

## Acceptance checks

- Lint, typecheck, content validation, and production build pass.
- All 72 local assets resolve and no catalog record references a generic SVG.
- Carousel works with pointer and keyboard controls at desktop and mobile widths.
- Reduced-motion and print layouts remain usable.
- No visible Source record section remains.

## Deferred

- Automated unit and browser tests.
- Professional approval workflow, scheduled link monitoring, remote media, CMS, API, database, and video embedding.
