screenshots successfully obtained

Head `74e1f5aca0f` (commit "Screenshot map over hint in tool form selenium tests", pushed to `jmchilton`).

## Screenshots (`screenshots/`, gitignored)

| File | Test | Shows |
|---|---|---|
| `tool_form_map_over_paired_collection_hint.png` | `test_tool_form.py::TestToolForm::test_map_over_paired_collection_hint` (new) | `collection_paired_test`, `list:paired` "paired list" selected for `paired` input `f1`; hint: "The supplied input will be mapped over this tool: one job per dataset pair." |
| `tool_form_map_over_nested_collection_hint.png` | `test_tool_form.py::TestToolForm::test_rerun_dataset_collection_element` (existing, screenshot added) | `identifier_multiple`, `list:list` selected for multiple `data` input; hint: "... mapped over this tool: one job per list." |

Both rendered as expected.

## Test changes

- New `test_map_over_paired_collection_hint`: the headline case (collection input mapped over by a nested collection) had no existing E2E coverage on the tool form. Asserts hint text contains "one job per dataset pair" and takes a screenshot.
- `test_rerun_dataset_collection_element`: only additions, no assertions removed. Added Escape on the multiselect input (the multi-select dropdown stayed open and covered the hint), a render wait, and a screenshot.

## Run notes

- Both tests passed individually: Selenium, headless Chrome, embedded test server, webpack-built client (`gulp && webpack`, staged to `static/dist`).
- The worktree venv needed Python 3.12 because h5py fails to build on 3.14. `yarn` isn't on PATH, so the client was built with the `node_modules/.bin` binaries.
- `@managed_history` was dropped from the new test. `TestToolForm` runs anonymously, and the decorator timed out waiting on "create new history".
