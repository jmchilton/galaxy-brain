# Thermo-nuclear review debrief — `issue_210_test_kind_checks`

Reviewed `a3494e70..46dba28f`; fixes pushed as `46dba28f..1822b9fb`. Acted on three findings. TN1 was a real false-positive bug, reproduced red→green: an output labelled `constructor`/`toString` got a function as its `collectionType`. TN2 replaces hand-copied input-type alias sets with ones derived from the canonical `INPUT_TYPE_TO_SCHEMA`. TN3 dispatches the input kind checks on job `class`. TN2 and TN3 don't change behavior. After each commit: `pnpm build`, `make check` and `make test` green; the Galaxy and IWC sweeps were byte-identical to the pre-fix branch sweep, with 0 `NEW ERROR` vs main. The changeset is unchanged (no new public exports; `resolveWorkflowOutputCollectionTypes` is still unreleased, and its return is now a `Map`).

Commits:
- `fcdbad0e` validate-tests: resolved output shapes as a Map (TN1)
- `41698fa9` schema: derive data/collection input type aliases from INPUT_TYPE_TO_SCHEMA (TN2)
- `1822b9fb` cross-check: dispatch input kind checks on job class (TN3)

Not acted on:
- TN4: the CLI commands duplicate the `workflow_load_error` catch and the warning print loop. The catch predates the branch, the copies are small, and the branch already merged the larger duplicate (`loadWorkflowShape`).
- TN5: `divergesFromDeclaredShape` hardcodes `?? "list"` for untyped collection inputs, mirroring `graph-builder` `_resolveInputStep`. This is a cross-package implicit contract. Follow-up: per-test seeded output resolution (already noted in the normal review) deletes both the skip and this coupling.
- TN6: tree mode builds a fresh offline `ToolCache` per tests file, so tools shared across files are re-read from disk. It's cheap (lazy construction; the IWC sweep takes about 2s). Hoist it only if sweeps get slow.
- TN7: `Object.hasOwn(datatypes.datatypesMapping.ext_to_class_name, ...)` reads mapper internals for "known datatype". `DatatypesMapperModel.datatypes` is the field the canonical helper uses. Taste only; not changed.
- Previously decided items (optional `outputMap`, bare `catch`, `schema → workflow-graph` dep, unlabeled native outputs, `--cache-dir` behavior) were not re-litigated; no new evidence.

<details><summary>Full review</summary>

## Verdict

Structurally sound for its size. The branch already did the main consolidation: one `tests-cross-check.ts` for both CLI commands, a shared `coerce.ts`, and output shapes resolved in the canonical connection-validation layer. Severity is a single optional field, not a parallel diagnostic type. No file approaches 1k lines (`check.ts` is about 270). One real bug and two legibility/reuse issues; no blockers after the fixes.

## TN1 (bug, fixed): prototype keys leak into resolved output shapes

`loadWorkflowShape` merged shapes with `o.name in collectionTypes` on a plain `{}`, and the catch path also returned `{}`. An unresolved output labelled `constructor`, `toString` or `valueOf` therefore picked up an `Object.prototype` function as `collectionType`. Any dataset assertion on it then emitted `workflow_output_kind` ("is a 'function Object() { [native code] }' collection"). That is a false positive in a gate whose hard constraint is none.

Fix: `resolveWorkflowOutputCollectionTypes` returns `Map<string, string | null>`, and the CLI uses `has`/`get`. This is a type-boundary fix, not an `Object.hasOwn` patch, so the class of bug goes away. Red→green test in `packages/cli/test/validate-tests.test.ts`.

## TN2 (reuse, fixed): bespoke input-type alias sets

`check.ts` hand-copied `DATASET_INPUT_TYPES` and `COLLECTION_INPUT_TYPES`. `semantic-validators.ts` already had a third copy (`COLLECTION_TYPE_VALUES`). The canonical alias table is `INPUT_TYPE_TO_SCHEMA` in `workflow/input-parameter.ts`, which mirrors gxformat2's discriminator map. Both sets are now derived from it (`DATA_INPUT_TYPES`, `COLLECTION_INPUT_TYPES`), sharing the filter with `inputTypesDeclaring`.

## TN3 (spaghetti, fixed): `checkInputKind` fused three checks with flag-gated fall-through

One function carried `isFile`/`isCollection` flags across four early-return blocks: File-on-collection, collection-on-data, collection-type algebra, and filetype vs format. A collection binding without a declared `collection_type` fell through into the format block, and only the `isFile` gate stopped it. Each branch also wrapped a single diagnostic in an array.

Fix: dispatch on `class` once, to `checkCollectionInput` (map-over over data, collection-type algebra) or `checkFileInput` (kind, then format). Each returns one diagnostic or `undefined`, and `checkOutputKind` matches. The line count is neutral, but readers no longer need to track flags.

## TN4 (duplication, not acted): CLI command plumbing

`validate-tests.ts` and `validate-tests-tree.ts` each wrap `crossCheckTests` in an identical `workflow_load_error` try/catch, call `partitionDiagnostics`, and print warnings in the same loop. Folding the catch into `crossCheckTests` with a display path would delete one copy. The catch predates the branch, so this was left alone.

## TN5 (boundary, follow-up): implicit `list` default shared across packages

`divergesFromDeclaredShape` assumes the graph resolves an untyped collection input as `list`, which is what `graph-builder` does. If either side changes, the skip silently desyncs. The structural fix is to resolve outputs per test case, seeded with the job's input types. That deletes the "diverges → skip" concept entirely. It widens scope, so it is recorded as a follow-up.

## TN6 (orchestration, not acted): per-file tool cache in tree mode

`crossCheckTests` constructs a new offline resolver for every tests file. Construction is lazy and cheap, but the in-memory tool cache isn't shared across files. Not worth threading a cache through now.

## TN7 (nit, not acted): mapper internals for "known datatype"

`Object.hasOwn(datatypes.datatypesMapping.ext_to_class_name, filetype)` reaches into mapper internals. `DatatypesMapperModel.datatypes` is what `producesAcceptableDatatype` uses for its own unknown-type check. Taste only.

</details>
