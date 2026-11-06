Approved with no bugs; acted on nothing.

Not acted on:
- select_all / zip wizard shared selector: separate cleanup, not this PR.
- get_history_titles(3) truthy arg and purge hitting current history: existing helper semantics / fresh user, harmless.

# Normal review: selenium_history_import_purge

**Verdict: approve. No real bugs.** Small, well-scoped test PR; selectors and helpers reuse existing conventions (`confirm_dialog.ok_button`, `.g-modal-confirm-buttons button:last-child`, `dialog[open]` scoping). Assertions check server state (API `purged`, current history name/contents), so neither test passes without the behavior. Static review only; E2E not run.

## Findings

Bugs: none.

Nits (optional):
1. `histories.select_all` (`#history-list label[for="list-header-select-all"]`) targets the shared `ListHeader.vue` checkbox; `rocrate_zip`-style wizard already has `select_all_checkbox: '.list-header-select-all'`. Fine as is (scoped to history list); a shared ListHeader component could be a later dedupe, not worth it here.
2. `get_history_titles(3)` - argument is only a truthy flag; `3` (2 created + default) reads like a count that's checked. Harmless.
3. `histories_purge_all` purges the user's current history too; fine since test uses a fresh `SeleniumTestCase` user, but helper docstring could note it acts on every listed history (it does say so).
4. `history_view_import` final wait `copy_modal._.wait_for_absent_or_hidden()` is the right sync point: `CopyModal.copy()` closes only after `copyHistory` resolves, so the subsequent `current_history()` read isn't racy.

## Details

- CopyModal `data-description` additions are minimal; `dialog[open]` scoping correctly disambiguates the several CopyModals HistoryView can mount.
- `import_button` reuses existing `data-description="import history button"` in `HistoryView.vue`; `bulk_purge_button` reuses existing `id` in `HistoryList.vue`. No new client hooks beyond CopyModal.
- `navigate_to_history_view` is a new helper; no existing equivalent found in `navigates_galaxy.py` (only `histories/view_multiple` assertions in tests). Good reusable addition.
- Parity: no `execute_script`/jQuery clicks; label click and `wait_for_and_click` work under both Selenium and Playwright. `aggressive_clear` + `send_keys` is the standard pattern.
- Reliability: purge waits with `DATABASE_OPERATION` on API state; import test checks new id != source, name, and contents `["1.txt"]` (exact list, strict).
- Fresh-user `TestHistoriesPurge` class avoids clobbering `SharedStateSeleniumTestCase` histories - correct choice.
- Imports at module top. Docstrings one line. No security concerns.
