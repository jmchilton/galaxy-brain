Fix `workflow_job_init` and `workflow_test_init` crashing on format2 workflow inputs declared without a type.

```yaml
class: GalaxyWorkflow
inputs:
  the_input: {}
outputs: {}
steps: {}
```

On `master`, both commands fail on this workflow with `KeyError: 'type'`. gxformat2 leaves `type` unset on the normalized input, and treats a missing type as a data input when it converts the workflow. Planemo's two job template builders read `step["type"]` directly. **A new `normalized_input_type()` helper next to `input_label()` applies gxformat2's own data default rather than a planemo-specific one**, so both commands now emit a `File` placeholder (and `workflow_job_init` comments it as `# type: data`):

```yaml
the_input:
  class: File
  path: todo_test_data_path.ext
```

**Only the missing-type case changes; typed inputs, including `File`, `data_input` and `data_collection` (which normalize to `data`/`collection`), render as before.** Every planemo read of `type` from `inputs_normalized` output now goes through `normalized_input_type()`.

One CLI test per command runs the real command on a new five-line fixture and compares the full generated job. Both fail on `master` with `KeyError: 'type'`; with the fix, they pass along with the rest of `test_cmd_workflow_job_init.py`, `test_cmd_workflow_test_init.py`, `test_galaxy_workflow_utils.py` and `test_workflow_lint.py` (27 tests), and `make lint` passes.

## Risks

Risks are minimal - this change doesn't lock the project into particular difficult to change choices (a two-way door). It only turns a crash into a data-input template, matching how gxformat2 already interprets these inputs.

## Context

Found while taking over 🔀 #1744, whose `input_kind()` also treats untyped inputs as data. Whichever lands second should keep a single default (`input_kind(normalized_input_type(step))`).

## Agentic Checks

### ✅ Second Frontier Model Review

<details><summary>Codex found no defects.</summary>

A read-only Codex review of the full diff, briefed only on the intended behavior, covered `planemo/galaxy/workflows.py`, both init commands, the fixture, the CLI tests and gxformat2's handling of omitted input types. It reported no findings.

[Full report](https://galaxy-brain.jmchilton.net/repositories/planemo/branches/untyped-workflow-input-templates/codex_review/). Run via gpt-6-sol at medium effort.

</details>
