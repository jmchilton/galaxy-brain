# Implementation debrief: issue-570-cast-moc-leaf-patterns

Fixes [#570](https://github.com/galaxyproject/foundry/issues/570): casts shipped a Galaxy pattern map of content (`pattern_kind: moc`) without the leaf pattern pages it routes to.

## Root cause

Verified. `@galaxy-foundry/cast` 0.12.3 packages only a Mold's own `references:` plus Kind-declared companions. Nothing treated a `moc` differently, even though the pattern kind doc said the three pattern kinds "are cast differently". The instance couldn't add refs: `castOne` reads the Mold off disk, and `bundleFiles` output under `references/patterns/` is swept as an orphan.

## Decision

John chose to implement the lib hook and the Foundry side together (2026-10-31). The alternatives were explicit leaf refs in each Mold (about 50 entries × 11 Molds) and putting a `tool_id` inline in each MOC entry.

## Changes

- **foundry-lib** branch [`cast-expand-refs`](https://github.com/jmchilton/foundry-lib/tree/cast-expand-refs) (`21802b9`, base `origin/main` `7ec6a85`): adds an optional `CastHooks.expandRefs`. It returns refs in authored form. They resolve through `resolveMoldRef`, with errors labelled `<parent> expansion[i]`, run before companion expansion, go one level deep, and keep one entry per `dst` (the Mold's own declaration wins). Provenance gains an optional `expanded_from`. Unit and `castMold` end-to-end tests, docs, and a minor changeset. There's no PR yet; the Foundry branch needs it released as 0.13.0.
- **Foundry** (`06eaadeb` code, `40fdcbe0` re-cast):
  - `mocLeafRefs` expands a declared `moc` pattern into an on-demand verbatim ref for each `related_patterns` leaf, skipping sibling maps.
  - SKILL.md keeps one row per map and adds a Runtime Notes line saying where the map's links resolve.
  - The validator rejects a `moc` whose body links a leaf pattern that `related_patterns` omits. `galaxy-interval-patterns` gained the one it was missing: `tabular-filter-by-column-value`.
  - The verifier skips the "named in SKILL.md" check for expanded refs, and the provenance schema gains `expanded_from`.
  - Docs: casting.md, pattern-authorship.md, pattern `kind.md` (and the regenerated kinds manifest).
  - Nine bundles were re-cast. The largest now carries 44 pattern files (348K).

## Tests

- Red first. The Foundry cast fixture (a MOC, a leaf and a sibling MOC) failed because no leaf was in the bundle. The validator case failed with 0 errors instead of 1.
- Green: the foundry-lib workspace tests all pass (cast: 162). In Foundry, `make -k check` passes except `check-vendored`, which is machine-only (local Galaxy checkout drift). `typecheck`, `lint`, `format`, `packages-typecheck` and `packages-test` are clean. All of this ran against the local lib through a pnpm `link:` override that isn't committed.

## Caveats

- `package.json` pins `@galaxy-foundry/cast` `^0.13.0`, but `pnpm-lock.yaml` still records 0.12.3. CI's frozen install fails until the lib is published and the lockfile is refreshed.
- Leaves' own bodies link to other pages. Those ship only if some map lists them. The Runtime Notes line scopes its claim to links inside the map.
