# galaxy-tool-util-ts#202 — `--strict` accepts partial tool state Galaxy import rejects

Issue: https://github.com/jmchilton/galaxy-tool-util-ts/issues/202
Branch: `issue_202_fill_defaults`, worktree `~/projects/worktrees/galaxy-tool-util-ts/branch/issue_202_fill_defaults/`. Branch record: [index](../../../branches/active/issue_202_fill_defaults/index.md).

## Triage (2026-10-25)

- Claimed by workflow_libs workhorse; base `origin/main` `539c16c9`.
- Root cause (Galaxy `origin/dev`, read not reproduced): import decodes with `params_from_strings(ignore_errors=True)`, which leaves absent params absent. `visit_input_values` then sets `input_values[name] = {}` for any absent section/conditional. `Conditional.value_to_basic` indexes `value[test_param.name]` unconditionally → `KeyError`. Section/conditional `value_to_basic` skip absent leaves. So Galaxy needs every reachable conditional's test param present (incl. conditionals under absent sections); missing leaves are fine.
- fastp repro: top-level section `duplicated_reads` (absent) → conditional `handling_options` → test `eval_dups`.
- Galaxy fills defaults only when import passes `fill_defaults=True` (`managers/workflows.py`, default False). Possible upstream robustness issue (500 vs validation error); doesn't make gxwf the wrong repo.
- Existing `expandToolStateDefaults` (schema `fill-defaults.ts`) has no CLI consumer; ask #2 wires it.
- Branch polished at `31c59854`; real fastp before/after captured. See [branch record](../../../branches/active/issue_202_fill_defaults/index.md).
