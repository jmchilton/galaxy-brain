# Thermo-nuclear code quality review

I acted on one finding. The delete test's per-hid `deleted_purged(hid)` and its mix of two `_wait_on`s and a bare `assert` are now one whole-history snapshot. A single `get_history_contents(v=dev, keys=hid,deleted,purged)` call returns `{hid: (deleted, purged)}`, and the test does an exact-dict `_wait_on` at each checkpoint. It is fixed up into "Test deleting, undeleting and purging history items". Head `73488a1f502` (was `c3348b90176`).

This is a strengthening. Both checkpoints now pin every item, so the undelete check also proves that hids 2 and 3 are unchanged and that no stray items exist. Each poll is also one request, down from three requests per hid: `wait_for_history`, a contents list, then details. hid 1's check was a bare assert and is now inside the same wait. That waits on the same final state, so it does not loosen the check.

Not acted on:
- **`navigates_galaxy.py` size (3463 lines, +41).** Pre-existing debt. The branch doesn't cross the 1k threshold, and decomposing the file is out of scope for a test-only 26.2 branch.
- **One-line helpers** (`history_panel_item_delete`, `_undelete`, `_include_deleted`). They earn their place. `galaxy_ui_driver`'s `lib/galaxy/selenium/gxui/verbs.py` consumes them, and `test_rerun_deleted_dataset` uses `_item_delete`.
- **`purge: bool` on `history_panel_delete_selected`.** It picks one of two options in the same dropdown-and-confirm flow. Splitting it into two methods would duplicate the confirm handling. It matches the existing `use_bootstrap_dropdown(..., menu="selected content menu")` helpers (the build-list ones), which is the canonical pattern there.
- **Duplicated off/on blocks in the privacy test.** The assertions differ in shape (`access == []` against `access == manage` with `len == 1`). A loop or parametrize would add indirection without removing any concepts.
- **`_new_history_dataset_permissions` returns an ad-hoc `(api, ui)` tuple.** Minor and private to the test.
- **`user_preferences_new_datasets_private()` navigates as a side effect.** This is deliberate. Each read comes from a fresh Preferences load, which is the persistence check.
- **`edit_dataset_permission_roles`' `manage`/`access` key remap.** It mirrors the API's `permissions` keys, so the UI and API dicts share one shape.
- **Settled earlier, not revisited:** the generic `check-button` selector and the `permissions_tab` XPath (both need client changes), the `history_panel_include_deleted` name, the 26.2 `muli` spelling, the HistoryPanel undelete bug, and the default-on assert.

## Tests run (one at a time)

- `test_history_panel.py::TestHistoryPanel::test_delete_undelete_and_purge_items`: passed under Playwright (41s) and Selenium (39s) before the rebase. The rebase was a clean autosquash, and the test file is unchanged by it.
- I did not re-run `test_new_datasets_private_switch` or `test_rerun_deleted_dataset`. Neither the shared helpers nor those tests changed.
- ruff, black and isort are clean, and the pre-commit hooks passed.

<details><summary>Full review</summary>

## Verdict

The structure is sound for a test-only branch. The helpers follow their neighbours in `NavigatesGalaxy` and use existing components (`confirm_dialog`, `use_bootstrap_dropdown`, `toast`). Every new selector is in `navigation.yml`. The branch adds no spaghetti to shared flows: `test_rerun_deleted_dataset` is the only existing code touched, and that change replaces two inline lines with the new helper. The approval bar is met, with one missed simplification in the delete test.

## 1. Missed simplification: per-hid API polling (acted on)

`deleted_purged(hid)` called `get_history_dataset_details(hid=...)`. Each call runs `wait_for_history`, fetches all contents to resolve the hid, then fetches the details, and the test repeated that for each hid. The checks were split three ways: two `_wait_on`s for hids 3 and 2, a bare `assert` for hid 1, and later a single-hid wait for the undelete. A reader had to track which hids were checked at which point. One contents call with `keys=hid,deleted,purged` gives the whole history state. Comparing it to an exact dict at both checkpoints deletes the per-hid concept and makes the expected state explicit. `@managed_history` makes the exact-dict comparison safe.

## 2. File size

`navigates_galaxy.py` is 3463 lines and grows by 41. That is pre-existing debt and doesn't cross the threshold. Splitting the mixin (history panel, preferences, dataset edit) is a candidate for dev, not for this branch.

## 3. Thin wrappers

The prompt flags identity wrappers, so I checked for consumers. All three one-line history panel helpers are gxui verbs on `galaxy_ui_driver`, and `history_panel_item_delete` has a second test caller. Kept.

## 4. Boundaries and types

- `_new_history_dataset_permissions -> tuple[dict[str, list], dict[str, list[str]]]` is loose but local. A named type would add more than it clarifies.
- The `edit_dataset_permission_roles` remap is justified by matching the API shape.

## 5. Spaghetti / branching

The only conditional the branch adds is the setter's `if current != private`, which is intrinsic to an idempotent toggle. `purge` selects an option string and doesn't branch the flow.

</details>
