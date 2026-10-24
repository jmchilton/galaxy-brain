# Re-scope review: selenium_history_import_purge

**Verdict: approve.** Re-scope is small (navigation.yml + 1 helper, 8+/14-) and clean. No bugs found.

## Findings

Bugs: none.

Nits (optional):
- `copy_button` relies on positional `.g-modal-confirm-buttons button:last-child`; a `data-description` on CopyModal's confirm button would be sturdier, but that's a client change beyond this scope. Carried over unchanged from original scope.
- New top-level `copy_history_modal` sits beside `history_copy_elements` (dataset-copy page) - names are close; acceptable, placement next to related copy components is reasonable.

## Details

- Removed `multi_history_panel.copy_history_modal`: grep over `lib/`, `test/`, `client/src` (py/ts/js/vue) finds no remaining users. Only `client/src/utils/navigation/schema.ts` (known stale) still declares it; no runtime impact.
- Removed `history_view.copy_modal`: only consumer was `history_view_import` in `lib/galaxy/selenium/navigates_galaxy.py`, now pointed at `self.components.copy_history_modal`. No other references.
- Selectors match `client/src/components/History/Modals/CopyModal.vue` (`data-description="copy history modal"`, `"copy history name input"`). Scoping to `dialog[open]` keeps `_.wait_for_absent_or_hidden()` correct after close.
- Top-level placement fits: the modal is reused from several entry points (history view import, multi-history panel), so it doesn't belong under one page component. Snake_case naming consistent with siblings.
- Static review only; no E2E run.
