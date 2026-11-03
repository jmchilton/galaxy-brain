# Implementation debrief

Branch `issue_212_udt_expression_paths` on `origin/main` `f5470fe5`; head `3d91bb6b` after the normal review.

## What changed

- `packages/schema/src/user-tool-source/input-paths.ts` holds the new check:
  - For `shell_command` and `configfiles[].content`, it finds expressions with `template-scanner.ts`, a port of `cwl_utils.expression.scanner`, and parses each `$(...)` / `${...}` body with acorn.
  - It walks every `inputs.*` member chain against the input's job runtime shape: dataset and collection fields, `elements` by collection type, conditionals, repeats, and multiple data/select inputs.
  - Output labels follow Galaxy's label grammar (`galaxy.tools.expressions.labels`): tool state, with dataset references ending in `name`, `element_identifier` or `format`.
- Field names come from `job-runtime.schema.json`. The new `make sync-job-runtime-schema` dumps it from Galaxy's runtime pydantic models (`scripts/dump-job-runtime-schema.py`), and `verify-job-runtime-schema` checks it as part of `make check`.
- `validateUserToolSource` runs the check beside the Galaxy-mirroring `runSemanticChecks`. Embedded `GalaxyUserTool` steps in `gxwf validate` / `draft-validate`, in both effect and json-schema modes, fail with the same messages. The report shape doesn't change.

## Tests

- Red on base: the egapx test fails with the check unwired (0 errors, 3 expected).
- `packages/schema/test/user-tool-source-input-paths.test.ts` and new cases in `packages/cli/test/user-defined-tool-step.test.ts`.
- Sweep of 957 UDTs (Galaxy dev YAML test tools, foundry/foundry-runs drafts, repo fixtures):
  - No findings on Galaxy's tools.
  - Every hit is `.path` read directly off a collection, a true positive. That includes Galaxy's synced connection fixtures `ok_udt_collection_input` and `fail_paired_to_udt_list_collection` (`inputs.input_list.path` on a `list`); those fixtures only feed connection validation.

## Local gate

- Lint, format, typecheck, knip (`lint:unused:ci`) and build are green. Tests are green except 3 integration-tests that fail identically on `origin/main`: `validate_legacy_encoding_skipped_2`, `validate_iwc_repeatmasking_stale_rejected`, and `disconnected-optional-runtime`.
- Under this machine's Node 26, the Makefile's multi-line `node -e` checksum targets (`verify-*`, `check-sync-parsed-tools`) fail for pre-existing reasons. I verified the checksums with `sha256sum`.

## Decisions

- Label findings are errors, though Galaxy keeps an unfilled reference as written rather than failing the job.
- Unknown root names stay with the mirrored undeclared-input check.
- Skipped, not guessed: computed keys, aliases, untyped/choice/record collections, YAML sections (the TS parser doesn't read them, though Galaxy's YAML v1 set now does), and unparseable bodies.

## Follow-ups

- Derive the Effect `job_runtime` schemas (`gx-data.ts`, `gx-data-collection.ts`) from `job-runtime.schema.json`; they're stale against the same models.
- Teach the TS YAML parser sections.
- Consider the full `validateUserToolSource` semantic checks for embedded tools in workflow validation.
- The same check is proposed for Galaxy's `lint_user_tool_source`.
