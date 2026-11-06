# Initial implementation debrief

- Base `release_26.2` (John: frame as "bug - missing tests"). Neither behavior had E2E coverage there: no test or selector touched `form-data-formats-*` or column metadata selects on the Attributes tab.
- Cherry-picked the two `galaxy_ui_driver` commits by subject (`3dfeb7f18a2`, `bcabe015080`). Neither needs gxui or other branch commits.
- Conflicts were only context: the source branch carries `selenium_dataset_tags_auto_detect` (#24347) and datatype change/convert work in the same spots (`metadata_input`, `edit_dataset_datatype`, `edit_dataset_convert`, three other tests, `permissions_tab` xpath). Dropped all of that; kept only these commits' selectors, helpers and tests.
- Known `comment_lines` 0→blank bug on Attributes save is out of scope and not asserted.
