Run `test_import_dataset_from_path` under Playwright by reading the dataset table's cells instead of splitting row text.

The test has been `@selenium_only("Fails in CI with KeyError: 'Name' - needs investigation")`. The `KeyError` isn't a CI problem. The test builds a label/value dict from the library dataset table by splitting each row's text on newlines, and the two backends render a row's text differently:

| Backend | Row text | Key after `split("\n")[0]` |
| --- | --- | --- |
| Selenium | visible text, the value on its own line | `Name` ✅ |
| Playwright | `innerText`, which adds a tab after each cell | `Name\t` 😬 → `KeyError: 'Name'` |

```python
# before - depends on how the backend joins cells
row_values = element.text.split("\n")
table_as_dict[row_values[0]] = row_values[1]

# after - backend-neutral
label_cell, value_cell = row.find_elements(By.CSS_SELECTOR, "td")
table_as_dict[label_cell.text] = value_cell.text
```

Reading `td` cells is how the grid helpers in `navigates_galaxy.py` already read tables, and a value with more than one line is no longer cut to its first line.

***This is test-only. No client or server code changes, and the test's assertions (`Name` is `1.txt`, `Genome build` is `?`) are unchanged.***

***The test is fixed, not `PlaywrightElement.text`, which keeps Playwright's `innerText` behaviour.***

***It now runs in both the Selenium and Playwright CI jobs.*** The test also waits for the table's rows instead of the table itself. The table renders before the dataset loads, so a backend that sees the empty table as visible could otherwise read no rows and hit the same `KeyError`.

<details><summary>Why every row has exactly two cells</summary>

`.dataset_table` is a `GTable` with `hide-header` and two fields (`name`, `value`) in `LibraryDataset.vue`. Selection, action, expansion and empty-state cells are all off, and view-mode values are plain text, so the two-cell unpacking holds for every row.

</details>

## Risks

Risks are minimal - this change only touches one test, so it doesn't lock Galaxy into particular difficult to change choices (a two-way door).

## Context

Builds on 🔀 #23820, part of moving the Selenium suite onto Playwright. The stale 2017 comment blaming Docker compose for the failure is removed with the decorator.

## John's Checklist

- [x] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? The assertions print the whole label/value dict. A missing row still raises a bare `KeyError`.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. The E2E test checks the values a user sees in the dataset details table.
- [x] Are the comments free of excess archeology? Yes. The diff only removes the stale 2017 comment.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests run</summary>

- `test_library_contents.py::TestLibraryContents::test_import_dataset_from_path` passes locally under Selenium (headed Chrome) and Playwright (headless).
- After the rows wait was added, it was re-run and passes under Playwright.
- CI's Playwright job (`playwright.yaml`) skipped it while it was `@selenium_only`; it now runs there too.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
