# Tier 1: Extract Pure Connection Logic from Galaxy Editor into galaxy-tool-util-ts

## Motivation

Today, Galaxy's workflow connection logic is a three-hop fork:

1. Original semantics live in Python (`galaxy.model.dataset_collections` + editor-equivalent logic ported decade ago).
2. The TypeScript workflow editor (`client/src/components/Workflow/Editor/modules/`) has the de-facto source of truth — evolved independently over 10+ years, particularly `collectionTypeDescription.ts` and parts of `terminals.ts`.
3. The Python port in `galaxy.tool_util.workflow_state` (CONNECTION_VALIDATION.md branch) brought connection logic *back* to Python as a shim on top of the editor semantics.

Now a TypeScript fork of that Python shim is coming (the TS connection validator twin). Without convergence, we'll have four implementations. Tier 1 pulls the pure, already-decoupled pieces of the editor into `galaxy-tool-util-ts` so:
- Galaxy imports them back (single source of truth for the collection-type algebra and datatype subtyping).
- The TS validator in this repo uses them directly — no reimplementation.
- Future work (CLI, VS Code plugin, gxwf-ui) gets them for free.

Context docs:
- `GXWF_AGENT.md` — overall Galaxy/TS convergence intent.
- `old/CONNECTION_VALIDATION.md` — the Python port (already landed on the `wf_tool_state` branch); proves these abstractions suffice for a validator.

## Scope

**In scope (Tier 1):**
1. `collectionTypeDescription.ts` — collection-type algebra (`canMatch`, `canMapOver`, `append`, `effectiveMapOver`, sentinels). 235 lines. Zero external imports today.
2. `DatatypesMapperModel` from `Datatypes/model.ts` — datatype subtype lookup. ~48 lines. Depends only on an OpenAPI-generated type (`DatatypesCombinedMap`).
3. `producesAcceptableDatatype()` + `ConnectionAcceptable` class from the bottom of `terminals.ts` — pure datatype-compatibility predicate. ~40 lines.
4. Variant-array helpers (`canMatchAny`, `effectiveMapOverAny`) for multi-accept inputs (`collection_types: string[]`). ~15 new lines mirroring the editor's `InputCollectionTerminal._effectiveMapOver` loop and the Python port's `_split_collection_type` helper.

**Out of scope (explicitly deferred — see CONNECTION_VALIDATION.md Phase discussion and prior conversation):**
- `attachable()` decision trees on Input/InputCollection/InputParameter terminals. The Python port does not have an analog; `_validate_single_connection` replaces it with a simpler forward-walk. Tier 2.
- `_mappingConstraints`, output-constraint pushback, `hasConnectedMappedInputTerminals` — editor-interactive reasoning, not validator-needed. Tier 2.
- `pickValueCompact.ts` — store-coupled. Stays in Galaxy.
- Terminal class hierarchy, EventEmitter wiring, store mutations. Stays in Galaxy (Tier 3).

## Package Placement

**Decision:** new workspace package `@galaxy-tool-util/workflow-graph`.

Rationale:
- Content is not Effect Schema parameter types (`schema`) nor ToolShed/cache plumbing (`core`). Needs its own home.
- Galaxy will consume it as a regular npm dep — a dedicated, small, stable package minimizes version churn pressure on consumers of `schema`/`core`.
- Leaves room for Tier 2 if ever greenlit (same package, new exports).

Exports (all named, tree-shakeable):
```
@galaxy-tool-util/workflow-graph
├── CollectionTypeDescriptor (interface)
├── CollectionTypeDescription (class)
├── NULL_COLLECTION_TYPE_DESCRIPTION
├── ANY_COLLECTION_TYPE_DESCRIPTION
├── canMatchAny(output, inputs[])
├── effectiveMapOverAny(output, inputs[])
├── DatatypesMapperModel
├── DatatypesCombinedMap (type re-export)
├── ConnectionAcceptable
└── producesAcceptableDatatype(mapper, inputDatatypes[], outputDatatypes[])
```

Dependencies: none runtime. TypeScript devDep only. Ships ESM like the rest of the monorepo.

## File Layout (in this repo)

```
packages/workflow-graph/
├── package.json                     # @galaxy-tool-util/workflow-graph, workspace:*
├── tsconfig.json
├── vitest.config.ts
├── README.md                        # short: what it is, who uses it
├── src/
│   ├── index.ts                     # barrel
│   ├── collection-type.ts           # port of collectionTypeDescription.ts
│   ├── collection-type-variants.ts  # canMatchAny + effectiveMapOverAny
│   ├── datatypes-mapper.ts          # port of Datatypes/model.ts
│   ├── connection-acceptable.ts     # ConnectionAcceptable + producesAcceptableDatatype
│   └── datatypes-combined-map.ts    # type alias (hand-typed, not OpenAPI-derived — see D2)
└── test/
    ├── collection-type.test.ts      # ported from terminals.test.ts (subset)
    ├── collection-type-variants.test.ts
    ├── datatypes-mapper.test.ts     # ported from Datatypes/index.test.ts
    └── produces-acceptable-datatype.test.ts
```

Naming convention: kebab-case filenames (monorepo style), camelCase exports.

## Design Decisions

### D1: Port collectionTypeDescription.ts verbatim (almost)

Copy the file. Keep the exported names (`CollectionTypeDescription`, `CollectionTypeDescriptor`, `NULL_COLLECTION_TYPE_DESCRIPTION`, `ANY_COLLECTION_TYPE_DESCRIPTION`). Zero semantic changes in v0.1.0 — the goal is that Galaxy's re-export is a no-op behavior change.

### D2: DatatypesCombinedMap type — hand-written, not OpenAPI-sourced

The Galaxy copy imports `components["schemas"]["DatatypesCombinedMap"]` from the client's generated API types. The monorepo already has an OpenAPI sync pipeline (`packages/gxwf-web/openapi.json` + `pnpm codegen`) **but it's scoped to the gxwf-web server schema and does not include `DatatypesCombinedMap`** — that type lives in Galaxy's main API schema, which isn't synced here.

Options considered:
1. Hand-write a minimal type (two fields, nested dicts). ~10 lines. Stable shape (hasn't evolved in years).
2. New `make sync-galaxy-datatypes-schema` target pulling from `GALAXY_ROOT`, extracting just this one definition. Nontrivial infra for one type.
3. Depend on Galaxy's generated client output. Couples to Galaxy's client build.

**Decision: hand-write.** Tiny, stable, and drift is caught loudly at compile time on the Galaxy re-export site (structural compatibility check) — not silently.

```ts
export interface DatatypesCombinedMap {
    datatypes: string[];
    datatypes_mapping: {
        ext_to_class_name: Record<string, string>;
        class_to_classes: Record<string, Record<string, boolean>>;
    };
}
```

Galaxy's existing `components["schemas"]["DatatypesCombinedMap"]` is structurally compatible. Document the shape in a comment linking to Galaxy's `DatatypesCombinedMap` Pydantic model in `lib/galaxy/schema/`. If drift ever surfaces, revisit option (2).

### D3: Keep the variant-array helpers tiny and new

Don't export a "replacement" class for `InputCollectionTerminal`. Just two free functions:

```ts
export function canMatchAny(
    output: CollectionTypeDescriptor,
    inputs: CollectionTypeDescriptor[],
): boolean;

export function effectiveMapOverAny(
    output: CollectionTypeDescriptor,
    inputs: CollectionTypeDescriptor[],
): CollectionTypeDescriptor;
```

Semantics mirror what `InputCollectionTerminal._effectiveMapOver` does on the inner array loop, minus the sample_sheet asymmetry guard (which belongs in caller-side decision logic — see D4).

### D4: No sample_sheet asymmetry here

The sample_sheet asymmetry (`list_NOT_MATCHES_sample_sheet`) is currently enforced inside `InputCollectionTerminal.attachable` as an extra guard wrapping `canMatch`. The Python port surfaces the same issue in F1 of CONNECTION_VALIDATION.md — `can_match_type` alone does not enforce it. Leave this to the validator's decision layer, same as Python did. Keeps Tier 1 semantics identical to the base class. Document it.

### D5: Galaxy re-exports from the new package

Galaxy's `client/src/components/Workflow/Editor/modules/collectionTypeDescription.ts` becomes:

```ts
export {
    CollectionTypeDescription,
    NULL_COLLECTION_TYPE_DESCRIPTION,
    ANY_COLLECTION_TYPE_DESCRIPTION,
    type CollectionTypeDescriptor,
} from "@galaxy-tool-util/workflow-graph";
```

Same for `Datatypes/model.ts` (re-export `DatatypesMapperModel`) and whatever file currently owns `producesAcceptableDatatype` / `ConnectionAcceptable`.

Benefits: zero import churn across the ~20 Galaxy files that consume these symbols. One PR in Galaxy touches ≤5 files.

### D6: Version lockstep via changesets

Publish `@galaxy-tool-util/workflow-graph` as `0.1.0`. It joins the linked-version set — every release bumps it even if unchanged, matching existing policy. Add a changeset covering the extraction.

### D7: Tests port, not just code

The Tier 1 test port is essential — `terminals.test.ts` is where editor semantics are empirically specified. Port the subsections covering:
- `CollectionTypeDescription.canMatch` (direct, paired_or_unpaired, sample_sheet)
- `canMapOver` (subcollection containment, compound suffixes)
- `append`, `effectiveMapOver`
- Sentinel behavior (NULL / ANY)

The `Terminal`-level / store-dependent test blocks are **not** ported (they belong to Galaxy or to Tier 2). Grep for `new CollectionTypeDescription(` and `CollectionTypeDescription.` in the test file — those describe blocks are the portable slice.

Also port `Datatypes/index.test.ts` fully — it's ~pure. And add tests for `producesAcceptableDatatype` covering: exact match, subtype match, `input` wildcard, `_sniff_` wildcard, unknown datatype error message.

## Phased Implementation

### Phase 1: Package scaffold (this repo)

1. Create `packages/workflow-graph/` with `package.json` mirroring `packages/schema/`'s shape (same scripts, build, publish config).
2. Update root `pnpm-workspace.yaml` (already matches `packages/*` glob — no change needed).
3. Add to root `tsconfig.base.json` path aliases if the repo uses them; otherwise workspace resolution handles it.
4. Add changeset entry.

Acceptance: `pnpm install && pnpm --filter @galaxy-tool-util/workflow-graph build` succeeds on an empty `src/index.ts`.

### Phase 2: Port collection-type algebra + tests

1. Copy `collectionTypeDescription.ts` → `src/collection-type.ts`. No modifications.
2. Port the collection-type sections of `terminals.test.ts` into `test/collection-type.test.ts`. Use explicit `import { describe, it, expect } from "vitest"` per repo convention.
3. Add `src/collection-type-variants.ts` with `canMatchAny` / `effectiveMapOverAny`. Small test file with examples from `collection_semantics.yml` comma-list cases (e.g. a multi-accept input declaring `list,list:paired`).

Acceptance: `make test` passes. Test count ≥ ~30 (rough slice of terminals.test.ts).

### Phase 3: Port DatatypesMapperModel + tests

1. Copy `Datatypes/model.ts` → `src/datatypes-mapper.ts`. Replace the OpenAPI import with hand-written `DatatypesCombinedMap` in `src/datatypes-combined-map.ts`.
2. Port `Datatypes/index.test.ts` (and `test_fixtures.ts`) into `test/datatypes-mapper.test.ts`.

Acceptance: all ported tests pass.

### Phase 4: Port producesAcceptableDatatype + ConnectionAcceptable

1. Copy the block at the end of `terminals.ts` (lines ~922–962 in the `wf_tool_state` branch) → `src/connection-acceptable.ts`. The pure `producesAcceptableDatatype(datatypesMapper, inputDatatypes[], otherDatatypes[])` function has **no** parameter-vs-data awareness — that guard lives one level up in Galaxy's `BaseInputTerminal._producesAcceptableDatatype` wrapper (lines 369–376) via an `instanceof OutputParameterTerminal` check. The wrapper stays in Galaxy; the pure function ports verbatim.
2. Copy `ConnectionAcceptable` class from around line 30 of `terminals.ts` — also pure.
3. Write fresh unit tests. The block in terminals.test.ts for this function is thin; use fixture `DatatypesMapperModel` instances from Phase 3. Future callers in this repo (the TS validator) dispatch on parameter-vs-data before calling the algebra — same shape as the Python port's `_validate_single_connection`.

Acceptance: tests pass, `make check` clean.

### Phase 5: Barrel + publish prep

1. `src/index.ts` re-exports the full public API.
2. README with: purpose, what it is/isn't, link to CONNECTION_VALIDATION.md for historical context.
3. Full `make check && make test` green.
4. `pnpm changeset` already done in Phase 1 — verify it covers all phases before merge.
5. PR: `workflow-graph: extract collection-type and datatype primitives from Galaxy editor`.

Acceptance: CI green, PR approved, merged, published as `@galaxy-tool-util/workflow-graph@0.1.0` via the standard release flow.

### Phase 6: Galaxy-side adoption

Separate PR in Galaxy, branched off `dev` (not `main`), targeted at `dev`. Land ASAP — do not wait for a Galaxy release window.

1. `yarn add @galaxy-tool-util/workflow-graph@^0.1.0` (or npm/pnpm per client tooling).
2. Replace `client/src/components/Workflow/Editor/modules/collectionTypeDescription.ts` with a one-line re-export file. No import-site changes anywhere else.
3. Replace `client/src/components/Datatypes/model.ts` with a re-export. Keep `factory.ts` as-is (it's store-wiring).
4. Move `ConnectionAcceptable` + `producesAcceptableDatatype` exports in `terminals.ts` to re-exports; keep the terminal classes using them.
5. Run the client test suite. Expectation: zero test changes needed, everything green.

Acceptance: `yarn test` in `client/` passes. `client/src/components/Workflow/Editor/modules/terminals.test.ts` runs unchanged.

## Testing Strategy

- **Red-to-green on port:** first copy the tests, watch them fail (module not found), then port the code, watch them go green.
- **Duplication is OK short-term:** during the port, the tests live in both repos. Once Galaxy's re-export lands, the Galaxy-side ported tests for collection-type can be removed in a follow-up (keep terminals.test.ts, which exercises the full class hierarchy on top of the re-exports).
- **No behavior changes allowed in v0.1.0.** Any deviation from the editor's current behavior (including F1/F2 bugfixes noted in CONNECTION_VALIDATION.md) is a separate PR with its own changeset. Port first, fix second.
- **Run ported tests and Galaxy client tests before declaring Phase 6 done.**

## Galaxy-Side Blast Radius

From grep in `wf_tool_state` client/:

Collection-type imports (5 files):
- `src/stores/workflowStepStore.ts`
- `src/components/Workflow/Editor/modules/terminals.ts`
- `src/components/Workflow/Editor/modules/terminals.test.ts`
- `src/components/Workflow/Editor/Forms/FormCollectionType.vue`
- `src/components/Workflow/Editor/NodeOutput.vue`

Datatypes imports (~15 files — most only use `DatatypesMapperModel` type). All satisfied by re-export.

Zero call-site changes expected. The whole Galaxy adoption PR should be <10 lines of diff if the re-exports are clean.

## Versioning / Publishing

- Follows the existing `packages/*` linked-version cadence. `@galaxy-tool-util/workflow-graph@0.1.0` ships alongside whatever the next release is.
- No pre-1.0 API stability guarantee, but Tier 1 API is tiny and stable by construction (it's a 10-year-old editor idiom).
- Galaxy pins `^0.1.0`. Subsequent Tier 1 changes are additive or go through a documented deprecation.

## Risks

1. **Behavior drift during port.** Mitigation: verbatim copy, verbatim tests. CI on both sides before merging Galaxy PR.
2. **Galaxy's OpenAPI-derived `DatatypesCombinedMap` drifts from our hand-written type.** Mitigation: TypeScript structural compatibility check in Galaxy's CI will catch new required fields; the hand-written type is intentionally minimal (only fields actually read). Revisit if Galaxy adds new fields used by the mapper.
3. **Publishing cadence.** Galaxy's client bumps this package version on every release of `galaxy-tool-util-ts`. Low-frequency for a package this stable.
4. **Vue/tree-shaking in Galaxy.** Package is pure TS, no Vue. `sideEffects: false` in `package.json` so Galaxy's bundler tree-shakes cleanly.
5. **Editor tests in Galaxy fail because of a subtle export-site difference.** Mitigation: re-exports preserve the original symbol names exactly. If discovered, fix by adding the missing name to the barrel, not by changing behavior.

## Done Criteria

- `@galaxy-tool-util/workflow-graph@0.1.0` published.
- Galaxy client imports it, three files become thin re-exports, full client test suite green.
- This repo's future TS connection validator can `import { CollectionTypeDescription, canMatchAny, effectiveMapOverAny, DatatypesMapperModel, producesAcceptableDatatype } from "@galaxy-tool-util/workflow-graph"` and build the validator on top with no duplication of Tier 1 logic.
- A short note added to `GXWF_AGENT.md` mentioning the new package as the canonical location for these primitives.

## Resolved Decisions

- **Package name:** `@galaxy-tool-util/workflow-graph`. Leaves headroom if Tier 2 is ever revisited.
- **Galaxy branch target:** fresh branch off `dev`, PR to `dev`, land ASAP — not gated on any Galaxy release window.
- **DatatypesCombinedMap:** hand-written minimal type (D2). Galaxy's generated type is structurally compatible; drift is caught at compile time on the Galaxy re-export site.
- **`OutputParameterTerminal` guard:** not in scope — it was never part of the pure `producesAcceptableDatatype` function; it's a wrapper at the Terminal class level in Galaxy. The pure function ports verbatim; the wrapper stays in Galaxy. Future callers in this repo dispatch parameter-vs-data before calling the algebra.

## Unresolved Questions

- None blocking. Minor ones that can be decided at PR time:
  - Exact path for Galaxy's re-export shim (keep three shim files at original locations vs one barrel).
  - Whether to remove Galaxy-side Tier 1 tests in the same PR as the re-export, or follow up.
