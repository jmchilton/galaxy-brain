# #570 Pattern MOCs are cast without the pattern pages they point at

[Issue](https://github.com/galaxyproject/foundry/issues/570) — opened by scottcain's AI assistant. Labels: `agent/implement`, `priority/mvp`, `roadmap/off`. No comments; no PR or branch addressed it before this one.

Branch: [`issue-570-cast-moc-leaf-patterns`](../../../branches/active/issue-570-cast-moc-leaf-patterns/index.md).

## Status

`wip` (rule 2): claimed by the wf_foundry work horse on 2026-10-31.

## Findings

- Verified on `origin/main` `eb2de3f1`: every cast that declares a Galaxy MOC (`galaxy-collection-patterns`, `-conditionals-`, `-interval-`, `-tabular-`) carries only the MOC files under `references/patterns/`; none of the leaves it links ship.
- The `pattern` kind doc (`packages/gxwf-foundry-note-schema/src/types/pattern/kind.md`) says the three pattern kinds "are browsed and cast differently", but the caster copies a MOC like any other pattern. Foundry-owned; not an upstream bug.
- The library `@galaxy-foundry/cast` 0.12.3 (jmchilton/foundry-lib) does the ref resolution: `castMold` reads only `mold.meta.references` plus declared companions. `CastHooks` can't add refs. `bundleFiles` output under `references/patterns/` is swept as an orphan, and anything placed elsewhere gets no provenance. So a Foundry-only fix that packages leaves automatically isn't possible on the current lib.
- Scale: the five Galaxy MOCs link 65 leaf pattern pages in their bodies (collection 21, tabular 17, interval 12, sequence 9, conditionals 6), from 54 pattern notes in total. `related_patterns` frontmatter covers fewer than the body links (collection: 18 of 21). 11 Molds cite a MOC.
- Copied MOCs keep raw `[[slug]]` links. Even once the leaves ship, the cast skill needs a Runtime Notes line saying that `[[slug]]` maps to `references/patterns/<slug>.md`.

## Decision needed (2026-10-31)

The work horse stopped before implementation. Options:

1. **Upstream (recommended):** an `expandRefs` hook in foundry-lib (draft: [upstream_issue_draft.md](upstream_issue_draft.md)), then Foundry registers MOC → `related_patterns` expansion, reconciles `related_patterns` with body links, adds the Runtime Notes mapping and re-casts. Needs an `upstream/foundry-lib` label, which doesn't exist (the issue-labels.md table has no foundry-lib row).
2. **Foundry-only, explicit:** list the leaves in each Mold's `references:` and add a validator rule that a Mold citing a MOC also cites each of its leaves. No lib change, but it means about 50 entries in each of 11 Molds.
3. **Foundry-only, inline:** add the concrete `tool_id` to each MOC entry (the issue's second option). Cheap, but it duplicates leaf content, still ships no worked state, and cuts against pattern-authorship's rule that a MOC doesn't own recipes.

Worktree `~/projects/worktrees/foundry/branch/issue-570-cast-moc-leaf-patterns` sits at `origin/main` `eb2de3f1`, with no commits yet.

**Decided 2026-10-31:** John picked "implement lib + Foundry now". The foundry-lib branch `cast-expand-refs` adds an `expandRefs` hook; Foundry branch `issue-570-cast-moc-leaf-patterns` registers MOC → `related_patterns` expansion. The upstream issue draft is superseded and wasn't filed. The branch record holds the details.
