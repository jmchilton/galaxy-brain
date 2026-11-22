# Implementation debrief

STATUS: READY. `gform_input_swap_e2e_tests` is seven commits on `dev` (base `7e7dfea5535`, head `c75f4c0516a`, 17 files, +119/−157), pushed to `jmchilton`. It follows up the merged #24801 with three Selenium tests, a trimmed set of Vitest specs and one typing change, and is meant to change no behavior.

## The series

1. `1dc5d5d5bb2` Share the dataset setup of two history panel Selenium tests — `_show_history_of_datasets(count)`, used by two existing tests.
2. `e2033ae7beb` Baseline tests: history panel index range filter — `test_advanced_filter_index_range`.
3. `37b4eca61d2` Baseline tests: API key show/hide button — `test_api_key` checks the input type and the revealed value; drops a dead hover step and a sleep.
4. `4677122d35b` Baseline tests: credentials group name error — `test_credentials_group_name_error`, with `data-description` hooks and a `credentials.service` navigation component.
5. `56baebfb321` Drop Vitest assertions on GFormInput classes and pass-through attributes — also deletes `APIKeyItem.test.ts`.
6. `40d9d41baa5` Type the fixtures of the credentials and filter menu specs.
7. `c75f4c0516a` Type the filter menu text inputs as holding text — `filters` and the `change` payload are `string | undefined`; plain `v-model` again.

Commits 1 to 4 stand alone as a tests-only PR if John prefers a split.

## Choices

- **Scope kept** ([scope evaluation](scope_evaluation.md)): one PR, because commit 5's deletions rely on the tests in 3 and 4, and commit 2's test backs commit 7.
- **`useFilterText` replaced by prop typing** ([thermo review](thermo_nuclear_review.md)): the review branch shared a string conversion between the two filter inputs; a boolean never reaches them, so the prop type was narrowed instead and the composable never appears in the history. `FilterMenu.vue` still passes `Filtering<any>`, so only its template routing enforces this.
- **Secret masking assertions kept**: Codex and the scope evaluation both flagged that commit 5 removed the only checks that the vault and credentials secrets render as `type="password"`. One assertion each was put back. This cuts against the rule of no prop-reaches-attribute Vitest tests; John may want them out.
- **History rewritten** ([baseline refactor](baseline_refactor.md)): 14 accreted commits became 7 with the tree unchanged, baseline tests first.
- **Codex** ([debrief](codex_review.md)): two findings fixed, three declined as the pass-through assertions the branch removes on purpose (the masking one later partly reversed, above).
- Brain research was skipped; the work existed before the record did.

## Verification

- The three branch E2E tests passed under both the Playwright and Selenium backends after their last code change; at the final head they were rerun under Playwright only, for [screenshots](screenshot_debrief.md).
- `test_delete_undelete_and_purge_items`, `test_hide_and_unhide_items`, `test_copy_api_key` and `test_histories_list.py::test_advanced_search` (existing tests the branch touches or leans on) passed under both backends.
- Vitest: the six remaining specs passed across the steps; the two edited last (`VaultSecret`, `CredentialsGroupForm`) pass at head, 14 tests. The full six were not rerun together at the final head.
- `vue-tsc`, eslint, prettier, ruff, black and isort are clean at head. mypy on the three Selenium files: 253 errors against 250 on the base, the three new ones being return annotations on new test functions, like the rest of those files.
- Not verified: that commits 2 to 4 pass on unmodified `dev` (reasoned, not run); intermediate commits were not type-checked or E2E-tested; the removed sleep in `_create_api_key` was not stress-tested.
- The base is `7e7dfea5535`; `dev` has moved since and the branch was not rebased onto it. No CI has run.

## For the PR

- Commit 5 deletes assertions a contributor merged days earlier in #24801, and trims 7 of the 32 specs on `dev` that assert `g-form-input`; the description should say why these seven.

```
created .../differential-review/snapshots/20261122T201524Z-hardening-c75f4c0516a0.json
  hardening @ c75f4c0516a0 vs origin/dev (merge-base 7e7dfea55355)
  since 20261121T212839Z-implementation-870e50076b0a:
    commits: 0 same, 0 rebased, 3 changed, 4 new, 3 dropped
    hunks:   14 carried, 9 changed, 15 new, 7 dropped
```
