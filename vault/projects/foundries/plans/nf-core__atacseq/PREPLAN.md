# nf-core/atacseq golden-plan pre-plan

Pre-run research, 2026-10-29. Fixture `workflow-fixtures/pipelines/nf-core__atacseq`, 2.1.2, pin `1a1dbe52` (2023-08-07, DSL2, nf-validation, **no nf-test**). Scenario: `nextflow-to-galaxy/scenarios.md:47` ("medium; `--genome` key resolves a reference bundle"). GOLDEN_PLANS "Known gaps" lists atacseq as a reference-heavy fixture likely to stall.

## What the pipeline does

`workflows/atacseq.nf` (782 lines):

- Inputs and references: samplesheet check (`:139`). `PREPARE_GENOME` handles the FASTA/GTF/GFF/blacklist; it derives gene BED, TSS BED, chrom sizes, autosomes and the aligner index, plus the MACS2 genome size from `khmer unique-kmers` when `macs_gsize` is unset (`subworkflows/local/prepare_genome.nf:231-238`). iGenomes keys resolve fasta/bwa/bowtie2/chromap/star/gtf/gff/gene_bed/tss_bed/blacklist (`main.nf:20-29`).
- Reads: FastQC + Trim Galore (`:151-154`). Aligner is one of bwa (default), bowtie2, chromap, STAR (`:168-236`).
- Merged library (per sample, across runs): Picard MergeSamFiles, MarkDuplicates, bamtools filter (MAPQ/mito/blacklist/dups/orphans), Picard metrics (`:330`), preseq (off by default, `:318`), bedtools genomecov → bigWig, deepTools profile/heatmap (`:368`) and fingerprint (`:407`).
- Peaks: MACS2 broad by default (`narrow_peak=false`), HOMER annotatePeaks, FRiP, local R QC plots (`:444`). Consensus peaks + featureCounts + DESeq2 QC (`:457`). ataqv/mkarv (`:487`).
- Merged replicate (per condition, across replicates): repeats merge → dedup → bigWig → peaks → consensus (`:520-650`).
- IGV session (`:660`), MultiQC (`:700`). Controls via `with_control` (`:385`, `:416`), off in the test.

## Test profile

- `conf/test.config`: `samplesheet/v2.0/samplesheet_test.csv`, `read_length 50`, `mito_name MT`, `fingerprint_bins 100`, caps of 2 CPUs and 6 GB.
- The references are **not** iGenomes: `reference/genome.fa` (12 MB, S. cerevisiae, chromosomes `I`… `MT`) and `reference/genes.gtf` (12 MB). No blacklist and no prebuilt index. `macs_gsize` comes from khmer at runtime.
- Sheet: 4 conditions × 2 rows = 8 rows. Two conditions are PE (SRR1822153/54/57/58, about 5 MB per mate). Two are SE and reuse the same R1 files. T15_PE has two rows both labelled replicate 1, i.e. one replicate with two runs (merged-library path). Downloads total about 70 MB.
- `test_full.config` and `test_controls.config` exist. No `tests/` snapshots, so acceptance must be derived from outputs.

## Resources

- Light: yeast genome, small reads. BWA index, MACS2, deepTools and DESeq2 each fit well under 2 GB.
- Wall time comes from step count (two levels × many QC tools × 8 libraries), not from any single heavy step. Safe to run beside another journey.

## Galaxy wrapper outlook (gxwf tool-search, 2026-10-29)

- Present: FastQC, Trim Galore, bwa mem, bowtie2, chromap, STAR, Picard MergeSamFiles/MarkDuplicates, bamtools filter, samtools, preseq, deepTools (bamCoverage, computeMatrix, plotProfile/Heatmap/Fingerprint), MACS2 callpeak, HOMER annotatePeaks (iuc), featureCounts, DESeq2, gffread, bedtools, MultiQC. bedGraph→bigWig is the stock `wig_to_bigWig` or deepTools bamCoverage.
- Not found: ataqv/mkarv, khmer unique-kmers (only partition/abundance tools), Picard CollectMultipleMetrics (other Picard collectors exist), IGV session. Local scripts (FRiP, MACS2/HOMER QC plots, DESeq2 PCA/clustering QC, consensus merge, `bam_remove_orphans`, `get_autosomes`, `gtf2bed`, `tss_extract`) have no wrappers. Expect several cited drops or text-tool reconstructions.

## Predicted stall points

- Reference chain: `workflow-brief-to-galaxy` doesn't dispatch to it. The test supplies a FASTA and GTF, so the brief can take those as inputs and derive the rest in-workflow. That is the same shape as smrnaseq, which went green. iGenomes keys and the human blacklist/`macs_gsize` table should be scoped out or left as open questions.
- `macs_gsize` from khmer is a runtime scalar fed to MACS2. Galaxy needs a parameter-from-file step or a workflow parameter. Likely decision: a workflow integer input (yeast about 1.2e7).
- Mixed PE + SE samples in one sheet need `list:paired_or_unpaired` (available on 26.1) or two branches. Sample/replicate regrouping for both merge levels needs Apply rules on identifiers. This is the most likely design-loop sink.
- Size: likely 80-120 steps. Expect a long advance-draft loop and many planemo attempts, as smrnaseq needed 9.
- No nf-test snapshots means weaker parity anchors.

## Suggestions

- Ask John: whole pipeline, or narrow v0 to the default test path (bwa, merged-library level, MACS2 broad + HOMER + consensus/featureCounts; merged-replicate level and ataqv/IGV deferred)? Also confirm `macs_gsize` as an explicit input.
- Run last: it is the largest and most likely to stall in design. It benefits from the CalliNGS/bacass lessons (collection regrouping, DB/reference handling).

## Recommended run order (all three)

1. CalliNGS-NF: tiny, in-repo data, no DBs, linear. Fast signal on GATK/STAR wrapper behaviour.
2. bacass: wrappers proven in #563. Its seed can overlap CalliNGS's build; its BUSCO data-table question needs an answer first.
3. atacseq: largest and most likely to stall in design (regrouping, mixed PE/SE, many script drops). Run it alone or beside a seed-only phase.
