# Thermo-nuclear review (re-harden)

Fresh thermo-nuclear pass on `git diff origin/release_26.2...HEAD` at `50dc4ccb773` (4 commits, about 115 lines). I scaled it to a 26.2 E2E coverage PR and read the earlier pass ([earlier_drafts/1](earlier_drafts/1/thermo_nuclear_review.md)) first. It found no structural regressions, no blockers and no edits worth making. Head is unchanged at `50dc4ccb773`.

The one abstraction new since the last pass is `operation_modal` with `history_panel_change_selected(operation, value)`. It holds up. Its naming contract is that the modal hook is `"<menu item data-description> modal"`. Both halves of that pairing are in `SelectionOperations.vue`: the menu items `change database build`/`change data type` sit at lines 38/43 and their modal hooks at 72/91. The contract is local and the yml comment documents it, so it isn't hidden magic.

Not acted on:
- **Two polling waiters (`history_panel_wait_for_hid_datatype`/`_dbkey`) mirror two one-shot asserts** (`assert_item_extension`, `assert_item_dbkey_displayed_as` in `framework.py`). This is the earlier pass's two-helpers-one-concept split, now doubled. The cleaner end state is for the asserts to delegate to the waiters. That changes `test_upload_activity.py` and other existing callers, so it's a follow-up.
- **Merging the two waiters into one `field`-parameterized helper.** Rejected: it would be a thin generic wrapper over a string field name. The explicit pair matches the `assert_item_*` style.
- **Merging the datatype and dbkey tests into one parameterized body.** Rejected: they already share setup and the interaction helper. What differs (the Celery note, the start-value check, the API field) reads more clearly in two explicit tests.
- **Passing `modal.item_selector` to `select_set_value` instead of `modal`.** It would delete nothing. The explicit `wait_for_visible` would stay because `wait_for_selector` only checks presence. It would also cost four E2E reruns.
- **`history_panel_multi_operation_action_click` is dead.** It has no callers, and its `action_button` selector (`.history-contents-list-action-menu-btn`) no longer exists in the client. This predates the branch and the new helper doesn't build on it; removing it is a follow-up for `dev`.
- **`.g-modal-confirm-buttons button:last-child` is repeated.** Unchanged since the last pass; still a follow-up.
- **`click_history_option_tool_references` waits for its page** and `click_history_option_sharing` doesn't. That's minor and harmless.
- **File size.** `navigates_galaxy.py` (3378) and `navigation.yml` (1906) were already past 1k lines. The branch adds about 27 and 17 lines; neither crosses the threshold.

## Verification

- `cd lib && mypy galaxy/selenium/navigates_galaxy.py`: no errors in that file. The 7 errors reported are in other modules and were already there.
- No source edits, so no E2E reruns. At this head the [codex pass](codex_review.md) ran both selection tests green under Playwright and Selenium. The [test challenges pass](test_challenges_debrief.md) covered `test_export_tool_references` and `test_change_datatype_simple_list`, whose source hasn't changed since.

<details>
<summary>Full review</summary>

**Structural / code-judo.** Nothing structural. Since the re-scope, the datatype modal's `change_datatype_modal` and `history_panel_change_datatype_of_selected` have been replaced by a shared `operation_modal` component and `history_panel_change_selected`. That was the code-judo move, and it's done: two operations share one helper and one component, with no branching. The helper is linear:
- `use_bootstrap_dropdown` opens the Selection menu.
- It waits for the `SingleItemSelector` to load.
- It calls the canonical `select_set_value`.
- It clicks OK and waits for the modal to close.

No conditionals were added to existing flows. The only change to existing code is in `test_collection_edit.py`: 3 lines go, in favor of the shared waiter.

**Abstraction contract.** `operation_modal._` takes `${operation}`, and the hook is `"<operation> modal"`. The pairing holds because the menu items and the modals live in the same SFC (`SelectionOperations.vue`). If a third Selection modal appears (for example the tags modals, which use `StatelessTags` rather than `SingleItemSelector`), it can't reuse `item_selector`. The component name and comment say "modals that apply one picked value", which scopes it correctly.

**Duplication (follow-up).**
- `history_panel_wait_for_hid_datatype` and `assert_item_extension` both read `item.datatype`.
- `history_panel_wait_for_hid_dbkey` and `assert_item_dbkey_displayed_as` both read `item.dbkey`. The assert checks containment; the waiter checks equality.
- The waiters live in `NavigatesGalaxy`, the asserts in `UsesHistoryItemAssertions`.
- One concept per field is the better model. Having the asserts delegate to the waiters (or the waiters replace them) would touch tests outside this PR. Defer it to `dev`.

**Dead code nearby (pre-existing).** `history_panel_multi_operation_action_click` and the `multi_operations.action_button`/`action_menu` selectors are dead: no caller, and no client element. They sit right below the new helper. The new helper correctly uses the live `selected content menu` dropdown rather than reviving them.

**Types / boundaries.** The new helpers type their parameters (`hid: int`, `operation: str`, `value: str`), matching `history_panel_wait_for_and_select`. Return annotations are missing, as on the neighbouring helpers. There are no casts and no new optionals.

**Selectors.** `item_selector` is deliberately not named `selector`, because `select_set_value` reads `.selector`. `citations._.reference` has to stay a child of `_`. Both were settled in earlier passes. The `ok` selector is the 7th copy of the GModal last-button pattern (see follow-up).

**Tests.**
- The tests use components and helpers only, plus `@managed_history` (codex pass).
- They have negative checks on unselected hid 3 and back up the UI with the API.
- The citations expectations come from the API and config.
- The shared `_select_two_of_three_datasets` setup creates its datasets sequentially. They have to be, because the tests rely on hid order.

</details>
