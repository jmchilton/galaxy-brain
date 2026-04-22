# Fix Untyped OpenAPI Response Schemas in gxwf-web

**Project:** `/Users/jxc755/projects/repositories/gxwf-web`  
**Problem:** 6 workflow operation endpoints return `-> Any`, so FastAPI generates title-only response schemas with no `$ref`. `openapi-typescript` produces `unknown` for all of them.

---

## Root Cause

Every workflow operation handler has `-> Any` return annotation and no `response_model=` on the decorator. FastAPI needs one or the other to generate proper OpenAPI response schemas. The actual return values are all Pydantic `BaseModel` subclasses (except `to_native` which returns a dataclass) — the types exist, they're just not declared.

## Affected Endpoints

| Endpoint | Handler | Actually Returns | Model Location | Fix |
|----------|---------|-----------------|----------------|-----|
| `GET /workflows/{path}/validate` | `validate_workflow` | `SingleValidationReport` | `_report_models.py:271` | Add return type |
| `GET /workflows/{path}/clean` | `clean_workflow` | `SingleCleanReport` | `_report_models.py:291` | Add return type |
| `GET /workflows/{path}/lint` | `lint_workflow` | `SingleLintReport` | `_report_models.py:354` | Add return type |
| `GET /workflows/{path}/roundtrip` | `roundtrip_workflow` | `SingleRoundTripReport` | `roundtrip.py:1296` | Add return type |
| `GET /workflows/{path}/to-format2` | `to_format2` | `SingleExportReport` | `export_format2.py:457` | Add return type |
| `GET /workflows/{path}/to-native` | `to_native` | `ToNativeResult` (dataclass) | `to_native_stateful.py:69` | **Needs Pydantic wrapper** |

## Fix Plan

### Step 1: Fix the 5 Pydantic endpoints (app.py only)

These are one-line fixes each — change `-> Any` to the actual Pydantic return type. FastAPI will pick up the type annotation and generate proper `$ref` response schemas automatically.

**File:** `src/gxwf_web/app.py`

```python
# Add imports at top
from galaxy.tool_util.workflow_state._report_models import (
    SingleValidationReport,
    SingleCleanReport,
    SingleLintReport,
)
from galaxy.tool_util.workflow_state.roundtrip import SingleRoundTripReport
from galaxy.tool_util.workflow_state.export_format2 import SingleExportReport
```

Then for each handler, replace `-> Any` with the correct type:

1. `async def validate_workflow(...) -> SingleValidationReport:`
2. `async def clean_workflow(...) -> SingleCleanReport:`
3. `async def lint_workflow(...) -> SingleLintReport:`
4. `async def roundtrip_workflow(...) -> SingleRoundTripReport:`
5. `async def to_format2(...) -> SingleExportReport:` (already returns `result.report` which is this type)

Remove the `Any` import if no longer used.

### Step 2: Fix `to_native` endpoint (needs Pydantic model)

`ToNativeResult` is a `@dataclass` with a `NormalizedNativeWorkflow` field (not JSON-serializable as Pydantic schema). Two options:

**Option A (preferred): Add a Pydantic response model in gxwf-web's models.py**

```python
# src/gxwf_web/models.py
class StepEncodeStatusModel(BaseModel):
    step_id: str
    step_label: Optional[str] = None
    tool_id: Optional[str] = None
    encoded: bool = False
    error: Optional[str] = None

class ToNativeResponse(BaseModel):
    """Response for format2 → native conversion."""
    native_dict: dict  # The serialized native workflow
    steps: list[StepEncodeStatusModel] = []
    all_encoded: bool
    summary: str
```

```python
# src/gxwf_web/app.py
@app.get("/workflows/{workflow_path:path}/to-native")
async def to_native(workflow_path: str) -> ToNativeResponse:
    wf = _get_workflow(workflow_path)
    result = run_to_native(wf, _tool_info)
    return ToNativeResponse(
        native_dict=result.native_dict,
        steps=[StepEncodeStatusModel(**dataclasses.asdict(s)) for s in result.steps],
        all_encoded=result.all_encoded,
        summary=result.summary,
    )
```

**Option B: Convert `ToNativeResult` to Pydantic in galaxy-tool-util**

Change the dataclass to `BaseModel` in `to_native_stateful.py`. Cleaner long-term but requires a change in the Galaxy codebase. Can be done later; Option A is self-contained in gxwf-web.

### Step 3: Regenerate OpenAPI spec

```bash
cd /Users/jxc755/projects/repositories/gxwf-web
make docs-openapi
```

Verify the regenerated `docs/_static/openapi.json` now has `$ref` entries for all 6 endpoints.

### Step 4: Verify with openapi-typescript

```bash
npx openapi-typescript docs/_static/openapi.json -o /tmp/test-types.ts
```

Grep for `unknown` in the generated types — the 6 endpoints should now have concrete types instead.

---

## Files Changed

| File | Changes |
|------|---------|
| `src/gxwf_web/app.py` | Add imports, change 6 return type annotations |
| `src/gxwf_web/models.py` | Add `StepEncodeStatusModel` + `ToNativeResponse` |

**Total:** ~20 lines changed, ~15 lines added.

---

## Testing

1. Existing `tests/test_api.py` should still pass (response content unchanged, just typed now)
2. Add a test that loads the generated OpenAPI spec and asserts all `/workflows/` endpoints have `$ref` response schemas (no more title-only)
3. Run `make docs-openapi` in CI to ensure spec stays in sync

---

## Unresolved

1. Should `ExportSingleResult` (which wraps `SingleExportReport` + the actual format2 dict) also get a Pydantic model? Currently `to_format2` returns `result.report` (just the report), not the converted workflow itself. If the endpoint should also return the converted content, that's a separate feature.
2. Some report models may have deeply nested types (e.g., `SingleRoundTripReport` contains diff classifications). Verify the generated JSON Schema isn't excessively large — FastAPI's `model_json_schema()` handles `$defs` well but worth checking.
