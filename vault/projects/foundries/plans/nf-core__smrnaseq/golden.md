# nf-core/smrnaseq 2.4.1 small-RNA-seq miRNA quantification

## Workflow

### Objective

Reproduce, as a Galaxy workflow, the scientific behavior of the whole nf-core/smrnaseq pipeline (tag 2.4.1) as run with default parameters: read QC and adapter trimming of small-RNA sequencing reads, miRTrace QC, quantification of known miRNAs against a miRNA reference (mature and hairpin sequences, with isomiR annotation and count tables), plus genome alignment statistics and novel-miRNA discovery with miRDeep2 when a genome FASTA is supplied, and an aggregated QC report. Objective wording is from the caller ("convert the whole nf-core/smrnaseq pipeline to an equivalent Galaxy workflow"); the process list is source evidence.

### Sources

- Source pipeline: nf-core/smrnaseq, https://github.com/nf-core/smrnaseq, tag `2.4.1`, commit `cb0af579b24cb8d5a3accd87b2f14ea93fe04832` (`nextflow.config:355` manifest version `2.4.1`; `nextflowVersion '!>=25.04.2'`). Read from a local fixture clone; the summary records the commit in `source.version` but not the tag.
- Caller request: `caller-request.md` (objective, selected scope, test-evidence choice, no expert Galaxy requirements, terminal artifact).
- Source summary: `summary-nextflow.json` (phase 1 output; static resolver plus an LLM correction pass; see its `warnings[]`).
- Source evidence notes: `source-evidence-notes.md` (coordinator-verified facts read directly from the fixture: effective defaults, what a default run executes, test-profile overrides, `conf/modules.config` arguments, reference inputs). Where these disagree with the summary, this brief states the source-evidence value.
- Source files read directly at the pinned commit for v1 and v2: `nextflow.config`, `conf/modules.config`, `conf/test.config`, `conf/test_full.config`, `conf/test_mirgenedb.config`, `conf/protocol_illumina.config`, `workflows/smrnaseq.nf`, `subworkflows/local/{prepare_genome,mirna_quant,utils_nfcore_smrnaseq_pipeline}/main.nf`, `subworkflows/nf-core/fastq_fastqc_umitools_fastp/main.nf`, `modules/local/parse_fasta_mirna/main.nf`, `bin/edgeR_miRBase.r`, `tests/default.nf.test.snap`.
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
- miRTrace runs once per sample on the passing trimmed reads (`ch_reads_for_mirna`, `workflows/smrnaseq.nf:117`), each with its own config line (sample, adapter, phred offset) (`workflows/smrnaseq.nf:156-176`).
- Trimmed-read FastQC runs on the reads that passed the minimum-read filter, not on all trimmed reads (`subworkflows/nf-core/fastq_fastqc_umitools_fastp/main.nf:122-139`), so a dropped sample has a raw FastQC report but no trimmed one.
- Mature, hairpin and genome alignments carry the sample IDs `<id>_mature`, `<id>_hairpin` and `<id>_genome` (`add_suffix`, `subworkflows/local/mirna_quant/main.nf:53,59,127,139-143`), so their samtools stats are separate samples in MultiQC.
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
- edgeR QC (`bin/edgeR_miRBase.r`) reads columns 3 (mapped) and 4 (unmapped) of the mature and hairpin samtools idxstats (`:28-29`). Counts drop the `*` row (`:38`), miRNAs with zero reads in every sample (`:44-50`) and samples with zero total (`:51-53`), and are written sample × miRNA (`:55`). Unmapped counts are the `*` row's column 4 (`:39-42`). log TPM is `log10(CPM + 0.001)` without TMM, rows ordered by decreasing total count (`:58-68`). Normalized CPM uses TMM (`:70-75`). Heatmaps need more than one sample (`:77`) and MDS more than two (`:85`).
- Genome FASTA cleanup: replace non-ATGC bases with N and strip header text after the first space (`conf/modules.config:179-180`).
- samtools index with CSI (`-c`).
- miRDeep2 mapper `-c -j -m -v`; header cleanup via seqkit replace `-p "\s+|\." -w 0`. The source ignores miRDeep2 exit status 255 only (`conf/modules.config:560-562`); any other non-zero exit fails the run.
- Strength: source behavior, not expert-stated. The caller asked for an "equivalent" workflow, which this brief reads as preserving these behaviors.

Tool evidence from builds v0 (2026-10-25) and v1 (2026-10-29); not design choices:

- Tool Shed wrappers found for fastp (iuc 1.4.0+galaxy0), FastQC, bowtie v1 (devteam/bowtie_wrappers 1.2.0), samtools stats/flagstat/idxstats, miRTrace (bgruening/mirtrace_qc 1.0.1+galaxy0), miRDeep2 (rnateam/mirdeep2 2.0.1.2+galaxy0, mirdeep2_mapper 2.0.0.8.1), MultiQC (iuc 1.35+galaxy5), seqkit grep/stats, and CPM normalization (artbio/cpm_tpm_rpk 0.6.0).
- No Tool Shed wrapper found for mirtop, seqcluster, fastx_collapser, bioawk, `seqkit replace`, `seqkit rmdup`, sRNAbench, or the edgeR miRNA QC script (edgeR hits are differential-expression tools that need a design); re-searched with gxwf 1.15.0 on 2026-10-29. isomiR tools on the Tool Shed (artbio/mircounts, bgruening/mirge3, glogobyte/isoread) take their reference from a data table, not from user-supplied hairpin FASTA and GFF3.
- Near misses found 2026-10-29, none a mirtop/seqcluster equivalent: iuc/chira_collapse 1.4.32 collapses reads to FASTA with `>id|UMI|count` headers, unlike seqcluster's output; lpantano/miraligner 1.0.0 annotates isomiRs against a bundled miRBase, with no hairpin FASTA or GFF3 input; rnateam/mirdeep2_quantifier 2.0.0 counts mature miRNAs from reads mapped to user precursor and mature FASTA, a hairpin-based count but not mirtop's isomiR quantity.
- iuc/fastp 1.4.0+galaxy0 (still the newest on 2026-10-29) has no adapter-FASTA parameter, only explicit adapter sequences. lparsons/cutadapt 5.2+galaxy2 accepts an adapter file, but a second trimming pass would trim beyond the source's single fastp pass.
- bowtie_wrapper 1.2.0 builds its index from a history FASTA or uses a data-table index; it has no input for a prebuilt index archive. It exposes `-k`, `--best`/`--strata`, `-e` and `--un`, but not `-t` (timing only) or `--chunkmbs` (best-first search memory; at bowtie's 64 MB default, highly multi-mapping short reads can be skipped as unmapped). Built from a history FASTA, the index is rebuilt in every per-sample job (the source builds it once); cheap for the test genome, costly for a full genome.
- mirtrace_qc takes many samples in one job and writes one combined report; run with one sample per job, its JSON names the sample (`verbosename`) and the species (build v1).
- iuc/multiqc 1.35+galaxy5 has no miRTrace, mirtop or bowtie1 module. It renames inputs by replacing every character outside `[\w\s-]` with `_`, so the source's `<sample>.raw`/`<sample>.trim` FastQC names appear as `<sample>_raw`/`<sample>_trim` (still separate samples; build v1).
- rnateam mirdeep2_mapper 2.0.0.8.1 always passes `-l` (discard reads shorter than N). Upstream `mapper.pl` filters short reads only when `-l` is given and the source passes none, so the source maps the 17-nt reads fastp keeps; a value of 0 disables the filter.
- rbc_mirdeep2 uses aggressive error detection; no parameter tolerates exit 255.
- artbio/cpm_tpm_rpk 0.6.0 runs PCA only together with t-SNE, which fails when 3 × perplexity ≥ n − 1, so with 2–3 samples the whole job, CPM table included, fails.

### Acceptance criteria

- On the `test` profile references (genome FASTA, species `hsa`, Illumina small-RNA adapter `TGGAATTCTCGGGTGCCAAGG`, default test-datasets mature/hairpin), with reads from either the `test` sheet or the source's `test_full` sheet, the workflow produces the categories of output the source snapshot covers: fastp reports, miRTrace per sample, edgeR QC, mirtop outputs, genome-quantification BAM stats, MultiQC. The `test_full` reads are needed wherever miRNA signal matters (see the test-data facts). See the open questions on mirtop and edgeR QC for what builds v0 and v1 could not produce.
- Merged miRNA count tables are scientifically comparable to the source's for the test samples (exact tolerance to be settled during test development).
- Samples below the minimum trimmed-read threshold are excluded from downstream quantification, as in the source. No `test` profile sample falls below 10 reads, so this needs its own case. Build v1 tested it with an 8-read sample and with a raised threshold.
- Without a genome FASTA, the workflow completes and produces no genome-quantification or miRDeep2 output, as the source does (`prepare_genome/main.nf:83-85`, `workflows/smrnaseq.nf:216`). Build v1 tested this path green.
- miRDeep2 completes and reports known `hsa` miRNAs when a genome FASTA with miRNA loci and reads with miRNA signal are supplied and miRDeep2 is enabled (see Decisions). No source output exists for this configuration, so values are not compared with the source.
- Test-data facts:
  - The `test` sheet (`smrnaseq/samplesheet/v2.0/samplesheet.csv`, `conf/test.config:27`) lists 8 samples with one FASTQ each at `s3://ngi-igenomes/test-data/smrnaseq/`. The https mirror `https://ngi-igenomes.s3.amazonaws.com/test-data/smrnaseq/<file>` works (2026-10-25, 2026-10-29). Files are 57–71 MB each.
  - The `test` reads are randomized-adapter (4N, NEXTflex-style) libraries: `hsa` mature 16-nt prefixes sit at read offset 4 (566,611 of 2,749,845 reads in one sample) and almost never at offset 0. The `test` profile uses the Illumina protocol, which clips nothing (`conf/protocol_illumina.config:3-4`), so after adapter trimming few reads align exactly (63 of 674,403 in another sample hit `genome.fa`). miRNA is abundant but invisible to exact mapping, which explains build v0's miRDeep2 failures; no subset of these reads can exercise miRDeep2.
  - The `test_full` sheet (`smrnaseq/samplesheet/v2.0/samplesheet-full.csv`, `conf/test_full.config:18`) lists 27 human plasma ncRNA-seq samples (GEO GSM2560976 onward), 711–787 MB each, in the standard TruSeq small-RNA layout (insert then `TGGAATTCTCGGGTGCCAAGG`, 76 nt). In the first 1M reads of one sample, half the inserts are `hsa` hairpin substrings and about 10,600 align exactly to the `genome.fa` slice, at mir-99a/let-7c and mir-125b-2. `test_full` itself runs on iGenomes `GRCh37` (`conf/test_full.config:19`), not `genome.fa`.
  - Build v1 used 3 `test_full` samples cut to miRNA-enriched subsets (the first 30,000 reads plus every read in the first 1M whose 18–26 nt insert occurs exactly in `genome.fa`; 37–50k reads each, one split in two files to exercise concatenation) and a fourth cut to its first 8 reads (below `min_trimmed_reads`). Values from such subsets cannot be compared with any source snapshot; compare structure, sample identifiers and the presence of known `hsa` miRNAs.
  - `genome.fa` is hg38 chr21:15,279,870-17,799,869 (2.52 Mbp) plus chrM. `mature.fa` has 48,885 records (2,656 `hsa`); `hairpin.fa` has 1,917 `hsa` records.
  - `conf/test.config` sets `skip_mirdeep = true` and supplies `bowtie_index` (`:29,32`).
  - `conf/test_mirgenedb.config` runs miRDeep2 (`skip_mirdeep = false`) but on the excluded MirGeneDB route.

### Open questions

- Which miRBase release should the mature/hairpin FASTA and the miRNA GFF come from?
  - Proposed: treat them as user-supplied reference inputs; use the nf-core test-datasets copies (and `hsa.gff3`) for test evidence, and do not depend on the unpinned `mirbase.org/download/CURRENT` GFF.
  - Evidence: source defaults are test-datasets copies, not a versioned miRBase release; the non-`hsa` GFF default is an unpinned "CURRENT" URL that can change between runs. Builds v0 and v1 used the test-datasets mature/hairpin copies. Neither consumed the GFF, because its only consumer is mirtop (see the isomiR question); build v1 still required it as an input.
  - Confidence: low
  - Missing: the miRBase release (or MirGeneDB version) the expert wants for production runs.
- Confirm that MirGeneDB, contaminant filtering, UMI handling, read clipping and the prebuilt bowtie index stay out of scope.
  - Proposed: yes, excluded.
  - Evidence: all are off under source defaults; the caller selected the default run and excluded nothing explicitly. Builds v0 and v1 left them out and their tests stayed green.
  - Confidence: medium
- Must the isomiR annotation (seqcluster collapse, hairpin mapping, mirtop GFF/counts/export/stats) and the mirtop-based merged count table be reproduced?
  - Proposed: yes; they are the source's primary quantification. A build that cannot produce them reports the gap rather than redefining the merged count table.
  - Evidence: the source's merged `mirna.tsv` comes from mirtop over seqcluster-collapsed hairpin alignments (`subworkflows/local/mirna_quant/main.nf:89-123`). No Tool Shed wrapper exists for mirtop or seqcluster, and the near misses are not equivalents (see Requirements). Build v0 substituted a merged table of mature-reference alignment counts (idxstats), a different quantity: mirtop assigns isomiR reads through hairpin alignments, while mature alignment counts with `-k 50` count each multi-mapping read once per reference. Build v1 followed the proposal, produced no merged table and reported the gap, so acceptance criterion 2 stayed untestable in both builds.
  - Confidence: low
  - Missing: the expert's choice between (a) authoring and publishing mirtop and seqcluster wrappers before the next build, and (b) naming a substitute quantity (mature-reference idxstats counts, or miRDeep2 quantifier hairpin-based counts) and restating acceptance criterion 2 against it.
- Must the edgeR QC outputs be reproduced in full?
  - Proposed: yes. Counts, unmapped counts, log TPM and CPM computed from the same idxstats cover part of it; TMM normalization, MDS, distance matrices and the plots remain a gap until a producer exists.
  - Evidence: edgeR QC is a pipeline-local R script (`bin/edgeR_miRBase.r`) with no Tool Shed wrapper; its semantics are in Requirements. Build v0 delivered CPM tables only. Build v1 also delivered counts, unmapped counts and log TPM by the script's formulas (asserted green, not compared numerically with the script's output) and plain CPM without TMM; its count tables are miRNA × sample, the transpose of the source's.
  - Confidence: low
  - Missing: which edgeR QC outputs the expert actually uses, and whether wrapping `bin/edgeR_miRBase.r` as a tool is authorized.
- Is trimming with the explicit 3' adapter alone acceptable when the known-miRNA-adapter list cannot be applied?
  - Proposed: no for parity; keep the known-adapter list as source behavior and report it as a gap when no producer applies it.
  - Evidence: the source passes `assets/known_adapters.fa` to fastp on every run (`nextflow.config:48`, `workflows/smrnaseq.nf:37`). The Galaxy fastp wrapper takes explicit sequences only; cutadapt takes an adapter file but would add a second trimming pass (see Requirements). Builds v0 and v1 trimmed with the explicit adapter only.
  - Confidence: low
  - Missing: whether the expert's libraries carry adapters other than the explicit one, and if so whether a second trimming pass is acceptable.

### Decisions

- Scope is the whole pipeline as the default run, with no skip flags set (caller, `caller-request.md`).
- Test evidence comes from the `test` profile (caller). Reads with miRNA signal come from the source's `test_full` sheet, because the `test` reads cannot exercise miRDeep2 (see the test-data facts); build v1 used them with the `test` profile references.
- No expert-provided Galaxy requirements (caller).
- Terminal artifact is this brief for expert review; no Galaxy design in this run (caller).
- Genome quantification is included and runs exactly when a genome FASTA is supplied, as in the source (`prepare_genome/main.nf:83-85`, `workflows/smrnaseq.nf:216`). Proven in build v0 (green test asserted the genome stats outputs); build v1 also tested the no-genome path green. Was part of an open question (medium) at v0, which also asked about miRDeep2 and a prebuilt index.
- The species code is a required, user-supplied input with no default; the source exits without one on the miRBase route (`prepare_genome/main.nf:123-125`). `hsa` is test evidence only, and no production species is chosen. Proven in build v0 with `hsa` (green test). Was an open question (high) at v0.
- The miRBase route only; MirGeneDB is excluded (`mirgenedb = false`, `nextflow.config:22`). Proven in build v0 (green test). Was an open question (high) at v0.
- The 3' adapter is a run-level setting whose default is the source default, TruSeq `AGATCGGAAGAGCACACGTCTGAACTCCAGTCA` (`nextflow.config:45`); test evidence uses the Illumina small-RNA adapter from `conf/protocol_illumina.config:5`. Proven in build v0, which ran its test with the override (green). Was an open question (medium) at v0.
- Reads are single-end: the source removes `fastq_2` (`utils_nfcore_smrnaseq_pipeline/main.nf:242-247`). A sample's multiple FASTQ rows are concatenated before QC (CAT_FASTQ, `workflows/smrnaseq.nf:85-88`). Build v0 built this; build v1 tested a two-file sample green. Was an open question (low) at v0.
- miRDeep2 is included and runs when a genome FASTA is supplied and `skip_mirdeep` is false, the default (`nextflow.config:53`, `workflows/smrnaseq.nf:235`). It is accepted by completing and reporting known `hsa` miRNAs on reads with miRNA signal; output is not compared with the source, which publishes none for this configuration. Proven in build v1: on three `test_full`-derived samples over `genome.fa` it completed and detected known miRNAs (for example `hsa-let-7c-5p` at score 3688). The source still ignores exit 255 only (`conf/modules.config:560-562`), which the Galaxy wrapper cannot (see Requirements). Was an open question (low) at v0 and v1.
- The aggregated report carries the sections MultiQC can build, as the source's does: FastQC raw and trimmed as separate samples, fastp, and mature, hairpin and genome samtools stats as separate samples (`workflows/smrnaseq.nf:312-328`, `conf/modules.config:114-126`, `subworkflows/local/mirna_quant/main.nf:139-143`). miRTrace and mirtop sections remain a gap while the Galaxy MultiQC wrapper has no module for them; their own outputs are published instead. Proven in build v1 (green test asserted the per-sample names, genome stats included when a genome is supplied). Was an open question (medium) at v0 and v1.

### Related artifacts

- `summary-nextflow.json`: process topology, source containers, parameters, reference assets, test candidates (selected: `tests/default.nf.test::-profile test`).
- `source-evidence-notes.md`: effective defaults, default-run process list, test-profile overrides, `conf/modules.config` arguments and publish paths.
- `caller-request.md`: the caller's objective and selection.
- Known summary discrepancies (source evidence wins): `reference_assets[]` has null URLs for `mature`/`hairpin` although their params carry the test-datasets defaults; `mirtrace_species` is not marked as required on the miRBase route; `conf/modules.config` arguments appear only in `warnings[]`; `publish_dir` is set for 11 of 37 processes.
- Test data: nf-core/test-datasets `smrnaseq` branch (`samplesheet/v2.0/samplesheet.csv`, `samplesheet/v2.0/samplesheet-full.csv`, `reference/genome.fa`, `reference/bowtie_index.tar.gz`, `miRBase/{mature,hairpin}.fa`, `reference/hsa.gff3`); reads for both sheets at `s3://ngi-igenomes/test-data/smrnaseq/` with an https mirror.
- Build v0 run: `~/foundry-runs/prose-wb2g-smrnaseq-v0-2026-10-25/` (planemo green on attempt 9; ledger `open-requirements.ledger.yml`; head-100k `test` subsets with checksums in `test-data-refs.json`).
- Build v1 run: `~/foundry-runs/prose-wb2g-smrnaseq-v1-2026-10-29/` (planemo green on attempt 2; ledger `open-requirements.ledger.yml`; `test_full`-derived miRNA-enriched subsets with their recipe `test-data/prep/make_fixtures.py` and checksums in `test-data-refs.json`; kept test outputs, miRDeep2 results included, under `.scratch/test-outputs/attempt2/`).

### Blockers

## Agent Environment

Observed on the agent host from the build v1 preflight (2026-10-29T15:55Z, `foundry-run.yml`) and the build v1 run, unless marked as requirements or unknowns. The bundle states no required tool versions; requirements below are what downstream stages are expected to use.

### Tooling

- `gxwf` and `galaxy-tool-cache`: not on PATH globally; run from the Foundry worktree's `node_modules/.bin` (`@galaxy-tool-util/cli` 1.15.0; `gxwf --version` prints 1.15.0).
- `foundry`: not on PATH globally; a worktree build of `@galaxy-foundry/gxwf-foundry` 0.3.0 runs through a node shim (node v26.13.0). It has no `--version` flag.
- `planemo`: not on PATH; 0.75.47 runs through `uvx --from planemo==0.75.47`. Its managed Galaxy from `--galaxy_branch release_26.1` ran the build v1 test green; the Galaxy checkout and venv under `~/.planemo` are reused between runs (first run about 3.5 min to clone and build).
- Required: Galaxy no older than `release_26.1` for builds (orchestrator constraint). Otherwise unknown; the caller stated none.
- planemo 0.75.47 fails with `KeyError: 'tool_id'` (`planemo/workflows.py:542`) on a workflow that embeds a user-defined tool, so builds use Tool Shed and stock tools only. It crashes (TypeError) on `element_tests` over collection elements skipped by `when`. It installs only Tool Shed repositories named in a step's `tool_shed_repository` block; `gxwf validate --strict --connections` does not catch a missing block. It finds tests only in the file named after the workflow file minus `.yml` plus `-tests.yml` (`wf.gxwf.yml` → `wf.gxwf-tests.yml`); any other name exits 2 with only "No tests were executed".
- Galaxy `release_26.1` (and dev, 2026-10-29): a model-operation step skipped by `when` still evaluates its inputs before the skip is applied, so a skipped relabel step whose label input was also skipped fails the invocation. Seen in build v1's no-genome case; the build worked around it.
- Nextflow, nf-test, a Java runtime and conda are absent. The source pipeline cannot be re-run here, so the committed nf-test snapshot is the only source-output evidence.
- Tool Shed and `gxwf tool-search` are reachable.

### Constraints

- Brief production installs nothing, pulls no containers and downloads no data. Workflow builds may fetch test data and pull the containers the workflow test needs.
- Host: Linux x86_64, 4 CPUs, 14 GiB RAM plus 16 GiB swap (swap added after build v1; the run had none), about 486 GiB free disk. Other pipeline runs share the host.
- A full build v1 planemo attempt (two test cases, about 200 jobs) took about 45 minutes. Host memory peaked at 13.3 of 14.6 GB while another run's planemo test ran alongside; the kernel OOM killer ended a job of that other run. Avoid overlapping heavy planemo tests.
- Kept planemo Galaxy directories (`--no_cleanup`) contain root-owned directories created by Docker jobs; removing them needs Docker, e.g. `docker run --rm -v /tmp:/t busybox rm -rf /t/<dir>`.
- The IWC corpus has no shared mirror on this host; a build that compares against IWC builds it locally first (`make fixtures-iwc fixtures-skeletons`).
- Network: nf-core/test-datasets raw URLs, the `ngi-igenomes.s3.amazonaws.com` https mirror and the Tool Shed API returned 200 (2026-10-29). One `test_full` FASTQ is 711–787 MB.

### Containerization

- Preference: none stated by the caller.
- Docker 29.1.3, native amd64, 4 CPUs and 14.6 GiB visible; the user is in the docker group. Biocontainers run natively, and stderr is empty once an image is local, so no docker platform setting is needed for legacy tools that fail on any stderr.
- Singularity, Apptainer and Podman: absent.
- Dated note (2026-10-25, previous host): on Darwin arm64 the amd64 biocontainers ran under emulation, docker wrote a platform warning to stderr that failed legacy tools until a planemo job config passed `--platform=linux/amd64`, and kept Galaxy temp directories filled the disk.

### Blockers
