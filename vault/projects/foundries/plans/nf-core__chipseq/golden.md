# Workflow Brief: nf-core/chipseq 2.1.0 (whole pipeline)

## Workflow

### Objective

John: "Convert the whole pipeline to an equivalent Galaxy workflow." (from `caller-request.md`; these are the only words from John).

The source describes itself as a "ChIP-seq peak-calling and differential analysis pipeline." (`nextflow.config:291`). It takes ChIP-seq FASTQ libraries described by a sample sheet that pairs each immunoprecipitation (IP) library with an input (control) library, plus a genome FASTA and a gene annotation. Per sample replicate it produces filtered alignments, normalised coverage tracks, peaks called against the paired control (broad by default, narrow on request), annotated peaks and ChIP-specific QC. Per antibody it produces consensus peaks, read counts over them and DESeq2-based sample QC. A genome-browser session and an aggregate QC report summarise the run. The source's DESeq2 step is QC only: it computes PCA (`ntop <- c(500, Inf)`, `bin/deseq2_qc.r:150`) and sample distances (`bin/deseq2_qc.r:194`). It does not test contrasts.

### Sources

- Source: nf-core/chipseq, `version = '2.1.0'` (`nextflow.config:294`), commit `76e2382b6d443db4dc2396e6831d1243256d80b0` (coordinator pin `76e2382b`; full SHA from `git rev-parse HEAD` in the fixture). MIT licence. Repository https://github.com/nf-core/chipseq. Every `path:N` cite below is relative to the fixture root `workflow-fixtures/pipelines/nf-core__chipseq` and was re-read with numbered output for this brief.
- Expert intent: John's objective only. Coordinator context and the driver's reading come from `caller-request.md`. Neither is John's; this brief labels each where it uses them.
- Source evidence: `summary-nextflow.json` (phase-1 CLI output plus a correction pass) and `phase1-notes.md` (phase-1 source facts with cites). Where this brief restates a condition, it quotes the source expression.
- Environment evidence: `environment-probes.txt` (probes taken 2026-10-30T17:10:09Z).
- Known traps: the sibling atacseq golden brief v1 (`vault/projects/foundries/plans/nf-core__atacseq/golden.md`). It was consulted only for the genome-size derivation trap; no chipseq fact is taken from it.
- Test evidence: the source has no nf-test suite and no `tests/` directory. It has two test profiles, `test` and `test_full` (`nextflow.config:228-229`), and a CI matrix over parameters and aligners (`.github/workflows/ci.yml:52-53`, `.github/workflows/ci.yml:74-76`).

### Scope

#### Included

The scope is every scientific analysis the source can run under some parameter setting (driver's reading of John's objective). The coordinator's context adds that IP/control pairing, the `macs_gsize` derivation and the alternative aligners stay in scope. How optional or selectable parts are supplied or chosen is an open question below, not a scope cut. Process topology stays in `summary-nextflow.json`.

- Reference preparation (`subworkflows/local/prepare_genome.nf`):
  - decompress a gzipped FASTA, GTF, GFF, blacklist or gene BED;
  - convert GFF to GTF when no GTF is given (`subworkflows/local/prepare_genome.nf:68-75`);
  - derive a gene BED from the GTF unless one is given (`subworkflows/local/prepare_genome.nf:98-108`);
  - derive the FASTA index and chromosome sizes (`subworkflows/local/prepare_genome.nf:122-124`);
  - derive the include-regions BED: genome minus blacklist with a blacklist (`modules/local/genome_blacklist_regions.nf:27`), or whole chromosomes without one (`modules/local/genome_blacklist_regions.nf:36`);
  - build the selected aligner's index, or unpack or use a supplied one (`subworkflows/local/prepare_genome.nf:143-208`).
- MACS3 genome-size derivation when `macs_gsize` is unset: `if (!params.macs_gsize)` runs `KHMER_UNIQUEKMERS ( ch_fasta, params.read_length )` (`workflows/chipseq.nf:430-436`). The module runs `unique-kmers.py -k $kmer_size` on the FASTA and keeps the reported count (`modules/nf-core/khmer/uniquekmers/main.nf:25-31`).
- Sample-sheet validation and the run/replicate/control structure (`bin/check_samplesheet.py`, run through `INPUT_CHECK`, `workflows/chipseq.nf:111-114`).
- Read QC (FastQC) and adapter/quality trimming (Trim Galore), with the post-trim read-count filter (see Acceptance criteria).
- Alignment with one of four aligners, selected by `params.aligner`: `'bwa'`, `'bowtie2'`, `'chromap'` or `'star'` (`workflows/chipseq.nf:142, 163, 185, 209`). Each sorts, indexes and computes samtools stats, flagstat and idxstats (for example `subworkflows/nf-core/fastq_align_bwa/main.nf:29`).
- Per sample replicate ("merged library"):
  - merge the runs of each replicate (`workflows/chipseq.nf:238-250`);
  - mark duplicates without removing them (`--REMOVE_DUPLICATES false`, `conf/modules.config:326`);
  - filter to the include regions and by flags, mapping quality, mismatches and insert size; for paired-end data, also remove orphans and non-FR pairs (see Requirements).
- The source has no merged-replicate level. Everything after the run merge is per sample replicate.
- Alignment QC:
  - preseq library complexity on the duplicate-marked BAM (`if (!params.skip_preseq)`, `workflows/chipseq.nf:288-291`);
  - Picard CollectMultipleMetrics (`workflows/chipseq.nf:300-307`);
  - phantompeakqualtools strand cross-correlation, with NSC/RSC tables (`workflows/chipseq.nf:328-339`);
  - a CPM-scaled bigWig (`modules/local/bedtools_genomecov.nf:26`);
  - a deepTools gene-body profile and heatmap over the gene BED (`workflows/chipseq.nf:360-385`);
  - a deepTools fingerprint per IP/control pair (`workflows/chipseq.nf:417-420`).
- IP/control pairing and MACS3 peak calling, broad or narrow (`workflows/chipseq.nf:397-411`, `workflows/chipseq.nf:450-462`), followed by FRiP, peak counts, HOMER annotation and the R peak-QC plots (`subworkflows/local/bam_peaks_call_qc_annotate_macs3_homer.nf:64-130`).
- Per-antibody consensus peaks, HOMER annotation of the consensus with boolean per-sample columns, featureCounts over the consensus, and DESeq2 QC (`workflows/chipseq.nf:472-492`, `subworkflows/local/bed_consensus_quantify_qc_bedtools_featurecounts_deseq2.nf:30-134`).
- Reporting: an IGV session file (`if (!params.skip_igv)`, `workflows/chipseq.nf:504-513`) and a MultiQC report (`if (!params.skip_multiqc)`, `workflows/chipseq.nf:527-579`).

#### Excluded

- Pipeline plumbing, as non-scientific work (driver's reading, not John's or the coordinator's; for expert review):
  - nf-validation parameter checks and help;
  - software-version collation (`softwareVersionsToYAML(ch_versions)`, `workflows/chipseq.nf:520-522`);
  - completion e-mail and notifications (`subworkflows/local/utils_nfcore_chipseq_pipeline/main.nf:102-112`);
  - copying the iGenomes README to the output directory (`workflows/chipseq.nf:79-83`).

  The validation rules that encode input requirements stay as evidence for the input contract (see Inputs and outputs).
- UMI extraction. The source passes `with_umi` as the literal `false` (`workflows/chipseq.nf:126`), so the guard `with_umi && !skip_umi_extract` (`subworkflows/nf-core/fastq_fastqc_umitools_trimgalore/main.nf:47`) never holds. This is a source fact, not a scope choice.
- Publish-directory layout, file naming and the `save_*`, `publish_dir_mode`, `max_*`, `config_*`, e-mail and MultiQC-branding parameters, except where a scientific output depends on them (see the IGV question). Agent proposal, for expert review.
- The `--genome` iGenomes lookup is proposed for exclusion; references are supplied directly. This is an agent proposal, not a decision; see Open questions.

### Inputs and outputs

Inputs, as source facts. "Required" and "optional" describe source behaviour, not a Galaxy interface decision.

- Sample sheet (required; `"required": ["input", "outdir"]`, `nextflow_schema.json:13`).
  - The header must start with `HEADER = ["sample", "fastq_1", "fastq_2", "replicate", "antibody", "control", "control_replicate"]` (`bin/check_samplesheet.py:55`), checked by `if header[: len(HEADER)] != HEADER:` (`bin/check_samplesheet.py:57`).
  - A row is paired-end if `sample and fastq_1 and fastq_2` (`bin/check_samplesheet.py:142`) and single-end if `sample and fastq_1 and not fastq_2` (`bin/check_samplesheet.py:145`). All replicates of a sample, and all runs of one replicate, must share a layout (`bin/check_samplesheet.py:194-213`).
  - Replicate ids must run 1..N (`bin/check_samplesheet.py:185`). Rows sharing sample and replicate are sequencing runs, renamed `"{}_REP{}_T{}".format(sample, replicate, idx + 1)` (`bin/check_samplesheet.py:231`).
  - An antibody without a control is an error (`bin/check_samplesheet.py:113-122`), and so is a control without an antibody (`bin/check_samplesheet.py:124-137`). The control is rewritten as `"{}_REP{}".format(control, control_replicate)` (`bin/check_samplesheet.py:131`), and it must name an existing sample and replicate (`bin/check_samplesheet.py:218-226`).
  - Rows with no antibody and no control are control (input) libraries. Pairing is described under Requirements.
- FASTQ reads, gzipped (`.fastq.gz` or `.fq.gz`, `bin/check_samplesheet.py:100`), single- or paired-end per sample.
- Genome FASTA (required; `if (!params.fasta)` errors, `subworkflows/local/utils_nfcore_chipseq_pipeline/main.nf:131-132`). It may be gzipped (`if (fasta.endsWith('.gz'))`, `subworkflows/local/prepare_genome.nf:51`).
- Gene annotation, GTF or GFF: `if (!params.gtf && !params.gff)` errors (`subworkflows/local/utils_nfcore_chipseq_pipeline/main.nf:135-136`). When both are given, GTF wins with a warning (`subworkflows/local/utils_nfcore_chipseq_pipeline/main.nf:139-140`). GFF is converted with `'--keep-exon-attrs -F -T'` (`conf/modules.config:72`).
- Optional inputs (see Open questions for how each is supplied):
  - a blacklist BED (`if (blacklist)`, `subworkflows/local/prepare_genome.nf:83`);
  - a gene BED (`if (!gene_bed)` derives one, `subworkflows/local/prepare_genome.nf:99`);
  - a prebuilt aligner index (`subworkflows/local/prepare_genome.nf:143-208`);
  - `macs_gsize`.
- `read_length` is required when `macs_gsize` is unset: `if (!params.read_length && !params.macs_gsize)` errors (`subworkflows/local/utils_nfcore_chipseq_pipeline/main.nf:147-148`). The schema restricts it to `[50, 75, 100, 150, 200]` (`nextflow_schema.json:42`), and its default is `null` (`nextflow.config:16`). It sets the k-mer length of the genome-size derivation and selects the iGenomes `macs_gsize` table entry (`main.nf:165-166`). It is not used to trim or filter reads.
- In the source, `--genome` fills reference parameters from iGenomes (`main.nf:20-29`), including `params.macs_gsize = getMacsGsize(params)` (`main.nf:29`). iGenomes has no `chromap` and no `gene_bed` keys (phase-1 count over `conf/igenomes.config`), so with `--genome` the chromap index and gene BED are always built.

Outputs (scientific roles):

- Per sample replicate:
  - filtered, coordinate-sorted alignments with samtools stats, flagstat and idxstats;
  - duplicate metrics;
  - a CPM-scaled bigWig.
- Per IP library:
  - MACS3 peaks (broadPeak or narrowPeak) and the peak table;
  - FRiP and peak count;
  - HOMER-annotated peaks;
  - a fingerprint against its control.
- Across the IP libraries: the MACS3 and HOMER QC plots.
- Per antibody, when its consensus gate holds:
  - consensus peaks (BED and SAF);
  - a boolean per-sample table with HOMER annotation;
  - a featureCounts matrix.
- Per antibody, when its DESeq2 gate holds: DESeq2 QC (PCA values, sample-distance matrix and plots, size factors).
- QC: FastQC and Trim Galore reports, preseq, Picard metrics, phantompeakqualtools NSC/RSC/correlation, and deepTools profile and heatmap.
- Reports: the IGV session and the MultiQC report.

Test data (`test` profile, `conf/test.config:23-34`):

- The sample sheet is `chipseq/samplesheet/v2.1/samplesheet_test.csv` (`conf/test.config:23`). It was fetched in phase 1 (SHA-1 `a3834d509f1b8a47c4411d4a3303afd9ef981bda`).
  - It has 6 paired-end rows: `SPT5_T0` and `SPT5_T15`, replicates 1 and 2, all antibody `SPT5`.
  - Their controls are `SPT5_INPUT` replicates 1 and 2, the two control rows.
  - So one antibody has 2 groups × 2 replicates, and both the consensus and the DESeq2 gates hold.
- `read_length = 50` (`conf/test.config:24`). FASTA and GTF are the nf-core test-datasets `atacseq/reference/genome.fa` and `genes.gtf` (`conf/test.config:27-28`). There is no blacklist, gene BED, index or `macs_gsize`, so the genome-size derivation runs.
- `fingerprint_bins = 100` (`conf/test.config:31`) and `skip_preseq = true` (`conf/test.config:34`, commented "Avoid preseq errors with test data", `conf/test.config:33`).
- `test_full` uses `genome = 'hg19'` (`conf/test_full.config:24`) and `read_length = 50` (`conf/test_full.config:21`).
  - Its fetched sheet (SHA-1 `cee14cd261c0641f7c6d9e1da2ef5941f910f0ad`) has 16 single-end rows. Antibodies FOXA1 and EZH2 each have two conditions with 2 replicates, and each IP has its own input.
  - It is the only source test that exercises single-end paths.

### Requirements and preferences

- John: "Convert the whole pipeline to an equivalent Galaxy workflow." No other requirement, Galaxy or otherwise, was stated (coordinator, `caller-request.md`).
- Coordinator context (not John's words): controls (IP/input pairing), `macs_gsize` and the alternative aligners stay in scope. How they are supplied or selected is a question for this brief.
- Source behaviour that "equivalent" is read to cover (agent reading, for expert review):
  - IP/control pairing.
    - Control libraries are those whose `meta.control` is empty: `meta.control ? null : [ meta.id, [ bam ] , [ bai ] ]` (`workflows/chipseq.nf:400`).
    - IP libraries are keyed by their control: `meta.control ? [ meta.control, meta, [ bam ], [ bai ] ] : null` (`workflows/chipseq.nf:407`). They are joined with `.combine(ch_control_bam_bai, by: 0)` (`workflows/chipseq.nf:409`).
    - Controls are never peak-called, and one control may serve several IPs.
    - The source has no switch for control-free peak calling. MACS3 supports it (`controlbam ? "--control $controlbam" : ''`, `modules/nf-core/macs3/callpeak/main.nf:32`), but the pipeline always passes the paired control.
  - Run merging. Runs merge by stripping the run suffix, `meta_clone.id = meta_clone.id - ~/_T\d+$/` with `.groupTuple(by: [0])` (`workflows/chipseq.nf:238-241`), then `--SORT_ORDER coordinate` merge (`conf/modules.config:315`).
  - Alignment filter. The flags are:
    - layout: `meta.single_end ? '-F 0x004' : '-F 0x004 -F 0x0008 -f 0x001'` (`conf/modules.config:365`);
    - duplicates: `params.keep_dups ? '' : '-F 0x0400'` (`conf/modules.config:366`);
    - multi-mappers: `params.keep_multi_map ? '' : '-q 1'` (`conf/modules.config:367`).

    Reads are restricted to the include regions with `-L $bed` (`modules/local/bamtools_filter.nf:26`). The bamtools rule is `" insert_min & insert_max & mismatch "` for paired-end data, with insert size `>=-2000`/`<=2000` and `NM:<=4` (`assets/bamtools_filter_pe.json:3-10`). It is `" mismatch "` for single-end data (`assets/bamtools_filter_se.json:4`).

    Paired-end data is then name-sorted (`'-n'`, `conf/modules.config:398`), cleaned of orphans with `'--only_fr_pairs'` (`conf/modules.config:409`) and re-sorted (`subworkflows/local/bam_filter_bamtools.nf:64-85`).
  - Coverage. The scale is `1000000/$1` of the flagstat mapped count (`modules/local/bedtools_genomecov.nf:26`). Paired-end data uses `-pc` (`modules/local/bedtools_genomecov.nf:24`). Single-end data is extended with `-fs ${params.fragment_size}` when `meta.single_end && params.fragment_size > 0` (`conf/modules.config:456`). `fragment_size = 200` (`nextflow.config:14`).
  - MACS3 arguments:
    - `'--keep-dup all'`;
    - `params.narrow_peak ? '' : "--broad --broad-cutoff ${params.broad_cutoff}"`;
    - `params.save_macs_pileup ? '--bdg --SPMR' : ''`;
    - `params.macs_fdr ? "--qvalue ${params.macs_fdr}" : ''`;
    - `params.macs_pvalue ? "--pvalue ${params.macs_pvalue}" : ''`;
    - `params.aligner == "chromap" ? "--format BAM" : ''`.

    These are at `conf/modules.config:570-575`. The format is otherwise `meta.single_end ? 'BAM' : 'BAMPE'` (`modules/nf-core/macs3/callpeak/main.nf:31`), and a `--format` in the arguments overrides it (`modules/nf-core/macs3/callpeak/main.nf:33-35`). Defaults are `narrow_peak = false` and `broad_cutoff = 0.1` (`nextflow.config:42-43`).
  - FRiP is reads in peaks (`intersectBed -a $bam -b $peak $args`, with `'-bed -c -f 0.20'`) over the flagstat mapped count (`modules/local/frip_score.nf:24-26`, `conf/modules.config:585`).
  - Consensus:
    - Peaks are merged per antibody with `sort | mergeBed`, then expanded with `macs3_merged_expand.py ... --min_replicates $params.min_reps_consensus` (`modules/local/macs3_consensus.nf:37-44`). `min_reps_consensus = 1` (`nextflow.config:46`).
    - featureCounts uses `'-F SAF -O --fracOverlap 0.2'` (`conf/modules.config:651`).
    - DESeq2 QC uses `'--id_col 1'`, `'--count_col 7'` and `params.deseq2_vst ? '--vst TRUE' : ''` (`conf/modules.config:689-692`). `deseq2_vst = true` (`nextflow.config:53`).
  - Data-dependent gates, operators as in source:
    - Consensus (and therefore featureCounts) runs per antibody when `meta.multiple_groups || meta.replicates_exist` (`conf/modules.config:641`).
    - DESeq2 QC runs only when `meta.multiple_groups && meta.replicates_exist` (`conf/modules.config:687`).
    - `multiple_groups = groups.size() > 1` and `replicates_exist = groups.max { it.value }.value > 1`. Here a group is a sample name with its `_REP<n>` suffix removed, counted over the antibody's peak files (`subworkflows/local/bed_consensus_quantify_qc_bedtools_featurecounts_deseq2.nf:33`, `subworkflows/local/bed_consensus_quantify_qc_bedtools_featurecounts_deseq2.nf:48-49`).
  - Peak QC plots are nested inside annotation: `if (!skip_peak_annotation)`, then `if (!skip_peak_qc)` (`subworkflows/local/bam_peaks_call_qc_annotate_macs3_homer.nf:94`, `subworkflows/local/bam_peaks_call_qc_annotate_macs3_homer.nf:106`).
- FastQC runs unless `params.skip_fastqc || params.skip_qc` (`workflows/chipseq.nf:125`, consumed as `if (!skip_fastqc)` at `subworkflows/nf-core/fastq_fastqc_umitools_trimgalore/main.nf:38`).

### Acceptance criteria

- On the source's `test` inputs, the workflow completes and derives the MACS3 genome size from the FASTA, because no `macs_gsize` is given (`conf/test.config:23-34`). The derived value is a positive count close to khmer's estimate (see Open questions).
- Each IP is peak-called against its own paired control. Control libraries yield no peaks, and a control shared by several IPs is reused.
- Libraries drop out as in the source:
  - Trimmed libraries below the hard-coded limit of `10000` reads (`workflows/chipseq.nf:130`) are filtered by `num_reads >= min_trimmed_reads.toFloat()` (`subworkflows/nf-core/fastq_fastqc_umitools_trimgalore/main.nf:99`). The filter applies only when trimming runs (`if (!skip_trimming)`, `subworkflows/nf-core/fastq_fastqc_umitools_trimgalore/main.nf:72`).
  - IPs with an empty peak file are filtered by `peaks.size() > 0` (`subworkflows/local/bam_peaks_call_qc_annotate_macs3_homer.nf:48`).
  - Assumption (Nextflow semantics, not checked by a run): an IP whose control library dropped out has no partner in the keyed `combine` and is not peak-called.
- Consensus and DESeq2 QC run per antibody exactly under the source gates (`||` for consensus, `&&` for DESeq2; see Requirements). On the `test` sheet both run.
- Single- and paired-end samples can be mixed in one run, and each layout gets its source-specific filter, coverage and MACS3 format handling.
- Results are scientifically comparable to an nf-core/chipseq 2.1.0 run on the same inputs and parameters: peak sets, FRiP, consensus intervals and count matrices. The comparison method and tolerances belong to test development (see Open questions).

### Open questions

- How are IP/control pairs supplied, and is there a control-free mode?
  - Proposed: keep the source's sample-sheet contract. Each IP row names an antibody, a control sample and a control replicate; rows without them are controls. Pairing is by that key, controls are never peak-called, and a control may serve several IPs. Do not add a control-free mode, because the source has none.
  - Evidence: `bin/check_samplesheet.py:113-137` and `bin/check_samplesheet.py:218-226`; pairing at `workflows/chipseq.nf:397-411`. Coordinator context keeps controls in scope. Both source test sheets pair every IP with an input.
  - Confidence: high
- How is the MACS3 genome size supplied or derived?
  - Proposed: an optional numeric input. When it is absent, derive it from the genome FASTA as the number of distinct k-mers with k = `read_length`, which is then required. An exact distinct k-mer count may replace khmer's estimate if it lands within 1% of khmer's value (agent tolerance, for expert review). Values from the iGenomes `macs_gsize` table are supplied through the same input, not looked up.
  - Evidence: `ch_macs_gsize = params.macs_gsize`, then `if (!params.macs_gsize)` runs khmer with `params.read_length` (`workflows/chipseq.nf:430-436`). `unique-kmers.py -k $kmer_size -R report.txt` and `grep ^number report.txt` (`modules/nf-core/khmer/uniquekmers/main.nf:25-31`). The value reaches MACS3 as `--gsize $macs3_gsize` (`modules/nf-core/macs3/callpeak/main.nf:43`). An example table is GRCh37 `"50"  : 2684219875` (`conf/igenomes.config:26`). The coordinator keeps `macs_gsize` in scope. Atacseq golden brief v1 reports, on the same `atacseq/reference/genome.fa` the chipseq `test` profile uses (`conf/test.config:27`), an exact count of 11,622,260 against khmer's 11,624,332 at k = 50. It also records a trap: summing a space-separated k-mer histogram with field-separator assumptions produced 0, and the peak caller then got a genome size of 0.
  - Confidence: medium
  - Missing: John's acceptance of a non-khmer count and its tolerance. Whether `read_length` keeps the source's `[50, 75, 100, 150, 200]` restriction (`nextflow_schema.json:42`).
- Is the `--genome` iGenomes lookup reproduced?
  - Proposed: no. The FASTA, GTF/GFF, optional blacklist, gene BED and genome size are supplied directly. The source's bundled blacklists (`assets/blacklists/`) remain usable as an optional blacklist input.
  - Evidence: getters at `main.nf:20-29` and `main.nf:149-170` resolve against `params.genomes`, included from `conf/igenomes.config` unless `igenomes_ignore` (`nextflow.config:246-250`). With `--genome`, `gene_bed` and `chromap_index` stay unset and are built. `test` does not use `--genome`; `test_full` does (`conf/test_full.config:24`).
  - Confidence: medium
  - Missing: whether John considers reference lookup part of "the whole pipeline".
- Which aligners are offered, and how is each tested?
  - Proposed: all four source aligners, selected per run, with BWA as the default (`aligner = 'bwa'`, `nextflow.config:34`). Each alternative is tested as a variant of the `test` case with only the aligner changed, as the source's CI does. The source's per-aligner arguments are kept: BWA `'-M'` and `-bhS -F 0x0100 -O BAM` (`conf/modules.config:208`, `conf/modules.config:213`); Chromap `'-l 2000 --low-mem --SAM'` (`conf/modules.config:264`); STAR `'--alignIntronMax 1'` and `'--alignEndsType EndToEnd'` (`conf/modules.config:282-283`). STAR's index build takes the GTF as well as the FASTA (`STAR_GENOMEGENERATE ( ch_fasta, ch_gtf )`, `subworkflows/local/prepare_genome.nf:206`).
  - Evidence: branches at `workflows/chipseq.nf:142, 163, 185, 209`; the enum `["bwa", "bowtie2", "chromap", "star"]` (`nextflow_schema.json:238`), although the description names only bwa, bowtie2 and star (`nextflow_schema.json:236`). The CI aligner matrix runs `bowtie2`, `chromap` and `star` (`.github/workflows/ci.yml:74-76`, `.github/workflows/ci.yml:88`). The coordinator keeps the alternative aligners in scope.
  - Confidence: high
- Is Chromap's forced MACS3 `--format BAM` reproduced?
  - Proposed: yes, as source behaviour, recorded as a source quirk for expert review. With Chromap, MACS3 reads even paired-end alignments as single-end.
  - Evidence: `params.aligner == "chromap" ? "--format BAM" : ''` (`conf/modules.config:575`) overrides the `'BAMPE'` default (`modules/nf-core/macs3/callpeak/main.nf:31-35`). The source does not explain why.
  - Confidence: low
  - Missing: whether John wants source-faithful or paired-end-aware peak calling for Chromap.
- Must the workflow accept a prebuilt aligner index?
  - Proposed: no. The index is built from the FASTA (with the GTF for STAR), which is what the source does when no index is given.
  - Evidence: `subworkflows/local/prepare_genome.nf:143-208` uses a supplied path, unpacks a `.tar.gz`, or builds the index. Neither source test supplies an index directly; `test_full` gets one from iGenomes.
  - Confidence: medium
  - Missing: John's preference.
- Are broad and narrow peaks both selectable?
  - Proposed: yes, per run, broad (cutoff 0.1) by default. The choice also selects broad/narrow consensus merging and the peak-QC plots (`modules/local/macs3_consensus.nf:32-35`).
  - Evidence: `conf/modules.config:571`; `nextflow.config:42-43`. Scope covers both.
  - Confidence: high
- Are the default-on but skippable analyses always run, or selectable?
  - Proposed: run them by default and keep each skip as a run-time choice, with the source defaults: preseq, Picard metrics, phantompeakqualtools, deepTools profile and fingerprint, peak annotation, peak QC, consensus, DESeq2 QC, IGV, MultiQC and FastQC/trimming. preseq is on by default (`skip_preseq = false`, `nextflow.config:60`), but the `test` profile turns it off (`conf/test.config:34`).
  - Evidence: `skip_*` defaults at `nextflow.config:30` and `nextflow.config:48-65`. The CI parameter matrix runs `--skip_trimming` and `--skip_consensus_peaks` (`.github/workflows/ci.yml:52-53`).
  - Confidence: medium
  - Missing: how much run-time selection John wants, and test data on which preseq succeeds.
- Which tunable source parameters become workflow parameters?
  - Proposed: expose the science-affecting ones with source defaults: aligner, `narrow_peak`, `broad_cutoff`, `macs_fdr`, `macs_pvalue`, `keep_dups`, `keep_multi_map`, `fragment_size`, `fingerprint_bins`, `min_reps_consensus`, `deseq2_vst`, `bwa_min_score`, `clip_r1`, `clip_r2`, `three_prime_clip_r1`, `three_prime_clip_r2`, `trim_nextseq`, `seq_center` (read-group `CN` only, `subworkflows/local/input_check.nf:33-34`) and the skips. Keep the trimmed-read limit fixed at 10000, as in the source. Keep the bamtools filter rules fixed to the source's `assets/bamtools_filter_pe.json` and `assets/bamtools_filter_se.json`, although the source lets users override them (`nextflow.config:68-69`).
  - Evidence: `summary-nextflow.json` `params[]` (84 entries) and defaults at `nextflow.config:12-69`. `min_trimmed_reads` is the literal `10000` (`workflows/chipseq.nf:130`).
  - Confidence: low
  - Missing: the expert's preferred interface breadth.
- How strictly must per-library results follow the source's commands?
  - Proposed: reproduce what defines results, with deviations recorded for review. That covers the filter flags and rules, orphan/FR-pair removal, CPM scaling, MACS3 arguments, FRiP, the consensus expansion and SAF, featureCounts options, and DESeq2 QC with VST or rlog, PCA on the top 500 and all intervals, and sample distances. HOMER annotation uses `'-gid'` (`conf/modules.config:604`).
  - Evidence: Requirements above; `bin/deseq2_qc.r:101-107` (rlog vs VST), `bin/deseq2_qc.r:150`, `bin/deseq2_qc.r:194`. John asked for an "equivalent" workflow.
  - Confidence: medium
  - Missing: which deviations John would accept.
- Is the IGV session a deliverable?
  - Proposed: yes, as a genome-browser session listing the bigWigs, peaks and consensus peaks against the FASTA. It is in scope as reporting. The source's relative-path layout is not reproduced.
  - Evidence: the IGV module takes the aligner and peak-type directory names as path components and writes paths with `--path_prefix '../../'` (`modules/local/igv.nf:15-17`, `modules/local/igv.nf:43`), so its content depends on the source's publish layout.
  - Confidence: low
  - Missing: whether John wants a session file, and what it should reference.
- Which sections must the MultiQC report carry?
  - Proposed: the source's inputs (`workflows/chipseq.nf:542-576`): FastQC and Trim Galore, samtools stats at each stage, duplicate metrics, Picard metrics, preseq, deepTools profile and fingerprint, phantompeakqualtools NSC/RSC/correlation, FRiP, peak counts, HOMER annotation summary, featureCounts and DESeq2 PCA/clustering. Follow the source in leaving out STAR's alignment log, which it collects (`ch_star_multiqc = ALIGN_STAR.out.log_final`, `workflows/chipseq.nf:225`) but never passes to MultiQC.
  - Evidence: `workflows/chipseq.nf:536-577`.
  - Confidence: medium
  - Missing: whether John wants the STAR log added, and how complete the report must be.
- Does the source index single-end filtered BAMs as intended?
  - Proposed: yes. Treat `SAMTOOLS_INDEX { ch_bam.single_end }` as indexing the single-end filtered BAMs, which then get stats (`subworkflows/local/bam_filter_bamtools.nf:47-58`).
  - Evidence: the call uses brace (closure) syntax instead of parentheses (`subworkflows/local/bam_filter_bamtools.nf:47-49`). Phase 1 could not confirm the binding without running Nextflow. Only `test_full` exercises single-end data.
  - Confidence: medium
  - Missing: a Nextflow run on single-end data.
- Which test cases establish equivalence?
  - Proposed: the source `test` profile inputs as the primary case. Add variants from the source CI: `--aligner bowtie2|chromap|star`, `--skip_trimming` and `--skip_consensus_peaks`. Also add a single-end case if small single-end data with controls can be found. `test_full` (hg19, reference scale) is not a routine test.
  - Evidence: `.github/workflows/ci.yml:43`, `.github/workflows/ci.yml:52-53`, `.github/workflows/ci.yml:74-76`; `conf/test.config:23-34`; `conf/test_full.config:18-24`. The `test` sheet is paired-end only. No source test exercises the blacklist, GFF, gene BED, narrow-peak or prebuilt-index paths. The CLI summary's `test_selection` selects `profile:test`.
  - Confidence: medium
  - Missing: a small single-end ChIP test set, and how many test cases the expert wants.
- How is scientific comparability established without a source run?
  - Proposed: compare against a reference run of nf-core/chipseq 2.1.0 on the `test` inputs, taken where Nextflow is available. Until then, the expert judges peak counts, FRiP, consensus intervals and count matrices.
  - Evidence: the source ships no expected outputs and has no `tests/` directory. The probes found `nextflow` and `java` absent from PATH (`environment-probes.txt`).
  - Confidence: low
  - Missing: John's definition of "comparable", and whether a reference run is wanted.

### Decisions

Only the first item is an expert decision. The others are recorded with their source so the expert can confirm or override them.

- John: "Convert the whole pipeline to an equivalent Galaxy workflow." No other Galaxy requirement (coordinator, `caller-request.md`).
- Coordinator context (not John's words): IP/input pairing, `macs_gsize` and the alternative aligners stay in scope; how they are supplied or selected is for the brief.
- Driver's reading (assumption, not John's or the coordinator's): scope is every analysis reachable under some parameter setting, and pipeline plumbing is excluded as non-scientific.
- Agent decision, for expert review: source branches that are optional, default-off or selectable stay in scope. Examples are the alternative aligners, narrow peaks, the blacklist, GFF input and the skips. How each is offered is recorded as an open question with a proposal that follows the caller's scope, not as a blocker.

### Related artifacts

- `summary-nextflow.json`: process topology, containers, 84 parameters, 10 reference assets and 7 rebuilds, 2 test candidates with `test_selection`, and correction-pass warnings.
- `summary-nextflow.cli.json`: the raw CLI summary before correction, kept for audit; not evidence.
- `phase1-notes.md`: phase-1 source facts with cites, the fetched test sample-sheet contents and the pre-plan cross-check.
- `caller-request.md`: John's objective, coordinator context and the driver's reading.
- `environment-probes.txt`: environment probes, 2026-10-30T17:10:09Z.
- Fixture: `workflow-fixtures/pipelines/nf-core__chipseq` at `76e2382b6d443db4dc2396e6831d1243256d80b0`.

## Agent Environment

These are observations from `environment-probes.txt` (probes at 2026-10-30T17:10:09Z), unless marked as requirements or unknowns. John stated no tooling, version or container requirement. The coordinator stated none either.

### Tooling

- Required versions: none stated by John or the coordinator. The brief Mold's bundle declares `foundry` with no version.
- Observed:
  - `gxwf`: absent from PATH. Present in the Foundry worktree's `node_modules/.bin`, version 1.15.0.
  - `foundry`: absent from PATH. A per-run shim runs the worktree build; `foundry --help` exited 0. The shim's `validate-workflow-brief --schema-sha256` pin check matched this bundle's schema (run during brief production).
  - `summarize-nextflow`: absent from PATH. A per-run shim runs the worktree build; `--help` exited 0.
  - `planemo`: absent from PATH. A per-run shim runs a planemo master install, reporting `planemo, version 0.75.48.dev0`.
  - `node`: v26.13.0. `uvx`: present.
  - `nextflow`, `nf-test`, `java`, `khmer` and `unique-kmers.py`: absent from PATH.
  - `conda` and `mamba`: absent from PATH.
- Unknown (not probed): the Galaxy version planemo would use, and whether the Tool Shed, container registries and nf-core test-datasets are reachable from this host.

### Constraints

- Host (probe): Linux x86_64, 4 CPUs, MemTotal 15333296 kB with MemAvailable 9905864 kB at probe time, SwapTotal 16777212 kB. `/` had 427G free. `/tmp` is a tmpfs of 7.4G with 4.9G free.
- Other processes (probe; counts are upper bounds from command-line pattern matches): 1 matching `planemo`, 20 matching `galaxy`.
- Brief production installs nothing, pulls no containers and downloads no data. Small source-referenced metadata (sample sheets, configs under 1 MB) may be fetched to verify facts (coordinator).

### Containerization

- Container preference: none stated by John or the coordinator.
- Docker (probe): client at `/usr/bin/docker`. The probe reported `29.1.3 linux/amd64`, `cpus=4`, `mem=15701295104` and `driver=overlayfs`. Whether Docker can pull and run the images this workflow needs was not probed.
- Cached images (probe, no pull): 54 in total. They include biocontainers images for trim-galore 0.6.10, multiqc 1.33, samtools 1.21 and 1.22, subread 2.0.1 and 2.1.1, bedtools 2.31.1, bwa 0.7.18, homer 4.11, deeptools 3.5.5, picard 3.1.1, fastqc 0.12.1, khmer 3.0.0a3 and bowtie 1.2.0. These are observations, not tool choices.
- `singularity`, `apptainer` and `podman`: absent from PATH.
- Source fact: the source's phantompeakqualtools module uses a Seqera Wave image (`community.wave.seqera.io/library/phantompeakqualtools:1.2.2--f8026fe2526a5e18`, `modules/nf-core/phantompeakqualtools/main.nf:9`). The others are biocontainers or mulled images (`summary-nextflow.json` `tools[]`).
