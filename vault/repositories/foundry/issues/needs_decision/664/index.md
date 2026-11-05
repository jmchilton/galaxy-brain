# #664 Four upstream Galaxy tool-wrapper defects found by reading the pinned XML (MultiQC, salmonquantmerge, AGAT, StringTie)

[Issue](https://github.com/galaxyproject/foundry/issues/664) — opened by scottcain's AI assistant (nf-core/rnaseq 3.27.0 translation), only `needs-triage`, no comments, no PR or branch.

Not a Foundry change: a bundle of four wrapper bugs in other repos. Work is forwarding them.

## Proposed labels

- `roadmap/off`: no `roadmap/main` fits (#501 is Foundry tool-authoring support; #59 is research). Substep would force a parent; none honest.
- Parent: none.
- `priority/v2`: Foundry itself unaffected; workarounds exist (downstream `change_datatype`, collection_column_join).
- `agent/human`: John decides whether/where to forward; filing upstream is outside the greenlist.
- `upstream/tools`: the fixes land in tools-iuc and bgruening/galaxytools (label added 2026-10-24).

## Filed upstream (2026-11-05)

Re-verified on current main/master first; no duplicates found. Each body links #664 and carries the wf_foundry agent marker.

1. multiqc qualimap: [tools-iuc#8866](https://github.com/galaxyproject/tools-iuc/issues/8866) (now multiqc 1.35+galaxy5).
2. salmonquantmerge: [bgruening/galaxytools#2093](https://github.com/bgruening/galaxytools/issues/2093).
3. agat: [bgruening/galaxytools#2094](https://github.com/bgruening/galaxytools/issues/2094). Confirmed against Galaxy dev: `tool_util/parser/xml.py` prefixes `$`, `tools/actions/__init__.py` swallows the lookup error.
4. stringtie: [tools-iuc#8867](https://github.com/galaxyproject/tools-iuc/issues/8867) (now stringtie 3.0.3+galaxy3; defaults checked against `stringtie.cpp` at `v3.0.3`; possibly related tools-iuc#5098).

## Derived status

`needs_decision` (rule 3, staged `issue_tags.md`). Once labels are applied, the upstream issues above become the `upstream/tools` blocker.

## Upstream check (2026-10-24, current main of each repo)

No existing upstream issue/PR found for any of the four (searched tools-iuc, bgruening/galaxytools). Not checked: release/published shed versions beyond main.

1. multiqc qualimap (tools-iuc): confirmed on main. `qualimap_plugin.xml` only matches `genome_results` etc. and ends in `#pass`; no `rnaseq_qc_results`. Related merged tools-iuc#2990 "Update multiqc with qualimap" (added BamQC path).
2. salmonquantmerge (bgruening/galaxytools): confirmed `<repeat name="quantfiles">` on master.
3. agat (bgruening/galaxytools): confirmed `<when input="output_format.selector" ...>` in `change_format` on master.
4. stringtie (tools-iuc): confirmed `fraction` value 0.01 vs help "Default: 0.05", `min_bundle_cov` 1 vs "Default: 2", `bundle_fraction` 1 vs "Default: 0.95".

Repo routing: 1 and 4 tools-iuc; 2 and 3 bgruening/galaxytools (issue says "three repos"; only two verified, salmonquantmerge may differ if it also lives elsewhere).

## Next

John decides: close #664 now that all four are filed upstream, or keep it as a tracker (apply staged labels); optionally fix 3 and 4 directly via PRs (small XML edits).
