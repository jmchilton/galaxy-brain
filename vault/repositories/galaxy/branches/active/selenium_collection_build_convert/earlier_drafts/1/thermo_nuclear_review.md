# Thermo-nuclear review

I acted on one finding. The convert test's inline "wait for new collection" closure is now `NavigatesGalaxy.history_wait_for_new_collection(after_hid)`, copied verbatim from gxui. I folded it into "Test converting a collection's datatype from its edit view" and kept all of that test's strengthened assertions. Head moved from `0ad5bc85a60` to `0492c2d95b1`.

The reason is restack safety more than reuse. On `galaxy_ui_driver`, that helper arrives in the same-named commit, which gets dropped on restack, and gxui `verbs.py` (`collection-convert`) and `test_tool_form.py` call it. Without it on this branch, dropping that commit would break gxui.

The rest of the branch is clean for its size: about 100 lines, test-only, with no ad-hoc branching in shared flows. `navigates_galaxy.py` was already 3428 lines, so the branch crosses no threshold.

## Not acted on

- **`open_collection_edit_view(hid=3)` is a thin pass-through to `history_panel_collection_edit`.** It matches the file's family of small local wrappers (`navigate_to_*_tab`, `check_current_data_value`). Deleting it would churn pre-existing lines next to `selenium_history_datatype_citations`.
- **`history_panel_collection_edit` returns `edit_collection_attributes`, but no caller uses the return.** Return hints are also uneven (only `toggle_remove_extensions` has `-> None`). Both are nits, and I left them alone to stay identical to gxui.
- **Already settled, not relitigated:** the double tab click (the test opens the tab to assert its alert, then the self-contained helper gxui needs clicks it again), the manual multiselect in `collection_edit_change_datatype`, the `list_wizard.*` selector names, and the dbkey helper staying local.
- **Follow-up:** decompose `navigates_galaxy.py`. The collection builder and collection edit helpers would make a natural mixin, but that is out of scope for a release-branch test PR.

## Tests

I ran `test_collection_edit.py` (3 tests) plus `test_build_list_keep_extensions` and `test_build_list_advanced_rename_element`, one backend at a time. Playwright (headless) passed 5/5 and Selenium passed 5/5. Pre-commit (black, ruff, flake8) passes. `git merge-tree` against `selenium_history_datatype_citations` is still clean.

<details>
<summary>Full review</summary>

**Structural / code-judo**
- *Convert test: inline polling closure (acted on).* The test held its own `_wait_on` closure, which filtered `get_history_contents` for a collection with `hid > 3`. This is a general "wait for the output collection of an action" primitive, and it belongs in `NavigatesGalaxy` next to `_wait_on` / `wait_for_history_to_have_hid`. gxui already promoted it there with two more callers. Moved it, unchanged.
- No better reframing of the builder helpers is visible. `collection_builder_toggle_remove_extensions` and `collection_builder_rename_element` are direct and selector-driven, and follow the `history_panel_rename` pattern.

**Spaghetti / branching**: none. There are no new conditionals in shared flows. `history_panel_collection_edit(hid)` removes a hidden assumption: the old `collection_menu_edit_attributes` clicked the panel's first `.edit-btn`.

**Boundaries / types**
- The new selectors live in `navigation.yml`, and `schema.ts` is updated for `edit_collection_attributes`. The `list_wizard` interface gap in `schema.ts` predates the branch.
- The unused component return value of `history_panel_collection_edit` is a nit (not acted on, above).

**Wrappers**: `open_collection_edit_view` is now an identity wrapper with a default hid. It is borderline, and I left it for consistency with the local wrappers and to avoid churn.

**File size**: `navigates_galaxy.py` was 3428 lines before and is about 3460 after. It was already far past 1k, so this is a follow-up, not a blocker.

**Orchestration**: the convert test still polls the API and then waits for the panel state. That is sequential by necessity.

</details>
