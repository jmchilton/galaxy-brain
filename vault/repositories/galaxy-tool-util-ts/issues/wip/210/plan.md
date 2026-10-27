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

## Phase B — #210 asks 1+2 (`issue_210_test_kind_checks`, parent A) — built

As shipped (`1cb4b41a`; [verification](../../../branches/active/issue_210_test_kind_checks/verification.md)):
- Extractors keep input `format[]` / `collection_type` (optional fields; vscode builds these types itself). `WorkflowOutput.collectionType` (null = dataset, absent = unknown) filled by the CLI via new `resolveWorkflowOutputCollectionTypes` (`WorkflowGraph.outputMap`; unknown/"any" omitted).
- `checkTestsAgainstWorkflow(doc, shape, { datatypes?: DatatypesMapperModel })`; `schema` now depends on `workflow-graph`.
- Errors: `class: File` on a collection input; input `collection_type` not accepted (`CollectionTypeDescription.accepts`); output dataset form vs collection (collection form = `class: Collection` or `element_tests`/`elements`, as planemo); output `collection_type` ≠ resolved (exact, as Galaxy's runner).
- Warnings (new optional `severity`; reports gain `warnings`): `filetype` ∉ `format` (`producesAcceptableDatatype` over the snapshot; skips `auto`, verbatim formats); map-over — deeper collection, or `class: Collection` on a data input (Galaxy's own tests do this).
- Output shape checks skipped for a test whose job collections differ from declared inputs (map-over, `sample_sheet` into `list`, non-`list` into untyped collection).
- CLI: `--cache-dir` read-only (never fetch); shared loader for validate-tests / -tree.
- Dropped from the first sketch: `class: Collection` output without `element_tests` lint (schema/planemo concern, not cross-check).
- Planemo caveat: planemo ignores dataset `ftype` and top-level `collection_type`; Galaxy's runner is the reference.

## Phase C — output `ftype` (deferred)

Needs a datatype-propagation pass in `connection-validation` (`format`, `format_source`, `ChangeDatatypeAction`, `pick_value`). Galaxy's own workflow test runner checks `ftype` by exact `file_ext`; planemo never checks dataset `ftype` (`planemo/test/_check_output.py`), so a mismatch passes in planemo. Warning at most.

## Phase D — server-parity layer (plan only)

Galaxy's server accepts implicit conversion; editor/mapper ignore converters. Client mapping collapses `subclass="true"` and `.gz` types into shared `galaxy.datatypes.registry.<Parent>` names (334/808 exts), so mapper subtyping is lenient vs server. Possible later: `converters` snapshot + `findConversionDestination`. Draft Galaxy issue for the class-name collision (ask before posting; galaxy not greenlisted).

## Phase E — upstream

Galaxy client adopts `@galaxy-tool-util/workflow-graph` re-exports (separate Galaxy branch via `GX_IMPLEMENTATION_HANDOFF.md`). Foundry #731 rewording after a release.

## Follow-ups found during Phase B

- Connection validation skips `pick_value` repeat inputs (`style_cond|type_cond|pick_from_N|value`): 15/17 egapx outputs stay unresolved even with all tools cached.
- Per-test output resolution seeded with the job's input collection types (`validateConnectionGraph` seed) instead of skipping divergent tests.
- Report unresolved/skipped outputs in the JSON report.
- Galaxy: `CollectionAttributes.collection_type` in the Tests schema vs verifier reading `attributes.type`.

## Unresolved questions

- "main" = usegalaxy.org? (assumed) or Galaxy `dev` sample conf dump?
- Subpath of `workflow-graph` ok, or new `@galaxy-tool-util/datatypes` pkg (npm trusted-publish setup)?
- Reused `DatatypesCombinedMap` → `DatatypesMapperModel` as the shared abstraction (no source interface). Enough? Hand off Galaxy client adoption (Phase E) now?
- `severity` + warnings for `filetype` ∉ `format` and map-over: ok?
- `workflow_output_collection_type` an error though planemo ignores it?
- Split ask 3 (output `ftype`) into own issue? PR opener is "Toward", not "Fix".
- `--cache-dir` read-only ok, or fetch like `validate`?
- Post Galaxy class-collision issue draft? File `pick_value` gap as a gtu issue?
- Snapshot refresh: manual `make sync-datatypes`, or scheduled CI PR?
