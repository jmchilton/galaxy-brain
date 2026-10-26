# nf-core/smrnaseq 2.4.1 small-RNA-seq miRNA quantification

## Workflow

### Objective

Reproduce, as a Galaxy workflow, the scientific behavior of the whole nf-core/smrnaseq pipeline (tag 2.4.1) as run with default parameters: read QC and adapter trimming of small-RNA sequencing reads, miRTrace QC, quantification of known miRNAs against a miRNA reference (mature and hairpin sequences, with isomiR annotation and count tables), plus genome alignment statistics and novel-miRNA discovery with miRDeep2 when a genome FASTA is supplied, and an aggregated QC report. Objective wording is from the caller ("convert the whole nf-core/smrnaseq pipeline to an equivalent Galaxy workflow"); the process list is source evidence.

### Sources

- Source pipeline: nf-core/smrnaseq, https://github.com/nf-core/smrnaseq, tag `2.4.1`, commit `cb0af579b24cb8d5a3accd87b2f14ea93fe04832` (`nextflow.config:355` manifest version `2.4.1`; `nextflowVersion '!>=25.04.2'`). Read from a local fixture clone; the summary records the commit in `source.version` but not the tag.
- Caller request: `caller-request.md` (objective, selected scope, test-evidence choice, no expert Galaxy requirements, terminal artifact).
- Source summary: `summary-nextflow.json` (phase 1 output; static resolver plus an LLM correction pass; see its `warnings[]`).
- Source evidence notes: `source-evidence-notes.md` (coordinator-verified facts read directly from the fixture: effective defaults, what a default run executes, test-profile overrides, `conf/modules.config` arguments, reference inputs). Where these disagree with the summary, this brief states the source-evidence value.
- Source files read directly at the pinned commit for v1: `nextflow.config`, `conf/modules.config`, `conf/test.config`, `conf/test_mirgenedb.config`, `conf/protocol_illumina.config`, `workflows/smrnaseq.nf`, `subworkflows/local/{prepare_genome,mirna_quant,utils_nfcore_smrnaseq_pipeline}/main.nf`, `subworkflows/nf-core/fastq_fastqc_umitools_fastp/main.nf`, `modules/local/parse_fasta_mirna/main.nf`, `bin/edgeR_miRBase.r`, `tests/default.nf.test.snap`.
- Test evidence available: `tests/default.nf.test` ("-profile test", profiles `test` + `ci`) with snapshot `tests/default.nf.test.snap`. Other nf-test files (`test_mirgenedb`, `test_contamination_tech_reps`, `test_umi`, `test_nextflex`, `test_skipfastp`) cover branches that are off by default.

### Scope

#### Included

Per the caller's selection ("the whole pipeline as the default run — all processes a run with default params executes, no skip flags set") and the source defaults in `nextflow.config`:

- Input handling: CSV samplesheet (`sample`, `fastq_1`, optional `fastq_2`; gzipped FASTQ); concatenation of multiple FASTQ files per sample.
- Read QC and trimming: FastQC on raw and trimmed reads; fastp adapter trimming (`trim_fastq = true`) with the default 3' adapter and the known-miRNA-adapter FASTA (`assets/known_adapters.fa`); samples with fewer than `min_trimmed_reads = 10` reads after trimming are dropped.
- miRTrace QC, per sample (needs a miRTrace species code; see Decisions).
- miRNA quantification on the miRBase route (`mirgenedb = false`): species-filter and format mature/hairpin references, bowtie (v1) mapping to mature then unmapped reads to hairpin, samtools stats, edgeR-based QC, seqcluster read collapsing, mapping of collapsed reads to hairpin, mirtop GFF / counts / export / stats, and merged count tables. See the open questions on mirtop and edgeR QC.
- Genome quantification (genome FASTA cleanup, bowtie index build from that FASTA, genome alignment stats), conditional on a genome FASTA being supplied (see Decisions).
- miRDeep2 novel-miRNA discovery, conditional on a genome FASTA being supplied and `skip_mirdeep = false` (see Open questions).
- MultiQC aggregate report.

#### Excluded

Off under the source defaults; the caller excluded nothing explicitly, so these exclusions follow from the "default run" selection, not from an expert decision:

- MirGeneDB reference route (`mirgenedb = false`).
- Contaminant filtering against rRNA/tRNA/cDNA/ncRNA/piRNA/other databases (`filter_contamination = false`).
- UMI extraction/deduplication (`with_umi = false`) and the fastp length-filter path tied to it.
- Front clipping and 3' clipping (`clip_r1`, `three_prime_clip_r1` null; FASTP3 not run).
- iGenomes lookup (`genome = null`).
- Publishing of intermediates (`save_intermediates`, `save_merged`, `save_reference` false).
- A prebuilt bowtie (v1) genome index input (`bowtie_index = null`, `nextflow.config:27`). The source needs the genome FASTA either way and cleans it even when an index is given, because cleaning does not change the index (`subworkflows/local/prepare_genome/main.nf:83-87`); the index only skips the build (`:94-97`). The `test` profile supplies one (`conf/test.config`); build v0 built the index from the FASTA instead and its test stayed green.

### Inputs and outputs

Inputs (scientific roles; source-supported formats):

- Small-RNA sequencing reads per sample, listed in a CSV samplesheet; gzipped FASTQ. The source is single-end only: when `fastq_2` is present it warns and removes it (`subworkflows/local/utils_nfcore_smrnaseq_pipeline/main.nf:242-247`). Samples with several rows are concatenated (CAT_FASTQ, `workflows/smrnaseq.nf:85-88`).
- miRNA reference sequences: miRBase mature and hairpin FASTA. Source default is copies in nf-core/test-datasets (`smrnaseq/miRBase/{mature,hairpin}.fa`), not a versioned miRBase release.
- miRTrace / miRBase species code (e.g. `hsa`). No default; required on the miRBase route.
- miRNA genome annotation (miRBase GFF3) for isomiR annotation. When not supplied it is derived from the species code: `hsa` -> nf-core test-datasets `smrnaseq/reference/hsa.gff3`; any other species -> `https://mirbase.org/download/CURRENT/genomes/<species>.gff3` (unpinned). Its only consumer is mirtop (`subworkflows/local/mirna_quant/main.nf:99-101`).
- Optional genome FASTA; enables genome quantification and miRDeep2.
- Adapter evidence: 3' adapter sequence (default `AGATCGGAAGAGCACACGTCTGAACTCCAGTCA`, TruSeq) and a known-miRNA-adapter FASTA shipped with the pipeline (`nextflow.config:48`, consumed at `workflows/smrnaseq.nf:37`).

Source data relationships:

- Mature mapping takes all passing trimmed reads; hairpin mapping takes the mature-unmapped reads; genome quantification takes the hairpin-unmapped reads (`MIRNA_QUANT.out.unmapped`, `workflows/smrnaseq.nf:217-221`).
- seqcluster collapses the passing trimmed reads, the collapsed reads map to hairpin, and mirtop annotates those alignments against the miRNA GFF3; per-sample mirtop counts are pivoted and merged into one table (`subworkflows/local/mirna_quant/main.nf:89-123`).
- miRDeep2 takes all passing trimmed reads (not the unmapped ones), the genome FASTA and the cleaned mature/hairpin references (`workflows/smrnaseq.nf:225-240`).
- miRTrace runs once per sample, each with its own config line (sample, adapter, phred offset) (`workflows/smrnaseq.nf:156-176`).
- MultiQC receives raw and trimmed FastQC zips, fastp JSON, genome samtools stats, mature and hairpin samtools stats, mirtop logs, and miRTrace html/json/tsv, plus nf-core versions and parameter summary (`workflows/smrnaseq.nf:312-328`).

Outputs (what the source publishes by default):

- fastp reports per sample (JSON/HTML, logs).
- miRTrace QC results per sample.
- edgeR QC outputs for mature and hairpin: counts, unmapped read counts, log TPM, TMM-normalized CPM, CPM heatmap, MDS plot, coordinates and distance matrix, log2CPM sample-distance heatmap and dendrogram (`tests/default.nf.test.snap`, `mirna_quant/edger_qc/*`).
- mirtop outputs: isomiR GFF, count tables (with extra annotation columns), pivoted per-sample tables and a merged miRNA count table.
- Genome alignment statistics (samtools stats/flagstat/idxstats) when a genome FASTA is supplied.
- miRDeep2 novel/known miRNA predictions when a genome FASTA is supplied and miRDeep2 is not skipped.
- MultiQC report.

### Requirements and preferences

Source behavior that an equivalent workflow should preserve (from `conf/modules.config`, via the evidence notes; the summary carries these only as a warning). These are source facts, not Galaxy parameter choices:

- fastp: minimum read length 17, maximum length 100, explicit 3' adapter sequence (which disables adapter auto-detection, `nextflow.config:45`), plus the known-adapter FASTA.
- Minimum-read filter: a sample passes when fastp's `after_filtering.total_reads` is at least `min_trimmed_reads` (`subworkflows/nf-core/fastq_fastqc_umitools_fastp/main.nf:20,122-125`).
- FastQC: run quietly; outputs not published unless intermediates are saved. Raw and trimmed runs carry the prefixes `<sample>.raw` and `<sample>.trim`, which the source says are "required for multiqc to pickup the files separately" (`conf/modules.config:114-126`).
- miRNA reference preparation (PARSE_FASTA_MIRNA, `modules/local/parse_fasta_mirna/main.nf:28-34`): strip HTML remnants (`&gt;`, `<br>`, `<p>`), cut headers at the first whitespace, keep IDs matching `.*<species>-.*`, convert RNA to DNA. The non-AUGC masking `sed` on line 30 begins with `#`, so sed reads the whole script as a comment and no masking happens; reproduce the actual behavior (no masking).
- bowtie (all miRNA and genome mappings): `-t -k 50 --best --strata -e 99999 --chunkmbs 2048` (report up to 50 best-stratum alignments, effectively no mismatch-quality ceiling).
- seqcluster collapse: `-m 1 --min_size 15`.
- mirtop counts: `--add-extra`; mirtop GFF uses `--database MirGeneDB` only on the (excluded) MirGeneDB route.
- edgeR QC (`bin/edgeR_miRBase.r:28-29`) reads columns 3 (mapped) and 4 (unmapped) of the mature and hairpin samtools idxstats.
- Genome FASTA cleanup: replace non-ATGC bases with N and strip header text after the first space (`conf/modules.config:179-180`).
- samtools index with CSI (`-c`).
- miRDeep2 mapper `-c -j -m -v`; header cleanup via seqkit replace `-p "\s+|\." -w 0`. The source ignores miRDeep2 exit status 255 only (`conf/modules.config:560-562`); any other non-zero exit fails the run.
- Strength: source behavior, not expert-stated. The caller asked for an "equivalent" workflow, which this brief reads as preserving these behaviors.

Tool evidence from build v0 (2026-10-25; not design choices):

- Tool Shed wrappers found for fastp (iuc 1.4.0+galaxy0), FastQC, bowtie v1 (devteam/bowtie_wrappers 1.2.0), samtools stats/flagstat/idxstats, miRTrace (bgruening/mirtrace_qc 1.0.1+galaxy0), miRDeep2 (rnateam/mirdeep2 2.0.1.2+galaxy0, mirdeep2_mapper 2.0.0.8.1), MultiQC (iuc 1.35+galaxy5), seqkit grep/stats, and CPM normalization (artbio/cpm_tpm_rpk 0.6.0).
- No Tool Shed wrapper found for mirtop, seqcluster, fastx_collapser, bioawk, `seqkit replace`, or the edgeR miRNA QC script (edgeR hits are differential-expression tools that need a design). isomiR tools on the Tool Shed (artbio/mircounts, bgruening/mirge3, glogobyte/isoread) take their reference from a data table, not from user-supplied hairpin FASTA and GFF3.
- iuc/fastp 1.4.0+galaxy0 has no adapter-FASTA parameter, only explicit adapter sequences.
- bowtie_wrapper 1.2.0 builds its index from a history FASTA or uses a data-table index; it has no input for a prebuilt index archive. It exposes `-k`, `--best`/`--strata`, `-e` and `--un`, but not `-t` (timing only) or `--chunkmbs` (best-first search memory; at bowtie's 64 MB default, highly multi-mapping short reads can be skipped as unmapped).
- mirtrace_qc takes many samples in one job and writes one combined report.
- iuc/multiqc 1.35+galaxy5 has no miRTrace, mirtop or bowtie1 module.
- rbc_mirdeep2 uses aggressive error detection; no parameter tolerates exit 255.
- artbio/cpm_tpm_rpk 0.6.0 runs PCA only together with t-SNE, which fails when 3 × perplexity ≥ n − 1, so with 2–3 samples the whole job, CPM table included, fails.

### Acceptance criteria

- On the `test` profile inputs (samplesheet v2.0, genome FASTA, species `hsa`, Illumina small-RNA adapter `TGGAATTCTCGGGTGCCAAGG`, default test-datasets mature/hairpin), the workflow produces the categories of output the source snapshot covers: fastp reports, miRTrace per sample, edgeR QC, mirtop outputs, genome-quantification BAM stats, MultiQC. See the open questions on mirtop, edgeR QC and MultiQC content for what build v0 could not produce.
- Merged miRNA count tables are scientifically comparable to the source's for the test samples (exact tolerance to be settled during test development).
- Samples below the minimum trimmed-read threshold are excluded from downstream quantification, as in the source. No `test` profile sample falls below 10 reads, so this needs its own case.
- Without a genome FASTA, the workflow completes and produces no genome-quantification or miRDeep2 output, as the source does (`prepare_genome/main.nf:83-85`, `workflows/smrnaseq.nf:216`). Build v0 did not test this path.
- miRDeep2 output is produced when a genome FASTA is supplied and miRDeep2 is enabled; how it is accepted is an open question because the default test skips it.
- Test-data facts:
  - The `test` sheet (`smrnaseq/samplesheet/v2.0/samplesheet.csv`) lists 8 samples with one FASTQ each at `s3://ngi-igenomes/test-data/smrnaseq/`. The https mirror `https://ngi-igenomes.s3.amazonaws.com/test-data/smrnaseq/<file>` works (2026-10-25). Files are 57–71 MB each.
  - Build v0 used 3 samples (Clone1_N1, Clone9_N1, Control_N1), each cut to its first 100,000 reads (all 36 nt). Values from such a subset cannot be compared with the snapshot; compare structure, sample identifiers and the presence of known `hsa` miRNAs.
  - These head-100k subsets carry almost no miRNA: exact 16-nt `hsa` mature-prefix hits were 5, 0 and 3 per 100,000 reads.
  - `genome.fa` is hg38 chr21:15,279,870-17,799,869 (2.52 Mbp) plus chrM. `mature.fa` has 48,885 records (2,656 `hsa`); `hairpin.fa` has 1,917 `hsa` records.
  - `conf/test.config` sets `skip_mirdeep = true` and supplies `bowtie_index`.
  - Build v0 ran miRDeep2 on the subset and it failed on data: two samples exited 2 with "No precursors excised" and one exited 255 with "output.mrd is empty". The source would ignore only the exit-255 sample.
  - `conf/test_mirgenedb.config` runs miRDeep2 (`skip_mirdeep = false`) but on the excluded MirGeneDB route.

### Open questions

- Is miRDeep2 part of the default-run equivalent, and how is it accepted when no default test exercises it?
  - Proposed: include miRDeep2, run when a genome FASTA is supplied and `skip_mirdeep` is false (the default), and require it to complete on genome inputs that contain miRNA signal. Treat output comparison against the source as unverified until source output for that configuration exists.
  - Evidence: the caller asks for "the whole pipeline" with "no skip flags set" (`skip_mirdeep = false`, `nextflow.config:53`; `workflows/smrnaseq.nf:235`). The source's own `test` profile skips it (`conf/test.config`), and the default snapshot has no miRDeep2 output. Build v0 ran it on the head-100k subset and all three jobs failed on data (see Acceptance criteria), so the build's test also skipped it. The source ignores only exit 255 (`conf/modules.config:560-562`). Only `test_mirgenedb` enables miRDeep2, on the excluded route.
  - Confidence: low
  - Missing: miRNA-rich test input on the miRBase route (for example a subset selected for miRNA-sized inserts rather than the first reads), any source-run miRDeep2 output for it, and whether the expert values miRDeep2 enough to keep it if it cannot be validated.
- Which miRBase release should the mature/hairpin FASTA and the miRNA GFF come from?
  - Proposed: treat them as user-supplied reference inputs; use the nf-core test-datasets copies (and `hsa.gff3`) for test evidence, and do not depend on the unpinned `mirbase.org/download/CURRENT` GFF.
  - Evidence: source defaults are test-datasets copies, not a versioned miRBase release; the non-`hsa` GFF default is an unpinned "CURRENT" URL that can change between runs. Build v0 used the test-datasets mature/hairpin copies; it consumed no GFF because it produced no mirtop output.
  - Confidence: low
  - Missing: the miRBase release (or MirGeneDB version) the expert wants for production runs.
- Confirm that MirGeneDB, contaminant filtering, UMI handling, read clipping and the prebuilt bowtie index stay out of scope.
  - Proposed: yes, excluded.
  - Evidence: all are off under source defaults; the caller selected the default run and excluded nothing explicitly. Build v0 left them out and its test stayed green.
  - Confidence: medium
- Must the isomiR annotation (seqcluster collapse, hairpin mapping, mirtop GFF/counts/export/stats) and the mirtop-based merged count table be reproduced?
  - Proposed: yes; they are the source's primary quantification. A build that cannot produce them reports the gap rather than redefining the merged count table.
  - Evidence: the source's merged `mirna.tsv` comes from mirtop over seqcluster-collapsed hairpin alignments (`subworkflows/local/mirna_quant/main.nf:89-123`). No Tool Shed wrapper was found for mirtop or seqcluster (see Requirements). Build v0 dropped them and delivered a merged table of mature-reference alignment counts (idxstats), a different quantity: mirtop assigns isomiR reads through hairpin alignments, while mature alignment counts with `-k 50` count each multi-mapping read once per reference.
  - Confidence: low
  - Missing: whether the expert accepts mature-alignment counts when mirtop is unavailable, and whether a mirtop and seqcluster wrapper should be authored first.
- Must the edgeR QC outputs be reproduced in full?
  - Proposed: yes. CPM-normalized mature and hairpin count matrices from the same idxstats counts cover part of it; TMM normalization, MDS and the heatmaps remain a gap until a producer exists.
  - Evidence: edgeR QC is a pipeline-local R script (`bin/edgeR_miRBase.r`) with no Tool Shed wrapper. It reads idxstats columns 3 and 4 (`:28-29`). Build v0 delivered CPM tables only, without plots (see the cpm_tpm_rpk evidence in Requirements).
  - Confidence: low
  - Missing: which edgeR QC outputs the expert actually uses.
- Is trimming with the explicit 3' adapter alone acceptable when the known-miRNA-adapter list cannot be applied?
  - Proposed: no for parity; keep the known-adapter list as source behavior and report it as a gap when no producer applies it.
  - Evidence: the source passes `assets/known_adapters.fa` to fastp on every run (`nextflow.config:48`, `workflows/smrnaseq.nf:37`). The Galaxy fastp wrapper takes explicit sequences only. Build v0 trimmed with the explicit adapter only and did not adopt a second trimming pass, since that would trim beyond the source's single fastp pass.
  - Confidence: low
  - Missing: whether the expert's libraries carry adapters other than the explicit one.
- Must the aggregated report carry the same sections as the source's MultiQC report?
  - Proposed: yes for the sections MultiQC can build (FastQC raw and trimmed as separate samples, fastp, samtools stats); report miRTrace and mirtop sections as a gap where no MultiQC module is available.
  - Evidence: source MultiQC inputs at `workflows/smrnaseq.nf:312-328`, with raw and trimmed FastQC kept apart by prefix (`conf/modules.config:114-126`). Mature and hairpin samtools stats both set `ext.prefix = "<id>.sorted"` (`conf/modules.config:375-376,400-401`); whether the source report shows them as separate samples was not checked (the snapshot does not list MultiQC data). The Galaxy MultiQC wrapper has no miRTrace or mirtop module. Build v0 left genome stats out of the report by choice (published separately) and did not check whether raw and trimmed FastQC appear as separate samples.
  - Confidence: medium
  - Missing: whether the expert reads miRTrace and genome stats in the aggregated report or in their own outputs.

### Decisions

- Scope is the whole pipeline as the default run, with no skip flags set (caller, `caller-request.md`).
- Test evidence comes from the `test` profile (caller).
- No expert-provided Galaxy requirements (caller).
- Terminal artifact is this brief for expert review; no Galaxy design in this run (caller).
- Genome quantification is included and runs exactly when a genome FASTA is supplied, as in the source (`prepare_genome/main.nf:83-85`, `workflows/smrnaseq.nf:216`). Proven in build v0 (green test asserted the genome stats outputs); the no-genome path is untested. Was part of an open question (medium) at v0, which also asked about miRDeep2 and a prebuilt index.
- The species code is a required, user-supplied input with no default; the source exits without one on the miRBase route (`prepare_genome/main.nf:123-125`). `hsa` is test evidence only, and no production species is chosen. Proven in build v0 with `hsa` (green test). Was an open question (high) at v0.
- The miRBase route only; MirGeneDB is excluded (`mirgenedb = false`, `nextflow.config:22`). Proven in build v0 (green test). Was an open question (high) at v0.
- The 3' adapter is a run-level setting whose default is the source default, TruSeq `AGATCGGAAGAGCACACGTCTGAACTCCAGTCA` (`nextflow.config:45`); test evidence uses the Illumina small-RNA adapter from `conf/protocol_illumina.config:5`. Proven in build v0, which ran its test with the override (green). Was an open question (medium) at v0.
- Reads are single-end: the source removes `fastq_2` (`utils_nfcore_smrnaseq_pipeline/main.nf:242-247`). A sample's multiple FASTQ rows are concatenated before QC (CAT_FASTQ, `workflows/smrnaseq.nf:85-88`). Build v0 built this and stayed green, but every test sample had one file. Was an open question (low) at v0.

### Related artifacts

- `summary-nextflow.json`: process topology, source containers, parameters, reference assets, test candidates (selected: `tests/default.nf.test::-profile test`).
- `source-evidence-notes.md`: effective defaults, default-run process list, test-profile overrides, `conf/modules.config` arguments and publish paths.
- `caller-request.md`: the caller's objective and selection.
- Known summary discrepancies (source evidence wins): `reference_assets[]` has null URLs for `mature`/`hairpin` although their params carry the test-datasets defaults; `mirtrace_species` is not marked as required on the miRBase route; `conf/modules.config` arguments appear only in `warnings[]`; `publish_dir` is set for 11 of 37 processes.
- Test data: nf-core/test-datasets `smrnaseq` branch (`samplesheet/v2.0/samplesheet.csv`, `reference/genome.fa`, `reference/bowtie_index.tar.gz`, `miRBase/{mature,hairpin}.fa`, `reference/hsa.gff3`); reads at `s3://ngi-igenomes/test-data/smrnaseq/` with an https mirror.
- Build v0 run: `~/foundry-runs/prose-wb2g-smrnaseq-v0-2026-10-25/` (planemo green on attempt 9; ledger `open-requirements.ledger.yml`; head-100k test subsets with checksums in `test-data-refs.json`).

### Blockers

## Agent Environment

Observed from probes taken 2026-10-25T22:07:37Z on the agent host (`environment-probes.txt`), updated from the build v0 run (2026-10-25/26). The bundle states no required tool versions; requirements below are what downstream stages are expected to use.

### Tooling

- `gxwf` / `galaxy-tool-cache`: `@galaxy-tool-util/cli` 1.14.0 on PATH; `gxwf --version` prints 1.0.0. Required version: not specified.
- `planemo`: 0.75.44 on PATH; 0.75.47 runs through `uvx --from planemo==0.75.47` and ran the build v0 workflow test green. Required version: not specified.
- planemo 0.75.47 fails with `KeyError: 'tool_id'` (`planemo/workflows.py:542`) on a workflow that embeds a user-defined tool, so builds here use Tool Shed and stock tools only. It also crashes (TypeError) on `element_tests` over a collection whose elements were skipped by `when`.
- Galaxy for planemo: master on the shared `~/.planemo/gx_venv_3` logged `ModuleNotFoundError: galaxy.datatypes.html` at startup (the venv is stale). `--galaxy_branch release_25.1` (25.1.4.dev0, own venv `gx_venv_3_release_25.1`) ran green. The HTTP 400 "required tools are not installed" seen on both branches came from versionless Tool Shed tool ids, not from the venv.
- `foundry`: not on PATH; run through a local shim of `@galaxy-foundry/gxwf-foundry` 0.3.0 (package version; the CLI has no `--version` flag and the probe printed 0.0.0).
- `node` v25.6.1 and `uvx` on PATH.
- Absent: `nextflow`, `nf-test`, `conda`, `mamba`; `/usr/bin/java` is a stub with no Java runtime. The source pipeline cannot be re-run here, so the committed nf-test snapshot is the only source-output evidence.
- Tool Shed and `gxwf tool-search` are reachable; some searches failed transiently on first try.

### Constraints

- Brief production installs nothing, pulls no containers and downloads no data. Workflow builds may fetch test data and pull the containers the workflow test needs.
- Host: Darwin arm64, 14 CPUs, 48 GiB RAM.
- Disk is tight: about 18–19 GiB free at the start of the 2026-10-25 runs. Planemo `--no_cleanup` keeps each attempt's temporary Galaxy directory; after 7 attempts free disk fell to 3.1 GiB and recovered once those directories were removed. Remove kept Galaxy temp directories between attempts.
- Network: nf-core/test-datasets raw URLs and the `ngi-igenomes.s3.amazonaws.com` https mirror returned 200 (2026-10-25). The full test-profile reads are about 500 MB.

### Containerization

- Preference: none stated by the caller.
- Docker: server 29.9.2, linux/arm64; engine VM reports 14 CPUs and ~7.7 GiB memory. amd64 biocontainers run under emulation (build v0 workflow test: 93 jobs, 355 s wall on the final attempt).
- On this arm64 host, docker writes a platform-mismatch warning to stderr for every amd64 image. Legacy tools without a profile (for example Cut1) treat any stderr as failure. The fix is a planemo `--job_config_file` whose local environment sets `docker_run_extra_arguments: --platform=linux/amd64` (or `DOCKER_DEFAULT_PLATFORM` in the destination `env`). Exporting `DOCKER_DEFAULT_PLATFORM` in planemo's shell does not reach jobs. Not needed on amd64 hosts.
- Singularity, Apptainer and Podman: absent.

### Blockers
