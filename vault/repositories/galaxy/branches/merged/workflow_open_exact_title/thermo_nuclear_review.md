# Thermo-nuclear review — workflow_open_exact_title (re-harden after re-scope)

Reviewed `65132d40dac..a4fecbe378b` (7 commits, 6 files, +108/−17), starting fresh. `earlier_drafts/1/thermo_nuclear_review.md` was used as context only. I found no structural regression.

**Acted on:** I removed `_workflow_card_titled` and put its `_wait_on` call back inline in `_workflow_card_action`. The change was folded into "Delete and bookmark the workflow card titled NAME".

**Recorded decisions kept:**
- the explicit `workflow_index_open()` in the bookmark/delete test
- the pagination and tag-match limits
- the canvas wait in the test (item D)

Base is unchanged (`65132d40dac`). Not pushed.

| Commit | SHA |
|---|---|
| Extract `_workflow_card_action` | `8a367e63730` (unchanged) |
| Open the workflow card titled NAME | `55f2a4f725b` (unchanged) |
| Test opening and running by exact title | `c762cce5a0d` (unchanged) |
| Delete and bookmark the card titled NAME (inline folded in) | `f4029b4e418` (was `91230e4fc31`) |
| Drop dead name reassignment in undo/redo test | `cf092c49e24` (was `476272f40e7`) |
| Test bookmarking and deleting by exact title | `01d44d38453` (was `157dfda1727`) |
| Snapshot Playwright find_elements | `dc01d33b2bd` (was `a4fecbe378b`), HEAD |

## Changed

**`_workflow_card_titled` removed.** The re-scope commit pulled the `_wait_on(... _workflow_card_named ...)` call out into its own method, which only `click_action` inside `_workflow_card_action` calls. Delete gets its card from `_workflow_card_action`'s return value, not from this method.

That left three private helpers. Two of them had near-identical names (`_workflow_card_titled` and `_workflow_card_named`) and one was a pure wrapper. Now:
- the wait is back where the original-scope commit had it
- the re-scope commit's open/run hunk shrinks to `return card` / `return retry_call_during_transitions(...)`
- `navigates_galaxy.py` drops 3 lines net

Behaviour is unchanged.

## Not changed

- **Explicit `workflow_index_open()` in `test_workflow_bookmark_and_delete_by_exact_title`.** Kept, as recorded in `test_challenges_debrief.md`. Without it, the red check on the old helpers hangs on the home page. Every test in the file opens the list first anyway.
- **Pagination and tag/owner/annotation matches** (Codex findings). Kept. When the gate can't settle, the helper times out loudly instead of misclicking. That fits a test helper, and no caller reaches either case. Follow-up E.
- **Canvas wait stays in the test** (item D). Moving it into `workflow_index_open_with_name` touches about 15 callers and the line it shares with sibling `workflow_editor_run_cancel`.
- **`card.find_element(*target.element_locator)`, used 3 times.** Left inline, as polish decided. A scoped Target finder in `has_driver` is a reasonable dev-side abstraction (`find_element_by_selector(element=)` takes CSS only), but it would widen a release-branch fix.
- **`sleep_for(UX_RENDER)` in `workflow_run_with_name`.** Kept, with its comment. The callers wait on different run-form elements, and a sibling hunk uses this line as context.
- **Code judo, exact-only matching.** Rejected again (item F). It would delete the settle gate and the single-card branch. But it would change the contains semantics of the base "click first search hit", which gxui verbs rely on.
- **Return annotations on `_workflow_card_named`.** Not added. It matches neighbours such as `workflow_card_element`.
- **File size.** `navigates_galaxy.py` was already about 3.4k lines on base, so the diff doesn't cross 1k. Splitting it is out of scope.

<details>
<summary>Full review</summary>

**Structural:** `_workflow_card_action(name, target)` gives the four by-name helpers (open, run, bookmark, delete) one open → search → settled-card → scoped click flow. Before, each had its own copy of "search and click the first global match". That is a net deletion of a duplicated concept and the right ownership: the logic sits beside the `workflow_index_*` helpers, and selectors come only from navigation.yml.

**Spaghetti:** no flags or modes were added. `_workflow_card_named` has three documented outcomes (not settled → None, exact → card, unique → card). Delete has one extra step, finding its menu item inside the card, and a comment explains why: the GDropdown menu is not teleported, so every card carries a hidden item.

**Retry / timeout layering:** `_wait_on` sits inside `retry_call_during_transitions`. A settle timeout raises `TimeoutAssertionError`, which is not classified as a transition, so it propagates the first time instead of multiplying 11×. Stale elements during the debounce return None from the poll, so they don't use up retry attempts.

**Playwright `find_elements`:** a single `element_handles()` snapshot. It is smaller than `count()` + `nth(i)`, matches Selenium semantics, and removes a 30s stall when the list shrinks. It is a separate commit, so it can be split out.

**Tests:**
- Setup goes through populators, with random names.
- The assertions are exact (`== name`, `id=` URL, `== [workflow_id]`, `== [copy_id]`), and each discriminates on the old code (red runs in `implementation_rescope_debrief.md`).
- The tests contain no sleeps and no raw selectors.

**Case-insensitive gate (Codex fix):** `name.lower() in title.lower()` mirrors the server's `ilike`, and the exact match stays case-sensitive. That is correct: exact means the stored title.

</details>

## Tests

Each test ran one at a time:
- Galaxy on 8081, started from a scratch gravity config
- Vite on 5181 (another worktree held 8080, 5173 and 5174)
- a scratch context config without `login_email`/`login_password`, so each test registered a fresh user

Everything started was killed by PID afterwards, the temp configs were deleted, and the worktree is clean.

| Test | Backend | Result |
|---|---|---|
| `test_workflow_editor.py::test_open_and_run_workflow_by_exact_title` | Playwright | PASS (21s); first E2E run with the Codex case-insensitive gate |
| `test_workflow_management.py::test_workflow_bookmark_and_delete_by_exact_title` | Playwright | PASS (11s) |
| `test_workflow_management.py::test_workflow_delete` | Playwright | PASS (13s) |
| `test_workflow_management.py::test_workflow_bookmark_and_delete_by_exact_title` | Selenium | PASS (25s) |

Other checks:
- pre-commit (sample config) passed on `navigates_galaxy.py`.
- `cd lib && mypy galaxy/selenium/navigates_galaxy.py` reported no errors in that file. The 7 errors it does report are pre-existing, in `galaxy/util`.
- `git merge-tree --write-tree` is clean against `workflow_editor_run_cancel` and `workflow_editor_second_subworkflow`.
