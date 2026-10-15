# Invocation selection preparation — handoff

STATUS: READY — independently reviewed and validated; CI pending.

Branch `issue_24173_invocation_selection_prep` is pushed to `jmchilton/galaxy` at `60dc8ddf598`, based on `dev` at `88127f42979`. It contains **+158/-46 lines across 12 files**, extracted into five atomic commits:

| Commit | Independent change |
| --- | --- |
| `b2b526683c8` | Resolve invocation steps by workflow order_index, with an imported-order regression |
| `f4c55c11dd2` | Wait for measured graph bounds before centering, with a real-store/D3 regression |
| `1c8924c1486` | Exercise existing notebook-report switching through a real router |
| `024d1a16535` | Isolate metrics requests in existing job component tests |
| `60dc8ddf598` | Wait for job information before the existing invocation screenshot |

The user explicitly rejected unused API foundations. GenericItem controlled expansion stays with its first consumers in the [selection feature](../issue_24173_invocation_selection_urls/index.md). Prep introduces no selection module, URL contract, router-reuse policy, feature-specific browser selectors, or unused API. All eight order-index lookup changes from the original feature were moved; this does not claim elimination of every older positional lookup in Galaxy.

## Validation and review

- Independent prep [test challenge](test_challenges_debrief.md): **41 tests across six files pass**, with no selection module present. Includes graph readiness, invocation graph/order handling, notebook routing, job component baseline and message/list siblings.
- Full `vue-tsc --noEmit`: pass. Production `vite build`: pass. Logs `/tmp/issue24173-prep-types.log` and `/tmp/issue24173-prep-build.log`.
- All five commits passed the normal repository hooks, including applicable ESLint, Prettier, Black, Ruff and flake8 checks.
- Independent headless Playwright `test_job_details`: **1 passed in 71.85s**, using prep client port 5174 and the unchanged Galaxy backend. [E2E polish](polish_e2e_tests_debrief.md), [inspected screenshot](screenshot_debrief.md).
- [Normal review](subagents/prep_review.md), [strict review](thermo_nuclear_review.md), and [scope evaluation](scope_evaluation.md) have no outstanding recommendation or new scope decision.

The feature was rebased cleanly onto this branch. Its final tree remains exactly equal to its pre-extraction validated head; the prep/feature split changes review ownership and ancestry while preserving the combined implementation. No source changes were needed during review or validation. Both worktrees are clean; no PR opened. This branch is registered under `branches_implemented_needs_ci`. CI remains outstanding.
