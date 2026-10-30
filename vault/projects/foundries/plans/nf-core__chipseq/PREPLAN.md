# nf-core/chipseq golden-plan pre-plan

Pre-run notes, 2026-10-30. Fixture `workflow-fixtures/pipelines/nf-core__chipseq`, 2.1.0, pin `76e2382b` (local fixtures commit `40fc911d` on worktree `pipeline-run-chipseq`, unpushed). No `tests/` snapshots. Objective: whole pipeline (as for atacseq).

## Shape

- `workflows/chipseq.nf` (590 lines) is the atacseq sibling at one level: samplesheet check, FastQC/Trim Galore, aligner bwa (default)/bowtie2/chromap/STAR, Picard merge + MarkDuplicates, bamtools filter, Picard CollectMultipleMetrics, preseq (skipped in test), phantompeakqualtools (SPP), bedGraph→bigWig, deepTools computeMatrix/plotProfile/plotHeatmap/plotFingerprint, khmer `macs_gsize` when unset, MACS3 peaks, HOMER annotation, consensus peaks + featureCounts + DESeq2 QC, IGV, MultiQC.
- No merged-replicate level, but **controls are always on**: each IP row names an `antibody`, `control` and `control_replicate`. Pairing IP with its input is the new design problem relative to atacseq.

## Test profile

- `conf/test.config`: `samplesheet/v2.1/samplesheet_test.csv`, the atacseq yeast `genome.fa` + `genes.gtf`, `read_length 50`, `fingerprint_bins 100`, `skip_preseq true`.
- Sheet: 6 PE rows. SPT5_T0 and SPT5_T15 (2 replicates each, the atacseq SRR18221xx reads), and SPT5_INPUT (2 replicates, ChIP input ss100k reads) as their control.

## Expected carry-over from atacseq v1

`macs_gsize` via k-mer count (tp_awk tab-FS trap, finding 26), sample-sheet regrouping (finding 28), test-data-refs for absent optionals (25), when-gate forms (21, 22). The IWC `epigenetics/chipseq-pe` / `chipseq-sr` workflows give the IWC compare phase a real reference.
