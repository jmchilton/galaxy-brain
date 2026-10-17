Toward 🎯 #20900 — reject workflow-incompatible tools before creating run state, and report repeated nested tool references once per complete reference.

An imported workflow can contain an installed tool that cannot run in workflows. Detect that before constructing the run, so invoking a workflow with `test_data_source` returns HTTP 400 naming the tool without leaving a requested empty history. Missing tools are checked at the same boundary and retain precedence over incompatible tools.

| Workflow tools | Result |
| --- | --- |
| Installed but workflow-incompatible | HTTP 400 naming the incompatible references; no requested history or invocation |
| Missing and incompatible | Existing missing-tool error takes precedence, before history creation |
| Same ID/version/UUID in parent and child | One reference and diagnostic entry |
| Same missing ID with versions 0.1 and 0.2 | Both references retained; exact-version mode names both versions |
| Available and workflow-compatible | Normal invocation |

***This validates invocation requests, including imported workflows containing installed tools that cannot run in workflows; other invocation checks remain in place.*** The scheduler's existing compatibility backstop remains in place.

***Nested deduplication uses the complete ID/version/UUID reference, so distinct versions or UUIDs remain separate—even when non-exact diagnostics display the same ID twice.*** The shared collector now applies its existing local uniqueness rule while merging child workflows, also removing identical repeated entries from missing-tool listings.

The readiness check resolves each collected reference through the canonical toolbox lookup, passing the existing version, UUID, exactness and user arguments, and reads compatibility metadata from the result.

## Risks

API callers receive earlier tool-readiness errors, and consumers of the shared recursive collector receive one entry per distinct complete reference.

<details><summary>Risk Details</summary>

- Tool-readiness failures can take precedence over other invalid request fields because validation runs before run configuration and history creation.
- Repeated nested references stop producing repeated entries; distinct versions and UUIDs must remain separate and ordered by first occurrence.
- Compatibility now requires resolving tool metadata early; cached-tool UUID lookup follows `get_tool` semantics rather than an availability-index shortcut.

</details>

<details><summary>Risk Review Advice</summary>

Review the boundary before `build_workflow_run_configs`, missing-tool precedence, and the complete-reference equality in the shared collector. API regressions cover nested duplicates, distinct versions, exact/non-exact diagnostics and persistence side effects; the compatible-workflow control exercises successful invocation.

</details>

## Context

Independent extraction from 🌿[issue_20900_invocation_validation](https://github.com/jmchilton/galaxy/tree/issue_20900_invocation_validation), targeting `release_26.2`. ***This branch has no dependency on the other invocation-validation extractions.*** The earlier scope is retained on 🌿[invocation_tool_compatibility_alt_original_scope](https://github.com/jmchilton/galaxy/tree/invocation_tool_compatibility_alt_original_scope); it adds early readiness validation without the recursive deduplication correction.

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep early tool readiness and complete-reference uniqueness across subworkflows.</summary>

The revised scope fixes repeated nested diagnostics using the existing collector contract. A typed/set-backed collector and a larger invocation-readiness framework remain separate work.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Real API requests check rejection before persistence and preserve distinct nested versions.</summary>

Ten rejection cases cover top-level/nested incompatible tools, new/existing histories, missing-tool precedence and exact/non-exact version diagnostics. A compatible-workflow execution is the positive control. Recorded rescope runs passed all eleven cases; the six nested cases fail on the pre-rescope branch while four top-level controls pass.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>Reuse canonical lookup and recursive equality without another traversal or readiness framework.</summary>

The correction extends the collector's existing uniqueness rule through child merges. Metadata is available through the tool protocol and the runtime backstop is retained.

</details>

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? HTTP 400 names incompatible tools, or returns the missing-tool error before creating run state.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. API cases verify diagnostics, distinct versions and persistence effects.
- [x] Are baseline tests in their own leading commits (if applicable)? N/A; regression tests accompany the fixes.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc. - what purpose do they serve? N/A.
- [x] Which existing workflows change behavior (if any)? Incompatible workflows reject early; identical nested references produce one collector/diagnostic entry.
- [x] Who hits this in practice and what is the evidence? Callers invoking imported incompatible workflows; real installed-tool API cases exercise the boundary and a compatible workflow executes.
- [x] Were simpler or existing approaches considered? Yes. Reuse canonical lookup and extend the existing collector rather than adding a second traversal or framework.

## How to test the changes?

- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Focused API validation</summary>

Run `lib/galaxy_test/api/test_workflows.py` with the selection `run_with_workflow_incompatible_tool or run_with_missing_and_incompatible_tools or run_with_nested_missing_tool_versions or test_run_workflow_by_name`, using Galaxy's API test harness and the standard sample tool configuration.

Fresh polish verification on `d8319abb97b`: **11 API cases passed**. Black, isort and whitespace checks pass. Fork CI is pending on the rebased head; previous-head API, workflow-framework and Python-lint suites passed. Its Python 3.14 unit failure is an unrelated request-session test race (`gx_app=None` in a background thread).

</details>

## License

- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
