```yaml
documents:
  - path: vault/repositories/galaxy/branches/active/tool_patches/index.md
    why: Parent-side decisions for the patch database (guid/_local keying, patches applied to the macro-expanded tree, synthetic fixtures only, out-of-scope list); the integration consumes `ToolPatchDatabase.apply_patches` and `ToolPatchInfo`.
  - path: vault/repositories/galaxy/branches/active/tool_security_static_findings/index.md
    why: Other parent; static-only port decisions (no runtime enforcement, no job refusals) that bound this integration.
  - path: vault/repositories/galaxy/branches/active/tool_patches/initial_implementation_debrief.md
    why: What the patch engine, database and `patch_state` carry and which caveats were accepted; needed to judge `PatchReview.patch` and the CLI patch-state output.
    load_when: Reviewing how patch state (`states`, digests, skipped/rejected patches) is reported.
  - path: vault/repositories/galaxy/branches/active/tool_patches/subagents/review_phase_cd.md
    why: Latest review of the patch store / index patch-state work; shows known weak spots in patch application and state reporting.
    load_when: Reviewing reliance on `patch_state` and `apply_patches(..., guid=)` semantics.
  - path: vault/repositories/galaxy/branches/active/tool_patches/plan.md
    why: Patch file model, codes and policy knobs (`tool_patch_*`) behind the `--tool-patch-path` CLI option.
    load_when: Mapping CLI flags to database construction and policy defaults.
  - path: vault/repositories/galaxy/branches/active/tool_patches/brain_research.md
    why: Sibling research (store/populator, tool source loading seams, guid format); reuse instead of redoing. Guid keys matter for the `guid` argument of `review_patches`.
    load_when: Deciding how the CLI derives a guid for a tool file outside a toolbox.
  - path: vault/repositories/galaxy/branches/active/tool_security_static_findings/brain_research.md
    why: Sibling research (analyser layout, report/Finding model, CLI, packaging, MANIFEST/docs conventions, stale-note corrections); `Finding`, `Report` and `__main__` are what the integration extends.
    load_when: Reviewing changes to `report.py`, `__main__.py` and the docs page.
  - path: vault/repositories/galaxy/branches/active/tool_security_review_spec/initial_implementation_debrief.md
    why: What the finding rules/codes mean and how reports are built; needed to judge whether `finding_match` (rule, kind, location, refs) is a stable identity across a patch.
    load_when: Reviewing cleared/introduced matching and its false-positive/false-negative cases.
  - path: vault/research/Component - YAML Tool Parser and Authoring Model Boundary.md
    why: How ToolSource objects are built (get_tool_source, macro expansion, YAML tools bypassing the XML tree); the CLI loads tools outside a toolbox and patches only apply to the expanded XML tree.
    load_when: Checking CLI tool loading, macro-using tools and non-XML tools in patch review.
  - path: vault/research/Component - Tool Testing Infrastructure.md
    why: How tool XML is loaded in unit tests; guidance for `test_patch_review.py` fixtures.
    load_when: Reviewing or extending the unit tests.
  - path: vault/agents/gx_research/todo/tool_command_templating_and_sanitizers.md
    why: Pending scope for sanitizer/Cheetah behavior; patches that change sanitizer options or command text are the cases where findings clear or appear.
    load_when: Judging which patch edits plausibly clear or introduce findings.
research_requests: []
```

Notes (no document covers these; read the code at WORKING_DIRECTORY):

- Integration lives in `lib/galaxy/tool_util/security/patch_review.py` (`review_patches`, `finding_match`, `PatchReview`), `__main__.py` (`--tool-patch-path`), `report.py`, `doc/source/admin/tool_security_review.md` and `test/unit/tool_util/security/test_patch_review.py`; the HEAD commit holds the whole integration.
- No note covers finding identity across edits or patch-state reporting; both are small and answered by the code. No research request queued: nothing here is a substantial, reusable component gap beyond what the two sibling records already queued.
