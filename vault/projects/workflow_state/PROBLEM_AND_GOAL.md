# Workflow Tool State: Schema-Aware Validation and Round-Trip Fidelity

## Problem

Galaxy has two workflow serialization formats:

- **Native (.ga)**: `tool_state` is a double-encoded JSON string containing `ConnectedValue` markers, `__current_case__` indices, and internal bookkeeping (`__page__`, `__rerun_remap_job_id__`). Lossless but unreadable.
- **Format2 (.gxwf.yml)**: `state` is clean structured YAML. Connections live in `in`/`connect`. No bookkeeping. Human-friendly.

The gxformat2 library converts between these formats **without consulting tool definitions**. This means:

1. **No validation** — invalid parameter names, wrong types, missing required values all pass silently through conversion. Errors surface only at workflow execution time.
2. **No clean export** — `from_galaxy_native()` emits `tool_state` (per-value JSON strings) instead of `state` (structured YAML) because without the tool schema it can't distinguish a dict-value from a JSON-string-of-a-dict.
3. **No `__current_case__` inference** — conditional branch indices can't be computed without the tool's parameter tree, so exported Format2 workflows lose this information and re-import may produce different results.
4. **No completeness checking** — there's no way to know during conversion whether required parameters are missing.
5. **Round-trip asymmetry** — a human-authored `state` workflow looks completely different after native→Format2 round-trip because the export path uses `tool_state`, not `state`.

Galaxy already has a tool state specification infrastructure: 12 state representations with dynamically-generated Pydantic models from tool parameter definitions. Two representations are directly relevant: `workflow_step` (validates unlinked params) and `workflow_step_linked` (validates params with `ConnectedValue` markers). This infrastructure exists but is not connected to the workflow format conversion pipeline.

The gap prevents Galaxy from offering Format2 as a first-class export format, blocks meaningful workflow linting, and forces all external tooling to treat tool state as opaque blobs.

## Goal

Connect Galaxy's tool state specification infrastructure to the workflow format conversion pipeline so that:

1. Both native and Format2 workflow tool state can be **validated against tool definitions** at conversion time and as a standalone operation.
2. Tool state can be **converted between `tool_state` (native encoding) and `state` (structured YAML encoding)** using schema-aware logic.
3. A native workflow can be **round-tripped through Format2 and back** with the guarantee that tool state is semantically preserved — enabling Format2 export as a production feature.

## Deliverables

### D1: State Encoding Conversion Library

Library code (in `galaxy-tool-util`) that converts between native `tool_state` encoding (double-encoded JSON with `ConnectedValue`, `__current_case__`, etc.) and Format2 `state` encoding (structured dicts with connections separated into `in`). Must handle all Galaxy parameter types: scalars, selects, conditionals, repeats, sections, data/collection params.

### D2: State Validation Library

Library code (in `galaxy-tool-util`) that validates both encodings against tool definitions using the existing Pydantic-based tool state specification infrastructure:
- Validate Format2 `state` blocks directly — the `state` YAML structure should have a JSON schema and Pydantic meta model. Validation should apply the meta model and walk the JSON to check parameter names, types, values, and structural correctness.
- Validate native `tool_state` blocks against `workflow_step` / `workflow_step_linked` models.
- Report structured validation errors (not raw exceptions).

### D3: Native (.ga) Workflow Validator

A complete validator that, given a native workflow dict and access to tool definitions, validates every tool step's `tool_state` — checking parameter names, types, values, conditional branch consistency, and connection completeness.

### D4: Format2 (.gxwf.yml) Workflow Validator

A complete validator that, given a Format2 workflow dict and access to tool definitions, validates every tool step's `state` block and `in` connections — checking parameter names, types, values, and that all connected inputs reference valid parameters.

### D5: Round-Trip Validation Utility

A utility (in `galaxy-tool-util` or `gxformat2`) that validates workflow state integrity through a round-trip:
1. Take a native .ga workflow
2. Convert to Format2 (producing `state` not `tool_state`)
3. Convert back to native
4. Assert that the tool states are semantically equivalent

This proves that Format2 export is non-destructive for a given workflow.

### D6: Format2 Export from Galaxy

Enable Galaxy to export workflows in Format2 format. The export path should:
- Use schema-aware conversion to produce `state` (not `tool_state`) in the output
- Only offer Format2 export for workflows that pass round-trip validation (D5)
- Fall back to native export for workflows that can't be cleanly converted (missing tool defs, validation failures, etc.)
- Preserve all workflow semantics — a re-imported Format2 workflow must produce identical execution results

## Constraints

- `gxformat2` is a standalone library with no Galaxy runtime dependency. Schema-aware features must be **optional** — activated when tool definitions are available, with the current schema-free path as the default.
- `galaxy-tool-util` is also runtime-independent. Validation and conversion code belongs here, not in `galaxy.workflows`.
- The Tool Shed 2.0 API already serves tool parameter schemas via `ParsedTool` models. External tooling should be able to validate workflow state using only Tool Shed API responses, without a running Galaxy instance.
