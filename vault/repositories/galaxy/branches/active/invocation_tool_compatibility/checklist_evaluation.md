# Fresh polish checklist — invocation_tool_compatibility

Static review of supplied rebased diff and current source at `27e7daa34344d1a99066102e57dd45e894acac41`, against `release_26.2` (`579ca73440d776002b7099538cef000838687d8e`). No tests, Git operations, project-code mutations or publication performed.

## John's Checklist

- [ ] Did a human read every test and every comment? John must check this.
- [x] What does the user see when it fails? HTTP 400 naming incompatible tools, or the unchanged missing-tool message; no requested history or invocation is created.

<details><summary>Failure evidence</summary>

`services/workflows.py:invoke_workflow` calls `_check_workflow_tools` before `build_workflow_run_configs`. Incompatibility raises `RequestParameterInvalidException` with “Workflow was not invoked; the following tools are not workflow-compatible: …”. Missing tools retain their `MessageException` and plain/versioned messages, with missing tools taking precedence. The existing run form renders submission errors as “Workflow submission failed: …” (`client/src/components/Workflow/Run/WorkflowRun.vue:280-285`); this review did not execute the browser. Four new parameterized API cases assert HTTP 400, diagnostic content, no invocations and no newly named history. Incompatible-tool cases additionally assert no jobs in the fixture history.

</details>

- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes; new tests exercise real API requests, installed tools and persisted effects.

<details><summary>Tests and evidence limits</summary>

`test_run_with_workflow_incompatible_tool` uses installed `test_data_source` with existing/new history targets. The fixture declares `tool_type="data_source"`, rejected by the existing `AbstractTool.check_workflow_compatible`. `test_run_with_missing_and_incompatible_tools` tests exactness true/false, missing-tool precedence and plain/versioned diagnostics. Downloaded-workflow assertions establish that nonexistent_tool version 0.1 survived import, avoiding a vacuous missing-reference test. There are no mocks or helper-call assertions, and no existing assertions were weakened. Historical handoffs report four baseline failures at observable behavior assertions and five focused API passes including compatible execution in `test_run_workflow_by_name`; these were not rerun by this reviewer at the new head. Supplied range-diff reports the commit unchanged by rebase. Fresh validation belongs to the polishing parent.

</details>

- [x] Are the comments free of excess archeology? Yes; the diff adds no historical commentary.
- [x] If comments contain some description of previous implementation, bugs, etc., what purpose do they serve? N/A.
- [x] Which existing workflows change behavior (if any)? Workflows with unavailable or incompatible tools fail before history/run-configuration creation; compatible workflows retain their execution path.

<details><summary>Compatibility and ordering evidence</summary>

The unchanged `WorkflowsContentsManager.get_all_tools` (`managers/workflows.py:2624-2643`) recursively traverses subworkflows. Lookup arguments remain tool ID, version, UUID, exactness and user. Existing `AbstractToolBox.has_tool` (`tool_util/toolbox/base.py:991-1001`) already delegates to `get_tool(...) is not None`, preserving lookup/fallback behavior. The added protocol field already exists on eager tools and `CachedTool`; `tools/cached_toolbox.py:197-199` reads it from the cached entry without materialization. Runtime rejection remains at `workflow/modules.py:3113`. Earlier tool checking intentionally changes which diagnostic wins when requests also contain later run-config/input errors. This patch does not establish universal invocation atomicity.

</details>

- [x] Who hits this in practice and what is the evidence? API/imported-workflow callers with incompatible or missing tools; concrete API regressions demonstrate rejection and former unwanted histories.

<details><summary>Demonstrated impact</summary>

The uploaded workflow containing installed test_data_source is a concrete reproducer, tested against both existing and requested-new histories. A second real workflow containing test_data_source and nonexistent_tool reproduces missing-tool precedence and unwanted new-history creation. Historical handoffs document four baseline failures. No external incident count is established; do not claim that all of issue #20900 is resolved or cite agent agreement as evidence.

</details>

- [x] Were simpler or existing approaches considered? Yes; scheduler rejection happens too late, while a generalized preflight exceeds this standalone fix.

<details><summary>Alternatives</summary>

`scope_evaluation.md` compares checking compatibility at the old post-run-config location (less movement but leaves unwanted histories) with broader readiness validation (unrelated scope/dependencies). The helper instead reuses traversal and lookup, resolves each reference once, preserves missing-tool aggregation/precedence and reads existing compatibility metadata. A separate has_tool/get_tool pass duplicates work without improving behavior. No design decision from John is needed.

</details>

## Verdict and handoff

No implementation blocker or narrowly necessary code fix found. Human read remains unchecked; fresh execution evidence belongs to the parent polish process.

Refresh current tracking: implementation/normal-review debriefs name old head `8c8c67e4ae55a913be660e8912fd87a752e6ad9c` and base `0c70fdd5182c7425efecf7c8e76d6bd313de88b9`. Initial “uncommitted/no push” and implementation “Fork CI has not been assessed” statements are historical, superseded by later records. Preserve historical evidence as such rather than presenting it as current. Morning CI concerns the old head; do not represent it as new-head CI. No pr_description.md existed when reviewed.

Relevant focused validation: four new API parameter cases plus `test_run_workflow_by_name`, and applicable changed-file Python lint/typing. Existing hook tests are useful positive controls and historically reported passing. No browser changes warrant adding browser tests. This static review provides no new suite pass.

Follow GX_PR_DESCRIPTIONS.md when writing the description: one-line problem opener, concrete request example, risks (earlier rejection/error ordering), context identifying this independent extraction, factual summaries of existing debriefs, this checklist above the standard Galaxy checklist and exact new-head validation. Keep the human item unchecked.
