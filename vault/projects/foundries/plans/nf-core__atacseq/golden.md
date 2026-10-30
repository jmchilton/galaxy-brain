# Workflow Brief: nf-core/atacseq 2.1.2 (whole pipeline)

## Workflow

### Objective

John: "Convert the whole pipeline to an equivalent Galaxy workflow." The workflow takes ATAC-seq FASTQ libraries described by a sample sheet, plus a genome FASTA and gene annotation. It produces the source's scientific results at two levels. The merged-library level merges the sequencing runs of each sample replicate. The merged-replicate level merges the replicates of each sample. Results at each level are filtered alignments, normalised coverage tracks, called and annotated peaks, consensus peak sets with read counts and DESeq2-based sample QC, and ATAC-specific QC.

### Sources

- Source: nf-core/atacseq, `manifest.version = '2.1.2'` (`nextflow.config:289`), commit `1a1dbe52ffbd82256c941a032b0e22abbd925b8a` (coordinator pin `1a1dbe52`, full SHA from the fixture). MIT licence. Repository https://github.com/nf-core/atacseq.
- Expert intent: John's objective and scope (quoted in Objective, Requirements and Decisions), from `caller-request.md`.
- Source evidence: `summary-nextflow.json` (phase-1 CLI output plus a correction pass) and `phase1-notes.md`. Every `path:N` cite below is relative to the fixture root.
- Build evidence: build v0 of this brief (2026-10-29, see Related artifacts). Wrapper, test-data and environment facts marked "build v0" come from its ledger and run summary; they are evidence, not design.
- The source has no nf-test suite (no `tests/`, no `nf-test.config`). Its test evidence is three test profiles, `test`, `test_controls` and `test_full` (`nextflow.config:225-227`), plus a CI parameter matrix (`.github/workflows/ci.yml:65-70`).

### Scope

#### Included

John's scope is the whole pipeline, including the merged-replicate level. It covers every scientific analysis the source can run under some parameter setting. Process-level topology stays in `summary-nextflow.json`. Build v0 left several included analyses out under cited reasons; each is an open question below, not an exclusion.

- Reference preparation from FASTA and GTF or GFF. It derives the gene BED, TSS BED, chromosome sizes and FASTA index, the autosome list and the include-regions BED (genome minus blacklist, and minus the mitochondrial chromosome unless `keep_mito`). It builds the aligner index, and derives the MACS2 genome size when `macs_gsize` is unset (`subworkflows/local/prepare_genome.nf:230-238`; John keeps this in scope; see Decisions).
- Sample-sheet validation and run/replicate structure (`bin/check_samplesheet.py`, run by `SAMPLESHEET_CHECK` at `subworkflows/local/input_check.nf:15-17`).
- Read QC (FastQC) and adapter/quality trimming (Trim Galore). Libraries with fewer post-trim reads than `min_trimmed_reads` are dropped: `.filter { meta, reads, num_reads -> num_reads >= min_trimmed_reads.toFloat() }` (`subworkflows/nf-core/fastq_fastqc_umitools_trimgalore/main.nf:99`).
- Alignment with one of four aligners, selected by `params.aligner` (`workflows/atacseq.nf:168`, `:189`, `:211`, `:236`), with samtools sort, index and stats. Build v0 built BWA only; the alternatives are an open question.
- Merged-library level, per sample replicate:
  - merge the runs, then mark duplicates without removing them (`--REMOVE_DUPLICATES false`, `conf/modules.config:358`);
  - filter alignments to the include regions and by flags, mapping quality, mismatches, soft clips, insert size and orphan mates (see Inputs and outputs);
  - optional preseq library complexity, Picard metrics, a CPM-scaled bigWig, deepTools gene-body and TSS profiles, and a deepTools fingerprint;
  - MACS2 peak calling, FRiP and peak counts, HOMER annotation and R peak-QC plots;
  - consensus peaks across samples, featureCounts and DESeq2 QC;
  - ataqv per library, aggregated with mkarv.
- Merged-replicate level, `if (!params.skip_merge_replicates)` (`workflows/atacseq.nf:520`), for samples with more than one replicate (`if (bams.size() > 1)`, `workflows/atacseq.nf:536`). It merges the filtered replicate BAMs, removes duplicates (`--REMOVE_DUPLICATES true`, `conf/modules.config:756`), and runs bigWig, MACS2, annotation and QC, and consensus with counting and DESeq2 QC.
- Optional pairing of each sample with a control (input) library at both levels (`if (params.with_control)`, `workflows/atacseq.nf:385` and `:582`). Build v0 did not build it; see Open questions.
- Reporting: a MultiQC report over the QC above (`if (!params.skip_multiqc)`, `workflows/atacseq.nf:700`; an output, see Decisions) and an IGV session file (`if (!params.skip_igv)`, `workflows/atacseq.nf:660`; an open question).

#### Excluded

- Pipeline plumbing, which is not scientific work (agent decision, for expert review): nf-validation parameter checks and help, iGenomes existence errors, software-version collation (`CUSTOM_DUMPSOFTWAREVERSIONS`, `workflows/atacseq.nf:693-695`), completion e-mail and notifications (`workflow.onComplete`, `workflows/atacseq.nf:766`), and nf-core template utility code under `lib/`. The validation rules in `lib/WorkflowAtacseq.groovy` that encode scientific input requirements remain as evidence for the input contract (see Inputs and outputs).
- The `--genome` iGenomes key lookup (`main.nf:20-31`); references and genome-size values are supplied directly (see Decisions).
- UMI extraction. The source passes `with_umi` as the literal `false` (`workflows/atacseq.nf:152`), so it never runs.
- Publish-directory layout and file naming, except where a scientific output depends on them (see the IGV question).
- Resource, publishing and plumbing parameters: `save_*`, `publish_dir_mode`, `multiqc_config`/title/logo/methods, e-mail, `max_*`, `config_*`, validation and help (`summary-nextflow.json` `params[]`). `seq_center` only sets the read-group `CN` tag (`subworkflows/local/input_check.nf:33-36`); the bamtools filter configurations stay fixed to `assets/bamtools_filter_pe.json` and `_se.json`.

### Inputs and outputs

Inputs, as source facts. Required/optional is source behaviour, not a Galaxy interface decision.

- Sample sheet (required): `ch_input = file(params.input)` (`workflows/atacseq.nf:20`). The header must start with `["sample", "fastq_1", "fastq_2", "replicate"]`, or with `["sample", "fastq_1", "fastq_2", "replicate", "control", "control_replicate"]` when `with_control` is set (`bin/check_samplesheet.py:55-58`). A row is paired-end if `sample and fastq_1 and fastq_2` (`bin/check_samplesheet.py:123`) and single-end if `sample and fastq_1 and not fastq_2` (`bin/check_samplesheet.py:126`). All replicates of a sample, and all runs of a replicate, must share one layout (`bin/check_samplesheet.py:166-185`). Rows sharing sample and replicate are runs, renamed `"{}_REP{}_T{}".format(sample, replicate, idx + 1)` (`bin/check_samplesheet.py:203`).
- FASTQ reads, gzipped, single- or paired-end per sample.
- Genome FASTA (required: `if (!params.fasta)` errors, `lib/WorkflowAtacseq.groovy:16-17`). It may be gzipped (`if (params.fasta.endsWith('.gz'))`, `subworkflows/local/prepare_genome.nf:43`).
- Gene annotation, GTF or GFF (`if (!params.gtf && !params.gff)` exits, `lib/WorkflowAtacseq.groovy:20-22`). GFF is converted to GTF.
- Optional: a blacklist BED (`if (params.blacklist)`, `subworkflows/local/prepare_genome.nf:75`), a prebuilt aligner index (an open question), a gene BED, a TSS BED (`if (!params.tss_bed)` builds one, `subworkflows/local/prepare_genome.nf:111`), the mitochondrial chromosome name, and `macs_gsize`.
- `read_length` is required when `macs_gsize` is unset (`if (!params.read_length && !params.macs_gsize)` exits, `lib/WorkflowAtacseq.groovy:33-35`). The schema restricts it to `[50, 75, 100, 150, 200]` (`nextflow_schema.json:36-41`). It only sets the k-mer length of the genome-size derivation.
- In the source, `--genome` fills reference parameters from iGenomes (`main.nf:20-31`), including `params.macs_gsize = WorkflowMain.getMacsGsize(params)` (`main.nf:31`).

Test data (`test` profile, `conf/test.config:23-32`), as measured in build v0 at nf-core/test-datasets `atacseq` commit `cd022b097372b078a68d8afadb172ad7342fd91f` (SHA-1 values in that run's `test-data-refs.json`):

- The sheet has 8 rows: `OSMOTIC_STRESS_T0_PE` replicates 1 and 2, `OSMOTIC_STRESS_T15_PE` two runs of replicate 1, `OSMOTIC_STRESS_T100_SE` replicates 1 and 2, and `OSMOTIC_STRESS_T150_SE` two runs of replicate 1. That gives 6 merged libraries and 2 merged-replicate samples (`T0_PE`, `T100_SE`).
- The single-end rows reuse the paired-end R1 files (SRR1822153/54/57/58), so single- and paired-end results come from the same molecules and are not independent samples.
- Each FASTQ holds 100,000 reads of 76 bp (Phred+33, NextSeq-binned quality); about 20% of R1 reads carry the Nextera adapter. BWA maps 94–96% of them, 94–95% properly paired, median insert 107–121 bp, 0.5–2% on `MT`. Every run is far above `min_trimmed_reads = 10000`, so the test drops none.
- `reference/genome.fa` is S. cerevisiae: 17 contigs `I`..`XVI` plus `MT`, 12,157,105 bp. `reference/genes.gtf` uses the same contig names and has no `gene` feature lines (transcript, exon, CDS, start and stop codons only).
- The profile's `read_length = 50` is shorter than the real 76 bp reads; as in the source, it only sets the genome-size k-mer length. No blacklist, gene BED, TSS BED or `macs_gsize` is given.

Outputs (scientific roles, per level unless stated):

- Prepared references: gene BED, TSS BED, chromosome sizes, include-regions BED, and the genome size used by MACS2.
- Filtered, coordinate-sorted, indexed alignments. The merged-library filter applies samtools `meta.single_end ? '-F 0x004' : '-F 0x004 -F 0x0008 -f 0x001'`, `params.keep_dups ? '' : '-F 0x0400'` and `params.keep_multi_map ? '' : '-q 1'` (`conf/modules.config:396-398`), and keeps only include regions (`PREPARE_GENOME.out.filtered_bed.first()`, `workflows/atacseq.nf:302`). The bamtools rules are insert size within ±2000, `NM:<=4` and no soft clips for paired-end, and `NM:<=4` with no soft clips for single-end (`assets/bamtools_filter_pe.json`, `assets/bamtools_filter_se.json`).
- Normalised coverage tracks (bigWig).
- Peaks (broad by default, or narrow), with FRiP scores and peak counts. FRiP is the count of reads in peaks over mapped reads (`modules/local/frip_score.nf:24-26`, `ext.args = '-bed -c -f 0.20'`, `conf/modules.config:611`). Also HOMER annotations and the R QC plots.
- Consensus peak sets (BED and SAF), a featureCounts count matrix, and DESeq2 QC (PCA, sample clustering, optional VST counts).
- ATAC QC: ataqv per-library metrics and the mkarv aggregate (merged-library level only), deepTools profiles and fingerprints, Picard metrics, optional preseq curves, and FastQC/Trim Galore reports.
- Reports: the MultiQC report and the IGV session (see Open questions).

### Requirements and preferences

- John: the result must be "an equivalent Galaxy workflow" to the whole pipeline. Equivalence is with the source's scientific behaviour at commit `1a1dbe52`, including the merged-replicate level (strength: required).
- John: `macs_gsize` "stays in scope — how it's supplied is a question for the brief, not a reason to drop it" (strength: required).
- Fold reading of John's whole-pipeline objective (not a separate John statement): scope cuts such as controls and the alternative aligners are not accepted as exclusions. A build either carries them or records them for an expert decision (strength: preferred).
- John: no other Galaxy requirements.
- Source: default behaviour is part of equivalence. Broad peaks (`narrow_peak = false`, `broad_cutoff = 0.1`, `nextflow.config:48-49`), BWA (`aligner = 'bwa'`, `nextflow.config:38`), no controls (`with_control = false`, `nextflow.config:17`), preseq off (`skip_preseq = true`, `nextflow.config:66`), merged-replicate level on (`skip_merge_replicates = false`, `nextflow.config:43`).

Wrapper evidence (main Tool Shed, searched 2026-10-29 in build v0 with `gxwf tool-search` and wrapper XML). This brief does not choose tools.

- Genome size: no Tool Shed wrapper for khmer `unique-kmers.py`; the khmer wrappers present cover partitioning, filtering and normalisation only. iuc `jellyfish` 2.3.0 exposes `count` (k-mer length, canonical) and `histo`, but not `stats`; the distinct k-mer count is the sum of the histogram's second column. jellyfish counts k > 31 natively, so k = 50–200 works. The histogram is space-separated: build v0's attempt 1 summed it with a text-processing wrapper that forces a tab field separator, got 0, and MACS2 failed with a zero genome size.
- ataqv and mkarv: no wrapper (`ataqv`, `ataq`, `mkarv` searches empty). iuc `atacseqqc` computes a different metric (TSS enrichment).
- DESeq2 QC: iuc `deseq2` is a differential-expression wrapper that needs a factor with at least two levels, so it cannot run the source's `design = ~1` model (`bin/deseq2_qc.r:93`); no other wrapper emits rlog/VST PCA and sample distances. The source's R peak-QC scripts (`bin/plot_macs2_qc.r`, `bin/plot_homer_annotatepeaks.r`) have no wrapper.
- Picard: no `CollectMultipleMetrics` wrapper; devteam `picard` 3.1.1.0 has separate CollectAlignmentSummaryMetrics, CollectInsertSizeMetrics and CollectGcBiasMetrics tools.
- HOMER: iuc `homer_annotatepeaks` 4.11 takes a FASTA and a GTF but exposes no `-gid` (`conf/modules.config:631`, `:711` use it); the FASTA is passed only through its CpG option, which adds CpG/GC columns. It ran without a preinstalled HOMER genome.
- Trim Galore: bgruening `trim_galore` 0.6.10 (the only wrapper) has no `--nextseq` (`conf/modules.config:170`) and no built-in FastQC.
- preseq: iuc `preseq_lc_extrap` 3.2.0 (the only version) renders no `-seed` or `-pe` (`conf/modules.config:519`; `-pe` for paired libraries, `modules/nf-core/preseq/lcextrap/main.nf:25`), so paired libraries would be counted per read rather than per fragment.
- gffread: devteam `gffread` 2.2.1.4 exposes `-T` and `-F` but not `--keep-exon-attrs` (`conf/modules.config:81`).
- Gene BED: no wrapper runs `bin/gtf2bed`. iuc `gtftobed12` (UCSC `gtfToGenePred | genePredToBed`) matches it in columns 1–6 and exon blocks but takes the thick region from CDS features and skips exon-less groups.
- featureCounts: iuc `featurecounts` 2.1.1 accepts GTF-like annotation only, not SAF. subread 2.1.1 with `-p` fails on a single-end BAM, while the source's subread 2.0.1 (`modules/nf-core/subread/featurecounts/main.nf:5`) warns and counts reads; a docker check gave identical counts for SAF on 2.0.1 and the equivalent GTF on 2.1.1.
- MACS2: iuc `macs2_callpeak` 2.2.9.1 offers p-value or q-value as alternatives and cannot omit both, so the source's merged-replicate call with neither (`conf/modules.config:820-825`) is reproduced only through MACS2's own default q 0.05. Broad versus narrow is a mode switch, not a value.
- bamtools filter: devteam `bamFilter` 2.5.3 expresses every source rule (insert size, `NM` tag, CIGAR wildcard and their combination).
- BWA: devteam `bwa_mem` 0.7.19 exposes `-T` only as a required value (bwa's default is 30). Its read-group sample name is one value per job, so per-run read groups get `SM` = run id rather than library id.
- deepTools: `plotFingerprint` takes several BAMs in one job, giving one combined plot and metrics table rather than one per library. `bamCoverage` cannot express a fragment size of 0 (minimum 1) and computes the CPM denominator itself.
- MultiQC: iuc `multiqc` 1.35 has no plotProfile section in its deepTools plugin, and its preseq input is required, so a skipped preseq result cannot be passed to it.
- `map_param_value`: the IWC-cited revision `5ac8a4bf7a8d` of iuc `map_param_value` 0.2.0 is not installable; `022a635f2283` is.
- Nearest IWC workflow: `epigenetics/atacseq` (medium similarity), which takes paired reads only, a cached reference and a required genome size, and uses narrow MACS2 peaks only.

### Acceptance criteria

- On the source's `test` inputs, the workflow completes both levels. It must handle the mixed single-/paired-end sheet, run merging and replicate merging, and derive the MACS2 genome size from the FASTA because no `macs_gsize` is given (`conf/test.config:23-29`). Build v0 met this.
- At each level, peaks, consensus peaks, counts and DESeq2 QC come out for the samples the source would keep. Samples below `min_trimmed_reads` and samples with zero peaks (`peaks.size() > 0`, `subworkflows/local/bam_peaks_call_qc_annotate_macs2_homer.nf:48`) drop out of downstream steps as in the source. Consensus needs more than one sample (`.filter { it.size() > 1 }`, `subworkflows/local/bed_consensus_quantify_qc_bedtools_featurecounts_deseq2.nf:31`). Build v0 did not implement the more-than-one-sample gate and its test never reached it.
- With controls enabled and a control-bearing sheet, MACS2 receives the matched control at both levels (`def control = controlbam ? "--control $controlbam" : ''`, `modules/nf-core/macs2/callpeak/main.nf:31`).
- Results are scientifically comparable to an nf-core/atacseq 2.1.2 run on the same inputs and parameters: peak sets, FRiP and count matrices. The comparison method and tolerances belong to test development (see Open questions for reference values).

### Open questions

- Are control (input) libraries built, and with what test?
  - Proposed: yes, optionally, at both levels, as John's whole-pipeline scope requires. When the sample sheet carries `control`/`control_replicate` columns and controls are enabled, pair each sample with its control for MACS2 and keep controls out of peak-derived outputs; without them, call peaks without a control (the source default). Test it with the `test_controls` sheet with controls explicitly enabled, as a second test case.
  - Evidence: `with_control = false` (`nextflow.config:17`). The six-column header applies only with `with_control` (`bin/check_samplesheet.py:55-58`, passed as `params.with_control ? "--with_control" : ''`, `conf/modules.config:28`). Pairing happens at `workflows/atacseq.nf:385` and `:582`. The `test_controls` profile changes only `input` (`conf/test_controls.config:23`), and CI runs `-profile test_controls,docker` without `--with_control` (`.github/workflows/ci.yml:56`), so the source never tests pairing. Build v0 designed the branch (about 14 steps) but dropped it, citing its step budget and the missing source test; it recommended the expert decide scope and name a test sheet.
  - Confidence: medium
  - Missing: John's confirmation that controls stay in scope, and that a control test the source itself never runs is acceptable evidence.
- Which aligners must the workflow offer, and how is each tested?
  - Proposed: all four source aligners (BWA by default; Bowtie2, Chromap and STAR as alternatives), selected per run. Each alternative is tested as a variant of the `test` case with only the aligner changed, as the source's CI matrix does. If a build cannot carry all four, it adds them in the order Bowtie2, Chromap, STAR and records the rest for the expert.
  - Evidence: `aligner = 'bwa'` (`nextflow.config:38`). Branches `if (params.aligner == 'bwa')`, `'bowtie2'`, `'chromap'` and `'star'` (`workflows/atacseq.nf:168`, `:189`, `:211`, `:236`), with arguments at `conf/modules.config:239-321`. CI exercises `--aligner bowtie2`, `chromap` and `star` (`.github/workflows/ci.yml:68-70`). Wrappers exist (devteam `bowtie2` 2.5.5, with IWC precedent; iuc `chromap`; `rna_star`); whether each builds its index from a FASTA was not checked. Build v0 built BWA only, dropping the others for its step budget (about four steps per aligner), and recommended narrowing to BWA or keeping all four with a test case each.
  - Confidence: medium
  - Missing: John's choice between all four and BWA only.
- Are ataqv/mkarv, DESeq2 QC and the R peak-QC plots delivered as the source computes them, or may substitutes stand in?
  - Proposed: deliver them as the source computes them, by running the source's own tools and `bin/` scripts (ataqv and mkarv on the merged-library duplicate-marked BAM with the library's peaks, TSS BED, autosomes and mitochondrial reference; `deseq2_qc.r` with rlog or VST, PCA on the top 500 and all intervals, and sample distances; `plot_macs2_qc.r` and `plot_homer_annotatepeaks.r`) as locally authored steps where no wrapper exists. A substitute (read-count PCA, summary tables) needs the expert's sign-off and is labelled as such.
  - Evidence: ataqv joins `MERGED_LIBRARY_MARKDUPLICATES_PICARD.out.bam` with its peaks (`workflows/atacseq.nf:477-482`), `if (!params.skip_ataqv)` (`:487`), mitochondrial reference falling back to `mito_name` (`:23-26`), `ext.args = '--ignore-read-groups'` (`conf/modules.config:725`). DESeq2 QC: `bin/deseq2_qc.r:93-228`. Peak QC plots run only when annotation runs (`subworkflows/local/bam_peaks_call_qc_annotate_macs2_homer.nf:94`, `:106`). No wrapper exists for any of them (see Requirements). Build v0 dropped ataqv/mkarv, replaced DESeq2 QC with a PCA over deepTools read counts (no sample-distance plot, no VST), and replaced the plots with per-library summary tables, all with cited reasons; it recommended the expert decide.
  - Confidence: medium
  - Missing: John's choice: author source-command steps, accept the substitutes, or omit.
- Must the workflow accept a prebuilt aligner index?
  - Proposed: no. The index is always built from the genome FASTA, which is the source's behaviour when no index is given; an expert with a prebuilt index uses the server's own reference builds instead.
  - Evidence: `subworkflows/local/prepare_genome.nf:158-225` untars or uses a supplied `bwa_index`, `bowtie2_index`, `chromap_index` or `star_index`, else builds one. Build v0 did not offer one, but its reason (aligner wrappers take a server-side index or a history FASTA, not an index archive) was not checked against each wrapper.
  - Confidence: medium
  - Missing: a per-wrapper check, and whether John wants this input.
- Which reports and secondary QC are deliverables: the IGV session, the full MultiQC content and the full Picard metrics?
  - Proposed: drop the IGV session file, which is built from the source's publish-directory paths. MultiQC carries the source's FRiP and peak-count sections and, when preseq runs, its preseq section; plotProfile stays out until a wrapper supports it. Picard metrics include insert size for paired-end libraries alongside the alignment summary.
  - Evidence: The IGV module takes path strings such as `"${params.aligner}/merged_library/bigwig"` (`workflows/atacseq.nf:660-685`). Build v0's MultiQC report (9 sections) lacked FRiP and peak-count custom content (step budget), preseq (skipped by default; the wrapper's preseq input is required) and plotProfile (unsupported by the wrapper). It built only CollectAlignmentSummaryMetrics of the source's `PICARD_COLLECTMULTIPLEMETRICS` (`workflows/atacseq.nf:331-352`); insert-size metrics produce no histogram for single-end libraries.
  - Confidence: low
  - Missing: whether John wants a genome-browser session, and how complete the aggregate QC must be.
- Which tunable source parameters become workflow parameters?
  - Proposed: expose the science-affecting ones with source defaults: aligner, narrow/broad peaks and broad cutoff, MACS2 p- or q-value threshold, controls, `keep_dups`, `keep_multi_map`, `keep_mito`, `min_trimmed_reads`, `min_reps_consensus`, `fragment_size`, read-clipping options, `trim_nextseq`, `deseq2_vst`, `fingerprint_bins`, `bwa_min_score`, `ataqv_mito_reference`, and the per-step skips.
  - Evidence: `summary-nextflow.json` `params[]` (90 parameters) and the defaults at `nextflow.config:12-71`. Build v0 exposed 39 inputs; it left out `aligner`, `with_control`, `deseq2_vst` and `ataqv_mito_reference` with their dropped branches, and `macs_pvalue` because the MACS2 wrapper's p/q choice is a mode switch (see Requirements). Its `trim_nextseq` had no effect, because the Trim Galore wrapper lacks `--nextseq`.
  - Confidence: low
  - Missing: the expert's preferred interface breadth.
- Which tool-level deviations from the source's commands are acceptable?
  - Proposed: accept those that leave the default-path results unchanged or change only metadata, and record them: read-group `SM` = run id; one combined fingerprint across libraries; HOMER annotation keyed on the GTF without `-gid`; the gene BED's thick region from CDS; `min_trimmed_reads` counted from alignment statistics instead of the Trim Galore log; subread 2.1.1 instead of 2.0.1. Treat as open until checked: preseq without `-pe`/`-seed`, GFF conversion without `--keep-exon-attrs`, and CPM coverage computed by a tool other than `bedtools genomecov -scale` (`conf/modules.config:469`).
  - Evidence: the wrapper facts under Requirements. Build v0 used each of these and recorded them as gaps. Its test asserted the default path only, so the preseq and GFF branches never ran, and coverage values were not compared with a `genomecov` run. With `skip_trimming` the source never drops a library on read count, while counting after alignment still would.
  - Confidence: low
  - Missing: an expert view on which deviations matter; a coverage comparison.
- How is scientific comparability established without a source run?
  - Proposed: compare later builds with build v0's measured values on the `test` inputs, and take a reference run of nf-core/atacseq 2.1.2 when an environment with Nextflow is available.
  - Evidence: Nextflow and Java are absent on the agent host, and the source ships no expected outputs. Build v0 measured: genome size 11,622,260 (khmer at k = 50 gives 11,624,332); merged-library peaks 634–1549 per library with FRiP 0.32–0.44; merged-replicate peaks 1134 and 1291 with FRiP 0.45 and 0.42; consensus 1902 (merged library) and 1367 (merged replicate) intervals. These are reference values, not a source comparison.
  - Confidence: low
  - Missing: John's definition of "comparable" and whether a reference run is wanted.
- Which non-default paths must the tests exercise?
  - Proposed: the source CI's parameter variants, `--skip_trimming`, `--skip_merge_replicates` and `--skip_consensus_peaks` (`.github/workflows/ci.yml:65-67`), plus a case where consensus has a single sample and is skipped, and a preseq-on case.
  - Evidence: build v0 tested the default path only. Untested there: the MultiQC report when a `skip_*` toggle removes one of its inputs; the merged-replicate result when `skip_merge_replicates` removes every replicate-level peak call; the more-than-one-sample consensus gate (not built); replicate-level counting when a merged-replicate sample has zero peaks (the source drops its BAMs, `workflows/atacseq.nf:638-640`; build v0 kept them).
  - Confidence: medium
  - Missing: how many test cases the expert wants given about an hour per planemo attempt.

### Decisions

- John (2026-10-29): scope is the whole pipeline, including the merged-replicate level.
- John (2026-10-29): `macs_gsize` derivation stays in scope; how it is supplied is decided below.
- John: no Galaxy requirements beyond the objective and scope.
- Agent decision, for expert review: pipeline plumbing (parameter validation, version collation, e-mails, nf-core utility code) is excluded as non-scientific. Neither John nor the coordinator stated it.
- Agent decision, for expert review: where John's whole-pipeline scope meets source branches that are gated on optional inputs or off by default (controls, blacklist, preseq, alternative aligners, narrow peaks), they are kept in scope and the conflicts recorded as open questions, not blockers.
- The MACS2 genome size is an optional numeric input. When it is absent, it is the number of distinct canonical k-mers of the genome FASTA with k = read length, so a read length is then required. An exact count may replace khmer's estimate (`modules/nf-core/khmer/uniquekmers/main.nf:25-31`) within 1% of khmer's value (agent tolerance, for expert review). iGenomes' per-genome values are supplied through the same input, not looked up. Proven in build v0: the fallback ran, and the green test asserted 11,622,260 against khmer's 11,624,332 at k = 50 (0.018%). Was an open question (medium) at v0.
- One run accepts both single- and paired-end samples; layout is per sample and switches the alignment filter flags, orphan removal and insert-size rules, the MACS2 `BAM`/`BAMPE` format and the bigWig fragment handling (`bin/check_samplesheet.py:123`, `:126`; `modules/nf-core/macs2/callpeak/main.nf:30`; `conf/modules.config:396`). Proven in build v0 on the 4 paired-end and 4 single-end runs; the test asserted no singletons in paired-end libraries after orphan removal. Was an open question (high) at v0.
- Runs and replicates group as in the source: runs sharing sample and replicate merge into one library (`workflows/atacseq.nf:261`, `:264`); replicates of a sample merge at the merged-replicate level (`:529`, `:533`), and only samples with more than one replicate continue (`:536`). Proven in build v0: 8 runs became 6 libraries and 2 merged-replicate samples. Was an open question (high) at v0.
- Reference inputs are explicit: a genome FASTA and a GTF or GFF (converted to GTF), plus the optional blacklist, mitochondrial chromosome name, gene BED and TSS BED. Proven in build v0 with FASTA and GTF; the GFF path was built but not run. The aligner index is an open question. Was an open question (medium) at v0.
- The blacklist is optional: with one, include regions are the genome minus the blacklist; without one, whole chromosomes. Either way the mitochondrial chromosome is removed unless `keep_mito` (`modules/local/genome_blacklist_regions.nf:25`, `:28`, `:37`). Proven in build v0 without a blacklist; the blacklist path was built but not run. Was an open question (high) at v0.
- Broad and narrow peaks are both selectable per run, broad (cutoff 0.1) by default (`conf/modules.config:597`; `nextflow.config:48-49`). Proven in build v0 for broad peaks at both levels; the narrow variants were built and validated but skipped in the test. Was an open question (high) at v0.
- The merged-replicate level keeps the source's differences from the merged-library level: (a) duplicates removed, not marked (`conf/modules.config:756` vs `:358`); (b) no BAM re-filtering (`workflows/atacseq.nf:523-525`, `:545`); (c) MACS2 without `macs_pvalue`/`macs_fdr` (`conf/modules.config:820-825`), which behaves as MACS2's default q 0.05; (d) consensus counts the per-replicate merged-library BAMs (`workflows/atacseq.nf:638-640`, `:540`); (e) consensus with the script default of one replicate (`conf/modules.config:892`; `bin/macs2_merged_expand.py:42-45`). (c) and (e) may be source oversights. Proven in build v0 on `T0_PE` and `T100_SE` (1367 consensus intervals). Was an open question (medium) at v0.
- preseq is included as an optional step, off by default (`skip_preseq = true`, `nextflow.config:66`; `workflows/atacseq.nf:318`). Built in build v0 and skipped by default in its test. Was an open question (medium) at v0.
- The behaviour of the pipeline's own scripts is reproduced where it defines results: FRiP (`modules/local/frip_score.nf:24-26`), the autosome list (`bin/get_autosomes.py`, including its quirk that a mixed-case `chrUn` needle never matches), consensus expansion with interval naming and SAF (`bin/macs2_merged_expand.py`) and paired-end orphan and non-FR pair removal (`bin/bampe_rm_orphan.py --only_fr_pairs`, `conf/modules.config:440`). Proven in build v0 (green test asserted FRiP, consensus counts and paired-end flag statistics). The R plots and DESeq2 QC are an open question. Was part of an open question (medium) at v0.
- The source's `test` profile inputs are the primary equivalence case: the mixed 8-run sheet, `read_length = 50`, `mito_name = 'MT'`, `fingerprint_bins = 100`, FASTA and GTF, and no blacklist or `macs_gsize` (`conf/test.config:23-32`). `test_full` (hg19, `conf/test_full.config:24`) is excluded from routine testing. Proven in build v0 (green in about 59 minutes). Controls and aligner tests are open questions. Was an open question (medium) at v0.
- The MultiQC report is a workflow output, alongside every per-step QC file (`workflows/atacseq.nf:700`). Proven in build v0 (green test). Its completeness and the IGV session stay open. Was part of an open question (low) at v0.

### Related artifacts

- `summary-nextflow.json`: process topology, containers, parameters (90), reference assets and rebuilds, test candidates and `test_selection`, and correction-pass warnings.
- `summary-nextflow.cli.json`: the raw CLI summary before correction.
- `phase1-notes.md`: phase-1 source facts with cites, including the fetched test sample-sheet contents.
- `environment-probes.txt`: the seed's environment preflight.
- Build v0 run: `~/foundry-runs/prose-wb2g-atacseq-v0-2026-10-29/` (planemo green on attempt 3; ledger `open-requirements.ledger.yml`; IWC comparison `iwc-comparison-notes.md`; test-data checksums `test-data-refs.json`; kept test outputs under `.scratch/test-outputs/attempt3/`).

## Agent Environment

Observed on the agent host from the build v0 preflight (2026-10-29T21:35Z, `preflight.md`) and the build v0 run, unless marked as requirements or unknowns. John stated no tooling or container requirements.

### Tooling

- `gxwf` and `galaxy-tool-cache`: not on PATH globally; run from the Foundry worktree's `node_modules/.bin` (1.15.0).
- `foundry`: not on PATH globally; a run-local shim runs the worktree build (node v26.13.0).
- `planemo`: not on PATH; 0.75.47 runs through `uvx --from planemo==0.75.47`, with Galaxy `release_26.1` from `~/.planemo/gx_venv_3_release_26.1`. A one-tool warm-up took about 2 minutes.
- Galaxy `release_26.1` evaluates negated, compound, null-test and string-compare workflow `when` expressions (build v0 probes). planemo reports outputs of a `when`-skipped step as missing, so a test must not assert them.
- planemo 0.75.47 needs `element_tests` on a collection output test; `element_count` alone fails with "No path specified" (build v0 attempt 2; planemo #1705). Its workflow lint flags a Tool Shed changeset that is not installable, and it installs only repositories named with a full pin.
- Nextflow, nf-test, a Java runtime, khmer, conda, Singularity and Apptainer are absent. The source pipeline cannot be run here as a reference.
- The Tool Shed API, quay.io and nf-core test-datasets on raw.githubusercontent.com are reachable.
- `make fixtures-iwc` exits 2 (gxwf convert-tree fails on uncached tools) but writes all 120 IWC workflows; skeletons need a separate `make fixtures-skeletons`.
- Required versions: none stated by John. Galaxy no older than `release_26.1` for builds (orchestrator constraint).

### Constraints

- Host: Linux x86_64, 4 CPUs, 14 GiB RAM plus 16 GiB swap, about 437 GB free disk. Other pipeline runs share the host.
- `/tmp` is a RAM-backed tmpfs. Point `TMPDIR` for planemo at a short on-disk path (build v0: `/var/tmp/atw`); a long path breaks Galaxy's celery socket.
- Build v0's planemo attempts took 44–62 minutes each (one test case, about 355 jobs: 340 ok, 15 skipped). Peak memory used was 6.6–8.9 GB with no OOM; kept outputs were 127 MB. Each extra test case adds comparable time.
- Brief production installs nothing, pulls no containers and downloads no data. Workflow builds may fetch test data and Tool Shed tools and pull the containers the workflow test needs.

### Containerization

- Docker 29.1.3, native linux/amd64, overlayfs; registry pulls from quay.io work. Build v0 ran every tool from biocontainers.
- Singularity, Apptainer and Podman are absent. Conda and Mamba are absent from PATH.
- Container preference: none stated by John or the coordinator.
