# Workflow Tool State: Schema-Aware Validation and Round-Trip Fidelity

## Motivation

Galaxy has long needed a human-writable workflow format. Anecdotal evidence suggets Bioinformaticians prefer CLI tooling and IDEs and competing workflow systems have capitalized on this — power users compose modules via command-line tooling more easily than they can in Galaxy. Format2 was designed to close this gap, but without schema-aware validation it remains a second-class citizen: you can write it, but Galaxy can't tell you if what you wrote is correct until execution time.

AI agents compound the problem. We've already identified the need to validate individual tool runs against the tool request schema so agents can catch errors before consuming server resources, quota, and extra API calls. Once agents are writing and modifying *workflows*, the same validation gap multiplies across every step — making workflow authoring unrealistic in reasonable time without per-step validation feedback. Validatable steps and validatable workflows turn an intractable problem into a manageable one.

The Tool Shed has always been a valuable resource but the extra steps of publishing to the tool shed have been an impediment to rapid development of pipelines of Galaxy by analysts. We've deployed the Tool Shed 2.0 that serves strongly-typed, well-documented schemas for thousands of tools. When those schemas power validation at every layer from individual tool calls to full workflow composition — the math flips. Galaxy tools become more easily and confidently composable than competing products, for both human authors and agents.

## Problem

Galaxy has two workflow serialization formats:

- **Native (.ga)**: `tool_state` is a double-encoded JSON string containing `ConnectedValue` markers, `__current_case__` indices, and internal bookkeeping (`__page__`, `__rerun_remap_job_id__`). Lossless but unreadable.
- **Format2 (.gxwf.yml)**: `state` is clean structured YAML. Connections live in `in`/`connect`. No bookkeeping. Human-friendly.

The gxformat2 library converts between these formats **without consulting tool definitions**. This means:

1. **No validation** — invalid parameter names, wrong types, missing required values all pass silently through conversion. Errors surface only at workflow execution time.
2. **No clean export** — `from_galaxy_native()` emits `tool_state` (per-value JSON strings) instead of `state` (structured YAML) because without the tool schema it can't distinguish a dict-value from a JSON-string-of-a-dict.
3. **`__current_case__` is a persistence artifact** — conditional branch indices (`__current_case__`) are an artifact of the visitor pattern and tool form that got accidentally persisted into `.ga` files. They shouldn't need to exist at all — the correct branch is determinable from the selector value and the tool's parameter tree. Format2 already omits them. Rather than inferring them during conversion, the goal is to prove they're unnecessary and eliminate them from the pipeline.
4. **No completeness checking** — there's no way to know during conversion whether required parameters are missing.
5. **Round-trip asymmetry** — a human-authored `state` workflow looks completely different after native→Format2 round-trip because the export path uses `tool_state`, not `state`.

Galaxy already has a tool state specification infrastructure: 12 state representations with dynamically-generated Pydantic models from tool parameter definitions. Two representations were designed specifically for this problem: `workflow_step` validates Format2 `state` blocks (no `ConnectedValue`, no `__current_case__`, nearly everything optional, data params absent) and `workflow_step_linked` validates state after merging connections (allows `ConnectedValue` markers). These representations already generate correct Pydantic models for every parameter type via `pydantic_template()` — the infrastructure exists but is not connected to the workflow format conversion pipeline.

The gap prevents Galaxy from offering Format2 as a first-class export format, blocks meaningful workflow linting, and forces all external tooling to treat tool state as opaque blobs.

## Goal

Connect Galaxy's tool state specification infrastructure to the workflow format conversion pipeline so that:

1. Both native and Format2 workflow tool state can be **validated against tool definitions** at conversion time and as a standalone operation.
2. Tool state can be **converted between `tool_state` (native encoding) and `state` (structured YAML encoding)** using schema-aware logic.
3. A native workflow can be **round-tripped through Format2 and back** producing **functionally equivalent** workflows — bookkeeping artifacts like `__current_case__`, `__page__`, and `__rerun_remap_job_id__` are expected to be stripped, not preserved. Functional equivalence means the round-tripped workflow produces identical execution results. This enables Format2 export as a production feature.

## Deliverables

### D1: State Encoding Conversion Library

Library code (in `galaxy-tool-util`) that converts between native `tool_state` encoding (double-encoded JSON with `ConnectedValue` markers) and Format2 `state` encoding (structured dicts with connections separated into `in`). Conversion should actively strip bookkeeping artifacts (`__current_case__`, `__page__`, `__rerun_remap_job_id__`) rather than preserving them — these are derivable from tool definitions and selector values. Must handle all Galaxy parameter types: scalars, selects, conditionals, repeats, sections, data/collection params.

### D2: State Validation Library

Library code (in `galaxy-tool-util`) that validates both encodings against tool definitions using the existing Pydantic-based tool state specification infrastructure:
- Validate Format2 `state` blocks against the existing `workflow_step` Pydantic models — these were designed for this purpose and already handle all parameter types. The `state` YAML structure maps directly to the `workflow_step` representation.
- Validate native `tool_state` blocks by parsing to `workflow_step_linked` representation and validating against those models.
- Validate connection completeness by merging Format2 `in`/`connect` into state and validating against `workflow_step_linked` models.
- Report structured validation errors (not raw exceptions).

### D3: Native (.ga) Workflow Validator

A complete validator that, given a native workflow dict and access to tool definitions, validates every tool step's `tool_state` — checking parameter names, types, values, conditional branch consistency, and connection completeness.

### D4: Format2 (.gxwf.yml) Workflow Validator

A complete validator that, given a Format2 workflow dict and access to tool definitions, validates every tool step's `state` block and `in` connections — checking parameter names, types, values, and that all connected inputs reference valid parameters.

### D5: Round-Trip Validation Utility

A utility (in `galaxy-tool-util` or `gxformat2`) that validates workflow **functional equivalence** through a round-trip:
1. Take a native .ga workflow
2. Convert to Format2 (producing `state` not `tool_state`)
3. Convert back to native
4. Assert the round-tripped workflow is **functionally equivalent** — same parameter values, same connections, same conditional branch selection. Bookkeeping fields (`__current_case__`, `__page__`, `__rerun_remap_job_id__`) are explicitly excluded from comparison.

This proves Format2 export is non-destructive. Validation should be demonstrated at two scales:
- **Framework test workflows**: run Galaxy's workflow framework tests against round-tripped workflows (without `__current_case__`) to prove execution equivalence.
- **IWC repository**: run the full IWC workflow test suite against double-converted versions of every workflow to prove broad compatibility and that `__current_case__` is unnecessary across real-world workflows.

### D6: IWC Workflow State Verification

Validate the tool state of every workflow in the IWC (Intergalactic Workflow Commission) repository against current tool definitions using the validation infrastructure (D2–D4). Every IWC workflow should pass validation — any failures indicate either stale state in the workflow or gaps in the validator. Failures should be triaged and fixed (clean stale keys, fix invalid values, or adjust the validator). The result is a verified-clean baseline for the IWC corpus.

### D7: IWC Lint-on-Merge

Integrate `galaxy-workflow-validate` into the IWC repository's CI pipeline so that workflow state validation runs on every pull request. PRs that introduce or modify workflows with invalid or stale tool state should fail CI. This prevents state rot from re-accumulating after D6 establishes the clean baseline. Implementation options include a GitHub Actions workflow calling `galaxy-workflow-validate --strict` or a pre-commit hook — the key requirement is that invalid state blocks merge.

### D8: Format2 Export from Galaxy

Enable Galaxy to export workflows in Format2 format. The export path should:
- Use schema-aware conversion to produce `state` (not `tool_state`) in the output
- Only offer Format2 export for workflows that pass round-trip validation (D5)
- Fall back to native export for workflows that can't be cleanly converted (missing tool defs, validation failures, etc.)
- Preserve functional equivalence — a re-imported Format2 workflow must produce identical execution results (bookkeeping artifacts like `__current_case__` are not preserved)

## Constraints

- `gxformat2` is a standalone library with no Galaxy runtime dependency. Schema-aware features must be **optional** — activated when tool definitions are available, with the current schema-free path as the default.
- `galaxy-tool-util` is also runtime-independent. Validation and conversion code belongs here, not in `galaxy.workflows`.
- The Tool Shed 2.0 API already serves tool parameter schemas via `ParsedTool` models. External tooling should be able to validate workflow state using only Tool Shed API responses, without a running Galaxy instance.
