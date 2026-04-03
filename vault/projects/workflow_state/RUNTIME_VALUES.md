# RuntimeValue in Workflow Tool State

**Date:** 2026-03-27
**Branch:** `wf_tool_state`

## What Is RuntimeValue?

`{"__class__": "RuntimeValue"}` is a native (.ga) tool_state marker meaning "user supplies this input at runtime." It appears in place of a concrete value for a parameter, signaling that the workflow form should prompt the user when the workflow is launched.

Format2 has no equivalent concept — RuntimeValue gets folded into the `in` connection block during native→format2 conversion (same as ConnectedValue).

## IWC Corpus Prevalence

**259 occurrences across 84 of ~120 IWC workflows.** RuntimeValue is pervasive in real-world workflows.

## Three Patterns (from manual verification of 12 cases)

### 1. Stale/Vestigial (~1/3 of sampled cases)

RuntimeValue in tool_state **plus** an `input_connections` entry for the same parameter. The connection supersedes the RuntimeValue at execution time — the RuntimeValue is never consulted. This is leftover state from before the author wired the parameter to another step's output.

Examples:
- annotation_helixer step 4 (BUSCO): `input` has RuntimeValue but input_connections points to step 1
- Scaffolding-HiC-VGP8 step 57 (multiqc): `results_0|...|input` has RuntimeValue but connected to step 21
- hic-fastq-to-pairs-hicup step 7: `digester|digester_file` has RuntimeValue but connected to step 5

The current code handles these correctly — the walker checks `input_connections` first and injects ConnectedValue, which takes precedence over whatever is in tool_state. But the RuntimeValue is dead weight that could be cleaned.

### 2. Intentional Workflow Inputs (~1/3 of sampled cases)

RuntimeValue on an optional data parameter that is also exposed as a workflow-level input. The author intentionally surfaces this for the user to optionally provide at launch. No input_connections entry exists.

Examples:
- annotation_helixer step 3 (Helixer): `input_model` — optional model file
- annotation_helixer step 8 (OMArk): `input_iso` — optional isoform data
- multiplex-tma step 8: `supp_mask` — optional supplementary mask
- multiplex-tma step 11: `cell_metadata` — optional cell metadata

### 3. Inert/No-Op (~1/3 of sampled cases)

RuntimeValue on an optional data parameter that is **not** exposed as a workflow input and has no input_connections. The parameter will be null at runtime. RuntimeValue is effectively meaningless here — the same behavior would occur if the key were absent entirely or set to null.

Examples:
- Assembly-Hifi-only-VGP3 step 19 (multiqc): `image_content_input`
- Assembly-Hifi-only-VGP3 step 30 (gfastats): `mode_condition|swiss_army_knife`
- Scaffolding-HiC-VGP8 step 47 (samtools_merge): `bed_file`
- hi-c-map-for-assembly-manual-curation step 43 (samtools_merge): `headerbam`
- chic-fastq-to-cool step 16 (pygenomeTracks): `boundaries_file`

### Key Finding: All Disconnected RuntimeValues Are on Optional Parameters

Every disconnected RuntimeValue (patterns 2 and 3) in the sample was on a parameter with `optional: true` in the tool definition. No cases were found of RuntimeValue on a required data parameter without a connection.

## Current Handling in wf_tool_state

RuntimeValue is treated as a sibling of ConnectedValue throughout the package:

| Module | Handling |
|---|---|
| `_util.py` | `is_connected_or_runtime()` returns True for both markers |
| `validation_native.py` | Walker encounters RuntimeValue → `SKIP_VALUE` (valid for any param type) |
| `convert.py` | RuntimeValue → entry in `format2_in` dict (same as ConnectedValue) |
| `roundtrip.py` | `_is_connection_marker()` treats both as equivalent for diff classification; sections that are all RuntimeValue/ConnectedValue/None are "connection-only" → benign diff |

There is no Pydantic model for RuntimeValue (ConnectedValue has one). The convergence plan's unresolved question about whether RuntimeValue needs one remains open.

## Open Questions

- **Should stale RuntimeValues be cleaned?** The stale-key cleaner doesn't currently target them. A RuntimeValue with a corresponding input_connection is dead state — safe to strip to null or remove. This could be a new cleaning policy.
- **Should RuntimeValue get a Pydantic model?** ConnectedValue has `{"__class__": "ConnectedValue"}` modeled. RuntimeValue uses the same shape but is handled via ad-hoc dict checks. A model would make validation more uniform but adds complexity for something that's really just "optional param, no value provided."
- **Format2 representation** — RuntimeValue currently maps to an `in` connection entry during conversion. Should format2 have a way to distinguish "connected to a step output" from "user provides at runtime"? Currently both are flattened into the same `in` block.
- **Inert RuntimeValues** — Pattern 3 (not connected, not a workflow input) is arguably a form of stale state. The parameter would behave identically if it were absent or null. Worth cleaning?
