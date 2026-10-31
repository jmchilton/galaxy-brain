# `draft-validate --concrete` checks only steps with no drafty ancestor, and nothing reports how small that subset is

- Target: galaxyproject/foundry (`content/cli/gxwf/draft-validate.md`, the template Mold's validation step). Optional enhancement in jmchilton/galaxy-tool-util-ts (validate each resolved step's tool state regardless of drafty ancestors, or report coverage). The cascade itself is by design. Foundry tracking needed: no for the doc; a gxwf issue only if John wants the enhancement.
- Seen in: /home/ubuntu/foundry-runs/prose-wb2g-chipseq-v0-2026-10-30, phase 4 (workflow-brief-to-galaxy-template), gxwf 1.15.0, 2026-10-30. Ledger `draft-validate-reference-silent-on-concrete-coverage` (minor).
- Existing issues/PRs: none (searched galaxy-tool-util-ts "concrete", Foundry "draft-validate concrete"). Related: Foundry #548 (concrete error messages), #668 (loop CLI surfaces), finding [24](24-draft-validate-structure-error-tree.md), finding [22](22-gxwf-connections-gate-input-cascade.md) (the same "clean but small" pattern in `--connections`).

## Symptom
The template draft had 198 steps: 159 resolved, 39 drafty. `gxwf draft-validate --concrete --strict-state --connections` was clean, with tool_state ok 43 / fail 0. A copy with the 39 drafty steps replaced by `cat1` stubs under `gxwf validate --strict-state` checked 198 / 0 / 0. So the "clean" concrete pass covered 43 of 159 resolved steps. Without `--concrete`, `--strict-state` and `--cache-dir` only print `Warning: --cache-dir, --strict* only apply with --concrete; ignoring`.

## Root cause
Confirmed in `@galaxy-tool-util/cli` 1.15.0 (installed in worktree `pipeline-run-chipseq`):
- `extractConcreteSubset` (`schema/dist/workflow/draft-checks.js:777-789`) drops every step with a TODO sentinel or `_plan_*` field, then "cascade-drop[s] steps whose `in:` becomes dead" in repeated rounds (`:814-850`). In a template where drafty steps sit early (aligners, helpers), most resolved steps are downstream and vanish.
- `runConcretePass` (`cli/dist/commands/draft-validate.js:103-160`) validates only the trimmed workflow and reports its summary; it doesn't report how many resolved steps were dropped.
- `warnUnusedConcreteFlags` (`draft-validate.js:82-101`) only warns for the flags without `--concrete`.
- `content/cli/gxwf/draft-validate.md:30` says `--concrete` "applies the full concrete `gxformat2` validation surface to the result"; `:59` warns only about an empty projection early in the loop. Neither says that steps downstream of any drafty step are dropped.

## Evidence
Ledger entry 9 evidence (counts above); the template Mold's report recorded the clean concrete pass as its validation.

## Proposed fix
1. Reference: state the cascade rule, and tell callers to compare the concrete subset size (`tool_state.summary`) with the resolved-step count; when they differ a lot, run a full tool-state pass with drafty steps stubbed, or `draft-extract` per branch.
2. Template Mold validation step: report "validated N of M resolved steps".
3. Optional gxwf: include `dropped_steps` counts by reason (direct vs cascade) in the concrete report, or validate tool state of every resolved step independently of connections.

## Draft issue
**Title:** draft-validate reference: `--concrete` validates only steps with no drafty ancestor; report coverage

In a wb2g nf-core/chipseq template (198 steps, 159 resolved, 39 drafty), `gxwf draft-validate --concrete --strict-state --connections` was clean but validated tool state for 43 steps. `extractConcreteSubset` drops drafty steps and cascades through everything downstream of them; stubbing the drafty steps and running `gxwf validate --strict-state` checked all 198. The reference says `--concrete` applies "the full concrete validation surface", so a clean result reads as full coverage.

Proposal: document the cascade; have the template Mold report "validated N of M resolved steps" and fall back to a stubbed full pass when N ≪ M. Optionally ask gxwf to report dropped-step counts by reason in the concrete report.
