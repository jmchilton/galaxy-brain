# Filtered findings: #24685

For John; not posted.

- `CollectionCreatorIndex` shows `Error: Collection name is invalid`, with the prefix, when create fails. Confirmed by running the spec against MSW: `rethrowSimple` throws an `Error`, stored via `error as string` and rendered through `String()`. Surfaced by the review branch, not raised by a reviewer. Filtered: pre-existing code the PR doesn't touch.
- `GLink`'s `<button>` has no `type="button"`, so it would submit any future enclosing form. From `initial_review.md`'s "Not flagged". Filtered: pre-existing in the shared component and no current host sits in a form.

## Trimmed by John

- 2026-11-07 `DatasetDetails` test can shrink to what only it covers. Discovered by gx_test_challenger via Opus 5.5 at medium.
- 2026-11-07 Assertions pin GLink's class and repeat its element. Discovered by gx_test_challenger via Opus 5.5 at medium.
