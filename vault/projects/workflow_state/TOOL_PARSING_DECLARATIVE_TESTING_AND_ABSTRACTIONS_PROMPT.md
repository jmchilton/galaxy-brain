# Agent Prompt: Declarative Testing + Extension Points for Galaxy Tool Parsing

## Who you are

You're a senior software engineer working on interoperable Galaxy tool/workflow abstractions across Python and TypeScript. Read `GXWF_AGENT.md` (this directory) first — it's the standing context for the whole cross-language effort. This prompt narrows that effort to one layer: **tool parsing**.

## The goal

Today we can take a workflow, run it through a Python operation (clean / validate / export / roundtrip), and assert the result declaratively from a YAML expectation file. Those same YAML fixtures + expectations are rsynced into the TypeScript monorepo and replayed against the TS implementation. That's the mirroring pattern, and it works — it's the source of truth for Python/TS parity, and it's explicitly called out in `GXWF_AGENT.md` as high-value (vs. hand-written unit tests, which are expendable).

**We want the same thing one layer down, for tool parsing.** The end state:

> Take an XML or YAML tool source, build a `ParsedTool`, and assert its structure declaratively from a YAML expectation file — such that TypeScript can eventually parse tools too and be verified against the *same* expectations.

Your job is to design that: the abstractions, the declarative layer, the extension points in the parsing layer, and the fixture/expectation format. Redesign the tool parsing layer where it's warranted; at minimum add the extension points that make this testable and mirrorable. Coming up with the actual shape is yours to decide — this document is pointers and constraints, not a design.

## Repos / worktrees

| What | Path |
|---|---|
| Galaxy (Python source of truth) | `/Users/jxc755/projects/worktrees/galaxy/branch/wf_tool_state` |
| gxformat2 (declarative harness lives here) | `/Users/jxc755/projects/worktrees/gxformat2/branch/abstraction_applications` |
| TypeScript monorepo (the mirror) | `/Users/jxc755/projects/worktrees/galaxy-tool-util/branch/report_models` |
| VS Code extension (downstream consumer) | `/Users/jxc755/projects/worktrees/galaxy-workflows-vscode/branch/wf_tool_state` |

Paths below are relative to whichever of those a section is about.

---

## Part 1 — The parsing layer you'd be changing (Galaxy)

### The target object

- `lib/galaxy/tool_util_models/__init__.py:496` — **`ParsedTool`**. The destination model. Fields: `id`, `version`, `name`, `description`, `requirements`, `containers`, `stdio`, `inputs: list[ToolParameterT]`, `outputs: list[ToolOutput]`, `citations`, `license`, `profile`, `edam_operations`, `edam_topics`, `xrefs`, `help`. This is also the wire shape served by `/api/tools/{id}/parsed` and by the ToolShed 2.0 TRS API — so it is *already* a cross-language contract, not just an internal type.

### How a `ParsedTool` gets built today

- `lib/galaxy/tool_util/model_factory.py` — **`parse_tool(tool_source) -> ParsedTool`** and `parse_tool_custom(tool_source, model_type)`. ~110 lines, and it's the whole assembly: a flat sequence of `tool_source.parse_*()` calls plus `input_models_for_tool_source()` and `from_tool_source()`. Small, readable, and the natural seam — but there's currently no way to hook it, subclass a stage, or swap a piece.
- `lib/galaxy/tool_util/parser/interface.py` (901 lines) — the **`ToolSource`** ABC. ~50 `parse_*` methods; grep `def parse_` to see the full surface. Also defines `InputSource`, `PageSource`, `PagesSource`.
- `lib/galaxy/tool_util/parser/xml.py` (1700 lines) — `XmlToolSource`. The big one.
- `lib/galaxy/tool_util/parser/yaml.py` (597 lines) — `YamlToolSource`. Also the path used for inline/user-defined tools (`GalaxyUserTool`).
- `lib/galaxy/tool_util/parser/cwl.py` (248 lines) — `CwlToolSource`.
- `lib/galaxy/tool_util/parser/factory.py` (130 lines) — `get_tool_source(path)`, format dispatch.
- `lib/galaxy/tool_util/parser/output_objects.py` (547 lines) — `from_tool_source()`, outputs → `ToolOutput` models.
- `lib/galaxy/tool_util/parameters/factory.py` (523 lines) — inputs → parameter models. Key entry points: `input_models_for_tool_source()`, `input_models_for_pages()`, `input_models_for_page()`, `from_input_source()`, `_from_input_source_galaxy()` (the ~320-line per-type switch), `_from_input_source_cwl()`.
- `lib/galaxy/tool_util/parameters/visitor.py`, `state.py`, `convert.py`, `case.py`, `json.py` — the rest of the parameter machinery (state models, JSON Schema export, test-case handling). Note `CURRENT_STATE.md` records a recent "parameter visitor refactoring" here.
- `lib/galaxy/tool_util/parser/parameter_validators.py`, `stdio.py`, `output_collection_def.py`, `output_actions.py` — supporting parsers.

### Tool fixtures that already exist (reuse, don't invent)

- `test/functional/tools/` — **302 XML + 6 YAML tools**. A tool per feature, accumulated over a decade. This is the corpus.
- `lib/galaxy/tool_util/unittest_utils/__init__.py` — `functional_test_tool_directory()`, `functional_test_tool_path(name)`, `functional_test_tool_source(name)`. The existing resolution helpers.
- `lib/galaxy/tool_util/unittest_utils/parameters.py` — `parameter_bundle_for_file()`, `parameter_bundle_for_framework_tool()`.

### Existing tool-parsing tests (what you'd be improving on)

All under `test/unit/tool_util/`:

- `test_parsing.py` — the incumbent. Giant inline `TOOL_XML_1 = """..."""` heredocs + imperative assertions, `TestCase` classes. This is the style to move away from.
- `test_parsed_tool_model.py`, `test_input_models.py`, `test_output_models.py` — model-level tests.
- `test_tool_loader.py`, `test_test_parsing.py`, `test_test_definition_parsing.py`, `test_parameter_test_cases.py` — adjacent parsing surfaces.
- `test_parameter_convert.py`, `test_parameter_validator_models.py`, `test_parameter_specification_json_schema.py`.
- `test_user_tool_source_fixtures.py` — user-defined tool source fixtures.

### The closest existing precedent — read this carefully

- `test/unit/tool_util/parameter_specification.yml` + `test/unit/tool_util/framework_tool_checks.yml`, driven by `test/unit/tool_util/test_parameter_specification.py`.

  These are already declarative and already mirrored to TS (see Part 3). Shape:

  ```yaml
  column_param:
    request_valid:
    - input1: {src: hda, id: abcde133543d}
      col: 1
    request_invalid:
    - col: moocow
  ```

  Keyed by tool id; each case lists states that must validate / must not validate across ~12 state representations (`request`, `request_internal`, `job_internal`, `landing`, `test_case`, `workflow_step`, `workflow_step_linked`, `workflow_step_native`, …). `framework_tool_checks.yml` is the same format pointed at `test/functional/tools/` instead of purpose-built parameter tools — its header comment explains the reasoning, and that reasoning applies to you.

  **Important distinction:** `parameter_specification.yml` tests *state validation against a parsed tool*. It assumes parsing worked and asserts nothing about the `ParsedTool` structure itself. That gap — "did we parse this XML into the right `ParsedTool`?" — is exactly what you're filling. Decide whether your layer extends this file's format, sits beside it, or subsumes it, and justify the call.

---

## Part 2 — The declarative harness that already exists (reuse this)

- `gxformat2/testing.py` (310 lines, gxformat2 worktree) — **the harness**. Generic, not workflow-specific. Provides:
  - `Assertion` — `path: list[PathElement]` plus exactly one of `value`, `value_contains`, `value_any_contains`, `value_set`, `value_matches`, `value_truthy`, `value_falsy`, `value_type`, `value_absent`.
  - `navigate(obj, path)` — walks dicts by key, lists by int index, **Pydantic models by attribute**, supports `$length` and `{field: value}` list-selector elements. It already handles model objects, which matters: `ParsedTool` is a model, not a dict.
  - `TestCase` — `fixture`, `operation`, `expect_error`, `assertions`.
  - `ExpectationSuite.from_yaml()`, `load_expectation_cases()`, `run_declarative_case()`, `DeclarativeTestSuite` (with `.pytest_params()` for parametrization).

  The harness knows nothing about workflows. Registering a set of named operations and a fixture resolver is all a caller does. Adding tool-parsing operations should be additive; if `navigate`/`Assertion` need new capabilities for tool shapes, extend them there so TS inherits them.

- `test/unit/tool_util/workflow_state/test_declarative.py` (Galaxy) — **the reference caller**, ~the exact pattern to copy. Wires `DeclarativeTestSuite` with a `_resolve_fixture_path()` (searches fixtures dir → framework test data → IWC → inline-UDT → absolute) and named operations (`clean`, `validate`, `export_format2`, `clean_then_validate`).
- `test/unit/tool_util/workflow_state/expectations/` — `clean.yml`, `validate.yml`, `clean_then_validate.yml`, `export_format2.yml`, `validate_clean.yml`, `strict.yml`. Read `clean.yml` and `validate.yml` for the idiom:

  ```yaml
  clean_synthetic_cat1_bookkeeping_stripped:
    fixture: synthetic-cat1-stale.ga
    operation: clean
    assertions:
      - path: [steps, "1", tool_state, __page__]
        value_absent: true
  ```

- `test/unit/tool_util/workflow_state/fixtures/` — fixture workflows.
- `test/unit/tool_util/workflow_state/functional_tool_info.py` — `FunctionalGetToolInfo`, resolves tool info from `test/functional/tools/` for tests.
- `test/unit/tool_util/workflow_state/connection_type_cases.yml` — a different declarative flavor (algebra truth table), also synced to TS. Worth a look as a second data point on format.

---

## Part 3 — The TypeScript mirror (why the abstractions have to be portable)

TS monorepo: `/Users/jxc755/projects/worktrees/galaxy-tool-util/branch/report_models`.

### TS already parses tools — partially

- `packages/schema/src/user-tool-parse/` — `index.ts`, `parse.ts`, `inputs.ts`, `outputs.ts`. Its own header says it is *"the TS port of Galaxy's `parse_tool(YamlToolSource(repr))` path"*, producing a `ParsedTool`. Currently scoped to inline `GalaxyUserTool` representations, and explicitly **excludes stdio / requirements / containers**.
- `packages/schema/src/schema/parsed-tool.ts` — the Effect `ParsedTool` schema. `bundle-types.ts` alongside it has the parameter models.
- `packages/schema/src/user-tool-source/` — `schema.json` (+ `.sha256`), `schema.generated.ts`, `validate.ts`, `semantic.ts`. Generated from Galaxy's `DynamicToolSources` via `make sync-user-tool-source-schema`.
- `packages/schema/test/user-tool-parse.test.ts`, `packages/schema/test/parsed-tool.test.ts` — currently hand-written smoke tests. `parsed-tool.test.ts` decodes a real ToolShed fastqc fixture.

**This is the beachhead.** A full TS tool parser is a generalization of `user-tool-parse` (YAML/inline today; XML is the open question). Your Python-side design decides what that TS parser has to match, and what it can be tested against.

### How sync works — your expectations must fit this pipeline

- `Makefile` — sync targets. Note the existing families:
  - `sync-param-spec` → copies `test/unit/tool_util/parameter_specification.yml` → `packages/schema/test/fixtures/parameter_specification.yml`
  - `sync-wfstate-fixtures` / `sync-wfstate-expectations` → workflow_state fixtures + expectations
  - `sync-workflow-fixtures` / `sync-workflow-expectations` (gxformat2)
  - `sync-parsed-tools` — **most relevant**: runs Python under the Galaxy venv to emit `ParsedTool` JSON + a SHA256 manifest for TS to consume
  - `sync-test-format-schema`, `sync-user-tool-source-schema` — JSON Schema dumps with `.sha256` checksums and `verify-*` / `check-sync-*` guards wired into `make check`
- `scripts/sync-manifest.json` — declares the rsync groups (`src_root`, `src`, `dst`, `patterns`/`files`). **Adding a new synced corpus means adding a group here**, plus `sync-*` / `check-sync-*` Makefile targets.
- `scripts/sync-fixtures.mjs` — `--sync` / `--check` driver.
- `scripts/sync-parsed-tools.py` — the existing Python-side dumper: walks synced `.gxwf.yml` fixtures, collects tool ids, resolves each via `functional_test_tool_source()` (falling back to a walk of `functional_test_tool_directory()`), `parse_tool()`s it, writes one JSON per tool + a SHA256 manifest. Loud failure on unresolved ids, no silent skips. **Read this — it is 80% of a "dump ParsedTool goldens for TS" mechanism already**, driven off connection-workflow fixtures rather than a tool list.
- TS-side declarative replay: `packages/schema/test/declarative-normalized.test.ts`, `packages/schema/test/declarative-test-utils.ts`, `packages/integration-tests/test/declarative-wfstate.test.ts`, `packages/integration-tests/test/declarative-test-utils.ts`. These are the TS ports of `gxformat2/testing.py` — a new assertion mode or path-element type on the Python side has to be implemented here too.
- `packages/schema/test/parameter-specification.test.ts` — TS replaying `parameter_specification.yml`. The end-to-end proof the pattern works.
- `GALAXY_ROOT=... GXFORMAT2_ROOT=... make check-sync` — CI-side drift guard.

### Downstream consumers to not break

- `/api/tools/{id}/parsed`, `/versions/{v}/parsed`, `/versions/{v}/parameter_request_schema`, `/versions/{v}/parameter_landing_request_schema`, `/versions/{v}/parameter_test_case_xml_schema` — `lib/galaxy/webapps/galaxy/api/tools.py`.
- ToolShed 2.0 TRS API serves `ParsedTool`; `galaxy-tool-cache` and `packages/core/src/client/toolshed.ts` + `packages/core/src/tool-info.ts` consume it.
- `GetToolInfo` protocol (`lib/galaxy/tool_util/workflow_state/_types.py`) — the workflow_state layer's only view of a tool is `ParsedTool`. Impls: `ToolShedGetToolInfo`, `CombinedGetToolInfo`, `ToolboxGetToolInfo`, `InlineResolver`.
- `lib/galaxy/tool_util/workflow_state/_inline_tool.py` — inline/UDT parse+validate; the Python counterpart to TS `user-tool-parse`.

---

## Part 4 — What we want out of you

1. **A design** for declaratively testing tool parsing: XML or YAML tool source → `ParsedTool` → path-based assertions in YAML. Reuse `gxformat2/testing.py`; extend it in place if it's short.
2. **Extension points / refactoring in the parsing layer** to make that clean — `model_factory.parse_tool` and `parameters/factory.py` are the obvious seams. Say what you'd change, and be honest about which parts are redesign vs. additive.
3. **The expectation format**, with worked examples covering the interesting cases: conditionals, repeats, sections, `data_column`, dynamic/`from_dataset` selects, collection inputs, outputs incl. collections + discovered datasets, stdio, requirements/containers, profile-conditional behavior, CWL if it's in scope.
4. **The fixture story** — how much of `test/functional/tools/` you cover and how you pick, following the `framework_tool_checks.yml` reasoning.
5. **The sync story** — the `sync-manifest.json` group + Makefile targets + `check-sync` guard, so TS can replay these. Say explicitly what a TS tool parser would need to implement to pass, and how much of `user-tool-parse` generalizes.
6. **A migration path** for `test_parsing.py` and friends — what gets converted, what stays imperative and why.
7. **A test plan.** Red-to-green: expectations that fail against today's code first where you're fixing real behavior. Don't delete tests, drop assertions, or edit fixtures to make things pass — if that's where you land, stop and ask.
8. **Unresolved questions** at the end, concise.

## Constraints

- `galaxy-tool-util` must stay independent of galaxy-app/galaxy-data. Default test location is `test/unit/tool_util/` (the isolated env). `CURRENT_STATE.md` documents the relocations that were needed when tests reached into `galaxy.workflow`/`galaxy.model` — don't repeat that mistake.
- Python is the source of truth. TS mirrors. Expectation YAML and fixtures are the contract between them, and they must be plain data — no Python-only constructs a TS runner can't evaluate.
- Declarative YAML fixture tests are high-value; hand-written unit tests of internal functions are expendable. Don't confuse the two (`GXWF_AGENT.md`).
- This is a very old, very well-established codebase. Strongly prefer reusing existing abstractions (`ToolSource`, `InputSource`, `DeclarativeTestSuite`, `sync-fixtures.mjs`, `functional_test_tool_source`) over new parallel ones, and aim for abstractions that are themselves reusable. Check what exists before proposing scaffolding.
- Python imports at the top of the file, not inside functions, unless there's a commented reason.
- No references to plan documents, this prompt, or issue numbers in code comments.
- `pyproject.toml` on `wf_tool_state` pins gxformat2 to a git branch (`jmchilton/gxformat2@parameter_models`); `run_tests.sh` / `common_startup.sh` will silently downgrade it to PyPI `gxformat2==0.27.0` and take the venv off-pin. If `gxformat2.testing` imports vanish, that's why — reinstall the branch. Changes to `gxformat2/testing.py` need that branch installed editable to be exercised from Galaxy.
- Galaxy test suites are slow — run one at a time, don't parallelize. Use the `/galaxy-backend-tests` skill for API/integration/framework tests. Check for `.venv` in the worktree; `/galaxy-bootstrap` if absent.

## Start here

Read in this order: `GXWF_AGENT.md` → `CURRENT_STATE.md` (same directory; the workflow_state package inventory and what the mirroring bought us) → `gxformat2/testing.py` → `test/unit/tool_util/workflow_state/test_declarative.py` + `expectations/clean.yml` → `lib/galaxy/tool_util/model_factory.py` → `test/unit/tool_util/parameter_specification.yml` + `test_parameter_specification.py` → `packages/schema/src/user-tool-parse/parse.ts` → `scripts/sync-parsed-tools.py` + `scripts/sync-manifest.json`.
