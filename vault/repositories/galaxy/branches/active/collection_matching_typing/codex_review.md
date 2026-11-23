Run via gpt-6-sol at medium effort.

Second Codex pass at `f45e16e607d` (after the scope expansion): one finding, refuted; nothing acted on. First pass: [earlier_drafts/1/codex_review.md](earlier_drafts/1/codex_review.md).

- **Refuted — "tool step can run a slice its parent condition skipped" (`workflow/modules.py` `ToolModule.execute`).** Codex read the removed inner `if when_value is not False:` as making `evaluate_value_from_expressions` unconditional. It is still inside `if step.when_expression and when_value is not False:`, and nothing between the two checks reassigns `when_value` (the inner loop only builds `extra_step_state`). An inherited `False` is never re-evaluated.

<details>
<summary>Full review</summary>

- Files reviewed: `matching.py`, `registry.py`, `structure.py`, `type_description.py`, `tools/execute.py`, `workflow/map_over.py`, `workflow/modules.py`, `mypy.ini`, `test_execution.py`, `test_matching.py`, `test_structure.py`, `test_type_descriptions.py`, `test_map_over.py`, `workflow/run.py`, `dataset_collections/adapters.py`, `tools/parameters/meta.py`.
- Finding (P1, correctness, certain): `lib/galaxy/workflow/modules.py:3390` "A tool step can run a slice already skipped by its parent condition". Detail: "The surrounding block skips when-expression evaluation when the inherited when_value is False, but this new unconditional call evaluates it anyway. SubWorkflowModule preserves False for skipped slices, and the subworkflow passes those values to tool steps. A true result here overwrites the inherited False and is stored as __when_value__." Scenario: "A mapped subworkflow has a slice whose condition is false. An inner tool step has a when expression that evaluates to true. The inner tool's slice is scheduled instead of remaining skipped."

</details>
