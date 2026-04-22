# Python Workflow-Test Validation Plan (`gxwf validate-tests`)

Parallel to [TEST_SCHEMA_TS_PLAN.md](TEST_SCHEMA_TS_PLAN.md). The TS side vendors a JSON Schema dumped from Python; here we live inside Galaxy and validate directly against the Pydantic models (`galaxy.tool_util_models.Tests` / `TestJob`). No schema export, no Ajv — just `Tests.model_validate()` with structured error reporting.

## Decisions

- **Source of truth:** `galaxy.tool_util_models.Tests` (= `RootModel[List[TestJob]]`) plus `test_job.Job`. Already strict (`extra="forbid"`, discriminated `File` union, scalar/list/collection job values).
- **Validator:** Pydantic `model_validate` → flatten `ValidationError.errors()` into the existing `_report_models` `Diagnostic`-style shape so reporting matches `gxwf validate`.
- **v1 scope:** full `Tests` — job block + outputs + assertions. Matches TS v1.
- **CLI:** new `gxwf validate-tests` (single-file) + `gxwf validate-tests-tree` (directory walk). Registered via the existing `scripts/` + `gxwf.py` pattern.
- **No schema export pipeline needed on this side.** The TS plan's `scripts/dump-test-format-schema.py` is what consumes `Tests.model_json_schema()` for export; nothing to sync inbound.
- **File discovery:** `*-tests.yml` / `*-test.yml` / `*.gxwf-tests.yml` — same glob set Planemo/IWC use.

## Work items

### 1. Validator module (`lib/galaxy/tool_util/workflow_state/validation_tests.py`)

- `validate_tests_file(parsed: Any) -> TestsValidationResult` — wraps `Tests.model_validate(parsed)`, catches `ValidationError`, converts to structured diagnostics (path, message, category).
- `load_tests_file(path: Path) -> Any` — YAML load with error capture (reuse `workflow_tools.load_workflow` pattern or factor a tiny YAML helper; do NOT duplicate `yaml.safe_load` everywhere).
- Top-level-not-list check happens naturally via `RootModel[List[TestJob]]`; just ensure the diagnostic is legible.
- Keep the file small — this is a thin adapter, the models already carry the schema.

### 2. Report models (`_report_models.py`)

- Add `TestsValidationResult` / `SingleTestsValidationReport` / `TestsTreeReport` mirroring the validate counterparts. Reuse `Diagnostic` shape already used by `validate.py`.
- Exit code: non-zero if any file has errors; skip codes consistent with `--strict` convention.

### 3. CLI — single file (`scripts/workflow_validate_tests.py`)

- Mirror `workflow_validate.py` structure: `build_parser` / `register(subparsers)` / `main`.
- `ValidateTestsOptions` Pydantic options model (parallel to `ValidateOptions`).
- `run_validate_tests(options) -> SingleTestsValidationReport` in a new `validate_tests.py` orchestrator (parallel to `validate.py`).
- Flags: `--summary`, `--report-json [FILE]`, `--report-markdown [FILE]`, `--strict`.
- No tool cache needed — test validation is schema-only. Skip `ToolCacheOptions` / `build_base_parser`; use a lightweight parser or factor a "no-cache" variant of `build_base_parser`.

### 4. CLI — tree (`scripts/workflow_validate_tests_tree.py`)

- Use `_tree_orchestrator.collect_tree` / `run_tree` with a `process_one` that loads + validates one test file.
- Discovery: add `discover_test_files()` in `workflow_tree.py` (or a sibling) with the glob list above. Don't overload `discover_workflows` — test files are a distinct artifact.
- Reuse report emission from `_report_output.py`.

### 5. Register in `gxwf.py`

- Add `workflow_validate_tests` to `_SINGLE_FILE` and `workflow_validate_tests_tree` to `_TREE`. That's it — `gxwf validate-tests` and `gxwf validate-tests-tree` come for free.
- Add a `gxwf-state-validate-tests` console_script entry point in `setup.cfg` / `pyproject.toml` if we want the standalone entry (match pattern of existing `gxwf-*` scripts).

### 6. Tests (`test/unit/tool_util/workflow_state/test_validate_tests.py`)

Red-to-green. Reuse the same fixture set named in `TEST_SCHEMA_TS_PLAN.md` §3 so TS and Python exercise the same surface:
- Positive: `file_path.yml`, `file_location.yml`, `file_composite.yml`, `collection_list.yml`, `collection_paired.yml`, `collection_nested.yml`, `scalars.yml`, `list_of_files.yml`, `list_of_scalars.yml`.
- Negative: `neg_legacy_type_file.yml`, `neg_legacy_type_raw.yml`, `neg_elements_without_class.yml`, `neg_file_no_path_or_location.yml`, `neg_unknown_field.yml`, `neg_bad_collection_type.yml`, `neg_top_level_not_dict.yml` (→ top-level-not-list here).
- Place under `test/unit/tool_util/workflow_state/fixtures/tests/` — check if there's an existing test-file fixture dir before creating a new one.
- Tree-mode test: one mixed directory, assert per-file diagnostics + aggregate exit code.
- Declarative suite: consider adding a `test_declarative_tests.py` analogue to `test_declarative.py` if the YAML-driven pattern fits.

### 7. IWC sweep hook (`test_iwc_sweep.py`)

- Add a phase that walks IWC test files and validates them. Gated on `GALAXY_TEST_IWC_DIRECTORY`. Expect some failures initially — triage, don't suppress.

### 8. Docs (`doc/source/dev/wf_tooling.md`) — **DONE**

- One-paragraph addition + CLI example. Match the terseness of surrounding sections.
- Landed: Quick Reference table entries for `validate-tests` / `validate-tests-tree`,
  "Validating workflow-test files" subsection with CLI examples + exit codes.

### 9. Accept legacy `type:` sugar on `Collection` (post-IWC-sweep triage) — **DONE**

Implementation landed:
- `normalize_collection_type_alias()` helper in `tool_util_models/_base.py`.
- `@model_validator(mode="before")` wired into `Collection` (`test_job.py`) and
  `TestCollectionOutputAssertions` (`tool_util_models/__init__.py`).
- Fixtures: `collection_paired_type_sugar.yml`, `neg_collection_type_conflict.yml`
  under `test/unit/tool_util/workflow_state/fixtures/tests/`. Parametrized into
  `test_validate_tests.py`.
- Model-layer coverage added to `test/unit/tool_util/test_test_format_model.py`:
  sugar-accepted, passthrough, matching-values-allowed, conflict-rejected.
- IWC sweep (`TestIWCSweepValidateTests`): **88 passed / 32 failed** of 120
  (down from ~52 failures pre-change).
- Unresolved "silent vs warn": kept silent. No warning surface added.

Residual IWC failures (follow-ups, NOT this plan's scope):
- Diagnostic noise from un-discriminated `Union[TestCollectionOutputAssertions,
  TestDataOutputAssertions, TestOutputLiteral]` — single bad field produces
  errors across all three branches plus the scalar-literal types. The plan's
  own Unresolved section already flags this; needs a `class_` discriminator
  before exposing these diagnostics to IWC authors.
- Real authoring drift surfaced: duplicated YAML keys (baredSC), legacy
  `type: File`/`value:` job inputs, missing `class:` on Collection elements,
  unknown top-level fields. File upstream against IWC; not a validator bug.

Original plan text below for reference.


Motivation: first IWC sweep surfaced ~52/120 failures, dominated by nested
`class: Collection` elements that use `type: paired` instead of
`collection_type: paired`. Staging code (`load_data_dict` / fetch API) already
ignores that key — it's documentary authoring sugar, not load-bearing. Rather
than churn every IWC tests file, normalize it on the model side so the
validator accepts the sugar and Python consumers always see a canonical
`collection_type`.

Scope: model-level only. No consumer changes — validation is the only consumer
of these models today, so we pay zero migration cost.

- **`Collection` (`test_job.py`)**: accept `type` as input alias for
  `collection_type`. Preferred shape: `@model_validator(mode="before")` that
  pops `type`, assigns to `collection_type` if unset, and raises a clear
  `ValueError` if both are present with conflicting values. Keeps
  `extra="forbid"` intact and gives a better diagnostic than the generic
  `AliasChoices` "extra_forbidden" that would result from simple aliasing
  combined with `populate_by_name=True`.
- **`TestCollectionOutputAssertions` (`tool_util_models/__init__.py`)**: same
  normalizer. Output-side Collection assertions are the mirror shape and IWC
  files use `type:` there too. Factor a tiny helper so the two classes share a
  one-liner.
- **Serialization stays canonical.** `model_dump()` emits `collection_type`
  only; the alias is input-only. No JSON Schema surface change expected beyond
  documenting the alias (Pydantic's `json_schema_extra` / description bump).
- **No sugar for `class_`.** Only `type → collection_type`. `class: File` vs
  `class: Collection` is the genuine discriminator and stays untouched.

Fixtures:
- Positive: `collection_paired_type_sugar.yml` (outer `collection_type:
  list:paired`, inner element `class: Collection` + `type: paired`). This is
  the exact IWC shape.
- Negative: `neg_collection_type_conflict.yml` (both `collection_type` and
  `type` set to different values → explicit conflict error, distinct from the
  generic extra-field diagnostic).

Tests:
- Parametrize both fixtures into `test_validate_tests.py`.
- Add a `test_tool_util_models` unit asserting `Collection(**{"class":
  "Collection", "type": "paired"}).collection_type == "paired"` and that
  conflicting values raise — the sugar needs coverage at the model layer,
  not just via YAML.
- Re-run IWC sweep after the change; expected pass rate rises substantially.
  Remaining failures are triage for real authoring drift (missing `class:` on
  elements, unknown top-level fields, legacy `type: File` / `value:` job
  inputs — those are **not** normalized, stay red).

TS follow-up:
- The alias lives in Python; JSON Schema export just needs a schema-level
  hint (`description: "alias: type"`) or an explicit `oneOf` branch. Decide
  when the TS side re-syncs — cheapest option is probably to let the TS
  validator accept `type` via an Ajv pre-processor rather than re-model.
  Capture as a `TEST_SCHEMA_TS_PLAN.md` follow-up; not this plan's scope.

Unresolved:
- Should the normalizer also warn (not error) when only `type:` is used, to
  nudge authors toward the canonical form? Default: silent accept; noisy
  warnings create a second layer of diagnostic churn across IWC.
- Any other sugars worth normalizing on the same pass? Quick scan candidates:
  `class: File` + `value:` (legacy Planemo, today's `neg_legacy_type_file`
  case) — explicitly **not** in scope; that's authoring drift, not sugar.

## Test strategy (red-to-green)

1. Land fixtures + failing unit tests referencing `validate_tests_file`.
2. Implement `validation_tests.py`; positives green, negatives produce expected diagnostics.
3. Add single-file CLI + report plumbing; snapshot tests over text/JSON/markdown output.
4. Add tree variant + discovery; mixed-directory snapshot.
5. Wire into `gxwf.py`.
6. Run IWC sweep; file issues for any real failures found.
7. Land Phase 9 `type → collection_type` normalizer; re-run IWC sweep; triage residual failures.

## Relationship to TS plan

- Python side is the canonical validator. TS is a lossy (JSON-Schema-shaped) reflection.
- Fixture names identical across TS and Python so cross-implementation drift is visible.
- `Diagnostic` shape should stay compatible: same keys (`path`, `message`, `severity`) so VS Code can consume either validator's output without a shim.
- If we later want the TS side to delegate hard cases to a Python subprocess (e.g. for semantic cross-checks), the CLI shape here is that entry point — keep JSON report output stable.

## Unresolved questions

- Fixture home: new `fixtures/tests/` dir or reuse an existing Planemo/IWC-style path? Check first.
- Does `--strict` add anything beyond exit-code behavior here? (No tool cache, no skips — may be a no-op.)
- Do we want `--format {text,json,markdown}` on the single-file command, or stick with `--report-*` flags like the others for consistency?

User Input: Stick with the things here for consistency please.

- `TestOutputAssertions` depth: **resolved — fully strict.** All variants are `StrictModel(extra="forbid")`; `asserts:` uses the auto-generated `assertions.py` discriminated RootModel (`discriminator="that"`, every `AssertionModel(extra="forbid")`). Follow-ups this exposes:
  - **Diagnostic noise.** Outer `Union[TestCollectionOutputAssertions, TestDataOutputAssertions, TestOutputLiteral]` is un-discriminated — every negative output produces errors for all three variants, and any `asserts:` failure drags in a ~2KB dump of every `*_model` name. Add a discriminator (by `class_`, with a scalar-literal fallback) before exposing diagnostics to users, or post-filter in the report layer.
  - **Latent authoring gotcha.** `TestCollectionCollectionElementAssertions` doesn't accept `class:`, so `elements: {a: {class: Collection, elements: {...}}}` fails. Confirm intended vs. oversight before running against IWC.
  - TS plan §unresolved ("how deep does Pydantic's JSON Schema export go") — answer: all the way. Expect the TS-exported schema to be large; Ajv error output will want the same filtering.
- Console-script name — `gxwf-validate-tests` (verb-object) vs `gxwf-state-validate-tests` (namespace parallel)? Current `gxwf-state-*` namespace is tool-state-centric; tests aren't tool-state, so `gxwf-validate-tests` may read better.
- Should `gxwf lint-stateful` pick up `validate-tests` as a third phase when a sibling tests file is present?

User Input: Nah.