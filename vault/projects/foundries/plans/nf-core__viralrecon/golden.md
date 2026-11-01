# Workflow Brief: nf-core/viralrecon 3.0.0 (whole pipeline)

## Workflow

### Objective

John: "Convert the whole pipeline to an equivalent Galaxy workflow." (from `caller-request.md`; these are the only words from John, and John stated no other Galaxy requirement).

The source describes itself as `"description": "Assembly and intrahost/low-frequency variant calling for viral samples",` (nextflow_schema.json:5). It takes either Illumina reads described by a sample sheet, from amplicon (tiled-primer) or metagenomic (SISPA) libraries, or Oxford Nanopore basecalled reads in barcode directories mapped to samples by a sample sheet, plus a single viral reference genome, an optional annotation and, for amplicon data, a primer BED. Per sample it produces read QC, host-read screening, alignments with coverage summaries, low-frequency variant calls with functional annotation, a consensus genome with lineage (Pangolin), clade (Nextclade) and sequence QC, and lineage-mixture abundances (Freyja). For Illumina it can also de novo assemble the reads (SPAdes, Unicycler, minia) and assess the assemblies. A cross-sample variants long table and an aggregate QC report with summary metrics tables summarise the run.

### Sources

- Source: nf-core/viralrecon, `version         = '3.0.0'` (nextflow.config:566), commit `395079f1d24dce731ac22e03d7a5e71f110103fc` (coordinator pin `395079f1`; full SHA from `git rev-parse HEAD` in the fixture). `MIT License` (LICENSE:1). Repository https://github.com/nf-core/viralrecon. Every `path:N` cite below is relative to the fixture root `workflow-fixtures/pipelines/nf-core__viralrecon`, except `fetched/` cites, which name files fetched in phase 1 to the run's `.scratch/fetched/`.
- Expert intent: John's objective only. Coordinator context and the driver's reading come from `caller-request.md`; neither is John's, and this brief labels each where it uses them.
- Source evidence: `summary-nextflow.json` (phase-1 CLI output plus a correction pass; schema-valid) and `phase1-notes.md` (phase-1 source facts with cites, database and catalogue findings, the nf-test case census and pre-plan verdicts). Where this brief restates a condition, it quotes the source expression with its operators.
- Remote catalogue evidence (phase-1 probe): the source includes `pipeline/viralrecon.config` from nf-core/configs at run time (see Open questions). Phase 1 resolved `master` to commit `d1a3f858c5e75ea25fd3db1ca88c251ab446411f` with `gh api` and fetched `pipeline/viralrecon.config` and `conf/pipeline/viralrecon/genomes.config` at that commit; it also sent HEAD requests for the reference, primer, Nextclade and Kraken2 test URLs it cites (sizes below). No reads, containers, databases or genomes were downloaded.
- Pre-plan: `PREPLAN.md` in the galaxy-brain plans directory, supplied by the coordinator as unverified hints. This brief uses only facts that phase 1 or this phase re-read in the source (phase 1 recorded a verdict for each hint).
- Environment evidence: `environment-probes.txt` (driver probes, 2026-10-31T23:24:50Z) and this phase's validator pin check.
- Test evidence: six nf-test files at pipeline level, all `script "../main.nf"`, with 23 whole-pipeline cases (3 profile cases and 20 cases from literal scenario lists; phase-1 census), e.g. `test("-profile test") {` (tests/default.nf.test:8), `test("-profile test_nanopore") {` (tests/test_nanopore.nf.test:8), `test("-profile test_sispa") {` (tests/test_sispa.nf.test:8). Snapshots record software versions, output names and md5s of content-stable files.

### Scope

#### Included

The scope is every scientific analysis the source can run under some parameter setting (driver's reading of John's objective, an assumption recorded in `caller-request.md`). The coordinator's context adds that both platforms (Illumina, Nanopore), both Illumina protocols (amplicon, SISPA/metagenomic), the alternative variant caller and the de novo assemblers stay in scope, and that the reference databases, lineage/clade datasets and the remote genome and primer catalogue stay in scope with their supply left as a question. Process topology stays in `summary-nextflow.json`.

There is one primary workflow, `workflow VIRALRECON {` (workflows/viralrecon.nf:159), whose body branches on `if (params.platform == 'illumina') {` (workflows/viralrecon.nf:191) and `} else if (params.platform == 'nanopore') {` (workflows/viralrecon.nf:693).

- Reference preparation, both platforms (`subworkflows/local/prepare_genome_illumina`, `subworkflows/local/prepare_genome_nanopore`, chosen by `include { PREPARE_GENOME_ILLUMINA as PREPARE_GENOME }` (workflows/viralrecon.nf:91) or `include { PREPARE_GENOME_NANOPORE as PREPARE_GENOME }` (workflows/viralrecon.nf:93)):
  - decompress a gzipped reference FASTA, GFF or primer BED (`if (fasta.endsWith('.gz')) {` (subworkflows/local/prepare_genome_illumina/main.nf:41));
  - derive the FASTA index and chromosome sizes (`CUSTOM_GETCHROMSIZES (` (subworkflows/local/prepare_genome_illumina/main.nf:70));
  - unpack, use or build the Kraken2 host database (`if (params.kraken2_db.endsWith('.tar.gz')) {` (subworkflows/local/prepare_genome_illumina/main.nf:83), `KRAKEN2_BUILD (` (subworkflows/local/prepare_genome_illumina/main.nf:93));
  - collapse primer pairs into amplicon intervals for amplicon coverage (`COLLAPSE_PRIMERS (` (subworkflows/local/prepare_genome_illumina/main.nf:121));
  - Illumina amplicon assembly: use a supplied primer FASTA or extract one from the primer BED (`BEDTOOLS_GETFASTA (` (subworkflows/local/prepare_genome_illumina/main.nf:142));
  - Illumina: unpack, use or build the Bowtie2 index (`BOWTIE2_BUILD (` (subworkflows/local/prepare_genome_illumina/main.nf:168));
  - unpack, use or download the Nextclade dataset (`NEXTCLADE_DATASETGET (` (subworkflows/local/prepare_genome_illumina/main.nf:192));
  - Illumina assembly: unpack, use or build the BLAST database from the reference (`BLAST_MAKEBLASTDB (` (subworkflows/local/prepare_genome_illumina/main.nf:220));
  - build the snpEff database from the reference FASTA and GFF (`SNPEFF_BUILD (` (subworkflows/local/prepare_genome_illumina/main.nf:235)).
- Reference and primer consistency checks: primer contigs must be present in the reference (`.map { fai, bed -> WorkflowCommons.checkContigsInBED(fai, bed, log) }` (workflows/viralrecon.nf:222)); warnings for a multi-sequence reference, primer names without the expected suffixes and a SWIFT/SNAP primer BED (`.map { WorkflowIllumina.isMultiFasta(it, log) }` (workflows/viralrecon.nf:200), `.map { WorkflowIllumina.checkIfSwiftProtocol(it, 'covid19genome', log) }` (workflows/viralrecon.nf:229)).
- Illumina input: sample-sheet rows, single- or paired-end, with runs of one sample concatenated (`CAT_FASTQ (` (workflows/viralrecon.nf:236)).
- Illumina read QC and trimming: FastQC before and after fastp, each skippable; samples with no reads left after fastp are dropped and reported (`if (!params.skip_fastp) {` (workflows/viralrecon.nf:262), `def pass = WorkflowIllumina.getFastpReadsAfterFiltering(json) > 0` (workflows/viralrecon.nf:267)).
- Kraken2 host-read classification, both platforms, with optional removal of host reads before variant calling and (by default) before assembly (`if (params.kraken2_variants_host_filter) {` (workflows/viralrecon.nf:311), `if (params.kraken2_assembly_host_filter) {` (workflows/viralrecon.nf:315)).
- Illumina variant branch (`if (!params.skip_variants) {` (workflows/viralrecon.nf:325)):
  - Bowtie2 alignment with sorting, indexing and samtools stats; samples at or below the mapped-read threshold are dropped and reported (`if (mapped_reads > params.min_mapped_reads.toInteger()) {` (subworkflows/local/utils_nfcore_viralrecon_pipeline/main.nf:298));
  - iVar primer trimming for amplicon data (`if (!params.skip_variants && !params.skip_ivar_trim && params.protocol == 'amplicon') {` (workflows/viralrecon.nf:387));
  - Picard duplicate marking, off by default (`if (!params.skip_variants && !params.skip_markduplicates) {` (workflows/viralrecon.nf:402), `skip_markduplicates          = true` (nextflow.config:84));
  - Picard alignment metrics (`if (!params.skip_variants && !params.skip_picard_metrics) {` (workflows/viralrecon.nf:417));
  - mosdepth genome-wide coverage and, for amplicon data, per-amplicon coverage, each with plots (`if (!params.skip_variants && !params.skip_mosdepth) {` (workflows/viralrecon.nf:429), `PLOT_MOSDEPTH_REGIONS_AMPLICON (` (workflows/viralrecon.nf:452));
  - variant calling with iVar or BCFtools (`if (!params.skip_variants && variant_caller == 'ivar') {` (workflows/viralrecon.nf:466), `if (!params.skip_variants && variant_caller == 'bcftools') {` (workflows/viralrecon.nf:490)), each followed by VCF indexing, `bcftools stats` and, with a GFF, snpEff annotation and SnpSift field extraction (`if (gff && !params.skip_snpeff) {` (subworkflows/local/variants_qc/main.nf:33));
  - Freyja lineage-mixture demixing with optional bootstrap (`if (!params.skip_variants && !params.skip_freyja) {` (workflows/viralrecon.nf:511));
  - consensus with iVar or with BCFtools (filtered calls applied to a low-coverage-masked reference) (`if (!params.skip_consensus && params.consensus_caller == 'ivar') {` (workflows/viralrecon.nf:531), `if (!params.skip_consensus && params.consensus_caller == 'bcftools' && variant_caller) {` (workflows/viralrecon.nf:548));
  - consensus QC: QUAST, Pangolin lineage, Nextclade clade and base-density plots (`if (!params.skip_variants_quast) {` (subworkflows/local/consensus_qc/main.nf:27), `if (!params.skip_pangolin) {` (subworkflows/local/consensus_qc/main.nf:49), `if (!params.skip_nextclade) {` (subworkflows/local/consensus_qc/main.nf:70), `if (!params.skip_consensus_plots) {` (subworkflows/local/consensus_qc/main.nf:84));
  - cross-sample variants long table (`if (!params.skip_variants && !params.skip_variants_long_table && ch_genome_gff && !params.skip_snpeff) {` (workflows/viralrecon.nf:590)) and, given an extra annotation file, a second annotation and long table (`if (params.additional_annotation) {` (workflows/viralrecon.nf:603)).
- Illumina de novo assembly branch:
  - for amplicon data, primer removal from the assembly reads with cutadapt, then FastQC (`if (params.protocol == 'amplicon' && !params.skip_assembly && !params.skip_cutadapt) {` (workflows/viralrecon.nf:618)), with non-internal primer handling unless skipped (`if (!params.skip_noninternal_primers){` (workflows/viralrecon.nf:620));
  - SPAdes, Unicycler and minia, each selected by name (`if (!params.skip_assembly && 'spades' in assemblers) {` (workflows/viralrecon.nf:646), `if (!params.skip_assembly && 'unicycler' in assemblers) {` (workflows/viralrecon.nf:664), `if (!params.skip_assembly && 'minia' in assemblers) {` (workflows/viralrecon.nf:680)); Bandage graph images for SPAdes and Unicycler (`if (!params.skip_bandage) {` (subworkflows/local/assembly_spades/main.nf:82));
  - assembly QC: BLAST against the reference database with hit filtering, QUAST, ABACAS contig ordering and PlasmidID (off by default) (`if (!params.skip_blast) {` (subworkflows/local/assembly_qc/main.nf:29), `if (!params.skip_assembly_quast) {` (subworkflows/local/assembly_qc/main.nf:51), `if (!params.skip_abacas) {` (subworkflows/local/assembly_qc/main.nf:71), `if (!params.skip_plasmidid) {` (subworkflows/local/assembly_qc/main.nf:91), `skip_plasmidid               = true` (nextflow.config:100)).
- Nanopore branch:
  - pycoQC on the sequencing summary when one is given (`if (params.sequencing_summary && !params.skip_pycoqc) {` (workflows/viralrecon.nf:701));
  - barcode-directory discovery and joining to the sample sheet, with reports of barcodes without a sample, samples without a barcode and barcodes below the read threshold (`.join(ch_fastq_dirs, remainder: true)` (workflows/viralrecon.nf:752), `.filter { it[-1] > params.min_barcode_reads }` (workflows/viralrecon.nf:840));
  - ARTIC guppyplex read length filtering (`ARTIC_GUPPYPLEX (` (workflows/viralrecon.nf:847)), NanoPlot (`if (!params.skip_nanoplot) {` (workflows/viralrecon.nf:911)) and Kraken2;
  - ARTIC minion (alignment, primer trimming, variant calling and consensus) on samples above the guppyplex read threshold (`ARTIC_GUPPYPLEX.out.fastq.filter { it[-1].countFastq() > params.min_guppyplex_reads },` (workflows/viralrecon.nf:923));
  - duplicate-variant removal, VCF indexing and `bcftools stats` (`VCFLIB_VCFUNIQ (` (workflows/viralrecon.nf:935), `BCFTOOLS_STATS (` (workflows/viralrecon.nf:951));
  - unmapped-read removal and samtools stats, then the mapped-read threshold (`FILTER_BAM_SAMTOOLS (` (workflows/viralrecon.nf:965));
  - mosdepth genome-wide and per-amplicon coverage with plots (`if (!params.skip_mosdepth) {` (workflows/viralrecon.nf:1036));
  - Pangolin, Nextclade, Freyja and a cross-sample consensus QUAST (`if (!params.skip_pangolin) {` (workflows/viralrecon.nf:1075), `if (!params.skip_nextclade) {` (workflows/viralrecon.nf:1095), `if (!params.skip_freyja) {` (workflows/viralrecon.nf:1129), `if (!params.skip_variants_quast) {` (workflows/viralrecon.nf:1146));
  - snpEff/SnpSift annotation, variants long table and the optional additional annotation (`if (ch_genome_gff && !params.skip_snpeff) {` (workflows/viralrecon.nf:1164), `if (!params.skip_variants_long_table && ch_genome_gff && !params.skip_snpeff) {` (workflows/viralrecon.nf:1179), `if (params.additional_annotation) {` (workflows/viralrecon.nf:1192)).
- Aggregate QC report, both platforms, with platform-specific configuration, the failure tables above, a Nextclade clade table and the summary variants and assembly metrics tables (`if (!params.skip_multiqc) {` (workflows/viralrecon.nf:1219), `multiqc_to_custom_csv.py --platform $platform` (modules/nf-core/multiqc/main.nf:51), `out_file=args.OUT_PREFIX + "_variants_metrics_mqc.csv",` (bin/multiqc_to_custom_csv.py:329), `out_file=args.OUT_PREFIX + "_assembly_metrics_mqc.csv",` (bin/multiqc_to_custom_csv.py:337)).

#### Excluded

- Pipeline plumbing (driver's reading, an assumption, not John's or the coordinator's words): parameter validation and help, software-version collation, completion emails and chat hooks, nf-core utility subworkflows, the methods-description text and publishing options. The version collation feeds the aggregate report (`softwareVersionsToYAML(ch_versions)` (workflows/viralrecon.nf:1208)); whether the report must list tool versions is left to the report question below.
- The helper script `bin/fastq_dir_to_samplesheet.py`, which builds a sample sheet from a FASTQ directory before a run (`has been provided if you are using` (README.md:158)); no pipeline module or workflow calls it (this phase's grep).
- No scientific analysis is excluded. Default-off and skippable branches stay in scope as run-time choices (see Open questions).

### Inputs and outputs

Inputs (scientific roles; formats are the source's):

- Illumina samples: a sample sheet with `sample`, `fastq_1` and optional `fastq_2` (gzipped FASTQ); an empty `fastq_2` means single-end, and all runs of a sample must share endedness (`def endedness_ok = metas.collect{ meta -> meta.single_end }.unique().size == 1` (subworkflows/local/utils_nfcore_viralrecon_pipeline/main.nf:197)). Parsing follows the nf-schema row schema (`samplesheetToList(params.input, "${projectDir}/assets/schema_input.json")` (subworkflows/local/utils_nfcore_viralrecon_pipeline/main.nf:100)).
- Nanopore samples: a directory of basecalled reads, normally `barcode*` subdirectories (`barcode_dirs       = file("${params.fastq_dir}/barcode*", type: 'dir' , maxdepth: 1)` (workflows/viralrecon.nf:730)), a sample sheet mapping `sample` to integer `barcode` (`tuple( "barcode"+ String.format('%02d', barcode).toString(), meta.id)` (subworkflows/local/utils_nfcore_viralrecon_pipeline/main.nf:125)), and an optional sequencing summary.
- A sample sheet is required on both platforms (`if (params.input)                 { ch_input          = file(params.input)                 } else { exit 1, 'Input samplesheet file not specified!' }` (workflows/viralrecon.nf:49)), and so is the platform (`if( !params.platform ) {` (main.nf:22)).
- Reference: one viral genome FASTA (on Illumina, a multi-sequence FASTA only warns), an optional GFF annotation (several annotation, long-table and QC steps need it), and, for Illumina amplicon and Nanopore data, a primer BED with `_LEFT`/`_RIGHT` primer-name suffixes by default (`primer_left_suffix           = '_LEFT'` (nextflow.config:22)). Optional: a primer FASTA, a Bowtie2 index, a BLAST database, a SPAdes HMM, and an additional annotation file (GTF in the source tests).
- Databases and datasets: a Kraken2 host database, a Nextclade dataset, Pangolin lineage data and Freyja barcodes and lineage metadata. How each is supplied is an open question.
- Nanopore model: an optional Clair3 model name and model directory for ARTIC minion (`"description": "Path containing clair3 models. Defaults to models packaged with conda installation",` (nextflow_schema.json:193)).

Outputs (per sample unless noted):

- Read QC (FastQC, fastp, NanoPlot, pycoQC per run) and Kraken2 reports.
- Alignments (Illumina: Bowtie2, primer-trimmed for amplicon; Nanopore: ARTIC primer-trimmed) with samtools statistics, Picard metrics, and mosdepth genome and amplicon coverage with cross-sample plots and heatmap tables.
- Variant calls (VCF with index and `bcftools stats`), snpEff annotation and SnpSift tables; a cross-sample variants long table (CSV) and, given an additional annotation, a second one.
- Consensus genome (FASTA) with N-run and base-count tables and plots, Pangolin lineage report, Nextclade report and a cross-sample QUAST; e.g. the default test pins `"SAMPLE1_PE.consensus.fa:md5,c5e132e6eb734d77f729ff04f8350873",` (tests/default.nf.test.snap:1076) and `"variants_long_table.csv:md5,4f18039f0146a8fb967769881e6e6635"` (tests/default.nf.test.snap:1107).
- Freyja variants, demixed abundances and bootstrap lineage and summary tables.
- Illumina assemblies per assembler: contigs or scaffolds, assembly graph and Bandage image, filtered BLAST hits, QUAST, ABACAS and PlasmidID results.
- Run-level: lists of failed samples and barcodes, the aggregate QC report and the summary variants and assembly metrics tables.

### Requirements and preferences

- John (binding): the Galaxy workflow is equivalent to the whole pipeline. No other Galaxy requirement.
- Coordinator context (not John's words; steers proposals, John confirms): both platforms, both Illumina protocols, the alternative variant caller and the de novo assemblers stay in scope; database, dataset and catalogue supply is a question, not a reason to drop steps; John has not decided how reference databases are supplied for test builds (also pending on nf-core/bacass).
- Source behaviour that equivalence depends on (source; strength: required unless John overrides):
  - Tool settings come from `conf/modules_illumina.config` and `conf/modules_nanopore.config`, e.g. `ext.args = '--cut_front --cut_tail --trim_poly_x --cut_mean_quality 30 --qualified_quality_phred 30 --unqualified_percent_limit 10 --length_required 50'` (conf/modules_illumina.config:75), `ext.args = '--local --very-sensitive-local --seed 1'` (conf/modules_illumina.config:150), `ext.args = '-t 0.25 -q 20 -m 10'` (conf/modules_illumina.config:398), `ext.args = params.protocol == 'amplicon' ? '--ignore_strand_bias' : ''` (conf/modules_illumina.config:408), `ext.args3 = "--include 'INFO/DP>=10'"` (conf/modules_illumina.config:448), `ext.args = '-t 0.75 -q 20 -m 10 -n N'` (conf/modules_illumina.config:578), `variant_caller == 'ivar'     ? "--include 'FORMAT/ALT_FREQ >= 0.75'"           : '',` (conf/modules_illumina.config:603), `variant_caller == 'bcftools' ? "--include 'FORMAT/AD[:1] / FORMAT/DP >= 0.75'" : '',` (conf/modules_illumina.config:604), `ext.args2 = 10` (conf/modules_illumina.config:625), `ext.args = '--overlap 5 --minimum-length 30 --error-rate 0.1'` (conf/modules_illumina.config:765), `ext.args = '-kmer-size 31 -abundance-min 20'` (conf/modules_illumina.config:1006), `ext.args = params.primer_set_version == 1200 ? '--min-length 250 --max-length 1500' : '--min-length 400 --max-length 700'` (conf/modules_nanopore.config:37), `ext.args = '--normalise 500'` (conf/modules_nanopore.config:45), `ext.args = '-b -F 4'` (conf/modules_nanopore.config:72).
  - iVar trimming keeps reads of 30 bp or more at quality 20 and by default keeps only reads that start in a primer (`'-m 30 -q 20',` (conf/modules_illumina.config:239), `params.ivar_trim_noprimer ? '' : '-e',` (conf/modules_illumina.config:240)).
  - BLAST hits are filtered by contig length and aligned fraction and phage hits dropped (`awk 'BEGIN{OFS=\"\\t\";FS=\"\\t\"} \$16 > ${min_contig_length} && \$18 > ${min_perc_contig_aligned} && \$1 !~ /phage/ {print \$0}' > tmp.out` (modules/local/filter_blastn/main.nf:30)).
  - Source scripts define results and are reproduced where they do: `ivar_variants_to_vcf.py`, `make_bed_mask.py`, `make_variants_long_table.py`, `collapse_primer_bed.py`, `plot_base_density.r`, `plot_mosdepth_regions.r` and `multiqc_to_custom_csv.py` (all in `bin/`).
  - Three nf-core modules are locally patched, so the patched behaviour is the reference: `"patch": "modules/nf-core/artic/minion/artic-minion.diff"` (modules.json:22), `"patch": "modules/nf-core/cutadapt/cutadapt.diff"` (modules.json:113), `"patch": "modules/nf-core/multiqc/multiqc.diff"` (modules.json:184).
  - Illumina consensus needs the variant branch: with `--skip_variants` the BAM channel stays empty (`ch_bam = Channel.empty()` (workflows/viralrecon.nf:323)) and no consensus, lineage or clade output is made; the phase-1 snapshot census shows the `--skip_variants` case with 24 version entries against 59 for the default case.
  - Duplicate removal, when marking is on, follows `params.filter_duplicates ? 'REMOVE_DUPLICATES=true' : ''` (conf/modules_illumina.config:286).

### Acceptance criteria

- Each source mode runs end to end on the source's own test inputs for that mode: Illumina amplicon (`-profile test`), Illumina SISPA/metagenomic (`-profile test_sispa`) and Nanopore amplicon (`-profile test_nanopore`).
- Outputs the source snapshots as content-stable (consensus FASTA, consensus base-QC tables, Pangolin reports, the variants long table and others listed in the `.snap` files) match the source's results for the same inputs and database versions; outputs the source ignores for content (Freyja, MultiQC files, assembly details, ARTIC VCFs and BAMs) match by presence and kind.
- Samples and barcodes that fail the source's read-count, post-trim and mapped-read thresholds are dropped from the same downstream steps and appear in the failure reports.
- Every run-time choice kept in scope (platform, protocol, variant caller, consensus caller, assemblers, SPAdes mode, skip and default-off branches) changes the outputs the way the corresponding source parameter does.

### Open questions

- How are the source's modes (Illumina amplicon, Illumina metagenomic/SISPA, Nanopore) selected?
  - Proposed: every mode is reachable, each with the source's per-mode behaviour, selected the way the source selects it (platform, then protocol for Illumina). Whether that is one entry point or several is left to design, provided each mode can be run and tested on its own.
  - Evidence: one body branched by `if (params.platform == 'illumina') {` (workflows/viralrecon.nf:191); amplicon-only steps test `params.protocol == 'amplicon'`; `"enum": ["metagenomic", "amplicon"]` (nextflow_schema.json:36). The Nanopore test sets no protocol (`platform           = 'nanopore'` (conf/test_nanopore.config:26)). Coordinator context keeps all modes in scope.
  - Confidence: medium
  - Missing: whether John wants a single entry point.
- Which variant caller runs on Illumina data?
  - Proposed: a run-time choice of iVar or BCFtools, defaulting as the source does: iVar for amplicon, BCFtools otherwise.
  - Evidence: `if (!variant_caller) { variant_caller = params.protocol == 'amplicon' ? 'ivar' : 'bcftools' }` (workflows/viralrecon.nf:56); `variant_caller = 'ivar'` (conf/test.config:37), `variant_caller = 'bcftools'` (conf/test_sispa.config:35); an amplicon scenario case runs BCFtools calling with iVar consensus (phase-1 census).
  - Confidence: high
- Which consensus caller runs on Illumina data?
  - Proposed: a run-time choice of BCFtools (default) or iVar, with the source's thresholds (Requirements).
  - Evidence: `consensus_caller             = 'bcftools'` (nextflow.config:76); the two consensus gates are quoted under Scope; scenario case `-profile test --consensus_caller ivar` (phase-1 census).
  - Confidence: high
- How are assemblers and the SPAdes mode chosen?
  - Proposed: any subset of SPAdes, Unicycler and minia as a run-time choice, default SPAdes; the SPAdes mode is a run-time choice from the source's list, default `rnaviral`. In `meta*` and `bio` modes single-end samples are left out of SPAdes, as in the source.
  - Evidence: `def assemblers = params.assemblers ? params.assemblers.split(',').collect{ it.trim().toLowerCase() } : []` (workflows/viralrecon.nf:53), `assemblers                   = 'spades'` (nextflow.config:91), `spades_mode                  = 'rnaviral'` (nextflow.config:92), `if (mode.contains('meta') || mode.contains('bio')) {` (subworkflows/local/assembly_spades/main.nf:31), `.filter { meta, illumina, pacbio, nanopore -> !meta.single_end }` (subworkflows/local/assembly_spades/main.nf:33). Tests use `assemblers     = 'spades,unicycler'` (conf/test.config:41) and `assemblers     = 'spades,unicycler,minia'` (conf/test_sispa.config:39), plus `--spades_mode corona` and `metaviral` scenarios.
  - Confidence: high
- How are the reference genome, annotation and primer BED supplied, given that the source looks them up by name in a remote catalogue?
  - Proposed: supply the reference FASTA, GFF and primer BED directly as inputs. Do not reproduce the name lookup. Record the catalogue entries the tests use (genome `MN908947.3`, ARTIC primer sets 1 and 3) as test-data provenance at nf-core/configs `d1a3f858c5e75ea25fd3db1ca88c251ab446411f`.
  - Evidence: `includeConfig params.custom_config_base && (!System.getenv('NXF_OFFLINE') || !params.custom_config_base.startsWith('http')) ? "${params.custom_config_base}/pipeline/viralrecon.config" : "/dev/null"` (nextflow.config:262) with `custom_config_version        = 'master'` (nextflow.config:123), so the catalogue is unpinned at run time and absent offline. Lookup: `if (params.genomes && params.genome && params.genomes.containsKey(params.genome)) {` (main.nf:165); FASTA and GFF come from the genome level (`params.fasta         = getGenomeAttribute('fasta')` (main.nf:43)), the primer BED from the primer set (`params.primer_bed    = getGenomeAttribute('primer_bed', primer_set, primer_set_version)` (main.nf:46)). At the probed commit, `fasta                       = 'https://github.com/nf-core/test-datasets/raw/viralrecon/genome/MN908947.3/GCA_009858895.3_ASM985889v3_genomic.200409.fna.gz'` (fetched/nfcore_configs__conf__pipeline__viralrecon__genomes.config:29) and `primer_bed = 'https://github.com/artic-network/artic-ncov2019/raw/master/primer_schemes/nCoV-2019/V1/nCoV-2019.primer.bed'` (fetched/nfcore_configs__conf__pipeline__viralrecon__genomes.config:42); the primer BED URLs follow artic-network `master`, also unpinned. Phase-1 HEAD sizes: FASTA 9,592 B, GFF 1,132 B, V1 BED 8,756 B, V3 BED 9,839 B. The catalogue holds 11 genome keys and many primer sets (phase-1 probe). The primer-set `fasta` entries are never read.
  - Confidence: medium
  - Missing: whether John wants named-genome lookup kept as a feature, and John's pending decision on how references are supplied for test builds.
- How is the Kraken2 host database supplied?
  - Proposed: a supplied, prebuilt database (packed or unpacked), as every source test does. Building one by name with `kraken2-build --download-taxonomy` is the source's fallback when no database is given; keep it only if John asks.
  - Evidence: default `kraken2_db                   = 's3://ngi-igenomes/test-data/viralrecon/kraken2_human.tar.gz'` (nextflow.config:62); tests use `kraken2_db = "${params.pipelines_testdata_base_path}/genome/kraken2/kraken2_hs22.tar.gz"` (conf/test.config:34) (phase-1 HEAD: 41,124,668 B); fallback `kraken2-build --db kraken2_db --threads $task.cpus $args  --download-taxonomy` (modules/local/kraken2/build/main.nf:25). Coordinator context: John has not decided how reference databases are supplied for test builds.
  - Confidence: low
  - Missing: John's decision on reference-database supply (also pending on nf-core/bacass).
- How is the Nextclade dataset supplied?
  - Proposed: a supplied dataset (archive or directory); for SARS-CoV-2 tests, the catalogue's archive tagged `2024-10-17--16-48-48Z`. Downloading by name and tag is the source fallback; keep it only if John asks.
  - Evidence: `params.nextclade_dataset           = getGenomeAttribute('nextclade_dataset_v3pl')` (main.nf:48); `if (nextclade_dataset.endsWith('.tar.gz')) {` (subworkflows/local/prepare_genome_illumina/main.nf:182), else `} else if (nextclade_dataset_name) {` (subworkflows/local/prepare_genome_illumina/main.nf:191) runs `--name $dataset \\` (modules/nf-core/nextclade/datasetget/main.nf:30); catalogue `nextclade_dataset_v3pl      = 'https://github.com/nf-core/test-datasets/raw/viralrecon/genome/MN908947.3/nextclade_sars-cov-2_MN908947_2024-10-17--16_48_48Z.tar.gz'` (fetched/nfcore_configs__conf__pipeline__viralrecon__genomes.config:32) (phase-1 HEAD: 8,689,152 B). Tests drop the Nextclade version from snapshots (`softwareYaml.remove('NEXTCLADE_RUN')` (tests/default.nf.test:22)).
  - Confidence: low
  - Missing: John's reference-database decision.
- How are Pangolin lineage data supplied?
  - Proposed: a supplied, versioned lineage-data set, so lineage calls do not depend on when the run happens. The source default fetches current data at run time (`--update-data`); keep that as an option only if John asks.
  - Evidence: `if (!params.pango_database) {` (subworkflows/local/consensus_qc/main.nf:50) runs `PANGOLIN_UPDATEDATA('pangolin_db')` (subworkflows/local/consensus_qc/main.nf:51), whose command has `--update-data \\` (modules/nf-core/pangolin/updatedata/main.nf:29); no test sets `pango_database`, yet the default snapshot pins `"SAMPLE1_PE.pangolin.csv:md5,fcd286546aca592b5486d41308159611",` (tests/default.nf.test.snap:1088).
  - Confidence: low
  - Missing: John's reference-database decision and which lineage-data release to use.
- How are Freyja barcodes and lineage metadata supplied?
  - Proposed: supplied, versioned barcodes and lineage metadata. The source default downloads current ones at run time (`freyja update`); keep that only if John asks.
  - Evidence: `if (!ch_barcodes || !ch_lineages_meta) {` (subworkflows/nf-core/bam_variant_demix_boot_freyja/main.nf:33) runs `FREYJA_UPDATE (` (subworkflows/nf-core/bam_variant_demix_boot_freyja/main.nf:34); `freyja_barcodes              = null` (nextflow.config:43); no test supplies barcodes, and the source's tests ignore Freyja output content (`**/freyja/demix/**`, tests/.nftignore line 42).
  - Confidence: low
  - Missing: John's reference-database decision and which barcode release to use.
- Which derived references are built and which may be supplied?
  - Proposed: follow the source. Build the FASTA index, chromosome sizes, collapsed primer BED, snpEff database, Bowtie2 index, BLAST database and primer FASTA from the supplied reference, annotation and primer BED. Accept a supplied Bowtie2 index, BLAST database and primer FASTA as optional overrides, as the source does.
  - Evidence: builders quoted under Scope; snpEff has no supply option (`SNPEFF_BUILD (` (subworkflows/local/prepare_genome_nanopore/main.nf:155)); a scenario case supplies a packed Bowtie2 index (phase-1 census: it adds the unpack step and drops `BOWTIE2_BUILD`).
  - Confidence: medium
  - Missing: whether John wants the prebuilt-index overrides at all.
- What does the host filter do on each platform?
  - Proposed: follow the source's effective behaviour. On Illumina, host reads are removed only from the assembly reads by default (`kraken2_assembly_host_filter = true` (nextflow.config:65), `kraken2_variants_host_filter = false` (nextflow.config:64)). On Nanopore, Kraken2 only reports: ARTIC minion reads the guppyplex output, so filtered reads reach no later step. The documented meaning (remove host reads before variant calling) is the alternative.
  - Evidence: Nanopore rebinding `ch_variants_fastq = KRAKEN2_KRAKEN2.out.unclassified_reads_fastq` (workflows/viralrecon.nf:871) is never read again, and minion takes `ARTIC_GUPPYPLEX.out.fastq.filter { it[-1].countFastq() > params.min_guppyplex_reads },` (workflows/viralrecon.nf:923). The parameter's description reads `"description": "Remove host reads identified by Kraken2 before running variant calling steps in the pipeline."` (nextflow_schema.json:342).
  - Confidence: low
  - Missing: whether John wants the documented meaning on Nanopore (host-filtered reads into ARTIC minion).
- Which Nanopore read layouts are supported?
  - Proposed: barcode directories joined to the sample sheet, as the tests use. Also keep the single-directory layout (reads directly in the directory become one sample, `SAMPLE_1`, which bypasses the barcode read threshold). The source's no-sample-sheet branch is unreachable and is not reproduced.
  - Evidence: `} else if (single_barcode_dir) {` (workflows/viralrecon.nf:801), `.map { it -> [ 'SAMPLE_1', 'single_barcode', it, 10000000 ] }` (workflows/viralrecon.nf:804); the `else` of `if (params.input) {` (workflows/viralrecon.nf:750) cannot run because a missing sample sheet exits earlier (quoted under Inputs). No test covers the single-directory layout.
  - Confidence: low
  - Missing: how John's Nanopore runs arrive (demultiplexed barcode directories or one directory).
- How are samples exactly at a read-count threshold treated?
  - Proposed: follow the source's pass rules (strictly greater than `min_barcode_reads`, `min_guppyplex_reads` and `min_mapped_reads`). Samples exactly at a barcode or guppyplex threshold are dropped but appear in neither the pass nor the fail table in the source; propose listing them with the failures.
  - Evidence: `pass: count > params.min_barcode_reads` (workflows/viralrecon.nf:815) and `fail: count < params.min_barcode_reads` (workflows/viralrecon.nf:818); the same pattern for guppyplex at `pass: count > params.min_guppyplex_reads` (workflows/viralrecon.nf:887) and `fail: count < params.min_guppyplex_reads` (workflows/viralrecon.nf:889). Defaults `min_barcode_reads            = 100` (nextflow.config:30), `min_guppyplex_reads          = 10` (nextflow.config:31), `min_mapped_reads             = 1000` (nextflow.config:77).
  - Confidence: low
  - Missing: John's preference; listing tied samples as failures departs from the source's reports.
- Which Nanopore consensus sequences feed lineage and clade assignment?
  - Proposed: follow the source. Pangolin and Nextclade read every ARTIC consensus; QUAST, Freyja and coverage read only samples above the mapped-read threshold.
  - Evidence: `ARTIC_MINION.out.fasta,` (workflows/viralrecon.nf:1084) and `ARTIC_MINION.out.fasta,` (workflows/viralrecon.nf:1097) versus `ch_filtered_fasta_nanopore` (workflows/viralrecon.nf:1147) and `ch_filtered_bam_nanopore,` (workflows/viralrecon.nf:1131).
  - Confidence: medium
  - Missing: whether the asymmetry is intended upstream.
- What happens when required inputs are missing or inconsistent?
  - Proposed: check up front what the source's own validators state: an Illumina protocol from the allowed list, a reference FASTA, a primer BED for Illumina amplicon variant calling and for Nanopore, valid caller and assembler names. Stop the run when one fails. Keep the source's runtime error when primer contigs are missing from the reference.
  - Evidence: these validators exist (`Nextflow.error("To perform variant calling in amplicon mode please provide a valid primer BED file e.g. '--primer_bed primers.bed'.")` (lib/WorkflowIllumina.groovy:45), `Nextflow.error("Primer BED file not specified with e.g. '--primer_bed primers.bed' or via a detectable config file.")` (lib/WorkflowNanopore.groovy:20)) but nothing calls them (this phase's grep for `initialise(` in `.nf` files: no hits), so the effective source fails later or produces empty results.
  - Confidence: medium
  - Missing: whether John prefers the source's effective (unchecked) behaviour.
- Which skippable and default-off analyses are run-time choices?
  - Proposed: every `skip_*` switch and default-off branch is a run-time choice with the source default: duplicate marking off, PlasmidID off, additional annotation only when a file is given, and everything else on.
  - Evidence: defaults in the `params {` (nextflow.config:10) block; scenario cases exercise `--skip_plasmidid false`, `--additional_annotation`, `--skip_kraken2`, `--skip_assembly`, `--skip_variants`, `--skip_fastp --skip_pangolin`, `--skip_cutadapt --skip_snpeff` and `--skip_noninternal_primers --threeprime_adapters` (phase-1 census). Coordinator context keeps alternatives in scope.
  - Confidence: medium
  - Missing: whether John wants every switch exposed or only the analytical ones.
- Which tunable source parameters become run-time values?
  - Proposed: the science-affecting ones, with source defaults: `protocol`, `variant_caller`, `consensus_caller`, `assemblers`, `spades_mode`, `min_mapped_reads`, `min_barcode_reads`, `min_guppyplex_reads`, `primer_left_suffix`, `primer_right_suffix`, `ivar_trim_noprimer`, `ivar_trim_offset`, `filter_duplicates`, `kraken2_variants_host_filter`, `kraken2_assembly_host_filter`, `freyja_repeats`, `freyja_depthcutoff`, `skip_freyja_boot`, `min_contig_length`, `min_perc_contig_aligned`, `threeprime_adapters`, `artic_minion_model`, and the skip switches above. Save-intermediate switches (`save_reference`, `save_unaligned`, `save_mpileup`, `save_trimmed_fail`) and report presentation (`multiqc_title`, `multiqc_logo`, `multiqc_config`, `multiqc_methods_description`) are left out.
  - Evidence: `summary-nextflow.json` `params[]` (105 entries) and the `params {` (nextflow.config:10) block.
  - Confidence: low
  - Missing: John's preferred parameter surface.
- What must the aggregate report contain?
  - Proposed: an aggregate QC report over the run, the summary variants and assembly metrics tables, the failure tables and the Nextclade clade table. Exact MultiQC layout and the tool-version listing are not required.
  - Evidence: `MULTIQC (` (workflows/viralrecon.nf:1246) collects every report file (gate quoted under Scope); the source's tests ignore the HTML report and both metrics tables for content (`multiqc/multiqc_report.html`, `multiqc/summary_variants_metrics_mqc.csv`, `multiqc/summary_assembly_metrics_mqc.csv`; tests/.nftignore lines 10, 22, 23).
  - Confidence: medium
  - Missing: whether John uses the metrics tables downstream.
- How is the ARTIC minion Clair3 model chosen?
  - Proposed: an optional model name (unset lets ARTIC infer it from the read headers, as the source does) and an optional model directory; the Nanopore tests use the source test value.
  - Evidence: `def model_cmd       = model                    ? "--model ${model}" : ""` (modules/nf-core/artic/minion/main.nf:40); `artic_minion_model = 'r941_prom_hac_g360+g422'` (conf/test_nanopore.config:38); model directory description quoted under Inputs.
  - Confidence: low
  - Missing: whether John's Nanopore data carry basecaller model ids in their headers, and whether models must be supplied as reference data.
- Are source elements with no effect on results reproduced?
  - Proposed: no. The ARTIC scheme name is computed and passed in but never used; the `valid_params` list and the validators above are never called; profile `test_full_sispa` names a config file that does not exist; two nf-test parameters are stale.
  - Evidence: `params.artic_scheme = getGenomeAttribute('scheme', primer_set, primer_set_version)` (main.nf:38) reaches `ch_artic_scheme` (workflows/viralrecon.nf:170) and ARTIC minion takes `--bed ${bed} \\` (modules/nf-core/artic/minion/main.nf:50) instead; `test_full_sispa    { includeConfig 'conf/test_full_sispa.config'    }` (nextflow.config:252) (phase-1 `ls`: no such file); `artic_minion_caller: 'medaka',` (tests/test_params_nanopore.nf.test:37) is declared nowhere.
  - Confidence: high
- Which source test cases establish equivalence, and with which data?
  - Proposed: the three profile cases (`test`, `test_sispa`, `test_nanopore`) are the primary equivalence cases, covering all three modes, both variant callers and all three assemblers. The 20 scenario cases are further coverage for the run-time choices. Content is compared where the source snapshot pins md5s, presence elsewhere. This widens the summary's single selected candidate, `tests/default.nf.test::-profile test`, which covers only Illumina amplicon.
  - Evidence: `summary-nextflow.json` `test_selection` (selected `tests/default.nf.test::-profile test`, rationale names the uncovered modes); 23 candidates. Nanopore test reads and the sequencing summary are on S3 (`fastq_dir          = 's3://ngi-igenomes/test-data/viralrecon/minion_test/fastq_pass/'` (conf/test_nanopore.config:28)); the Illumina sheets and Kraken2 test database are on HTTPS (`pipelines_testdata_base_path = 'https://raw.githubusercontent.com/nf-core/test-datasets/viralrecon'` (nextflow.config:116)).
  - Confidence: medium
  - Missing: John's choice of equivalence cases; S3 reachability from the build host (not probed); database versions matching the snapshots.

### Decisions

Only the first item is an expert decision.

- John: "Convert the whole pipeline to an equivalent Galaxy workflow." (quoted in `caller-request.md`). John stated no other Galaxy requirement.
- Coordinator context (not John's words): both platforms, both Illumina protocols, the alternative variant caller and the de novo assemblers stay in scope; database, dataset and catalogue supply is a question for this brief; John's reference-database decision is open, not a blocker.

The driver's reading (scope is every analysis reachable under some parameter setting; plumbing excluded) is an assumption, recorded under Scope, not a decision. This brief makes no agent decisions; its own proposals are in Open questions.

### Related artifacts

- `summary-nextflow.json`: process topology (70 processes, 32 subworkflows), containers, 105 parameters, the sample sheet, 16 reference assets and 7 rebuilds, 23 test candidates with `test_selection`, and 18 correction-pass and source warnings.
- `summary-nextflow.cli.json`: the raw CLI summary before correction, kept for audit; not evidence.
- `phase1-notes.md`: phase-1 source facts with cites, the database and catalogue findings, the nf-test census and the pre-plan verdicts.
- `.scratch/fetched/`: nf-core/configs `pipeline/viralrecon.config` and `conf/pipeline/viralrecon/genomes.config` at `d1a3f858c5e75ea25fd3db1ca88c251ab446411f`, and five test sample sheets from nf-core/test-datasets (`viralrecon` branch).
- `caller-request.md`: John's objective, coordinator context and the driver's reading.
- `environment-probes.txt`: environment probes, 2026-10-31T23:24:50Z.
- Fixture: `workflow-fixtures/pipelines/nf-core__viralrecon` at `395079f1d24dce731ac22e03d7a5e71f110103fc`.

## Agent Environment

Observed on the agent host by the driver's probes (`environment-probes.txt`, 2026-10-31T23:24:50Z) unless marked otherwise. John stated no tooling, version or container requirement; the coordinator stated none either.

### Tooling

- Required versions: none stated by John or the coordinator. The brief Mold's bundle declares `foundry` with no version.
- `foundry`: ABSENT on PATH at 2026-10-31T23:24:50Z; a per-run shim to the Foundry worktree build exists, and `foundry --help` through it exited 0. This phase ran `foundry validate-workflow-brief --schema-sha256 8e65acb7…` through the shim: `schema matches`, exit 0.
- `summarize-nextflow`: ABSENT on PATH; a per-run shim exists and its `--help` exited 0.
- `gxwf`: ABSENT on PATH; `node_modules/.bin/gxwf` in the Foundry worktree reported `1.15.0`.
- `planemo`: ABSENT on PATH; a per-run shim to a planemo master checkout reported `planemo, version 0.75.48.dev0`.
- `node`: v26.13.0 on PATH. `uvx` is on PATH.
- `nextflow`, `nf-test` and `java`: ABSENT at 2026-10-31T23:24:50Z.
- Source tools probed by name (`kraken2`, `pangolin`, `nextclade`, `freyja`, `ivar`, `bcftools`, `bowtie2`, `minia`, `spades`, `blastn`, `quast`): ABSENT on PATH at 2026-10-31T23:24:50Z.
- `conda` and `mamba`: ABSENT on PATH; a `~/miniforge3` directory exists (not on PATH).
- Running processes at probe time: 0 matching planemo, galaxy or nextflow (pgrep counts, upper bounds).

### Constraints

- Host: Linux x86_64, 4 CPUs, MemTotal 15,333,296 kB with 12,545,028 kB available at probe time, 16,777,212 kB swap; `/` has 407G available of 496G; `/tmp` is a 7.4G tmpfs with 4.4G available.
- Network: phase 1 reached GitHub (`gh api`, raw.githubusercontent.com) and sent HEAD requests to nf-core/test-datasets and artic-network URLs on 2026-10-31. S3 locations (`s3://ngi-igenomes/...`) were not probed; their reachability is unknown.
- Brief production installs nothing, pulls no containers and downloads no reads, databases or genomes. Small source-referenced metadata (sample sheets, configs under 1 MB) may be fetched to verify facts (coordinator).
- Unknown: whether later builds may download databases (Kraken2, Nextclade, Pangolin, Freyja) and test data; this waits on John's reference-database decision.

### Containerization

- Container preference: none stated by John or the coordinator.
- Docker: `/usr/bin/docker` is on PATH; the probe's docker section recorded `29.1.3 linux/amd64` and `cpus=4 mem=15701295104 driver=overlayfs` from the daemon, and 66 cached images, 8 of which match source tools (fastp, snpsift, multiqc, bowtie2, samtools ×2, picard, fastqc). No container was run, so whether a tool container executes here is not established.
- `singularity`, `apptainer` and `podman`: ABSENT at 2026-10-31T23:24:50Z.
- Source facts: modules declare biocontainers, mulled or Wave images (`summary-nextflow.json` `tools[]`); two mulled images (KRAKEN2_BUILD, MAKE_BED_MASK) were not resolved to packages in phase 1 (summary warning).
