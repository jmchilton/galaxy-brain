# Web Interface Pass 3: Mutating Operations + UI Conversions

**Goal**: Flip workflow operations from read-only to write-by-default. Add `dry_run` for the old read-only behavior. Add export/convert UI for format conversions. Sync everything across Python, TypeScript, and the Vue SPA.

## Terminology

- **Export**: Produce the converted file alongside the original (e.g., `wf.ga` stays, `wf.gxwf.yml` is written next to it).
- **Convert**: Export + remove the original file.
- **Dry run**: Return the report/content without writing anything (current behavior).

## Current State

| Operation | Python endpoint | TS endpoint | Writes to disk? | UI tab? |
|-----------|----------------|-------------|-----------------|---------|
| clean | `GET /workflows/{path}/clean` | `GET ...` | No | Yes |
| to-format2 | `GET /workflows/{path}/to-format2` | `GET ...` | No | No |
| to-native | `GET /workflows/{path}/to-native` | `GET ...` | No | No |
| validate | `GET /workflows/{path}/validate` | `GET ...` | No | Yes |
| lint | `GET /workflows/{path}/lint` | `GET ...` | No | Yes |
| roundtrip | `GET /workflows/{path}/roundtrip` | `GET ...` | No | Yes |

## Target State

| Operation | Method | Endpoint | Default | `dry_run=true` |
|-----------|--------|----------|---------|----------------|
| clean | POST | `/workflows/{path}/clean` | Overwrites file with cleaned content | Returns report + content, no write |
| export | POST | `/workflows/{path}/export` | Writes converted file alongside original | Returns report + content, no write |
| convert | POST | `/workflows/{path}/convert` | Writes converted file, removes original | Returns report + content, no write |
| validate | POST | `/workflows/{path}/validate` | No change (read-only, reports only) | N/A |
| lint | POST | `/workflows/{path}/lint` | No change (read-only, reports only) | N/A |
| roundtrip | POST | `/workflows/{path}/roundtrip` | No change (read-only, reports only) | N/A |

All six endpoints switch from GET to POST. Validate, lint, and roundtrip remain read-only regardless (no dry_run needed). Clean, export, and convert gain a `dry_run` query param (default `false`).

---

## Step 1: Python API Changes (gxwf-web)

**Target**: `/Users/jxc755/projects/repositories/gxwf-web/`

### 1a. Update `operations.py` - Add write-back logic

- `run_clean`: When `dry_run=False`, write `after_content` back to the original file path. Always call with `include_content=True` internally (the report needs it to write). Return `SingleCleanReport` either way.
- Add `run_export`: Calls the appropriate conversion function based on source format:
  - Native `.ga` -> calls `export_single()`, serializes `format2_dict` as YAML, writes to `{stem}.gxwf.yml`
  - Format2 `.gxwf.yml` -> calls `convert_to_native_stateful()`, serializes `native_dict` as JSON, writes to `{stem}.ga`
  - When `dry_run=True`: return report + content without writing
  - Return a new response model (see 1c) with: report, output_path, content (when dry_run)
- Add `run_convert`: Same as `run_export`, but after writing the new file, delete the original. When `dry_run=True`: return report + content + what *would* be deleted.

Note: `export_single` returns `ExportSingleResult` with `format2_dict` (a dict). Serialize with YAML. `convert_to_native_stateful` returns `ToNativeResult` with `native_dict`. Serialize with `json.dumps(d, indent=4)`.

### 1b. Update `app.py` - Change routes

- Switch all six workflow operation endpoints from `@app.get` to `@app.post`.
- Add `dry_run: bool = False` query param to clean, export, convert.
- Replace `to-format2` and `to-native` with `export` and `convert`:
  - `POST /workflows/{path}/export?dry_run=false`
  - `POST /workflows/{path}/convert?dry_run=false`
- Remove the old `/to-format2` and `/to-native` endpoints.
- After non-dry-run clean/export/convert, call `_maybe_refresh_workflows()` since files changed.

### 1c. Update `models.py` - Add response models

- Add `ExportResult` model:
  ```python
  class ExportResult(BaseModel):
      source_path: str
      output_path: str
      source_format: str   # "native" or "format2"
      target_format: str   # "format2" or "native"
      report: Union[SingleExportReport, ToNativeResult]
      dry_run: bool
      content: Optional[str] = None  # populated when dry_run=True
  ```
- Add `ConvertResult` model (same as ExportResult plus):
  ```python
  class ConvertResult(BaseModel):
      source_path: str
      output_path: str
      removed_path: str     # original file that was/would be removed
      source_format: str
      target_format: str
      report: Union[SingleExportReport, ToNativeResult]
      dry_run: bool
      content: Optional[str] = None
  ```

### 1d. Update tests (`tests/test_api.py`)

- Update `test_openapi_schema` to check for POST methods and new endpoint paths.
- Update `test_workflow_endpoints_have_typed_response_schemas` for new paths and POST.
- Add test: POST clean with dry_run=true returns report, file unchanged.
- Add test: POST clean with dry_run=false modifies file on disk.
- Add test: POST export writes new file alongside original.
- Add test: POST convert writes new file and removes original.
- Add test: POST export with dry_run returns content without writing.

### 1e. Regenerate OpenAPI spec

```bash
cd /Users/jxc755/projects/repositories/gxwf-web
make docs-openapi
```

This writes to `docs/_static/openapi.json`.

---

## Step 2: TypeScript Server Changes (gxwf-web package)

**Target**: `/Users/jxc755/projects/worktrees/galaxy-tool-util/branch/report_models/packages/gxwf-web/`

### 2a. Sync OpenAPI spec

Copy the regenerated `openapi.json` from Python's `docs/_static/openapi.json` to TS's `packages/gxwf-web/openapi.json`. Then regenerate types:

```bash
cd /Users/jxc755/projects/worktrees/galaxy-tool-util/branch/report_models
pnpm --filter @galaxy-tool-util/gxwf-web codegen
```

### 2b. Update `workflows.ts` - Add write-back logic

Mirror the Python changes:

- `operateClean`: Add `dry_run` option. When `dry_run=false`, write `after_content` back to `wf.absPath` via `fs.writeFileSync`. Always compute content internally.
- Add `operateExport`: 
  - Determine target format from source format
  - Call `operateToFormat2` or `operateToNative` as appropriate
  - Serialize: YAML for format2, JSON for native
  - Compute output path: replace extension (`.ga` -> `.gxwf.yml` or `.gxwf.yml` -> `.ga`)
  - When `dry_run=false`: write to output path
  - Return `ExportResult`-shaped object
- Add `operateConvert`:
  - Same as export, but also `fs.unlinkSync(wf.absPath)` after writing
  - Return `ConvertResult`-shaped object
- Remove standalone `operateToFormat2` and `operateToNative` (absorbed into export/convert)

### 2c. Update `router.ts` - Change route matching

- Change all workflow ops from GET to POST in `matchRoute()`.
- Update `WORKFLOW_OPS` set: remove `to-format2` and `to-native`, add `export` and `convert`.
- Parse `dry_run` query param for clean/export/convert handlers.
- After non-dry-run mutations, call `maybeRefreshWorkflows()`.

### 2d. Update `models.ts` and exports

- Add `ExportResult` and `ConvertResult` interfaces matching the OpenAPI spec.
- Export new types from `index.ts`.
- Update `WorkflowOp` type union.

### 2e. Update tests

- Update `static.test.ts` if route-matching tests exist for GET workflow ops.
- Add tests for POST workflow operations, dry_run behavior.

---

## Step 3: Schema Package Updates

**Target**: `/Users/jxc755/projects/worktrees/galaxy-tool-util/branch/report_models/packages/gxwf-schema/` (or wherever report model types live)

- Add `ExportResult` and `ConvertResult` TypeScript types to the schema package if needed by report-shell or UI.
- These should match the OpenAPI component schemas.

---

## Step 4: Report Shell - New Components

**Target**: `/Users/jxc755/projects/worktrees/galaxy-tool-util/branch/report_models/packages/gxwf-report-shell/`

### 4a. Add `ExportReport.vue`

Display for export/convert results:
- Source/target format badges
- Output path
- Per-step encoding status (reuse existing step result table pattern)
- Summary: N/M steps converted
- Content preview (collapsible, shows the converted workflow content)
- "Dry run" indicator badge when applicable

### 4b. Update `ReportShell.vue`

Add routing for new report types: `"export"`, `"convert"`.

### 4c. Update exports in `index.ts`

Export `ExportReport` component.

---

## Step 5: UI Changes (gxwf-ui)

**Target**: `/Users/jxc755/projects/worktrees/galaxy-tool-util/branch/report_models/packages/gxwf-ui/`

### 5a. Update `useOperation.ts` composable

- Change all `client.GET` calls to `client.POST` for workflow operations.
- Add `dry_run` parameter to clean operation calls.
- Add new operation types: `"export"` and `"convert"`.
- Add `ExportResult` and `ConvertResult` to `OperationResults` interface.
- Add `runExport(opts)` and `runConvert(opts)` functions.
- `OperationName` type: add `"export" | "convert"`.
- Clean toolbar: add a checkbox or toggle for dry_run mode.

### 5b. Update `OperationPanel.vue` - Add export/convert tabs

Add two new tabs after "Roundtrip":

**Export tab**:
- Run button
- Dry run checkbox (default unchecked -> will write)
- Shows `ExportReport` component with results
- After successful non-dry-run export, invalidate op cache and refresh workflow list (new file appeared)

**Convert tab**:
- Run button  
- Dry run checkbox (default unchecked -> will write)
- Shows `ExportReport` component (same display, different semantics)
- After successful non-dry-run convert, invalidate op cache and refresh workflow list (file replaced)
- Consider a confirmation dialog before convert since it deletes the original

### 5c. Update clean tab

- Add dry_run checkbox to clean toolbar (default unchecked -> will write)
- After successful non-dry-run clean, invalidate op cache (file changed on disk)

### 5d. Wire up workflow list refresh

After any mutating operation (non-dry-run clean/export/convert), the UI should:
1. Clear the operation cache for the affected workflow path(s)
2. Refresh the workflow list (`POST /workflows/refresh`)
3. For convert: navigate back to dashboard (original workflow gone) or to the new workflow path

---

## Step 6: OpenAPI Sync and Codegen

Final sync pass after all changes are stable:

1. Python: `cd /Users/jxc755/projects/repositories/gxwf-web && make docs-openapi`
2. Copy: `cp docs/_static/openapi.json /Users/jxc755/projects/worktrees/galaxy-tool-util/branch/report_models/packages/gxwf-web/openapi.json`
3. Codegen: `cd /Users/jxc755/projects/worktrees/galaxy-tool-util/branch/report_models && pnpm --filter @galaxy-tool-util/gxwf-web codegen`
4. Build: `pnpm --filter @galaxy-tool-util/gxwf-web build`
5. Verify: types compile cleanly, UI builds, tests pass

---

## Implementation Order

```
Step 1  (Python API)
  |
  v
Step 1e (generate openapi.json)
  |
  v
Step 2a (sync openapi to TS, codegen types)
  |
  +---> Step 2b-2e (TS server implementation)  --+
  |                                               |
  +---> Step 3 (schema types)                  --+
  |                                               |
  +---> Step 4 (report-shell components)       --+
                                                  |
                                                  v
                                            Step 5 (UI)
                                                  |
                                                  v
                                            Step 6 (final sync)
```

Steps 2-4 can proceed in parallel after Step 1e. Step 5 depends on all of 2-4. Step 6 is a final verification pass.

---

## Testing Strategy

### Python (gxwf-web)
- Unit tests with real workflow fixtures in tmp_path
- Test dry_run=true returns content, file unchanged
- Test dry_run=false modifies/creates/deletes files
- Test export output path computation (.ga -> .gxwf.yml and vice versa)
- Test convert removes original after writing new file
- Test workflow cache refresh after mutations

### TypeScript (gxwf-web)
- Mirror Python tests
- Test file system mutations via temp directories
- Test route matching for POST methods

### UI (gxwf-ui)
- Manual testing: run both Python and TS backends, verify all 6 tabs work
- Verify dry_run checkbox behavior
- Verify workflow list refreshes after mutations
- Verify convert navigates correctly after original is removed
- Verify export shows new file in file browser

---

## File Inventory

### Files to modify

**Python (gxwf-web)**:
- `src/gxwf_web/app.py` - Routes: GET->POST, replace to-format2/to-native with export/convert
- `src/gxwf_web/operations.py` - Add write-back logic, run_export, run_convert
- `src/gxwf_web/models.py` - Add ExportResult, ConvertResult
- `tests/test_api.py` - Update + expand tests

**TypeScript (gxwf-web)**:
- `packages/gxwf-web/openapi.json` - Synced from Python
- `packages/gxwf-web/src/generated/api-types.ts` - Regenerated
- `packages/gxwf-web/src/workflows.ts` - Add write-back, export, convert ops
- `packages/gxwf-web/src/router.ts` - POST methods, new ops, dry_run parsing
- `packages/gxwf-web/src/models.ts` - New result types
- `packages/gxwf-web/src/index.ts` - Export new types

**Report Shell**:
- `packages/gxwf-report-shell/src/ExportReport.vue` - New component
- `packages/gxwf-report-shell/src/ReportShell.vue` - Route new types
- `packages/gxwf-report-shell/src/index.ts` - Export new component

**UI (gxwf-ui)**:
- `packages/gxwf-ui/src/composables/useOperation.ts` - POST, new ops, dry_run
- `packages/gxwf-ui/src/components/OperationPanel.vue` - New tabs, dry_run toggle

---

## Unresolved Questions

1. **Output path collision**: If `wf.gxwf.yml` already exists when exporting `wf.ga`, overwrite silently or error? Leaning toward overwrite with a warning in the report.
2. **Clean serialization format**: Clean currently returns JSON (`json.dumps`). For format2 workflows, should clean write back as YAML instead of JSON? The Python `clean_single` always returns JSON via `after_content` - this might need a format-aware serialization path.
3. **Subworkflow handling**: Export/convert on workflows with external subworkflow references - should it also export/convert the subworkflows? Probably not in this pass, but worth noting.
4. **Checkpoint before mutate**: Should clean/export/convert auto-create a checkpoint before writing? The Contents API has checkpoint support. Could be a nice safety net.
5. **Confirm dialog**: Should convert (which deletes the original) require explicit confirmation in the UI? A simple "Are you sure?" dialog before the POST would prevent accidents.
6. **Export report model unification**: The Python side has `SingleExportReport` (for to-format2) and `ToNativeResult` (for to-native) as separate types. The new `ExportResult`/`ConvertResult` wraps either. Should we unify the inner report into a single shape, or keep the union?
