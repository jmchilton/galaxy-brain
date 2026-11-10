---
related_records: foundry/issues/723
---

# #678 `galaxy-tool-discovery` `status` has no `unsuitable` case; a capability miss routes to authoring a wrapper that exists

[Issue](https://github.com/galaxyproject/foundry/issues/678) — opened by scottcain's AI assistant. Labels: `roadmap/substep`, `priority/mvp`, `work/needs-review`. Parent: #318. No PR or branch implements it. #686 and #689 edit the same routing lines.

- [Research comment](https://github.com/galaxyproject/foundry/issues/678#issuecomment-6690347893) ([local draft](research_comment.md), identical except for the agent marker), posted 2026-11-06 against `origin/main` `51338d1d`.

## Derived status

`wip`, rule 2: AnastasiaSee's draft PR [#773](https://github.com/galaxyproject/foundry/pull/773) (opened 2026-11-10) says it closes this. The research comment is still unanswered.

## #773, checked 2026-11-10 against `origin/main` `94ce4ea2`

It adds `unsuitable` to `discover-shed-tool`'s prose, which our comment recommended against, and an authoring gate for #723. #753 has since given repair a removal destination (`repair` "Removal"), but nothing routes `unsuitable` there:

- The schema enum (`packages/gxwf-foundry/src/schemas/galaxy-tool-discovery/galaxy-tool-discovery.schema.json:24-27`) still lists only `hit`, `weak`, `miss`. An `unsuitable` result fails `validate-galaxy-tool-discovery`.
- `advance:169` and `:182` still send these cases to authoring. No Mold appends the blocking entry that repair runs on.
- `discover:106` still lets `weak` fall through, which contradicts the new gate.
- No recast, and only the triage workflow has run on it.

Overlaps: `fix/advance-draft-needs-tool` (the `needs_tool` entry, in `advance` step 2), #545 (the same `author` files) and #686 (`advance`).

## Research result

- No new status. Discovery classifies on whether a wrapper runs what the need names; `rna_star` is `hit` or `weak`.
- `implement-galaxy-tool-step` raises a blocking ledger entry after summarize; `advance-galaxy-draft-step` step 5 escalates to repair.
- `weak` stops falling through to authoring. `author-galaxy-tool-wrapper` stops on an alternate that does the work or an open blocking entry on the step.
- Sequence: #669 plus a fold clause, then #678, then #723 split. #686 conflicts textually, not in design.

Questions for John, also under "Unresolved" in the comment:

1. Dead end: a step repair can't close stays drafty and is re-picked, so a labelled gap can't happen today. Repair deletes the step and records `kind: dropped` (recommended), or an upstream skip in `nextDraftStep`?
2. Should a required index with no consumer to fold into end the run blocked, not as a UDT?
3. `test-pipeline` under #686: a STAR-style step ends `loop_blocked` because the worker can't run repair. Accept, or add a repair worker?
4. Broken or deprecated wrappers: exception to #723's invariant?
5. Should capability gaps share the `topology_repair` budget?

## Verified

Review round: one fresh subagent, whose findings changed the route (dead end, insert path, `weak`, `author` inputs). I rechecked the main ones against source before applying them.

- Against code at `51338d1d`: Mold, schema, note and eval citations in the comment.
- Against PRs: #686, #689 (merged into #686's branch, not main), #545, #696, using full file lists.
- Live Tool Shed, 2026-11-06: `galaxy-tool-cache summarize` on `rna_star` `2.7.11b+galaxy1`; `gxwf tool-search` results and row keys.
- tools-iuc `274f6fe0`: `tools/rgrnastar/macros.xml:82-93`, `rg_rnaStar.xml:24`.

## Not verified

- `galaxy-tool-pin.R7.json`, its need text and search history. It isn't linked, and GitHub code search and `nekrut/foundry-paper` found nothing.
- That the issue's run is the nf-core/rnaseq run behind #655 and #669. Likely, not proven.
- Search rankings under the cast's pinned `gxwf ^1.15.0`. Local reports 1.0.0.
- The once-per-sample index rebuild cost, inferred from `@TEMPINDEX@`, not measured.
- That the reference-data rule (`nextflow-to-galaxy-reference-data-mapping/index.md:95`) produced R7's step.
- #669's tx2gene, #723's Salmon selector and `vsearch --sintax`, cited from the issues or a pin's rationale.
- `make casts` and `make check` weren't run; nothing was implemented.

## Corrections to the earlier triage

- `d8d32326fbfb` is listed in usegalaxy-eu's `tools_iuc.not-installable-revisions.yaml`, so it's likely not just a newer revision. `tool-revisions` resolves `2.7.11b+galaxy1` only to `6e8618432bea`. This is #645 territory and stays out of the comment.
- "No PR addresses it" missed #686 and #689, which edit `advance:169`, `advance:174` and `repair:92`.
- `advance:182` is a red-validate bucket and the wrong hook. The route is `implement:161` to `advance:174`.
- "Topology repair excludes this case" was too strong. The exclusions cover no wrapper picked and a missing wrapper. The positive trigger is what shuts STAR out.
- "Implementation adds the status to the schema" is reversed: description text only.
- `:19` of the schema JSON also says `weak` "may fall through" and needs rewording.

## Related, all open

- #723: close to a superset; its requirement 2 needs this route. Its own record still asks the merge question, and this research recommends sequencing.
- #669: the deletion shape this needs, plus a fold clause.
- #655: other gaps in the same `advance-galaxy-draft-step` step 2 cascade; correction 8 needs reconciling with #723.
- #318: its recommendation 3 sends `weak` to authoring, which this research changes.
- #686: `test-pipeline` controller, carries #689. #545 touches `author` frontmatter.

Closed and related: #549 (reuse an already-pinned wrapper), #573.

Not an upstream issue, unless the dead-end answer picks the `nextDraftStep` skip (`@galaxy-tool-util/schema`).

## Next

After John answers: implement per the comment's change list, once #669 and its fold clause are settled.
