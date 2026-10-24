# Thermo-nuclear review

Approved post re-scope; no code changes. Re-scope already did the one structural move available (single top-level `copy_history_modal` component replacing stale `multi_history_panel.copy_history_modal`). No file crosses 1k lines because of this PR, no spaghetti branching, no duplicated helper.

Not acted on:
- `copy_button` uses `.g-modal-confirm-buttons button:last-child` positional selector: same idiom used across `navigation.yml` (storage location, sharing permissions, rename modals); adding a GModal-wide `data-description` on confirm button is a client refactor, out of bounds on a release branch.
- `history_view_import(new_name=None)` optional param: real optionality (keep default name vs rename), not a mode flag.
- `client/src/utils/navigation/schema.ts` still declares old entry: already stale on `release_26.2` (no `history_view` at all); regenerating is unrelated churn.
- `navigate_to_history_view` is a thin URL wrapper: mirrors existing `navigate_to_histories_page` etc. family; keeps URL out of tests.

## Details

Diff: `CopyModal.vue` +2 `data-description` hooks; `navigation.yml` -6/+11 (top-level `copy_history_modal`, `history_view.import_button`, `histories.bulk_purge_button`/`select_all`); `navigates_galaxy.py` +21 (`histories_purge_all`, `navigate_to_history_view`, `history_view_import`); two tests.

- Structure: helpers live in canonical `NavigatesGalaxy` layer, selectors in `navigation.yml`, tests consume components. Correct layering.
- Code judo: considered folding `history_copy_elements` (CopyElements page) into `copy_history_modal`; different component (`HistoryCopyElements` page vs `CopyModal.vue`), so no merge.
- `histories_purge_all` waits on purge button absence then test polls API `purged`; ordering is clear and atomic enough for a test.
- File sizes: `navigates_galaxy.py` already well past 1k pre-branch; +21 lines of focused helpers is not the cause.
- Types: helpers untyped like neighbours; `history_id: str` annotations would be a nit.
