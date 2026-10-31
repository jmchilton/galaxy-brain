# nf-core/viralrecon golden-plan pre-plan

Pre-run notes, 2026-10-31. Fixture `workflow-fixtures/pipelines/nf-core__viralrecon`, 3.0.0, pin `395079f1` (local fixtures commit `40fc911d` on worktree `pipeline-run-chipseq`, unpushed). Objective: whole pipeline. Unverified hints.

## Shape

- `workflows/viralrecon.nf` (1268 lines, 46 includes). `--platform` (required) selects Illumina or Nanopore; Illumina has `--protocol` amplicon or metagenomic (SISPA); Nanopore runs the ARTIC field-bioinformatics path. Illumina amplicon: fastp, kraken2 host-read screen, bowtie2, primer trimming (ivar trim), variant calling with ivar (default) or bcftools, consensus, Pangolin, Nextclade, Freyja, QUAST, de novo assembly (`assemblers` spades/unicycler/minia), MultiQC.
- The genome key `MN908947.3` is not in the repository: `nextflow.config:262` includes `pipeline/viralrecon.config` from remote nf-core/configs, and `main.nf:160-166` reads `params.genomes`. Primer BED/FASTA for `artic` v1 come from that remote catalogue too.

## Test profiles

- `conf/test.config`: Illumina amplicon, ARTIC v1 primers, ivar, kraken2 `kraken2_hs22.tar.gz` from test-datasets, `assemblers = 'spades,unicycler'`, `freyja_repeats 10`. Sheet: SAMPLE1_PE, SAMPLE2_PE, and SAMPLE3_SE made of two SE runs (run merging).
- Also `test_sispa`, `test_nanopore` and `test_full*`. **nf-test snapshots exist** (`tests/default.nf.test.snap`, `test_nanopore`, `test_params_*`), the first fixture in this cluster with them.

## Expected design problems

- Resolving the remote genome catalogue (FASTA, GFF, primer BED for ARTIC v1) into explicit inputs.
- kraken2 database tarball vs a Galaxy data table (same class as the bacass BUSCO decision).
- Nextclade/Pangolin/Freyja need versioned datasets or barcodes at runtime; likely network or data-table needs.
- Nanopore ARTIC (medaka/nanopolish) is a whole second branch.
- IWC has close counterparts: `sars-cov-2-variant-calling/sars-cov-2-pe-illumina-artic-ivar-analysis`, `-pe-illumina-artic-variant-calling`, `-ont-artic-variant-calling`, `-consensus-from-variation`, `-variation-reporting`.
