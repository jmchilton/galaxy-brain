# Scope evaluation (round 2, after re-scope)

**Recommendation: keep as implemented. No scope change.** Round 1's expansion is built: the `replacement_params` key fix (issue footnote ¹) and the shared `withRerunValues`. Codex, the thermo-nuclear review and the normal review found nothing that widens or narrows scope. I checked the two candidates round 1 didn't cover, and both are closed. Admin `simplified_workflow_run_ui: off` being ignored on rerun no longer loses anything, so it is policy, not silent loss. Workflow landings carry only inputs, so the bug has no sibling there. Everything under "Follow-ups" below is a follow-up, **not** a recommended scope change.

Evaluated `ced412c6248..840ec8a631e`, 4 commits on #24176's tip: +277/−62 in all, about +91/−59 implementation (`.vue`/`.ts`/`navigation.yml`) and about 186 test lines.

## Possible Decompositions

This is for John to decide later. I'm not recommending a split. Constraints that hold for every option:
- Commit 2's forced expanded form must land with or after #24176's expanded-form prefill. Otherwise reruns lose the input prefill they have today.
- The refactor commit `b7733f5f4f0` folds #24176's `isRerun && rerunHasStepParameters` gate into the new `simpleForm` computed. It can target `dev` alone only if that line is dropped.
- The baseline commit creates `WorkflowRunFormSimple.test.ts`. Any piece that targets `dev` on its own needs its own copy of the test file.

**Option A: as is, one PR on #24176.** All 4 commits: baseline, gating refactor, forced expanded form plus simple-form prefill, and the `replacement_params` key.

**Option B: key fix first, off `dev`.**
1. **Simple form sends `replacement_params`** (a 1-line change, targets `dev`, backportable).
   - It needs a new `WorkflowRunFormSimple.test.ts` with only the baseline payload case and the `replacement_params` / `not.toHaveProperty("replacement_dict")` assertions.
   - Only the first-run half of `test_workflow_rerun_simple_form_keeps_workflow_parameters` stands alone: simple-form run, output named `moocow suffix`. It could become a simple-form twin of `test_workflow_run.py::test_replacement_parameters`.
   - It fixes a bug that has been silent since 2020 on every simple-form and landing run.
2. **The rest on #24176:** baseline, refactor, gating, prefill, and the rerun half of the Selenium test. It rebases onto (1) once that lands.

**Option C: refactor separately.**
1. **Baseline tests plus the gating refactor** (`708a26767b1`, `b7733f5f4f0`). These make no behaviour change. They go on #24176, or on `dev` without the rerun-gate line.
2. **The fix:** commits 2 and 3.

## 1. As implemented (recommended)

When a rerun's request export has non-empty `parameters`, the rerun opens the expanded form. It shows a typed `rerunHasStepParameters` reason, which has the lowest priority, and hides the Simple Form toggle. On a simple-form rerun, the form prefills object stores and workflow parameters, using the shared `withRerunValues`. The simple form now submits workflow parameters as `replacement_params`. Gating is computed from props and the model in a new `simpleFormDisabledReason.ts`.

| Pros | Cons |
| --- | --- |
| Delivers the issue's whole proposed approach, plus footnote ¹. The issue's "workflow parameters once it actually submits them" now works end to end, and Selenium proves it. | Behaviour changes for every simple-form and landing run: `${...}` renames now apply. The PR text must say so. |
| Client only; uses #24176's surface without editing it. | The footnote ¹ fix ships behind #24178 → #24176 instead of standalone (see Option B). |
| No open reviewer should-fix: Codex returned no findings, and thermo and normal reviews were acted on. | A forced expanded rerun still drops object stores. This is the issue's known gap; settled. |

## 2. Expansion: honour `simplified_workflow_run_ui: off` on rerun

`WorkflowRerun.vue` hard-codes `prefer-simple-form`. The issue lists this under "who hits this". The change would pass `config.simplified_workflow_run_ui === "prefer"` instead.

| Pros | Cons |
| --- | --- |
| Rerun would match the admin's choice, like the router and Home do. | Nothing is lost any more. On an `off` server, UI runs start from the expanded form, which always records `parameters`, so this branch already sends their reruns to the expanded form. |
| The reason for the hard-code is gone: it came with `8a0b56c1d88` "Add rerun option for invocations", when the expanded form couldn't prefill, and #24176 removes that. | Only API-origin runs without `parameters` stay simple, and they keep inputs, job reuse, object stores and workflow parameters. So this is admin policy, not silent loss. |
| | The simple form has rerun features the expanded form lacks: input-matching checks and the "Rerun Workflow" title. The change is in `WorkflowRerun.vue`, which #24176 owns. |

Not recommended. It is a follow-up for after the stack lands.

## 3. Expansion: workflow landings

`WorkflowLanding` mounts `WorkflowRun` with `prefer-simple-form` and a `requestState`, so it is the other way into the simple form.

| Pros | Cons |
| --- | --- |
| It would cover the same bug class at a second entry point. | There is no bug to fix. `WorkflowLandingRequest.request_state` is workflow inputs only (`validate_workflow_request_state` in `managers/landing.py`), and it has no step `parameters`. The only change landings get is that renames apply, through commit 3. |

Closed.

## 4. Contraction: split the `replacement_params` fix off `dev`

This is the same as Decomposition B, considered as a scope change.

| Pros | Cons |
| --- | --- |
| A 1-line, backportable fix for a bug that has been silent since 2020, and it ships without the stack. | Until it lands, this branch's simple-form workflow-parameter prefill has no effect, and the rerun Selenium test can't pass. |
| | Round 1 recommended folding it in, and the fix is built. The stack stays on `dev`, which is settled. |

Not recommended as a scope change. It stays available as a decomposition.

## 5. Object stores in the forced expanded form, controls or a notice line

| Pros | Cons |
| --- | --- |
| It would close or explain the known gap. | Settled as out of scope. The notice line (round 1's 6b) only reaches API-origin runs that recorded both `parameters` and stores, and nothing new has come up since round 1. |

Not evaluated further.

## Settled, not evaluated

- The stack stays on `dev`.
- The resolver lives in #24178.
- #24176 owns server seeding, the legacy-input lookup and `withRerunValues`.
- #24175 owns import.
- Out of scope: full-form object stores and the "step params lost" notice.
- Folding `requestState`/`simpleFormUseJobCache` into `rerunRequest` is out (Landing, Home and the router use them).
- The predicate stays on `parameters` (round 1, scope 5).

## Follow-ups (not scope changes)

- Drop `WorkflowRunForm`'s redundant `disableSimpleForm` prop, now that the reason is typed (thermo).
- Replace the alert's `v-else-if` chain with an exhaustive `Record<SimpleFormDisabledReason, string>` message map (thermo).
- Add a Selenium `_open_rerun(invocation_id)` helper and a shared submit/rerun helper (E2E polish, rounds 1 and 2). Two of its call sites are in #24176's test.
- Add an object-store seeding helper in `WorkflowRunFormSimple.vue`, if more seeding arrives (thermo, marginal).
- Thermo noted an edge: if `object_store_allows_id_selection` is turned off between runs, a simple-form rerun resubmits stores the user can't see.
- Honour `simplified_workflow_run_ui: off` on rerun (section 2), after the stack lands.
- `param_map` keyed-by-id bug in `workflow_run_config_to_request`: server code this branch doesn't touch.

<details><summary>PR text and notes</summary>

- **What the PR must say:**
  - renames now apply on simple-form and landing runs
  - workflow parameters are now saved in the request export
  - reruns no longer flag an untouched workflow parameter as changed (review L3)
  - footnote ¹ is fixed here, so the issue body's "to be filed on its own" no longer applies. Describe it in the PR, or file and reference it.
- Per the settled wording, the PR shouldn't claim that current workflows silently fall back through the legacy unlabeled-input path. That path affects only workflows saved by old Galaxy.
- The workflow-parameter prefill lost its unit test in the test challenge. The Selenium test covers it end to end. This is a test note, not scope.
- `index.md` is stale: it shows the old head `7f57142acd3`, still lists `replacement_dict` as out of scope, and still shows the `withRerunValues` decision as pending.

</details>
