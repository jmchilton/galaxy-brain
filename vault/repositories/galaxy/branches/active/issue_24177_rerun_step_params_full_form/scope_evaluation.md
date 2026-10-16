# Scope evaluation

**Recommendation: keep the scope as implemented. No scope change.** The branch covers what the issue's Proposed Approach assigns to #24177. A rerun whose export carries step `parameters` stays in the expanded form, shows the reason, and has no **Simple Form** toggle. The simple form also prefills object stores and `replacement_params` from the export. The pieces the issue lists as excluded stay out: expanded-form object stores, the `replacement_dict` bug (footnote ¹), and the `param_map` bug. Every expansion raised by a reviewer is one of three things: pre-existing on dev, its own issue, or code owned by #24176, which the coordinator said this branch must not edit. None of them is a reason to reopen scope or block. Four bookkeeping items remain, and none of them gates READY:
- the two #24176-to-#24177 handoffs, which this branch only partly met;
- a deferred cleanup commit, to be made after #24176 merges;
- the still-unfiled `replacement_dict` bug.

Each is spelled out below.

Evaluated at `18bc9a95136`, which sits on parent tip `21bc27af25d`. That is 4 commits: `9072725f51e`, `23e25b08a92`, `a0249fd31bc` and `18bc9a95136`.
- Implementation is about +51/−9, client only, across 4 files.
- Tests are about +222, across 2 vitest files and 1 Selenium test.

**Stale references in the debriefs.** The initial debrief and the normal review cite `fa466393aea` over `d14f5eaa60b`, which were rebased since. The test-challenge and E2E-polish debriefs call their changes "uncommitted", but they are now commits `a0249fd31bc` and `18bc9a95136`.

**Parent flag resolved.** #24176's scope evaluation flagged that a malformed row could raise `InconsistentDatabase` and fail the whole run form. Parent commit `21bc27af25d` fixed that: `recover_step_parameters()` now skips `TypeError`/`ValueError`/`KeyError` rows with a warning.

## Proposed Approach coverage

| Issue bullet | Where | Status |
| --- | --- | --- |
| `rerunHasStepParameters` predicate in `model.js`, plus a unit test | #24176 | Done (guard and `model.test.js`) |
| Export passed whole to `WorkflowRun` (`rerun-request`) | #24176 | Done |
| Fourth `disableSimpleFormReason`, explained by an alert, toggle hidden | this branch | Done |
| Simple form seeds 3 object store ids | this branch | Done (split iff outputs or intermediate id) |
| Simple form seeds `wpInputs` from `replacement_params` | this branch | Done. Has no effect until ¹ is fixed |
| Shared lookup moved to `model.js` | #24176 (`rerunInputValue`) | Inputs done. The `replacement_params` lookup is still duplicated (`withRerunValues` in #24176 plus an inline copy here). Deferred |
| Component tests: with params → expanded, reason, no toggle; without → simple; simple prefills object stores | #24176 + this branch | All present (`WorkflowRun.test.js`, `WorkflowRunFormSimple.test.ts`) |
| Selenium: change a tool value, rerun, assert the export keeps it | this branch | Present, on a runtime-input fixture rather than the issue's saved-value scenario (see below) |
| Known gap: object stores in the expanded form | none | Out of scope by decision |

## As implemented

The guard from #24176 now also disables the simple form, with reason `rerunHasStepParameters`. It is lowest priority, so a structural reason such as open tool steps, `${}` or resource params keeps its own text. `WorkflowRunForm` explains the new reason and hides the toggle. `WorkflowRunFormSimple` takes `rerunRequest` and seeds the object store refs and workflow-parameter inputs from it. This branch adds no server change.

| Pros | Cons |
| --- | --- |
| <ul><li>Matches the issue's Proposed Approach and its approved UX trade.</li><li>Small, client-only, and confined to the three run components already involved.</li><li>Completes the half-behaviour #24176's guard left: the reason text and the hidden toggle.</li><li>Leaves #24176 untouched apart from extending its guard, as the coordinator asked.</li><li>The object store prefill has value now, for simple-form or API runs that recorded stores.</li></ul> | <ul><li>The `replacement_params` prefill is display-only until ¹ is fixed, and ¹ is unfiled.</li><li>The UX shift: every expanded-form run now reruns in the expanded form, with no way back.</li><li>Rare case: an API run that recorded both `parameters` and object stores now reruns where object stores cannot be picked at all. On dev, the user could re-pick them in the simple form.</li><li>The `replacement_params` lookup is duplicated, and some prop cleanup is deferred until #24176 merges.</li></ul> |

<details><summary>Parent handoffs: what #24176's scope evaluation assigned here</summary>

#24176's `scope_evaluation.md` handed this branch two jobs. Neither landed as written.

**(a) "Assert the original tool value is shown before editing it."** Not done.
- The rerun's tool step renders collapsed, so the value isn't visible without expanding the step (polish debrief).
- The test proves the value survives in two other ways instead:
  - the rerun's request export has `num_lines == "3"`;
  - the output has 3 lines.
- Both depend on #24176's seeding. With the runtime-input fixture, the field would otherwise be empty and the run would not produce 3 lines. So the end-to-end proof for #24176's pass-through exists, only through a different assertion.
- Verdict: adequate. It doesn't block.

**(b) "Collapse the `WorkflowRerun` prop slices and the redundant `isRerun &&`."** Declined, and half of it was never feasible.
- `WorkflowRun`'s `requestState` and `simpleFormUseJobCache` props are also used by `WorkflowLanding.vue`, `Home.vue` and `router.js`, so they have to stay.
- The remaining parts all touch #24176 code:
  - the fold inside `WorkflowRunFormSimple` (read `requestState`/`useJobCache` from `rerunRequest`);
  - dropping `isRerun &&`;
  - moving `withRerunValues` to `model.js`;
  - merging the two `mountRerun` helpers in `WorkflowRun.test.js`.
- **Owner:** one cleanup commit on #24177 after #24176 merges, when the no-edit constraint lapses. Or, if #24177 is already in review by then, a follow-up PR.
- The #24176 record's handoff note should say this, so (b) isn't treated as done.

</details>

## Fold this branch into #24176 (or ship #24176 + #24177 as one PR)

Land the reason text, the hidden toggle and the simple-form prefill with #24176's seeding and guard. **Settled: the split is deliberate.** Listed for completeness only.

| Pros | Cons |
| --- | --- |
| <ul><li>No intermediate UX (#24176's guard with no reason text).</li><li>Removes the cross-branch handoffs and the deferred cleanup.</li></ul> | <ul><li>Mixes a server feature (seeding) with a client policy change (forced form). Reviewers may accept one and not the other.</li><li>Contradicts John's settled four-branch split.</li><li>No new reason has emerged: #24176's guard already prevents a regression on its own.</li></ul> |

## Contract: drop the simple-form `replacement_params` prefill until ¹ is fixed

Remove the 4-line `wpInputs` seeding (and its test). Ship it with the ¹ fix instead.

| Pros | Cons |
| --- | --- |
| <ul><li>No code that has no effect on what is submitted.</li><li>Removes the duplicated `withRerunValues` lookup without touching #24176.</li></ul> | <ul><li>The issue's Proposed Approach asks for it explicitly, noting it is inert until ¹.</li><li>The ¹ fix would then have to touch two concerns (submit key plus rerun prefill).</li><li>It does no harm: the displayed value matches the original run, and dev drops it on submit anyway.</li></ul> |

## Expand: fix footnote ¹ (`replacement_dict` → `replacement_params`) here

Rename the simple form's submit key so that `${name}` workflow parameters are actually applied, which makes this branch's prefill live.

| Pros | Cons |
| --- | --- |
| <ul><li>About a one-line fix, and it gives this branch's prefill real value.</li><li>It is the same component.</li></ul> | <ul><li>It changes **every** simple-form run, not only reruns. The bug dates from 2020 (#9151), and it needs its own simple-form Selenium/API test.</li><li>It is a backport candidate, which a stacked feature branch can't be.</li><li>The issue and coordinator explicitly exclude it.</li><li>**Not yet filed.** `gh search` finds only #24177, and the queued/24177 debrief leaves filing to John. It should be queued through `GX_QUEUING_ISSUE_CREATION.md` (coordinator or John), or it may get lost.</li></ul> |

## Contract: keep the Simple Form toggle, warn on it

Force the expanded form and show the reason, but keep the toggle. Add a warning that switching drops the recorded tool parameters.

| Pros | Cons |
| --- | --- |
| <ul><li>Softens the UX shift: users who want the simple form, for example to pick object stores, can still get it.</li></ul> | <ul><li>Brings back the silent-loss path the issue fixes, made explicit but one click away.</li><li>The issue specifies a hidden toggle.</li><li>Needs a confirm or warning state in the simple form, so more UI than the current approach.</li></ul> |

## Expand: object stores in the expanded form

Add object store controls to `WorkflowRunForm`, plus the submit and rerun prefill. **Out of scope by decision** (the issue's "known gap").

| Pros | Cons |
| --- | --- |
| <ul><li>Closes the last row of the issue table.</li><li>Removes the rare both-recorded case from "As implemented".</li></ul> | <ul><li>A new expanded-form feature, not a prefill. The form never sends stores, even on normal runs.</li><li>The case it fixes is rare: expanded-form runs never record stores, so only API runs carry both.</li><li>Its own issue.</li></ul> |

## Expand: honour `simplified_workflow_run_ui` on rerun

`WorkflowRerun.vue` still hard-codes `prefer-simple-form`. So on servers with the simplified UI off, a rerun with no step params still opens the simple form.

| Pros | Cons |
| --- | --- |
| <ul><li>The issue's "who hits this" calls out admins' setting being ignored.</li><li>Small (a config read).</li></ul> | <ul><li>Pre-existing, and nothing is lost: reruns without step params lose nothing in the simple form.</li><li>The data-loss half of that bullet is already fixed by the guard.</li><li>Separate concern; its own small issue if wanted.</li></ul> |

## Narrow the predicate to tool-step rows only

Exclude subworkflow-step rows from `rerunHasStepParameters`.

| Pros | Cons |
| --- | --- |
| <ul><li>Fewer forced expanded-form reruns.</li></ul> | <ul><li>The simple form drops subworkflow-step rows too, and #24176 seeds them into the expanded form. Narrowing would silently lose them again.</li><li>Recorded as a decision in the branch record.</li></ul> |

## Issue's rejected alternatives (forward `parameters` / force only on diff / warn only)

These are the issue's three alternatives:
- forward the export's `parameters` unchanged from the simple form;
- force the expanded form only when recorded values differ from the saved ones;
- keep the simple form and only warn.

| Pros | Cons |
| --- | --- |
| <ul><li>Forwarding avoids the UX shift. #24178 now removes its subworkflow 500.</li><li>Diff-only would avoid most forced reruns.</li><li>Warn-only is the smallest change.</li></ul> | <ul><li>Forwarding applies values the user can't see or edit.</li><li>Diff-only compares flat `a\|b` strings to nested typed state, which is fragile on the client and too much machinery on the server.</li><li>Warn-only still runs different settings.</li><li>The issue argues all three are worse. No reviewer reopened them.</li></ul> |

<details><summary>Selenium on the issue's exact scenario</summary>

The issue's test spec is: change a *saved* `num_lines` through **Expanded workflow form**, rerun, and assert the export. The branch instead uses `WORKFLOW_RUNTIME_PARAMETER_SIMPLE`, a runtime input.

The original run lands in the expanded form via `hasDisconnectedInputs`. On rerun, #24176's seeding fills that input, so only the recorded parameters keep the form expanded. A comment in the test documents this coupling.

The saved-value variant would exercise the more common real-world path, a user opening the expanded form deliberately. The normal review called it fiddly, because a collapsed saved step has to be expanded and edited. It doesn't change scope. It is a possible test follow-up if #24176's seeding ever stops clearing runtime inputs, which would make this fixture land on `hasDisconnectedInputs` instead.

</details>

## Follow-ups (not scope changes)

1. Queue the `replacement_dict` bug (¹) through `GX_QUEUING_ISSUE_CREATION.md`. Owner: John or the coordinator.
2. After #24176 merges, make one cleanup commit:
   - move `withRerunValues` to `model.js` and share it with the simple form;
   - fold `requestState`/`useJobCache` reads inside `WorkflowRunFormSimple`;
   - drop `isRerun &&`;
   - merge the `mountRerun` helpers;
   - share a `DisableSimpleFormReason` type.
3. Correct #24176's record: handoff (b) is deferred, not done, and handoff (a) is met by the export and output asserts.
4. Mention the UX shift in the PR description (expanded-form runs rerun expanded, with no toggle).
5. Optional:
   - a `RunsWorkflows` submit/rerun helper for `test_workflow_rerun.py` (polish debrief);
   - a separate issue for `simplified_workflow_run_ui` on rerun.
