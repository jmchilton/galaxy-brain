# Follow-up: Additional Workflow Operations (galaxy-tool-util)

Deferred from the initial normalized models plan. Implement after `normalizedFormat2` and `normalizedNative` land and their declarative tests pass.

## Expanded Models ✅

- `expandedFormat2(raw)` — extends `NormalizedFormat2`, resolves inline subworkflows recursively. External URL/@import resolution not yet wired (no test expectations require it).
- `expandedNative(raw)` — extends `NormalizedNativeWorkflow`, resolves inline subworkflow references recursively.
- `$graph` multi-document resolution already handled by `normalizedFormat2`; expanded models go further by fetching/inlining external references (future).

New: `packages/schema/src/workflow/normalized/expanded.ts`

### Expectation files
- `normalized_format2.yml` contains `test_steps_without_run_unchanged` (operation: `expanded_format2`) and `test_inline_subworkflow_expanded` (operation: `expanded_native`) — both passing.

## Conversion Operations ✅

- `toFormat2(native)` — native → format2 conversion
- `toNative(format2)` — format2 → native conversion
- `ensureFormat2(any)` — polymorphic: accepts either format, returns `NormalizedFormat2`
- `ensureNative(any)` — polymorphic: accepts either format, returns `NormalizedNativeWorkflow`

New files:
- `packages/schema/src/workflow/normalized/toFormat2.ts` — full native→format2 conversion with label map, step conversion (tool/subworkflow/pause), PJA→out conversion (all 7 action types), input_connections→in conversion, comments conversion (native→format2), anonymous output reference rewriting
- `packages/schema/src/workflow/normalized/toNative.ts` — full format2→native conversion with ConversionContext (label registry + source resolution), input step building (type mapping), step dispatch (tool/subworkflow/pause), connection building with subworkflow input wiring, PJA building from out properties, workflow output wiring, comments conversion (format2→native)
- `packages/schema/src/workflow/normalized/ensure.ts` — format detection via `a_galaxy_workflow` / `class: GalaxyWorkflow` and dispatch
- `packages/schema/src/workflow/normalized/comments.ts` — `flattenCommentData` (native→format2) and `unflattenCommentData` (format2→native), port of gxformat2/_comment_helpers.py
- `packages/schema/src/workflow/normalized/labels.ts` — `resolveSourceReference`, `Labels` class, `UNLABELED_*` prefixes, `isUnlabeled`/`isAnonymousOutputLabel` predicates, port of gxformat2/_labels.py

### Expectation files
- `to_format2.yml` — 8 tests, all passing
- `to_native.yml` — 10 tests (+ 1 comments), all passing
- `ensure_format2.yml` — 2 tests, all passing
- `ensure_native.yml` — 2 tests, all passing

### Changes to existing files
- `normalizedFormat2` now passes `comments` through on the result object (not in schema, but accessible via cast)
- `normalizedNative` now passes `comments` through similarly
- Test runner: added `format_version` → `format-version` to `FIELD_ALIASES`
- `UNSUPPORTED_OPERATIONS` emptied; all 6 operations now in `OPERATIONS` dispatch map

## Implementation order (as executed)

1. ✅ Shared utilities: `comments.ts`, `labels.ts`
2. ✅ `toFormat2` (native → format2)
3. ✅ `toNative` (format2 → native)
4. ✅ `ensureFormat2` / `ensureNative` (polymorphic entry points)
5. ✅ `expandedFormat2` / `expandedNative` (inline-only expansion)
6. ✅ Wired into test runner + exports

## Test results

- 61/61 declarative tests passing (0 skipped)
- Full suite: 4012 passed, 61 skipped (unrelated), 11 test files
- TypeScript: clean build (noEmit)

## Resolved questions

- `_toSource` strips `/output` suffix when output_name === "output" (matches Python)
- Full PJA set implemented: Rename, Hide, DeleteIntermediates, ChangeDatatype, ColumnSet, TagDataset, RemoveTagDataset
- Comments conversion implemented in both directions using shared helpers ported from gxformat2/_comment_helpers.py
- Default positions generated as (10*idx, 10*idx) matching Python
- UUIDs not generated for to_native (tests don't check them, Python generates random UUIDs)

## Unresolved questions

- Expanded models: URL resolution / @import resolution not implemented (no test expectations, would need async resolver or callback pattern)
- `pick_value` step type: partially handled in toFormat2 (falls through to tool handler) — no test expectations exist
- `GalaxyUserTool` step type: not handled (no test expectations)
- `$graph` deduplication in toNative: Python supports `deduplicate_subworkflows` option — not implemented (no test expectations)

## Integration with validate-workflow CLI

Once normalized + expanded models exist, `validate-workflow` could:
- Normalize before tool-state validation (catches malformed shorthands earlier)
- Report normalization warnings (e.g. deprecated input type aliases)
- Accept either format and convert via `ensure*` for uniform validation
