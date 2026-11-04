Run via Claude Opus 5.5 at high effort.

**Recommendation: keep.** The branch now covers every entry point the issue names. The invocation pre-flight accepts an unversioned shed guid or short id that names an installed version. Save (`ToolModule.__init__`) no longer records the installed tool as missing. When a version really is missing, the 400 names the versions that are installed under that id, so the misleading "not installed" text the issue complained about is gone in the cases that still fail. That last change was the modest expansion the first evaluation recommended, and it is done. Every `exact_tools=True` path in workflow code (create, update, embedded subworkflows) goes through `ToolModule.__init__`, so no sibling site is left unfixed. The remaining candidates are either `dev`-only semantic changes (`get_tool(exact=True)` matching by version), changes the proposal rejected (normalizing ids on save, versioned ids in `ga` export), a separate API-shape change (missing tools in the save response), or display polish on an edge case (cached-toolbox lineage listing). None of them is a related bug in touched code that reviewers would expect fixed here.

## Possible Decompositions

The branch has 4 commits, +182/-30 lines: about 95 production lines (`base.py`, `services/workflows.py`, `modules.py`) and about 115 test lines.

- **Option A (as is):** one PR in commit order: baseline tests, the `_find_workflow_tool` extraction refactor, the fix, then installed versions.
- **Option B (two PRs):** PR 1 holds the baseline tests and the behavior-preserving `_find_workflow_tool` extraction (`99f05078e1b`, `215a1c4bb06`). PR 2 holds the fix and the installed-versions message (`e389973cc5e`, `0e76ac8e20b`).
- **Option C (three PRs):** like B, but the installed-versions message (`0e76ac8e20b`) lands as a small PR on top of the fix. If a reviewer objects to the message change or to the extra lookup on the error path, it can be dropped alone. `alt_original_scope` is essentially this split without the refactor commit.

The fix itself shouldn't be split further: `get_tool_at_version` has no caller without the two call sites.

## Scopes considered

### 1. As implemented (recommended)

`AbstractToolBox.get_tool_at_version` tries the exact id, then a lineage lookup, and accepts only the requested version. The pre-flight (through `_find_workflow_tool`) and `ToolModule.__init__` fall back to it on an exact-id miss when a version is given and there is no uuid. For exact-mode misses, `_describe_missing_tools` adds `installed: …`, filtered by `allow_user_access`.

| Pros | Cons |
| --- | --- |
| - Fixes stored workflows and every API client, at both save and invoke<br>- Toolbox `exact` semantics are unchanged for job and `tool_for_job` callers<br>- A real version mismatch now says what is installed, not "not installed"<br>- The behavior-preserving refactor commit keeps the fix diff small | - The `exact and version and not uuid` guard is duplicated at two call sites (accepted in thermo-nuclear)<br>- Message text changed, and three test assertions were updated with it<br>- The cached toolbox can under-list lineage versions for a self-contradictory reference (Codex P2, recorded as a limitation) |

### 2. Contract to the original scope (`_alt_original_scope`)

Drop the installed-versions commit and keep the fix only.

| Pros | Cons |
| --- | --- |
| - Smaller diff; leaves the error text unchanged<br>- No extra lookup on the error path | - A true mismatch (pins 0.0.1, 0.1.0 installed) still reads as "not installed", which is the issue's complaint<br>- Reverses the expansion that was already reviewed, tested on both toolboxes and hardened |

### 3. Make the installed-versions list complete under `CachedToolBox` (Codex P2)

For an indexed versioned guid, walk the lineage instead of the guid's `configured_versions`.

| Pros | Cons |
| --- | --- |
| - The note would list every version under both toolboxes | - Reached only by a self-contradictory reference (installed `…/0.1` guid with `tool_version` 0.3)<br>- The note is incomplete, never wrong<br>- Would need guid parsing or cached-toolbox changes on an error path; cost exceeds benefit |

### 4. Make `get_tool(exact=True)` match by version through lineage

Remove the `elif exact: continue` short-circuit, mirror it in `CachedToolBox`, then delete `get_tool_at_version` and both fallbacks.

| Pros | Cons |
| --- | --- |
| - The root-cause fix; the end state is simpler | - Changes every exact caller (job handler, `tool_for_job`, tool tests); upstream comments warn it breaks built-in tool tests<br>- The two toolboxes' exact semantics already differ, so aligning them is a project of its own<br>- Every reviewer (Codex, thermo-nuclear, baseline refactor) called it a `dev` follow-up |

### 5. Normalize `tool_id` to the versioned guid on save

| Pros | Cons |
| --- | --- |
| - New workflows store canonical ids | - Does nothing for stored workflows, which the fix already covers<br>- Changes persisted and exported data; breaks intentional unversioned round trips<br>- Rejected in the proposal |

### 6. Emit versioned ids from `download?style=ga`

| Pros | Cons |
| --- | --- |
| - Round trips produce invocable workflows even on unpatched servers | - Redundant now that invocation accepts unversioned ids<br>- Export stops reproducing what was stored<br>- Rejected in the proposal |

### 7. Report missing tools in the plain `POST /api/workflows` success response

| Pros | Cons |
| --- | --- |
| - API clients would learn about real missing tools at save time | - This bug's save symptom is already gone: save now finds the tool<br>- For genuinely missing tools it changes the API response shape, which is separate from this bug<br>- Better as its own issue, targeting `dev` |

<details><summary>Details: coverage check of sibling paths</summary>

`exact_tools` reaches the toolbox only through `ToolModule.__init__`. `WorkflowStateResolutionOptions.exact_tools` (create/update, carried into embedded subworkflows) feeds it, and the editor, run form, export and `inject_all` paths force `exact_tools=False`. `require_exact_tool_versions` reaches the toolbox only through `_check_workflow_tools`. The other `exact=True` callers in `lib/galaxy` are the job handler and `tool_for_job`. They resolve jobs, which store fully versioned ids, so this bug doesn't affect them. No unfixed sibling site remains in the code the branch touches.

</details>
