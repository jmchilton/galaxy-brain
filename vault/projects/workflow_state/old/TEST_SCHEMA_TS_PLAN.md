# TypeScript Workflow-Test Validation Plan

Port the workflow-test file validator to `galaxy-tool-util-ts` so both the `gxwf` CLI and the `galaxy-workflows-vscode` plugin can share a single, Python-sourced schema. Follow-up to `TEST_JOB_VALDIATION_PLAN.md` (which landed the Pydantic `Job` model in Galaxy).

## Decisions

- **Source of truth:** Python — `galaxy.tool_util_models.Tests`. TS vendors the JSON Schema; no hand-port.
- **Validator:** Ajv (+ `ajv-formats`).
- **v1 scope:** full `Tests.model_json_schema()` (job block + outputs + assertions).
- **CLI:** new `gxwf validate-tests` command.
- **Sync:** `make sync-test-format-schema` pulling from `$GALAXY_ROOT`, checksum-verified like other golden files.
- **VS Code:** plugin swaps stale `tests.schema.json` for the synced file. Semantic cross-check rules stay plugin-local for v1.

## Work items

### 1. Sync pipeline (`galaxy-tool-util-ts`)

- `scripts/dump-test-format-schema.py` — dumps `Tests.model_json_schema()` to stdout. Invoked with `$GALAXY_ROOT/.venv/bin/python`.
- `Makefile` target `sync-test-format-schema` → writes `packages/schema/src/test-format/tests.schema.json`.
- Register in `scripts/sync-manifest.json`; add golden checksum to the existing verify pipeline.
- Wire into top-level `make sync` and `make check-sync`.

### 2. Schema package additions (`packages/schema/src/test-format/`)

- `tests.schema.json` — synced, checked in.
- `index.ts` — re-exports the schema JSON + a compiled Ajv validator.
- `validate.ts` — `validateTestsFile(parsed: unknown) → { valid: boolean; errors: Diagnostic[] }`. Ajv errors normalized to match the `Diagnostic` shape `validate-workflow` already emits (path, message).
- Add `ajv` + `ajv-formats` to `packages/schema/package.json`.

### 3. Test fixtures (`packages/schema/test/test-format/`)

- Positive fixtures ported from the Python plan: `file_path.yml`, `file_location.yml`, `file_composite.yml`, `collection_list.yml`, `collection_paired.yml`, `collection_nested.yml`, `scalars.yml`, `list_of_files.yml`, `list_of_scalars.yml`.
- Negative fixtures: `neg_legacy_type_file.yml`, `neg_legacy_type_raw.yml`, `neg_elements_without_class.yml`, `neg_file_no_path_or_location.yml`, `neg_unknown_field.yml`, `neg_bad_collection_type.yml`, `neg_top_level_not_dict.yml`.
- Red-to-green: land failing tests before wiring Ajv.

### 4. CLI command (`packages/cli/src/commands/validate-tests.ts`)

- Mirror `validate-workflow.ts` structure: YAML parse → `validateTestsFile` → format diagnostics → exit code.
- Support single file + directory (reuse `validate-tree` walk pattern).
- Register in `packages/cli/src/index.ts`.

### 5. Changeset

- Minor bump on `@galaxy-tool-util/schema` (new public API) and `@galaxy-tool-util/cli` (new command).

### 6. VS Code migration (`galaxy-workflows-vscode/wf_tool_state`)

- Replace `workflow-languages/schemas/tests.schema.json` with the synced file. (Copy for v1; consider re-exporting from `@galaxy-tool-util/schema` as an npm-consumable entrypoint in a follow-up.)
- Keep `WorkflowInputsValidationRule` / `WorkflowOutputsValidationRule` unchanged.
- Run plugin test suite; fix diagnostic-shape regressions.

## Test strategy (red-to-green)

1. Scaffolding commit: empty schema file + test-format package layout + failing fixture tests.
2. Sync target lands; pull real schema from Python branch.
3. Wire Ajv; positives green, negatives produce expected errors.
4. Add CLI command with snapshot tests over error output.
5. Swap VS Code schema; run plugin tests.

## Unresolved questions

- Pin Ajv to draft 2020-12 or 2019-09? (Pydantic v2 defaults to 2020-12 — confirm at sync.)
- Ajv `strictSchema` setting given Pydantic `description`/`title` metadata?
- Re-export JSON Schema from `@galaxy-tool-util/schema` as a plugin-consumable entrypoint now, or have the plugin copy the file?
- Sync script invocation convention — `$GALAXY_ROOT/.venv/bin/python` vs. require pre-activated venv? (Match existing sync targets.)
- Cross-check rules (inputs/outputs-match-workflow): port to `@galaxy-tool-util/schema` in v1.1, or keep plugin-local indefinitely?
- `TestOutputAssertions` — how deep does Pydantic's JSON Schema export go? If assertions stay loose at the Python layer, TS inherits that.
