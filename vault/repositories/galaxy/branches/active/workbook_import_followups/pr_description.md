Follow-up to 🔀 #23922 — make the workbook import browser tests detect incorrect pair contents, import mode, and template query parameters.

A workbook can produce the right column mapping while splitting the wrong rows or leaving the builder in dataset mode. These tests now check the contents as well as the mapping:

| Case | Assertion added |
| --- | --- |
| Paired workbook | All six rows retain their accession, corresponding `_1`/`_2` file name, and alternating pair identifier. |
| Nested paired workbook | All twelve rows retain their file name, outer and inner identifiers, and alternating pair identifier in order. |
| Import mode | Collection examples expose the collection-name field; dataset examples keep it absent. |
| Collection template | Parsed query values are exactly `type=collection` and `collection_type=list:paired`. |

***This is test coverage for workbook import maintainers; it changes no production behavior or existing workflow execution.***

<details><summary>Browser helper and regression evidence</summary>

The shared column reader uses the existing backend-neutral keyboard API to bring horizontally virtualized ag-grid columns into view. It reads rendered rows only, which suits these small fixtures.

The implementation runs passed all six tests under both Playwright and Selenium. Deliberately breaking collection-mode selection, pair splitting, pair identifiers, and nested inner identifiers made the corresponding assertions fail. These experiments are documented in the implementation debrief; they are not additional committed tests.

</details>

## Risks

Risks are minimal: this test-only change is easy to revert and introduces no compatibility commitments. The helper depends on ag-grid's keyboard navigation and rendered-cell attributes; it explicitly supports small tables with all rows in view.

## Context

Builds on merged 🔀 #23922 and addresses the three optional suggestions in [mvdbeek's review](https://github.com/galaxyproject/galaxy/pull/23922#pullrequestreview-5491654666). ***The scope is exact template parameters, split-row contents, and the datasets-to-collections mode switch for the existing fixtures.***

## John's Checklist

- [ ] Did a human read every test and every comment?
- [x] What does the user see when it fails? Browser tests report mismatched values or time out waiting for collection mode.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes; browser assertions check fixture-derived values and visible import mode.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc. — what purpose do they serve? N/A.
- [x] Which existing workflows change behavior (if any)? None.
- [x] Who hits this in practice and what is the evidence? Workbook import maintainers; deliberate regressions fail the new assertions.
- [x] Were simpler or existing approaches considered? The helper reuses `press(..., element=...)`; direct cell selectors cannot read columns outside the horizontal viewport.

## How to test the changes?

- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Validation</summary>

Run `lib/galaxy_test/selenium/test_workbook_mapping.py` against Galaxy with each of `GALAXY_TEST_DRIVER_BACKEND=playwright` and `GALAXY_TEST_DRIVER_BACKEND=selenium`. The implementation debrief records six passing tests under each backend. The polishing rerun also passed all six tests under each backend. Fork CI on `debd555d9cd` had 45 successful checks, two skipped checks, and five checks still running at the 2026-10-13 refresh; no failures.

</details>

## License

- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
