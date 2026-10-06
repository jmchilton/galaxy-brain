Add browser tests for importing datasets and collections from a filled-in workbook, under both Selenium and Playwright.

Galaxy's file-set wizard lets a user fill in a spreadsheet and upload it. Galaxy then reads the column headers, guesses what each column is, and opens the rule builder with that mapping already applied. No browser test on `dev` goes through that path. These tests upload one workbook per row below and check the mapping the rule builder opens with:

| Workbook (`test-data/rules/`) | Column headers | Rule builder opens with | Test |
| --- | --- | --- | --- |
| `workbook_example_1.tsv` | `name`, `url`, `genome` | `name` 0, `url` 1, `dbkey` 2 | `test_dataset_mapping_from_workbook`, `..._full_wizard` |
| `workbook_example_2.tsv` | `LIST IDENTIFIER`, `URI`, `TYPE` | `list_identifiers` 0, `url` 1, `file_type` 2 | `test_list_collection_mapping_from_workbook` |
| `workbook_example_3.tsv` | `list identifier`, `forward_url`, `reverse_url`, `genome` | `list_identifiers` 0, `url` 1, `dbkey` 2, `paired_identifier` 3 | `test_list_paired_collection_mapping_from_workbook` |
| `workbook_example_4.tsv` | `URI 1`, `URI 2`, `Outer List Identifier`, `Inner List Identifier` | `url` 0, `list_identifiers` 1+2, `paired_identifier` 3 | `test_nested_list_paired_collection_mapping_from_workbook` |

Numbers are rule builder column indexes. In the last two rows the two URL columns become one `url` column plus a `paired_identifier` column, one row per pair member.

A sixth test, `test_collection_workbook_template_is_typed`, picks `list:paired` in the wizard and checks that the workbook template it offers is for that collection type.

***Header parsing already has unit tests on both sides (`test_fetch_workbooks.py`, `fetchWorkbooks.test.ts`). These tests cover the path a user takes: the wizard's two upload entry points, the parse API and the rule builder that opens.***

***They stop at the rule builder and don't submit the import, so they need no network access to the example URLs.***

<details><summary>Test hooks and helpers</summary>

- The workbook file inputs are hidden, and the wizard has two of them (the header shortcut and the step 3 card). `HiddenWorkbookUploadInput` takes a required `data-description` so tests can tell them apart, and the step 1 download link gets one too. `navigation.yml` gains the matching selectors.
- `set_file_input` on `NavigatesGalaxy` attaches a file under either backend. The Playwright/Selenium split for this was copied three times in `upload_activity_helpers.py`. Those three call sites now use it.
- `rule_builder_show_and_get_source` is the read side of the existing `rule_builder_set_source`. `test_rules_example_4_accessions` had its own copy and now uses it.
- `RuleImportContext` (from 🔀 #23602) gains `upload_workbook`, `upload_workbook_from_card`, `workbook_for_collection_type` and `workbook_download_url`.

</details>

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door). It is test-only apart from three `data-description` attributes.

## Context

Builds on 🔀 #23602, which added the `RuleImportContext` these tests drive. Split out of the closed draft 🔀 #21199, which mixed these tests in with test-story tooling.

## John's Checklist

- [x] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? A failing test prints the full inferred mapping, or the download URL, next to what it expected.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? N/A, no unit tests added. The browser tests check the mapping Galaxy infers from real workbook headers.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests</summary>

- `lib/galaxy_test/selenium/test_workbook_mapping.py`: 6 new tests. All passed under both Selenium and Playwright in CI before the rename to `..._mapping_...`; the renamed tests are rerunning.
- `test_uploads.py::test_rules_example_4_accessions`, `test_upload_activity.py::test_composite_file_upload` and the other upload tests cover the refactored helpers. They pass under both backends.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
