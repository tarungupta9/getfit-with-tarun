# GetFit version plans

This directory is the product's decision trail. Each numbered plan captures one bounded iteration: the user problem being addressed, the smallest useful increment, the constraints that remain fixed, the checks required for completion, and the work deliberately left for later.

## How iterations are run

1. **Frame one product question.** Start from a specific user outcome or observed point of friction, not a broad feature list.
2. **Protect the boundaries.** State what stays unchanged across safety, privacy, deterministic planning, content ownership, and deployment.
3. **Ship a vertical increment.** Change the smallest end-to-end slice that can answer the question in the real interface.
4. **Check the result.** Define acceptance checks for behavior, accessibility, responsive layout, content integrity, and production build health.
5. **Preserve the learning.** Keep the plan as a historical snapshot and write the next increment as a new document. Deferred work remains visible rather than disappearing between versions.

This creates fast feedback without turning speed into uncontrolled scope. The implementation can move quickly because each version has a narrow question and explicit non-goals, while the core product and trust boundaries remain stable.

| Version | Focus | Status | Plan |
|---|---|---|---|
| V1 | Prove the complete planning loop | Implemented prototype | [Initial explained home-fitness MVP](./01-initial-mvp.md) |
| V2 | Make prescribed movements understandable | Implemented draft; media awaits qualified form review | [Exercise media and form guidance](./02-exercise-media-and-form-guidance.md) |
| V3 | Give detailed guidance a focused interaction | Implemented draft; usability feedback incorporated | [Focused exercise-detail modal](./03-focused-exercise-modal.md) |

Long-form product, safety, and architecture reasoning remains in the [V1 design record](../designs/home-fitness-mvp.md). Repository-wide release blockers remain in [`TODOS.md`](../../TODOS.md).
