# Checklist evaluation — 2026-10-17

Fresh read-only review of `caa4acc3ad7..d8319abb97b` against GENERAL and WORKFLOW_RELATED. No must-fix found. Human read remains unchecked.

- [ ] Did a human read every test and every comment?
- [x] What does the user see when it fails? HTTP 400 names incompatible tools before history/invocation creation; missing-tool errors take precedence with version-sensitive wording.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? API tests verify rejection, exact diagnostics, distinct versions and absence of persisted run state.
- [x] Are baseline tests in their own leading commits (if applicable)? N/A; regression tests accompany their fixes in two focused commits.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc. — what purpose do they serve? N/A.
- [x] Which existing workflows change behavior (if any)? Incompatible tools reject before setup; identical nested references appear once in collected results and diagnostics.
- [x] Who hits this in practice and what is the evidence? Imported incompatible workflows, exercised by real installed `test_data_source` API cases with nesting and new/existing histories.
- [x] Were simpler or existing approaches considered? Yes; reuse canonical lookup/metadata and extend existing complete-dictionary equality through recursion.

## Evidence and boundaries

`WorkflowsService.invoke` validates before `build_workflow_run_configs`. `_check_workflow_tools` forwards ID, version, UUID, exactness and user to `get_tool`. Eager `has_tool` delegates to that same lookup. Cached tools support the compatibility property, but their `has_tool` has index shortcuts; do not claim unchanged behavior for every cached UUID edge case.

The manager deduplicates complete ID/version/UUID dictionaries, retaining distinct versions and UUIDs and first traversal order. The missing-tool listing also loses identical duplicate references; the agent TRS import consumer already deduplicates IDs. Distinct missing versions can still display the same ID twice in non-exact diagnostics.
