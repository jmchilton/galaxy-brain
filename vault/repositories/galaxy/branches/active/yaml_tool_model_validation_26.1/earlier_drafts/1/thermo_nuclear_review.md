Run via Claude Opus 5.5 (claude-opus-5-5) at low effort.

# Thermo-nuclear code quality review — yaml_tool_model_validation_26.1

Reviewed `19281d57645..3be3d68a7a2`. I acted on two findings, both folded in as fixups. (1) A stale client `schema.ts`, which is a confirmed CI red in the OpenAPI lint job. (2) The duplicated dict-form/list-form loops in `_parse_test`, now collapsed into one flow. The structural shape of the branch is sound: validation sits in `YamlToolSource.__init__`, the canonical layer, and the two callers only translate the error. Nothing bigger was within scope.

New tip: `bfc06ef13e6` (was `3be3d68a7a2`). Not pushed.

Not acted on:
- **Parser raises pydantic `ValidationError`, so pydantic and `format_validation_errors` leak into `managers/tools.py` and `tools/__init__.py`.** A domain error type (like `UntrustedToolSourceError`) would be cleaner. It would churn about 30 test assertions that inspect `.errors()` locations, though. The two call sites have different messages and share only a one-line join.
- **Three `tool_format == "GalaxyTool"` checks in `create_tool`.** Collapsing them means reordering row creation and toolbox load. That is out of scope for a release-branch fix.
- **`create_tool_from_path` repeats the assert-200/`.json()` from `_create_tool_raw`.** Not changed: it follows the populator's `foo` / `foo_raw` idiom. Routing it through `_create_tool_raw` would need a separate payload helper for the same line count.
- **`from_yaml_test_format` `elif` fallback for `attributes.collection_type`.** It is small and local, and a rewrite would only shuffle it.
- **`test_parsing.py` is 1282 lines.** It was already 1142 on base, so the 1k rule doesn't trigger. Moving the YAML test-parsing tests into their own module would avoid the append conflicts, but it rewrites several commits.

<details><summary>Full review</summary>

## Verdict

Approve after the two fixes. No structural regression, no file crossed 1k lines, and no spaghetti growth in shared paths.

## Findings

### 1. Stale client API schema (CI blocker, acted on)

The "Drop scalar outputs" commit deletes `IncomingToolOutput{Text,Integer,Float,Boolean}` and rewords the `DynamicToolOutputs` description. `client/packages/api-client/src/schema/schema.ts` still referenced all four. `lint_openapi_schema.yml` regenerates the file and fails on any diff.

- Regenerated with `dump_openapi_schema.py`, then `openapi-typescript` under node 22.20.0, then `prettier`.
- The diff is only the four removed schemas, their union refs and the description. So base was in sync.
- `extra="forbid"` produces no TS change.
- Folded into `759b1c72731`.

### 2. `_parse_test` duplicated its collection special case (acted on)

The branch inserted `_is_collection_test` / `continue` into both the mapping loop and the list loop. A third pass then applied `_parse_test_output_attributes`. Now:

- the outputs become one `(name, value)` stream;
- shorthand `name: file` becomes `{"file": value}`;
- a single loop routes each output to collections or datasets, and the third pass is gone.

One small difference: shorthand dataset outputs now carry `file` in their attributes. List-form and long mapping-form outputs already did, and no consumer reads it. Folded into `77f104b3ec4`.

### 3. Re-parsing / rebuild safety (checked, no issue)

- Concern: validation at construction plus `attributes.pop("file")` could break a rebuild from a mutated `root_dict`.
- `parse_tests_to_dict` already deep-copies `tests`.
- A scratch repro confirmed it: parse twice, then `YamlToolSource(ts.root_dict)` on three in-tree tools gives identical output and a clean rebuild.

### 4. Pydantic error leaking across the parser boundary (not acted on)

- `YamlToolSource.__init__` raises `ValidationError`.
- `create_tool` and `dynamic_tool_to_tool` each import pydantic and run `"; ".join(format_validation_errors(e))`.
- A typed parser error carrying formatted messages would keep pydantic inside `tool_util`. It would also churn the new tests' location assertions.

### 5. `create_tool` GalaxyTool branching (not acted on)

- The pre-check for `from_path` is needed because the row is created before `load_dynamic_tool`.
- The `representation` path is already model-validated by the payload type.
- The cleaner fix is to build the tool source before creating the row. That is an ordering change, so out of scope.

### 6. Positives

- `extra="forbid"` moved from `IncomingUserToolOutputDataset` up to its base, which removes the duplication.
- The scalar-output deletion removes about 45 lines of dead model.
- `validate_galaxy_tool_source` deep-copies because the model normalizes in place. That is documented in one line, and a test pins it.

</details>

## Evidence

- Autosquash rebase with a per-commit `--exec` over the touched unit modules: green at every exec stop (333→360).
- No conflict markers in any commit (`git grep '^<<<<<<<'` over `rev-list`).
- HEAD vs old tip touches only `schema.ts` and `yaml.py`.
- Framework tests for all 13 test-carrying in-tree YAML tools: 20 passed.
- ruff/black clean on `yaml.py`. mypy shows only the pre-existing `filters = []` error.
- No client code consumes the removed `IncomingToolOutput*` scalar schemas. The only hits are the untracked `api-client/dist` build and `schema.ts` itself.
