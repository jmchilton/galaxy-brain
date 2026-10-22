# Debrief: history item button assertions stubbed

## Research
- Verified on origin/dev 0073b5e9224. `content_item.info_button` is `.params-btn`, but `DatasetActions.vue` renders `.info-btn`. Nothing uses the selector.
- `TestHistoryDatasetState._assert_buttons` is a bare `return`. The original loop is commented out.
- The stub became a no-op in 399c6e91948 (2022-09, "Remove is_beta_history flag"). The TODO line came in 9c3b03bc7af. The first draft wrongly credited 9c3b03bc7af for the stub.
- Restoring the loop would fail on 4 of 5 buttons:
  - `edit_button` was removed in 9992ec7f65a (2025-05).
  - The display and info tooltips are stale.
  - The download title is now `Download (<size>)`.
- No GitHub duplicates.

## Reviewer fixes
- "Most tests check title buttons" was wrong. Only 2 of 4 tests reach the stub, all on `ok` datasets.
- Corrected the origin commit.
- Corrected the edit and download rows.
- Narrowed the Alternatives claim to the `ok` state.
- Noted that `schema.ts` is already out of sync with `navigation.yml`.

## Unresolved
- Not reproduced by running the test. The stub and selector drift were checked by reading the code.
- Small. A candidate for keeping internal and fixing PR-first.
