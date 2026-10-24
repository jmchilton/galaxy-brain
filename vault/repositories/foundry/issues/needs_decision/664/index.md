# #664 Four upstream Galaxy tool-wrapper defects found by reading the pinned XML (MultiQC, salmonquantmerge, AGAT, StringTie)

[Issue](https://github.com/galaxyproject/foundry/issues/664) — opened by scottcain's AI assistant (nf-core/rnaseq 3.27.0 translation), only `needs-triage`, no comments, no PR or branch.

Not a Foundry change: a bundle of four wrapper bugs in other repos. Work is forwarding them.

## Proposed labels

- `roadmap/off`: no `roadmap/main` fits (#501 is Foundry tool-authoring support; #59 is research). Substep would force a parent; none honest.
- Parent: none.
- `priority/v2`: Foundry itself unaffected; workarounds exist (downstream `change_datatype`, collection_column_join).
- `agent/human`: John decides whether/where to forward; filing upstream is outside the greenlist.
- `upstream/tools`: the fixes land in tools-iuc and bgruening/galaxytools (label added 2026-10-24).

## Derived status

`needs_decision`, overriding rule 3: nothing is filed upstream yet, so the next move is John's. Becomes `blocked` once upstream issues/PRs exist.

## Upstream check (2026-10-24, current main of each repo)

No existing upstream issue/PR found for any of the four (searched tools-iuc, bgruening/galaxytools). Not checked: release/published shed versions beyond main.

1. multiqc qualimap (tools-iuc): confirmed on main. `qualimap_plugin.xml` only matches `genome_results` etc. and ends in `#pass`; no `rnaseq_qc_results`. Related merged tools-iuc#2990 "Update multiqc with qualimap" (added BamQC path).
2. salmonquantmerge (bgruening/galaxytools): confirmed `<repeat name="quantfiles">` on master.
3. agat (bgruening/galaxytools): confirmed `<when input="output_format.selector" ...>` in `change_format` on master.
4. stringtie (tools-iuc): confirmed `fraction` value 0.01 vs help "Default: 0.05", `min_bundle_cov` 1 vs "Default: 2", `bundle_fraction` 1 vs "Default: 0.95".

Repo routing: 1 and 4 tools-iuc; 2 and 3 bgruening/galaxytools (issue says "three repos"; only two verified, salmonquantmerge may differ if it also lives elsewhere).

## Next

John decides: (a) file four separate upstream issues (one per defect, linking #664), then close #664 or keep as tracker; (b) fix some directly via PRs (2 and 4 are trivial XML). Assign `roadmap/off`, `priority/v2`, `agent/human` on OK.
