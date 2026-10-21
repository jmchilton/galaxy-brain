**Acted on three findings (`457a4a36c12`).** (1) Removed the numbered shared-state build names in favor of per-test locals. (2) Split the list-plus-boolean `assert_custom_builds_in_grid` into `assert_custom_build_listed` and `assert_custom_build_not_listed`. (3) `fasta_file` is now the plain `select#fasta-file` with `wait_for_clickable()`, so readiness isn't baked into the component's name. Green 3/3 under Playwright (headless) and Selenium (headed, chromedriver 155). ruff, black, isort and pre-commit are clean. Not pushed.

Not acted on:
- The xpath row prefix repeats in `row`, `row_count` and `row_delete`. `SelectorTemplate.descendant()` only handles CSS, and matching by text needs xpath. Extending the framework would be out of proportion on a 26.2 test branch.
- The FASTA test duplicates the name/key fill from `add_custom_build`. It's 2 lines, and a shared helper would only add a layer.
- Datatypes conf hunk: normal review 1 already validated it, and it copies the production sample entries.
- 1k-line rule: not triggered. `navigation.yml` was already 1909 lines (+20 here), and the test file is about 80 lines.
- Queued product bugs (FASTA build not listed until reload; `NoConverterException` 500): out of scope.

No security findings.

## Details

### Scope
`origin/release_26.2...88f8d7f4faf`, 2 commits: the new `test_build_add_from_fasta`, the `custom_builds` navigation components, the `fasta -> len -> linecount` framework datatypes, and the helper refactor onto components.

### Findings

1. **Numbered shared-state names were incidental complexity (acted).** `build_name1..3` and `build_key1..3` were class attributes set in `setup_shared_state`, yet each was used by exactly one test. The branch extended the pattern rather than questioning it. Only `user_email` needs to be shared. Each test now calls `self._get_random_name()` locally, which deletes 6 annotations and 6 setup lines. `GALAXY_TEST_SELENIUM_RETRIES` defaults to 0, so this wasn't fixing a retry collision, only simplifying. All three tests were converted so the file uses one style.

2. **Boolean-mode list assert (acted).** `assert_custom_builds_in_grid(expected_builds, present=True)` looped over a list and branched on a flag, but every caller passed one name. It is now two direct helpers. The not-listed helper still waits for `table` first, so `wait_for_absent` can't pass vacuously against an unloaded page. The listed helper drops the table wait, since a visible row implies the table is there. Assertion strength is unchanged.

3. **Readiness baked into component identity (acted).** `fasta_file: 'select#fasta-file:enabled'` gave the component a name that hid a state filter, so any future "wait until disabled" check would time out confusingly. Both backends' `wait_for_clickable` check visible and enabled (Selenium `element_to_be_clickable`, Playwright visible plus `is_enabled` polling). The selector is now plain, and the test calls `fasta_file.wait_for_clickable()` with a one-line comment.

4. **Repeated xpath row predicate (not acted).** Three components repeat `//table[contains(@class,"g-table")]//tr[td[1][normalize-space(.)="${name}"]]`. The real fix is xpath support in `SelectorTemplate.descendant()` (`lib/galaxy/navigation/components.py:108` asserts CSS). That is a framework change, which belongs in a separate dev PR if the pattern spreads.

5. **Name/key fill duplication (not acted).** The FASTA path differs from `add_custom_build` after the first two lines (default definition assert, FASTA readiness). Extracting a two-line helper would add indirection without deleting a concept.

6. **Layering and boundaries.** All selectors live in `navigation.yml`, setup goes through the API, and there are no sleeps. No logic leaks into shared framework code.

### Tests
- Playwright headless: 3 passed (47.9s).
- Selenium headed, chromedriver 155: 3 passed (80.9s).
- Pre-existing Pydantic `CustomBuildModel` serializer warning (`count: '0'` string for text builds). It is unrelated.
