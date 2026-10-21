# Baseline refactor (re-harden)

I split the re-scope's client change out of the Auto-detect test commit into its own base commit, `433684ad9e2`, "Give the Attributes tab's Auto-detect button an id". It now sits after the two existing refactors and before the test commits. The final tree is byte-identical (`f889a0ccd0e`). Head moved from `8f0ad8b2b6e` to `0f23fc4cf5a`. Not pushed.

## History

| # | Before | After | Commit |
|---|--------|-------|--------|
| 1 | `3f1900de910` | `3f1900de910` | Share the Add Tags typing loop as `tags_add_from_button` (unchanged) |
| 2 | `10f649d0e87` | `10f649d0e87` | Share the Edit Dataset Attributes success-alert check (unchanged) |
| 3 | — | `433684ad9e2` | Give the Attributes tab's Auto-detect button an id (new; `DatasetAttributes.vue` +1) |
| 4 | `fb0283ee475` | `ade49b3e065` | Tagging test (content unchanged, rebased) |
| 5 | `8f0ad8b2b6e` | `0f23fc4cf5a` | Auto-detect test. It now has only `navigation.yml` and `test_dataset.py`, and its message no longer mentions the id. |

## Why split the id

- It's the PR's only client change, so a reviewer of a test-only PR on 26.2 should see it in isolation. On its own it's a behavior-neutral markup hook that applies to `release_26.2`.
- It isolates exactly what the parent changes relative to `_alt_original_scope`. The alt is "drop commit 3 and use the sibling selector in commit 5".
- `auto_detect_metadata_button` stays in the test commit. That's the same rule as round 1: selector infrastructure with no caller on base goes with its test.

## Verification

- `git rev-parse HEAD^{tree}` matches before and after. `git diff 8f0ad8b2b6e HEAD` is empty.
- At each new commit (`433684ad9e2`, `ade49b3e065`, `0f23fc4cf5a`), `navigates_galaxy.py`, `test_dataset.py` and `test_history_panel.py` byte-compile. The id is in the markup from commit 3 on. The `navigation.yml` selector appears only in commit 5, so no selector points at markup that doesn't exist yet.
- The pre-commit hooks (eslint, prettier) passed on commit 3. `DatasetAttributes.test.ts` passes 4/4 under the pinned node. It has no snapshots, and its file is identical from commit 3 to head.
- I didn't rerun the E2E tests. The final tree is unchanged, and it passed both backends after the re-scope (`implementation_rescope_debrief.md`, `polish_e2e_tests_debrief.md`).

## Not acted on (same as round 1; no new reason)

- Moving `history_panel_item_add_tags`, the `content_item` tag selectors, `metadata_input` or `auto_detect_metadata_button` to the base. None of them has a caller on base.
- Pointing `test_workflow_editor.py::test_pick_value_add_tags_pja` / `test_histories_list.py::add_tag` at `tags_add_from_button`, and merging `tagging_add` with it. These touch unrelated tests, so they're `dev` follow-ups.
