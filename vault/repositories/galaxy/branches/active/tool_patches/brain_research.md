```yaml
documents:
  - path: vault/agents/gx_research/todo/cached_toolbox_tool_source_store.md
    why: Pending scope for the missing cached toolbox / source store note (populator paths, ToolIndex, freshness/trust gates, composite stores, lease); the best description of what patch hooks must fit into until the note exists. Read the code under lib/galaxy/tools/source_store/ and cached_toolbox.py.
    load_when: Wiring populator process_tool, the incremental fast path, freshness token, ToolIndexEntry and manifest.
  - path: vault/repositories/galaxy/reviews/archived/24666/learning_galaxy.md
    why: Best prose walkthrough of the store architecture (every process builds its own CachedToolBox, inline populate through a separate store instance, composite read-only stores, populate lease, create_all race); informs where patch config must be identical across processes.
    load_when: Deciding multi-process behavior of patch digests in the freshness token and populate skip logic.
  - path: vault/repositories/galaxy/reviews/archived/24666/index.md
    why: Links the review artifacts (risks.md, performance_challenges_review.md, perf_index_bench.py) for the store/populator and its populate lease, merged to release_26.2.
    load_when: Checking populator concurrency risks or benchmarking the incremental fast path.
  - path: vault/research/Component - YAML Tool Parser and Authoring Model Boundary.md
    why: Row 1 (~L60) lists every caller of ToolBox.get_expanded_tool_source (toolbox, tool shed validator, populator, galaxy-tool-util, test utilities) and the enable_beta_formats routing; tells you which seams a patch hook must cover or consciously skip, and that YAML tools bypass the XML tree.
    load_when: Choosing seams and deciding how non-XML tool sources are treated.
  - path: vault/research/Component - Dynamic Tool Manager and Toolbox Lifecycle.md
    why: Toolbox registration (`_tools_by_id/_tools_by_uuid`, `_register_cached_entry`), reload swapping a fresh toolbox, and which tools are never cached; context for reload_tool_by_id keeping guid and for dynamic/user tools being out of patch scope. Line numbers are for an older SHA.
    load_when: Changing reload_tool_by_id or deciding which tool kinds get patched.
  - path: vault/repositories/galaxy/branches/active/issue_24722_unversioned_tool_preflight_26_2/brain_research.md
    why: Prior pointer set for toolbox get_tool/has_tool lookup and CachedToolBox.has_tool (version-aware index path, short-id alias fallback); lists test files to reuse (test/integration/test_tool_source_storage.py::TestCachedToolBoxApi, test/unit/app/tools/test_toolbox.py two-version shed fixture).
    load_when: Writing cached toolbox / eager toolbox tests and the integration test.
  - path: vault/repositories/galaxy/branches/active/issue_24722_unversioned_tool_preflight_26_2/implementation_debrief.md
    why: Recent branch that touched toolbox lookup and cached-vs-eager parity; shows how parity was tested and what caveats were accepted.
    load_when: Judging cached vs eager parity expectations for tool.patch / patches in to_dict.
  - path: vault/research/Component - Jobs API and Job Cache.md
    why: JobSearch matching rules (`by_tool_input`, `__search`, `_filter_jobs`, `managers/jobs.py` ~L443-1590), early search in Tool.completed_jobs and late search in the job wrapper, IGNORED_NON_JOB_PARAMETERS; needed for the conservative job-cache skip.
    load_when: Implementing and testing the JobSearch skip for patched tools.
  - path: vault/research/Component - Tool Testing Infrastructure.md
    why: How tool XML is loaded and tested (test/functional/tools, planemo) and macro/tool-source loading outside a toolbox; relevant to the fixture collection and to macro-expanded tree assumptions.
    load_when: Authoring fixture tools/collection for the integration test.
  - path: vault/research/Component - Tool Install YAML.md
    why: Documents how the Tool Shed assembles the guid `<host>/repos/<owner>/<name>/<tool_id>/<version>` (~L183, L596) and changeset revision semantics; the guid key format for patches.
    load_when: Defining guid parsing/normalization (host prefix handling) for patch keys.
  - path: vault/projects/toolshed/TOOL_SOURCE_API_DESIGN.md
    why: Design discussion of exact changeset selection and original committed bytes (raw tool source vs macro expansion, checksum identity); adjacent prior thinking on changeset-keyed tool source identity.
    load_when: Reasoning about changeset identity vs installed_changeset_revision for override files.
  - path: vault/research/Component - Tool Linters.md
    why: Lint framework; patches that change profile-gated behavior or tool XML structure should be consistent with linters if a patch-validation lint is considered.
    load_when: Only if adding patch-file validation to linters.
  - path: vault/repositories/galaxy/branches/active/tool_patches/index.md
    why: Decisions already recorded by John (guid/_local keying, policy defaults, on-disk changeset lookup, out-of-scope list, synthetic fixtures only).
research_requests:
  - vault/agents/gx_research/todo/cached_toolbox_tool_source_store.md
  - vault/agents/gx_research/todo/tool_shed_install_layout_and_changesets.md
```

Notes (no document covers these; read the code at WORKING_DIRECTORY):

- No note covers config schema conventions (`lib/galaxy/config/schemas/config_schema.yml`, per-option `desc`/`type`/`default`/`path_resolves_to` and the generated sample/docs), tool macro expansion itself (`galaxy.util.xml_macros`, `load_tool_with_refereces`), `ToolBox.get_expanded_tool_source` internals (`lib/galaxy/tools/__init__.py:833`) or `process_tool` (`source_store/populator.py:849`). Reading the code answers these quickly.
- `Component - YAML Tool Parser ...` cites the populator call at `populator.py:856`; current line is `process_tool` at `:849` and `get_expanded_tool_source` at `tools/__init__.py:833` (line drift only, not a conflict).
- Integration-test convention precedent: `test/integration/test_tool_source_storage.py` (cached toolbox and store integration tests); reuse its driver/config helpers rather than adding new ones.
- Source-store unit tests live next to the store tests under `test/unit/app/tools/` and `test/unit/app/`; find them with `grep -rl source_store test/unit`.
- Related sibling branches in the vault touching the same seams: `tool_help_relative_images` (index/tool_dir handling) and `tool_security_review_spec` (static security review of tool XML templates; shares the get_expanded_tool_source seam). Keep any vulnerability descriptions out of notes.
