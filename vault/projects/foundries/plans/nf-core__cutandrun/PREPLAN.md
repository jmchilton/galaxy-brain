# nf-core/cutandrun golden-plan pre-plan

Pre-run notes, 2026-10-31. Fixture `workflow-fixtures/pipelines/nf-core__cutandrun`, 3.2.2, pin `6e1125d4` (local fixtures commit `40fc911d` on worktree `pipeline-run-chipseq`, unpushed). Objective: whole pipeline. Unverified hints; the chipseq pre-plan got three source facts wrong.

## Shape

- `workflows/cutandrun.nf` (972 lines). Reads QC and trimming, bowtie2 to the target genome **and** to an E. coli spike-in genome, filtering (MAPQ, linear duplicates, mitochondrial reads in the test), spike-in normalisation (`normalisation_mode = "Spikein"` default) into scaled bedGraph/bigWig, peak calling with SEACR by default (MACS2 alternative, `macs_gsize` a fixed number, not khmer), IgG control (`use_control = true`), consensus peaks, FRiP and fragment-length QC, deepTools heatmaps, IGV, MultiQC.

## Test profile

- `conf/test.config`: sheet `samplesheet_2_0/test-GSE145187-small.csv` with 2 PE rows (h3k27me3 rep1 with control `igg_ctrl`, and igg_ctrl rep1), 10k-read subsets.
- Every reference is an explicit URL: hg38 chr20 FASTA (19 MB), **prebuilt bowtie2 index tarball** (83 MB), GTF, gene BED, the bundled hg38 blacklist, E. coli FASTA and its bowtie2 tarball (9 MB). No `--genome` key.
- Tests are pytest-workflow YAMLs under `tests/` (genome options, samplesheet check, filtering, scaling, peak callers, consensus), not nf-test snapshots.

## Expected design problems

- Prebuilt index tarballs vs building indexes in Galaxy (bowtie2 on chr20 is feasible).
- Spike-in scale factor is a per-sample scalar computed from a read count: the same parameter-from-file shape as atacseq/chipseq `macs_gsize`.
- IgG control pairing by `control` column: the chipseq pairing recipe (finding 35) should carry over.
- IWC `epigenetics/cutandrun` is the close counterpart for the IWC compare phase.
