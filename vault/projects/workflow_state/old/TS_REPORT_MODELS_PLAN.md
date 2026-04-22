# Plan: Align TS Report Models with Python

Goal: Make TypeScript `galaxy-tool-util` CLI produce identical JSON report shapes as Python `galaxy.tool_util.workflow_state._report_models`, enabling shared frontend rendering and API interop via gxwf-web.

Out of scope: connection validation models, strict handling alignment.

Committed as d064966 on `report_models` branch (Phases 1-5 + StepStatus fix).

## Phase 1 — Define shared report model types in `packages/schema` ✅

Created `packages/schema/src/workflow/report-models.ts` with snake_case types matching Python JSON output:

- **Step-level**: `ValidationStepResult` (step, tool_id, version, status, errors), `CleanStepResult` (step, tool_id, version, removed_keys, skipped, skip_reason, display_label)
- **Single-workflow**: `SingleValidationReport`, `SingleLintReport`, `SingleCleanReport` — flat shapes matching Python
- **Tree workflow-level**: `WorkflowValidationResult`, `LintWorkflowResult`, `WorkflowCleanResult` with category, name, summary computed fields
- **Tree-level**: `TreeValidationReport` (root, workflows, categories, summary), `LintTreeReport`, `TreeCleanReport`
- Helper functions: `validationSummary`, `validationFailures`, `cleanDisplayLabel`, `categoryOf`, `groupByCategory`
- Builder functions for all report types
- Exported from schema package index

## Phase 2 — Refactor existing `StepValidationResult` to match ✅

- Replaced camelCase `StepValidationResult` (stepLabel/toolId/toolVersion/`"skip"`) with snake_case (step/tool_id/version/`"skip_tool_not_found"`)
- Updated all producers and consumers across CLI and schema test packages
- Import type from `@galaxy-tool-util/schema`, backward-compatible alias `StepValidationResult`

## Phase 3 — Add `SingleValidationReport` wrapper to validate command ✅

- Added `--json` flag to `gxwf validate`
- Both effect and json-schema modes build `SingleValidationReport` via `buildSingleValidationReport()`
- Captures structural validation failures as `structure_errors`
- `connection_report` null, `encoding_errors` empty (Phase 7)
- 5 new tests covering: valid native/format2, structure errors, step failures, structure-only mode

## Phase 4 — Reshape `LintReport` → `SingleLintReport` ✅

- `gxwf lint --json` now outputs `SingleLintReport` shape instead of raw internal `LintReport`
- Internal `lintWorkflowReport()` unchanged for text rendering and lint-tree
- `lint_errors`/`lint_warnings` = structural + best-practices counts combined
- `structure_errors`/`encoding_errors` empty (Phase 7)
- Updated existing test, added state-validation JSON test

## Phase 5 — Enrich `cleanWorkflow()` with per-step reporting ✅

- `cleanWorkflow()` return type changed to `CleanWorkflowResult { workflow, results: CleanStepResult[] }`
- Per-step tracking: `removed_keys`, `tool_id`, `version`, `skipped`, `skip_reason`, `display_label`
- `gxwf clean --json` outputs `SingleCleanReport` via `buildSingleCleanReport()`
- All callers updated (clean.ts, clean-tree.ts, declarative test)
- 2 new tests for JSON clean reports

## StepStatus alignment ✅

Matched Python commit e5c6bd63ab (fixes jmchilton/galaxy-tool-util-ts#25):

- Added `skip_replacement_params` to `StepStatus`, plus `SKIP_STATUSES` set
- Summary key renamed `skip_tool_not_found` → `skip` (aggregates all skip types)
- Replacement-param validation sites now return `skip_replacement_params` status
- All skip-status consumers updated to check both skip statuses

## Phase 6 — Add `category` grouping to tree reports ✅

- Replaced internal tree command types (`WorkflowValidateResult`, `ValidateTreeReport`, etc.) with schema report-model types
- All three tree commands now use `buildWorkflowXxxResult()` + `buildTreeXxxReport()` from schema
- JSON output uses `"workflows"` key with `categories` grouping, snake_case summary fields
- `toLintWorkflowResult()` maps internal `LintReport` to schema's flat `LintWorkflowResult`
- Added category grouping tests for all three tree commands (nested directories, `(root)` vs subdirectory)

## Phase 7 — Add `structure_errors` / `encoding_errors` ✅

- `validate --json`: structure_errors already wired in Phase 3; added `detectEncodingErrors()` using `scanToolState()` per native tool step
- `lint --json`: added `decodeStructureErrors()` (Effect Schema decode) and `detectEncodingErrors()` for encoding_errors
- `detectEncodingErrors()` normalizes native workflow, loads tool definitions, runs `scanToolState()` on each step; returns `string[]`
- Format2 workflows skip encoding detection (no legacy encoding)
- Added `conditionalTool` fixture with `gx_conditional` param for encoding detection testing
- Tests: encoding_errors for validate + lint (legacy-encoded conditional), structure_errors for lint (malformed workflow)

## Deferred

- Connection validation models
- Strict handling alignment
- Markdown report templates (Nunjucks) — follow-up branch
- Roundtrip/export report models
- `SkipWorkflowReason` enum — add when strict handling lands

## Test strategy

- Red-to-green: snapshot tests for `--json` output against expected Python-shaped JSON
- Existing lint/validate/clean tests catch regressions on field renames
- Cross-validate by running Python CLI and TS CLI on same workflow, diffing JSON

## Unresolved questions

- Should `SingleLintReport.structure_errors` contain best-practices warnings too? Python's `structure_errors` is specifically for pre-parse/schema-level failures, not lint checks.
- `encoding_errors` in Python comes from `precheck.py` detecting legacy JSON-encoded tool_state — does TS detect this today?

## Decisions

- snake_case field names everywhere (not camelCase + mappers)
- Report model types live in `packages/schema`
- Modify existing `cleanWorkflow()` to return report data (not parallel function)
- Tree JSON key: `"workflows"` (matching Python alias)
- Summary key: `skip` (aggregating all skip statuses), matching Python SKIP_STATUSES
