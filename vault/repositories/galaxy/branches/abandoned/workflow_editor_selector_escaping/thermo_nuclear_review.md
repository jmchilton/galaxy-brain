# Thermo-nuclear review: workflow_editor_selector_escaping (round 2)

**Top-line:** Reviewed `9699ec45644..0199d579296`. No defects, no structural regressions. Acted on one item: the `_wait_for_single_invocation` extraction was half-applied, so I finished it (`af2f6b68da1`, since folded into the helper-extraction commit by the history rewrite; see [baseline_refactor.md](baseline_refactor.md)). Declined the rest. STATUS: not blocked.

## Acted on

- **Half-applied `_wait_for_single_invocation`.** The branch added the helper but left the same wait → `history_invocations(...)[0]` chain in three places in the same file:
  - `test_execution_with_custom_invocation_report` and `test_execution_with_images_in_report` only read `["id"]`;
  - `_setup_simple_invocation_for_export_testing`'s return value is unused by both callers.
  - The polish step declined these because they use the summary dict, not the full invocation. That doesn't hold: the full invocation also carries `id`. All three now call the helper, so the chain lives in one place. The cost is one extra GET per test.
  - The helper stays on `TestWorkflowRun`: it has one consuming file, and `populators.py` has no equivalent.

## Not acted on

- **`workflow_editor_node_and_terminal` returns a CSS-escaped name.** That is a selector detail leaking out of a reference resolver. But its 8 callers feed 5 different node child targets (`output_terminal`, `input_terminal`, `input_terminal_dragging`, `connector_destroy_callout`, `input_mapping_icon`). Returning a bound terminal component would need a target-kind dispatcher, which adds concepts rather than removing them. Every caller uses the value only as a `name=` kwarg, and the docstring says it is escaped.
- **Escaping inside `SelectorTemplate`.** Rejected. Templates mix single-quoted CSS, double-quoted CSS, `#id` and XPath, so one global escape is wrong for most of them, and a per-target flag in navigation.yml is magic.
- **Moving `css_attribute_value` to `galaxy.navigation`.** Both real consumers are in `navigates_galaxy.py`, and `galaxy-navigation` is a separately published package. Move it when an outside consumer appears.
- **Hand-rolled run sequence in `test_execution_with_input_label_needing_css_escape`.** `workflow_run_and_submit` returns only `history_id`, and the test needs `inputs` for the id check. Widening its return for one caller isn't worth it.
- **XPath `data-label` / double-quoted `upload_activity_helpers` sites.** They need different quoting, and no free-text helper feeds them.
- **File size.** `navigates_galaxy.py` (~3.4k), `test_workflow_editor.py` (~2.3k) and `test_workflow_run.py` (~1.1k) were all over 1k lines before the branch. No threshold is crossed.

<details>
<summary>Full review</summary>

### Verdict
Approve after the one fold-in above. The approval bar:
- no file is pushed past 1k lines;
- no ad-hoc branching is added;
- no casts or optionality churn;
- one escape helper at the existing choke points.

### Correctness
- `css_attribute_value` escapes `\` before `'`. `string.Template.substitute` runs once, so a `$` in a value isn't re-expanded.
- `[id='…']` matches what `#id` matched. The old `\|` escape is unnecessary once the value is quoted.
- The node label escape goes into `${_}` and composes into the child targets. The terminal name escape covers every `name=` child.
- `workflow_run_specify_inputs` escapes only the selector. The typed `f"{hid}: "` value is unchanged.

### Structure / code judo
- The fix sits at the three resolver choke points (`workflow_editor_node`, `workflow_editor_node_and_terminal`, `workflow_editor_source_sink_terminal_ids`) plus one run-form site. No call site handles escaping itself. That is the minimal shape, and no larger reframe would delete more.
- The test helpers `_saved_step_connections_by_label` and `_wait_for_single_invocation` each remove real duplication. The second one was left half-applied; that is fixed now.

### Boundary
- The pre-escaped terminal name is the only boundary smell. See "Not acted on".

### Tests
- Both new E2E tests assert through the API: the saved connection dict, and the invocation input ids plus output content. Neither is a count or an OR-check.

</details>

## Tests run (Galaxy 8095 / Vite 5195, one at a time)

See [baseline_refactor.md](baseline_refactor.md). The E2E runs were done on the final tree, which is identical before and after the rewrite.
