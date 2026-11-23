Follow-up to 🔀 #24801 - browser tests for three of the inputs it swapped to `GFormInput`, in place of Vitest checks on `GFormInput`'s own rendering.

#24801 swapped `BFormInput` for `GFormInput` across filter, collection and user forms, and its specs mostly prove the swap happened: that `g-form-input` and size classes are on the element and that `required`, `disabled` or `list` reach the `<input>`. Those assertions break on any restyle of the base component and say nothing about whether the forms still work. Three behaviors the swap could break had no browser test at all. This adds one for each and trims the #24801 specs back to what their components decide.

- **History panel index range filter** (`test_advanced_filter_index_range`): fills "Filter by index" with 1 and 4, applies it, and checks only datasets 2 and 3 remain. It is the first E2E test of the history panel's advanced filters.
- **API key show/hide** (`test_api_key`): checks the key renders masked and that show/hide reveals the actual key, not just a `type="text"` field.
- **Credentials group-name error** (`test_credentials_group_name_error`): types a two-character group name in a tool's credentials dialog and checks the user sees "Group name must be at least 3 characters".

***No behavior changes. The client gains only `data-description` hooks for the selectors, plus one prop type narrowed (below).***

***Only the assertions #24801 added to seven specs are removed. The same assertion style remains in 25 other specs (#24686, #24718 and other swaps); this PR doesn't touch them.***

***Each removed check either moves to a browser test (`APIKeyItem.test.ts` → `test_api_key`) or only re-tested `GFormInput` itself. Secret masking stays asserted: `type="password"` on the credentials secret and the stored vault secret, since dropping it would show a secret in clear text.***

<details><summary>What the Vitest cleanup removes and why</summary>

- Class assertions (`g-form-input`, `g-small`, `mw-100`, `d-block`) and pass-through attributes (`required`, `autocomplete`, `list`, `disabled`) in `PairingFilterInputGroup`, `SampleSheetGrid`, `FilterMenuInput`, `FilterMenuRanged`, `VaultSecret` and `CredentialsGroupForm` specs.
- `APIKeyItem.test.ts` is deleted; its show/hide check, run behind module mocks, is replaced by `test_api_key` in a browser.
- A `CredentialsGroupForm` test that repeated a row of its own `it.each`.
- What stays checks shown values, placeholders, emitted payloads, keyboard events and `aria-invalid`.
- The credentials and filter menu spec fixtures are typed instead of cast through `unknown`.

</details>

<details><summary>Filter menu text inputs typed as text</summary>

`FilterMenuInput` and `FilterMenuRanged` typed their `filters` prop `string | boolean | undefined`, which is why #24801 wrapped each value in a computed conversion before handing it to `GFormInput`. `FilterMenu.vue` routes Boolean filters to `FilterMenuBoolean` and every range filter is a number or date, so these two only ever hold text. The prop and the `change` payload are now `string | undefined` and the inputs bind with plain `v-model` again (−21 lines, no wrapper). `FilterMenu` passes `Filtering<any>`, so its template routing, not the type checker, keeps booleans out; the range test above and the existing `test_histories_list.py::test_advanced_search` exercise both inputs.

</details>

<details><summary>How the branch is organised</summary>

Seven commits, 17 files, +119/−157:

1. Share the dataset setup of two existing history panel Selenium tests (`_show_history_of_datasets`).
2. to 4. One baseline-test commit per new E2E test, each with its own `data-description` hooks and `navigation.yml` selectors. Commit 3 also drops a dead hover step and a sleep from `test_api_key`'s shared setup.
5. Drop the Vitest assertions above.
6. Type the spec fixtures.
7. Type the filter menu text inputs.

Commits 1 to 4 stand alone as a tests-only PR if that's easier to review.

</details>

## Risks

Risks are minimal - this is test changes plus a type narrowing with no runtime effect (a two-way door).

## Context

Builds on 🔀 #24801. Developed with [John's Galaxy Brain Branch Factory](https://galaxy-brain.jmchilton.net/factory/galaxy-branches/).

## Human Review

(PUBLISHING_AGENT: Please include the contents of BRANCH_DIRECTORY/human_review.md before publishing this. If that file doesn't exist please double check that this PR should be published - if user confirms yes publish without this section.)

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep all seven commits as one PR, with the secret masking assertions put back.</summary>

The parts lean on each other: the Vitest deletions rely on the new Selenium tests, and the range test backs the prop typing. Tests-only (commits 1 to 4) also stands but strands the typing change. Trimming the other 25 specs and typing `Filtering` were each judged separate work.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/gform_input_swap_e2e_tests/scope_evaluation/). Run via Claude Fable 5.2 at medium effort.

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>14 accreted commits rewritten into 7, baseline tests first, tree unchanged.</summary>

One base refactor (`_show_history_of_datasets`), three baseline-test commits each carrying its own hooks and selectors, then Vitest cleanup and the prop typing. No commit uses a selector, helper or hook a later commit adds.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/gform_input_swap_e2e_tests/baseline_refactor/). Run via Claude Fable 5.2 at medium effort.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Dead hover step and a duplicate Vitest test dropped; the three E2E tests pass under Playwright and Selenium.</summary>

The surviving Vitest tests cover what a base-component swap can break under `@vue/compat`. `g-valid`/`g-invalid` assertions in the credentials validation table were kept: they test the form's touched-tracking, not a prop reaching a class.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/gform_input_swap_e2e_tests/test_challenges_debrief/). Run via Claude Fable 5.2 at medium effort.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>A shared string-conversion composable was replaced by narrowing the prop type.</summary>

Booleans never reach `FilterMenuInput` or `FilterMenuRanged`, so the conversion shouldn't exist; the narrowed prop removed it (+9/−34). `FilterMenu`'s `Filtering<any>` was left alone as out of scope.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/gform_input_swap_e2e_tests/thermo_nuclear_review/). Run via Claude Fable 5.2 at medium effort.

</details>

### ✅ Second Frontier Model Review

<details><summary>Two findings fixed, three pass-through findings declined, one later reversed.</summary>

- Fixed: `test_api_key` now asserts the revealed value equals the key; duplicated history panel setup shared in a helper.
- Declined: the dropped datalist/disabled and vault stored-secret checks, as pass-through assertions. Secret masking (`type="password"`) was later restored on both secret fields.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/gform_input_swap_e2e_tests/codex_review/). Run via gpt-6.2-sol; Codex reported reasoning effort "none".

</details>

### ✅ [John's Agentic Checklist](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/gx_pr_checklists/GENERAL.md)

<details><summary>All six items pass.</summary>

- [x] What does the user see when it fails? No runtime behavior change; a failing E2E test leaves a wait timeout naming the selector plus screenshots of the state before the action.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. Class and pass-through attribute assertions are removed; what stays checks shown values, placeholders, emitted payloads and `aria-invalid`.
- [x] Are baseline tests in their own leading commits? Yes. Commit 1 refactors existing tests, commits 2 to 4 are baseline tests; commit 3 also edits `test_api_key` and drops a sleep in shared setup.
- [x] Are the comments free of excess archeology? Yes. The two added comments each state a current constraint.
- [x] If comments describe previous implementation, what purpose do they serve? N/A

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/gform_input_swap_e2e_tests/pr_checklist/). Run via Claude Opus 5.5 at medium effort.

</details>

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
