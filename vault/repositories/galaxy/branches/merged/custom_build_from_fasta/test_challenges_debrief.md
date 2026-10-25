**Nothing needed changing.** No unit or API tests to challenge; the one new E2E test is at the right layer, follows E2E best practices, and fails without the branch's datatypes hunk. No API test added.

## Details

### Inventory
- `lib/galaxy_test/selenium/test_custom_builds.py::test_build_add_from_fasta` (new E2E).
- `add_custom_build` helper moved onto the new `custom_builds` components (refactor of existing tests' helper, no behavior change).
- No unit, Vitest, API, or integration tests on the branch. No "Baseline tests" commit, and none is needed: the only new test is the feature test itself.

### Unit test challenges
None to apply. There are no unit tests.

### Should an API test be added?
No. The E2E already drives the whole backend path: PUT `/api/users/{id}/custom_builds/{key}` with a FASTA HDA, `fasta -> len -> linecount` conversion, and GET's lazy `count` fill from the linecount dataset. It asserts the observable result (count `2`). An API test of the same happy path would duplicate it.

What only an API test could cover is the error paths: a non-convertible dataset, or a missing converter. Those are the queued `custom_build_conversion_error_swallowed` issue, where the right behavior is still undecided. Pinning today's 500 would lock in a bug. That test belongs with the fix. General API coverage for custom builds (there is none today) would be a scope expansion, not hardening of this branch.

### E2E best practices (`writing_tests.md`, vault E2E notes)
- Setup goes through the API (`dataset_populator.new_dataset(..., wait=True)`). Only the feature under test uses the UI.
- All selectors are `navigation.yml` components. `row_count` is parameterized by `${name}`, so no CSS strings are built in the test.
- Explicit waits, no sleeps. The test waits on the save success alert, then waits for history jobs (hidden converter HDAs count), then re-navigates. The comment explains the non-obvious wait.
- Both backends: green under Playwright and Selenium per the initial debrief and normal review 1. No backend-specific API calls.
- `@managed_history` not applied. It runs `home()` and creates a history before the test body, but this `SharedStateSeleniumTestCase` logs in inside the body (`_login()`), so the decorator would act on an anonymous session. The sibling tests don't inspect history, so there is no interference in practice. Restructuring the class for this isn't warranted.
- The `:enabled` in the `fasta_file` selector is a readiness check (enabled only once a FASTA is selected). Normal review 1 accepted it.

### Red without the change
- The branch only touches tests. The `navigation.yml` components are scaffolding the test itself needs. The only change the test depends on is the `sample_datatypes_conf.xml` hunk, so red is judged against that hunk.
- Without the hunk, the framework datatypes have no `fasta -> len` converter. On `51bc57ccf1d`, the save PUT then fails with a swallowed `NoConverterException` that comes back as a 500. The success alert never renders, so the test fails at `success_alert.wait_for_text()`, a behavioral wait in the test itself. This was reasoned, not re-run. The red recorded in the initial debrief predates the success-alert wait, and at that point it timed out on the build row.

### Tests run
None in this pass. No code changed, and earlier runs (Playwright 3/3, Selenium 3/3, `api/test_datatypes.py` 10 passed) still apply to commit `51bc57ccf1d`.
