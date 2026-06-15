# Python `validate_format2_state` silently skips inline `tool_state`

**Surfaced:** 2026-06-03 while investigating TS-vs-Python `gxwf validate` divergence on IWC corpus for the Foundry `advance-galaxy-draft-step` orchestrator eval. See `[[GXWF_AGENT]]`.
**Status:** Latent. Masks real schema gaps in the TS port (filed separately at jmchilton/galaxy-tool-util-ts) and prevents Python from catching the same bugs in IWC workflows.

## Symptom

Python `gxwf validate` reports "OK" on IWC format2 workflows whose `tool_state` carries values the workflow-step pydantic models would reject (`RuntimeValue` on `gx_data`, strict-numeric on stringified primitives, etc). TS `gxwf validate` reports the same shapes as errors. Direct invocation of `WorkflowStepToolState.parameter_model_for(parsed.inputs).model_validate(state)` confirms Python would reject too — it never gets called.

## Repro

```bash
cd /Users/jxc755/projects/worktrees/galaxy/branch/wf_tool_state
PYTHONPATH=lib .venv/bin/python -m galaxy.tool_util.workflow_state.scripts.gxwf validate \
  ~/projects/repositories/workflow-fixtures/iwc-format2/scRNAseq/velocyto/Velocyto-on10X-filtered-barcodes.gxwf.yml
# Step 0: ... velocyto_cli/0.17.17+galaxy3 ... OK
```

The step's `tool_state` carries `main.s: {__class__: RuntimeValue}` on a `gx_data` field. `DataParameterModel.pydantic_template` for `workflow_step` returns `type(None)` (`lib/galaxy/tool_util_models/parameters.py:1297-1298`); `RuntimeValue` is not in the union for that state representation. The model would fail. The validator doesn't call it.

## Root cause

`lib/galaxy/tool_util/workflow_state/validation_format2.py:74-84`:

```python
def validate_step_against(step: NormalizedWorkflowStep, parsed_tool: ToolInputs):
    state = dict(step.state) if step.state else {}
    ...
    if state:
        WorkflowStepToolState.parameter_model_for(parsed_tool.inputs).model_validate(state)
```

For format2 inputs, `gxformat2.normalized.ensure_format2(expand=True)` populates `step.tool_state` (the real `dict[str, Any]` from the YAML) and leaves `step.state = None`. The `if step.state else {}` falls through to `{}`. The `if state:` guard then skips the pydantic validation entirely. The linked-state pass that follows also runs against `{}` after connection markers are injected, so it validates "every connection is wired" but never sees the inline values.

TS reads `step.state ?? step.tool_state ?? {}` in `packages/cli/src/commands/validate-workflow.ts:434`, which falls through to the real `tool_state`. Both implementations should agree on which field is canonical; today they disagree silently.

## Why this matters

- **Python is reporting false negatives.** Every IWC workflow that "passes" Python `gxwf validate` today is actually unvalidated at the `tool_state` content layer. The Foundry corpus scan that returned 28 clean workflows is overstating cleanness.
- **The TS port is doing what Python documents but doesn't do.** TS surfaces bugs that should have been caught and fixed in the Python schema first. Fixing the TS bugs alone won't help users who run Python; both need to converge.
- **Blocks the orchestrator eval gold standard.** The Foundry `advance-galaxy-draft-step` Mold (`content/molds/advance-galaxy-draft-step/index.md` in `/Users/jxc755/projects/worktrees/foundry/branch/drafting`) cannot use Python `gxwf` as an oracle if Python isn't actually validating.

## Decision needed

Two paths:

1. **Validate `step.tool_state` when `step.state` is empty.** Match what TS does. Surfaces real schema gaps in `gx_data` / `gx_float` / `gx_integer` for `workflow_step` representation — fixing them is its own follow-up but the bugs are already filed against the TS port.
2. **Keep the skip.** Document that Python `gxwf validate` is structure-only for format2 and tool_state-aware only for native. Tighten the docs and rename to make the limitation explicit (e.g. drop `--no-tool-state` behavior into the default and rename the include flag).

(1) is the principled choice — `tool_state` is contract, validation should look at it. Pairs naturally with reconciling the cross-port `parameter_specification.yml` rows so `workflow_step_valid` / `workflow_step_invalid` cases include `RuntimeValue` markers on optional `gx_data`, stringified numerics, etc.

## Open questions

- Should `gxformat2.normalized.ensure_format2(expand=True)` itself populate `step.state` from `step.tool_state` so the existing validation path "just works"? Or is the right fix at the validator level?
- Are there other call sites in `lib/galaxy/tool_util/workflow_state/` that read `step.state` and silently fall through on format2 inputs? (E.g. `connection_validation.py`, `lint_stateful.py`.)
- What does the Python web cache validator path (`gxwf-web`) do — does it have the same gap?

## Related

- TS-side bugs that this Python skip is hiding:
  - jmchilton/galaxy-tool-util-ts: `workflow_step` schemas reject valid format2 markers (`gx_data` `S.Never`, `gx_float`/`gx_integer` strict-numeric).
  - jmchilton/galaxy-tool-util-ts: conditional `S.Union` has no discriminator + `stripConnectedValues` doesn't strip `RuntimeValue`.
- `[[GXWF_AGENT]]` — project context.
- `[[RUNTIME_VALUES]]` — corpus prevalence of `RuntimeValue` markers (259 across 84 IWC workflows).
