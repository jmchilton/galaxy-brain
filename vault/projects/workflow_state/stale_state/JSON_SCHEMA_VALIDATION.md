# JSON Schema Validation Plan

Validate exported Pydantic JSON Schemas are standard Draft 2020-12 and round-trip through Python `jsonschema` and TypeScript `ajv`.

Two schema sources:
1. **gxformat2** — `GalaxyWorkflow.model_json_schema()` for whole-workflow structural validation
2. **galaxy-tool-util** — `WorkflowStepToolState.model_json_schema()` for per-step tool state

---

## 1. JSON Schema Export Reliability

**Current state:** `CustomGenerateJsonSchema` in `galaxy.tool_util.parameters.json` injects `$schema` dialect. Pydantic v2 generates Draft 2020-12 natively. `run_schema` in `cache.py` already exports per-tool schemas.

**Missing for gxformat2:** `GalaxyWorkflow.model_json_schema()` uses Pydantic default generator — no `$schema` key. Need to use `CustomGenerateJsonSchema` or duplicate the 5-line class in gxformat2 (can't depend on galaxy-tool-util).

**Action items:**
- A. Add `json_schema()` function in gxformat2 using duplicated `CustomGenerateJsonSchema`
- B. Add CLI: `galaxy-tool-cache structural-schema -o gxformat2_schema.json`
- C. Unit test: exported schema passes `jsonschema.Draft202012Validator.check_schema()`

**Known issues:**
- `extra="allow"` on gxformat2 models → `additionalProperties: true` → won't catch typos. Intentional for forward compat. `gxformat2_strict.py` may have `extra="forbid"` — investigate.
- Pydantic uses `$defs` for `$ref` targets — both `jsonschema` and `ajv` support this natively in 2020-12.

---

## 2. Two-Level Validation Module

New file: `lib/galaxy/tool_util/workflow_state/validation_json_schema.py`

**Level 1 — Structural (gxformat2 schema):**
- Input: raw workflow dict (YAML-loaded format2)
- Schema: `GalaxyWorkflow.model_json_schema(schema_generator=CustomGenerateJsonSchema)`
- Validator: `jsonschema.Draft202012Validator`

**Level 2 — Per-step tool state:**
- Walk `steps`, resolve `tool_id` → cache → `WorkflowStepToolState.parameter_model_for()` → `to_json_schema()` → validate `state` block
- Pre-exported schemas via `galaxy-tool-cache schema` also supported (offline mode)

**API:**

```python
@dataclass
class JsonSchemaValidationError:
    path: str           # JSON pointer
    message: str
    schema_path: str

@dataclass
class JsonSchemaStepResult:
    step: str
    tool_id: Optional[str]
    errors: List[JsonSchemaValidationError]
    status: Literal["ok", "fail", "skip"]

@dataclass
class JsonSchemaValidationResult:
    structural_errors: List[JsonSchemaValidationError]
    step_results: List[JsonSchemaStepResult]

    @property
    def valid(self) -> bool:
        return not self.structural_errors and all(s.status != "fail" for s in self.step_results)

def validate_workflow_json_schema(
    workflow_dict: dict,
    get_tool_info: Optional[GetToolInfo] = None,
    tool_schema_dir: Optional[str] = None,
) -> JsonSchemaValidationResult:
    ...

def validate_structural_json_schema(
    workflow_dict: dict,
) -> List[JsonSchemaValidationError]:
    """Level 1 only — no tool cache needed."""
    ...
```

**Key decisions:**
- Use `jsonschema` library (not `model_validate`) — proves the exported JSON Schema works, same schema TS consumers use
- `get_tool_info` for dynamic generation; `tool_schema_dir` for offline pre-exported schemas
- Structural schema cached as module-level constant (generated once)
- Map results into existing `ValidationStepResult` for formatter compat; add `validation_mode: Literal["pydantic", "json_schema"]` to distinguish

---

## 3. CLI Integration

**Preferred: add `--mode json-schema` to existing `gxwf-state-validate`:**

```
gxwf-state-validate workflow.gxwf.yml --mode json-schema
gxwf-state-validate workflow.gxwf.yml --mode json-schema --tool-schema-dir ./schemas/
```

In `validate.py` `run_validate()`:
- `mode == "json-schema"` → `validate_workflow_json_schema()`
- Map results to same `ValidationStepResult` list
- All downstream formatting (text, JSON, markdown) unchanged

**Structural schema export on `galaxy-tool-cache`:**

```
galaxy-tool-cache structural-schema -o gxformat2_schema.json
```

---

## 4. TypeScript Round-Trip Testing

**Goal:** Prove exported schemas (structural + per-tool) consumable by `ajv`.

**Setup:** `test/ts_json_schema/` with vitest + ajv:

```
test/ts_json_schema/
  package.json          # ajv, vitest
  validate_structural.test.ts
  validate_tool_state.test.ts
```

**Test flow:**
1. Python fixture exports schemas to temp dir
2. vitest loads JSON files, instantiates `Ajv({ strict: false })`
3. Validates known-good and known-bad documents
4. Asserts pass/fail as expected

**`strict: false` needed** because Pydantic 2020-12 uses features ajv strict mode flags.

**ajv compatibility notes:**
- `$defs` — natively supported in ajv 2020-12 mode
- `prefixItems` for tuples — supported
- Discriminated unions (`oneOf` + `if/then`) — need to verify. gxformat2 uses `Discriminator` + `Tag` for comments and creators. **Highest risk area** — test specifically.

**Alternative (simpler):** Single-file Node.js script via subprocess:
```js
const Ajv = require("ajv/dist/2020");
const schema = JSON.parse(fs.readFileSync(process.argv[2]));
const data = JSON.parse(fs.readFileSync(process.argv[3]));
const ajv = new Ajv();
process.exit(ajv.validate(schema, data) ? 0 : 1);
```

Make TS tests optional in CI (skip if Node not available).

---

## 5. Test Strategy (Red-to-Green)

### Phase 1: Schema Export Correctness

`test_json_schema_export.py`:
- `test_gxformat2_schema_is_valid_draft_2020_12` — passes `Draft202012Validator.check_schema()`
- `test_gxformat2_schema_has_schema_dialect` — `$schema` key present
- `test_tool_state_schema_is_valid_draft_2020_12` — per-tool schema passes check_schema
- `test_tool_state_schema_has_expected_properties` — properties match tool inputs

### Phase 2: Structural Validation (Level 1)

`test_json_schema_structural.py`:
- `test_valid_minimal_workflow_passes`
- `test_missing_required_field_fails` — no `steps` → error
- `test_invalid_step_type_fails` — `type: "bogus"` → enum error
- `test_extra_keys_allowed` — unknown top-level key passes (extra="allow")
- `test_comment_discriminator_works` — `type: "text"` ok, `type: "bogus"` fails

### Phase 3: Per-Step Tool State (Level 2)

`test_json_schema_tool_state.py`:
- `test_valid_state_passes`
- `test_wrong_type_fails` — int param given string
- `test_missing_required_param_fails`
- `test_extra_state_key_behavior` — verify matches model config
- `test_offline_schema_dir_mode` — pre-export then validate

### Phase 4: Integration (Two-Level Combined)

`test_json_schema_validation.py`:
- `test_full_workflow_valid` — real format2 workflow + populated cache → all green
- `test_structural_error_reported` — bad structure → structural_errors populated
- `test_tool_state_error_reported` — good structure + bad state → step failures
- `test_cli_mode_json_schema` — CLI `--mode json-schema`, check exit code + output

### Phase 5: TypeScript Round-Trip

`test/ts_json_schema/` vitest suite as described in section 4.

---

## Unresolved Questions

1. **Where does `CustomGenerateJsonSchema` live canonically?** gxformat2 can't depend on galaxy-tool-util. Options: (a) duplicate 5-line class, (b) extract tiny shared pkg, (c) plain generator + post-process inject `$schema`. Option (a) simplest.

2. **Should structural failure block step validation?** Probably yes — step walking might crash on malformed structure. Return early.

3. **Schema caching for level 2.** Generating per-step schema is expensive. LRU cache keyed on `(tool_id, tool_version)` for compiled `Draft202012Validator` instances?

4. **Discriminated unions in jsonschema + ajv.** gxformat2 `Discriminator` + `Tag` for comments/creators generates `oneOf`/`if-then`. Need to verify both `jsonschema` and `ajv` handle these. Highest risk.

5. **Strict mode?** `extra="allow"` won't catch typos. Offer `--strict-schema` that generates with `additionalProperties: false`? gxformat2 has `gxformat2_strict.py` — investigate if it has `extra="forbid"`.

6. **Offline schema naming convention.** For `tool_schema_dir`: `{tool_id_safe}/{version}.json` where `/` → `~`. Matches TRS ID convention.

7. **jsonschema vs Pydantic validation agreement.** Both should agree on same inputs. Add test that validates identical input with both approaches, asserts same pass/fail.

---

## Critical Files

| File | Action |
|---|---|
| `lib/galaxy/tool_util/workflow_state/validation_json_schema.py` | **New** — core two-level validation |
| `lib/galaxy/tool_util/workflow_state/validate.py` | Modify — add `--mode json-schema` path |
| `lib/galaxy/tool_util/workflow_state/scripts/workflow_validate.py` | Modify — `--mode`, `--tool-schema-dir` args |
| `lib/galaxy/tool_util/parameters/json.py` | Reference — `CustomGenerateJsonSchema` |
| `gxformat2/schema/gxformat2.py` | Modify — add JSON Schema export function |
| `lib/galaxy/tool_util/workflow_state/scripts/tool_cache.py` | Modify — `structural-schema` subcommand |
