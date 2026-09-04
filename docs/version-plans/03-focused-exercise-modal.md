# V3 — Focused exercise-detail modal

**Status:** Implemented draft; qualified form review required  
**Recorded:** 2026-09-04

## Goal

Give each posture sequence enough space for focused study without forcing expanded media into the two-column workout layout.

## Included scope

- Exercise rows remain compact inside Workout A and Workout B.
- Activating Details opens a centered native dialog with the exercise name, current prescription, posture carousel, cues, four-week progression, easier option, stop guidance, and correct-form video link.
- Dialog supports keyboard focus containment, Escape dismissal, backdrop dismissal, a labelled close button, and focus restoration to the originating Details control.
- Carousel images use `object-fit: contain` inside a large responsive stage.
- Generated frames retain their original portrait or landscape orientation instead of being normalized to square crops.
- Summary thumbnails use contained images so wide and tall movements remain untrimmed.
- Desktop modal uses a media-and-instructions split; narrower screens stack both regions.
- Print output keeps written exercise details without printing the modal overlay.

## Acceptance checks

- Portrait and landscape exercise frames remain fully visible.
- Details opens the corresponding exercise in a modal.
- Carousel navigation and wraparound continue working.
- Modal closes through the close button, Escape, and backdrop.
- Keyboard focus returns to the triggering Details control.
- Desktop and mobile layouts remain usable.
- Lint, typecheck, content validation, and production build pass.

## Deferred

- Automated unit and browser tests.
- Professional approval of generated form images and linked demonstrations.
