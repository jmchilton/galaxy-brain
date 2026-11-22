Run via Claude Fable 5.2 at medium effort.

The 14 accreted commits were rewritten into 7: one refactoring of the base (the `_show_history_of_datasets` Selenium helper), three "Baseline tests" commits, two Vitest cleanup commits and the filter prop typing change. The tree is byte-identical to the previous tip `4480a300200`.

# Baseline refactor

The branch has no core fix or feature; it is a no-behavior-change follow-up to #24801. So the step was mostly about folding fix-ups into the commits they belong to and ordering the series so it can be split into PRs. The merge-base is unchanged (`7e7dfea5535`); nothing was rebased onto a newer `dev`. The old history is still on the `jmchilton` remote until the force-push. Nothing was pushed.

## The series

| # | Commit | Folded in from |
| --- | --- | --- |
| 1 | `1dc5d5d5bb2` Share the dataset setup of two history panel Selenium tests | The helper and the two pre-existing tests' use of it, from `f4b60719013` |
| 2 | `e2033ae7beb` Baseline tests: history panel index range filter in Selenium | `c724b8da9f8`, `44d5df632ff` (screenshots, `wait_for_and_send_enter`), and the new test's use of the helper from `f4b60719013` |
| 3 | `37b4eca61d2` Baseline tests: API key show/hide button in Selenium | The Selenium, `APIKeyItem.vue` and `navigation.yml` parts of `1694f074a5c`; `1d912d7b45e` (hover step); `808ef51ba96` (waits, dropped sleep); `a7d1a8cba3c` (value assertion, masked screenshot) |
| 4 | `4677122d35b` Baseline tests: credentials group name error in Selenium | `870e50076b0` without its Vitest edit; `7952ad4dec8` (`data-description` hooks, `credentials.service` component, screenshots) |
| 5 | `6a0a9566e11` Drop Vitest assertions on GFormInput classes and pass-through attributes | `f1ad9482d3c`; the `APIKeyItem.test.ts` deletion from `1694f074a5c`; the `d-block` assertion removal from `870e50076b0`; the duplicate-test removal from `d42dbaa74e5` |
| 6 | `ab53fd2db20` Type the fixtures of the credentials and filter menu specs | `695b2def95c`; the `VALIDATION_DEFINITION` typing from `d42dbaa74e5` |
| 7 | `7cd72c83348` Type the filter menu text inputs as holding text | The net of `0b2a336b35e` and `4480a300200` |

## How the work was refactored

- **Refactoring of the base (commit 1).** `_show_history_of_datasets(count)` replaces the same setup block in `test_delete_undelete_and_purge_items` and `test_hide_and_unhide_items`. It was extracted late, in a commit that also moved the new range filter test onto it. It now comes first and touches only pre-existing tests, so the new test is written against it from the start.
- **Baseline tests (commits 2 to 4).** Each E2E test appears once, in its final form, with the `data-description` hooks and `navigation.yml` selectors it needs in the same commit. The intermediate forms are gone: class and id-suffix selectors for the credentials dialog, the racy `type` reads and the screenshot of a revealed key in the API key test.
- **Vitest cleanup (commits 5 and 6).** All assertion and test removals are in commit 5, all fixture typing in commit 6. The Vitest removals that the old history made inside the Selenium commits (`APIKeyItem.test.ts`, the `d-block` assertion) moved here, so the baseline commits only add coverage.
- **Filter prop typing (commit 7).** `useFilterText` and `filterMenuText.ts` never appear. The commit goes straight from `dev`'s per-component computed wrappers to the narrowed `filters` prop and plain `v-model`.

## Checks

- `git diff 4480a300200 HEAD` is empty.
- `ruff check` passed on the changed Selenium file at each of commits 1 to 4, and `black --check` on commit 1.
- `navigation.yml` was split by hunk: history panel selectors in commit 2, preferences in 3, credentials and `tool_form.credentials_manage` in 4. No commit uses a selector, helper or hook a later commit adds.
- Commit 5 holds a state of `CredentialsGroupForm.test.ts` the old history never had (assertions and duplicate test removed, casts still in place). Its Vitest run passed there (9 tests) and `prettier --check` is clean.
- The other intermediate spec states match ones the old history had: the filter menu specs at commit 5 are as at `f1ad9482d3c`, and at commit 6 as at `695b2def95c`, both against `dev`'s components. `vue-tsc` was not rerun on intermediate commits.
- No E2E test was run in this step. That commits 2 to 4 pass on `dev` behavior rests on the earlier steps' runs of the same test code and on the commits adding only static attributes to the client.

## Judgment calls

- **Commit 3 edits an existing test and removes a sleep** from `_create_api_key`, which `test_copy_api_key` shares. It is titled "Baseline tests" because it pins current behavior and passes on `dev` plus its hook, but it is not purely additive.
- **Vitest removals follow the baseline commits** instead of sitting with the Selenium test that replaces them. Between commits 3 and 5 the show/hide button is covered by both.
- **Commits 5 and 6 are separate** because one removes coverage and the other only changes types; they could be one PR.
