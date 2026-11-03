# galaxy-tool-util-ts#212 — check `inputs.*` member paths in UDT expressions against the runtime model

Issue: https://github.com/jmchilton/galaxy-tool-util-ts/issues/212
Downstream: galaxyproject/foundry#672, galaxyproject/foundry#734 (egapx `star_wnode`).

Branch: [`issue_212_udt_expression_paths`](../../../branches/active/issue_212_udt_expression_paths/index.md).

## Triage (2026-11-03)

- Claimed by workflow_libs workhorse; base `origin/main` `f5470fe5`. No open PR or branch addressed it.
- Confirmed on main: `runSemanticChecks` (`packages/schema/src/user-tool-source/semantic.ts`) regex-matches only `inputs.<name>` roots inside `$(...)` (non-greedy, so nested parens truncate) in `shell_command` and `configfiles`; it never walks members, never reads `${...}` blocks or output labels.
- Embedded `GalaxyUserTool`s in workflows never reach `validateUserToolSource`; `validate`/`draft-validate` only parse their inputs for state checks.
- Galaxy runtime shape verified at `65e6daff`: `lib/galaxy/tool_util_models/parameters.py` (`DataInternalJson`, `DataCollectionElementInternalJson`, `DataCollectionInternalJsonBase`, per-type runtime models) and `lib/galaxy/tools/runtime.py` (`model_dump(by_alias=True)`, so every declared field is present, possibly null).
- Right repository: the offline validator lives here; the matching Galaxy lint is proposed separately.
