# Brain research: galaxy#24350 has_line_matching docs

The vault has no note on assertion semantics or the assertion-docs codegen pipeline (queued below). The closest material is the issue notes, the foundry triage that found the problem, and two component notes that mention the touched files in passing.

```yaml
documents:
  - path: vault/repositories/galaxy/issues/queued/24350/proposal.md
    why: Posted issue text; contains the reproduction, the doc wording to use, and the exact regeneration commands (codegen.py, make update-client-api-schema, client/src/components/Tool/rebuild.py).
  - path: vault/repositories/galaxy/issues/queued/24350/debrief.md
    why: Review round on the issue; records the open question (docs only vs grouping the wrap as ^(?:e)$) and why the "strip user anchors" idea was wrong.
    load_when: Deciding scope (docs only vs behavior change) or writing the PR description.
  - path: vault/repositories/foundry/issues/closed/657/index.md
    why: Origin of the report; confirms the has_line_matching/has_text_matching code lines on v26.1.1 and notes the has_n_columns first-line caveat left out of this issue.
    load_when: Wanting the original evidence, or deciding whether to add the optional has_n_columns note.
  - path: vault/research/Component - Tool Testing Infrastructure.md
    why: Overview of the verify/asserts modules and verify_assertion() plumbing (section "Assertion Verification"); lists text.py function signatures. Does not cover codegen or semantics.
    load_when: Orienting on how assertion functions map from XML tags to parameters.
  - path: vault/research/Component - User-Defined Tool Source Validation.md
    why: Section 8.3 and 9.2 describe ToolSourceSchema.json as a bundled export of the Pydantic models and note that its regeneration is not known to be CI-gated.
    load_when: Regenerating ToolSourceSchema.json or reviewing whether its diff is complete.
  - path: vault/projects/workflow_state/skills/COMPONENT_GALAXY_WORKFLOW_TESTING.md
    why: Shows that the same asserts vocabulary is shared with workflow tests (tests-format schema), so the doc text reaches workflow-test authors too.
    load_when: Checking which downstream schemas inherit the changed text.
research_requests:
  - vault/agents/gx_research/todo/assertion_codegen_and_generated_schemas.md
```

## Code facts checked in WORKING_DIRECTORY (release_26.1 base)

- `lib/galaxy/tool_util/verify/asserts/text.py:22` has the shared `Expression` annotation, used by `assert_has_text_matching` (~line 117) and `assert_has_line_matching` (~line 147). No other module uses `Expression` (xml.py has its own `ElementExpression`/`AttributeExpression`), so splitting it is local.
- Files containing `has_line_matching` that codegen must refresh: `lib/galaxy/tool_util/xsd/galaxy.xsd`, `lib/galaxy/tool_util_models/assertions.py`, `client/packages/api-client/src/schema/schema.ts`, `client/src/components/Tool/ToolSourceSchema.json`. Functional tool XMLs under `test/functional/tools/` use the assertion but need no change.
- Existing unit tests: `test/unit/tool_util/verify/test_asserts.py` (has `has_text_matching` cases around lines 300-340; add the `has_line_matching` anchoring tests alongside).
- `make update-client-api-schema` (Makefile:199) needs client node deps and builds `_schema.yaml` first; run under the node pinned in `client/.node_version`.
