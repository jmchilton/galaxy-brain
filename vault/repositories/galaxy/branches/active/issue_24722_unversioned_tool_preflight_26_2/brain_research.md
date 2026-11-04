```yaml
documents:
  - path: vault/repositories/galaxy/issues/queued/24722/proposal.md
    why: The issue body and proposed approach, with links to the exact lines (services/workflows.py _check_workflow_tools, modules.py ToolModule.__init__, toolbox get_tool `exact` semantics) and alternatives already rejected.
  - path: vault/repositories/galaxy/issues/queued/24722/debrief.md
    why: Validity analysis, the toolbox-level red check recipe (two-version fixture in test/unit/app/tools/test_toolbox.py), and the open items (short ids, CachedToolBox, save path not reproduced).
  - path: vault/repositories/galaxy/branches/merged/invocation_tool_compatibility/index.md
    why: PR #24209 (release_26.2) restructured _check_workflow_tools and is the direct predecessor; its review notes explain why has_tool decides availability and get_tool is only used for the compatibility check.
    load_when: Changing _check_workflow_tools or its tests.
  - path: vault/repositories/galaxy/branches/merged/invocation_tool_compatibility/checklist_evaluation.md
    why: States the cached vs eager has_tool caveat (CachedToolBox has index shortcuts, so don't claim identical behavior for every cached edge case) and exact-mode diagnostics wording.
    load_when: Deciding how the fix interacts with CachedToolBox.has_tool.
  - path: vault/repositories/galaxy/branches/active/issue_20900_invocation_validation/remaining_split_candidates.md
    why: Records how the pre-flight was split out, to preserve the missing-tool error wording and exact-version semantics.
    load_when: Reviewing whether existing error messages and tests still hold.
  - path: vault/research/Component - Workflow Import.md
    why: Module-building section (~L418-420) describes how tool_id/tool_version/exact_tools reach ToolModule.__init__ and toolbox.get_tool; the `exact_tools` default is listed at ~L571.
    load_when: Fixing the save-path miss in ToolModule.__init__.
  - path: vault/research/Component - Workflow API.md
    why: Documents the invocation payload (require_exact_tool_versions default True), the create/save flow, and missing-tool error behavior.
  - path: vault/research/Component - Dynamic Tool Manager and Toolbox Lifecycle.md
    why: Covers toolbox get_tool lookup order (uuid, user tools) and ToolModule.__init__ resolution at modules.py:2664-2700; line numbers are for an older SHA, so re-check against this branch.
    load_when: Touching get_tool / ToolModule.__init__ resolution ordering.
  - path: vault/repositories/foundry/issues/needs_decision/591/index.md
    why: The downstream report (foundry#591) and its observed failures; useful for real-world repro shapes (unversioned tp_cat guid, collapse_dataset etc.).
    load_when: Writing the regression test or PR description.
research_requests:
  - vault/agents/gx_research/todo/cached_toolbox_tool_source_store.md
```

Notes (non-document):

- Gap: no note covers the toolbox lookup layer (`AbstractToolBox.get_tool`/`has_tool`, `_tools_by_id`, lineage resolution, the `exact` flag meaning "exact id" not "exact version") or `CachedToolBox.has_tool` (`lib/galaxy/tools/cached_toolbox.py` ~L2006, which has its own version-aware index path and short-id alias fallback). The existing pending request `cached_toolbox_tool_source_store.md` covers the cached half; this branch was added to its "Requested by". The eager `get_tool` lineage logic has no note and wasn't queued (reading `lib/galaxy/tool_util/toolbox/base.py` answers it in a few minutes).
- Stale-note check: `Component - Workflow API.md` L512/L1026 says `require_exact_tool_versions=true` means "exact version matching"; that wording is the same conflation the issue describes. It does not conflict with the code but does repeat the misleading framing.
- Existing tests worth reading in the worktree: `lib/galaxy_test/api/test_workflows.py` (~L7994-8095: incompatible/missing tool and nested missing-version cases, parametrized on `exact`), `test/integration/test_workflow_invocation.py::test_run_workflow_with_missing_tool` (~L225, must stay failing for a version mismatch), `test/integration/test_tool_source_storage.py::TestCachedToolBoxApi` (~L295, ~L389 cached-toolbox exact invocation), `test/unit/app/tools/test_toolbox.py` (two-version shed fixture).
