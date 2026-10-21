# Scope evaluation (second pass, after re-scope) — workflow_open_exact_title

**Recommendation: keep the current scope (scope B as implemented). No change. All four by-name actions on the workflow list (open, run, bookmark, delete) now share one title-matched card lookup, with a red-to-green E2E test for each pair. The dead `undo_redo:75` assignment is gone. The 3-line Playwright `find_elements` snapshot fix stays in the branch: it is an isolated prefix commit that the title gate polls through, and splitting it out would add a PR dependency without a clear payoff. The same race in Playwright `find_elements_by_selector` (and in `assert_disabled`) is a real gap, but nothing here calls either, so it goes under optional follow-ups and is not a scope change. Everything else stays deferred or rejected, as in the first evaluation (C, D, E, F, G).**

Reviewed `65132d40dac..fc5802715a1` on `workflow_open_exact_title` (verified checked out in the `workflow_editor_run_cancel` worktree). The branch has 7 commits across 6 files, +105/−17. Sources:
- `earlier_drafts/1/scope_evaluation.md`
- `alts/original_scope.md`
- `implementation_rescope_debrief.md`
- `subagents/rescope_review.md`
- this pass's test-challenge, polish, Codex, thermo and baseline-refactor debriefs
- sibling diffs `workflow_editor_run_cancel` and `workflow_editor_second_subworkflow`

The 26.2 target is a given.

## Possible Decompositions

The branch has just over 100 non-generated lines (`navigation.yml` counts as hand-written). Current commit order, after baseline_refactor:

| # | SHA | Commit |
|---|---|---|
| 1 | `8a367e63730` | Extract `_workflow_card_action` from the open/run-by-name helpers |
| 2 | `f74b6388807` | Drop dead workflow name reassignment in undo/redo test |
| 3 | `28152858a04` | Snapshot Playwright `find_elements` instead of count then nth |
| 4 | `42c233bfb95` | Open the workflow card titled NAME in open/run-by-name helpers |
| 5 | `eaf5af509d3` | Test opening and running a workflow whose title prefixes another's |
| 6 | `6bf5076a289` | Delete and bookmark the workflow card titled NAME |
| 7 | `fc5802715a1` | Test bookmarking and deleting a workflow whose title prefixes another's |

baseline_refactor showed that the prefix 1–3 applies to the base by itself and passes on its own. This is not a recommendation to split. The possible cuts are:

- **Option 1: one PR (as is).**
- **Option 2: driver fix first.**
  - (a) Commit 3 alone: `has_playwright_driver.py`, 3 lines. It could also take the `find_elements_by_selector` / `assert_disabled` siblings (follow-up H).
  - (b) Commits 1, 2, 4–7: the workflow helpers and both tests.
  - (b) does not need (a) to be correct. Without it, Playwright can stall for about 30s and then succeed on retry. Land (a) first, or in parallel.
- **Option 3: three PRs.**
  - (a) The driver fix (commit 3).
  - (b) Open/run by exact title (1, 2, 4, 5). This is essentially `_alt_original_scope`, plus the undo/redo line.
  - (c) Delete/bookmark by exact title (6, 7). It depends on (b), because `_workflow_card_action` returns the card in (b).
  - The order is (a) ∥ (b), then (c).
- The undo/redo dead line (2) can ride with any piece that touches `workflow_index_open_with_name`.

## Scope items raised by reviews (this pass)

| Source | Item | Disposition |
|---|---|---|
| Coordinator, rescope review, thermo | Split the Playwright `find_elements` fix into its own PR | Considered (scope B−). Not recommended. It is listed under decompositions. |
| This evaluation | The same shrink race in `find_elements_by_selector` (`has_playwright_driver.py:511`) and in `assert_disabled` (`:396`) | Considered (scope B+). Optional follow-up, non-blocking. |
| Codex | Pagination: the exact title can sit on page 2 when 24 or more newer matches exist | The helper times out loudly instead of misclicking. No caller reaches this. Goes under follow-up E. |
| Codex | A match only on tag, owner or annotation blocks the gate | Known limit. It fails safe. Goes under follow-up E. |
| polish, thermo | `card.find_element(*target.element_locator)` appears 3 times; a Target-aware scoped finder would help | Dev-side follow-up (I). |
| rescope review | Explicit `workflow_index_open()` in the new management test | Not a scope item. The red check needs it. |
| First evaluation | C, D, E, F, G | Unchanged. See below. |

## B. As implemented (recommended)

`_workflow_card_action(name, target)` opens the list, searches, waits until every listed title contains NAME (case-insensitive), picks the card titled exactly NAME (else the only card), clicks `target` inside it, and returns the card. Open, run, bookmark and delete all route through it. Delete takes its menu item from the returned card. `test_open_and_run_workflow_by_exact_title` and `test_workflow_bookmark_and_delete_by_exact_title` each pit NAME against a newer `NAME (copy)`. A 3-line driver fix makes Playwright `find_elements` take one snapshot.

| Pros | Cons |
|---|---|
| The first evaluation's ask is finished: there is no copy of "search, click first global hit" left on the workflow list, and one matcher sits beside the `workflow_index_*` helpers. | It is about twice the original diff and mixes a driver-adapter change into a workflow-helper fix. |
| Each half is red on the old code at its own assertion: the copy is bookmarked, the copy is deleted, and the copy is opened or run. Both backends pass. | Both tests rely on the shared fixture `WORKFLOW_SIMPLE_CAT_TWICE` uploaded twice. This is cheap, but they are still two more E2E tests. |
| It found and fixed a real wrong-workflow delete: every card renders its own hidden menu, so the old global `delete_button` hit the first card. | The gate's known limits remain: pagination, and matches on tag or owner. They fail loudly, so they are acceptable for a test helper. |
| `git merge-tree` is clean against both siblings. Neither sibling touches `has_playwright_driver.py` or `test_workflow_management.py`. | |

## B−. Contraction: split the Playwright `find_elements` fix out

Drop commit `28152858a04` from this branch and send it as its own PR, which could also carry H.

| Pros | Cons |
|---|---|
| It is a general adapter change that affects every Playwright `find_elements` caller. Reviewed alone, it gets the right reviewers and a clear title. | The branch's title gate polls `.all()` → `find_elements` during the search re-render, which is the exact shrink window. Without the fix, Playwright runs can stall about 30s per by-name call and then succeed. That costs time, not correctness. |
| It has no red test of its own. Its contract is covered by the existing `test_has_driver.py` (selenium, playwright, proxy). | It is 3 lines, already an isolated prefix commit, and touches no file a sibling touches. Splitting it adds a PR and a merge-order note for little gain. |
| The link to the ~30s gap is only suggestive: a fresh-user run without the fix was also fast. | Galaxy reviewers accept small adjacent test-infra fixes that a test PR depends on. |

## B+. Modest expansion: also snapshot `find_elements_by_selector` (and `assert_disabled`)

`find_elements_by_selector` (`has_playwright_driver.py:511`) does `locator.all()` and then calls `.element_handle()` on each nth locator. `.element_handle()` waits, so this is the same shrink race, about 80 lines from the fixed method. `assert_disabled` (`:396`) has the same race, because `is_enabled()` on a vanished nth locator waits. `assert_absent_or_hidden` (`:368`, `:375`) is fine, because `is_visible()` does not wait. The fix is the same `element_handles()` snapshot.

| Pros | Cons |
|---|---|
| It is the same bug in the file the branch already touches. A reviewer who sees one method fixed will ask about the other. | No caller on this branch uses either method. The callers are the window manager, the viz menu, the zip selector and `smart_components.assert_disabled`, none of them related to workflow lists. |
| It is about 2 lines each. | It widens the incidental driver part rather than the workflow fix. It belongs wherever the driver commit lands, and recommending it now would park the branch for a user decision over a few lines. |

<details>
<summary>Details</summary>

- As of the last fetch (`origin/dev` `2cca8565861`), dev still has the old `count()`/`nth(i)` `find_elements` and the same `find_elements_by_selector`. So none of this is fixed upstream.
- If John takes option 2 or 3, the driver PR is the natural place for H. If the branch goes up as one PR, H can be folded into `28152858a04` at PR time, with no change to the workflow scope.

</details>

## Carried forward from the first evaluation

These are unchanged. The first evaluation's tables still apply.

- **C. `workflow_create_new` returns the stored title** (`Unnamed Workflow<name>`). Optional dev cleanup. It doesn't simplify the matcher.
- **D. Editor-loaded wait inside `workflow_index_open_with_name`.** A follow-up owned by this branch, ideally on dev after `workflow_editor_run_cancel`'s dirty-on-load fix. If that sibling lands first, reword the test comment at restack time.
- **E. Other search-then-click-first helpers** (libraries, grids, the editor Workflows panel), plus the gate's pagination and tag/owner limits. These are dev-side. The editor panel belongs to `workflow_editor_second_subworkflow`.
- **F. Exact-only matching.** Rejected. It breaks `test_edit_name`, the `workflow_create_new` callers and the gxui semantics.
- **G. 7i (colon-free search term).** John decided it: it goes up with gxui.

## Optional follow-ups (not scope recommendations)

- **H.** Snapshot `find_elements_by_selector` and `assert_disabled` in `has_playwright_driver.py` (B+). Best done with the driver commit wherever it lands.
- **I.** A Target-aware scoped finder in `has_driver`. Playwright's `find_element_by_selector(element=...)` raises `NotImplementedError`, which is why `card.find_element(*target.element_locator)` is repeated 3 times. Dev-side.
- **D**, **C** and **E**, as above.
- Confirm that the ~30s per-call gap is gone, with a run whose list shrinks under search (the shared login user). This is evidence for the driver commit, not a scope item.

## Unresolved questions

- One PR, or split the driver fix out (option 2)?
- H: fold it into the driver commit at PR time, or leave it for later?
- D: still a dev follow-up after `workflow_editor_run_cancel` lands?
