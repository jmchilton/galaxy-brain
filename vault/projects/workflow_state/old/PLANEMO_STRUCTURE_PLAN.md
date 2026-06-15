# Planemo CLI Structure and Output Schemas

Target worktree: `/Users/jxc755/projects/worktrees/planemo/branch/structure`

Goal: make Planemo automation-friendly for downstream agents and build/casting systems without adding skill/runtime Python dependencies beyond `planemo` being on `PATH`.

## Core Direction

Planemo should grow two structured surfaces upstream:

- A machine-readable CLI metadata export derived from the actual Click command objects.
- JSON Schemas for every machine-readable output shape we expect agents, Foundry casts, CI tools, or other downstream systems to parse.

Foundry should consume these structured surfaces at Astro build and cast time. Generated skills should not import Planemo Python modules; they should invoke `planemo` as a subprocess and validate Planemo outputs against bundled schemas.

## Research Findings

### CLI command structure

Planemo commands are dynamically discovered from `planemo/commands/cmd_*.py`.

Relevant files:

- `planemo/cli.py`: `list_cmds()` scans command files; `name_to_command()` imports `planemo.commands.cmd_<name>:cli`; `PlanemoCLI` delegates command listing/loading; `command_function()` wraps callbacks with Planemo context/profile/default handling.
- `planemo/options.py`: shared Click option factories and composed option groups. This is where many important defaults, choices, path types, config/env behavior, and shared runtime/test options are declared.
- `planemo/config.py`: `planemo_option()` wraps `click.option` and implements Planemo-specific config/env default resolution.
- `scripts/commands_to_rst.py`: current docs generator imports `planemo.cli`, calls `list_cmds()`, invokes `planemo <command> --help` with `CliRunner`, text-parses help output, and writes `docs/commands/*.rst`.
- `Makefile`: `ready-docs` rebuilds command docs before Sphinx docs.

Current docs are generated from help text, not structured introspection. That is useful for humans but too lossy for agents.

Important gap: `planemo_option()` rewrites defaults and uses callbacks for global config/env handling. If we introspect only raw Click fields, logical defaults and config/env metadata may be missing unless Planemo attaches its own metadata to the Click `Option` objects when creating them.

Likely bug found during research: `planemo/commands/cmd_database_list.py` appears to describe `database_list`, but its Click decorator declares `@click.command("database_create")`. Add a command-name consistency test before making metadata a contract.

### Machine-readable outputs

Planemo already emits several JSON-ish outputs, but they are loose dicts without schemas.

Relevant files:

- `planemo/commands/cmd_test.py`: `planemo test` delegates to `test_runnables()` and documents `--test_output_json`, defaulting to `tool_test_output.json`.
- `planemo/engine/interface.py`: builds the test report root as `{ "version": "0.1", "tests": [...] }`, wraps it in `StructuredData`, and calculates summary.
- `planemo/test/results.py`: `StructuredData` is a dict wrapper that loads JSON, indexes tests by id, writes JSON, and calculates `summary` / `exit_code`.
- `planemo/runnable.py`: `RunResponse.structured_data()` builds the per-test result payload with fields like `status`, `job`, `invocation_details`, `problem_log`, `output_problems`, `execution_problem`, datetimes, and inputs.
- `planemo/galaxy/test/actions.py`: `handle_reports()`, `handle_reports_and_summary()`, `merge_reports()`, and the JSON writer for `--test_output_json`.
- `planemo/commands/cmd_run.py`: `planemo run --output_json` writes raw `run_result.outputs_dict`, then separately emits the test-style report through `handle_reports_and_summary()`.
- `planemo/commands/cmd_workflow_test_on_invocation.py`: creates a one-test `{ "version": "0.1", "tests": [...] }` report from an existing invocation and uses the same report pipeline.
- `planemo/commands/cmd_invocation_download.py`: accepts `--output_json` through decorators but currently only downloads files; it does not write the JSON manifest.
- `planemo/reports/build_report.py` and `planemo/reports/*.tpl`: consume and mutate loose structured report dicts for HTML, markdown, text, xUnit, jUnit, and Allure outputs.

Important output gaps:

- No schema validates `tool_test_output.json`.
- `StructuredData` is permissive and catches broad exceptions while loading.
- Existing fixture `tests/data/issue381.json` includes `has_data: false` and `data: null`; schemas must preserve this compatibility.
- `merge_reports()` emits only `{ "tests": [...] }`, dropping `version`, `summary`, and `exit_code`.
- `build_report.py` counts `status == "skipped"`, while core summary logic uses `"skip"`.
- `invocation_download --output_json` is advertised but unused.
- `planemo run --output_json` has a different shape than `--test_output_json`, and backend-specific content is currently loose.

### Tests and CI

Relevant files:

- `pyproject.toml`: Python `>=3.10`; console script `planemo = "planemo.cli:planemo"`; black/ruff config.
- `tox.ini`: main unit command and useful quick/Galaxy-specific selectors.
- `pytest.ini`: currently ignores `planemo/commands/cmd_test.py` because command implementation name collides with pytest discovery.
- `.github/workflows/ci.yaml`: lint, docs lint, mypy, quick unit, and selected Galaxy-branch suites.
- `tests/test_utils.py`: `CliTestCase`, `CliRunner`, isolated filesystem helpers, fixture-copy helpers, skip markers.

Relevant tests to reuse:

- `tests/test_planemo.py`: command `--help` coverage, expected command list, root help/version, typo suggestions.
- `tests/test_cmd_test.py`: `--test_output_json`, workflow test JSON shape, CWL quick tests, output assertion structured data checks.
- `tests/test_run.py`: `run` emits `tool_test_output.html/json`, `--output_directory`, `--download_outputs`, `--export_invocation`.
- `tests/test_cmds_with_workflow_id.py`: end-to-end `workflow_test_on_invocation`.
- `tests/test_cmd_download_invocation_export.py`: `invocation_download` / invocation export end-to-end tests.
- `tests/test_cmd_test_reports.py`: `test_reports` basic, Allure, markdown behavior.
- `tests/test_cmd_workflow_test_init.py`: generated tests/job behavior.
- `tests/test_cmd_workflow_job_init.py`: strong precedent for richer workflow metadata via `job_template_with_metadata()`.

## Architecture Proposal

### Runtime boundary

Runtime users and generated skills should only need:

- `planemo` on `PATH`.
- A command invocation contract.
- Bundled JSON Schemas for outputs they parse.

They should not need:

- A Planemo checkout.
- Python imports from Planemo.
- Pydantic installed separately from Planemo.
- A docs build environment.

### Build/cast boundary

Build and casting processes may use Python to extract Planemo metadata and schemas.

Allowed at build/cast time:

- `python -m planemo...` style helpers.
- `planemo cli_metadata` / `planemo schema` style CLI exports.
- Pydantic model introspection inside the Planemo package.
- A checked-out Planemo branch while upstream work is in flight.

Not allowed at runtime/skilltime:

- Importing Planemo modules from generated skills.
- Requiring Python helper scripts beyond invoking the `planemo` executable.

### Structured surfaces to add upstream

Add these durable surfaces in Planemo:

- `planemo cli_metadata --format json [--command NAME] [--include-internal]`
- `planemo output_schema --format json [--schema NAME]`
- Optional Python API equivalents for internal use and tests.

Names are provisional. `output_schema` could be `schema`, `json_schema`, or `metadata` if Planemo has naming conventions I missed. Avoid overloading `docs`.

## Work Plan

## Current Branch State

Updated: 2026-05-03

Planemo branch `/Users/jxc755/projects/worktrees/planemo/branch/structure` has base commit `a0d765fd Add structured CLI and output schemas` plus uncommitted updates for invocation manifests, report normalization, runtime/input validation, and docs.

Implemented:

- Command-name consistency guardrail tests.
- `database_list` Click decorator mismatch fixed.
- Shared internal command policy moved to `planemo.cli.INTERNAL_COMMANDS`; docs generator now reuses it.
- `planemo cli_metadata --format json` added.
- CLI metadata extraction from actual Click commands added in `planemo/cli_metadata.py`.
- `planemo_option()` now attaches Planemo-specific option metadata for downstream introspection.
- CLI metadata tests added for aliases, internal command filtering, `test`, `run`, and `workflow_test_on_invocation`.
- Pydantic runtime dependency added explicitly as `pydantic>=2`.
- `PlanemoTestReport` model added under `planemo/test/models.py`.
- `PlanemoRunOutputs` permissive model added under `planemo/output_models.py`.
- `planemo output_schema --format json` added.
- JSON Schema exports added for `test-report` and `run-outputs`.
- Existing `tests/data/issue381.json` validates as `PlanemoTestReport`, including `has_data: false, data: null`.
- Fast generated CWL `tool_test_output.json` validates as `PlanemoTestReport`.
- Fast CWL `planemo run --output_json` output validates as `PlanemoRunOutputs`.
- `invocation_download --output_json` writes a validated manifest.
- `PlanemoInvocationDownloadManifest` schema is exported.
- `invocation_download` manifest paths default to relative paths and support absolute paths with `--output_json_path_type absolute`.
- Missing/skipped invocation outputs are listed in the manifest.
- `merge_test_reports` now emits a full `PlanemoTestReport` with `version`, `summary`, and `exit_code`.
- Report summary/rendering paths normalize legacy `skipped` to canonical `skip` and count skipped tests consistently.
- `handle_reports()` validates `--test_output_json` before writing.
- `planemo run --output_json` validates `PlanemoRunOutputs` before writing.
- `test_reports` and `merge_test_reports` validate input JSON and emit friendly errors for invalid reports.
- `PlanemoTestReport` now requires `data.status` when `has_data: true`.
- Narrative docs and dev changelog now document structured output behavior.
- Generated command/API docs refreshed for `cli_metadata`, `output_schema`, and `invocation_download` options.

Verified:

```sh
.venv/bin/pytest tests/test_planemo.py tests/test_cli_metadata.py tests/test_output_schema.py tests/test_cmd_test.py::CmdTestTestCase::test_cwltool_tool_test tests/test_run.py::RunTestCase::test_run_cat_cwltool
.venv/bin/flake8 planemo/cli.py planemo/config.py planemo/cli_metadata.py planemo/output_models.py planemo/output_schemas.py planemo/test/models.py planemo/commands/cmd_cli_metadata.py planemo/commands/cmd_output_schema.py planemo/commands/cmd_database_list.py tests/test_cli_metadata.py tests/test_output_schema.py tests/test_cmd_test.py tests/test_run.py scripts/commands_to_rst.py
.venv/bin/pytest tests/test_cli_metadata.py tests/test_output_schema.py tests/test_cmd_merge_reports.py tests/test_cmd_test_reports.py
.venv/bin/pytest tests/test_cmd_download_invocation_export.py::CmdTestTestCase::test_download_run_output
.venv/bin/flake8 planemo/commands/cmd_invocation_download.py planemo/output_models.py planemo/output_schemas.py planemo/galaxy/test/actions.py planemo/test/results.py planemo/reports/build_report.py tests/test_output_schema.py tests/test_cmd_download_invocation_export.py tests/test_cli_metadata.py tests/test_cmd_merge_reports.py tests/test_cmd_test_reports.py
.venv/bin/pytest tests/test_output_schema.py tests/test_cmd_test_reports.py tests/test_cmd_merge_reports.py tests/test_run.py::RunTestCase::test_run_cat_cwltool tests/test_cmd_test.py::CmdTestTestCase::test_cwltool_tool_test
.venv/bin/pytest tests/test_cmds_with_workflow_id.py::CmdsWithWorkflowIdTestCase::test_serve_workflow
make lint-docs
```

Note: `make lint-docs` regenerated command/API docs but currently fails on pre-existing Sphinx warnings about `standards/docs/best_practices` and an ambiguous `type` cross-reference.

Still remaining:

- Docs generator still uses help text parsing; only shared internal-command policy was extracted.
- Dedicated `RunResponse.structured_data()` unit validation remains.
- Docs lint warnings remain: missing `standards/docs/best_practices` toctree target and ambiguous `type` cross-reference.

### Phase 0: Guardrails and bug-finding tests

Purpose: add cheap tests that expose current drift before layering metadata on top.

Work items:

1. Done in `tests/test_cli_metadata.py`: added command-name consistency test.
2. Done: each `planemo/commands/cmd_<name>.py` imports and asserts `command.name == name`.
3. Done: moved current internal command policy from `scripts/commands_to_rst.py` into `planemo.cli.INTERNAL_COMMANDS`; added test documenting `create_gist`, `shed_download`.
4. Done: guardrail exposed `cmd_database_list.py`; fixed decorator to `database_list`.
5. Done: added manifest helper/schema tests and updated Galaxy E2E test for `invocation_download --output_json`.

Expected red failures:

- Done/fixed: `database_list` command-name mismatch.
- Done/fixed: `invocation_download --output_json` missing output file.

Fix scope:

- Done: fixed command decorator mismatch.
- Done: implemented `invocation_download --output_json` manifest.

Tests to run:

```sh
pytest tests/test_planemo.py
pytest tests/test_cmd_download_invocation_export.py
```

### Phase 1: CLI metadata extraction

Purpose: create a structured, automation-friendly view of Planemo commands from the actual Click objects.

New module:

- `planemo/cli_metadata.py`

Status: implemented.

Suggested API:

```python
def iter_command_names(include_internal: bool = False) -> list[str]: ...
def load_command_metadata(command_name: str) -> dict: ...
def load_planemo_metadata(include_internal: bool = False) -> dict: ...
def serialize_click_command(command_name: str, command: click.Command) -> dict: ...
def serialize_click_param(param: click.Parameter) -> dict: ...
def serialize_click_type(param_type: click.ParamType) -> dict: ...
```

Suggested root shape:

```json
{
  "schema_version": "0.1",
  "program": "planemo",
  "planemo_version": "...",
  "commands": [
    {
      "name": "test",
      "module": "planemo.commands.cmd_test",
      "help": "Run specified tool or workflow tests within Galaxy.",
      "short_help": "Run specified tool or workflow tests within Galaxy.",
      "usage": "planemo test [OPTIONS] TOOL_PATH",
      "internal": false,
      "hidden": false,
      "params": []
    }
  ],
  "aliases": { "t": "test", "s": "serve", "l": "lint", "o": "open" }
}
```

Suggested parameter shape:

```json
{
  "kind": "option",
  "name": "test_output_json",
  "opts": ["--test_output_json"],
  "secondary_opts": [],
  "help": "Output test report (planemo json) defaults to tool_test_output.json.",
  "required": false,
  "multiple": false,
  "nargs": 1,
  "type": { "name": "path", "exists": false, "file_okay": true, "dir_okay": false },
  "default": "tool_test_output.json",
  "is_flag": false,
  "flag_value": null,
  "envvar": null,
  "planemo_config": {}
}
```

Click metadata to preserve:

- `option` vs `argument`.
- `name`, `opts`, `secondary_opts`.
- `help`.
- `required`, `multiple`, `nargs`.
- `is_flag`, `flag_value`, `prompt`, `hidden`.
- `default`, but see Planemo-specific default caveat below.
- `click.Choice` choices.
- `click.IntRange` / range metadata where possible.
- `click.Path` metadata: `exists`, `file_okay`, `dir_okay`, `writable`, `readable`, `resolve_path`, `allow_dash` if accessible.
- env var metadata.

Planemo-specific metadata to add:

- In `planemo/config.py`, update `planemo_option()` to attach metadata to the returned Click option object.
- Preserve original declared default before callback/global-config rewriting.
- Preserve `use_global_config`, `extra_global_config_vars`, and `use_env_var`.
- Preserve any fallback config keys relevant to an option.

New command:

- `planemo/commands/cmd_cli_metadata.py`

Status: implemented.

Command behavior:

```sh
planemo cli_metadata --format json
planemo cli_metadata --command test --format json
planemo cli_metadata --include-internal --format json
```

Rules:

- JSON only on stdout.
- Human/log messages only on stderr.
- Stable ordering by command name and parameter declaration order.
- Exclude internal commands by default.
- Include aliases at root.

Tests:

- Done: `planemo cli_metadata` exits 0 and emits JSON.
- Done: top-level includes expected commands: `test`, `run`, `workflow_test_init`, `workflow_test_on_invocation`, `invocation_download`.
- Done: internal commands excluded by default.
- Done: aliases exported.
- Done: `test` metadata includes `--failed`, `--test_index`, `--test_output_json`, `--engine` choices.
- Done: `run` metadata includes arguments for runnable/job/export format and `--output_json`.
- Done: `workflow_test_on_invocation` metadata marks actual Click argument `path` with human-readable `TEST.YML`, and `invocation_id` with `INVOCATION_ID`.
- Done: JSON stdout is parseable and not polluted by logs in tests.

Tests to run:

```sh
pytest tests/test_planemo.py tests/test_cli_metadata.py
```

### Phase 2: Output model layer

Purpose: define public parse contracts for Planemo JSON outputs before downstream systems rely on them.

New module options:

- `planemo/test/models.py`
- `planemo/test/schemas.py`
- `planemo/output_models.py`

Recommendation: start under `planemo/test/models.py` for test reports, and add a broader module only when run/download schemas need shared non-test naming.

Preferred model source:

- Pydantic models inside Planemo.
- Export JSON Schema from those Pydantic models.
- Keep generated schemas as Planemo package artifacts or generate them on command invocation.

Initial Pydantic models:

- Done: `PlanemoTestReport`
- Done: `PlanemoTestCase`
- Done: `PlanemoTestCaseData`
- Done: `PlanemoTestSummary`
- Done, permissive: `PlanemoRunOutputs`
- Done: `PlanemoInvocationDownloadManifest`

Potential supporting models:

- `PlanemoJobInfo`
- `PlanemoInvocationDetails`
- `PlanemoOutputFile`
- `PlanemoOutputCollection`

Do not over-model Galaxy internals in the first pass. Keep compatibility fields permissive:

- `inputs: dict[str, Any] | None`
- `job: dict[str, Any] | None`
- `invocation_details: dict[str, Any] | None`
- `outputs_dict: dict[str, Any] | None`
- `output_problems: list[str] | None`

Status enum:

- Canonical: `success`, `failure`, `error`, `skip`.
- Reader compatibility: consider accepting `skipped` as legacy input and normalizing to `skip`.
- Writer behavior: emit only `skip`.

Compatibility requirements:

- Allow `has_data: false` with `data: null`.
- Require `data` when `has_data: true` if feasible.
- Preserve current `version: "0.1"` for now.
- Include `summary` and `exit_code` on Planemo-written test reports.

Suggested schema command:

```sh
planemo output_schema --format json
planemo output_schema --schema test-report --format json
planemo output_schema --schema run-outputs --format json
planemo output_schema --schema invocation-download-manifest --format json
```

Status: implemented as `planemo output_schema --format json`; currently exports `test-report`, `run-outputs`, and `invocation-download-manifest`.

Suggested root output:

```json
{
  "schema_version": "0.1",
  "planemo_version": "...",
  "schemas": {
    "test-report": { "$schema": "https://json-schema.org/draft/2020-12/schema", "...": "..." },
    "run-outputs": { "...": "..." },
    "invocation-download-manifest": { "...": "..." }
  }
}
```

Questions for implementation:

- Resolved for current branch: Pydantic v2 is added as an explicit runtime dependency because schema export is a Planemo CLI feature.

### Phase 3: Validate existing outputs at boundaries

Purpose: introduce schemas without breaking existing users abruptly.

Work items:

1. Done: added model validation in tests first, not runtime enforcement.
2. Done: validates `tests/data/issue381.json` against `PlanemoTestReport`.
3. Not done directly: no dedicated `RunResponse.structured_data()` unit validation yet.
4. Done: validates fast CWL `tool_test_output.json` generated by `planemo test`; `planemo run` test-style report; and `workflow_test_on_invocation` report output.
5. Done: validates fast CWL `run --output_json` against `PlanemoRunOutputs`.
6. Done: implemented and validated `invocation_download --output_json` as `PlanemoInvocationDownloadManifest`.

Runtime enforcement path:

- Phase 3a: tests only.
- Done: Phase 3b: validate before Planemo writes JSON reports in `handle_reports()` and command-specific output writers.
- Done: Phase 3c: validate input JSON for `test_reports` and `merge_test_reports`; emit friendly errors for invalid input.

Avoid immediate strict rejection for old external JSON files unless the command is explicitly producing the file in the same run.

Central write points:

- Done: `planemo/galaxy/test/actions.py`: `handle_reports()` for `--test_output_json`.
- Done: `planemo/commands/cmd_run.py`: `--output_json` writer.
- Done: `planemo/commands/cmd_invocation_download.py`: add missing `--output_json` writer.
- Done: `planemo/galaxy/test/actions.py`: `merge_reports()` output.

### Phase 4: Normalize report behavior

Purpose: make all commands that consume or produce report JSON share one contract.

Work items:

1. Done: updated `merge_reports()` to emit a full `PlanemoTestReport` with `version`, `tests`, `summary`, and `exit_code`, not just `{ "tests": [...] }`.
2. Done: `StructuredData.calculate_summary_data()` and `reports/build_report.py` use the same status vocabulary.
3. Done: fixed `skip` vs `skipped` counting.
4. Done: `test_reports` can read old reports without summary and calculate summary for rendering.
5. Done: added compatibility note in docs for merged report output shape changes.

Tests:

- Done: old report without summary gets summary.
- Done: `skip` status increments skip count in summary and rendered reports.
- Done: `has_data: false, data: null` does not crash reports.
- Done: `merge_test_reports` output validates as `PlanemoTestReport`.

### Phase 5: Docs generator migration

Purpose: stop text-scraping help output as the only command documentation source.

Do not rewrite docs generation first. After `cli_metadata` is stable:

1. Refactor `scripts/commands_to_rst.py` to reuse shared command listing/internal-command policy.
2. Add a parity test between `cli_metadata` and generated docs command list.
3. Later, generate RST from structured metadata plus callback docstrings instead of parsing `planemo <command> --help` output.

Benefits:

- Command docs and metadata stay aligned.
- Hidden/internal commands have one policy.
- Option type/default/choice drift becomes testable.

### Phase 6: Foundry integration after upstream branch stabilizes

Purpose: consume upstream Planemo structure without vendoring permanent snapshots.

Foundry build/cast behavior:

- Invoke installed `planemo cli_metadata --format json` at Astro build/cast time.
- Invoke installed `planemo output_schema --format json` at Astro build/cast time.
- Cache/provenance should record Planemo version, metadata schema version, output schema IDs, and command names used.
- Curated Foundry `content/cli/planemo/*.md` pages remain operational overlays, not option catalogs.

Initial Foundry Planemo pages:

- `content/cli/planemo/test.md`
- `content/cli/planemo/run.md`
- `content/cli/planemo/workflow-test-init.md`
- `content/cli/planemo/workflow-test-on-invocation.md`
- `content/cli/planemo/invocation-download.md`

Initial Foundry schema notes:

- `content/schemas/planemo-test-report.md`
- `content/schemas/planemo-run-outputs.md`
- `content/schemas/planemo-invocation-download-manifest.md`

These should be temporary if Planemo exports schemas directly. Foundry can start with provisional schemas, but the plan should be to replace them with Planemo-derived schemas.

Runtime generated-skill behavior:

- Run `planemo` subprocesses.
- Always request JSON outputs where available.
- Validate JSON against bundled schemas.
- Treat free-text output as diagnostic context only, not the parse contract.

## Initial Vertical Slice

Recommended first PR target in the Planemo `structure` branch:

1. Done: added command-name consistency tests and fixed discovered mismatch.
2. Done: added `planemo cli_metadata --format json` for command metadata.
3. Mostly done: metadata tests cover `test`, `run`, `workflow_test_on_invocation`, and root command list includes `workflow_test_init` and `invocation_download`; dedicated detailed assertions for `workflow_test_init` and `invocation_download` remain.
4. Done: added `PlanemoTestReport` Pydantic model and schema export.
5. Done: validates existing `tests/data/issue381.json` and generated fast CWL `tool_test_output.json` in tests.
6. Done: model accepts legacy `skipped` and normalizes to `skip`; report summary/rendering now count canonical `skip`.

This gives downstream consumers one command metadata surface and one high-value output schema without trying to model every Planemo output at once.

## Second Vertical Slice

1. Done: added permissive `PlanemoRunOutputs` schema.
2. Done: validates `planemo run --output_json` in fast CWL test.
3. Add or normalize Galaxy collection output compatibility if existing Galaxy tests expose shape variants.
4. Ensure `planemo run` still emits test-style reports through `--test_output_json` and those reports validate as `PlanemoTestReport`.

## Third Vertical Slice

1. Done: implemented `invocation_download --output_json` manifest.
2. Done: added `PlanemoInvocationDownloadManifest` schema.
3. Done: added unit-level tests and updated `tests/test_cmd_download_invocation_export.py` E2E fixture.
4. Done: manifest contains enough for agents:
   - `invocation_id`
   - `output_directory`
   - `output_json` path if applicable
   - output labels/IDs
   - downloaded file paths
   - missing outputs if ignored or encountered

## Proposed CLI Metadata Schema Details

Command metadata should answer agent/build questions without invoking `--help` again:

- What command exists?
- What arguments are required?
- Which options accept paths, choices, integers, flags, repeated values?
- Which options affect JSON output?
- Which options can be configured through Planemo config or env vars?
- Which commands are public vs internal?
- Which aliases resolve to which command?

Minimum required command fields:

- `name`
- `help`
- `short_help`
- `usage`
- `module`
- `internal`
- `hidden`
- `params`

Minimum required parameter fields:

- `kind`
- `name`
- `opts`
- `secondary_opts`
- `help`
- `required`
- `multiple`
- `nargs`
- `type`
- `default`
- `is_flag`
- `flag_value`

Planemo-specific extensions:

- `planemo_config.use_global_config`
- `planemo_config.extra_global_config_vars`
- `planemo_config.use_env_var`
- `planemo_config.declared_default`

## Proposed Output Schemas

### `PlanemoTestReport`

Current practical shape:

```json
{
  "version": "0.1",
  "tests": [
    {
      "id": "string",
      "has_data": true,
      "data": {
        "status": "success|failure|error|skip",
        "inputs": {},
        "job": {},
        "invocation_details": {},
        "problem_log": "string",
        "output_problems": ["string"],
        "execution_problem": "string",
        "start_datetime": "ISO string",
        "end_datetime": "ISO string"
      },
      "doc": "string|null",
      "test_type": "galaxy_tool|galaxy_workflow|cwl_tool|cwl_workflow"
    }
  ],
  "summary": {
    "num_tests": 0,
    "num_failures": 0,
    "num_skips": 0,
    "num_errors": 0
  },
  "exit_code": 0
}
```

Allow legacy per-test shape:

```json
{
  "has_data": false,
  "data": null
}
```

### `PlanemoRunOutputs`

Current practical shape for `planemo run --output_json`:

```json
{
  "output_id": {
    "path": "local file path",
    "basename": "filename"
  }
}
```

Keep value permissive initially because CWL and Galaxy collection outputs can differ.

### `PlanemoInvocationDownloadManifest`

Proposed shape:

```json
{
  "invocation_id": "...",
  "output_directory": "...",
  "outputs": {
    "label_or_id": {
      "path": "...",
      "basename": "...",
      "class": "File"
    }
  },
  "missing_outputs": []
}
```

This should be generated from the same `RunResponse` / output collection path used by `collect_outputs()` where feasible.

## Red-to-Green Test Strategy

Fast first:

```sh
pytest tests/test_planemo.py tests/test_cli_metadata.py
pytest tests/test_cmd_test_reports.py
pytest tests/test_cmd_test.py::CmdTestTestCase::test_cwltool_tool_test
pytest tests/test_run.py::RunTestCase::test_run_cat_cwltool
```

Broader quick:

```sh
PLANEMO_SKIP_SLOW_TESTS=1 PLANEMO_SKIP_GALAXY_TESTS=1 pytest tests
tox -e py3.10-unit-quick
```

Lint/type/docs:

```sh
tox -e py3.10-lint
tox -e py3.10-mypy
tox -e py3.10-lint-docs
```

Galaxy-specific only after fast paths are green:

```sh
pytest tests/test_cmds_with_workflow_id.py
pytest tests/test_cmd_download_invocation_export.py
pytest tests/test_run.py::RunTestCase::test_run_export_invocation
```

## Risks

- Adding Pydantic as a dependency may be controversial if Planemo does not already rely on it directly.
- CLI metadata can accidentally freeze Click implementation details; version the metadata schema separately from Planemo version.
- `planemo_option()` default/config behavior is custom. Raw Click introspection alone will be wrong for some options.
- Some generated docs/help strings have existing inaccuracies. Metadata tests will surface them; avoid encoding known drift as contract.
- Galaxy E2E tests are slow and can be flaky. Keep first slices heavily unit/CWL based.
- `run --output_json` is backend-dependent. Avoid over-tight schemas in slice one.
- Changing `merge_reports()` output shape may affect users who expect `{ "tests": [...] }` only. Consider compatibility or a changelog note.
- Report templates currently tolerate loose dicts. Adding validation may reveal hidden null/optional-field assumptions.

## Foundry Follow-Up

Once Planemo branch has a usable metadata/schema export:

1. Add Foundry build/cast helper to invoke `planemo cli_metadata --format json`.
2. Add Foundry build/cast helper to invoke `planemo output_schema --format json`.
3. Add curated Planemo manpages as operational overlays, not complete option lists.
4. Update `run-workflow-test`, `implement-galaxy-workflow-test`, `debug-galaxy-workflow-output`, and `debug-cwl-workflow-output` molds to reference exact Planemo command pages and schemas.
5. Cast `run-workflow-test` and test against a tiny workflow.

## Open Questions

- Should the schema export command be named `output_schema`, `schema`, `json_schema`, or something else?
- Is Pydantic acceptable as a Planemo runtime dependency, or should first pass use checked-in JSON Schemas without runtime model validation?
- Should metadata export be public command only, or also a Python API under `planemo.cli_metadata`?
- Should `planemo cli_metadata` include all commands by default or only docs-public commands?
- Should command aliases appear as root metadata only, or as synthetic command entries too?
- Should `merge_reports()` preserve exact old output by default and add a new `--full` report mode, or modernize output in place?
- Should `invocation_download --output_json` report downloaded outputs only, or all invocation outputs including missing/skipped ones?
- Should `run --output_json` be normalized across Galaxy/CWL backends or explicitly backend-shaped?
- Should generated schemas use JSON Schema Draft 2020-12 from Pydantic v2, or Draft 07 for older tooling compatibility?
- Should Planemo docs generation move to metadata immediately after Phase 1, or wait until schemas land?
