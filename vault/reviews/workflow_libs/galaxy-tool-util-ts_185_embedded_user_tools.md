# galaxy-tool-util-ts #185 — embedded user-defined tools

PR: https://github.com/jmchilton/galaxy-tool-util-ts/pull/185  
Reviewed head: `44164a01952eb9528527ec3c4c51e1a56c659d62`

Resolution: Both findings were fixed and pushed to the PR branch in `7c08d536469585927cfac38cb75feaeb3b721d9b`.

## Findings

1. **P2 — `--strict-state --json` succeeds when an embedded tool is skipped.** `resolveEmbeddedTool` now emits `skip_tool_not_found` for an unsupported `tool_representation` class, and the PR says strict state rejects that case. The Effect validator checks `strict.strictState` only after the JSON/HTML early return (`packages/cli/src/commands/validate-workflow.ts:213-245`); the JSON Schema backend does not check it (`validate-workflow-json-schema.ts:309-345`). Reproduced with a native step whose embedded class is `GalaxyTool`: plain `gxwf validate --strict-state` exits 2, while adding `--json` exits 0 in both modes despite a skip result. CI consumers using JSON can accept a workflow whose embedded tool was never validated. Apply the strict-state check before each output-mode return, and cover both backends.

2. **P2 — embedded tools render as subworkflows.** The new `isGalaxyUserToolRun` guard is used in conversion and validation, but Mermaid and Cytoscape still infer `subworkflow` from every non-null `run` (`packages/schema/src/workflow/mermaid.ts:171`, `cytoscape.ts:194`). Reproduced with the PR's inline-user-defined-tool fixture: Cytoscape reports `step_type: "subworkflow"` and Mermaid emits the double-bracket subworkflow shape for `udt_cat`. Use the guard in both emitters so diagrams agree with the native tool step and Python's emitters.

The strict-state output-mode ordering predates this PR, but the new unsupported embedded-tool result makes the PR's stated strict-state behavior false for JSON consumers.

## Checks

- `pnpm build` passed.
- Focused schema and CLI tests: 120 passed.
- Reproduced both findings on the reviewed head using the PR's embedded-tool fixture.
- Fix verification: 71 focused tests passed and `make check` passed.
