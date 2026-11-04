Run via Claude Opus 5.5 at high effort.

# Thermo-nuclear code quality review

I changed no code. The review found no structural regression and no blocker. Its findings are minor, and each fix would add churn or loosen a type on a release-branch fix without removing a concept. The new unit tests still pass (`test_toolbox.py -k "exact_lookup or at_version"`: 2 passed). Nothing security-sensitive came up.

Not acted on:
- **#1, the fallback guard appears at two call sites.** `exact and version and not uuid` → `get_tool_at_version` is in both `_check_workflow_tools` and `ToolModule.__init__`. Moving the guard into the toolbox would mean `get_tool_at_version` taking an optional version and a uuid, which loosens its `str` contract to save one line per site. The proper fix is to make `get_tool(exact=True)` follow lineage at the requested version. The upstream comment in `get_tool` says that change breaks many tests, so it belongs on `dev`, not in this fix.
- **#2, the pre-flight has an inverted `if not has_tool ... else`.** The `else` is needed so a tool found by the fallback isn't overwritten. Every reordering I tried either duplicates the `missing_tools.append; continue` or changes what happens when `has_tool` is true but `get_tool` returns `None`. The earlier normal review already settled this shape.
- **#3, `str(tool_version)` is redundant in `get_tool_at_version`.** The argument is typed `str`, but at runtime it comes from `step.tool_version` and `get_all_tools` dicts. The `str()` costs nothing and is a cheap guard, so I kept it.
- **#4, the "exact means exact tool id" rationale appears three times** (docstring and both call sites). Each copy is one or two lines and explains a non-obvious guard at that site. Acceptable.
- **#5, file size.** `base.py` (1861 lines) and `modules.py` (3792) were already over 1k lines. The branch adds 16 and 4 lines and crosses no threshold.

<details><summary>Full review</summary>

Scope: `git diff upstream/release_26.2...HEAD`. There are two commits: the baseline tests, then the fix. The diff touches `toolbox/base.py` (+16), `services/workflows.py` (+16/-9), `workflow/modules.py` (+4), plus tests.

**Structure / code judo.** The real cause of the bug is that `AbstractToolBox.get_tool(exact=True)` means "exact tool id", and skips lineage and short-id resolution even when the requested version is installed. The code-judo move would be to fix those semantics inside `get_tool` (the `elif exact: continue` that the upstream comment already flags as suspect). That would remove the new method and both call-site fallbacks. It is not suitable for `release_26.2`: the upstream comment says the change breaks many built-in tool tests, and every `exact=True` caller would change behavior. The branch instead adds one narrow toolbox method, `get_tool_at_version`, in the layer that owns tool resolution, and opts in at exactly the two workflow entry points that need it. For a release-branch fix, this is the right ownership boundary.

**`get_tool_at_version`.** Small, pure, and correctly placed on `AbstractToolBox`, so `CachedToolBox` inherits it through its `get_tool` override. The loop over `exact in (True, False)` with a post-check `tool.version == tool_version` is direct. It reuses `get_tool` rather than walking `_lineage_map` itself, so it adds no duplicate resolution logic. The docstring explains why the exact id is tried first. Not a thin wrapper: it adds a real invariant, that it never falls back to another version.

**`_check_workflow_tools`.** The added nesting (an inner `if`, then `if tool is None: continue`) is the most tangled part of the diff, but it is local to the existing availability branch and keeps the upstream `has_tool`-first contract. That contract matters: `CachedToolBox.has_tool` and `get_tool` disagree for exact requests, as the upstream comment notes. Reordering it would either duplicate the missing-tool bookkeeping or change the edge case where `has_tool` is true and `get_tool` returns `None`. Accept.

**`ToolModule.__init__`.** A single guarded fallback after the existing lookup. The `get_safe_version` branch below stays unreachable for fallback hits, because the versions match by construction. Clean.

**Duplication.** The guard is repeated at two sites (finding #1). Two sites with a three-clause guard is tolerable. Centralizing it would cost type precision.

**Types / boundaries.** No casts, no `Any`, no new optionality. The return type `ToolLike | None` matches `get_tool`.

**Tests.** The unit tests pin both the pre-existing `exact` semantics (baseline) and the new method, including the no-fallback case. The integration tests cover non-exact, wrong version, exact with guid and short id (with a job-level tool id assertion), and the update path. They share an `_upload_compose_text_param_workflow` helper; no copy-paste.

**File size.** No threshold crossed (finding #5).

Verdict: approve as-is for the release branch. Follow-up for `dev`: make `get_tool(exact=True)` resolve lineage at the exact version, then delete `get_tool_at_version` and both fallbacks.

</details>
