Split the simple-form gating refactor out of the fix into its own commit, `b7733f5f4f0` "Refactor workflow run simple-form gating into a computed reason", placed between the Baseline commit and the fix; final tree is byte-identical to the old HEAD `6c64d43598b`.

## New history (`ced412c6248..HEAD`)

```
840ec8a631e Simple workflow run form: submit workflow parameters as replacement_params
0431cefba41 Keep rerun in the expanded form when the original run set tool step params
b7733f5f4f0 Refactor workflow run simple-form gating into a computed reason
708a26767b1 Baseline tests: simple-form rerun gating reason and submission payload
```

Old: `708a26767b1` / `e4e4d39d156` / `6c64d43598b`. Baseline commit unchanged (same sha), still first.

## Refactor commit (`b7733f5f4f0`)

Pulled from old commit 2, restricted to dev's three reasons:

- New `Run/simpleFormDisabledReason.ts`: `SimpleFormDisabledReason` union (`hasWorkflowResourceParameters | hasDisconnectedInputs | hasReplacementParameters`) and a first-wins `simpleFormDisabledReason(model)`. Order resource → disconnected → replacement is the same precedence as the old last-wins `loadRun()` block (replacement, disconnected, resource; last write won).
- `WorkflowRun.vue`: `disableSimpleFormReason`, `disableSimpleForm`, `simpleForm` are `computed`; the gating block leaves `loadRun()`.
- `WorkflowRunForm.vue`: `disableSimpleFormReason` prop typed with the union instead of `string`.

Parent behaviour kept on purpose: the parent's rerun gate (`isRerun && rerunHasStepParameters(rerunRequest)` → simple form off, but toggle shown and no reason) stays, folded into the `simpleForm` computed. So a step-params rerun still has `disableSimpleForm=false`, reason `undefined`.

Non-rendered differences (same as the thermo review noted for the fix): exposed `simpleForm` equals `preferSimpleForm` before the model loads (was `false`; no form renders before load), and gating now reacts to prop changes immediately instead of on the next `loadRun()`.

## Fix commit (`0431cefba41`)

Now only the feature: the `rerunHasStepParameters` reason (lowest priority) in the module and union, the `rerunRequest` arg, dropping the `isRerun &&` gate, alert text + `data-description`, toggle hidden via `disableSimpleForm`, `workflow-simple-form-link` class + nav targets, simple-form `rerunRequest` prefill, tests. Message reworded to drop the bullets that moved to the refactor commit. Commit 3 cherry-picked unchanged.

## Verification

| Commit | Run/ vitest | vue-tsc |
|---|---|---|
| `708a26767b1` Baseline | 79 passed | (unchanged sha) |
| `b7733f5f4f0` Refactor | 79 passed (incl. Baseline tests) | 11 baseline `recursive` only |
| `0431cefba41` Fix | 82 passed | 11 baseline `recursive` only |
| `840ec8a631e` HEAD | 82 passed | 11 baseline `recursive` only |

- `git diff 6c64d43598b HEAD` empty → no E2E rerun needed.
- eslint on refactor files: 0 errors (pre-existing template warnings only); prettier and pre-commit hooks passed on each commit.
- Not pushed. Backup branch `backup/issue_24177_pre_refactor_baseline` deleted after verification.
