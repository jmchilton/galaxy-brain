# Debrief: library download test never runs

## Research
- Verified on origin/dev 0073b5e9224. `download_dataset_from_library` in `test_library_contents.py` has no `test_` prefix, so pytest never collects it. It has been that way since 164c3216b74 (2020-08).
- Two other expectations have drifted since the test was written:
  - The selector is `#download-btn`, but the button is `id="download--btn"`. This dates from 59aeb996bb2 (2020-12), which changed the button and the test in one commit, so the selector never matched.
  - The test expects `selected_dataset_files.zip`, but d4552d31cb0 (2020-12) renamed the archive to `selected_library_files`.
- No API test covers `/api/libraries/datasets/download/*`.
- No GitHub duplicates.

## Reviewer fixes
- History: the first draft blamed 0598a0180bb, which only moved the file. Corrected to 59aeb996bb2. Also noted the test was right when it was added.
- Alternatives: removed a false claim that API coverage already exists.
- Approach details: `@selenium_only("reason")` needs its reason argument.

## Unresolved
- The test was not run after renaming. There may be more drift beyond the two mismatches.
- The Playwright download-handling difference is plausible but not checked.
