# Debrief

## Validity

- The bug is real, but the root cause is not what foundry#591's title says. `download?style=ga` does not strip versions. It echoes the stored `step.effective_tool_id` (`managers/workflows.py` L1913), and `save_to_step` stores the id as given. The probe in foundry#591 POSTed an unversioned id directly, and download was never involved.
- Root cause: `_check_workflow_tools` passes `require_exact_tool_versions` (API default `True`) as `toolbox.get_tool`/`has_tool`'s `exact`. That argument means *exact id*. An unversioned shed guid misses `_tools_by_id`, `exact` short-circuits with `continue`, and lineage and version matching never run. The run forms send `False` (#13335), so only API clients hit it.
- Red check on dev `7e16f446410` (temp worktree, since removed), using the two-version fixture in `test/unit/app/tools/test_toolbox.py`:
  - unversioned id + `tool_version="0.1"` + `exact=True` → `has_tool` returns False;
  - the same lookup with `exact=False` → resolves to `…/test_tool/0.1`;
  - the versioned guid with `exact=True` → True.
- Checked only on the eager `ToolBox`. `CachedToolBox` (opt-in) overrides `has_tool` and was not checked.

## Duplicates

- `gh search` on galaxyproject/galaxy for "required tools are not installed", "unversioned tool_id", "require_exact_tool_versions", versionless/guid variants, plus a reviewer re-search: no match.
- Related but distinct: #24209 (restructured the pre-flight in Oct 2026 and kept the same lookup), #13335 (introduced the flag), and foundry#584 (stale toolbox read, a separate cause).
- Nothing related turned up in the vault incubator, the issues index, or branches.

## Rewrite

- Reframed the issue around the invocation pre-flight rather than download, and added a show-first table with the API/UI split.
- Reviewer round (one pass):
  - Corrected the save column. The draft said save resolves the tool, but `exact_tools` defaults to True on save, so the step is recorded as tool-missing and `has_errors` is set, while the response is still success.
  - Dropped `GET ?legacy=false` "errors: null" as evidence. That view has no `errors` field.
  - Extended the Proposed Approach to the `ToolModule.__init__` save path, and checked it still keeps `test_run_workflow_with_missing_tool` (version-mismatch) red.

## Leftovers

- The save-path ⚠️ is read from code, not reproduced.
- The "normalize on save" alternative assumes save resolves the tool, which by default it does not. It's minor, and the alternative still reads as rejected.
- Short ids (`tp_cat`) and `CachedToolBox` were not checked.

## Assignment

No assignment. The issue came from scottcain's run, not John's work.
