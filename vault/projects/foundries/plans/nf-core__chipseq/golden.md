# Workflow Brief: nf-core/chipseq 2.1.0 (whole pipeline)

## Workflow

### Objective

John: "Convert the whole pipeline to an equivalent Galaxy workflow." (from `caller-request.md`; these are the only words from John).

The source describes itself as a "ChIP-seq peak-calling and differential analysis pipeline." (`nextflow.config:291`). It takes ChIP-seq FASTQ libraries described by a sample sheet that pairs each immunoprecipitation (IP) library with an input (control) library, plus a genome FASTA and a gene annotation. Per sample replicate it produces filtered alignments, normalised coverage tracks, peaks called against the paired control (broad by default, narrow on request), annotated peaks and ChIP-specific QC. Per antibody it produces consensus peaks, read counts over them and DESeq2-based sample QC. A genome-browser session and an aggregate QC report summarise the run. The source's DESeq2 step is QC only: it computes PCA (`ntop <- c(500, Inf)`, `bin/deseq2_qc.r:150`) and sample distances (`bin/deseq2_qc.r:194`). It does not test contrasts.

### Sources

- Source: nf-core/chipseq, `version = '2.1.0'` (`nextflow.config:294`), commit `76e2382b6d443db4dc2396e6831d1243256d80b0` (coordinator pin `76e2382b`; full SHA from `git rev-parse HEAD` in the fixture). MIT licence. Repository https://github.com/nf-core/chipseq. Every `path:N` cite below is relative to the fixture root `workflow-fixtures/pipelines/nf-core__chipseq`.
- Expert intent: John's objective only. Coordinator context and the driver's reading come from `caller-request.md`. Neither is John's; this brief labels each where it uses them.
- Source evidence: `summary-nextflow.json` (phase-1 CLI output plus a correction pass) and `phase1-notes.md` (phase-1 source facts with cites). Where this brief restates a condition, it quotes the source expression.
- Build evidence: build v0 of this brief (2026-10-30 to 2026-10-31), run dir `~/foundry-runs/prose-wb2g-chipseq-v0-2026-10-30/` (see Related artifacts). Facts marked "build v0" come from that run's `run-summary.md`, `open-requirements.ledger.yml` (the ledger), `test-data-refs.json` and `preflight.md`. They are evidence, not Galaxy design. Build v0 ran unreviewed, with every v0 open-question proposal accepted (direct-build convention).
- Environment evidence: `environment-probes.txt` (seed probes, 2026-10-30T17:10:09Z), build v0's `preflight.md` (2026-10-30T17:39Z) and its planemo attempts.
- Known traps: the sibling atacseq golden brief (`vault/projects/foundries/plans/nf-core__atacseq/golden.md`). It was consulted only for the genome-size derivation trap; no chipseq fact is taken from it.
- Test evidence: the source has no nf-test suite and no `tests/` directory. It has two test profiles, `test` and `test_full` (`nextflow.config:228-229`), and a CI matrix over parameters and aligners (`.github/workflows/ci.yml:52-53`, `.github/workflows/ci.yml:74-76`).

### Scope

#### Included

The scope is every scientific analysis the source can run under some parameter setting (driver's reading of John's objective). The coordinator's context adds that IP/control pairing, the `macs_gsize` derivation and the alternative aligners stay in scope. How optional or selectable parts are supplied or chosen is decided or asked below, not a scope cut. Build v0 carried every item here except phantompeakqualtools and the R peak-QC plots, which it left out under cited reasons; those are an open question, not exclusions. Process topology stays in `summary-nextflow.json`.

- Reference preparation (`subworkflows/local/prepare_genome.nf`):
  - decompress a gzipped FASTA, GTF, GFF, blacklist or gene BED;
  - convert GFF to GTF when no GTF is given (`subworkflows/local/prepare_genome.nf:68-75`);
  - derive a gene BED from the GTF unless one is given (`subworkflows/local/prepare_genome.nf:98-108`);
  - derive the FASTA index and chromosome sizes (`subworkflows/local/prepare_genome.nf:122-124`);
  - derive the include-regions BED: genome minus blacklist with a blacklist (`modules/local/genome_blacklist_regions.nf:27`), or whole chromosomes without one (`modules/local/genome_blacklist_regions.nf:36`);
  - build the selected aligner's index from the FASTA (see Decisions; a prebuilt index is an open question).
- MACS3 genome-size derivation when `macs_gsize` is unset: `if (!params.macs_gsize)` runs `KHMER_UNIQUEKMERS ( ch_fasta, params.read_length )` (`workflows/chipseq.nf:430-436`). The module runs `unique-kmers.py -k $kmer_size` on the FASTA and keeps the reported count (`modules/nf-core/khmer/uniquekmers/main.nf:25-31`). See Decisions.
- Sample-sheet validation and the run/replicate/control structure (`bin/check_samplesheet.py`, run through `INPUT_CHECK`, `workflows/chipseq.nf:111-114`).
- Read QC (FastQC) and adapter/quality trimming (Trim Galore), with the post-trim read-count filter (see Acceptance criteria).
- Alignment with one of four aligners, selected by `params.aligner`: `'bwa'`, `'bowtie2'`, `'chromap'` or `'star'` (`workflows/chipseq.nf:142, 163, 185, 209`). Each sorts, indexes and computes samtools stats, flagstat and idxstats (for example `subworkflows/nf-core/fastq_align_bwa/main.nf:29`). See Decisions.
- Per sample replicate ("merged library"):
  - merge the runs of each replicate (`workflows/chipseq.nf:238-250`);
  - mark duplicates without removing them (`--REMOVE_DUPLICATES false`, `conf/modules.config:326`);
  - filter to the include regions and by flags, mapping quality, mismatches and insert size; for paired-end data, also remove orphans and non-FR pairs (see Requirements).
- The source has no merged-replicate level. Everything after the run merge is per sample replicate.
- Alignment QC:
  - preseq library complexity on the duplicate-marked BAM (`if (!params.skip_preseq)`, `workflows/chipseq.nf:288-291`);
  - Picard CollectMultipleMetrics (`workflows/chipseq.nf:300-307`);
  - phantompeakqualtools strand cross-correlation, with NSC/RSC tables (`workflows/chipseq.nf:328-339`); build v0 left it out (see Open questions);
  - a CPM-scaled bigWig (`modules/local/bedtools_genomecov.nf:26`);
  - a deepTools gene-body profile and heatmap over the gene BED (`workflows/chipseq.nf:360-385`);
  - a deepTools fingerprint per IP/control pair (`workflows/chipseq.nf:417-420`).
- IP/control pairing and MACS3 peak calling, broad or narrow (`workflows/chipseq.nf:397-411`, `workflows/chipseq.nf:450-462`), followed by FRiP, peak counts, HOMER annotation and the R peak-QC plots (`subworkflows/local/bam_peaks_call_qc_annotate_macs3_homer.nf:64-130`). Build v0 replaced the plots with their summary tables (see Open questions).
- Per-antibody consensus peaks, HOMER annotation of the consensus with boolean per-sample columns, featureCounts over the consensus, and DESeq2 QC (`workflows/chipseq.nf:472-492`, `subworkflows/local/bed_consensus_quantify_qc_bedtools_featurecounts_deseq2.nf:30-134`).
- Reporting: an IGV session file (`if (!params.skip_igv)`, `workflows/chipseq.nf:504-513`) and a MultiQC report (`if (!params.skip_multiqc)`, `workflows/chipseq.nf:527-579`). Their content is an open question.

#### Excluded

- Pipeline plumbing, as non-scientific work (driver's reading, not John's or the coordinator's; for expert review):
  - nf-validation parameter checks and help;
  - software-version collation (`softwareVersionsToYAML(ch_versions)`, `workflows/chipseq.nf:520-522`);
  - completion e-mail and notifications (`subworkflows/local/utils_nfcore_chipseq_pipeline/main.nf:102-112`);
  - copying the iGenomes README to the output directory (`workflows/chipseq.nf:79-83`).

  The validation rules that encode input requirements stay as evidence for the input contract (see Inputs and outputs).
- UMI extraction. The source passes `with_umi` as the literal `false` (`workflows/chipseq.nf:126`), so the guard `with_umi && !skip_umi_extract` (`subworkflows/nf-core/fastq_fastqc_umitools_trimgalore/main.nf:47`) never holds. This is a source fact, not a scope choice.
- Publish-directory layout, file naming and the `save_*`, `publish_dir_mode`, `max_*`, `config_*`, e-mail and MultiQC-branding parameters, except where a scientific output depends on them (see the reports question). Agent proposal, for expert review. This includes `save_macs_pileup` (`save_macs_pileup = false`, `nextflow.config:47`), although it adds `--bdg --SPMR` to the MACS3 command (`conf/modules.config:572`) and so produces a scientific output, the pileup bedGraphs; build v0 built no pileup output.
- The `--genome` iGenomes lookup was not reproduced in build v0, as proposed; whether John wants it is still an open question.

### Inputs and outputs

Inputs, as source facts. "Required" and "optional" describe source behaviour, not a Galaxy interface decision.

- Sample sheet (required; `"required": ["input", "outdir"]`, `nextflow_schema.json:13`).
  - The header must start with `HEADER = ["sample", "fastq_1", "fastq_2", "replicate", "antibody", "control", "control_replicate"]` (`bin/check_samplesheet.py:55`), checked by `if header[: len(HEADER)] != HEADER:` (`bin/check_samplesheet.py:57`).
  - Sample names must match `^[a-zA-Z0-9_.-]+$` (`bin/check_samplesheet.py:88`). Build v0 found that Galaxy rejects sample-sheet values containing `.` and that the FastQC and MultiQC wrappers rewrite `.` to `_` (ledger discovery `sample-sheet-value-charset`); neither source test sheet uses `.`. See the tool-level deviations question.
  - A row is paired-end if `sample and fastq_1 and fastq_2` (`bin/check_samplesheet.py:142`) and single-end if `sample and fastq_1 and not fastq_2` (`bin/check_samplesheet.py:145`). All replicates of a sample, and all runs of one replicate, must share a layout (`bin/check_samplesheet.py:194-213`).
  - Replicate ids must run 1..N (`bin/check_samplesheet.py:185`). Rows sharing sample and replicate are sequencing runs, renamed `"{}_REP{}_T{}".format(sample, replicate, idx + 1)` (`bin/check_samplesheet.py:231`).
  - An antibody without a control is an error (`bin/check_samplesheet.py:113-122`), and so is a control without an antibody (`bin/check_samplesheet.py:124-137`). The control is rewritten as `"{}_REP{}".format(control, control_replicate)` (`bin/check_samplesheet.py:131`), and it must name an existing sample and replicate (`bin/check_samplesheet.py:218-226`). The control key names a library (a replicate, possibly merged from several runs), not a single run.
  - Rows with no antibody and no control are control (input) libraries. Pairing is described under Requirements.
- FASTQ reads, gzipped (`.fastq.gz` or `.fq.gz`, `bin/check_samplesheet.py:100`), single- or paired-end per sample.
- Genome FASTA (required; `if (!params.fasta)` errors, `subworkflows/local/utils_nfcore_chipseq_pipeline/main.nf:131-132`). It may be gzipped (`if (fasta.endsWith('.gz'))`, `subworkflows/local/prepare_genome.nf:51`).
- Gene annotation, GTF or GFF: `if (!params.gtf && !params.gff)` errors (`subworkflows/local/utils_nfcore_chipseq_pipeline/main.nf:135-136`). When both are given, GTF wins with a warning (`subworkflows/local/utils_nfcore_chipseq_pipeline/main.nf:139-140`). GFF is converted with `'--keep-exon-attrs -F -T'` (`conf/modules.config:72`).
- Optional inputs:
  - a blacklist BED (`if (blacklist)`, `subworkflows/local/prepare_genome.nf:83`);
  - a gene BED (`if (!gene_bed)` derives one, `subworkflows/local/prepare_genome.nf:99`);
  - a prebuilt aligner index (`subworkflows/local/prepare_genome.nf:143-208`; see Open questions);
  - `macs_gsize` (see Decisions).
- `read_length` is required when `macs_gsize` is unset: `if (!params.read_length && !params.macs_gsize)` errors (`subworkflows/local/utils_nfcore_chipseq_pipeline/main.nf:147-148`). The schema restricts it to `[50, 75, 100, 150, 200]` (`nextflow_schema.json:42`), and its default is `null` (`nextflow.config:16`). It sets the k-mer length of the genome-size derivation and selects the iGenomes `macs_gsize` table entry (`main.nf:165-166`). It is not used to trim or filter reads.
- Real genome sizes exceed 2^31 − 1: for example GRCh37 `"50"  : 2684219875` (`conf/igenomes.config:26`). Build v0 never passed such a value (ledger gap `macs-gsize-large-int`).
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
  - an UpSet plot of peak-set intersections (`plot_peak_intersect.r`, `modules/local/macs3_consensus.nf:53`);
  - a featureCounts matrix.
- Per antibody, when its DESeq2 gate holds: DESeq2 QC (PCA values, sample-distance matrix and plots, size factors).
- QC: FastQC and Trim Galore reports, preseq, Picard metrics, phantompeakqualtools NSC/RSC/correlation, and deepTools profile and heatmap.
- Reports: the IGV session and the MultiQC report.

Test data (`test` profile, `conf/test.config:23-34`), as measured in build v0 at nf-core/test-datasets `chipseq` commit `dc342f94ec86799d7bd635e7192b1cbb3654b559` and `atacseq` commit `cd022b097372b078a68d8afadb172ad7342fd91f` (checksums in that run's `test-data/SHA1SUMS.txt`, per-run facts in `test-data/read-facts.tsv`):

- The sample sheet is `chipseq/samplesheet/v2.1/samplesheet_test.csv` (`conf/test.config:23`), SHA-1 `a3834d509f1b8a47c4411d4a3303afd9ef981bda`.
  - It has 6 paired-end rows, one run per replicate: `SPT5_T0` and `SPT5_T15`, replicates 1 and 2, all antibody `SPT5`.
  - Their controls are `SPT5_INPUT` replicates 1 and 2; each input serves two IPs.
  - So one antibody has 2 groups × 2 replicates, and both the consensus and the DESeq2 gates hold.
- The four "SPT5" IP runs are not ChIP. They are the atacseq test reads (SRR1822153/54/57/58): 2 × 76 bp with the Nextera adapter (9–20% of raw reads carry it), so ATAC-seq libraries; about 41% of mapped IP reads are MAPQ 0 on chrXII (rDNA). The two inputs are real Spt5 ChIP inputs, 2 × 50 bp with TruSeq adapters. IP-versus-input peaks on `test` are therefore not biologically meaningful, and the IP and input read lengths differ (ledger discovery `test-ip-reads-are-atac`).
- Every run has 100,000 pairs. Trim Galore keeps 99,540–99,766 pairs per run, so the 10,000-read filter drops nothing on `test`.
- `read_length = 50` (`conf/test.config:24`). It does not match the IP read length (76), and nothing trims to it; it only sets the genome-size k-mer length.
- FASTA and GTF are the nf-core test-datasets `atacseq/reference/genome.fa` and `genes.gtf` (`conf/test.config:27-28`). `genome.fa` (SHA-1 `45824b2f…`) is byte-identical on the `chipseq` and `atacseq` branches: S. cerevisiae, 17 contigs (`I`–`XVI`, `MT`), 12,157,105 bp. `genes.gtf` uses the same contig names. There is no blacklist, gene BED, index or `macs_gsize`, so the genome-size derivation runs.
- `fingerprint_bins = 100` (`conf/test.config:31`) and `skip_preseq = true` (`conf/test.config:34`, commented "Avoid preseq errors with test data", `conf/test.config:33`).
- Single-end data with controls: the nf-core test-datasets `chipseq` branch also holds real yeast Spt5 ChIP IP1/IP2 (SRR5204807/08) and their inputs Input1/2 (SRR5204809/10), 100,000 pairs of 2 × 50 bp each against the same `genome.fa`; the source sheet does not use them. Their R1 files form a 4-row single-end case with each IP paired to its own input (build v0 `test-data/samplesheet_se_variant.csv`). It has one IP group, so its consensus gate holds and its DESeq2 gate does not.
- `test_full` uses `genome = 'hg19'` (`conf/test_full.config:24`) and `read_length = 50` (`conf/test_full.config:21`).
  - Its fetched sheet (SHA-1 `cee14cd261c0641f7c6d9e1da2ef5941f910f0ad`) has 16 single-end rows. Antibodies FOXA1 and EZH2 each have two conditions with 2 replicates, and each IP has its own input.
  - It is the only source test that exercises single-end paths, at reference scale.

### Requirements and preferences

- John: "Convert the whole pipeline to an equivalent Galaxy workflow." No other requirement, Galaxy or otherwise, was stated (coordinator, `caller-request.md`).
- Coordinator context (not John's words): controls (IP/input pairing), `macs_gsize` and the alternative aligners stay in scope. How they are supplied or selected is a question for this brief.
- Agent reading of "equivalent" (not a John statement; for expert review): a build that cannot reproduce a source analysis records the gap for an expert decision rather than accepting a substitute or omission on its own.
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

    These are at `conf/modules.config:570-575`. The format is otherwise `meta.single_end ? 'BAM' : 'BAMPE'` (`modules/nf-core/macs3/callpeak/main.nf:31`), and a `--format` in the arguments overrides it (`modules/nf-core/macs3/callpeak/main.nf:33-35`). Defaults are `narrow_peak = false` and `broad_cutoff = 0.1` (`nextflow.config:42-43`). The source passes no `--nomodel`, so `BAM`-format calls build a fragment model.
  - FRiP is reads in peaks (`intersectBed -a $bam -b $peak $args`, with `'-bed -c -f 0.20'`) over the flagstat mapped count (`modules/local/frip_score.nf:24-26`, `conf/modules.config:585`).
  - Fingerprints are labelled `"--labels $meta.id $meta.control"` (`conf/modules.config:555`).
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

Wrapper evidence (main Tool Shed, searched 2026-10-30 in build v0 with `gxwf tool-search`, Tool Shed metadata and wrapper XML; ledger discoveries and gaps). This brief does not choose tools.

- MACS3: the only MACS3 wrapper (emmm `modencode_peakcalling_macs3`) wraps MACS3 3.0.0b1, a beta, in a single-revision personal repository. iuc `macs2_callpeak` 2.2.9.1 is maintained; it exposes `format` (BAM, BAMPE, BED) as a top-level choice and the p- and q-value cutoffs as a mode, not as two independent values.
- Genome size: no wrapper runs khmer `unique-kmers.py`. iuc `jellyfish` counts canonical k-mers for k > 31 and writes a space-separated histogram whose second column sums to the distinct count; summing it with a wrapper that forces a tab field separator gives 0.
- phantompeakqualtools: the only hits are two SPP wrappers (stemcellcommons `spp_tool` 1.11.0, modencode-dcc `spp_package` 1.10.1) whose only requirement is a `set_environment SCRIPT_PATH`, with no package or container, so neither runs on a container-resolved Galaxy.
- Pipeline R scripts: no wrapper runs `bin/plot_macs3_qc.r`, `bin/plot_homer_annotatepeaks.r` or `bin/deseq2_qc.r`. iuc `deseq2` 2.11.40.8 has a count-matrix mode with a sample sheet and a factor column; it fits a design on that factor (so it needs two levels), writes a contrast table besides size factors and the VST or rlog matrix, and its PDF uses rlog for up to 30 samples whatever is chosen. iuc `upsetplot` 1.4.1 (UpSetR 1.4.1; the source module pins `r-upsetr=1.4.0`, `modules/local/macs3_consensus.nf:8`) writes PNG only.
- HOMER: iuc `homer_annotatepeaks` 4.11 takes a FASTA and a GTF but exposes no `-gid` (`conf/modules.config:604`).
- Coverage: iuc `bedtools_genomecoveragebed` 2.31.1 exposes `-scale` but neither `-pc` nor `-fs`; bgruening `deeptools_bam_coverage` 4.0.0 takes an explicit scale factor and fragment extension.
- Chromap: iuc `chromap` 0.3.2 always passes a `--preset` (atac, chip or hic), and the chip preset adds `--remove-pcr-duplicates`, which a later flag cannot switch off. The source runs Chromap with no preset (`'-l 2000 --low-mem --SAM'`, `conf/modules.config:264`).
- STAR: iuc `rna_star` 2.7.11b builds its index from a history FASTA and GTF inside the job but exposes neither `--runRNGseed` nor a read-group line; the source passes `'--runRNGseed 0'` (`conf/modules.config:279-288`).
- Trim Galore: bgruening `trim_galore` 0.6.10 (the only wrapper) has no `--nextseq` (`params.trim_nextseq > 0 ? "--nextseq ${params.trim_nextseq}" : ''`, `conf/modules.config:138`). Its paired-end report holds the read-1 log, then the read-2 log.
- Picard: no `CollectMultipleMetrics` wrapper; devteam `picard` 3.1.1.0 has its component programs (alignment summary, insert size, base distribution by cycle, mean quality by cycle, quality-score distribution) as separate tools.
- Gene BED: iuc `gtftobed12` 357 has one installable revision, and its conda requirements no longer load (`libssl.so.1.0.0` missing); it runs only from its container.
- MultiQC: iuc `multiqc` 1.35 has no deepTools plotProfile or plotFingerprint quality-metrics input, no Picard QualityScoreDistribution or MeanQualityByCycle type, and no heatmap custom-content plot. It does take custom-content tables and MACS2 peak tables.
- IGV: no wrapper writes an IGV session file.
- Nearest IWC workflow: `epigenetics/chipseq-pe` (medium similarity), which takes paired reads only, a cached reference and a required genome size, and has no control input.

### Acceptance criteria

- On the source's `test` inputs, the workflow completes and derives the MACS3 genome size from the FASTA, because no `macs_gsize` is given (`conf/test.config:23-34`). The derived value is within 1% of khmer's estimate (see Decisions). Build v0 met this.
- Each IP is peak-called against its own paired control. Control libraries yield no peaks, and a control shared by several IPs is reused. Build v0 met this in all six test cases.
- Libraries drop out as in the source:
  - Trimmed libraries below the hard-coded limit of `10000` reads (`workflows/chipseq.nf:130`) are filtered by `num_reads >= min_trimmed_reads.toFloat()` (`subworkflows/nf-core/fastq_fastqc_umitools_trimgalore/main.nf:99`). The filter applies only when trimming runs (`if (!skip_trimming)`, `subworkflows/nf-core/fastq_fastqc_umitools_trimgalore/main.nf:72`).
  - IPs with an empty peak file are filtered by `peaks.size() > 0` (`subworkflows/local/bam_peaks_call_qc_annotate_macs3_homer.nf:48`).
  - Assumption (Nextflow semantics, not checked by a run): an IP whose control library dropped out has no partner in the keyed `combine` and is not peak-called.
  - No build v0 test reached any of these drop-outs.
- Consensus and DESeq2 QC run per antibody exactly under the source gates (`||` for consensus, `&&` for DESeq2; see Requirements). Build v0 exercised both gates on `test`, and consensus without DESeq2 on the single-end case.
- Single- and paired-end samples can be mixed in one run, and each layout gets its source-specific filter, coverage and MACS3 format handling. Build v0 tested each layout in its own case, not a mixed run.
- Results are scientifically comparable to an nf-core/chipseq 2.1.0 run on the same inputs and parameters: peak sets, FRiP, consensus intervals and count matrices. The comparison method and tolerances belong to test development (see Open questions for reference values).

### Open questions

- Is the `--genome` iGenomes lookup reproduced?
  - Proposed: no. The FASTA, GTF/GFF, optional blacklist, gene BED and genome size are supplied directly. The source's bundled blacklists (`assets/blacklists/`) remain usable as an optional blacklist input, and iGenomes genome sizes are passed as `macs_gsize`.
  - Evidence: getters at `main.nf:20-29` and `main.nf:149-170` resolve against `params.genomes`, included from `conf/igenomes.config` unless `igenomes_ignore` (`nextflow.config:246-250`). With `--genome`, `gene_bed` and `chromap_index` stay unset and are built. `test` does not use `--genome`; `test_full` does (`conf/test_full.config:24`), so `test_full` cannot run as written without it. Build v0 followed the proposal (ledger drop `igenomes-lookup-not-reproduced`).
  - Confidence: medium
  - Missing: whether John considers reference lookup part of "the whole pipeline".
- Must the workflow accept a prebuilt aligner index?
  - Proposed: no. The index is built from the FASTA (with the GTF for STAR), which is what the source does when no index is given.
  - Evidence: `subworkflows/local/prepare_genome.nf:143-208` uses a supplied path, unpacks a `.tar.gz`, or builds the index. Neither source test supplies an index directly; `test_full` gets one from iGenomes. Build v0 built every index from the history FASTA, as proposed (ledger drop `prebuilt-aligner-index-not-accepted`), and did not check which aligner wrappers would accept a supplied index.
  - Confidence: medium
  - Missing: John's preference, and a per-wrapper check if John wants one.
- Which tunable source parameters become workflow parameters?
  - Proposed: expose the science-affecting ones with source defaults: aligner, `narrow_peak`, `broad_cutoff`, `macs_fdr`, `macs_pvalue`, `keep_dups`, `keep_multi_map`, `fragment_size`, `fingerprint_bins`, `min_reps_consensus`, `deseq2_vst`, `bwa_min_score`, `clip_r1`, `clip_r2`, `three_prime_clip_r1`, `three_prime_clip_r2`, `seq_center` (read-group `CN` only, `subworkflows/local/input_check.nf:33-34`) and the skips. Keep the trimmed-read limit fixed at 10000 and the bamtools filter rules fixed to `assets/bamtools_filter_pe.json` and `assets/bamtools_filter_se.json`, although the source lets users override the rules (`nextflow.config:68-69`). Drop `trim_nextseq` unless a NextSeq trimming route is accepted (see tool-level deviations). Document the `read_length` restriction rather than enforce it.
  - Evidence: `summary-nextflow.json` `params[]` (84 entries) and defaults at `nextflow.config:12-69`. `min_trimmed_reads` is the literal `10000` (`workflows/chipseq.nf:130`). Build v0 exposed 40 inputs following the v0 proposal; its `trim_nextseq` had no effect because the Trim Galore wrapper lacks `--nextseq` (ledger drop `trim-nextseq-not-exposed`), and it exposed neither `save_macs_pileup` (see Excluded) nor the bamtools rule overrides (ledger drop `bamtools-filter-config-override-not-exposed`).
  - Confidence: low
  - Missing: the expert's preferred interface breadth, and confirmation that `save_macs_pileup` stays out.
- Where no Galaxy wrapper runs the source's tool or script, is a substitute or omission acceptable?
  - Proposed: none is accepted without the expert. For each, the choices are a locally authored step running the source's own tool or script in its source container, the substitute build v0 used, or omission:
    - MACS3 peak calling: build v0 used MACS2 2.2.9.1 with the same callpeak arguments.
    - phantompeakqualtools (NSC/RSC, cross-correlation plot, `skip_spp`): build v0 omitted it (ledger drop `spp-not-built`).
    - The R peak-QC PDFs (`bin/plot_macs3_qc.r`, `bin/plot_homer_annotatepeaks.r`): build v0 produced their summary tables instead (ledger drop `peak-qc-plots-not-built`).
    - DESeq2 QC (`bin/deseq2_qc.r`): build v0 used the DESeq2 wrapper's count-matrix mode for size factors and the transformed matrix, with ports of the all-interval PCA and the Euclidean sample distances; the wrapper's PDF and contrast table differ from the script's plots (see the wrapper evidence under Requirements).
    - The consensus UpSet plot: build v0 produced a PNG with UpSetR's default styling instead of the source PDF.
  - Evidence: the wrapper evidence under Requirements. Galaxy release_26.1 can run a user-defined tool step, but it needs a user role that build v0 did not verify under planemo (ledger discovery `galaxy-user-tool-route`). Build v0 raised one recommendation per item (`confirm-macs2-for-macs3`, `accept-spp-drop-or-author-wrapper`, `accept-peak-qc-plots-drop`, `accept-png-upset-plot`); its tests were green with the substitutes.
  - Confidence: medium
  - Missing: John's choice per item, and whether authoring tools is in scope.
- Which tool-level deviations from the source's commands are acceptable?
  - Proposed: accept those that leave default-path results unchanged or change only labels or metadata, and record them:
    - HOMER annotation without `-gid`;
    - fingerprint curves labelled by element name rather than `--labels <IP> <control>`, so an IP and its control share a label;
    - STAR without `--runRNGseed 0` or read groups;
    - sample names restricted to letters, digits, `_`, `-` and space (no `.`);
    - the consensus boolean table carrying per-IP membership but not the per-IP fold, q-value and p-value columns of `macs3_merged_expand.py`;
    - one layout per sample documented as an input precondition rather than checked.

    Treat as open until checked: Chromap's forced PCR-duplicate removal (chip preset), which makes duplicate metrics and preseq understate duplication on the Chromap branch; CPM coverage from a tool other than `bedtools genomecov`; paired-end orphan and non-FR pair removal by a method other than `bampe_rm_orphan.py --only_fr_pairs`, not compared with the script; and NextSeq trimming, which no wrapper offers.
  - Evidence: the wrapper evidence under Requirements; ledger gaps `chromap-preset-pcr-dedup`, `star-wrapper-rngseed-readgroup`, `consensus-boolean-sample-columns`, `bam-remove-orphans-producer` and `fingerprint-labels`, and recommendations `allow-only-galaxy-safe-sample-names` and `accept-trim-nextseq-drop`. The Chromap and STAR cases were green with these deviations, and their peaks per IP and FRiP stayed close to the BWA case (see the comparability question).
  - Confidence: low
  - Missing: an expert view on which deviations matter.
- Which report content is a deliverable: the IGV session and the full MultiQC report?
  - Proposed: an IGV session file listing the bigWigs, peaks and consensus peaks by dataset name, with a placeholder genome, to be resolved after download; the source's relative-path layout is not reproduced. A MultiQC report with the source's sections except those no MultiQC wrapper input supports (deepTools plotProfile, fingerprint quality metrics, Picard quality-score distribution and mean quality by cycle; the tables stay outputs), with the DESeq2 sample distances as a table rather than a heatmap, and without STAR's alignment log, which the source collects (`ch_star_multiqc = ALIGN_STAR.out.log_final`, `workflows/chipseq.nf:225`) but never passes to MultiQC.
  - Evidence: the IGV module writes paths from the aligner and peak-type directory names with `--path_prefix '../../'` (`modules/local/igv.nf:15-17`, `modules/local/igv.nf:43`); Galaxy datasets have no stable relative paths. MultiQC inputs are at `workflows/chipseq.nf:536-577`. Build v0 built both and its tests were green on them, including with `skip_consensus_peaks` and `skip_trimming` (recommendations `clarify-igv-session`, `accept-multiqc-section-gaps`).
  - Confidence: low
  - Missing: whether John wants a session file and what it should reference, and how complete the aggregate report must be.
- How is scientific comparability established without a source run?
  - Proposed: compare later builds with build v0's measured values on the same inputs, and take a reference run of nf-core/chipseq 2.1.0 where Nextflow is available.
  - Evidence: the source ships no expected outputs and has no `tests/` directory; `nextflow` and `java` are absent on the agent host. Build v0 measured the genome size as 11,622,260 in every case, and per case (peaks per IP; FRiP; consensus intervals):
    - `test`, BWA, paired-end: 909/655/794/999; 0.41/0.40/0.35/0.37; 1472, counted 1472 × 4.
    - Single-end real Spt5 ChIP, Bowtie2: 591/586; 0.28/0.24; 747.
    - `test`, Chromap: 1045/889/1023/1059; 0.38/0.38/0.35/0.34; 1739.
    - `test`, STAR: 892/652/770/988; 0.38/0.38/0.34/0.36; 1446.
    - `test`, `skip_trimming`: 864/619/748/971; 0.39/0.39/0.33/0.36; 1417.

    These are reference values, not a source comparison. On `test` the IP reads are ATAC-seq (see Test data), so biology gives no expectation either.
  - Confidence: low
  - Missing: John's definition of "comparable", and whether a reference run is wanted.
- Which non-default paths must the tests exercise next?
  - Proposed: narrow peaks; a supplied `macs_gsize`, including one above 2^31 − 1; `deseq2_vst = false` (rlog); preseq on, with data on which it succeeds; a blacklist; GFF instead of GTF; a mixed single- and paired-end run (the primary sheet plus the two single-end IP rows and their inputs); and the drop-outs (a run below 10,000 trimmed reads, an IP with no peaks, an IP whose control dropped out).
  - Evidence: build v0 tested `test` (BWA), the single-end case (Bowtie2), Chromap, STAR, `skip_consensus_peaks` and `skip_trimming`, all with broad peaks, the derived genome size, VST and `skip_preseq = true`. Each path above was built but never run (ledger gaps include `macs-gsize-large-int` and `deseq2-qc-substitute-verify`). One test case took about an hour on this host (see Agent Environment).
  - Confidence: medium
  - Missing: how many test cases the expert wants, given the run time.

### Decisions

Only the first item is an expert decision. The others are recorded with their source so the expert can confirm or override them.

- John: "Convert the whole pipeline to an equivalent Galaxy workflow." No other Galaxy requirement (coordinator, `caller-request.md`).
- Coordinator context (not John's words): IP/input pairing, `macs_gsize` and the alternative aligners stay in scope; how they are supplied or selected is for the brief.
- Driver's reading (assumption, not John's or the coordinator's): scope is every analysis reachable under some parameter setting, and pipeline plumbing is excluded as non-scientific.
- Agent decision, for expert review: source branches that are optional, default-off or selectable stay in scope. Examples are the alternative aligners, narrow peaks, the blacklist, GFF input and the skips. How each is offered is recorded as an open question with a proposal that follows the caller's scope, not as a blocker.
- Agent decision, proven in build v0: IP/control pairs follow the source's sample-sheet contract. Each IP row names an antibody, a control sample and a control replicate; rows without them are controls. Pairing is at library level by that key (`bin/check_samplesheet.py:113-137`, `:218-226`; `workflows/chipseq.nf:397-411`). Controls are never peak-called, one control may serve several IPs, and there is no control-free mode, because the source has none. Evidence: build v0 `run-summary.md`: every IP was called against its own input in all six green cases, and each `test` input served two IPs. Was an open question (high) at v0.
- Agent decision, proven in build v0: the MACS3 genome size is an optional numeric input. When it is absent, it is the number of distinct canonical k-mers of the genome FASTA with k = `read_length`, which is then required. An exact count may replace khmer's estimate within 1% of khmer's value (agent tolerance, for expert review). iGenomes values are supplied through the same input, not looked up. Evidence: build v0 `run-summary.md`: the derived value was 11,622,260 against khmer's 11,624,332 at k = 50 (0.018%) in every case. The supplied-value path was not tested. Was an open question (medium) at v0.
- Agent decision, proven in build v0: all four source aligners are offered, selected per run, BWA by default (`aligner = 'bwa'`, `nextflow.config:34`; enum at `nextflow_schema.json:238`). Each builds its index from the FASTA, STAR with the GTF (`STAR_GENOMEGENERATE ( ch_fasta, ch_gtf )`, `subworkflows/local/prepare_genome.nf:206`). The source's per-aligner arguments are kept where the wrappers allow: BWA `'-M'` and `-bhS -F 0x0100 -O BAM` (`conf/modules.config:208`, `:213`); Chromap `'-l 2000 --low-mem --SAM'` (`:264`); STAR `'--alignIntronMax 1'` and `'--alignEndsType EndToEnd'` (`:282-283`). Each alternative is tested as a variant with only the aligner changed, as the source CI does (`.github/workflows/ci.yml:74-76`). Evidence: build v0 `run-summary.md`: BWA, Chromap and STAR were green on `test`, and Bowtie2 on the single-end case. The wrapper deviations are an open question. Was an open question (high) at v0.
- Agent decision, proven in build v0, for expert review: with Chromap, peak calling uses `--format BAM`, as the source forces (`params.aligner == "chromap" ? "--format BAM" : ''`, `conf/modules.config:575`), so paired-end alignments are read as single-end and MACS builds a fragment model. The source does not explain why. Evidence: build v0 `run-summary.md`: the Chromap case was green with the forced format asserted, and every IP produced peaks. Was an open question (low) at v0; the expert may still prefer paired-end-aware calling.
- Agent decision, proven for broad peaks in build v0: broad and narrow peaks are both selectable per run, broad (cutoff 0.1) by default (`conf/modules.config:571`; `nextflow.config:42-43`). The choice also selects broad or narrow consensus merging and the peak-QC mode (`modules/local/macs3_consensus.nf:32-35`). Evidence: build v0 `run-summary.md`: broad peaks were green in all six cases; the narrow path was built but not tested. Was an open question (high) at v0.
- Agent decision, proven in build v0: the default-on analyses run by default, and each skip is a run-time choice with the source default: preseq (`skip_preseq = false`, `nextflow.config:60`), Picard metrics, deepTools profile and fingerprint, peak annotation, peak QC, consensus, DESeq2 QC, IGV, MultiQC and FastQC/trimming (`nextflow.config:30`, `nextflow.config:48-65`). Evidence: build v0 `run-summary.md`: the default path, `skip_consensus_peaks` and `skip_trimming` (the source CI variants, `.github/workflows/ci.yml:52-53`) were green; preseq was built, but every case set `skip_preseq = true`, as `test` does. phantompeakqualtools and its skip are in the substitutes question. Was an open question (medium) at v0.
- Agent decision, proven in build v0: the source's own scripts are reproduced where they define results: sample-sheet validation and pairing (`bin/check_samplesheet.py`), FRiP (`modules/local/frip_score.nf:24-26`), the trimmed-read count from the read-2 Trim Galore log, consensus expansion with `--min_replicates` and the SAF (`modules/local/macs3_consensus.nf:37-51`), CPM scaling from the flagstat mapped count, and the data-dependent consensus and DESeq2 gates (`conf/modules.config:641`, `:687`). Evidence: build v0 `run-summary.md` and its green test cases, which asserted FRiP, consensus counts and both gates. Substitutes and tool-level deviations are open questions. Was part of an open question (medium) at v0.
- Agent decision, proven in build v0: single-end filtered BAMs are indexed and get samtools stats, flagstat and idxstats, as `SAMTOOLS_INDEX { ch_bam.single_end }` is read to intend (`subworkflows/local/bam_filter_bamtools.nf:47-58`). Evidence: build v0 `run-summary.md`: the single-end case was green with these outputs. No Nextflow run confirmed the source's own binding. Was an open question (medium) at v0.
- Agent decision, proven in build v0: the source `test` profile inputs are the primary equivalence case, with variants from the source CI (`--aligner bowtie2|chromap|star`, `--skip_trimming`, `--skip_consensus_peaks`; `.github/workflows/ci.yml:52-53`, `:74-76`) and a single-end case from the real Spt5 ChIP reads described under Test data. `test_full` (hg19) is not a routine test. Evidence: build v0 `run-summary.md`: six cases were green, with the single-end case run on Bowtie2. Further paths are an open question. Was an open question (medium) at v0.

### Related artifacts

- `summary-nextflow.json`: process topology, containers, 84 parameters, 10 reference assets and 7 rebuilds, 2 test candidates with `test_selection`, and correction-pass warnings.
- `summary-nextflow.cli.json`: the raw CLI summary before correction, kept for audit; not evidence.
- `phase1-notes.md`: phase-1 source facts with cites, the fetched test sample-sheet contents and the pre-plan cross-check.
- `caller-request.md`: John's objective, coordinator context and the driver's reading.
- `environment-probes.txt`: environment probes, 2026-10-30T17:10:09Z.
- Fixture: `workflow-fixtures/pipelines/nf-core__chipseq` at `76e2382b6d443db4dc2396e6831d1243256d80b0`.
- Build v0 run: `~/foundry-runs/prose-wb2g-chipseq-v0-2026-10-30/` (planemo green on all six cases across attempts 4 and 5; `run-summary.md`; ledger `open-requirements.ledger.yml`; IWC comparison `iwc-comparison-notes.md`; test data, checksums and read facts under `test-data/`; `test-data-refs.json`; kept test outputs under `.scratch/test-outputs/`).

## Agent Environment

Observed on the agent host from the seed probes (`environment-probes.txt`, 2026-10-30T17:10:09Z), build v0's `preflight.md` (2026-10-30T17:39Z) and build v0's planemo attempts, unless marked as requirements or unknowns. John stated no tooling, version or container requirement. The coordinator stated none either.

### Tooling

- Required versions: none stated by John or the coordinator. The brief Mold's bundle declares `foundry` with no version.
- `gxwf` and `galaxy-tool-cache`: not on PATH; they run from the Foundry worktree's `node_modules/.bin` (1.15.0).
- `foundry` and `summarize-nextflow`: not on PATH; per-run shims run the worktree build (node v26.13.0). `uvx` is present.
- `planemo`: not on PATH; build v0 ran planemo master `2a815808` (`0.75.48.dev0`) through a shim, with Galaxy `release_26.1` from `~/.planemo/gx_venv_3_release_26.1`. A one-tool warm-up took 94 seconds.
- Galaxy `release_26.1` (build v0 probes and runs): sample-sheet collections stage in workflow tests through `rows:`, but planemo passes no column definitions; workflow `when` expressions with negation, string equality and null tests evaluate; a skipped step's output is a null placeholder, and later steps do not skip on their own.
- planemo master: a skipped single-dataset workflow output cannot be asserted (it is reported as not found), while skipped elements of a collection can. After the first errored job planemo kept polling for about 15 minutes, then stopped with the invocation still scheduling, so later steps went unobserved.
- `nextflow`, `nf-test`, `java`, `khmer` and `unique-kmers.py` are absent. The source pipeline cannot be run here as a reference.
- Conda and Mamba are absent from PATH, but planemo finds a host `~/miniforge3` and resolves tools through it unless told otherwise (build v0 attempt 1).
- The Tool Shed API, quay.io and nf-core test-datasets are reachable.

### Constraints

- Host: Linux x86_64, 4 CPUs, 14 GiB RAM plus 16 GiB swap, about 426 GB free on `/` (also `/var/tmp`). Other pipeline runs may share the host.
- `/tmp` is a RAM-backed tmpfs (7.4G). Point `TMPDIR` for planemo at a short on-disk path (build v0: `/var/tmp/cs<N>`); a long path breaks Galaxy's socket path.
- Build v0's workflow ran about 425 jobs per case. One case took 71–73 minutes, three cases 191 minutes and five cases 291 minutes. The lowest MemAvailable was 8.2 GiB, with no OOM. Kept outputs for three cases were 230 MB.
- Brief production installs nothing, pulls no containers and downloads no data. Small source-referenced metadata (sample sheets, configs under 1 MB) may be fetched to verify facts (coordinator). Workflow builds may fetch test data and Tool Shed tools and pull the containers the workflow test needs.

### Containerization

- Container preference: none stated by John or the coordinator.
- Docker 29.1.3, native linux/amd64, overlayfs, 54 cached images at preflight; quay.io pulls work. Build v0 ran every tool from biocontainers.
- Tool dependencies must come from containers on this host: planemo's default conda resolution failed build v0's attempt 1 (iuc `gtftobed12` 357 could not load `libssl.so.1.0.0`), and the same tool ran from its biocontainer.
- `singularity`, `apptainer` and `podman`: absent from PATH.
- Source fact: the source's phantompeakqualtools module uses a Seqera Wave image (`community.wave.seqera.io/library/phantompeakqualtools:1.2.2--f8026fe2526a5e18`, `modules/nf-core/phantompeakqualtools/main.nf:9`). The others are biocontainers or mulled images (`summary-nextflow.json` `tools[]`).
