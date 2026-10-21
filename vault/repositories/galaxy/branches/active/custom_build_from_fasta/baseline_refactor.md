The move of the existing custom-build test helpers onto `custom_builds` navigation.yml components now sits in one refactor commit on `release_26.2`, below the FASTA test commit.

## Details

### New history (local, not pushed)
1. `f4efcfbec35` "Use custom_builds components in custom build test helpers" (refactor, existing tests only):
   - `navigation.yml` `custom_builds` gains `name`, `key`, `definition`, `save`, `len_text`, `table`, `row` and `row_delete`.
   - `add_custom_build` and `delete_custom_build` use those components.
   - `get_custom_builds` is gone, along with its `UX_RENDER` sleep, `@retry_assertion_during_transitions` and the `By` import.
   - Each test generates its own build names; the numbered shared-state names are gone.
   - `assert_custom_build_listed` and `assert_custom_build_not_listed` replace the old combined assert. The not-listed check waits for the table first.
2. `364768249c4` "Test adding a custom build from a history FASTA dataset" (feature):
   - `test_build_add_from_fasta`.
   - The `fasta_file`, `success_alert` and `row_count` components.
   - The `sample_datatypes_conf.xml` `fasta -> len -> linecount` hunk.
   - Its diff only adds lines.

Final tree is identical to the old HEAD `457a4a36c12`: `git diff 457a4a36c12 364768249c4` is empty. The old local ref `custom_build_from_fasta_pre_baseline_refactor` keeps the previous history for comparison.

### Old → new hashes
The earlier debriefs cite these old hashes, which are now orphaned:
- `51bc57ccf1d`, `88f8d7f4faf` and `457a4a36c12` were folded into the two commits above.
- The helper refactor parts of all three are now in `f4efcfbec35`.
- The FASTA test, its components and the datatypes are now in `364768249c4`.

### Why this split
The original commits mixed two things: the new FASTA test, and a cleanup of the existing `test_build_add` and `test_build_delete` helpers (made in response to reviews). That cleanup doesn't depend on the feature, so it applies cleanly to the base. The refactor commit can now be reviewed, or split into its own PR, separately. One refactor commit is enough. Splitting the helper changes further would add no value on an 80-line test file.

### Tests
- `f4efcfbec35` (2 tests): Playwright headless 2/2, Selenium headed (chromedriver 155) 2/2.
- `364768249c4` (final HEAD, 3 tests): Playwright headless 3/3, Selenium headed 3/3.
- Pre-commit hooks passed on both commits.
- The only warning is the known, unrelated Pydantic `CustomBuildModel` serializer warning.
