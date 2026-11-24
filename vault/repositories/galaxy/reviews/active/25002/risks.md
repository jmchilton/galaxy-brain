<!-- profile: gx_risk_assessment | model: Claude Opus 5.5 | effort: low | reviewed commit: 8dd9549cab94b9b3568b098fcc02255faecfcead -->

This is a one-way door for workflow authors: it adds `$(inputs.name)` as stored rename syntax in saved workflows, together with how each value type is formatted, and once published workflows use it Galaxy has to keep both working.

<details><summary>Risk Details</summary>

- `$(inputs.name)` in `RenameDatasetAction.newname` becomes part of the saved workflow format (native `.ga` and gxformat2). Workflows shared through IWC or other instances will rely on it.
- The formatting rules become a contract that is hard to change: booleans render as `true`/`false`, lists are joined with commas, datasets and collections give their name, and null or no-replacement gives an empty string.
- Step inputs that are connected to a parameter but are not tool parameters are now a supported way to wire a workflow. Editors, linters, gxformat2 and format converters will need to keep these "rename-only" inputs when they round-trip a workflow.
- A rename that references a step input now delays scheduling until the referenced parameter has been computed. This changes when such steps run, and a reference that never resolves will hold the step back.
- The two reference styles are resolved differently. A tool data input resolves through `$(inputs.x)` without waiting for the upstream job, while `#{x}` stays per-element for mapped-over inputs. Authors have to learn which one to use.
- Outside a workflow, an unresolved `$(inputs.x)` stays in the dataset name as literal text.
- `map_over.py` and the tool-execution path now accept step inputs that have no connection and only a default value. Before this PR those code paths assumed a connection existed.
- Two-way parts: the Selenium/Playwright `video_dir` and `slow_mo` options and the changes to `close()` only affect tests and tooling.

</details>

<details><summary>Risk Review Advice</summary>

Check that the `$(inputs.name)` syntax and the formatting rules match gxformat2/CWL semantics, so Galaxy does not end up with a dialect that diverges from them. Confirm that gxformat2 and the format converters keep the non-tool connected inputs when they round-trip a workflow. These are the parts that cannot be walked back once workflows are published.

Look closely at the scheduling change in `_referenced_step_input_values`, which raises `DelayedWorkflowEvaluation`, and at the relaxed handling of steps without connections in `map_over.py` and `modules.py`. Those changes touch the core workflow scheduler, and any regression there would affect workflows that do not use this feature at all.

</details>
