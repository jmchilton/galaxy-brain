# Scope evaluation — workflow_editor_second_subworkflow

**Recommendation: keep the scope as implemented (scope A). Make no expansion and no contraction.** The bug is in a test helper. Clicking the editor's Workflows activity toggles its panel, so a second insert closed the panel and searched with the first name still in the box. The branch fixes that and adds the two-insert E2E test. It also includes the exact-title card refactor that the new test needs to run reliably. The one candidate that would count as a related bug is the same toggle bug in other activity helpers, and I checked for it. The other editor panel helpers are already guarded (`workflow_editor_add_input`, `open_toolbox`), assume a panel that is open by default (attributes), or are never clicked again. Every main-UI activity click is preceded by `home()`. The generalizations that remain either break the siblings' independent merges (a shared card-by-title helper with `workflow_open_exact_title`) or churn a base yml key (nesting the panel selectors). Both belong on `dev` as optional follow-ups, not in this branch.

Reviewed `65132d40dac..ad783d6d3e9` (`release_26.2`), with `workflow_editor_second_subworkflow` checked out in the `workflow_editor_run_cancel` worktree. There are 3 commits over 3 files, +55/−15. Sources: index, initial implementation, test challenges, polish, codex, thermo and baseline-refactor debriefs, and the siblings' `implementation_debrief.md` and second-pass scope evaluations. The 26.2 target is a given.

The branch is under 100 changed lines, so there is no Possible Decompositions section. The baseline split already separates the refactor (`d86b65c6487`), which doesn't change behaviour, from the 5-line fix (`fb6fc797919`) and the test (`ad783d6d3e9`).

## A. As implemented (recommended)

Panel guard (`workflow_activity_panel.is_absent`) and `search.clear()` in `workflow_editor_search_for_workflow`, plus `test_editor_embed_two_workflows`. It sits on top of a refactor that moves the panel helpers to navigation.yml targets and clicks the insert/copy action inside the card titled exactly NAME, with real waits in place of sleeps.

| Pros | Cons |
|---|---|
| Red → green, and each half of the fix is needed on its own (test challenges) | Test-infra only; no product change, so it's a small release PR |
| Fixes a confirmed wrong-workflow race in both insert helpers (polish, Codex P2s), covering `add_steps` too | Card-by-title lookup duplicates the sibling's `_workflow_card_named` until a `dev` follow-up |
| Merges cleanly next to both siblings (merge-tree checked in each pass) | |
| Existing callers are green at the refactor commit and at HEAD | |

## B. Shared "ensure editor activity panel open" helper

Pull the `is_absent`-then-click guard into one helper. Use it for Workflows, Inputs (`workflow_editor_add_input`) and possibly the editor toolbox (`open_toolbox`).

| Pros | Cons |
|---|---|
| A reusable abstraction for the toggle pattern | Only two simple sites share the exact pattern. `open_toolbox` has different logic (main vs editor activity, displayed check, retry on timeout) |
| | Not a bug fix: every other reachable site is already guarded or never clicked again (see details) |
| | Touches `workflow_editor_add_input`, which is outside this branch's diff |

<details><summary>Activity clicks checked for the same toggle bug</summary>

- **Already guarded:** `workflow_editor_add_input` (`inputs.activity_panel.is_absent`) and `open_toolbox` (`toolbox_panel.is_absent or not is_displayed`).
- **Editor panels open by default, never clicked:** the attributes helpers (`workflow_editor_set_license`, `workflow_editor_license_text`, `workflow_editor_set_annotation`) assume the attributes panel is already shown.
- **Editor "Changes" panel:** `test_workflow_editor_undo_redo.py` clicks `tool_bar.changes` once per test, or after a reload (`workflow_index_open_with_name`). It is never clicked again while open.
- **`workflow_editor_click_options` / `workflow_editor_click_option`:** no callers.
- **Main UI** (histories, visualizations, invocations, galaxyai, pages, workflows, tools): each `navigate_to_*` calls `home()` first, so no panel is open. `admin_open` and `click_activity_workflow` are single clicks at the start of a flow.

</details>

## C. Extra test: mixed or repeated `add_steps` inserts

Add a test that copies steps a second time, or mixes `add_steps` with `add_subworkflow`.

| Pros | Cons |
|---|---|
| Directly covers `add_steps` on the second insert | Same `workflow_editor_search_for_workflow` path as the fix, so it adds no new case |
| | Another slow E2E test; `test_editor_insert_steps` already covers the exact-title card action for copy steps |

## D. Share the card-by-title helper with `workflow_open_exact_title`

Unify `_workflow_editor_panel_card_titled` with the sibling's `_workflow_card_named`.

| Pros | Cons |
|---|---|
| One lookup for both workflow lists | The two branches could no longer merge independently (codex, thermo) |
| | Matching rules differ on purpose: exact-only here, contains-gate plus only-card fallback there, because `workflow_create_new` stores a prefixed title |
| | Natural `dev` follow-up once both land |

## E. Nest the Workflows panel selectors in navigation.yml

Group `workflow_activity` / `_panel` / `_search` / `_list` the way `workflow_editor.inputs` is grouped.

| Pros | Cons |
|---|---|
| Removes the repeated prefix | Moves the base key `workflow_activity`, which `galaxy_ui_driver`, `dev` and both siblings use (thermo) |
| | Cosmetic; better as a `dev` follow-up |

## F. Contract to the 5-line fix plus the test

Drop the refactor commit `d86b65c6487`.

| Pros | Cons |
|---|---|
| Smaller diff | Without the refactor, the new test races. A 1s sleep against the 800ms debounce plus the fetch can click the first card, which is the wrong workflow (polish, confirmed by Codex P2 #1) |
| | Brings back the substring and tag-match failures that Codex confirmed |
| | The refactor already sits in its own commit (baseline) and doesn't change behaviour for existing callers |

## G. Client-side change to the Workflows panel

Make the panel close after an insert, or reset its search.

| Pros | Cons |
|---|---|
| — | Staying open after an insert is intended UX for inserting several workflows; there is no product bug. It would also change behaviour in a release branch for a test-helper problem |

## Optional follow-ups (not scope changes)

- **`dev`:** share one card-by-title helper with `workflow_open_exact_title` (D).
- **`dev`:** nest the Workflows panel selectors (E).
- **`dev`:** remove the dead `workflow_editor_click_option` / `workflow_editor_click_options` helpers.
- **Test code, pre-existing:** `setup_subworkflow` keeps its own `UX_RENDER` sleep after `workflow_editor_add_subworkflow` (polish).
- **`galaxy_ui_driver`:** index.md says "drop 7d once this merges". Polish, Codex and thermo rewrote the helper, so it is no longer a clean drop. Restack instead, which is the same caveat the `workflow_editor_run_cancel` debrief gives.
