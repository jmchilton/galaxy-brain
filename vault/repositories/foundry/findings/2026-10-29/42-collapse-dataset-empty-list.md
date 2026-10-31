# nml `collapse_dataset` fails on an empty list (`( )` is a bash syntax error) and writes `<id>\t` for an empty element; the Foundry pattern page mentions neither

- Target: phac-nml/galaxy_tools (`tools/collapse_collection/merge.xml`, Tool Shed owner `nml`) for the empty-list crash. The empty-element stub row is intended wrapper behaviour, so only Foundry documents it. galaxyproject/foundry for `content/patterns/tabular-concatenate-collection-to-table.md` and empty-list test obligations. Foundry tracking needed: yes, label `upstream/phac-nml` (or `upstream/tool-wrapper`); the same issue carries the pattern-page half.
- Seen in: /home/ubuntu/foundry-runs/prose-wb2g-cutandrun-v0-2026-10-31, phase 10 attempt 2 (42 min; "reproducibility table" over a single-replicate group, 281 ok / 42 skipped / 1 error) and attempt 4 (test_full_small: SEACR called 0 peaks for `h3k27me3_R2`, then sortBed/intersect failed on the stub row), collapse_dataset 5.1.0, Galaxy release_26.1, 2026-10-31. open-requirements `empty-list-reductions-verify`, decisions `repair-r2-empty-reduction-gates`, `repair-r4-empty-peak-rows-and-bed3-summits`. Not in the feedback ledger.
- Existing issues/PRs: none (phac-nml/galaxy_tools issues/PRs searched "collapse"; last wrapper change 25e7ea02, 2020). Foundry related: #661 (fan-in after gated branches), #712 (non-empty results recipe), finding [21](21-when-gate-expressions.md) (gated output into ungated consumer).

## Symptom
1. Empty list: a group with one replicate yields an empty reproducibility list, and the step failed with a bash syntax error near `)`. Galaxy accepts an empty list for the required `multiple="true"` input (driver probe 3 showed the same for MultiQC), so the job runs and dies.
2. Empty element: with `add_name: true`, `place_name: same_multiple`, `one_header: false` (all ten collapse steps in this workflow), a 0-peak BED becomes the row `h3k27me3_R2\t`. sortBed (fewer than 3 columns) and bedtools intersect then failed. Repair R4 added `NF >= 4` guards downstream; R2 gated three reductions on non-empty flags.

## Root cause
Confirmed in `merge.xml` (phac-nml/galaxy_tools main, = 5.1.0):
1. The command is `( #if one_header ... #end if #for $f in $input_list# ... #end for# ) > $output` (`:9-49`). With `one_header` false and no elements, Cheetah renders `( )`, and `bash -c '( )'` exits 2 with "syntax error near unexpected token `)'". With `one_header` true it would fail earlier on `$input_list[0]` (`:12, :14`).
2. The stub row is deliberate: `same_multiple` without a header runs `awk '{print "<id>\t"$0} END { if (NR == 0 && NF == 0) { print "<id>\t" } }'` (`:30`), added in 9023eff0 "bug fix where empty files would not be included correctly (#175)". `same_once` prints an empty line for the same reason (`:24`).
3. Foundry's pattern page (`tabular-concatenate-collection-to-table.md:45-88`) documents the modes and the header behaviour but says nothing about empty lists or empty elements, and no test-plan guidance asks for a single-replicate or zero-result case.

## Evidence
`run-summary.md` attempts 2 and 4; `driver-notes.md` R2/R4; open-requirements entries above; step states in `galaxy-workflow.gxwf.yml` (10 collapse steps, all `same_multiple`, `one_header: false`).

## Proposed fix
1. Wrapper: make the group non-empty, e.g. start the subshell with `true;` (or use `{ ...; }`), so an empty list gives an empty output; guard `$input_list[0]` when `one_header` is set. Add an empty-list test.
2. Foundry pattern page: an "Empty inputs" note: an empty list fails 5.1.0 (gate the step, or filter-then-gate, until fixed); an empty element yields `<id>\t` under `same_multiple` (a bare line under `same_once`), so downstream BED/interval tools need a column-count filter or `__FILTER_EMPTY_DATASETS__` before the collapse.
3. Test-plan / data-flow guidance: when a reduction can see an empty list (single replicate, all-skipped branch) or an empty element (zero peaks), plan a case that exercises it.

## Draft issue
**phac-nml/galaxy_tools — Title:** collapse_dataset fails on an empty input list: command renders `( )`, a bash syntax error

`tools/collapse_collection/merge.xml` wraps the per-file commands in `( ... ) > $output`. When `input_list` is empty (Galaxy passes an empty list to a required `multiple="true"` input, e.g. an empty collection in a workflow) and `one_header` is false, the subshell renders as `( )` and bash fails with "syntax error near unexpected token `)'". With `one_header` true, `$input_list[0]` fails instead. Expected: an empty output. Fix: put `true;` at the start of the subshell (or guard the whole command) and add an empty-list test. Seen with 5.1.0 on Galaxy release_26.1.

**Foundry tracking comment:**
> nml collapse_dataset 5.1.0 fails on an empty list (upstream: <link>) and, by design, writes `<id>\t` for an empty element under `same_multiple`. tabular-concatenate-collection-to-table should say both and how to guard them; test plans should include a case that empties a reduction's input. Seen in the nf-core/cutandrun wb2g run (attempts 2 and 4), 2026-10-31.
