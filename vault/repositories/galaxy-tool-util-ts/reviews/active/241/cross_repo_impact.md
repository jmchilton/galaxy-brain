# Cross-repo impact of #241

Checked 2026-11-12 against gxformat2 `origin/main` `3547f99` and Galaxy `wf_tool_state` `6c670761a20` (local = pushed). Repro: #229's `label_shadows_id.gxwf.yml`, plus a variant whose `outputSource` is `first/out_file1`.

## gxformat2

Same label-only semantics as the PR: `_register_labels` and `known_labels` register `step.label or step.id`. Map-form keys become `id`, and become `label` only when no label is given.

| Path | gxformat2 main today | TS after #241 |
| --- | --- | --- |
| Conversion (`ensure_native` / `to_native`) | `ValueError: invalid literal for int() with base 10: 'first'` (`_ConversionContext.step_id` falls back to `int()`) | `UnresolvedSourceError` with a label hint |
| Lint, `outputSource` naming a step by id | Error: `Output 'out' references step 'first' via outputSource …` (resolves with `resolve_source_reference` against `known_labels`, longest first, so labels containing `/` are fine) | Error (TS now matches gxformat2) |
| Lint, step `in:` source naming a step by id | Silent | New structural error (TS only) |
| Mermaid/Cytoscape | Resolve id refs to the labelled node (`NormalizedFormat2.resolve_render_source`, d9ad291) | n/a |
| Draft validation | Map-form key is resolved (per #229) | Unchanged |

To match, gxformat2 needs:

1. In `_ConversionContext.step_id`, raise a descriptive error for a non-numeric unknown label, with the same label hint, instead of the bare `int()` failure. Planemo and Galaxy surface this error.
2. A lint check for step `in:` sources that resolve to no step or input, using `nf2.resolve_source`, so gxformat2 and TS lint agree.
3. Shared declarative cases, so both sides pin the behaviour: a `lint_format2.yml` expectation and a conversion-failure case.

## Galaxy `wf_tool_state` (#22996)

It has no source resolution of its own. `connection_graph.build_workflow_graph` takes a `NormalizedNativeWorkflow`, and Format2 reaches it through gxformat2's `ensure_native`. Linting goes through `gxformat2.lint`. So Galaxy fails at gxformat2's `int()` before connection validation runs. Galaxy doesn't have TS's silent `skip`, but it doesn't give a good message either. The gxformat2 fix plus a version-floor bump covers it, and the branch needs no code change.

`connection_validation._validate_single_connection` still turns an unknown source step into `skip` ("Cannot resolve output … on step …"). That path is reachable only from native input with a dangling `input_connections` id, so it's out of scope here.

#241 adds `step_type: "unresolved_source"` to the TS connection report. If that stays, it is a report-contract change that the Python models (`_report_models.py` `ConnectionStatus` and step types) and the gxwf-web OpenAPI don't have. See risks.md.
