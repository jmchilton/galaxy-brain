# Implementation debrief: workflow_editor_selector_escaping

STATUS: READY.
- Head `7ba4f7bd25f`, stacked on [`workflow_editor_connection_helpers`](../workflow_editor_connection_helpers/index.md) `9699ec45644` (base `release_26.2`), pushed to `jmchilton`.
- 5 commits, +117/−24 across 4 files.
- Re-scoped once and hardened twice. The second scope evaluation says keep as implemented.

## What it fixes

The Selenium/Playwright helpers built single-quoted CSS attribute selectors from free-text labels without escaping them, so a `'` or `\` broke the selector:
- subworkflow terminal names, which come from the inner workflow's labels;
- editor step labels;
- connector ids;
- workflow run-form input labels.

The connector targets were `#id` selectors that escaped only `|`.

## Final branch

1. `1d4137a20d7` adds `css_attribute_value` (escapes `\`, then `'`). The `connector_for` / `connector_invalid_for` targets become `[id='connection-…']`, replacing the `|`-only escape. No behavior change for ids the base can reach.
2. `fd9d178684f` extracts the `_saved_step_connections_by_label` editor test helper.
3. `ae7e6cf9b2d` extracts the `_wait_for_single_invocation` run test helper and applies it to the existing run, report and export tests.
4. `a1b763b1e30` escapes editor node labels and terminal names. It adds `test_connections_with_labels_needing_css_escapes`: a subworkflow with inner labels `it's an input` and `it's a \ output`, and a step labelled `cat's downstream`, using both string and tuple refs.
5. `7ba4f7bd25f` escapes `workflow_run_specify_inputs` input labels. It adds `test_execution_with_input_label_needing_css_escape`.

## Choices

- **One helper, in `navigates_galaxy.py`.** Both consumers live there. `galaxy.navigation` is a separately published package, and `SelectorTemplate` mixes CSS, `#id` and XPath quoting, so a global escape doesn't fit.
- **`workflow_editor_node_and_terminal` returns an already-escaped terminal name.** All 8 callers use it only as a `name=` selector kwarg, and the docstring says so.
- **No test-only failing commits.** The red runs are recorded in [initial_implementation_debrief.md](initial_implementation_debrief.md) and [implementation_rescope_debrief.md](implementation_rescope_debrief.md).
  - Playwright CSS parse errors on `[input-name='it's an input']`, `#connection-…it's an input…`, `[node-label='cat's downstream']` and `[step-label='it's input'] .multiselect`.
- **No `css_attribute_value` unit test.** It is two `str.replace` calls, and both E2E tests prove it through real CSS parsing.
- **Re-scope:** the original scope (editor only) is kept as the [alt](alts/original_scope.md) at `248fba718cc`.

## Hardening

Round 1 is in `earlier_drafts/1/`.

| Step | Result |
|---|---|
| [Review](subagents/initial_review.md) and [re-scope review](subagents/rescope_review.md) | No bugs. The review added the node-label escape. |
| [Test challenges](test_challenges_debrief.md) | Kept both tests. No unit tests are warranted. |
| [E2E polish](polish_e2e_tests_debrief.md) | Added the `_wait_for_single_invocation` helper. |
| [Codex](codex_review.md) | No findings in either round. |
| [Thermo-nuclear](thermo_nuclear_review.md) | No bugs. Applied the helper to its remaining sites. |
| [Baseline refactor](baseline_refactor.md) | Refactors first, then two fix+test commits. The tree is identical. |
| [Scope evaluation](scope_evaluation.md) | Keep as implemented. |
| Screenshots | Skipped: no client or UI changes. |

## Tests

- **Both backends:** both new tests, `test_execution_with_custom_invocation_report`, `test_execution_with_multiple_integer_parameter`, `test_execution_with_multiple_text_parameter` and `test_refused_connection_and_removed_step` pass on Playwright and Selenium.
- **Playwright only:** `test_reconnecting_nodes`, `test_existing_connections`, `test_simple_mapping_connections`, `test_change_datatype_in_subworkflow`, `test_editor_embed_workflow`, `test_connect_unlabelled_steps_by_order_index`, `test_execution_with_multiple_inputs`, `test_execution_with_rules` and `test_execution_with_images_in_report` pass.
- **Unit:** `test_smart_components.py` (54) and `test_has_driver.py` (388) pass.
- **Local-only failures:**
  - `test_workflow_export_file_native` and `test_workflow_export_file_rocrate` time out on the export-format card, after the changed setup helper. `_native` fails the same way on base, so it is likely missing export config on the dev server. Leave these to CI.
  - `test_change_datatype` on Playwright fails the same way on the parent code.

## Follow-ups (not done)

- Escaping `"` in `css_attribute_value`, for the double-quoted `[data-label="…"]` in `upload_activity_helpers.py` and the simplified run form. No caller passes free text today. It's cheaper on the gxui stack, which moves that file into `lib/galaxy/selenium`.
- `workflow_run_specify_inputs` needs `step-label`, which the simplified run form lacks for some workflows. This predates the branch and gxui could hit it.
- The connection-refusal path (`connector_invalid_for` / `try_connect`) isn't tested with escaped labels.
- XPath targets, `#` inside `"label#terminal"` refs, and control characters.

## Downstream

The stack is `release_26.2` → `workflow_editor_connection_helpers` → `workflow_editor_selector_escaping`. `galaxy_ui_driver` stays stacked on the parent, not on this branch. Restack it here if gxui should get these fixes before this branch merges.
