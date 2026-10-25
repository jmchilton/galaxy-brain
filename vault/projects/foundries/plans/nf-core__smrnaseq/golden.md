# nf-core/smrnaseq 2.4.1 small-RNA-seq miRNA quantification

## Workflow

### Objective

Reproduce, as a Galaxy workflow, the scientific behavior of the whole nf-core/smrnaseq pipeline (tag 2.4.1) as run with default parameters: read QC and adapter trimming of small-RNA sequencing reads, miRTrace QC, quantification of known miRNAs against a miRNA reference (mature and hairpin sequences, with isomiR annotation and count tables), plus genome alignment statistics and novel-miRNA discovery with miRDeep2 when a genome FASTA is supplied, and an aggregated QC report. Objective wording is from the caller ("convert the whole nf-core/smrnaseq pipeline to an equivalent Galaxy workflow"); the process list is source evidence.

### Sources

- Source pipeline: nf-core/smrnaseq, https://github.com/nf-core/smrnaseq, tag `2.4.1`, commit `cb0af579b24cb8d5a3accd87b2f14ea93fe04832` (`nextflow.config:355` manifest version `2.4.1`; `nextflowVersion '!>=25.04.2'`). Read from a local fixture clone; the summary records the commit in `source.version` but not the tag.
- Caller request: `caller-request.md` (objective, selected scope, test-evidence choice, no expert Galaxy requirements, terminal artifact).
- Source summary: `summary-nextflow.json` (phase 1 output; static resolver plus an LLM correction pass; see its `warnings[]`).
- Source evidence notes: `source-evidence-notes.md` (coordinator-verified facts read directly from the fixture: effective defaults, what a default run executes, test-profile overrides, `conf/modules.config` arguments, reference inputs). Where these disagree with the summary, this brief states the source-evidence value.
- Test evidence available: `tests/default.nf.test` ("-profile test", profiles `test` + `ci`) with snapshot `tests/default.nf.test.snap`. Other nf-test files (`test_mirgenedb`, `test_contamination_tech_reps`, `test_umi`, `test_nextflex`, `test_skipfastp`) cover branches that are off by default.

### Scope

#### Included

Per the caller's selection ("the whole pipeline as the default run — all processes a run with default params executes, no skip flags set") and the source defaults in `nextflow.config`:

- Input handling: CSV samplesheet (`sample`, `fastq_1`, optional `fastq_2`; gzipped FASTQ); concatenation of multiple FASTQ files per sample.
- Read QC and trimming: FastQC on raw and trimmed reads; fastp adapter trimming (`trim_fastq = true`) with the default 3' adapter and the known-miRNA-adapter FASTA (`assets/known_adapters.fa`); samples with fewer than `min_trimmed_reads = 10` reads after trimming are dropped.
- miRTrace QC (needs a miRTrace species code; see Open questions).
- miRNA quantification on the miRBase route (`mirgenedb = false`): species-filter and format mature/hairpin references, bowtie (v1) mapping to mature then unmapped reads to hairpin, samtools stats, edgeR-based QC, seqcluster read collapsing, mapping of collapsed reads to hairpin, mirtop GFF / counts / export / stats, and merged count tables.
- Genome quantification (genome FASTA cleanup, bowtie index build or use of a supplied index, genome alignment stats) and miRDeep2 novel-miRNA discovery, both conditional on a genome FASTA being supplied (see Open questions for why these are included).
- MultiQC aggregate report.

#### Excluded

Off under the source defaults; the caller excluded nothing explicitly, so these exclusions follow from the "default run" selection, not from an expert decision:

- MirGeneDB reference route (`mirgenedb = false`).
- Contaminant filtering against rRNA/tRNA/cDNA/ncRNA/piRNA/other databases (`filter_contamination = false`).
- UMI extraction/deduplication (`with_umi = false`) and the fastp length-filter path tied to it.
- Front clipping and 3' clipping (`clip_r1`, `three_prime_clip_r1` null; FASTP3 not run).
- iGenomes lookup (`genome = null`).
- Publishing of intermediates (`save_intermediates`, `save_merged`, `save_reference` false).

### Inputs and outputs

Inputs (scientific roles; source-supported formats):

- Small-RNA sequencing reads per sample, listed in a CSV samplesheet; gzipped FASTQ.
- miRNA reference sequences: miRBase mature and hairpin FASTA. Source default is copies in nf-core/test-datasets (`smrnaseq/miRBase/{mature,hairpin}.fa`), not a versioned miRBase release.
- miRTrace / miRBase species code (e.g. `hsa`). No default; required on the miRBase route.
- miRNA genome annotation (miRBase GFF3) for isomiR annotation. When not supplied it is derived from the species code: `hsa` -> nf-core test-datasets `smrnaseq/reference/hsa.gff3`; any other species -> `https://mirbase.org/download/CURRENT/genomes/<species>.gff3` (unpinned).
- Optional genome FASTA, and optionally a prebuilt bowtie (v1) index (directory or `.tar.gz`); enables genome quantification and miRDeep2.
- Adapter evidence: 3' adapter sequence (default `AGATCGGAAGAGCACACGTCTGAACTCCAGTCA`, TruSeq) and a known-miRNA-adapter FASTA shipped with the pipeline.

Outputs (what the source publishes by default):

- fastp reports per sample (JSON/HTML, logs).
- miRTrace QC results per sample.
- edgeR QC outputs for mature and hairpin.
- mirtop outputs: isomiR GFF, count tables (with extra annotation columns), pivoted per-sample tables and a merged miRNA count table.
- Genome alignment statistics (samtools stats/flagstat/idxstats) when a genome FASTA is supplied.
- miRDeep2 novel/known miRNA predictions when a genome FASTA is supplied and miRDeep2 is not skipped.
- MultiQC report.

### Requirements and preferences

Source behavior that an equivalent workflow should preserve (from `conf/modules.config`, via the evidence notes; the summary carries these only as a warning). These are source facts, not Galaxy parameter choices:

- fastp: minimum read length 17, maximum length 100, explicit 3' adapter sequence (which disables adapter auto-detection), plus the known-adapter FASTA.
- FastQC: run quietly; outputs not published unless intermediates are saved.
- bowtie (all miRNA and genome mappings): `-t -k 50 --best --strata -e 99999 --chunkmbs 2048` (report up to 50 best-stratum alignments, effectively no mismatch-quality ceiling).
- seqcluster collapse: `-m 1 --min_size 15`.
- mirtop counts: `--add-extra`; mirtop GFF uses `--database MirGeneDB` only on the (excluded) MirGeneDB route.
- Genome FASTA cleanup: replace non-ATGC bases with N and strip header text after the first space.
- samtools index with CSI (`-c`).
- miRDeep2 mapper `-c -j -m -v`; header cleanup via seqkit replace `-p "\s+|\." -w 0`; the source tolerates miRDeep2 exit status 255.
- Strength: source behavior, not expert-stated. The caller asked for an "equivalent" workflow, which this brief reads as preserving these behaviors.

### Acceptance criteria

- On the `test` profile inputs (samplesheet v2.0, genome FASTA, bowtie index, species `hsa`, Illumina small-RNA adapter `TGGAATTCTCGGGTGCCAAGG`, default test-datasets mature/hairpin), the workflow produces the categories of output the source snapshot covers: fastp reports, miRTrace per sample, edgeR QC, mirtop outputs, genome-quantification BAM stats, MultiQC.
- Merged miRNA count tables are scientifically comparable to the source's for the test samples (exact tolerance to be settled during test development).
- Samples below the minimum trimmed-read threshold are excluded from downstream quantification, as in the source.
- miRDeep2 output is produced when a genome FASTA is supplied; how it is accepted is an open question because the default test skips it.

### Open questions

- Does "whole pipeline as the default run" include the genome-quantification and miRDeep2 branches, which the source runs only when a genome FASTA is supplied (`fasta` defaults to null)?
  - Proposed: yes. Include both as branches that run when a genome FASTA (and optionally a bowtie index) is provided.
  - Evidence: the caller asks for "the whole pipeline" with "no skip flags set" (`skip_mirdeep = false` by default). Source behavior conflicts: with `fasta = null` neither branch runs (`prepare_genome:83-85`, `smrnaseq.nf:216`). Per the brief rules, the proposal follows the expert's wording and cites the conflict. The test profile supplies a genome FASTA and its snapshot covers `genome_quant/bam`.
  - Confidence: medium
- Strict defaults cannot run: on the miRBase route the source exits when no species code is set (`prepare_genome/main.nf:124-125`). How is the species code treated?
  - Proposed: a required, user-supplied input with no default; use `hsa` for test evidence only. No production species is chosen here.
  - Evidence: `mirtrace_species` is null by default and only set through `--genome` iGenomes attributes; it also filters mature/hairpin references (`mirna_quant/main.nf:39`), gates miRTrace QC (`smrnaseq.nf:173`) and selects the default miRNA GFF. `conf/test.config` sets `hsa`.
  - Confidence: high
- miRBase or MirGeneDB reference route?
  - Proposed: miRBase only; MirGeneDB excluded.
  - Evidence: `mirgenedb = false` in `nextflow.config`; MirGeneDB is exercised only by `tests/test_mirgenedb.nf.test`.
  - Confidence: high
- Which miRBase release should the mature/hairpin FASTA and the miRNA GFF come from?
  - Proposed: treat them as user-supplied reference inputs; use the nf-core test-datasets copies (and `hsa.gff3`) for test evidence, and do not depend on the unpinned `mirbase.org/download/CURRENT` GFF.
  - Evidence: source defaults are test-datasets copies, not a versioned miRBase release; the non-`hsa` GFF default is an unpinned "CURRENT" URL that can change between runs.
  - Confidence: low
  - Missing: the miRBase release (or MirGeneDB version) the expert wants for production runs.
- How should miRDeep2 behavior be accepted, given no default test exercises it?
  - Proposed: include miRDeep2 and require it to complete on the test-profile genome inputs with miRDeep2 enabled; treat its output comparison against the source as unverified until source output for that configuration is available.
  - Evidence: `conf/test.config` sets `skip_mirdeep = true`; the default snapshot has no miRDeep2 outputs; no other listed nf-test enables it on the default route. The source tolerates miRDeep2 exit 255.
  - Confidence: low
  - Missing: any source-run miRDeep2 output for the test data, and whether the expert values miRDeep2 enough to keep it if it cannot be validated.
- Which 3' adapter is the workflow's default: the source default (TruSeq `AGATCGGAAGAGCACACGTCTGAACTCCAGTCA`) or the test profile's Illumina small-RNA adapter (`TGGAATTCTCGGGTGCCAAGG`)?
  - Proposed: keep the adapter a run-level setting with the source default; use the test-profile adapter for test evidence.
  - Evidence: `nextflow.config` default vs `conf/protocol_illumina.config` included by `conf/test.config`. The test evidence therefore runs under a different adapter than the default run.
  - Confidence: medium
- Confirm that MirGeneDB, contaminant filtering, UMI handling and read clipping stay out of scope.
  - Proposed: yes, excluded.
  - Evidence: all are off under source defaults; the caller selected the default run and excluded nothing explicitly.
  - Confidence: medium
- Should single-sample multi-FASTQ concatenation and the optional `fastq_2` column be supported?
  - Proposed: support per-sample concatenation of multiple FASTQ rows; treat reads as single-end small-RNA reads and leave `fastq_2` handling to design.
  - Evidence: the input schema allows `fastq_2`; the default run concatenates multi-FASTQ samples (CAT_FASTQ). The evidence notes do not describe how `fastq_2` is used downstream.
  - Confidence: low
  - Missing: how the source uses `fastq_2` for small-RNA reads, and whether the expert's data ever has it.

### Decisions

- Scope is the whole pipeline as the default run, with no skip flags set (caller, `caller-request.md`).
- Test evidence comes from the `test` profile (caller).
- No expert-provided Galaxy requirements (caller).
- Terminal artifact is this brief for expert review; no Galaxy design in this run (caller).

### Related artifacts

- `summary-nextflow.json`: process topology, source containers, parameters, reference assets, test candidates (selected: `tests/default.nf.test::-profile test`).
- `source-evidence-notes.md`: effective defaults, default-run process list, test-profile overrides, `conf/modules.config` arguments and publish paths.
- `caller-request.md`: the caller's objective and selection.
- Known summary discrepancies (source evidence wins): `reference_assets[]` has null URLs for `mature`/`hairpin` although their params carry the test-datasets defaults; `mirtrace_species` is not marked as required on the miRBase route; `conf/modules.config` arguments appear only in `warnings[]`; `publish_dir` is set for 11 of 37 processes.

### Blockers

## Agent Environment

Observed from probes taken 2026-10-25T22:07:37Z on the agent host (`environment-probes.txt`). The bundle states no required tool versions; requirements below are what downstream stages are expected to use.

### Tooling

- `gxwf`: observed 1.0.0 on PATH. Required version: not specified.
- `planemo`: observed 0.75.44 on PATH; 0.75.47 available from the `uvx` cache. Required version: not specified.
- `foundry`: not on PATH; run through a local shim of `@galaxy-foundry/gxwf-foundry` 0.3.0 (package version; the CLI has no `--version` flag and the probe printed 0.0.0). Schema precheck for this brief passed.
- `galaxy-tool-cache`, `node` v25.6.1, `uvx` observed on PATH.
- Absent: `nextflow`, `nf-test`, `conda`, `mamba`; `/usr/bin/java` is a stub with no Java runtime. The source pipeline cannot be re-run here, so the committed nf-test snapshot is the only source-output evidence.
- Unknown: availability of a Galaxy server or Tool Shed access for later stages.

### Constraints

- No installs, container pulls or data downloads during brief production (caller).
- Host: Darwin arm64, 14 CPUs, 48 GiB RAM.
- Disk: ~19 GiB free on the data volume, 96% used; large reference or container pulls may not fit.
- Network access for test-datasets and miRBase URLs: not probed (unknown).

### Containerization

- Preference: none stated by the caller.
- Docker: server 29.9.2, linux/arm64; `hello-world` ran with `--pull=never`; engine VM reports 14 CPUs and ~7.7 GiB memory. This shows the engine starts a cached container, not that bioinformatics tool images run.
- Unknown: whether amd64-only tool images run under emulation, and whether tool containers can be pulled within disk limits.
- Singularity, Apptainer and Podman: absent.

### Blockers
