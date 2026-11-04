Run via Claude Opus 5.5 at high effort.

**Recommendation: expand modestly.** Keep the pre-flight and `ToolModule` fallback as implemented, and also make the exact-version missing-tool error say what is installed. When an exact-version reference still misses but the id resolves non-exactly to a tool in the same lineage, the 400 should list the installed versions (e.g. "…/tp_cat (version 9.10): installed versions 9.11+galaxy0") rather than imply the tool is absent. This touches only `_describe_tool_references`/`_check_workflow_tools`, which the branch already edits. It removes the misleading "not installed" text that the issue complains about, for the failures that remain after this fix. It is the issue's "message-only" alternative, done alongside the real fix rather than in place of it. Do not take the larger expansions (changing `get_tool(exact=True)` semantics, normalizing ids on save, or versioned ids on download) on `release_26.2`.

## Possible Decompositions

The branch is about 125 added lines: about 45 of production code and 90 of tests, in two commits.

- **Option A (as is):** one PR. The baseline-tests commit comes first, then the fix.
- **Option B:** PR 1 holds the baseline tests only (`test_toolbox.py` exact-id pin, plus integration tests for non-exact invocation and the exact-version miss). PR 2 holds `get_tool_at_version`, both call-site fallbacks and their tests. If the recommended error-message expansion is taken, it can go in PR 2 or in a small PR 3 that lands on top of it.

The fix is too small to be worth splitting further, because the toolbox method has no caller without the two call sites.

## Scopes considered

### 1. As implemented

The branch adds `AbstractToolBox.get_tool_at_version`, which tries the exact id first, then a lineage lookup, and accepts only the requested version. The invocation pre-flight and `ToolModule.__init__` fall back to it on an exact-id miss when a version is given and there is no uuid. Ids are stored and exported as given.

| Pros | Cons |
| --- | --- |
| - Fixes existing stored workflows and every API client (planemo, BioBlend)<br>- Leaves the toolbox's `exact` semantics alone for other callers (job handler, `tool_for_job`)<br>- Fixes save too: a step is no longer recorded as a missing tool<br>- Brings the eager toolbox in line with `CachedToolBox`, which already accepted short ids | - The fallback guard is duplicated at two call sites (thermo-nuclear #1, accepted)<br>- A real exact-version miss still says "not installed" even when another version is installed under that id |

### 2. As implemented, plus an informative exact-version error (recommended)

When a reference is reported missing in exact mode, run one non-exact lookup. If it finds a tool, add that tool's lineage versions to the message, or at least its resolved guid and version.

| Pros | Cons |
| --- | --- |
| - In code the branch already touches; about 10 lines plus one assertion in an existing integration test (`test_run_workflow_with_missing_tool` or the new uninstalled-version baseline)<br>- Addresses the issue's complaint that the error "sends people to check tool installation" in the cases that still fail<br>- Error text only; no behavior change | - Changes the 400 message text, which some tests or clients may match. Keep the existing prefix and append the extra detail<br>- One extra lookup per missing tool, on the error path only |

<details><summary>Details</summary>

`_describe_tool_references` currently formats each entry as `tool_id (version X)`. The pre-flight already has the toolbox in hand. Doing a non-exact `get_tool` for each missing reference, and appending `installed: …` from `tool.lineage.tool_versions` when it exists, is a contained change. It also helps the true-mismatch case the issue table doesn't show: a workflow that pins 0.0.1 while 0.1.0 is installed.

</details>

### 3. Fix `get_tool(exact=True)` to follow lineage at the requested version

Remove the `elif exact: continue` short-circuit in `AbstractToolBox.get_tool`, so exact means "exact version". Then delete `get_tool_at_version` and both fallbacks.

| Pros | Cons |
| --- | --- |
| - The root-cause fix; the code would be simpler in the end<br>- Every exact caller gets the same semantics | - Changes behavior for every `exact=True` caller; the upstream comment says it breaks many built-in tool tests<br>- Must be mirrored in `CachedToolBox`<br>- Too risky for `release_26.2`. Codex and thermo-nuclear reviews both call it a `dev` follow-up |

### 4. Normalize `tool_id` to the versioned guid on save

| Pros | Cons |
| --- | --- |
| - New workflows store canonical ids | - Does nothing for workflows already stored<br>- Changes persisted and exported data, and breaks round trips for gxformat2/`ga` sources that use unversioned ids on purpose<br>- The issue proposal already rejected it |

### 5. Emit versioned ids from `download?style=ga`

| Pros | Cons |
| --- | --- |
| - Download → re-upload round trips produce invocable workflows even on older servers | - Redundant once invocation accepts unversioned ids<br>- Export no longer reproduces what was stored<br>- Rejected in the proposal |

### 6. Surface missing tools in the plain `POST /api/workflows` success response

The issue table marks save with ⚠️ because a `{"workflow": …}` body returns plain success even when steps resolve to missing tools.

| Pros | Cons |
| --- | --- |
| - API clients would learn about real missing tools at save time | - The branch already removes this symptom for this bug: save now finds the tool<br>- For genuinely missing tools, this is an API response-shape change that is separate from this bug<br>- Better as its own issue |

### 7. Safe-version upgrade for unversioned guids whose version isn't installed (normal-review #5)

| Pros | Cons |
| --- | --- |
| - Closes a listed known limitation | - `WORKFLOW_SAFE_TOOL_VERSION_UPDATES` holds only built-in short ids (`Filter1`, `__BUILD_LIST__`, converters, …), and those already hit the exact-id path. No shed tool can reach it, so there is nothing to fix |

### 8. Contract: pre-flight only, leave `ToolModule.__init__` unchanged

| Pros | Cons |
| --- | --- |
| - Four fewer lines | - Save would still record the installed tool as missing (`has_errors`), and PUT-update would fail with "contains missing tools". That is the same bug through another entry point, and the proposal includes it explicitly |
