# Web Server V2 Plan: Strict/Mode/Clean-First Options + Before/After Content

## Goal

Expose existing backend options in the UI/API and add before/after workflow content to clean and roundtrip results. Specifically:

1. **Fine-grained strict options** (`strict_structure`, `strict_encoding`, `strict_state`) on validate, lint, roundtrip — replacing the old single `strict` bool
2. **Clean-first option** on validate (run clean in-memory, embed results; off by default)
3. **Validation mode** selector (Effect/meta model vs JSON schema via AJV) on validate
4. **Before/after workflow content** on clean and roundtrip response models
5. Fix latent Python bug: `run_lint` passed `strict=True` to `lint_single` which doesn't accept that kwarg

## Decisions

1. **Roundtrip content**: Before + after only (no intermediate format2). Simpler model.
2. **Lint mode**: Skip — `lint_single` has no `mode` param. Only validate exposes mode.
3. **Strict granularity**: Fine-grained — three separate params (`strict_structure`, `strict_encoding`, `strict_state`). Single `strict` bool removed from server API (callers use named params).
4. **Python roundtrip content**: Captured via `result.original_dict` / `result.reimported_dict` on `RoundTripValidationResult` — both already populated by `roundtrip_validate`, just excluded from serialization.
5. **TS JSON schema validate mode**: Implemented — `mode=json-schema` routes to AJV path (`validateNativeStepsJsonSchema` / `validateFormat2StepsJsonSchema` + `decodeStructureErrorsJsonSchema`).

---

## Phase 1 — Python report model extensions ✅

**Files:** `lib/galaxy/tool_util/workflow_state/_report_models.py`, `roundtrip.py`

- `SingleCleanReport` += `before_content: Optional[str] = None`, `after_content: Optional[str] = None`
- `SingleValidationReport` += `clean_report: Optional[SingleCleanReport] = None`
- `SingleCleanReport` moved before `SingleValidationReport` in the file (forward-ref cleanup)
- `SingleRoundTripReport` += `before_content: Optional[str] = None`, `after_content: Optional[str] = None`
- Note: no `format2_content` per decision #1

---

## Phase 2 — Python library entry point extensions ✅

**Files:** `clean.py`, `roundtrip.py`, `operations.py`

- **`clean_single`** += `include_content: bool = False` — reads raw file for `before_content`, serializes cleaned dict as JSON for `after_content`
- **`roundtrip_single`** += `include_content: bool = False` — uses `result.original_dict` / `result.reimported_dict` (already on `RoundTripValidationResult`, excluded from serialization); serializes both as JSON
- **`validate_single`** already had `clean: bool = False` — `clean_first` handled at the server layer in `operations.py` (run `clean_single` separately to get the report, then validate with `clean=True`)
- **Bug fixed in `operations.py`**: `run_lint` was passing `strict=True` to `lint_single` which doesn't accept it; rewrote `operations.py` with explicit named params throughout

---

## Phase 3 — Python server endpoint extensions ✅

**File:** `gxwf-web/src/gxwf_web/app.py`, `operations.py`

`operations.py` fully rewritten — no more `**kwargs` pass-through, all params explicit.

| Endpoint | Changes |
|---|---|
| `GET /validate` | Removed `strict`; added `strict_structure`, `strict_encoding`, `clean_first` (`mode` was already present) |
| `GET /lint` | Removed `strict`; added `strict_structure`, `strict_encoding` |
| `GET /clean` | Added `include_content: bool = False` |
| `GET /roundtrip` | Added `strict_structure`, `strict_encoding`, `strict_state`, `include_content` |

---

## Phase 4 — TS schema model extensions ✅

**File:** `packages/schema/src/workflow/report-models.ts`

- `SingleCleanReport` += `before_content?: string | null`, `after_content?: string | null`
- `SingleRoundTripReport` += `before_content?: string | null`, `after_content?: string | null`
- `SingleValidationReport` += `clean_report?: SingleCleanReport | null`
- Note: content fields on `SingleRoundTripReport` directly (not on nested `RoundTripValidationResult`)

---

## Phase 5 — TS server extensions ✅

**Files:** `packages/schema/src/workflow/roundtrip.ts`, `packages/cli/src/commands/validate-workflow-json-schema.ts`, `packages/cli/src/index.ts`, `packages/gxwf-web/src/workflows.ts`, `packages/gxwf-web/src/router.ts`

### `roundtrip.ts`
- `RoundtripResult` += `reimportedWorkflow?: unknown` (populated at end of `roundtripValidate`)
- Note: no `format2Workflow` per decision #1

### `validate-workflow-json-schema.ts`
- New exported `decodeStructureErrorsJsonSchema(data, format)` — AJV-based structural error list, mirrors `decodeStructureErrors`

### `cli/src/index.ts`
- Exports `validateNativeStepsJsonSchema`, `validateFormat2StepsJsonSchema`, `decodeStructureErrorsJsonSchema`

### `workflows.ts`
- `ValidateOptions`: `strict` → `strict_structure` + `strict_encoding`; added `clean_first`, `mode` now routes to AJV path when `"json-schema"`
- `LintOptions`: `strict` → `strict_structure` + `strict_encoding`
- `CleanOptions` += `include_content?`; `operateClean` serializes before/after (JSON for native, YAML for format2)
- New `RoundtripOptions` interface with `strict_structure`, `strict_encoding`, `strict_state`, `include_content`
- `operateRoundtrip` takes `RoundtripOptions`, passes strict opts, serializes `data` + `result.reimportedWorkflow`

### `router.ts`
- All new query params parsed and forwarded; imports `RoundtripOptions`

All tests pass (58 Python, 78 TS gxwf-web, full suite green).

---

## Phase 6 — OpenAPI spec + generated types ✅

**File:** `packages/gxwf-web/openapi.json`, `packages/gxwf-web/src/generated/api-types.ts`

- `openapi.json` is **NOT hand-edited** — generated from the Python FastAPI server via `uv run gxwf-web --output-schema -` in `~/projects/repositories/gxwf-web`, then copied to the TS package with 2-space indent
- `pnpm --filter @galaxy-tool-util/gxwf-web codegen` regenerates `api-types.ts` from `openapi.json`
- All new params and fields appear in generated types; `make check` and all 78 gxwf-web tests pass

---

## Phase 7 — Vue UI (`useOperation.ts` + `OperationPanel.vue`) ✅

### `useOperation.ts`

Exported typed opts interfaces (`ValidateOpts`, `LintOpts`, `CleanOpts`, `RoundtripOpts`). Each `run*` function gains a typed options parameter; opts are passed as `params.query` to the openapi-fetch client:
- `runValidate(opts: ValidateOpts)` — `strict_structure`, `strict_encoding`, `mode`, `clean_first`
- `runLint(opts: LintOpts)` — `strict_structure`, `strict_encoding`
- `runClean(opts: CleanOpts)` — `include_content`
- `runRoundtrip(opts: RoundtripOpts)` — `strict_structure`, `strict_encoding`, `strict_state`, `include_content`

### `OperationPanel.vue` toolbar additions

Each tab has a `reactive<*Opts>` object initialized to all-false defaults. Toolbar controls per tab:
- **Validate**: `mode` Select ("Meta model" / "JSON Schema"), `strict_structure` + `strict_encoding` + `clean_first` Checkboxes
- **Lint**: `strict_structure` + `strict_encoding` Checkboxes
- **Clean**: `include_content` Checkbox ("Show workflow diff")
- **Roundtrip**: `strict_structure` + `strict_encoding` + `strict_state` + `include_content` Checkboxes ("Show workflow content")

Note: validate tab has no `strict_state` (not in `ValidateOptions`). Options are reactive refs; changing them does not auto-rerun.

Also required: rebuild `@galaxy-tool-util/gxwf-web` (`pnpm build`) to update dist types before typechecking dependent packages.

---

## Phase 8 — Report display components (`packages/gxwf-report-shell/src/`) ✅

### `CleanReport.vue`
When `before_content`/`after_content` present: collapsed PrimeVue `Panel` ("Workflow content") with 2 side-by-side `<pre>` panes (Before / After). No diff lib needed — `<pre>` with `max-height: 400px; overflow: auto`.

### `RoundtripReport.vue`
When `before_content`/`after_content` present: collapsed PrimeVue `Panel` ("Workflow content") with `Tabs` inside — "Original (native)" and "Re-imported (native)" tabs, each with `<pre>`.

### `ValidationReport.vue`
When `clean_report` present: collapsed `Panel` ("Pre-validation clean") inserted above the summary/results, rendering `<CleanReport :report="report.clean_report" />` directly.

---

## Phase 9 — Tests

### Python
- `include_content=True` on clean: `before_content` is raw file text, `after_content` is cleaned JSON
- `include_content=True` on roundtrip: both content fields populated as JSON
- `clean_first=True` on validate: `clean_report` is set; validation results reflect cleaned dict
- `strict_structure=True` on lint: no longer raises TypeError (regression for bug fix)
- `mode="json-schema"` on validate via server endpoint still works

### TypeScript
- `packages/gxwf-web/test/`: `include_content` path on clean and roundtrip
- `clean_first` on validate: `clean_report` set, results differ from non-cleaned run on stale-key workflow
- `packages/schema/test/`: `roundtripValidate` populates `reimportedWorkflow` on success
