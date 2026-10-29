# Workflow Brief: nf-core/atacseq 2.1.2 (whole pipeline)

## Workflow

### Objective

John: "Convert the whole pipeline to an equivalent Galaxy workflow." The workflow takes ATAC-seq FASTQ libraries described by a sample sheet, plus a genome FASTA and gene annotation. It produces the source's scientific results at two levels. The merged-library level merges the sequencing runs of each sample replicate. The merged-replicate level merges the replicates of each sample. Results at each level are filtered alignments, normalised coverage tracks, called and annotated peaks, consensus peak sets with read counts and DESeq2-based sample QC, and ATAC-specific QC.

### Sources

- Source: nf-core/atacseq, `manifest.version = '2.1.2'` (`nextflow.config:289`), commit `1a1dbe52ffbd82256c941a032b0e22abbd925b8a` (coordinator pin `1a1dbe52`, full SHA from the fixture). MIT licence. Repository https://github.com/nf-core/atacseq.
- Expert intent: John's objective and scope (quoted in Objective and Decisions), from `caller-request.md`.
- Source evidence: `summary-nextflow.json` (phase-1 CLI output plus a correction pass) and `phase1-notes.md`. Every `path:N` cite below is relative to the fixture root and was re-read with numbered output for this brief.
- The source has no nf-test suite (no `tests/`, no `nf-test.config`). Its test evidence is three test profiles, `test`, `test_controls` and `test_full` (`nextflow.config:225-227`), plus a CI parameter matrix (`.github/workflows/ci.yml:65-70`).

### Scope

#### Included

John's scope is the whole pipeline, including the merged-replicate level. It covers every scientific analysis the source can run under some parameter setting. Process-level topology stays in `summary-nextflow.json`.

- Reference preparation from FASTA and GTF or GFF. It derives the gene BED, TSS BED, chromosome sizes and FASTA index, the autosome list and the include-regions BED (genome minus blacklist, and minus the mitochondrial chromosome unless `keep_mito`). It builds the aligner index when none is supplied, and derives the MACS2 genome size with khmer when `macs_gsize` is unset (`subworkflows/local/prepare_genome.nf:230-238`; John keeps this in scope).
- Sample-sheet validation and run/replicate structure (`bin/check_samplesheet.py`, run by `SAMPLESHEET_CHECK` at `subworkflows/local/input_check.nf:15-17`).
- Read QC (FastQC) and adapter/quality trimming (Trim Galore). Libraries with fewer post-trim reads than `min_trimmed_reads` are dropped: `.filter { meta, reads, num_reads -> num_reads >= min_trimmed_reads.toFloat() }` (`subworkflows/nf-core/fastq_fastqc_umitools_trimgalore/main.nf:99`).
- Alignment with one of four aligners, selected by `params.aligner` (`workflows/atacseq.nf:168`, `:189`, `:211`, `:236`), with samtools sort, index and stats.
- Merged-library level, per sample replicate:
  - merge the runs, then mark duplicates without removing them (`--REMOVE_DUPLICATES false`, `conf/modules.config:358`);
  - filter alignments to the include regions and by flags, mapping quality, mismatches, soft clips, insert size and orphan mates (see Inputs and outputs);
  - optional preseq library complexity, Picard metrics, a CPM-scaled bigWig, deepTools gene-body and TSS profiles, and a deepTools fingerprint;
  - MACS2 peak calling, FRiP and peak counts, HOMER annotation and R peak-QC plots;
  - consensus peaks across samples, featureCounts and DESeq2 QC;
  - ataqv per library, aggregated with mkarv.
- Merged-replicate level, `if (!params.skip_merge_replicates)` (`workflows/atacseq.nf:520`), for samples with more than one replicate (`if (bams.size() > 1)`, `workflows/atacseq.nf:536`). It merges the filtered replicate BAMs, removes duplicates (`--REMOVE_DUPLICATES true`, `conf/modules.config:756`), and runs bigWig, MACS2, annotation and QC, and consensus with counting and DESeq2 QC.
- Optional pairing of each sample with a control (input) library at both levels (`if (params.with_control)`, `workflows/atacseq.nf:385` and `:582`).
- Reporting: a MultiQC report over the QC above (`if (!params.skip_multiqc)`, `workflows/atacseq.nf:700`) and an IGV session file (`if (!params.skip_igv)`, `workflows/atacseq.nf:660`). Whether these are workflow outputs is an open question.

#### Excluded

- Pipeline plumbing, which is not scientific work (agent decision, consistent with the coordinator's context): nf-validation parameter checks and help, iGenomes existence errors, software-version collation (`CUSTOM_DUMPSOFTWAREVERSIONS`, `workflows/atacseq.nf:693-695`), completion e-mail and notifications (`workflow.onComplete`, `workflows/atacseq.nf:766`), and nf-core template utility code under `lib/`. The validation rules in `lib/WorkflowAtacseq.groovy` that encode scientific input requirements remain as evidence for the input contract (see Inputs and outputs).
- UMI extraction. The source passes `with_umi` as the literal `false` (`workflows/atacseq.nf:152`), so it never runs.
- Publish-directory layout and file naming, except where a scientific output depends on them (see the IGV question).

### Inputs and outputs

Inputs, as source facts. Required/optional is source behaviour, not a Galaxy interface decision.

- Sample sheet (required): `ch_input = file(params.input)` (`workflows/atacseq.nf:20`). The header must start with `["sample", "fastq_1", "fastq_2", "replicate"]`, or with `["sample", "fastq_1", "fastq_2", "replicate", "control", "control_replicate"]` when `with_control` is set (`bin/check_samplesheet.py:55-58`). A row is paired-end if `sample and fastq_1 and fastq_2` (`bin/check_samplesheet.py:123`) and single-end if `sample and fastq_1 and not fastq_2` (`bin/check_samplesheet.py:126`). All replicates of a sample, and all runs of a replicate, must share one layout (`bin/check_samplesheet.py:166-185`). Rows sharing sample and replicate are runs, renamed `"{}_REP{}_T{}".format(sample, replicate, idx + 1)` (`bin/check_samplesheet.py:203`).
- FASTQ reads, gzipped, single- or paired-end per sample.
- Genome FASTA (required: `if (!params.fasta)` errors, `lib/WorkflowAtacseq.groovy:16-17`). It may be gzipped (`if (params.fasta.endsWith('.gz'))`, `subworkflows/local/prepare_genome.nf:43`).
- Gene annotation, GTF or GFF (`if (!params.gtf && !params.gff)` exits, `lib/WorkflowAtacseq.groovy:20-22`). GFF is converted to GTF.
- Optional: a blacklist BED (`if (params.blacklist)`, `subworkflows/local/prepare_genome.nf:75`), a prebuilt aligner index, a gene BED, a TSS BED (`if (!params.tss_bed)` builds one, `subworkflows/local/prepare_genome.nf:111`), the mitochondrial chromosome name, and `macs_gsize`.
- `read_length` is required when `macs_gsize` is unset (`if (!params.read_length && !params.macs_gsize)` exits, `lib/WorkflowAtacseq.groovy:33-35`). The schema restricts it to `[50, 75, 100, 150, 200]` (`nextflow_schema.json:36-41`).
- In the source, `--genome` fills reference parameters from iGenomes (`main.nf:20-31`), including `params.macs_gsize = WorkflowMain.getMacsGsize(params)` (`main.nf:31`).

Outputs (scientific roles, per level unless stated):

- Prepared references: gene BED, TSS BED, chromosome sizes, include-regions BED, and the genome size used by MACS2.
- Filtered, coordinate-sorted, indexed alignments. The merged-library filter applies samtools `meta.single_end ? '-F 0x004' : '-F 0x004 -F 0x0008 -f 0x001'`, `params.keep_dups ? '' : '-F 0x0400'` and `params.keep_multi_map ? '' : '-q 1'` (`conf/modules.config:396-398`), and keeps only include regions (`PREPARE_GENOME.out.filtered_bed.first()`, `workflows/atacseq.nf:302`).
- Normalised coverage tracks (bigWig).
- Peaks (broad by default, or narrow), with FRiP scores and peak counts. FRiP is the count of reads in peaks over mapped reads (`modules/local/frip_score.nf:24-26`, `ext.args = '-bed -c -f 0.20'`, `conf/modules.config:611`). Also HOMER annotations and the R QC plots.
- Consensus peak sets (BED and SAF), a featureCounts count matrix, and DESeq2 QC (PCA, sample clustering, optional VST counts).
- ATAC QC: ataqv per-library metrics and the mkarv aggregate (merged-library level only), deepTools profiles and fingerprints, Picard metrics, optional preseq curves, and FastQC/Trim Galore reports.
- Reports: the MultiQC report and the IGV session (see Open questions).

### Requirements and preferences

- John: the result must be "an equivalent Galaxy workflow" to the whole pipeline. Equivalence is with the source's scientific behaviour at commit `1a1dbe52`, including the merged-replicate level (strength: required).
- John: `macs_gsize` "stays in scope — how it's supplied is a question for the brief, not a reason to drop it" (strength: required).
- John: no other Galaxy requirements. The terminal artifact of this run is the brief.
- Source: default behaviour is part of equivalence. Broad peaks (`narrow_peak = false`, `broad_cutoff = 0.1`, `nextflow.config:48-49`), BWA (`aligner = 'bwa'`, `nextflow.config:38`), no controls (`with_control = false`, `nextflow.config:17`), preseq off (`skip_preseq = true`, `nextflow.config:66`), merged-replicate level on (`skip_merge_replicates = false`, `nextflow.config:43`).

### Acceptance criteria

- On the source's `test` inputs, the workflow completes both levels. It must handle the mixed single-/paired-end sheet, run merging and replicate merging, and derive the MACS2 genome size from the FASTA because no `macs_gsize` is given (`conf/test.config:23-29`).
- At each level, peaks, consensus peaks, counts and DESeq2 QC come out for the samples the source would keep. Samples below `min_trimmed_reads` and samples with zero peaks (`peaks.size() > 0`, `subworkflows/local/bam_peaks_call_qc_annotate_macs2_homer.nf:48`) drop out of downstream steps as in the source. Consensus needs more than one sample (`.filter { it.size() > 1 }`, `subworkflows/local/bed_consensus_quantify_qc_bedtools_featurecounts_deseq2.nf:31`).
- With controls enabled and a control-bearing sheet, MACS2 receives the matched control at both levels (`def control = controlbam ? "--control $controlbam" : ''`, `modules/nf-core/macs2/callpeak/main.nf:31`).
- Results are scientifically comparable to an nf-core/atacseq 2.1.2 run on the same inputs and parameters: peak sets, FRiP and count matrices. The comparison method and tolerances belong to test development.

### Open questions

- How is the MACS2 genome size (`macs_gsize`) supplied?
  - Proposed: an optional numeric genome-size input. When it is absent, compute it from the genome FASTA as the source does: the count of unique k-mers with k = read length, so a read length becomes required in that case. iGenomes' precomputed per-genome, per-read-length values are not looked up automatically; an expert supplies such a value through the same optional input.
  - Evidence: `ch_macs_gsize = params.macs_gsize` and `if (!params.macs_gsize)` → `KHMER_UNIQUEKMERS ( ch_fasta, params.read_length )` (`subworkflows/local/prepare_genome.nf:230-238`). The module runs `unique-kmers.py -k $kmer_size -R report.txt $args $fasta` and keeps the `^number` line as the value (`modules/nf-core/khmer/uniquekmers/main.nf:25-31`). The value reaches MACS2 as `--gsize $macs2_gsize` (`modules/nf-core/macs2/callpeak/main.nf:42`). The iGenomes table is keyed by `params.read_length.toString()` (`lib/WorkflowMain.groovy:61-66`; e.g. GRCh37 `"50"  : 2684219875`, `conf/igenomes.config:26`). The source warns that it "will be auto-calculated by 'khmer unique-kmers.py' using the '--read_length' parameter" (`lib/WorkflowAtacseq.groovy:155`). John keeps the derivation in scope.
  - Confidence: medium
- Must one run accept both single-end and paired-end samples?
  - Proposed: yes. Layout is per sample, and it switches the alignment filter flags, paired-end orphan removal and insert-size rules, the MACS2 `BAM`/`BAMPE` format and the bigWig fragment handling, as in the source.
  - Evidence: per-row layout (`bin/check_samplesheet.py:123`, `:126`), with mixing forbidden only within a sample (`bin/check_samplesheet.py:166-185`). `def format = meta.single_end ? 'BAM' : 'BAMPE'` (`modules/nf-core/macs2/callpeak/main.nf:30`). Flag filter (`conf/modules.config:396`). Phase-1 notes report that the fetched `test` sheet has two paired-end and two single-end samples.
  - Confidence: high
- How are runs and replicates grouped at the two levels?
  - Proposed: as in the source. Runs sharing sample and replicate merge into one library; the `_T<n>` suffix is stripped and the BAMs grouped (`meta_clone.id = meta_clone.id - ~/_T\d+$/`, `workflows/atacseq.nf:261`, `.groupTuple(by: [0])`, `:264`). Replicates of a sample then merge at the merged-replicate level (`meta_clone.id - ~/_REP\d+$/`, `workflows/atacseq.nf:529`, `.groupTuple()`, `:533`), and only samples with more than one replicate continue (`workflows/atacseq.nf:536`).
  - Evidence: as cited. Run ids come from `bin/check_samplesheet.py:203`. John explicitly keeps the merged-replicate level.
  - Confidence: high
- Are control (input) libraries supported, and how are they enabled?
  - Proposed: yes, optionally, at both levels. When the sample sheet carries `control`/`control_replicate` columns, pair each sample with its control for MACS2. Without them, call peaks without a control, which is the source default.
  - Evidence: `with_control = false` (`nextflow.config:17`). The six-column header applies only with `with_control` (`bin/check_samplesheet.py:55-58`, passed as `params.with_control ? "--with_control" : ''`, `conf/modules.config:28`). Pairing happens at `workflows/atacseq.nf:385` and `:582`. Conflict: the `test_controls` profile changes only `input` (`conf/test_controls.config:23`), and CI runs `-profile test_controls,docker` without `--with_control` (`.github/workflows/ci.yml:56`), so the source's control test never pairs controls. John's "whole pipeline" covers the control branch.
  - Confidence: medium
- Which reference inputs does the workflow take, given the source's iGenomes lookup?
  - Proposed: explicit inputs: a genome FASTA and a GTF (or a GFF, converted to GTF), plus the optional blacklist, mitochondrial chromosome name, prebuilt aligner index, gene BED and TSS BED. The `--genome` iGenomes key lookup is not reproduced; an expert who wants an iGenomes build supplies its files and values directly.
  - Evidence: iGenomes getters for fasta, indexes, gtf, gff, gene_bed, tss_bed, blacklist and mito_name (`main.nf:20-30`). `conf/igenomes.config` defines a blacklist for six genomes only (`conf/igenomes.config:24`, `:42`, `:69`, `:452`, `:471`, `:490`). The `test` profile supplies FASTA and GTF URLs and no genome key (`conf/test.config:28-29`). `test_full` uses `genome = 'hg19'` (`conf/test_full.config:24`).
  - Confidence: medium
- How is the blacklist handled when none is given?
  - Proposed: as in the source. The blacklist is optional. With one, the include regions are the genome minus the blacklist; without one, they are whole chromosomes. Either way the mitochondrial chromosome is removed unless `keep_mito`.
  - Evidence: `sortBed -i $blacklist -g $sizes | complementBed -i stdin -g $sizes $mito_filter` (`modules/local/genome_blacklist_regions.nf:28`), the else branch `awk '{print \$1, '0' , \$2}' ... $sizes $mito_filter` (`:37`), and `def mito_filter = keep_mito ? '' : name_filter` (`:25`).
  - Confidence: high
- Which aligners must the workflow offer?
  - Proposed: all four source aligners (BWA by default; Bowtie2, Chromap and STAR as alternatives), selected per run, because John asked for the whole pipeline.
  - Evidence: `aligner = 'bwa'` (`nextflow.config:38`). Branches `if (params.aligner == 'bwa')`, `'bowtie2'`, `'chromap'` and `'star'` (`workflows/atacseq.nf:168`, `:189`, `:211`, `:236`). CI exercises `--aligner bowtie2`, `chromap` and `star` (`.github/workflows/ci.yml:68-70`).
  - Confidence: medium
- Broad or narrow peaks?
  - Proposed: both, selectable per run, with broad peaks (cutoff 0.1) as the default, as in the source.
  - Evidence: `params.narrow_peak ? '' : "--broad --broad-cutoff ${params.broad_cutoff}"` (`conf/modules.config:597`), with defaults `narrow_peak = false` and `broad_cutoff = 0.1` (`nextflow.config:48-49`).
  - Confidence: high
- Should the merged-replicate level keep the source's differences from the merged-library level?
  - Proposed: yes, all of them. (a) Duplicates are removed, not marked. (b) There is no BAM re-filtering. (c) MACS2 ignores `macs_pvalue`/`macs_fdr`. (d) Replicate-level consensus counts the per-replicate merged-library BAMs, not the merged-replicate BAM. (e) Its consensus takes no `min_reps_consensus`, so the script default of 1 applies.
  - Evidence: (a) `--REMOVE_DUPLICATES true` (`conf/modules.config:756`) vs `false` (`:358`). (b) Input is the filtered merged-library BAM (`workflows/atacseq.nf:523-525` feeds `PICARD_MERGESAMFILES_REPLICATE` at `:545`). (c) Replicate MACS2 args omit `--pvalue`/`--qvalue` (`conf/modules.config:820-825`), while the library args carry them (`:599-600`). (d) `MERGED_REPLICATE_CONSENSUS_PEAKS ( ..., ch_merged_library_replicate_bam, ...)` (`workflows/atacseq.nf:638-640`), set from the grouped merged-library BAMs (`:540`). (e) Only `ext.prefix` is set (`conf/modules.config:892`) vs `"--min_replicates ${params.min_reps_consensus}"` (`:668`), and the script has `default=1` (`bin/macs2_merged_expand.py:42-45`). Equivalence (John) favours keeping them; (c) and (e) may be source oversights.
  - Confidence: medium
- Is preseq, which the source skips by default, part of the workflow?
  - Proposed: yes, as an optional step that is off by default, keeping the source default while covering the "whole pipeline".
  - Evidence: `skip_preseq = true` (`nextflow.config:66`); `if (!params.skip_preseq)` (`workflows/atacseq.nf:318`). The other QC steps are on by default (`nextflow.config:63-71`).
  - Confidence: medium
- Are the results of the pipeline's own scripts in scope as scientific outputs? These are FRiP, the MACS2 and HOMER QC plots, consensus expansion, DESeq2 QC, paired-end orphan removal and autosome extraction (`bin/`).
  - Proposed: yes. They define peak QC, consensus membership and the filtered alignments, so equivalence requires their behaviour. Their numeric results are the comparison target, not the scripts themselves.
  - Evidence: `bin/` holds `bampe_rm_orphan.py`, `deseq2_qc.r`, `get_autosomes.py`, `macs2_merged_expand.py`, `plot_homer_annotatepeaks.r` and `plot_macs2_qc.r`, among others. The FRiP computation is inline (`modules/local/frip_score.nf:24-26`). Peak QC plots run only when annotation runs (`if (!skip_peak_annotation)`, `subworkflows/local/bam_peaks_call_qc_annotate_macs2_homer.nf:94`, nesting `if (!skip_peak_qc)`, `:106`).
  - Confidence: medium
- Is ataqv in scope as specified, on the duplicate-marked unfiltered BAM?
  - Proposed: yes, as in the source: merged-library level only, on the duplicate-marked BAM with that library's peaks, the TSS BED and autosomes, and the mitochondrial reference.
  - Evidence: `ch_bam_peaks` joins `MERGED_LIBRARY_MARKDUPLICATES_PICARD.out.bam` with its peaks (`workflows/atacseq.nf:477-482`); `if (!params.skip_ataqv)` (`:487`). Mitochondrial reference: `if (!params.ataqv_mito_reference && params.mito_name)` falls back to `mito_name` (`workflows/atacseq.nf:23-26`). `ext.args = '--ignore-read-groups'` (`conf/modules.config:725`).
  - Confidence: medium
- Which data should first establish equivalence?
  - Proposed: the `test` profile inputs as the primary case. They cover mixed single-/paired-end samples, run and replicate merging, the khmer genome-size path, broad peaks and BWA. Second, `test_controls` with controls explicitly enabled, which the source's own CI never does. CI's aligner variants come third. `test_full` (hg19, reference-scale) is excluded from routine testing.
  - Evidence: `conf/test.config:23-29` (sheet, `read_length = 50`, `mito_name = 'MT'`, FASTA and GTF URLs; no genome, blacklist or `macs_gsize`), and `fingerprint_bins = 100` (`conf/test.config:32`). The summary's `test_selection` picks `profile:test`. `conf/test_controls.config:23`; `.github/workflows/ci.yml:56`, `:65-70`. `conf/test_full.config:18-24`.
  - Confidence: medium
- Which QC and reporting artifacts are workflow outputs: the MultiQC report and the IGV session?
  - Proposed: keep the MultiQC report as an output. Drop the IGV session file: it is built from the source's publish-directory paths, so it has no meaning outside that layout. All per-step QC files stay as outputs.
  - Evidence: MultiQC `if (!params.skip_multiqc)` (`workflows/atacseq.nf:700`). The IGV module takes bigWigs, peaks and consensus BEDs plus path strings such as `"${params.aligner}/merged_library/bigwig"` (`workflows/atacseq.nf:660-685`).
  - Confidence: low
  - Missing: whether John wants an aggregate QC report and a genome-browser session as deliverables, and in what form.
- Which tunable source parameters become workflow parameters?
  - Proposed: expose the science-affecting ones with source defaults: aligner, narrow/broad peaks and broad cutoff, MACS2 p/q thresholds, controls, `keep_dups`, `keep_multi_map`, `keep_mito`, `min_trimmed_reads`, `min_reps_consensus`, `fragment_size`, read-clipping options, `deseq2_vst`, and the per-step skips. Leave resource, publishing and plumbing parameters out.
  - Evidence: `summary-nextflow.json` `params[]` (90 parameters) and the defaults at `nextflow.config:12-71`.
  - Confidence: low
  - Missing: the expert's preferred interface breadth.

### Decisions

- John (2026-10-29): scope is the whole pipeline, including the merged-replicate level.
- John (2026-10-29): `macs_gsize` derivation stays in scope; how it is supplied is the first open question.
- John: no Galaxy requirements beyond the objective and scope.
- Agent decision, for expert review: pipeline plumbing (parameter validation, version collation, e-mails, nf-core utility code) is excluded as non-scientific. This follows the coordinator's context; John did not state it.
- Agent decision, for expert review: where John's whole-pipeline scope meets source branches that are gated on optional inputs or off by default (controls, blacklist, preseq, alternative aligners, narrow peaks), they are kept in scope and the conflicts recorded as open questions, not blockers.

### Related artifacts

- `summary-nextflow.json`: process topology, containers, parameters (90), reference assets and rebuilds, test candidates and `test_selection`, and correction-pass warnings.
- `summary-nextflow.cli.json`: the raw CLI summary before correction.
- `phase1-notes.md`: phase-1 source facts with cites, including the fetched test sample-sheet contents.
- `environment-probes.txt`: the environment preflight used below.

## Agent Environment

Observed facts come from `environment-probes.txt` (2026-10-29T21:05:05Z). No tools were installed, no containers pulled and no data downloaded for this brief.

### Tooling

- Requested by the pipeline contract: `foundry`, `gxwf` and `planemo`.
- Observed on PATH: `docker` (`/usr/bin/docker`), `uvx` and `node` v26.13.0.
- Observed absent from PATH: `gxwf`, `planemo`, `foundry`, `summarize-nextflow`, `nextflow`, `nf-test`, `java`, `singularity`, `apptainer`, `podman`, `conda`, `mamba`, `galaxy-tool-cache` and `khmer`.
- Observed off PATH: a worktree `gxwf` reports `1.15.0`. Run-local shims exist for `foundry` and `summarize-nextflow` (both `--help` exit 0) and for `planemo` (via `uvx --from planemo==0.75.47`, which reports version 0.75.47). The `foundry` validator matched this bundle's workflow-brief schema hash (exit 0).
- Unknown: whether downstream stages will use these shims or other installations.

### Constraints

- Host: Linux x86_64, 4 CPUs, about 15 GB memory (about 11.5 GB available at probe time), 16 GB swap, 437 GB free on `/`.
- Coordinator context: small source-referenced metadata (under 1 MB) may be fetched; no reads, containers or genomes. That applied to this run; constraints for later stages are unknown.
- Probes count one running `galaxy` process and no `planemo` process. They note these counts are upper bounds and that a concurrent driver for another pipeline runs on the same host.
- Unknown: network access to Galaxy servers, the Tool Shed and test-data hosts for later stages.

### Containerization

- Docker 29.1.3 (linux/amd64, overlayfs driver, 4 CPUs, about 15.7 GB) is present. `hello-world` ran with pull disabled.
- Cached images relevant to the source tools include `quay.io/biocontainers/multiqc:1.33--pyhdfd78af_0`, `samtools:1.22--h96c455f_0`, `samtools:1.21--h96c455f_1`, `picard:3.1.1--hdfd78af_0`, `fastqc:0.12.1--hdfd78af_0` and `bowtie:1.2.0--py36_0` (37 cached images in total).
- Singularity, Apptainer and Podman are absent from PATH.
- Container preference: none stated by John or the coordinator.
