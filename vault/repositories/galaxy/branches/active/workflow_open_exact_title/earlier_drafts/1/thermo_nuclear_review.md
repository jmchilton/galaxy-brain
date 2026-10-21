# Thermo-nuclear review — workflow_open_exact_title

Reviewed `65132d40dac..b8f381901d5` (3 commits, ~75 lines). No structural problems found; this branch has already been through Codex, test-challenge and polish passes. Acted on one legibility rewrite of `_workflow_card_named`, folded into 7c. Didn't act on: removing the contains-fallback, moving the canvas-loading wait into the helper, or the pre-existing `undo_redo` assignment bug.

New SHAs on the same base, not pushed:

1. `8080d4b4110` Open the workflow titled NAME in workflow_index_open_with_name
2. `2d4461ed6fc` Open the run form of the workflow titled NAME in workflow_run_with_name
3. `ef801975de9` Test opening and running a workflow whose title prefixes another's

The SHAs in `index.md` and `initial_implementation_debrief.md` are stale (coordinator).

## Changed

- **`_workflow_card_named` rewritten without the `(card, title)` tuple list.** It now takes `cards` and `titles` as parallel lists, does one stale guard around the comprehension, then `cards[titles.index(name)]` for the exact match and `cards[0]` for the single card. Behaviour is the same in 13 lines instead of 16, with no tuple indexing (`titled[0][0]`) or loop-in-try.

## Not changed

- **Contains-fallback, and the "every title contains NAME" gate it needs.** This was the code-judo candidate. Exact-only matching would delete the gate and the single-card branch, since the exact card is correct even on the unfiltered list. Every in-tree caller passes an exact title (random name, uuid, `workflow_create_new`, renamed `new_name`). But the base behaviour was "click the first search hit", which is contains semantics. gxui verbs `workflow-run` and `workflow-edit` on `galaxy_ui_driver` pass user-typed names through these helpers, and gxui will take this version once 7c/7g drop out there. Keeping it preserves behaviour.
- **`canvas_loading` wait stays in the test, not in `workflow_index_open_with_name`.** Moving it changes ~15 callers, and the selector is shared with sibling `workflow_editor_run_cancel`, which would create a merge dependency. The navigation.yml line is byte-identical with that branch (checked).
- **`test_workflow_editor_undo_redo.py:75` `name = self.workflow_index_open_with_name(name)`** assigns `None`. This is pre-existing on base and out of scope.
- **Stale handling inside the wait** (return `None`, rather than letting `retry_call_during_transitions` catch it). Kept, so list churn during the search debounce keeps polling instead of burning the 10 retry attempts.

## Tests

Run one at a time against this worktree's Galaxy and Vite, both stopped afterwards. All passed:

- Playwright, headless: `test_open_and_run_workflow_by_exact_title` (66s) and `test_edit_name` (24s).
- Selenium: `test_open_and_run_workflow_by_exact_title` (48s).
- Pre-commit with the sample config: clean.

<details>
<summary>Full review</summary>

**Structural regressions:** none. Feature logic stays in `navigates_galaxy.py` next to the other `workflow_index_*` helpers, and selectors come from navigation.yml (`workflow_card`, `workflow_card_title`, `edit_button`, `run_button`). Both public helpers collapse into one `_workflow_card_action(name, target)`, which removes the duplicated open → search → click sequence they had on base. That is a net simplification.

**Timeout multiplication:** checked, not an issue. `_wait_on` sits inside `retry_call_during_transitions`, so a timeout classified as a transition would retry 11 × DATABASE_OPERATION. `wait_on` raises `TimeoutAssertionError("Timed out after … waiting on search results with a workflow titled or uniquely containing [NAME].")`. That isn't a Playwright `TimeoutError` and doesn't contain "stale", "not clickable", "element is not enabled" or "click intercepted" (unless NAME does). So it propagates on the first timeout.

**Code judo, exact-only matching:** see "Not changed". It would delete about 5 lines and one concept (the search-settled gate), but changes semantics that gxui callers rely on.

**Spaghetti / branching:** `_workflow_card_named` has three outcomes (not settled → None, exact → card, unique → card), and the docstring states them. No flags or modes were added to existing flows.

**Boundaries / types:** `action: Target` uses the existing navigation type. `_workflow_card_named` is untyped on return, matching neighbours such as `workflow_card_element`. Not worth widening the diff.

**File size:** `navigates_galaxy.py` was already 3388 lines on base, so the diff doesn't cross 1k. Decomposing it is out of scope for a release fix.

**Legibility:** the tuple-list scan in `_workflow_card_named` was the one spot that read worse than it needed to. Fixed (see "Changed").

**Test:** the waits are explained by one-line comments. The exact `==` on `edit_name` and the `id=` URL checks are the assertions that separate NAME from `NAME (copy)`. The shared `assert_wf_name_is` (which uses `in`) was left alone because sibling branches touch the file.

**Known limit (from Codex, unchanged):** a search hit that matches only on a tag or annotation keeps the gate from settling, so the helper times out loudly instead of clicking the wrong card.

</details>
