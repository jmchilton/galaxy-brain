# Implementation re-scope debrief

Scope evaluation recommended a modest expansion: one shared copy-history-modal component instead of `history_view.copy_modal`. Done.

- Replaced unused `multi_history_panel.copy_history_modal` (bootstrap `.modal-dialog`, xpath `copy_btn`; no Python or test referenced it) with top-level `copy_history_modal` scoped to `dialog[open][data-description="copy history modal"]`. `history_view_import` uses it.
- Scope eval's premise that gxui already uses `history_panel.copy_history_modal` was wrong (came from a mistaken index.md note); gxui uses `history_view.copy_modal`, so restack must rebind `history-import`.
- `client/src/utils/navigation/schema.ts` still declares the old entry; it is stale on `release_26.2` (no `history_view` at all), so left untouched.
- Skipped the optional "list empties after purge" UI assertion; the API `purged` poll is the stronger check.
- Import test green under Playwright and Selenium. Original scope kept as `selenium_history_import_purge_alt_original_scope`.
