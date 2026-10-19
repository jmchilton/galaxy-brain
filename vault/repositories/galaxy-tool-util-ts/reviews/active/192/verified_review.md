# Verified review — galaxy-tool-util-ts#192

Reviewed commit `fee94b34`. Python counterpart gxformat2#268 at `0922644`. Review branch `pr_192_review_0` (see [review_0_branch_details.md](review_0_branch_details.md)).

The shared fixtures and expectations are synced byte-for-byte from gxformat2, so P2 1, P2 2 and P3 1 need to land in gxformat2#268 first and then be re-synced here. Both languages produce the same output for every case below.

### P2 1: Duplicate label inside a native subworkflow gets a top-level JSON pointer (implementation verified)

`lintNativeWorkflow` recurses into subworkflows with the parent `ctx`, and `lintDuplicateStepLabels` builds an absolute `/steps/<key>/label` from the subworkflow's own keys. For `synthetic-lint-duplicate-step-label-in-subworkflow.ga` the error points at `/steps/1/label`, but the outer workflow only has step `0`. The real location is `/steps/0/subworkflow/steps/1/label`. Pointer consumers such as the VS Code extension's diagnostic ranges will highlight the wrong node or nothing. The message (`(step 0, step 1)`) doesn't name the subworkflow either. The nested expectation in `lint_native.yml` doesn't assert `json_pointer`, which is why this wasn't caught. Python `lint_ga` has the same bug.

<details><summary>Evidence</summary>

- TS at `fee94b34`: `[["Duplicated step label 'concat' (step 0, step 1)", "/steps/1/label"]]`. The outer step keys are `["0"]`.
- Python at pr_268 `0922644`: `[("Duplicated step label 'concat' (step 0, step 1)", '/steps/1/label')]`.
- The existing `NativeStepKeyNotInteger` pointer has the same nesting problem. This PR adds a second rule that inherits it.

</details>

Fix it in gxformat2#268 first. Add `json_pointer: /steps/0/subworkflow/steps/1/label` to the nested expectation, which should go red in both languages. Then recurse with `ctx.child("steps").child(key).child("subworkflow")` and build the duplicate's pointer from the context prefix. Re-sync here, then apply the same `lint.ts` change. The code fix is small and local to TS, but it wasn't committed on the review branch: its only test lives in synced expectations.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort and [generic_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_test_challenger.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P2 2: No fixtures for the Format2 label cases the refactor was meant to handle (implementation verified)

The PR description justifies exporting `nativeInputLabel` / `nativeStepLabel` with one case: a list-form input with no `id` becomes `Input 0` and clashes with a step labeled `Input 0`. No fixture covers that case. Neither Format2 fixture goes through the fallback-label path, and the separate recursion in `lintFormat2Workflow` has no Format2 subworkflow fixture. Today's behavior is correct in both languages, but nothing guards it.

<details><summary>Evidence</summary>

TS and Python give identical results:

| Case | Errors |
|---|---|
| `inputs: [{type: data}]` + step `label: "Input 0"` | `Duplicated step label 'Input 0' (input 0, step 1)` |
| Format2 subworkflow with two list-form steps labeled `a` | `Duplicated step label 'a' (step 1, step 2)` |

</details>

In gxformat2#268, add Format2 fixtures for both cases, plus a negative case where one label is reused at the outer level and inside a subworkflow. Assert the exact messages above in `lint_format2.yml`, then sync.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [generic_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_test_challenger.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 1: Use exact `value` for two message assertions

`test_lint_duplicate_step_label_list` and `test_lint_native_duplicate_step_label_in_subworkflow` use `value_contains` on the label prefix only. That leaves the description list (`step 1, step 2` / `step 0, step 1`) unchecked, and that list is where list-form ids and ordering show up. The PR's harness change already supports exact matching. Switch both to `value` in gxformat2's expectations and sync.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [generic_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_test_challenger.md) via Opus 5.5 at medium effort.

</details>

### P3 2: `lint-profiles.test.ts` addition re-checks YAML data rather than an invariant (implementation verified)

The new `toContain("StepLabelNotUnique")` only re-asserts what the synced `lint_profiles.yml` says, and it repeats `StepLabelNotUnique.profile = "structural"`. A single invariant would catch drift for every rule: each exported `Linter` subclass appears in its declared profile's `rules`.

The review branch replaces the line with that invariant. It is worth mirroring in gxformat2's `test_lint_profiles.py`.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [generic_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_test_challenger.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 3: Input-label fallback still lives in two places

`_buildInputStep` keeps `const rawLabel = inp.id || \`Input ${orderIndex}\`` for `name` / `tool_state.name`, and `nativeInputLabel` recomputes the same fallback. Python `_conversion.py` does the same (lines 1188 and 1703). The helper was extracted so lint and conversion can't drift, but the fallback rule is still duplicated. A small `nativeInputName(inp, orderIndex)` that `nativeInputLabel` wraps would leave one source. Do this in both languages or neither.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort.

</details>
