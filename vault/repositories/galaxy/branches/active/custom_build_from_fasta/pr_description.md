Test adding a custom build from a history FASTA dataset - the custom builds page's default path, which no test covered.

![A custom build made from a two-sequence history FASTA, listed with 2 chroms/contigs](screenshots/custom_builds_from_fasta.png)

"FASTA-file from history" is the default Definition on User Preferences → Custom Builds, and it's the path the GTN FAQ [Adding a custom database/build (dbkey)](https://training.galaxyproject.org/training-material/faqs/galaxy/analysis_add_custom_build.html) walks through. Galaxy's E2E tests only ever switched to "Len-file by copy/paste". They couldn't cover the FASTA path: the framework test datatypes had no `fasta -> len -> linecount` converters, so on a selenium test server the save fails with "Failed to convert dataset."

`test_build_add_from_fasta` uploads a two-sequence FASTA, saves a build from it on the page, waits for the success alert and the conversion jobs, and checks that the build is listed with `2` chroms/contigs. ***It fails with the `sample_datatypes_conf.xml` additions reverted. Those entries copy `datatypes_conf.xml.sample` and only change the conf that selenium and framework test servers load; no other test there uses FASTA, `len` or `linecount` conversions.***

***This is test-only. It doesn't fix 🎯 #24309 (a FASTA build isn't listed until its jobs finish and the page is reloaded); the test re-navigates after the jobs finish to work around it, and can switch to waiting for the row once that's fixed.***

The first commit moves the existing custom build tests onto `custom_builds` `navigation.yml` components, which the FASTA test also uses. It drops their table walk, `UX_RENDER` sleep and retry loop, and generates build names inside each test instead of in shared class state. ***`test_build_add` and `test_build_delete` assert the same things as before.***

<details><summary>What changes</summary>

- `client/src/utils/navigation/navigation.yml`: new `custom_builds` block (form fields, a dismissible success alert since the global `.alert-success` also matches ok history items, table, and row / count / delete targets keyed by build name).
- `lib/galaxy_test/selenium/test_custom_builds.py`:
  - `add_custom_build` and `delete_custom_build` use the components; `get_custom_builds` and its sleep are gone.
  - `assert_custom_build_listed` / `assert_custom_build_not_listed` replace the list-plus-flag assert. The not-listed check waits for the table first, so absence can't pass against an unloaded page.
  - New `test_build_add_from_fasta`.
- `test/functional/tools/sample_datatypes_conf.xml`: `fasta -> len` converter, `len` datatype with its `len -> linecount` converter, and `linecount`, matching `datatypes_conf.xml.sample` attribute for attribute.

</details>

## Risks

Risks are minimal - test-only changes, so nothing locks Galaxy into a hard-to-change choice (a two-way door).

## Context

Part of 🌿 [`galaxy_ui_driver`](https://github.com/jmchilton/galaxy/tree/galaxy_ui_driver), which drives the GTN FAQ walkthroughs through the UI; this is its custom build FAQ as a test. Related to 🎯 #24309 and 🔀 #24310 (custom build API error handling on the same save path).

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep the test-only scope; product fixes on the same save path belong with the custom build API branches.</summary>

An owner happy-path API test was tried and reverted: API servers already load the stock converters, and an API-key FASTA save hits a separate missing-history bug in the same `try` block that 🔀 #24310 changes. Fixing it here would conflict on merge-forward and leave older releases broken. Folding in 🎯 #24309, a `NoConverterException` 400, or more E2E steps (dbkey picker, deleting the FASTA build) was also rejected as either separately tracked or low signal.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>Three simplifications made: per-test build names, split listed/not-listed asserts, and no readiness filter in a selector name.</summary>

The shared-state numbered build names became per-test locals. The list-plus-boolean grid assert became two direct helpers. `fasta_file` became a plain `select#fasta-file` with an explicit `wait_for_clickable()`. Not acted on: the repeated row xpath prefix (`SelectorTemplate.descendant()` only composes CSS) and a two-line name/key fill shared with `add_custom_build`.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Nothing to change: one E2E test at the right layer, red without the datatypes entries.</summary>

Setup goes through the API, every selector is a `navigation.yml` component, and there are explicit waits and no sleeps. The test asserts the observable result (the count from the `linecount` dataset). An API test of the same happy path would duplicate it.

</details>

### ✅ Second Frontier Model Review

<details><summary>Codex found nothing to act on.</summary>

It reviewed the branch before the thermo nuclear simplifications (per-test names, split asserts) and read the diff plus `CustomBuilds.vue`, the smart component and driver layers, `api/users.py` and both converter XMLs.

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>The helper move onto components is its own leading commit; the FASTA commit only adds lines.</summary>

The refactor commit touches only the two existing tests and their selectors and passes on its own (2/2 under Playwright and Selenium). The final tree is identical to the pre-split history.

</details>

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? No user-facing change. In tests, a timeout naming the component's selector, or pytest's diff of the actual value for the default definition, alert text and chrom count.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? N/A. No unit tests; the new test is E2E and checks the rendered count.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes. The refactor of the existing tests is the leading commit, ahead of the FASTA test.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? The reload comment names open 🎯 #24309, so the workaround can go once it's fixed.

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests</summary>

- `lib/galaxy_test/selenium/test_custom_builds.py` passes 3/3 locally under Playwright (headless) and Selenium.
- With the `sample_datatypes_conf.xml` additions reverted, `test_build_add_from_fasta` fails: the save PUT returns 500 and the test times out waiting for the success alert.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
