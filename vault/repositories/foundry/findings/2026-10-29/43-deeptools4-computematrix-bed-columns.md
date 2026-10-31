# deepTools 4.0 `computeMatrix` panics on BED files that aren't exactly 3, 6 or 12 columns (MACS2 summits BED5, narrowPeak); 3.5 accepted them

- Target: deeptools/deepTools (the Rust region reader `src/filehandler.rs`; the Galaxy wrapper `galaxy/wrapper/computeMatrix.xml` lives in the same repo and is shipped as `bgruening/deeptools_compute_matrix`). Regression in 4.0.0. Foundry tracking needed: yes, label `upstream/deeptools`, plus a tool-pin caveat.
- Seen in: /home/ubuntu/foundry-runs/prose-wb2g-cutandrun-v0-2026-10-31, phase 10 attempt 4, case `variant_cpm_macs2_primary` ("peak matrix", `deeptools_compute_matrix` 4.0.0+galaxy1 @ 1030f37ff2f0, reference-point over MACS2 `summits.bed`), Galaxy release_26.1, 2026-10-31. Decision `repair-r4-empty-peak-rows-and-bed3-summits`. Not in the feedback ledger.
- Existing issues/PRs: none (deepTools issues searched "Invalid BED format", "3, 6 or 12", "summits", "narrowPeak computeMatrix"; open 4.0 regressions listed are #1457 bamCompare and #1490 perf).

## Symptom
computeMatrix failed with "Invalid BED format. BED file doesn't have 3, 6 or 12 fields." on MACS2's 5-column summits BED. The source pipeline runs deepTools 3.5 on the same file. Repair R4 inserted a tp_awk "summits BED3" cut before the peak matrix; attempt 5 passed.

## Root cause
Confirmed in source.
- 4.0.0: `read_bedfile` (`src/filehandler.rs:319`) dispatches on `match fields.len()` with arms `3`, `6`, `12` only (`:340`, tag 4.0.0) and panics otherwise (`:556`; `:577` on master b0a28418). So BED4, BED5, BED7-11 (including narrowPeak/broadPeak, 10/9 columns) and BED13+ all fail.
- 3.5.x: `deeptoolsintervals/parse.py:165-186` treats 4-5 columns as BED3 and 7-11 as BED6 (with a verbose warning), and more than 12 as BED12.
- The 4.0.0 docs (`docs/content/tools/computeMatrix.rst:14`) describe the Rust core as a drop-in and keep `computeMatrix_old` for the transition, but don't mention the narrower column rule. The Galaxy wrapper accepts any `bed` (`extensions: [bed, gtf]` in the tool summary), so Galaxy can't stop a 5-column BED reaching it.

## Evidence
Run-summary attempt 4; open-requirements decision above; `galaxy-tool-summary.peak-matrix.json` (regionsFile extensions). Source refs: deepTools tag 4.0.0 and master; deeptools_intervals main.

## Proposed fix
deepTools: restore 3.5's fallback (BED4-5 → BED3, BED7-11 → BED6, BED13+ → BED12, with a warning) or at least name the file and column count and suggest `cut -f1-3`. Add tests for BED5 and narrowPeak regions.

Foundry: a caveat in the deepTools tool notes (or the tool-pin cache): with 4.0.0+galaxy1, regions must be BED3/6/12; cut MACS2 summits/narrowPeak first. Drop it once fixed.

## Draft issue
**deepTools — Title:** 4.0.0 computeMatrix: regions BED with 4-5 or 7-11 columns (MACS2 summits, narrowPeak) now panics

In 3.5.x, `deeptoolsintervals` accepted BED files of any width ≥ 3 (4-5 columns treated as BED3, 7-11 as BED6). The 4.0.0 Rust reader (`src/filehandler.rs`, `read_bedfile`) matches only 3, 6 or 12 fields and panics with "Invalid BED format. BED file doesn't have 3, 6 or 12 fields." This breaks common inputs: MACS2 `*_summits.bed` (5 columns) and narrowPeak (10). Reproduce: `computeMatrix reference-point -S x.bw -R summits.bed -o m.gz` with a 5-column BED. Expected: as in 3.5 (use the first 3 / 6 columns, warn). Seen through the Galaxy wrapper 4.0.0+galaxy1 in an nf-core/cutandrun port whose source pipeline uses 3.5 on the same file.

**Foundry tracking comment (label `upstream/deeptools`):**
> deepTools 4.0.0 computeMatrix only accepts BED3/6/12 regions (upstream: <link>); MACS2 summits (BED5) and narrowPeak fail. Workflows on `deeptools_compute_matrix` 4.0.0+galaxy1 need a `cut -f1-3` (or 1-6) step before it. Seen in the nf-core/cutandrun wb2g run, 2026-10-31.
