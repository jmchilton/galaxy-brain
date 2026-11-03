# galaxy-tool-util-ts#213 — strict-state accepts unknown nested `skip` key

Issue: https://github.com/jmchilton/galaxy-tool-util-ts/issues/213
Related: [#214](../../queued/214/index.md) (same tool, regex validator gap)

[Repro fixtures](repro/) (`skip_bad` / `skip_good`, format2 `state:`)

## Triage (2026-11-03)

Checked on `origin/main` `f5470fe5` (TS) and `jmchilton/wf_tool_state` `8bf22007fcd` (Python gxwf).

**Mostly gxwf (TS).** Reproduced: `gxwf validate --strict-state --connections` and `draft-validate --concrete --strict-state` both exit 0 on `skip_bad`.

- Root cause: `packages/cli/src/commands/validate-workflow.ts` decodes the tool-state models with `onExcessProperty: "ignore"`: `_validateNativeState`, plus both levels of `_validateFormat2State`. `assembleStruct` builds the models with extra="forbid", but the decode call turns that off. Flipping to `"error"` in the built dist rejects `skip` with `...filter.skip: is unexpected, expected: "filter_type" | "skip_lines"`, and `skip_good` still passes.
- A strict path already exists and the CLI doesn't use it: `validateFormat2StepStateStrict` (`packages/schema/src/workflow/stateful-validate.ts`) decodes with `"error"`. The VS Code path uses it through `tool-state-validator.ts`.
- TS stateful `convert` to native silently drops `skip` and still reports "1/1 steps converted". Python convert keeps it.
- Python wf_tool_state rejects `skip_bad` (`extra_forbidden`, via `create_model_strict`). The format2 path is at parity once TS is fixed.

**Native path caveat.** Flipping the native decode to `"error"` rejects real Galaxy bookkeeping keys (`__page__`, `__rerun_remap_job_id__`, `__current_case__`, `__index__`, `chromInfo`). Checked on IWC `Velocyto-on10X-filtered-barcodes.ga`.

- Python wf_tool_state *already* fails that IWC workflow for the same reason: `validate_native_state` runs `model_validate` before `classify_stale_keys` and the `StaleKeyPolicy.for_validate` "allow bookkeeping" logic. This looks like a Python bug.
- Fix both: strip `STALE_KEYS` / `_NATIVE_BOOKKEEPING_KEYS`, then decode strictly. Report other unknown keys through the stale-key classification.

**Upstream (Galaxy), by design.** Legacy `populate_state` and `params_from_strings` visit only declared inputs, so unknown keys are dropped silently at runtime. Stale keys are everywhere in real workflows, so the enforcement belongs in the validators, not Galaxy runtime.

## Sketch

1. Route the CLI format2 `state` validation through the schema package's strict validator. Extend it to return `StepValidationResult`, or reuse its decode, instead of the duplicated `_validateFormat2State`. Apply it to `validate`, `draft-validate --concrete`, `validate-tree` and gxwf-web.
2. Native `tool_state`: remove `STALE_KEYS` with the walker (`checkUnknownKeys` already exempts them), then decode with `"error"`. Mirror this in Python `validation_native.py`: strip bookkeeping before `model_validate`.
3. `convert` (stateful): report undeclared keys instead of dropping them silently. Either use walker `checkUnknownKeys` or emit a warning that counts dropped keys.
4. Tests: add the `skip_bad`/`skip_good` pair, plus a native bookkeeping-only case, to the shared declarative fixtures so both languages assert the same result.

## Decide

- Reject unknown keys always, or only under `--strict-state`? Python rejects them always. Rejecting always is closer to parity, but it may newly fail workflows that pass Foundry gates today.
- Fix Python native bookkeeping rejection in wf_tool_state in the same pass?
