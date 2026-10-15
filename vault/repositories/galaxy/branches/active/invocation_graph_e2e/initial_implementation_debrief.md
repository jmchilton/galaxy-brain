# Initial implementation debrief — invocation_graph_e2e

Implements [proposed_invocation_graph_no_e2e_coverage](../../../../../agents/gx_issues/internally_managed/proposed_invocation_graph_no_e2e_coverage.md) PR-first (no issue filed).

## Commits (on dev `c63ffc2ccae`)

1. `226a0b26902` Move `invocation_open_latest` into `navigates_galaxy` — resolves the helper's TODO: `exception_is_assertion_or_transition` + `retry_assertion_during_transitions` moved from `framework.py` to `navigates_galaxy.py` (framework re-exports via `__all__`, so the 24 test files importing it from `.framework` are untouched). Dropped `test_workflow_rerun.py`'s duplicate `_invocations_panel_open_latest_invocation`.
2. `42be14d4c46` Add browser tests for the workflow invocation graph.
3. `956650649fa` Review fixes ([normal review 1](subagents/normal_review_1.md)): stronger Step Config / failed-step / Show Connections assertions; dropped the redundant terminal-state test; `invocation_open_latest` retries an activity click that lands before the activity bar settles (seen once under Selenium).

## Tests (`lib/galaxy_test/selenium/test_workflow_invocation_graph.py`)

Every two-branch test's setup waits for all four nodes to show `header-ok`, which covers the issue's "graph reaches terminal state" bullet. One inline two-branch workflow (`left_input → left_cat`, `right_input → right_cat`, explicit `position`s — format2 without positions stacks every node at the origin, so clicks hit the wrong node). Plus `WORKFLOW_KEEP_SUCCESSFUL_DATASETS` for the failure case.

| Test | Asserts |
| --- | --- |
| `test_failed_step_is_marked` | `mixed_collection` gets `header-error`; downstream `cat` stays `header-ok` |
| `test_step_card_navigation` | click node → card title + wrench icon; Next/Prev/Prev move through steps (file icon on input); Hide removes card |
| `test_isolate_selected_step_lineage` | no node dimmed initially; clicking `left_cat` dims only the right branch |
| `test_show_connections` | active node's `out_file1` terminal loses `blank-output`, and the output and input names appear (absent before); the other branch stays blank; toggling off blanks it again |
| `test_step_config_is_read_only` | Step Config tab shows the step's own Label (`left_cat`) in a disabled field |
| `test_search_selects_step` | search `right_cat` → exactly one result `4: right_cat`; click → card shows it |

## Client hooks

- `data-description` on step card Previous/Next/Hide (`InvocationGraph.vue`) and the search toggle (`WorkflowInvocationSearch.vue`).
- `title-item-class="invocation-step-config-tab"` on the Step Config `GTab` (mirrors existing `invocation-step-outputs-tab`).
- New `invocations` selectors (`graph_*`, `step_card_*`); node lookup reuses `workflow_editor.node`.

## Verification

- Final head: 6 graph tests + `test_workflow_invocation_details.py` (2) + `test_workflow_rerun` pass under Playwright (9/9); under Selenium the graph and details tests pass. Earlier, 7/7 passed under Playwright (headless) and Selenium (chromedriver 155), against Vite 5173 → Galaxy 8080 with fresh per-test users.
- `test_workflow_invocation_details.py` (2) and `test_workflow_rerun.py::test_workflow_rerun` pass under Playwright after the helper move.
- ruff, black, isort, flake8, prettier, eslint (one pre-existing warning), mypy (from `lib/`) clean. Client vitest for `Workflow/Invocation/Graph` + `WorkflowInvocationState`: 47/47.

## Decisions

- Separate file, not folded into the existing invocation tests (per issue's alternatives).
- Live-update variant (open while jobs running) **found a real intermittent bug on dev** (graph stuck at "1 job running" after jobs finished; 1 failure in 6 runs). Parked for the #24138 fix branch: [live_update_test_for_24138](live_update_test_for_24138.md).
- Minimap colors / zoom cap / no-scroll left untested, as the issue scopes.
