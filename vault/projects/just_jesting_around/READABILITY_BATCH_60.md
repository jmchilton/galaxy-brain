# Readability batch 60

Four originators selected with seed `2610960` from 277 eligible existing tests; [manifest](readability_batch_60.yml). Recorded remote/base `bc3b5f773a05` and dev `9ac3cd2eb304` before fetching; rebase unchanged. Four test files only; existing helpers reused, no supporting, shared, production or documentation changes.

| Originator | Change | Cases |
| --- | --- | ---: |
| [Invocation step header](reviews/batch60/WorkflowInvocationStepHeader.md) | Owned attachment target and Pinia cleanup, typed native mount; six tooltip accessibility checks retained | 1 |
| [Tool help](reviews/batch60/ToolHelpRst.md) | Native mounts, required help lookup and wrapper/sanitizer call-history cleanup | 2 |
| [Object-store dropdown](reviews/batch60/InstanceDropdown.md) | Native typed mounts, owned cleanup and complete request capture requiring exactly one request | 2 |
| [Tool recommendations](reviews/batch60/ToolRecommendation.md) | Scenario-local typed wrappers and real datatype model fixture | 5 |

All 30 original checks and ten cases remain. Combined shuffled seed 600101 passes all four suites; independent reviews use 600201. Source-location coverage retains every original location: step header 182 files/426 locations plus actual shared GPopover 1/199, tool help 16/75, dropdown 25/152, recommendations 17/201→18/205 through the real datatype constructor. File lint, formatting and repository hooks pass. Existing guidance suffices; no marginal advice added. [Scope review](reviews/batch60/scope.md) retains the four origins; no rendered UI changes require screenshots or E2E work.

The preceding head has three [diagnosed backend CI failures](reviews/batch60/ci_observation.md): Pulsar dependency import errors in two package jobs and a secure-hash tool timeout. Backend/dependency code is untouched. Draft remains draft; fresh publication runs CI again. Shared vault validation retains the unrelated empty `vault/reviews/Untitled.md` error; a fresh isolated Markdown snapshot excluding only that scratch note passes 122 files with zero errors and 15 existing advisory warnings. Vault records remain local only.

Full integrated client vue-tsc passes. Four independent normal reviews, [test challenges](reviews/batch60/test_challenges.md) and [strict maintainability](reviews/batch60/maintainability.md) approve without required corrections. Fast-forward published `9b952a0b874de984c631e217445e3298042500eb`; GitHub verifies exact head and draft status, mergeability initially recalculating. Four origin counters written after publication; downstream unchanged.
