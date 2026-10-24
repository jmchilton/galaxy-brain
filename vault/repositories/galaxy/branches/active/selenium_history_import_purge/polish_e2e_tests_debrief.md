# Polish E2E tests debrief

Fresh pass found both E2E tests already polished (navigation.yml selectors, shared helpers, no sleeps, screenshots), so no changes.

- Selectors: no raw CSS in tests. `copy_history_modal` is a shared top-level component scoped to `dialog[open]` (HistoryView mounts several CopyModals). Selectors are inlined because `${_}` substitution raised `KeyError`.
- Shared abstractions: `navigate_to_history_view`, `history_view_import`, `histories_purge_all`.
- Waits: no sleeps; helpers wait on modal absent / purge button hidden.
- Screenshots: `history_view_shared_importable`, `histories_before_bulk_purge`.
- DOM decoration: CopyModal decorated. `copy_button` uses `.g-modal-confirm-buttons button:last-child`, the existing GModal pattern; decorating shared GModal is out of scope on release_26.2.
- Client refactor: not applicable (release branch).
- No code changes, so no rebuild/re-push. Both tests pass under Playwright on HEAD (Selenium verified in earlier passes on same code).
