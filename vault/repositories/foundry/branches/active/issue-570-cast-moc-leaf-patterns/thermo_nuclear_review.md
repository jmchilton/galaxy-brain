Run via claude-opus-5-5 at default effort.

I acted on all four Foundry findings in one commit, `ec4d9ca4` (pushed to `jmchilton`): there is now one shared definition of "a pattern map's leaves", the duplicated body-link scan is merged into one helper, the verifier's misplaced comment is fixed, and the multi-line comments are cut to one line. I made no changes to foundry-lib: its two findings are naming and API shape, and fixing either would change a public export for little gain. No bugs found. Casts re-cast with no drift.

Not acted on:

- **Lib: `expandLinkedRefs` returns `CompanionExpansion`.** The name is wrong for the new caller. But it is an exported type, so renaming it means a breaking change or an alias that adds indirection. Worth doing only if the type gets touched again.
- **Lib: `resolveMoldRef(raw, index, ctx, label)`.** `index` matters only for the default label, so expansion callers pass both. Collapsing them changes an exported signature. The default keeps existing callers unchanged, so I left it.
- **validate.ts and tests/cast-mold.test.ts are over 1000 lines.** Both were already well over (about 1600 and 2800 lines) before this branch. The branch adds about 40 and 200 lines, and the source side is now net smaller. Splitting them is outside this change.
- **`mocLinkNotes` takes the leaf directory from the first expanded leaf.** Every pattern ref lands under one `dst_dir`, so this is correct. Deriving it from the target config would mean threading the target through the SKILL.md hook for no change in behavior.

<details>
<summary>Full review</summary>

## Scope

- Foundry: 06eaadeb, 6d96d0aa and 15fcb9bf. That covers `packages/build-cli/src/commands/cast-mold.ts`, `validate.ts`, `scripts/cast-skill-verify.ts`, the provenance schema, and tests. Regenerated `casts/` files are skipped.
- foundry-lib `cast-expand-refs` (21802b9, 3952d36): `packages/cast/src/caster/{refs,hooks,cast-mold}.ts`, provenance, index, and tests.

## Findings

### 1. "Which patterns are a map's leaves" was defined in two places (structural, acted on)

Two places decided what a map lists. `mocLeafRefs` in cast-mold.ts took `related_patterns`, dropped non-strings, and dropped targets with `pattern_kind === "moc"`. `validateMocRelatedPatterns` in validate.ts resolved `related_patterns` by its own rules. The moc check, `pattern_kind === "moc"`, was written five times across the two files, and the two files tested `type` differently. The whole feature depends on the validator and the caster agreeing on this, and nothing made them agree.

Fix: a new module, `packages/build-cli/src/lib/pattern-maps.ts`, with `isPatternMap(meta)` and `patternMapLeaves(meta, slugMap, metaByPath)`. Each leaf comes back as `{ link, path }`, and an unresolved leaf is kept with `path: null` so the caster still reports it. Both the expander and the validator now use these, and `mocLeafRefs` shrinks to a guard and a map. The validator's "declared" set changes from all related patterns to leaves only. Behavior is the same, because a body link to a sibling map is skipped either way.

### 2. Two copies of the body wiki-link scan (acted on)

`validateMocRelatedPatterns` repeated `validateBodyWikiLinks`'s scan line for line: read the body, strip fenced and inline code, match, trim, skip empties, dedupe. The two copies used different loop styles (an `exec` loop with `lastIndex` reset, and `matchAll`).

Fix: a new `bodyWikiLinks(filePath)` returns each distinct `[[inner]]` outside code, and both validators call it. `validateBodyWikiLinks` is now one `flatMap`. The moc validator's two sets (declared and reported) and its two consecutive `continue` checks are merged into one `covered` set.

### 3. `mocLinkNotes` took `runtime` and `refs` (acted on)

After 15fcb9bf the function took both lists, though `runtime` is just `refs` without cast-time entries. Callers had to know which list fed which half. It now takes only `refs` and filters inside. The map filter also checked `!r.expanded_from && !r.companion_of`, which can never matter here: an expanded ref is never a map, because the expander drops sibling maps, and a companion's `src` is not a note. Those checks were removed, and the map test now goes through `isPatternMap`.

### 4. Verifier comment separated from its code (acted on)

In `scripts/cast-skill-verify.ts`, the new `expanded_from` block was inserted between the "on-demand refs should have trigger text..." comment and the code it describes, so the comment sat above the wrong block. The block also ended in a `continue` to skip that check. It is now an `if / else if`: the expanded-ref branch comes first, and the comment sits inside the on-demand branch.

### 5. Multi-line comments (acted on)

AGENTS.md allows code comments of one short line at most. The branch added three multi-line JSDoc blocks: `mocLeafRefs`, `mocLinkNotes` and `validateMocRelatedPatterns`. Each is now one line.

### 6. Lib: `expandLinkedRefs(): CompanionExpansion` (declined)

The result type is a generic `{ refs, errors }` named after companions. A neutral name such as `RefExpansion` would read better, but the type is exported. See above.

### 7. Lib: label plus index on `resolveMoldRef` (declined)

The new `label` parameter makes `index` redundant whenever a label is passed. Taking only a label would be cleaner, but it changes a public signature. See above.

### What holds up

- The lib hook is small and well placed. Expansion is pure, one level deep, and the declared ref wins a shared destination. It runs before companions, so expanded notes bring their own companions. Each expanded entry records `expanded_from` in provenance. Sweeping falls out of the existing provenance diff, so there is no new state.
- No new conditionals in shared paths. The SKILL.md change is one filter (`listed`) and one spread into Runtime Notes.
- The verifier's `expanded_from` check gives the provenance field something that enforces it.

## Gates after changes

Foundry: `npm run packages-build`, a re-cast (no drift), `make check-casts check-verify`, the vitest files, `npm run typecheck`, `npm run lint`, `npm run format`, `npm run validate`. All green: check-casts and check-verify pass, vitest 194/194, typecheck, lint and format clean, validate 0 errors (71 existing warnings). The lib is unchanged, so no lib gates were rerun.

</details>
