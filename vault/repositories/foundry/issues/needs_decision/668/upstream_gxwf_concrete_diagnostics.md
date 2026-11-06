`gxwf draft-validate --concrete --json` reports `ok: false` and `1 error` while every `*_errors` array in the report is empty.

```console
$ gxwf draft-validate badkey.gxwf.yml --concrete --strict-state --json --cache-dir cache
```

```jsonc
// trimmed to the relevant keys
{
  "ok": false,
  "structure_errors": [],
  "topology_errors": [],
  "semantic_errors": [],
  "summary": "1 error",
  "concrete": {
    "structure_errors": [],
    "ok": false,
    "tool_state": {
      "results": [{
        "step": "0",
        "tool_id": "cat1",
        "status": "fail",
        // the only place the error appears
        "errors": ["No parameter definition matching connection key \"not_a_param\""]
      }],
      "summary": { "ok": 0, "fail": 1, "skip": 0 }
    },
    "strict_state_errors": []
  }
}
```

<details><summary>badkey.gxwf.yml (gxwf 1.15.0, exit 1)</summary>

```yaml
class: GalaxyWorkflowDraft
inputs:
  reads: data
outputs:
  result:
    outputSource: cat/out_file1
steps:
  cat:
    tool_id: cat1
    tool_version: 1.0.0
    state: {}
    in:
      input1: reads
      not_a_param: reads
    out:
      - id: out_file1
```

</details>

A consumer that reads the arrays named `*_errors` sees nothing to act on, and has to know that tool-state failures sit at `concrete.tool_state.results[].errors`. The text output prints them, so this is a `--json` problem, and [Foundry's doc for this command](https://github.com/galaxyproject/foundry/blob/main/content/cli/gxwf/draft-validate.md) tells a cast skill or harness to prefer `--json`.

The diagnostic also doesn't say which step failed in a form a consumer can use. With `--connections` added, the same run reports the `cat` step under two different numbers, and only one of them carries the label:

```jsonc
"tool_state":        { "results":      [{ "step": "0", "tool_id": "cat1", "status": "fail" }] }
"connection_report": { "step_results": [{ "step": "1", "label": "cat",    "tool_id": "cat1" }] }
```

`tool_state` counts positions in format2 `steps` ([validate-workflow.ts](https://github.com/jmchilton/galaxy-tool-util-ts/blob/f5470fe5/packages/cli/src/commands/validate-workflow.ts#L534-L536)), while `connection_report` numbers the native form, where workflow inputs come first ([graph-builder.ts](https://github.com/jmchilton/galaxy-tool-util-ts/blob/f5470fe5/packages/connection-validation/src/graph-builder.ts#L55-L56)). The gap equals the input count: with three inputs, steps `0, 1, 2` in `tool_state` are `3, 4, 5` in `connection_report`.

Neither number points back at the draft, because both count the extracted subset: put a `TODO` step ahead of `cat` and `cat` still reports `0` and `1`.

Standalone `gxwf validate --json` has the same mismatch on a format2 workflow, between `results[].step` and `connection_report.step_results[].step`. On a native `.ga` the two agree.

## Context

Bug related to 🎯 galaxyproject/foundry#668, part 1: Foundry's per-step loop routes failures from these JSON diagnostics, and a run spent three probe invocations mapping the report before it could read one. That Foundry issue tracks documenting the report shape; this one asks for the report to explain itself.

## Proposed Approach

Add an optional `label` to each step-validation result, which also covers `tool_state.results[]` and `gxwf validate`, and add one top-level `concrete_errors` array under `--concrete` that collects every concrete-pass failure and names its step by label, so `ok: false` can always be explained from the top level. The change is additive: existing fields, `summary` and exit codes stay as they are.

<details><summary>Details</summary>

```jsonc
"concrete_errors": [
  { "check": "tool_state", "label": "cat", "tool_id": "cat1",
    "message": "No parameter definition matching connection key \"not_a_param\"" }
]
```

`check` covers each failure [`isConcreteOk`](https://github.com/jmchilton/galaxy-tool-util-ts/blob/f5470fe5/packages/cli/src/commands/draft-validate.ts#L238) tests: structure, strict-structure, strict-encoding, strict-state, tool-state and connections. Entries carry no `step`, because copying it from the two sources would give one array two numberings.

- Structure, strict-structure and strict-encoding failures are plain strings with no step, so their `label` is null. So is an unlabelled list-form step's, as in `connection_report` today.
- Strict-state entries come from the skipped `tool_state.results[]`, since `strict_state_errors` holds only formatted strings.
- Connection entries come from `status: "invalid"` connections and step-level errors. `skip` connections also carry `errors` but don't fail the report.
- A step in an inline subworkflow reports as `0.0` in `tool_state` and has no entry of its own in `connection_report`, so its label needs the outer step (`nested/inner_cat`).
- `summary` keeps its count ([`concreteErrorCount`](https://github.com/jmchilton/galaxy-tool-util-ts/blob/f5470fe5/packages/schema/src/workflow/report-models.ts#L670)), which counts a failing step once and an invalid connection report once, so the array can be longer than the count.

The changes go in `ValidationStepResult`, `SingleDraftValidationReport` and `buildSingleDraftValidationReport` in `report-models.ts`, and in the step walkers in `validate-workflow.ts` and `validate-workflow-json-schema.ts`. `draft_validate.md.j2` already renders these failures, and gxwf-web doesn't serve this report, so `concrete_errors` touches neither. gxwf-web does return `ValidationStepResult`; `label` can stay out of its `openapi.json` and `api-types.ts`, as the TS-only `ConnectionStepResult.label` does. Exact-shape assertions such as `user-defined-tool-step.test.ts` need updating.

</details>

## Alternative Approaches

An additive array with the step label fixes the trap for JSON consumers without changing what the existing buckets mean.

<details><summary>Alternatives In Detail</summary>

### Alternative: Add tool-state failures to `semantic_errors`

<details><summary>Description</summary>

#### Details

galaxyproject/foundry#668 suggests surfacing these failures in `semantic_errors` or a named top-level array.

#### Why the proposed approach is preferred

`semantic_errors` holds draft-contract diagnostics, and `DraftValidationDiagnosticReport` is shaped for draft paths. Mixing the concrete pass into it would blur a distinction Foundry's doc describes (the draft validator is "contract-shaped, not workflow-shaped") and that `exitCodeFor` checks separately.

</details>

### Alternative: Document the shape only

<details><summary>Description</summary>

#### Details

Add the report schema and a worked example to the CLI docs and leave the report unchanged. Foundry needs this documentation in any case.

#### Why the proposed approach is preferred

Documentation only helps a reader who finds it. The empty arrays still read as clean to one who doesn't, and the two step numberings remain.

</details>

### Alternative: Renumber one report's `step` to match the other

<details><summary>Description</summary>

#### Details

Make `tool_state` and `connection_report` agree on one index scheme instead of adding a label.

#### Why the proposed approach is preferred

Renumbering changes the meaning of an existing field for consumers that already use it, and either index still counts the extracted subset rather than the draft, so a label is what a consumer can route on. It could follow separately if the mismatch causes trouble once labels exist.

</details>

</details>
