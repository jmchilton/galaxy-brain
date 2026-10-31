# Draft: jmchilton/foundry-lib issue

**Title:** cast: let an instance expand a resolved ref into the notes it links (MOC → leaf pages)

## Problem

`castMold` only packages what a Mold's `references:` lists, plus declared companions (`expandCompanions`). A ref to a hub note — Galaxy's `pattern_kind: moc` pages — therefore ships as an index whose links lead nowhere inside the bundle. galaxyproject/foundry#570: the four Galaxy pattern MOCs ship in 9 bundles, and none of the ~50 leaf pattern pages they route to ship with them. A skill told to "use only files packaged in this skill bundle" gets a pattern name and no `tool_id` or worked state.

The instance cannot fix this today:

- `CastHooks` has no way to add refs. `castOne` reads the Mold's frontmatter from disk, so the instance can't pre-expand `references:` either.
- `bundleFiles` can't stand in: anything it writes under a target-owned subtree (`references/patterns/`) is swept as an orphan, and files elsewhere get no provenance entry or hash check.
- Listing every leaf in every Mold's `references:` works, but it means ~50 hand-maintained entries in each of 11 Molds and a 50-row "Load On Demand" section in each SKILL.md.

## Proposal

Add an optional hook that runs after `resolveMoldRef` and before `expandCompanions`:

```ts
/** Extra refs implied by one a Mold declared. Pure; same input → same output. */
readonly expandRefs?: (ref: ResolvedRef, ctx: CastContext) => readonly RawRef[];
```

Returned raw refs go through `resolveMoldRef` like authored ones (kind, mode and target checks all apply), carry an `expanded_from: <dst>` provenance field the way companions carry `companion_of`, and are deduplicated by `dst` against authored refs (authored wins). Foundry would register a hook that expands a `pattern_kind: moc` pattern into its `related_patterns` as `load: on-demand` pattern refs.

Alternative: declare it in the kind's `cast:` block (`expand: { field: related_patterns, when: { pattern_kind: moc } }`). That reads well in `reference_contract.yml`, but it puts the instance's semantics (which field, which condition) into the shared contract vocabulary.

## Acceptance

- A ref with an expansion hook packages the expanded notes, records them in `_provenance.json` with `expanded_from`, and `--check` treats them like any other ref (hash drift, orphan sweep).
- An authored ref and an expansion with the same `dst` produce one entry.
- Without the hook, behavior is unchanged.
