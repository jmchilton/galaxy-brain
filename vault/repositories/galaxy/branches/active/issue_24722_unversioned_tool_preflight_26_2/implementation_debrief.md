# Implementation debrief

**STATUS: READY.** This fixes [#24722](https://github.com/galaxyproject/galaxy/issues/24722) on `release_26.2`. Local head is `0e76ac8e20b`. The fork still has the pre-hardening head `dcfa201885c`, because the history rewrite needs a force-push that was not approved in-session; see Push below.

```
created .../differential-review/snapshots/20261104T163555Z-hardening-0e76ac8e20b1.json
  hardening @ 0e76ac8e20b1 vs origin/release_26.2 (merge-base 5b43cbd11de0)
  since 20261104T153451Z-implementation-dcfa201885cc:
    changed 99f05078e1b7 Baseline tests for unversioned shed tool ids in workflow invocation (1 differing hunk)
    new     215a1c4bb06b Extract _find_workflow_tool from the workflow invocation tool pre-flight
    changed e389973cc5e4 Accept unversioned shed tool ids for exact-version workflow invocation (2 differing hunks)
    new     0e76ac8e20b1 Name installed versions when an exact-version workflow tool is missing
```

## Commits

1. `99f05078e1b` **Baseline tests.** Pins that toolbox `exact` means exact id, plus unversioned-guid invocation behavior that already passes (non-exact invoke; exact invoke with an uninstalled version gives a 400). Includes the `_assert_missing_tools` helper.
2. `215a1c4bb06` **Refactor, no behavior change.** Extracts `_find_workflow_tool` from `_check_workflow_tools`.
3. `e389973cc5e` **Fix.** Adds `AbstractToolBox.get_tool_at_version(tool_id, tool_version)`: try the exact id, then lineage/old id, and accept only the requested version. The pre-flight and `ToolModule.__init__` fall back to it after an exact-id miss when a `tool_version` is given and there is no uuid. Unversioned guids and short ids at an installed version now invoke under `require_exact_tool_versions=True`, and save/update no longer marks them missing. `tool_id` is stored as given.
4. `0e76ac8e20b` **Re-scope.** In exact mode, the missing-tool 400 names the versions installed under that id that the user may access, e.g. `compose_text_param (version 0.0.1, installed: 0.1.0)`. Non-exact messages, and ids with nothing installed, are unchanged.

## Scope

- The first scope evaluation recommended the error-message expansion, and it was taken ([rescope debrief](implementation_rescope_debrief.md)). The original scope is kept as `issue_24722_unversioned_tool_preflight_26_2_alt_original_scope` on the fork ([alt](alts/original_scope.md)).
- The second scope evaluation says **keep** ([scope_evaluation.md](scope_evaluation.md)). It lists three ways to split this into PRs; the baseline commit can go out on its own.

## Decisions for review

- **Base `release_26.2`.** The bug goes back to 25.1, but #24209 restructured the pre-flight on 26.2.
- **Short ids at an installed version now pass exact-version checks on the eager toolbox.** `CachedToolBox` already allowed this.
- **`has_tool` true but `get_tool` returning None is now reported missing.** It was silently skipped before. This can't happen on the eager toolbox.
- **Changed message assertions:** `test_workflow_invocation.py::test_run_workflow_with_missing_tool` and `test_tool_source_storage.py::test_exact_workflow_invocation_reports_missing_tool_version` now expect the `installed:` suffix.

## Known limitations

- The `CachedToolBox` "installed:" note is incomplete for a self-contradictory reference: an installed versioned guid with a different `tool_version` (Codex P2). The note is incomplete but never wrong.
- An eager short id shared by two repositories pools their versions, and resolves to the first one registered.
- `dev` follow-up: make `get_tool(exact=True)` match lineage at the requested version. That would remove `get_tool_at_version` and both fallbacks.

## Validation

- Unit: `test/unit/app/tools/` and `test/unit/workflows/` (1275 passed, earlier in the session); `test_toolbox.py` at HEAD (58 passed, 2 xpassed).
- Integration at HEAD: `test_workflow_invocation.py` + `test_tool_source_storage.py`, 46 passed on the eager and cached toolboxes. `test_curated_workflows.py` passed earlier in the session.
- API: `test_workflows.py -k "missing or incompatible or refactor or upgrade or version or import"`, 84 passed, 1 skipped.
- `make format` clean. mypy has no errors on changed lines.
- No CI yet.

## Push

The fork's `issue_24722_unversioned_tool_preflight_26_2` is at `dcfa201885c`. Every commit after the first was reshaped during hardening, so updating it needs `git push --force-with-lease jmchilton HEAD` from the worktree. That push was blocked in-session. Separately, an earlier `git push origin` briefly created this branch on `galaxyproject/galaxy`. It was deleted right away, and no PR was opened.

Reviews: [normal](subagents/normal_review.md), [re-scope](subagents/rescope_review.md), [test challenges](test_challenges_debrief.md), [Codex](codex_review.md), [thermo-nuclear](thermo_nuclear_review.md), [refactor baseline](baseline_refactor.md), [scope](scope_evaluation.md), [first hardening](earlier_drafts/1/).
