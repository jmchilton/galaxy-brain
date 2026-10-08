Screenshots successfully obtained.

# issue_21015_multiple_text_param — screenshots

Recorded 2026-10-08 under Playwright (headless), from branch head `58928294f5e`. Galaxy ran on 8081 and Vite on 5175, with `GALAXY_TEST_SCREENSHOTS_DIRECTORY` set. The files are in `screenshots/`, which git ignores.

| File | Test | Shows |
| --- | --- | --- |
| `workflow_editor_multiple_integer_parameter_invalid_connection.png` | `test_workflow_editor.py::test_multiple_integer_parameter_connections` | Multiple integer input refused by a single-integer tool input |
| `workflow_editor_multiple_integer_parameter_multiple_column_connection.png` | same | Multiple integer input connected to a multiple column select (new) |
| `workflow_editor_multiple_integer_parameter_list_default.png` | `test_multiple_integer_parameter_list_default` | Integer list default, one field per value |
| `workflow_editor_multiple_integer_parameter_range_list_default.png` | `test_multiple_integer_parameter_with_range` (new test) | Integer list default with min 1 and max 5 set |
| `workflow_run_multiple_integer_parameter_range.png` | same | Run form for that input: default rows `1`, `2` |
| `workflow_editor_multiple_text_parameter_invalid_connection.png` | `test_multiple_text_parameter_connections` | Multiple text input refused by a single text input (new) |
| `workflow_editor_multiple_text_parameter_multi_select_connection.png` | same | Multiple text input connected to `multi_select` (#21015) |
| `workflow_editor_multiple_text_parameter_list_default.png` | same | Text list default `--ex1,ex2` / `--ex3` (new) |
| `workflow_run_multiple_integer_parameter.png` | `test_workflow_run.py::test_execution_with_multiple_integer_parameter` | Integer run form with two rows |
| `workflow_run_multiple_text_parameter.png` | `test_execution_with_multiple_text_parameter` | Text run form with two rows |

## Notes

- **The first test after a cold Vite start times out on `#masthead`.** Rerunning it once fixed this every time.
- **No range slider for workflow integer parameters.** The editor stores min/max as an `in_range` validator, not as the parameter's own `min`/`max`, so the runtime field gets no `attrs.min`/`attrs.max` and `FormNumber` draws no slider. The editor's default field doesn't get them either. So `FormValueList` rows never show a slider for workflow parameters.
- **Open polish John raised.** The × buttons are top-aligned (`align-items-start`) and the rows are tight (`mb-1`/`ml-1`) in `FormValueList.vue`. This isn't changed yet.
