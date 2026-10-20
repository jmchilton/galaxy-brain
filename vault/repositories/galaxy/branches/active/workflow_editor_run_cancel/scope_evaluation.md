# Scope evaluation — workflow_editor_run_cancel (second pass)

**Recommendation: keep the scope as implemented (scope B from the first evaluation). Make no further scope change. The modest expansion has already been taken. What remains is refactoring (the form-mode helper), sibling-owned work (the canvas wait), dev-targeted area work (`select_set_value`), or a latent issue no caller hits (hid prefix). None of it is a related bug that a reviewer would expect in this release PR. The open item is the fixture-key commit `bd15a4f667f`, which is a test-data decision for John, not a scope change.**

Reviewed `65132d40dac..workflow_editor_run_cancel` (head `b1b0fd4a380`, 6 commits, +102/−21 across 5 files) against the current notes: re-harden thermo, codex, test challenges, polish, baseline, `subagents/rescope_review.md`, `implementation_rescope_debrief.md`, `alts/original_scope.md`, `earlier_drafts/1/scope_evaluation.md` and the [upstreaming plan](../../../../../projects/playwright/GALAXY_UI_DRIVER_UPSTREAM.md).

## Possible Decompositions

The branch is just over 100 changed lines. All of it is test code, a test fixture or `navigation.yml` selectors. One natural split exists:

1. **Original scope.** 4b `a7337467234`, 7h `f81806b03a3`, 7j `5b8de54dbdc` and test `71091e1b81f` (+70/−2). It is already preserved as `workflow_editor_run_cancel_alt_original_scope` (`e858d2a07d8`) and stands alone, because the cancel test builds its own `{label: {hid}}` dict.
2. **Harness fix.** Fixture key `bd15a4f667f`, then `workflow_run_setup_inputs` `b1b0fd4a380` with the strengthened `multiple_integer_parameter` and `custom_invocation_report` assertions (+32/−19). It lands after 1, or independently: it touches `framework.py` and `workflow_fixtures.py`, plus one line in `workflow_run_specify_inputs` (`pop` → `["hid"]`). That line merges cleanly on top of 4b, though the two hunks are adjacent.

A third option is to send the fixture-key commit on its own first. It is green on the old helper. It is one line, though, so it is hardly worth its own PR.

## Scope items raised by reviews (current round)

| Source | Item | Disposition |
|---|---|---|
| thermo #1 | Cancel test bypasses `workflow_run_setup_inputs` | No change. Bypassing keeps decomposition 1 droppable. The canonical path is pinned red to green elsewhere. |
| thermo #2 | One detail fetch per input to recover `hid` | No change. The real fix lives in shared populators (`ds_entry`), which is out of proportion for a release branch. |
| thermo #3, baseline | Shared form-mode helper | Defer (scope C) |
| thermo #5 | Tighter return and parameter types | Defer with C. No runtime effect. |
| rescope review, implementation rescope debrief | `"{hid}: "` prefix match (`1: ` matches `11: `) | Defer (scope D). Latent. |
| rescope review | Auto-expanded form race in `workflow_run_specify_inputs` | No change. Note below. |
| polish | Canvas wait in `workflow_index_open_with_name` | Defer to `workflow_open_exact_title` (scope E) |
| polish | Multiselect left open by `select_set_value`; raw `.markdown-component`; `sleep_for(UX_TRANSITION)` in `workflow_run_and_submit` | Defer. Pre-existing, on untouched lines; the dev-targeted tool-form area PR owns `select_set_value`. |
| codex | None | — |

## A. As implemented: original scope + scope B (recommended)

The branch adds an E2E test: run from the editor's Run activity, pick a non-default dataset in the simplified form, cancel. It brings the helper fixes the test needs (4b, 7h, 7j). It also fixes `workflow_run_setup_inputs` so existing callers really select their `type: File` inputs, stops `workflow_run_specify_inputs` mutating its argument, and corrects the `image_input` fixture key.

| Pros | Cons |
|---|---|
| It covers the related bug that hid 4b. That bug was the follow-up the first evaluation said to fold in, and it is now pinned red to green on both form paths: the decoy, and the label/name assertions. | The fixture-key correction needs John's OK, because it changes test data. |
| Runtime code is untouched, which suits `release_26.2`. `git merge-tree` is clean against both siblings. | It is no longer a pure cherry-pick from `galaxy_ui_driver`. The restack has to pick up the fixture key and the `framework.py` change. |
| Codex found nothing. Thermo found no structural regressions. 7 affected tests are green under Playwright, and the key ones are green under Selenium. | The plan doc's "Follow-up" bullet is now stale; this branch resolves it. |

## B. Contraction: back to the original scope

Ship `workflow_editor_run_cancel_alt_original_scope` and park the `workflow_run_setup_inputs` fix.

| Pros | Cons |
|---|---|
| It is a pure cherry-pick of 4b, 7h and 7j plus a test, with no test-data decision. | The bug that made 4b go unnoticed stays: 3 callers keep passing on preselection. A reviewer of 4b would ask about it. |
| | It throws away work that is already reviewed and green. It also goes against the guidance to fold in related bugs. |

## C. Expansion: shared form-mode helper + tighter types

Extract the "wait for `run_workflow`, branch on `expanded_form.is_absent`" check that `workflow_run_specify_inputs` and `workflow_run_ensure_expanded` both do. Type `{src, id, hid}` precisely.

| Pros | Cons |
|---|---|
| It removes a two-line duplication and tightens the types. | It is a refactor, not a use case or a bug. With two call sites, an abstraction is a weak case. |
| | Its `navigates_galaxy.py` hunks sit next to the siblings' hunks (about lines 1437 and 1954), so it adds restack churn. It rewrites SHAs and forces E2E reruns for no behavior change. |

## D. Expansion: exact hid selection in `workflow_run_specify_inputs`

Make the selection match `"{hid}: "` exactly, so hid 1 can't pick `11: …`.

| Pros | Cons |
|---|---|
| It fixes a latent bug on a line the branch touches. | No caller hits it. Every caller uses `@managed_history` with at most about 4 items. |
| | The fix belongs in `select_set_value` (an exact-option click). The dev-targeted tool-form area PR already reworks that function (gxui `a68deb35cc6`), so doing it here would conflict. Selenium and Playwright would both need reruns. |

## E. Expansion: editor-canvas wait in `workflow_index_open_with_name`

Move the test's `canvas_body.wait_for_visible()` into the helper.

| Pros | Cons |
|---|---|
| It saves one line of test boilerplate. | `workflow_open_exact_title` (7g) rewrites this helper, so the change belongs there. No other caller needs it today. |

<details>
<summary>Details</summary>

- **Why no further expansion despite the default-to-expand guidance.** The guidance aims to fold in related bugs in touched code and to generalize. The first pass did exactly that: the `label_map` fix, no more mutation, and the fixture key it surfaced. What is left is not a bug in the flow under test (C, E), is latent and owned by another PR (D), or is on untouched lines (the polish items). By the workhorse process, a second scope change parks the branch as BLOCKED. None of these candidates is worth that.
- **Auto-expanded race (rescope review).** `#run-workflow` is rendered in two places: in `WorkflowRunForm.vue`, inside `.workflow-expanded-form`, and in the `WorkflowNavigationTitle.vue` header. If the header's button renders before an auto-selected expanded form, `is_absent` could choose the simplified selector. No current caller hits this: `ensure_expanded` waits on `expanded_form`. If it ever shows up, the fix fits naturally into C's helper (wait for either form). It is not a scope item now.
- **Plan doc.** After merge, the "Follow-up" bullet under step 2 of `GALAXY_UI_DRIVER_UPSTREAM.md` should be marked resolved by this branch. The `galaxy_ui_driver` restack also needs the `image_input` key fix, because gxui still has `image_input_1`.

</details>

## Unresolved questions

- Fixture key `image_input_1` → `image_input` (`bd15a4f667f`): OK to keep?
- Should we update the plan doc's step-2 "Follow-up" bullet now, or after merge?
