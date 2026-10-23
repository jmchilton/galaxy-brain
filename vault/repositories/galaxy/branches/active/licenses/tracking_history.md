# Tracking history

Imported from the branch agent on 2026-10-09; this preserves the recorded decisions and evidence. CI has not been refreshed by this migration.

- Branch `licenses` (`b9f94242617`, 870 behind) — Description: Adds `<license_agreement>` tool requirements that users must accept before running the tool; blockers: rebase conflicts in first commit (`tool_util_models/_models.py`, `test_tool_linters.py`, ~200 lines), left alone 2026-10-05; no fork CI yet. [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:licenses?expand=1).

## Pre-harden ticks (moved from index.md 2026-10-23)

### TICK — 2026-10-11

The only current-head run found is successful Build docs. It does not exercise the license requirement behavior; retain needs CI.

### TICK — 2026-10-12

Current fork tip `b9f942426176973aa35591080ea5c47809ea1ad0` conflicts with dev in `client/src/components/Tool/ToolForm.test.ts`, `client/src/components/Tool/ToolForm.vue`, `client/src/components/Workflow/Run/WorkflowRun.test.js`, `client/src/components/Workflow/Run/WorkflowRunForm.vue`, `doc/source/dev/index.rst`, `lib/galaxy/managers/users.py`, `lib/galaxy/tool_util_models/_models.py`, `lib/galaxy/tools/execute.py`, `test/unit/tool_util/test_tool_linters.py`. The overlapping production behavior/schema or linter changes require a substantive reconciliation; left branch intact under the automatic small/mechanical-conflict limit. Existing workflow status and review decisions remain.

### GOOD_MORNING — 2026-10-13

Current fork head `b9f942426176973aa35591080ea5c47809ea1ad0` conflicts with `origin/dev` in 9 paths. Overlapping behavior, schema or assertion changes require deliberate reconciliation beyond the standing mechanical/small-conflict authorization. Branch left intact. `client/src/components/Tool/ToolForm.test.ts` · `client/src/components/Tool/ToolForm.vue` · `client/src/components/Workflow/Run/WorkflowRun.test.js` · `client/src/components/Workflow/Run/WorkflowRunForm.vue` · `doc/source/dev/index.rst` · `lib/galaxy/managers/users.py` · `lib/galaxy/tool_util_models/_models.py` · `lib/galaxy/tools/execute.py` · `test/unit/tool_util/test_tool_linters.py`

### Morning refresh — 2026-10-16

Conflict preview against `origin/dev` at `b9f942426176973aa35591080ea5c47809ea1ad0` found overlapping changes in 10 paths (`client/packages/api-client/src/schema/schema.ts`, `client/src/components/Tool/ToolForm.test.ts`, `client/src/components/Tool/ToolForm.vue`, `client/src/components/Workflow/Run/WorkflowRun.test.js`, `client/src/components/Workflow/Run/WorkflowRunForm.vue`). These include behavior/schema/assertion changes beyond a small mechanical rebase; fork and development worktree left intact. Existing status/review holds remain.

- 2026-10-22/23: rebased onto dev `0073b5e9224`, hardened, re-scoped (modest expansion) and re-hardened; head `cd37d851bb2`. Old head kept on `jmchilton/licenses_pre_rebase_backup`.
