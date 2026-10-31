# The test-plan schema can't express a one-sided bound or a negated assertion

- Target: galaxyproject/foundry (`packages/gxwf-foundry/src/schemas/galaxy-workflow-test-plan/galaxy-workflow-test-plan.schema.json`, the `workflow-brief-to-galaxy-test-plan` and `implement-galaxy-workflow-test` Molds). Foundry tracking needed: no (this is the Foundry issue).
- Seen in: /home/ubuntu/foundry-runs/prose-wb2g-chipseq-v0-2026-10-30, phase 7 (test plan) and phase 8 (implement test), 2026-10-30. Ledger `test-plan-schema-no-bounds-negate-or-scalar-fixture` (minor). The scalar-fixture half of that entry is finding [25](25-test-data-refs-absent-and-scalar-inputs.md).
- Existing issues/PRs: none (searched "negate", "bound", "Tolerance"). Related: #577 (test-plan inputs), finding [06](06-weak-test-assertions.md) (assertions never tightened).

## Symptom
The chipseq plan wanted lower bounds (`has_n_lines` min, `has_size` min, peak counts `>= 1`) and negated checks (a skipped aligner's marker must be absent; 13 places). It wrote bounds as `expected_value` strings like `">=1 (min: 1)"` and negation as "Assert with negate: true" inside the free-text `intent`. The plan validates, but `implement-galaxy-workflow-test` has to parse prose to produce `min:` and `negate: true`.

## Root cause
Confirmed in the schema. `AssertionIntent` (`additionalProperties: false`) has `family`, `intent`, `expected_value`, `tolerance`, `element_identifier`, `evidence`, `confidence` and no `negate` or bound field. `Tolerance.kind` is `delta | delta_frac | lines_diff | none`, all symmetric around an expected value. The tests-format assertions themselves support both (`min`/`max` on `has_n_lines`, `has_size`, `has_n_columns`, `has_text` counts; `negate: true` on text/line families), so the plan is narrower than its target.

## Evidence
`galaxy-test-plan.yml` in the run dir (search `>=1 (min:` and `negate: true`); `galaxy-workflow-test-plan.schema.json` `$defs.AssertionIntent`, `$defs.Tolerance` at worktree `pipeline-run-chipseq` @ 38400847.

## Proposed fix
Add optional `min`/`max` to `AssertionIntent` (or a `Tolerance.kind: bound` with `min`/`max` magnitudes) and an optional boolean `negate`. Update the test-plan Mold to use them instead of prose and the implement Mold to map them 1:1 to tests-format keys. Add an eval case with one bound and one negated intent.

## Draft issue
**Title:** galaxy-workflow-test-plan: add bounds and `negate` to AssertionIntent

In a wb2g nf-core/chipseq run (2026-10-30) the test plan needed lower bounds (`has_n_lines` min, `has_size` min, peak counts >= 1) and 13 negated assertions. `AssertionIntent` has neither: `Tolerance.kind` is only `delta`/`delta_frac`/`lines_diff`/`none`, and there is no `negate`. The plan encoded them as `expected_value: ">=1 (min: 1)"` and "Assert with negate: true" in `intent` prose; it validated, and `implement-galaxy-workflow-test` had to parse the prose. Tests-format supports both natively.

Proposal: optional `min`/`max` (or a `bound` tolerance kind) and `negate: boolean` on AssertionIntent; Mold text and an eval case for each. (The scalar-fixture gap in the same ledger entry is tracked with test-data-refs scalars.)
