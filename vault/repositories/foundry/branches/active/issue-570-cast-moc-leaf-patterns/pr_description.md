Fix 🎯 #570 - a cast that ships a Galaxy pattern map of content now ships the leaf pattern pages the map lists.

The nine Galaxy-target bundles (data-flow and template for each source, plus `repair-galaxy-draft-topology`) cite the collection, tabular, conditionals and interval maps "on demand". Each map is only an index of pattern names. The `tool_id`, the settings and the worked state live on the leaf pages, and no bundle shipped any of them. A skill told to use "only files packaged in this skill bundle" could get a pattern's name and nothing behind it.

| `workflow-brief-to-galaxy-data-flow` bundle | `main` | this branch |
|---|---|---|
| files in `references/patterns/` | 4 (the maps) | 44 (maps + their leaves) |
| files mentioning `__FLATTEN__` | 0 | 1 (`collection-flatten-after-fanout.md`, `tool_id: __FLATTEN__`) |
| files mentioning `collection_column_join` | 0 | 1 (`tabular-pivot-collection-to-wide.md`) |
| files mentioning `collapse_dataset` (Collapse Collection) | 0 | 1 (`tabular-concatenate-collection-to-table.md`) |

These are the three tools #570's run needed for its fan-in, flatten and tabular-bridge steps. That run resolved them only because an unrelated earlier artifact happened to quote them. Across the nine bundles, pattern files grow from 2–4 to 31–44. ***The leaves load on demand, so a skill reads nothing new up front; only the bundle on disk grows.***

***This takes #570's first option, shipping the leaves.*** The other option, inlining `tool_id`s into the maps, would copy each tool's settings onto a second page that has to be kept in step.

**Molds don't change.** Each Mold still declares only the maps, and SKILL.md still lists each map once. The leaves come from the map's own `related_patterns`. SKILL.md gains a single Runtime Notes line saying a leaf link in a listed map names `references/patterns/<slug>.md`, so 40 leaves don't get 40 rows.

**`related_patterns` is now held to the body.** A map whose body links a leaf pattern that `related_patterns` omits fails `npm run validate`, because that leaf would silently be missing from every cast. That caught one real gap: `galaxy-interval-patterns` linked `tabular-filter-by-column-value` without listing it. Links between sibling maps are exempt. A sibling map is a route rather than a leaf, and it ships only where a Mold declares it. ***Only `pattern_kind: moc` pages are checked; operation and recipe pages are unaffected.*** Adding a leaf to a map adds it to every cast that declares the map.

***One level only.*** Links from a leaf to research notes, Molds or unlisted patterns still don't ship. In `workflow-brief-to-galaxy-data-flow` that is 22 targets: 10 research notes, 9 Molds, the sequence map, `derive-parameter-from-file` and the FASTA-specific `relabel-fasta-headers-via-tabular`.

**This needs `@galaxy-foundry/cast` 0.13.0** from [jmchilton/foundry-lib#139](https://github.com/jmchilton/foundry-lib/pull/139). The caster packaged only a Mold's own `references:` and the companion files a note kind declares, and nothing let an instance add refs. That branch adds an optional `expandRefs` hook: the refs it returns resolve, hash, license-check, sweep and record (`expanded_from`) like authored ones. ***The library hook knows nothing about maps; Foundry's `mocLeafRefs` decides what a declared ref implies.*** Expansion runs one level deep, and an authored ref wins a shared destination. `package.json` already asks for `^0.13.0`, but the lockfile still pins 0.12.3, so CI can't install until the release lands.

<details><summary>What changed, by area</summary>

- **`packages/build-cli/src/commands/cast-mold.ts`**
  - The `expandRefs` hook (`mocLeafRefs`): a declared `pattern_kind: moc` pattern ref adds an on-demand verbatim ref for each non-map entry in `related_patterns`.
  - The Runtime Notes line (`mocLinkNotes`). It names every runtime map and promises nothing about the maps' links to research notes or other maps.
  - Expanded leaves don't get their own Load rows.
- **`packages/build-cli/src/lib/pattern-maps.ts`**: one shared definition of "a map's leaves", used by both the caster and the validator.
- **`packages/build-cli/src/commands/validate.ts`**
  - `validateMocRelatedPatterns`, the body links ⊆ `related_patterns` rule.
  - It shares the body wiki-link scan with `validateBodyWikiLinks`.
- **`scripts/cast-skill-verify.ts`**: an expanded ref must name a declared ref in its `expanded_from`, and SKILL.md must name that ref. Such refs are excused from the "named in SKILL.md" check.
- **`scripts/lib/schemas/cast-provenance.schema.json`**: `expanded_from` added.
- **Docs**: `content/meta/casting.md` (the dispatch table and how expansion works), `content/meta/pattern-authorship.md` (the map's leaf list), and the pattern `kind.md`, whose "cast differently" claim is now true. The kinds manifest is regenerated.
- **Content**: `galaxy-interval-patterns` lists `tabular-filter-by-column-value`.
- **Dependencies**: `@galaxy-foundry/cast` `^0.13.0` in the root, `build-cli` and `gxwf-foundry-note-schema` `package.json` files.
- **Generated**: the nine bundles under `casts/` and `content/Dashboard.md`.
- **Tests**:
  - A cast fixture with a map, a leaf and a sibling map. It checks that the leaf ships with `expanded_from`, the sibling doesn't ship, the notes line is present, and the verifier passes.
  - Sweep on delisting.
  - The tampered-`expanded_from` rejection.
  - A cast-time map claiming a shared leaf first.
  - Validator accept and reject cases.
  - The cast fixture fails on `main` at the missing leaf file, and the validator case fails with 0 errors instead of 1.

</details>

## Risks

Risks are minimal. The behavior is a cast-time packaging rule plus one validation rule. Reverting it and re-casting restores the old bundles, so it is a two-way door.

<details><summary>Risk Details</summary>

- It depends on an unreleased `@galaxy-foundry/cast` 0.13.0. Until that is published and the lockfile refreshed, frozen installs and CI fail.
- The nine bundles grow by 29–40 pattern files each (the largest `references/patterns/` is now 348K). The leaves load on demand, so nothing new is read up front.
- The leaves' own bodies still link pages that don't ship: 22 targets in the data-flow bundle, two of them patterns (`derive-parameter-from-file`, `relabel-fasta-headers-via-tabular`). Expansion is deliberately one level deep. Listing those two in a map, or expanding transitively, is a follow-up, not part of this fix.
- On the foundry-lib side, the `expandRefs` hook and the `expanded_from` field are optional and additive, so leaving them unused costs nothing. Once 0.13.0 ships, though, they are public, and removing them would be a breaking change.
- The new validator rule turns an omitted leaf into an error, so a future map edit that links a new leaf has to list it too.

</details>

<details><summary>Risk Review Advice</summary>

Look at `mocLeafRefs` and the shared leaf rule in `pattern-maps.ts`: together they decide what every Galaxy cast now carries. Read the new Runtime Notes line in one SKILL.md, since that line is all a cast skill is told about where leaves live. The foundry-lib hook is the other half and deserves its own look before 0.13.0 ships.

</details>

## Context

Needs [jmchilton/foundry-lib#139](https://github.com/jmchilton/foundry-lib/pull/139), used to give the caster a hook for refs implied by a declared ref. Adjacent: #266 (vendored companions of a single note, not wiki-linked siblings), #504 and #505 (pattern page quality and test workflows), #284 (data-flow examples on multi-step patterns).

## Agentic Checks

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>No bugs; one shared definition of a map's leaves replaced five copies of the check, and the duplicated body-link scan was merged.</summary>

- Added `pattern-maps.ts` (`isPatternMap`, `patternMapLeaves`), which serves the caster hook, the notes line and the validator.
- Merged the copied body wiki-link scan into a `bodyWikiLinks()` helper.
- Simplified `mocLinkNotes` and restored the verifier comment to the code it describes.
- Cut three multi-line comments to one line, per `AGENTS.md`.
- Declined two lib API renames (a breaking export change for naming only) and splitting the already-oversized `validate.ts` and `tests/cast-mold.test.ts`.

[Full report](https://galaxy-brain.jmchilton.net/repositories/foundry/branches/issue-570-cast-moc-leaf-patterns/thermo_nuclear_review/). Run via claude-opus-5-5 at default effort.

</details>

### ✅ Second Frontier Model Review

<details><summary>One finding, fixed: a cast-time map that claimed a shared leaf first suppressed the runtime map's Runtime Notes line.</summary>

The dedup keeps the first claimant's `used_at`. If a cast-time map is declared before a runtime map and both list the same leaf, the leaf dropped out of the runtime refs and the notes line vanished. The line now looks for expanded leaves across all refs, and a regression test was added. The foundry-lib branch got no findings.

[Full report](https://galaxy-brain.jmchilton.net/repositories/foundry/branches/issue-570-cast-moc-leaf-patterns/codex_review/). Run via gpt-6.1-sol.

</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
