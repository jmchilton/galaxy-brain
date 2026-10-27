# Initial review — galaxy-tool-util-ts#192

- Profile: [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md)
- Model: Opus 5.5, effort medium
- Reviewed commit: `fee94b34` (vs `origin/main`)
- Python counterpart: galaxyproject/gxformat2#268 at `0922644` (local branch `pr_268`)

## Summary

Clean, faithful port. `lintDuplicateStepLabels`, `nativeInputLabel` / `nativeStepLabel`, the `StepLabelNotUnique` rule class, profile entry, and call sites (native: before the step loop; Format2: after the `class` check, before the step loop) match `gxformat2/lint.py`, `lint_rules.py`, and `normalized/_conversion.py` line for line, including message text, `if (!label)` skipping, insertion-ordered grouping, and pointer-at-second-occurrence. Format2 input indices in lint (`i`) match the order indices `toNative` assigns (`ctx.labels.set(inp.id, i)`), and TS normalization stores dict-form step keys in `label` (normalized/format2.ts:284) just as Python does, so the shared helpers produce the same labels Galaxy sees.

`_buildInputStep` now gets `null` instead of `undefined` for sentinel labels, but it already emitted `label: label ?? null`, so conversion output is unchanged.

The second commit (`offline: true` on the `--concrete` draft-validate tests) is correct and self-contained.

Catalog: gxformat2's `examples/catalog.yml` change has no TS counterpart to sync. `scripts/sync-manifest.json` only syncs fixtures, expectations, the schema-rule catalog, and `lint_profiles.yml`; nothing in TS reads a fixture catalog. Nothing is missing.

Tests not run: the worktree has no `node_modules`, and I didn't install deps so the worktree stays untouched. The PR description reports the full CI command set passing.

## Findings

### P2 1: Nested native duplicate reports a top-level JSON pointer

`lintNativeWorkflow` recurses into subworkflows with the same `ctx` (lint.ts:159), and `lintDuplicateStepLabels` passes an absolute `json_pointer` of `/steps/<key>/label` built from the subworkflow's own keys. A duplicate inside a subworkflow therefore points at a step in the *parent* workflow. In `synthetic-lint-duplicate-step-label-in-subworkflow.ga` the error points at `/steps/1/label`, but the parent has only step `0`. The real location is `/steps/0/subworkflow/steps/1/label`. Pointer consumers (the VS Code extension's diagnostics ranges) will highlight the wrong node or none at all. The message (`(step 0, step 1)`) doesn't name the subworkflow either, so a workflow with several subworkflows gives no clue where to look. The subworkflow expectation in `lint_native.yml` doesn't assert `json_pointer`, which is why this went unnoticed.

Python's `lint_ga` has the same issue (it recurses with the same `lint_context`), so fix it in gxformat2#268 first and re-sync. Recurse with `ctx.child("steps").child(key).child("subworkflow")` and build the duplicate's pointer from the context prefix plus `steps/<key>/label`, escaping segments with `escapePointerSegment` like `LintContext.child` does. Add a `json_pointer` assertion to `test_lint_native_duplicate_step_label_in_subworkflow`. `NativeStepKeyNotInteger` has the same pre-existing nesting problem and would be fixed by the same recursion change, but it's out of scope here.

### P3 1: Input-label fallback still duplicated in `_buildInputStep`

`_buildInputStep` keeps `const rawLabel = inp.id || \`Input ${orderIndex}\`` (toNative.ts:200) for `name` / `tool_state.name` / `inputs[0].name`, while `nativeInputLabel` recomputes the same fallback. The point of extracting the helper was to keep lint and conversion from drifting, but the fallback rule still lives in two places. Splitting it into a small `nativeInputName(inp, orderIndex)` that `nativeInputLabel` wraps (sentinel-clearing on top) would leave one source. Python has the same duplication. This is optional and only worth doing if gxformat2 does it too.

## Non-findings / notes

- `assertValue` now coerces `LintMessage` to its message only when `expected` is a string. That's a narrow change that mirrors Python's `str` subclass, and the change is fine.
- The added `toContain("StepLabelNotUnique")` in `lint-profiles.test.ts` only re-checks the synced YAML. It's harmless and has no Python counterpart.
- Pre-existing, not touched by this PR: `resolveLinterName` uses `linter.name` (the class name). That breaks under minifiers that don't keep class names. Not a blocker here.
