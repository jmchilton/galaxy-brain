# galaxy-tool-util-ts#202 — `--strict` accepts partial tool state Galaxy import rejects

Issue: https://github.com/jmchilton/galaxy-tool-util-ts/issues/202
Branch: `issue_202_fill_defaults`, worktree `~/projects/worktrees/galaxy-tool-util-ts/branch/issue_202_fill_defaults/`. Branch record: [index](../../../branches/active/issue_202_fill_defaults/index.md).

## Current direction (2026-10-26)

PR #207 provides optional `gxwf fill-defaults` without tightening `--strict-state`. Its code revision is `37264be13d0d`. Build, checks, and tests pass. Sparse selectors with declared defaults remain valid.

The Galaxy import crash is already fixed by [galaxyproject/galaxy#24272](https://github.com/galaxyproject/galaxy/pull/24272), merged October 20 into `release_26.1`. The initial investigation used a development checkout without that fix and missed its presence in the release branch's visitor. No new Galaxy issue is recommended.

Follow-up direct API tests passed all 13 import cases on release commit `5a5850702d0`, including omitted and false `fill_defaults` values. Removing only #24272's five-line visitor change caused eight HTTP 500 failures, including the original fastp `KeyError: 'eval_dups'`. The source was restored. See [full evidence](../../../branches/active/issue_202_fill_defaults/galaxy_import_followup.md).

PR #207's description now links the merged fix. The original report likely came from a build missing it, but the original run's exact Galaxy version has not been established. The earlier completeness-check recommendation and subsequent request for a new 26.1 fix are both superseded.

## Historical triage (2026-10-25)

- Claimed by workflow_libs workhorse; base `origin/main` `539c16c9`.
- Root cause (Galaxy `origin/dev`, read not reproduced): import decodes with `params_from_strings(ignore_errors=True)`, which leaves absent params absent. `visit_input_values` then sets `input_values[name] = {}` for any absent section/conditional. `Conditional.value_to_basic` indexes `value[test_param.name]` unconditionally → `KeyError`. Section/conditional `value_to_basic` skip absent leaves. So Galaxy needs every reachable conditional's test param present (incl. conditionals under absent sections); missing leaves are fine.
- fastp repro: top-level section `duplicated_reads` (absent) → conditional `handling_options` → test `eval_dups`.
- Galaxy fills defaults only when import passes `fill_defaults=True` (`managers/workflows.py`, default False). Possible upstream robustness issue (500 vs validation error); doesn't make gxwf the wrong repo.
- Existing `expandToolStateDefaults` (schema `fill-defaults.ts`) has no CLI consumer; ask #2 wires it.
- Branch polished at `31c59854`; real fastp before/after captured. See [branch record](../../../branches/active/issue_202_fill_defaults/index.md).
