# Plan — Galaxy datatype abstractions + #210 cross-check

Research: [Galaxy side](research_galaxy_datatypes.md) · [TS consumers](research_ts_consumers.md).

## Shape

The shared abstraction already exists in `@galaxy-tool-util/workflow-graph`: `DatatypesCombinedMap` (Galaxy's `types_and_mapping` response shape) → `DatatypesMapperModel` → `producesAcceptableDatatype`, ported verbatim from Galaxy's client. Galaxy builds the mapper from the API (`Datatypes/factory.ts` store); we build the same model from a committed copy of the same response. Upstreaming = Galaxy's `Datatypes/model.ts` etc. become re-exports (Tier 1 Phase 6 of `TS_CONNECTION_REFACTOR_IN_GX_PLAN.md`, still not adopted in Galaxy `dev`). No new abstraction layer until a phase needs it.

## Phase A — datatype snapshot (`issue_210_datatypes_snapshot`, base `main`)

- `workflow-graph` subpath export `./datatypes-snapshot`, not re-exported from the index (bundles not importing it pay nothing; `types_and_mapping` is ~154 KB / ~17 KB gz).
- Verbatim `GET /api/datatypes/types_and_mapping?upload_only=false` (the client's exact query) from usegalaxy.org, plus metadata: server, `/api/version`, fetch date.
- `snapshotDatatypesMapper()` — memoized `DatatypesMapperModel` over the snapshot.
- `make sync-datatypes` (network; manual/periodic) modeled on `sync-test-format-schema`; `make verify-datatypes-snapshot` in `make check` only hashes the committed file.
- Tests on real types (subtype hits/misses, `.gz` behavior, unknown ext). Keep the toy fixture tests: they're a verbatim port of Galaxy's tests.
- Alternative source kept documented, not built: offline dump from a `GALAXY_ROOT` registry (prototype script in research). usegalaxy.org (799 types) ⊂ `dev` sample conf (808).

## Phase B — #210 asks 1+2 (`issue_210_test_kind_checks`, parent A)

- Red tests first from the issue's repro cases.
- Extractors keep input `format[]`/`collection_type` and output `outputSource` as new optional fields (vscode builds these types itself on schema 1.9.0).
- `checkTestsAgainstWorkflow(testsDoc, workflow, options?)`: optional `isSubTypeOfAny`-style predicate + resolved output collection-type map. `schema` can't depend on `connection-validation`; the CLI wires both, resolving outputs via `buildWorkflowGraph`/`StepOutputTypeMap` (not the report, which collapses unknown → null).
- Checks: `class: Collection` vs `data` input and vice versa; input `collection_type` via `canMatch` (`sample_sheet:paired` → `list:paired` passes); `filetype` outside declared `format` (skip no-filetype/sniffed inputs); output dataset-form vs collection and `collection_type` mismatch (skip unknown/any); `class: Collection` output without `element_tests` (planemo fails "No path specified").
- Optional `severity` on `TestFormatDiagnostic` (default error; `valid` from errors only). Warnings: `filetype` vs `format` (Galaxy doesn't enforce at invocation, may convert), test-input map-over.
- CLI: `validate-tests --workflow` gains the tool-resolution flags of `validate --connections` (`--cache-dir`, offline default kept).

## Phase C — output `ftype` (deferred)

Needs a datatype-propagation pass in `connection-validation` (`format`, `format_source`, `ChangeDatatypeAction`, `pick_value`). Galaxy's own workflow test runner checks `ftype` by exact `file_ext`; planemo never checks dataset `ftype` (`planemo/test/_check_output.py`), so a mismatch passes in planemo. Warning at most.

## Phase D — server-parity layer (plan only)

Galaxy's server accepts implicit conversion; editor/mapper ignore converters. Client mapping collapses `subclass="true"` and `.gz` types into shared `galaxy.datatypes.registry.<Parent>` names (334/808 exts), so mapper subtyping is lenient vs server. Possible later: `converters` snapshot + `findConversionDestination`. Draft Galaxy issue for the class-name collision (ask before posting; galaxy not greenlisted).

## Phase E — upstream

Galaxy client adopts `@galaxy-tool-util/workflow-graph` re-exports (separate Galaxy branch via `GX_IMPLEMENTATION_HANDOFF.md`). Foundry #731 rewording after a release.

## Unresolved questions

- "main" = usegalaxy.org? (assumed) or Galaxy `dev` sample conf dump?
- Subpath of `workflow-graph` ok, or want new `@galaxy-tool-util/datatypes` pkg (needs npm trusted-publish setup)?
- Add `severity` to diagnostics, or keep all errors?
- `filetype` ∉ `format` with no converter: warning or error?
- Phase C worth doing given planemo ignores `ftype`?
- Snapshot refresh: manual `make sync-datatypes`, or scheduled CI PR?
