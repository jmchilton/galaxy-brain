# gxwf-web TypeScript Server Plan

**Package:** `@galaxy-tool-util/gxwf-web` in the galaxy-tool-util pnpm monorepo  
**Goal:** TypeScript mirror of the Python gxwf-web FastAPI server — same API surface, backed by this monorepo's Effect-based validation/lint/clean/convert/roundtrip infrastructure. Shares a generated typed client with the Python version.

---

## Architecture

```
@galaxy-tool-util/gxwf-web
├── openapi.json            — vendored Python OpenAPI spec (Phase 3)
├── src/
│   ├── app.ts              — createApp(directory) → { server, state, ready }
│   ├── router.ts           — createRequestHandler(state): hand-rolled route matcher
│   ├── contents.ts         — Jupyter Contents API (port of Python contents.py)
│   ├── models.ts           — ContentsModel, CheckpointModel, CreateRequest, RenameRequest
│   ├── workflows.ts        — discoverWorkflows + operateValidate/Lint/Clean/... (Phase 2b)
│   ├── generated/
│   │   └── api-types.ts    — openapi-typescript output from openapi.json (Phase 3, checked in)
│   └── bin/gxwf-web.ts     — CLI entry: directory arg, --host, --port, --cache-dir, --output-schema
└── test/
    └── contents.test.ts    — 67 tests (contents + workflow discovery/ops + --output-schema)
```

Uses Node's built-in `node:http` (same pattern as `@galaxy-tool-util/tool-cache-proxy`). Depends on `@galaxy-tool-util/schema` for validation/lint/clean/convert/roundtrip and `@galaxy-tool-util/core` for ToolCache. Depends on `@galaxy-tool-util/cli` for step validation orchestration (`validateNativeSteps`, `lintWorkflowReport`, etc.).

---

## Phases

### Phase 1: Scaffold + Contents API ✅ DONE

**Commits:** `c4df435` (scaffold + 52 tests), `bc7e6a8` (review fixes)

**What was built:**
- Package scaffold (`package.json`, `tsconfig.json`, `vitest.config.ts`) matching `tool-cache-proxy` pattern
- Port of `contents.py` → `contents.ts`: `readContents`, `writeContents`, `deleteContents`, `createUntitled`, `renameContents`, all checkpoint operations
- Path safety: `resolveSafePath` with `..` traversal rejection, absolute path rejection, symlink escape detection, ignored-dir blocking
- Binary auto-detection via `TextDecoder({ fatal: true })`, matching Python's `UnicodeDecodeError` behavior
- Conflict detection via `If-Unmodified-Since` header + mtime comparison
- Checkpoint cascade (delete/rename file cascades to `.checkpoints/`)
- HTTP server: `createApp(directory)`, `createRequestHandler(state)` handling all 10 contents routes + checkpoint variants
- CLI: `gxwf-web <directory> [--host] [--port]`
- `/workflows` stub (GET returns empty list) and `/workflows/refresh` stub for Phase 2b wiring

**Review fixes applied:**
- `POST /workflows/refresh` route was matching `/workflows` — fixed to `/workflows/refresh`
- `restoreCheckpoint` now calls `utimesSync` to preserve mtime (Python's `shutil.copy2` behavior)
- `deleteCheckpoint` cleanup now walks full directory tree (Python's `os.removedirs` behavior)
- Removed unused `effect`/`core`/`schema` deps from `package.json`

**Test coverage:** 52 tests, all green. 3 workflow-related tests (auto-refresh) deferred to Phase 2b.

---

### Phase 2a: Complete TS Report Types ✅ DONE

**Goal:** All Python API response shapes defined in `@galaxy-tool-util/schema` before wiring HTTP routes.

The existing `report-models.ts` already matches Python for `SingleValidationReport`, `SingleLintReport`, `SingleCleanReport`, but is missing types for the other 3 workflow endpoints and some nested types.

**Add to `report-models.ts`:**

| Type | Used by | Notes |
|---|---|---|
| `WorkflowEntry` | `WorkflowIndex` | `relative_path`, `format`, `category` |
| `WorkflowIndex` | `GET /workflows` | `directory`, `workflows: WorkflowEntry[]` |
| `ConnectionResult` | `ConnectionStepResult` | `source_step`, `source_output`, `target_step`, `target_input`, `status: "ok"\|"invalid"\|"skip"`, `mapping\|null`, `errors` |
| `ConnectionStepResult` | `ConnectionValidationReport` | `step`, `tool_id\|null`, `version\|null`, `step_type`, `map_over\|null`, `connections`, `resolved_outputs`, `errors` |
| `ConnectionValidationReport` | `SingleValidationReport` | `valid`, `step_results`, `summary`, `has_details` |
| `BenignArtifact` | `StepDiff` | `reason`, `proven_by` |
| `DiffType` | `StepDiff` | enum: `value_mismatch\|missing_in_roundtrip\|missing_in_original\|connection_mismatch\|...` |
| `DiffSeverity` | `StepDiff` | enum: `error\|benign` |
| `StepDiff` | `RoundTripValidationResult` | `step_path`, `key_path`, `diff_type`, `severity`, `description`, `original_value\|null`, `roundtrip_value\|null`, `benign_artifact\|null` |
| `RoundTripResult` | `RoundTripValidationResult` | `workflow_name`, `direction`, `step_results: StepResult[]` |
| `StepIdMappingResult` | `RoundTripValidationResult` | `mapping`, `match_methods` |
| `RoundTripValidationResult` | `SingleRoundTripReport` | Full shape incl. `diffs`, `stale_clean_results`, `step_id_mapping`, computed `error_diffs`/`benign_diffs`/`ok`/`status`/`conversion_failure_lines`/`summary_line` |
| `SingleRoundTripReport` | `GET /roundtrip` | `workflow`, `result: RoundTripValidationResult` |
| `SingleExportReport` | `GET /to-format2` | `workflow`, `ok`, `steps_converted`, `steps_fallback`, `summary` |
| `StepEncodeStatus` | `ToNativeResult` | `step_id`, `step_label\|null`, `tool_id\|null`, `encoded`, `error\|null` |
| `ToNativeResult` | `GET /to-native` | `native_dict`, `steps: StepEncodeStatus[]`, `all_encoded`, `summary` |

**Also fix:** `SingleValidationReport.connection_report` is currently a `null` placeholder — change to `ConnectionValidationReport | null`.

**Export** all new types from `index.ts`.

**Source of truth:** `docs/_static/openapi.json` in `gxwf-web` repo (post-`8b3ead5`), which now has full `$ref` schemas for all components.

**What was done:**
- Added all missing Python API types to `report-models.ts`: `ResolvedOutputType`, `ConnectionResult`, `ConnectionStepResult`, `ConnectionValidationReport`, `WorkflowEntry`, `WorkflowIndex`, `DiffType`, `DiffSeverity`, `BenignArtifact`, `StepDiff`, `SkipWorkflowReason`, `FailureClass`, `StepResult`, `RoundTripResult`, `StepIdMappingResult`, `RoundTripValidationResult`, `SingleRoundTripReport`, `SingleExportReport`, `StepEncodeStatus`, `ToNativeResult`
- Fixed `SingleValidationReport.connection_report: null` → `ConnectionValidationReport | null`
- **Unified TS internal roundtrip types with Python API shapes**: `roundtrip.ts` now imports `StepDiff` and `DiffSeverity` from `report-models.ts` instead of defining them separately. `compareTree` produces Python-API-compatible `StepDiff` objects (`key_path`, `diff_type`, `description`, `original_value`, `roundtrip_value`, `benign_artifact`). CLI updated to use new field names.
- All types exported from `workflow/index.ts` and `schema/src/index.ts`
- All tests pass (4577 schema + 137 CLI)

**Note:** Type-level tests for new types were planned but deferred — Phase 2b wiring will exercise these shapes.

### Phase 2b: Workflow Discovery + Operations ✅ DONE

**Goal:** `/workflows` routes backed by existing monorepo capabilities.

**What was done:**
- `discoverWorkflows(directory)` in new `workflows.ts` — scans `.ga`, `.gxwf.yml`, `.gxwf.yaml` with content validation, category = first parent dir (mirrors Python)
- `ToolCache` loaded at startup via `createApp` → `{ server, state, ready }` pattern; `await ready` before serving
- Added deps: `@galaxy-tool-util/cli`, `@galaxy-tool-util/core`, `@galaxy-tool-util/schema`, `effect`, `yaml`
- Exported `validateNativeSteps`, `validateFormat2Steps`, `decodeStructureErrors`, `detectEncodingErrors`, `loadToolInputsForWorkflow`, `createDefaultResolver` from cli's `index.ts`
- All 8 operation routes implemented in `workflows.ts` + `router.ts`:
  - `GET /workflows` — returns cached `WorkflowIndex`
  - `POST /workflows/refresh` — re-scans directory
  - `GET /workflows/{path}/validate` → `operateValidate` → `SingleValidationReport`
  - `GET /workflows/{path}/clean` → `operateClean` → `SingleCleanReport`
  - `GET /workflows/{path}/lint` → `operateLint` → `SingleLintReport`
  - `GET /workflows/{path}/to-format2` → `operateToFormat2` → `SingleExportReport`
  - `GET /workflows/{path}/to-native` → `operateToNative` → `ToNativeResult`
  - `GET /workflows/{path}/roundtrip` → `operateRoundtrip` → `SingleRoundTripReport`
  - `GET /api/schemas/structural?format=format2|native` → JSONSchema.make(...)
- `maybeRefreshWorkflows` wired into: createUntitled, writeContents, deleteContents, renameContents, restoreCheckpoint (matching Python)
- Query params: `strict` for validate/lint; remaining params (allow/deny/preserve/strip, mode, connections) deferred to Phase 4
- 3 deferred tests ported from `test_contents.py` + 11 new workflow discovery/op tests (66 total)
- `bin/gxwf-web.ts` updated with `--cache-dir` flag

**Notes:**
- `RoundTripValidationResult.conversion_result` populated with TS step results (Python shape)
- `RoundtripFailureClass.subworkflow_external_ref` → `FailureClass.subworkflow` mapped in `_mapRoundtripFailureClass`
- Full query param support (allow/deny/preserve/strip, mode) deferred to Phase 4

### Phase 3: OpenAPI Client Generation + Parity ✅ DONE

**Goal:** Generate a typed client from the Python spec; export a compatible TS spec.

**What was done:**
- Vendored Python spec as `packages/gxwf-web/openapi.json` (added to `files` in package.json)
- Added `openapi-typescript` as devDep; `pnpm codegen` generates `src/generated/api-types.ts` (checked in)
- Exported `paths`, `components`, `operations` from package `index.ts` for typed `openapi-fetch` consumers
- Added `--output-schema` flag to `bin/gxwf-web.ts`: reads vendored `openapi.json` (via `new URL("../../openapi.json", import.meta.url)`), writes to stdout, exits
- Documented parity gaps in a table at the top of `workflows.ts`: `validate`/`lint` missing `allow`/`deny`/`connections`/`mode`; `clean` missing `preserve`/`strip`; `/api/schemas/structural` is TS-only extension
- Added test: `--output-schema` outputs valid OpenAPI 3.1 JSON with correct `openapi`, `paths`, `components` fields
- 67 tests, all green; `make check` passes

**Note on `--output-schema` approach:** The plan referenced Effect HttpApi's OpenAPI generation, but since the TS server uses hand-rolled `node:http` (not Effect HttpServer), we vendor the Python spec instead. The spec is the Python server's spec — it's the source of truth for the shared API surface.

### Phase 4: Remaining Parity + Polish ✅ DONE

**Commits:** `0124aac`

**What was done:**
- All query params accepted by the HTTP layer via `URLSearchParams.getAll` (for multi-value params) and forwarded to operation functions
- `operateValidate`: added `strict` (gates structure_errors — was previously always computed), `connections`, `mode`, `allow`, `deny` opts; `connections`/`mode`/`allow`/`deny` are documented no-ops
- `operateLint`: added `allow`, `deny` opts (no-ops pending StaleKeyPolicy)
- `operateClean`: added `preserve`, `strip` opts (no-ops pending StaleKeyPolicy)
- Exported `ValidateOptions`, `LintOptions`, `CleanOptions` from package index
- HTTP status codes verified as already correct: 404 (loadWorkflowFile), 409 (If-Unmodified-Since), 403 (root delete)
- Changeset `.changeset/gxwf-web-phases2-4.md` added (covers phases 2–4)

**Remaining gaps (require future work):**
- `allow`/`deny` (validate/lint) and `preserve`/`strip` (clean) need `StaleKeyPolicy` in `stale-keys.ts` — noted as "future work" in that file
- `connections` validation has no TS equivalent yet (types exist but no logic)
- `mode=json-schema` accepted but not mapped to json-schema validation path
- README and `--help` improvements not done (low priority)

---

## Key Decisions

- **HTTP framework:** Node's built-in `node:http` (consistent with existing `tool-cache-proxy` package; not Effect HttpServer despite original plan)
- **Contents API:** Standalone module, no workflow dependency (mirrors Python separation)
- **Report models:** Reuse `@galaxy-tool-util/schema`'s `report-models.ts` — these were ported from Python's `_report_models.py`
- **OpenAPI generation:** Python spec (post-`8b3ead5`) is the source of truth; TS client generated from it via `openapi-typescript`
- **Mode mapping:** `mode=pydantic` (Python default) → `effect` (TS default). `json-schema` works natively.
- **Binary detection:** `TextDecoder({ fatal: true })` matches Python's `UnicodeDecodeError` behavior
- **Checkpoint mtime:** `utimesSync` in both `createCheckpoint` and `restoreCheckpoint` mirrors `shutil.copy2`

---

## Resolved Questions

- **HTTP framework:** `node:http` (not Effect HttpServer) — consistent with `tool-cache-proxy`
- **`--output-schema`:** vendor Python spec, output it directly (no programmatic generation needed)
- **Report types:** TS internal types unified with Python API shapes via Phase 2a
- **`RoundTripValidationResult` computed fields:** treated as plain data, computed inline in `operateRoundtrip`

## Unresolved Questions

1. ~~`--tool-source`/`--tool-source-cache-dir` — support in TS server, or rely on proxy server YAML config?~~ **Resolved:** both servers share `WorkflowToolConfig` from `@galaxy-tool-util/core`; `gxwf-web` accepts `--config` with the same YAML format (`galaxy.workflows.toolSources`, `galaxy.workflows.toolCache`).
2. Tree batch endpoints (`POST /workflows/validate-all` etc.) — keep TS-only or add to Python too?
3. `allow`/`deny`/`preserve`/`strip` — implement `StaleKeyPolicy` in `stale-keys.ts`? Needed for full validate/lint/clean parity.
4. `connections` validation — implement connection-level step validation in TS? Types exist (`ConnectionValidationReport`) but no logic.
5. `mode=json-schema` — wire to json-schema validation path (see `validate-workflow-json-schema.ts`)?
6. `StepResult.diffs: string[]` in Python — upgrade to `StepDiff[]` (tracked as issue #32)?
