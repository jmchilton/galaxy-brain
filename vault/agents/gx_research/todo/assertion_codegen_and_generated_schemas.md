# Component - Tool Assertion Plugins and Codegen

Cover the tool/workflow-test assertion system under `lib/galaxy/tool_util/verify/asserts/` and the pipeline that turns the typed assertion functions into derived artifacts. Include: how `AssertionParameter` annotations and docstrings in `asserts/*.py` are the single source of docs; what `lib/galaxy/tool_util/verify/codegen.py` rewrites (`lib/galaxy/tool_util/xsd/galaxy.xsd`, `lib/galaxy/tool_util_models/assertions.py`; needs `xmllint`) and the exact regeneration commands; how those flow into `client/packages/api-client/src/schema/schema.ts` (`make update-client-api-schema`), `client/src/components/Tool/ToolSourceSchema.json` (`client/src/components/Tool/rebuild.py`) and workflow tests-format models; which CI checks (if any) catch drift in each derived file; semantic quirks of individual assertions (e.g. `has_line_matching` wraps `^{e}$` with MULTILINE and no grouping, `has_text_matching` is a bare `re.search`/`findall`; `has_n_columns` checks only the first non-comment line). Leave out per-assertion exhaustive reference and the planemo/test-runner side already in `Component - Tool Testing Infrastructure`.

## Why

Fixing assertion docs (galaxy#24350) requires regenerating four derived files, and the knowledge of how is only in the issue proposal; `Component - Tool Testing Infrastructure` lists the assertion functions but not the annotation-to-schema pipeline or semantics, and `Component - User-Defined Tool Source Validation` leaves `ToolSourceSchema.json` regeneration/CI-gating as an open question.

## Requested by

- vault/repositories/galaxy/branches/active/issue_24350_has_line_matching_docs_26_1/brain_research.md: needed the codegen/regeneration pipeline and assertion semantics for a docs-only fix.
