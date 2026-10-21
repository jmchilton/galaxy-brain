Moved the remaining `test_custom_builds.py` helpers onto `custom_builds` navigation.yml components and dropped their `UX_RENDER` sleep (`88f8d7f4faf`). The new FASTA test was already clean.

## Details

### Commit
`88f8d7f4faf` "Use custom_builds components in custom build test helpers" is a separate refactor commit on top of `51bc57ccf1d`. It is not pushed. 2 files, +17/−35.

### Changes
- `navigation.yml` `custom_builds` gains four targets:
  - `len_text` (`textarea#len-file-text-area`).
  - `table` (`table.g-table`).
  - `row(name)` (xpath). It uses the same row predicate as the existing `row_count`.
  - `row_delete(name)`. It is the row's `button[@data-title="Delete build"]`, the same attribute the old helper used.
- `add_custom_build`: the raw textarea selector became `len_text.wait_for_and_send_keys`.
- `delete_custom_build`: the `By.TAG_NAME` table walk became `row_delete(name=...).wait_for_and_click()`.
- `get_custom_builds` was removed, along with its `sleep_for(UX_RENDER)`. `assert_custom_builds_in_grid` now waits for `table` to be visible, then for each `row` to be visible (present) or absent (not present). It no longer needs the `@retry_assertion_during_transitions` sleep/retry loop.
- Unused imports `By` and `retry_assertion_during_transitions` were removed.
- The test bodies and the call signatures did not change.

### Assertion strength
- The negative check can't pass vacuously. It waits for the table first, and `test_build_delete` confirms the row is present right before the delete.
- Sanity red: with the delete click swapped for a visibility wait, `test_build_delete` failed with `Timeout waiting on XPATH ... to become absent`. That also shows `row_delete` resolves. The file was restored after the check.

### Not changed
- `test_build_add_from_fasta`: it already used components and explicit waits. Its comment explains the `wait_for_history()` and re-navigate workaround.
- Screenshots: `custom_builds_from_fasta` already covers the only test file for this component.
- The xpath prefix repeats across `row`, `row_count` and `row_delete`. navigation.yml can't compose selectors.
- Out of scope: the queued product bugs (FASTA build not listed until reload; swallowed `NoConverterException` 500).

### Tests
- Playwright (headless): 3/3 passed.
- Selenium (headed, chromedriver 155): 3/3 passed.
- uvx ruff, isort and black are clean. The pre-commit hooks passed.
