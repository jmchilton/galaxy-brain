# galaxy-tool-util-ts#202 — `--strict` accepts partial tool state Galaxy import rejects

Issue: https://github.com/jmchilton/galaxy-tool-util-ts/issues/202
Branch: `issue_202_fill_defaults`, worktree `~/projects/worktrees/galaxy-tool-util-ts/branch/issue_202_fill_defaults/`. Branch record: [index](../../../branches/active/issue_202_fill_defaults/index.md).

## Current direction (2026-10-26)

John requested that Galaxy honor the existing sparse-state contract, with the importer fix queued for `release_26.1`. Python checks of the exact fastp fixture pass workflow and strict request validation, preserve omissions during request decoding, and produce valid job state after default expansion. This establishes that the missing selectors are semantically valid, not that the import bug is fixed.

PR #207 was revised at `37264be13d0d` to provide optional `gxwf fill-defaults` without tightening `--strict-state`. Its title and description now reflect that scope. The blanket completeness checker and validator plumbing are removed. Local build, checks, and tests pass. See the [revision debrief](../../../branches/active/issue_202_fill_defaults/revision_debrief.md).

The earlier conclusion that the importer limitation should become a strict-validation requirement is superseded. The [Galaxy-side issue draft](../../../../../agents/gx_issues/to_file/workflow_import_missing_conditional_defaults.md) contains the repro, evidence, implementation guidance, and regression plan. The TypeScript PR addresses optional expansion, so its body references #202 without claiming to fix the separate Galaxy bug.

## Historical triage (2026-10-25)

- Claimed by workflow_libs workhorse; base `origin/main` `539c16c9`.
- Root cause (Galaxy `origin/dev`, read not reproduced): import decodes with `params_from_strings(ignore_errors=True)`, which leaves absent params absent. `visit_input_values` then sets `input_values[name] = {}` for any absent section/conditional. `Conditional.value_to_basic` indexes `value[test_param.name]` unconditionally → `KeyError`. Section/conditional `value_to_basic` skip absent leaves. So Galaxy needs every reachable conditional's test param present (incl. conditionals under absent sections); missing leaves are fine.
- fastp repro: top-level section `duplicated_reads` (absent) → conditional `handling_options` → test `eval_dups`.
- Galaxy fills defaults only when import passes `fill_defaults=True` (`managers/workflows.py`, default False). Possible upstream robustness issue (500 vs validation error); doesn't make gxwf the wrong repo.
- Existing `expandToolStateDefaults` (schema `fill-defaults.ts`) has no CLI consumer; ask #2 wires it.
- Branch polished at `31c59854`; real fastp before/after captured. See [branch record](../../../branches/active/issue_202_fill_defaults/index.md).
