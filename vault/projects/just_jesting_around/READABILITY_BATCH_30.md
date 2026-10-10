# Readability batch 30

Four originators, one test per commit, then one range review. Tool Shed `galaxyUi` is a follow-through selection from batch 29; the other three were drawn with seed `2610930`. [Manifest](readability_batch_30.yml).

## Originators

| Selected test | Result | Cases |
| --- | --- | ---: |
| Tool Shed `galaxyUi` | Adopts `createMemoryRouter` from `@/test-utils`, adds auto-unmount, and clears the three ESLint warnings without disables. The v-model cases mount GTabs and GCollapse with `modelValue` + `onUpdate:modelValue`, which is what `v-model` compiles to on plain Vue 3 (as `client/packages/ui` GCheckbox/GFormInput tests do). GTabs checks the exact emit and the round trip; GCollapse checks it starts closed. [Review](reviews/batch30/galaxyUi.md). | 8 → 8 |
| JobMetrics | `mountJobMetrics(...)` with `withPlugins`/`props`/auto-unmount; a dead `axios` mock (wrong comment), `setActivePinia` and empty store maps removed. Grouping is one exact `toEqual` per table; both cases gain a negative check. [Review](reviews/batch30/JobMetrics.md). | 2 → 2 |
| UserSharing | Mount seeds the current user; item factories, selectors, describe groups, auto-unmount; dead `axios` automock and casts removed. Exact emission checks exposed a double `cancel`: `GModal.vm.$emit("cancel")` leaves the native dialog open, so closing it later emits again. The modal cases now click GModal's real footer buttons. [Review](reviews/batch30/UserSharing.md). | 6 → 6 |
| WorkflowRun | **Order-dependent at base:** fails under seed `300101` (confirmed by the driver). `WorkflowRunModel` nulls `RuntimeValue` inputs on the object it's given, and the mock returned the same imported `run1.json` every call. The mock now returns `structuredClone(...)`, as sibling WorkflowRunForm already does; the fixture is unchanged. One mount helper, no fake timers, `wrapper.vm` reads replaced with rendered checks and WorkflowRunForm's `model` prop; a `forEach` over steps that passed on an empty list is now an exact array. [Review](reviews/batch30/WorkflowRun.md). | 6 → 6 |

## Reuse and follow-through

Closes batch 29's `galaxyUi` follow-up; `createMemoryRouter` now has four Tool Shed consumers.

Queued for batch 31: about 30 GModal `vm.$emit("ok"|"cancel")` call sites (WorkflowMissingToolsRequest, RenameModal, UserDeletion, WorkflowInvocationShare, ...). A shared `clickModalButton` with those consumers is the candidate; whether they hit the double `cancel` is unchecked. README guidance on driving GModal through its buttons waits for that helper.

Not a production bug: `WorkflowRunModel` mutating its input is harmless when each `getRunData` call returns a fresh response.

Guidance: none yet (see above).

## Validation and review

22 cases across 4 suites pass, unchanged from baseline. Each commit's tests pass at that commit, shuffled with seed `300101`. Full client vue-tsc and the Tool Shed typecheck pass at the tip; ESLint, Prettier and hooks pass. [Independent review](reviews/batch30/review.md) approved all four commits, checking the three judgment calls (WorkflowRun clone, GModal buttons, v-model form) against `model.js` and `GModal.vue`.

Commits: `7afd8fbfd23` (galaxyUi), `a931df53820` (JobMetrics), `cde495da54d` (UserSharing), `ff840147878` (WorkflowRun).

## Later fold (2026-10-10)

Two follow-ups were folded into this batch's commits, per the one-commit-per-test-file rule in `PIPELINE_BRANCHES.md`:
- **UserSharing coverage.** A downstream agent found that the rewrite seeded the user before mount, so the falsy arm of `v-if="currentUser && isConfigLoaded"` never rendered. `UserSharing.vue` branch coverage fell from 55.17% to 54.02%. The driver confirmed both numbers. Two cases restore it (6 → 8): the no-user render, then the user loading, plus config not loaded. See [the review note](reviews/batch30/UserSharing.md).
- **WorkflowRun store seed.** Batch 32 committed this fix separately; it now lives in the WorkflowRun commit.

Lane 1 was rebased from `f43c5a1ce75` and pushed with a lease on `f324bca585c`. Every commit's tests pass at that commit, vue-tsc passes at the tip, and the tip diff against the old tip is only `UserSharing.test.ts`. The `Test-File` trailers are the stable identity. The SHAs recorded for batches 30–34 map as follows:

| Old | New | Subject |
| --- | --- | --- |
| `cde495da54d` | `20f5d7741ef` | Improve readability of UserSharing tests |
| `ff840147878` | `cb50245f8a0` | Improve readability of WorkflowRun tests (now includes `00b6f3f26de`) |
| `85330e23a62` | `bac4285fd4f` | Extend src/components/BaseComponents/test-utils.ts for client unit tests |
| `e2b83bdbe13` | `5ce47445678` | Improve readability of RenameModal tests |
| `60d1cafba36` | `c92adacb25e` | Improve readability of UserDeletion tests |
| `b9fe9d53604` | `1fff2313556` | Improve readability of WorkflowMissingToolsRequest tests |
| `95cbb90c590` | `f2db2f576a1` | Improve readability of WorkflowInvocationShare tests |
| `f8463741af2` | `b9017893852` | Document GModal clicks and Pinia store ids in client testing README |
| `00b6f3f26de` | folded into `cb50245f8a0` | Fix user store seed in WorkflowRun tests |
| `d8487c1f13a` | `3d56cf5f179` | Extend tests/test-data/index.ts for client unit tests |
| `f9089bd0ed7` | `e19ef8d4f0e` | Improve readability of useCommandPalette tests |
| `63064fcb2f2` | `727d9393fa2` | Improve readability of PermissionsInputField tests |
| `f2df22ee269` | `9b9cd828bee` | Improve readability of historyNodeColor tests |
| `1e6d8358e8f` | `aebc961231e` | Improve readability of ObjectStoreRestrictionSpan tests |
| `366c441c3ba` | `467d787d3cc` | Improve readability of Masthead tests |
| `c7f2f2babb1` | `3271f5c4de8` | Use user factories in ToolSuccess tests |
| `64db7104fc7` | `0c87c5d0ee3` | Improve readability of QuotaForm tests |
| `7ee3c9f5605` | `a69eac78bd4` | Use shared filter mock in RoleForm tests |
| `de9a256d5fa` | `c2662bc8987` | Improve readability of floatingPosition tests |
| `c7499806539` | `735728f4a66` | Improve readability of ChangePassword tests |
| `af169c23ba9` | `893053492a0` | Use ref-backed config mock in client testing README example |
| `783d3e03c7d` | `840a4f3e6d6` | Fix tests/vitest/mockConfig.js for client unit tests |
| `16298061fde` | `129d04e7ab3` | Improve readability of QuotaMeter tests |
| `86489dcbf6c` | `298c8ddd3d5` | Improve readability of GridList tests |
| `22d1b41b3d8` | `b0e4e470630` | Improve readability of ToolCard tests |
| `f324bca585c` | `f9113edf20c` | Improve readability of useRegistrationTarget tests |

PR #24015's `jest_readability_batch_01` still points at the old `1e6d8358e8f`.

Lesson: when a rewrite moves store seeding from after mount to before mount, keep a case for the pre-seed render if the template branches on it.
