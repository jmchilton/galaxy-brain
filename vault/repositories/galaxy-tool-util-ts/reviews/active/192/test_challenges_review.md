# Test challenges review: galaxy-tool-util-ts#192

- Profile: [generic_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/generic_test_challenger.md)
- Model: Opus 5.5, effort medium
- Reviewed commit: `fee94b34`
- Python counterpart checked: gxformat2#268 at `0922644` (local `pr_268`)

## Summary

The PR adds no new unit tests. All rule coverage comes from 6 shared declarative fixtures, which is the right layer, so nothing needs dropping or de-mocking. The gaps are in what those fixtures don't cover:

- the nested json pointer is never asserted, and it is wrong in both languages;
- the Format2 conversion-label cases that justified exporting `nativeInputLabel` / `nativeStepLabel` have no fixtures;
- Format2 subworkflow namespaces have no fixtures.

The shared fixtures are byte-identical to gxformat2#268, so each new case below should land in gxformat2 first and then be synced.

How I checked: I ran probes against an archived copy of the PR head, using node_modules borrowed from the main clone. The worktree has no install and was not touched. I ran Python probes against an archive of `pr_268`.

## Findings

### P2 1: Nested duplicate test doesn't assert `json_pointer`, and the pointer is relative to the subworkflow

`test_lint_native_duplicate_step_label_in_subworkflow` checks only the message and the linter. `lintNativeWorkflow` recurses with the subworkflow dict, so the pointer it emits is `/steps/1/label`. In the outer document that points at a nonexistent step, or at the wrong one. Expected: `/steps/0/subworkflow/steps/1/label`. Python's `lint_ga` emits the same relative `/steps/1/label`.

<details><summary>Evidence</summary>

- TS probe on the synced fixture gives `["Duplicated step label 'concat' (step 0, step 1)", "/steps/1/label"]`.
- Python probe on the same fixture gives `('Duplicated step label ...', '/steps/1/label')`.
- The pre-existing `NativeStepKeyNotInteger` pointer (`lint.ts:143`) has the same relative-pointer behaviour under recursion. This PR adds a second pointer that inherits it.

</details>

**Suggested fix (gxformat2 first).** Add a `json_pointer` assertion with value `/steps/0/subworkflow/steps/1/label` to the nested expectation in `lint_native.yml`. It should go red in both languages. Then pass a pointer prefix through the `lint_ga` / `lintNativeWorkflow` recursion, or omit the pointer for nested levels. Re-sync. This is also a correctness issue, so the bug reviewer should weigh it.

### P2 2: No fixtures for the Format2 conversion-label cases the PR description claims

The PR description justifies the `nativeInputLabel` / `nativeStepLabel` refactor with one specific case: a list-form input with no `id` becomes `Input 0` and clashes with a step labeled `Input 0`. No fixture covers it. Neither Format2 fixture goes through a fallback label path. Format2 subworkflow namespaces are also covered only on the native side, although `lintFormat2Workflow` has its own recursion.

<details><summary>Evidence (TS probes, PR head)</summary>

| Case | Result |
|---|---|
| `inputs: [{type: data}]`, step `label: "Input 0"` | `Duplicated step label 'Input 0' (input 0, step 1)` |
| Format2 subworkflow with two list-form steps labeled `a` | `Duplicated step label 'a' (step 0, step 1)` |
| Label `a` used at the outer level and inside a subworkflow | 0 errors |

All three behave correctly today. Nothing guards them.

</details>

**Suggested fix (gxformat2 `examples/format2/`, then sync).** Add these fixtures and expectations to `lint_format2.yml`:

- `synthetic-lint-duplicate-default-input-label.gxwf.yml`: assert the exact message, after confirming that Python produces the same description text.
- `synthetic-lint-duplicate-step-label-in-subworkflow.gxwf.yml`: assert `error_count: 1`.
- `synthetic-lint-step-label-reused-in-subworkflow.gxwf.yml`: assert `error_count: 0`.

I don't recommend a fixture for the PR's other claim, that "two `_unlabeled_*` sentinels are not falsely flagged". Sentinels are unique by prefix and index, so they can't collide even if they weren't cleared to null, and a test would pass either way.

### P3 1: Strengthen two `value_contains` message assertions to exact `value`

`test_lint_duplicate_step_label_list` and `test_lint_native_duplicate_step_label_in_subworkflow` match only the label prefix. That leaves the description list (`step 1, step 2`) unchecked, and the description list is where Format2's list-form step ids and the input/step ordering show up. Both languages produce identical text:

- list-form: `Duplicated step label 'concat' (step 1, step 2)`
- nested native: `Duplicated step label 'concat' (step 0, step 1)`

Python output was checked. The harness change in this PR already supports exact matching. Change both in gxformat2's expectations and sync.

### P3 2: The `lint-profiles.test.ts` addition tests YAML data, not the loader

The new `toContain("StepLabelNotUnique")` asserts that a data file contains a string. That file is already exercised through the declarative `lint_profiles` expectations, and the assertion repeats `StepLabelNotUnique.profile = "structural"`. Two better options:

- Drop the line.
- Replace it with one invariant test: for every exported `Linter` subclass, its static `profile` lists the class in that profile's `rules` in `lint_profiles.yml`. This catches drift for every rule, not just this one, and is worth mirroring in gxformat2's `test_lint_profiles.py`.

### P3 3: Follow-up: make unstubbed `fetch` fail fast in CLI tests

The `offline: true` change in `packages/cli/test/draft-validate.test.ts` is correct and complete for that file. Every `--concrete` call is now `offline: true` or `toolState: false`, and none of the assertions depend on a fetched tool. The failure class is still open, though: a new CLI test that forgets `offline` hangs until the 5s timeout. A CLI `vitest` `setupFiles` entry that makes the global `fetch` reject unless a test stubs it would turn that into a fast, clear failure. The tests that stub fetch today (`commands`, `validate-workflow`, `tool-search`, ...) would override it. This is out of scope for this PR and suits a follow-up.

## Assessed, no finding

- **Harness change in `declarative-test-utils.ts`:** needed and narrow. As a red check I reverted it: exactly the two new exact-message cases fail (`test_lint_duplicate_input_step_label`, `test_lint_native_duplicate_step_label`) and the other 392 declarative cases pass. It matches Python's `LintMessage`-is-`str` equality and the existing `value_contains` coercion. The looseness is that any object with a string `message`, when compared to a string, is compared by message alone. That is acceptable.
- **Existing coverage:** the native positive, negative, subworkflow-reuse and unlabeled (`null`, `""`, missing) cases all exist and pass. A triplicate label works (`step 0, step 1, step 2`, pointer at the second). It is optional to add, low value.
- **Focused runs:** `declarative-normalized.test.ts` and `lint-profiles.test.ts` pass: 400 passed, 1 skipped.
