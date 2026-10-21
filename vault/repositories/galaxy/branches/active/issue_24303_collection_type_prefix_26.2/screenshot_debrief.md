Screenshots successfully obtained.

## Test

New E2E test `TestWorkflowEditor.test_type_prefix_output_indicator` in `lib/galaxy_test/selenium/test_workflow_editor.py` (commit `6c48683b033`, at HEAD). Modeled on `test_map_over_output_indicator`; `assert_node_output_is` gained an optional `screenshot_name` (screenshot taken while the terminal tooltip is up).

Workflow: `list_paired` (list:paired) → `nest` (`__NEST__` 1.1.0) → `paired` (`collection_paired_test`); `nested_list_paired` (list:list:paired) → `nest_mapped` (`__NEST__` 1.1.0) → `paired_mapped`. Connections are made through the UI, then auto-layout, then tooltip assertions + screenshots.

Ran once under Playwright (headless): PASSED.

## Screenshots (`screenshots/`, gitignored)

| File | Shows |
|---|---|
| `workflow_editor_type_prefix_output.png` | nest output on list:paired: "output is dataset collection with 3 levels of nesting" (before the fix this was list:list → "list of lists dataset collection") |
| `workflow_editor_type_prefix_downstream.png` | paired consumer of nest output: "output is dataset and mapped-over to produce a list of lists dataset collection" - the connection to a `paired` input is accepted and maps over list:list, so the innermost level is `paired` |
| `workflow_editor_type_prefix_output_mapped.png` | nest on list:list:paired: "output is dataset collection with 3 levels of nesting and mapped-over to produce a dataset collection with 4 levels of nesting" (maps over outer list; per-job list:list:paired) |
| `workflow_editor_type_prefix_downstream_mapped.png` | paired consumer of mapped nest: "mapped-over to produce a dataset collection with 3 levels of nesting" (list:list:list) |

## Notes / problems

- The editor tooltip never prints the literal type string for rank ≥ 3 (pre-existing `collectionTypeToDescription` wording: "N levels of nesting"). `list:list:paired` is evidenced by rank 3 plus the paired consumer accepting the output and mapping over `list:list`; the old `list:list` would not connect to a `paired` input.
- Red check against the pre-fix editor was not run (would have meant temporarily reverting client code in a tree a concurrent review was reading).
- Environment: shared ports 8080/5173 (and 8091) were held by other worktrees' servers, so this worktree's Galaxy ran on 8737 (untracked `config/galaxy_8737.yml`, gravity bind override, test tools on) with Vite on 5737; test user registered fresh on that DB.
