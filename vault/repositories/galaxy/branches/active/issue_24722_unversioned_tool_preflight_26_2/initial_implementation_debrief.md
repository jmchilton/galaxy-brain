# Initial implementation debrief

Fixes [#24722](https://github.com/galaxyproject/galaxy/issues/24722) on `release_26.2`. Head `dcfa201885c` on `jmchilton/issue_24722_unversioned_tool_preflight_26_2`.

```
created .../differential-review/snapshots/20261104T153451Z-implementation-dcfa201885cc.json
  implementation @ dcfa201885cc vs origin/release_26.2 (merge-base 5b43cbd11de0)
  first snapshot: 2 commits, 5 files, 6 hunks
```

## Change

- New `AbstractToolBox.get_tool_at_version(tool_id, tool_version)`. It tries the exact id, then a non-exact (lineage/old id) lookup, and accepts a result only at the requested version. The toolbox's `exact` semantics are unchanged.
- `_check_workflow_tools`: when the exact-id `has_tool` misses and the request is exact-version with a `tool_version` and no `tool_uuid`, the pre-flight falls back to `get_tool_at_version`. A version mismatch is still reported as missing.
- `ToolModule.__init__`: same fallback when `exact_tools` misses. Updating a workflow with an unversioned guid no longer fails with "contains missing tools", and import no longer records the step as missing. `tool_id` is stored as given.

## Tests

- Baseline commit: a toolbox unit test pinning that `exact` means exact id, and integration tests for unversioned-guid invocation (non-exact passes; exact with an uninstalled version gives the same 400).
- Fix commit: a `get_tool_at_version` unit test; integration tests for an exact-version invoke with an unversioned guid and with a short id (the job runs as the versioned guid), plus a download → PUT round trip. `TestCachedWorkflowInvocation` inherits all of them, so they run under both the eager and the cached toolbox.
- Green: `test/unit/app/tools/`, `test/unit/workflows/`, `test/unit/workflow/test_curated_toolbox.py`, `test/integration/test_workflow_invocation.py` (22), `test_tool_source_storage.py` + `test_curated_workflows.py` (51), and `lib/galaxy_test/api/test_workflows.py -k "missing or refactor or upgrade or version or import"` (81).

## Decisions

- Base `release_26.2`. The bug goes back to 25.1, but #24209 restructured the pre-flight on 26.2.
- Short ids are accepted under exact versions. This brings the eager toolbox in line with `CachedToolBox`, which already did so.
- Fixed in the pre-flight and the module rather than by normalizing ids on save or download, per the issue proposal.

## Known limitations

- An unversioned guid whose version isn't installed gets no `WORKFLOW_SAFE_TOOL_VERSION_UPDATES` upgrade. This is unchanged.
- An eager-toolbox short id shared by two repositories at the same version resolves to the first one registered, as non-exact lookups already do.

Review: [normal review](subagents/normal_review.md).
