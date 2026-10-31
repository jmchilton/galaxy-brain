# Workflow Brief: nf-core/cutandrun 3.2.2 (whole pipeline)

## Workflow

### Objective

John: "Convert the whole pipeline to an equivalent Galaxy workflow." (from `caller-request.md`; these are the only words from John).

The source describes itself as an `Analysis pipeline for CUT&RUN and CUT&TAG experiments that includes sequencing QC, spike-in normalisation, IgG control normalisation, peak calling and downstream peak analysis.` (nextflow.config:338). It takes paired-end CUT&RUN or CUT&TAG FASTQ libraries described by a sample sheet that groups libraries into experimental groups and replicates and names an IgG control group for each target group, plus a target genome FASTA, a gene annotation and, in the default mode, a spike-in genome FASTA. Per library it produces filtered alignments, normalised coverage tracks (bedGraph and bigWig) and, for target libraries, peaks called against the paired IgG control or against a threshold. Per group (or across all samples) it produces consensus peaks. Peak QC (FRiP, peak counts, reproducibility), fragment-length histograms, deepTools heatmaps and QC, a genome-browser session and an aggregate QC report summarise the run.

### Sources

- Source: nf-core/cutandrun, `version         = '3.2.2'` (nextflow.config:341), commit `6e1125d4fee4ea7c8b70ed836bb0e92a89e3305f` (coordinator pin `6e1125d4`; full SHA from `git rev-parse HEAD` in the fixture, re-run for this brief). `MIT License` (LICENSE:1). Repository https://github.com/nf-core/cutandrun. Every `path:N` cite below is relative to the fixture root `workflow-fixtures/pipelines/nf-core__cutandrun`, was re-read with numbered output for this brief, and is written next to the quoted text it supports.
- Expert intent: John's objective only. Coordinator context and the driver's reading come from `caller-request.md`; neither is John's, and this brief labels each where it uses them.
- Source evidence: `summary-nextflow.json` (phase-1 CLI output plus a correction pass) and `phase1-notes.md` (phase-1 source facts, 364 cites). Where this brief restates a condition, it quotes the source expression with its operators.
- Pre-plan: `PREPLAN.md` in the galaxy-brain plans directory, supplied by the coordinator as unverified hints. Phase 1 checked it against source (`phase1-notes.md`, "Pre-plan check"); this brief uses only the facts phase 1 or this phase re-read.
- Environment evidence: `environment-probes.txt` (probes taken 2026-10-31T08:34:36Z).
- Sibling evidence: the nf-core/chipseq golden brief v1 (`vault/projects/foundries/plans/nf-core__chipseq/golden.md`, "chipseq golden brief" below). It was consulted for known traps and for observations on this host; no cutandrun fact is taken from it.
- Test evidence: no nf-test suite at pipeline level; CI runs pytest-workflow, `command: TMPDIR=~ PROFILE=docker pytest --tag ${{ matrix.tags }} --symlink --kwdof --color=yes` (.github/workflows/ci.yml:248). There are 11 test profiles (`test                      { includeConfig "conf/test.config"` (nextflow.config:269) and `includeConfig "conf/test` (nextflow.config:270-279)) and 91 pytest-workflow cases in 26 files (phase-1 probe, `.scratch/pytest_cases.json`).

### Scope

#### Included

The scope is every scientific analysis the source can run under some parameter setting (driver's reading of John's objective). The coordinator's context adds that IgG controls, spike-in normalisation, the alternative peak caller and the alternative normalisation modes stay in scope; how they are supplied or selected is an open question below, not a scope cut. Process topology stays in `summary-nextflow.json`.

- Reference preparation (`subworkflows/local/prepare_genome.nf`):
  - decompress a gzipped target FASTA, spike-in FASTA or GTF (`if (params.fasta.endsWith(".gz")) {` (subworkflows/local/prepare_genome.nf:36), `if (params.gtf.endsWith(".gz")) {` (subworkflows/local/prepare_genome.nf:60));
  - derive a gene BED from the GTF unless one is given (`if (params.gene_bed){` (subworkflows/local/prepare_genome.nf:68), `GTF2BED ( ch_gtf )` (subworkflows/local/prepare_genome.nf:82)), then sort and index it;
  - derive the FASTA index and the target and spike-in chromosome sizes (`SAMTOOLS_FAIDX ( ch_fasta, [[id:"fasta"], []] )` (subworkflows/local/prepare_genome.nf:119), `TARGET_CHROMSIZES ( ch_fasta )` (subworkflows/local/prepare_genome.nf:125), `SPIKEIN_CHROMSIZES ( ch_spikein_fasta )` (subworkflows/local/prepare_genome.nf:131));
  - with a blacklist, derive the allowed regions as the genome minus the blacklist (`if (params.blacklist) {` (subworkflows/local/prepare_genome.nf:169), `BLACKLIST_BEDTOOLS_COMPLEMENT(` (subworkflows/local/prepare_genome.nf:201));
  - build the target and spike-in Bowtie2 indexes, or unpack or use supplied ones (`BOWTIE2_BUILD_TARGET ( ch_fasta )` (subworkflows/local/prepare_genome.nf:148), `if (params.normalisation_mode == "Spikein" && params.spikein_bowtie2) {` (subworkflows/local/prepare_genome.nf:152), `BOWTIE2_BUILD_SPIKEIN ( ch_spikein_fasta )` (subworkflows/local/prepare_genome.nf:160)).
- Sample-sheet validation, IgG control assignment and technical-replicate merging (`check_samplesheet.py $samplesheet samplesheet.valid.csv $params.use_control` (modules/local/python/samplesheet_check.nf:20); `CAT_FASTQ (` (workflows/cutandrun.nf:216)).
- Read QC (FastQC) and adapter/quality trimming (Trim Galore), each skippable (`if (!skip_fastqc) {` (subworkflows/local/fastqc_trimgalore.nf:19), `if (!skip_trimming) {` (subworkflows/local/fastqc_trimgalore.nf:29)).
- Bowtie2 alignment of every library to the target genome and, in Spikein mode, to the spike-in genome, each sorted, indexed and summarised with samtools stats, flagstat and idxstats (`BOWTIE2_TARGET_ALIGN (` (subworkflows/local/align_bowtie2.nf:25), `BOWTIE2_SPIKEIN_ALIGN (` (subworkflows/local/align_bowtie2.nf:37)); per-library alignment counts parsed from the Bowtie2 logs (`EXTRACT_BT2_TARGET_META (` (workflows/cutandrun.nf:297), `EXTRACT_BT2_SPIKEIN_META (` (workflows/cutandrun.nf:305)).
- Read filtering by mapping quality, proper pairing, allowed regions and, optionally, mitochondrial reads (`FILTER_READS (` (workflows/cutandrun.nf:325)).
- Library complexity (preseq) before duplicate handling (`PRESEQ_LCEXTRAP (` (workflows/cutandrun.nf:345)).
- Duplicate marking on all libraries and duplicate removal on IgG controls (and on targets on request); optional linear-amplification duplicate removal (`MARK_DUPLICATES_PICARD (` (workflows/cutandrun.nf:357), `DEDUPLICATE_PICARD (` (workflows/cutandrun.nf:379), `DEDUPLICATE_LINEAR (` (workflows/cutandrun.nf:418)).
- Normalised coverage in one of five modes, Spikein (default), RPKM, CPM, BPM or None (`"enum": ["Spikein", "RPKM", "CPM", "BPM", "None"]` (nextflow_schema.json:332)), then sorted, clipped bedGraph and bigWig (`UCSC_BEDCLIP (` (subworkflows/local/prepare_peakcalling.nf:182), `UCSC_BEDGRAPHTOBIGWIG (` (subworkflows/local/prepare_peakcalling.nf:193)).
- Peak calling with SEACR (default), MACS2, or both, with or without the IgG control (`if(params.use_control) {` (workflows/cutandrun.nf:481), `if('seacr' in callers) {` (workflows/cutandrun.nf:485), `if('macs2' in callers) {` (workflows/cutandrun.nf:508)); MACS2 peaks cut to BED6 (`PEAK_TO_BED ( ch_macs2_peaks )` (workflows/cutandrun.nf:581)); summit extraction and sample naming of primary peaks (`AWK_EXTRACT_SUMMITS (` (workflows/cutandrun.nf:602), `AWK_NAME_PEAK_BED (` (workflows/cutandrun.nf:613)).
- Consensus peaks per group or across all samples (`CONSENSUS_PEAKS_ALL (` (workflows/cutandrun.nf:646), `CONSENSUS_PEAKS (` (workflows/cutandrun.nf:670)).
- Reporting (`if(params.run_reporting) {` (workflows/cutandrun.nf:689)):
  - an IGV session (`IGV_SESSION (` (workflows/cutandrun.nf:694));
  - deepTools gene-body and peak-centred heatmaps, and an all-sample gene matrix (`if (params.run_deeptools_heatmaps && params.run_peak_calling) {` (workflows/cutandrun.nf:707), `DEEPTOOLS_COMPUTEMATRIX_GENE_ALL (` (workflows/cutandrun.nf:785));
  - deepTools QC: fingerprint, and correlation and PCA over all BAMs (`DEEPTOOLS_QC (` (workflows/cutandrun.nf:803));
  - peak QC: FRiP, peak counts, consensus counts, reproducibility and a consensus plot (`if (params.run_peak_qc && params.run_peak_calling) {` (workflows/cutandrun.nf:821), `PLOT_CONSENSUS_PEAKS (` (subworkflows/local/peak_qc.nf:146));
  - fragment-length histograms (`SAMTOOLS_CUSTOMVIEW (` (workflows/cutandrun.nf:874), `FRAG_LEN_HIST(` (workflows/cutandrun.nf:897));
  - a MultiQC report (`MULTIQC (` (workflows/cutandrun.nf:921)).

#### Excluded

- Pipeline plumbing, as non-scientific work (driver's reading, not John's or the coordinator's; for expert review):
  - nf-validation parameter checks and help (`validateParameters()` runs when `if (params.validate_params) {` (main.nf:55));
  - software-version collation (`CUSTOM_DUMPSOFTWAREVERSIONS (` (workflows/cutandrun.nf:914));
  - completion e-mail and notifications;
  - the nf-core initialisation helpers (`WorkflowMain.initialise(workflow, params, log, args)` (main.nf:59)).

  The validation rules that encode input requirements stay as evidence for the input contract (see Inputs and outputs).
- Single-end reads. The source rejects them: `Single-end detected. This pipeline does not support single-end reads!` (bin/check_samplesheet.py:152). This is a source fact, not a scope choice.
- Alternative aligners. `aligner                    = "bowtie2"` (nextflow.config:46) is the only branch (`if (params.aligner == "bowtie2") {` (workflows/cutandrun.nf:261)). Source fact.
- Agent proposal, for expert review (see Open questions): the `only_*` partial-run switches (`if(params.only_input) {` (conf/flowswitch.config:51) through `if(params.only_peak_calling) {` (conf/flowswitch.config:111)), the `save_*` and publish parameters, and the `--genome` iGenomes lookup.

### Inputs and outputs

Inputs, as source facts. "Required" and "optional" describe source behaviour, not an interface decision.

- Sample sheet (required: `"required": ["input", "outdir"]` (nextflow_schema.json:13)).
  - Header `HEADER = ["group", "replicate", "fastq_1", "fastq_2", "control"]` (bin/check_samplesheet.py:90); the 1.x header `LEGACY_HEADER = ["group", "replicate", "control_group", "fastq_1", "fastq_2"]` (bin/check_samplesheet.py:89) is rejected.
  - Replicates are integers starting at 1 (`if not replicate.isdigit():` (bin/check_samplesheet.py:159), `Replicate ids must start with 1!` (bin/check_samplesheet.py:289)). Rows sharing group and replicate are technical replicates, named `sample_id = "{}_R{}_T{}".format(sample, replicate, idx + 1)` (bin/check_samplesheet.py:303) and merged after the `_T<n>` suffix is dropped (`meta.id = meta.id.split("_")[0..-2].join("_")` (workflows/cutandrun.nf:199)).
  - A row's `control` names an IgG control group: `Each control entry must match at least one group entry!` (bin/check_samplesheet.py:217). Rows of a group that is named as a control are controls (`if sample_info[0] in control_names_list:` (bin/check_samplesheet.py:225)), and `Control cannot have a control` (bin/check_samplesheet.py:228).
  - Stale documentation, recorded for the expert: the schema help says `It has to be a comma-separated file with 3 columns` (nextflow_schema.json:22), and `assets/schema_input.json` lists `"required": ["group", "replicate", "fastq_1", "fastq_2", "control"]` (assets/schema_input.json:36) although control rows leave `control` empty (`CONTROL_GROUP,1,KO_LIB1_REP1_1.fastq.gz,IGG_LIB1_REP1_2.fastq.gz,` (assets/samplesheet.csv:6)). Nothing wires `schema_input.json` in (phase-1 probe); the runtime contract is the checker's.
- Paired-end FASTQ reads per row.
- Target genome FASTA (required: `if (!params.fasta) {` (lib/WorkflowCutandrun.groovy:17)), optionally gzipped.
- GTF annotation (required: `if (!params.gtf) {` (lib/WorkflowCutandrun.groovy:26) raises `No GTF annotation specified!` (lib/WorkflowCutandrun.groovy:27)), optionally gzipped.
- Spike-in genome FASTA, required only in Spikein mode: `if (params.normalisation_mode == "Spikein" && !params.spikein_fasta) {` (lib/WorkflowCutandrun.groovy:21). The source default spike-in is E. coli, `spikein_genome             = "K12-MG1655"` (nextflow.config:21), resolved through iGenomes.
- Optional inputs (see Open questions for how each is supplied): a blacklist BED, a gene BED, prebuilt target and spike-in Bowtie2 indexes, and a mitochondrial sequence name.
- In the source, `--genome` fills `fasta`, `bowtie2`, `gtf`, `gene_bed` and `blacklist` from iGenomes (`params.fasta     = WorkflowMain.getGenomeAttribute(params, 'fasta')` (main.nf:20) through `params.blacklist = WorkflowMain.getGenomeAttribute(params, 'blacklist')` (main.nf:24)), and in Spikein mode the spike-in FASTA and index (`if(params.normalisation_mode == "Spikein") {` (main.nf:32)). Phase 1 records an unverified precedence caveat: `gene_bed                   = null` (nextflow.config:22) and `blacklist                  = null` (nextflow.config:23) are declared in the config, so with `--genome` the iGenomes gene BED and blacklist may never apply.

Outputs (scientific roles):

- Per library: filtered alignments with samtools stats, flagstat and idxstats; duplicate metrics; Bowtie2 alignment summaries for the target and, in Spikein mode, the spike-in genome; preseq complexity curve; normalised bedGraph and bigWig.
- Per target library: primary peaks (SEACR or MACS2), optional secondary peaks, summits, FRiP and peak count, fragment-length histogram.
- Per group, or for all samples together: consensus peaks, filtered by replicate support, and their counts.
- Across libraries: reproducibility, a consensus plot, deepTools fingerprint, correlation and PCA, deepTools heatmaps, an IGV session and a MultiQC report.
- Optional, off by default: the per-library scale factors (`dump_scale_factors         = false` (nextflow.config:98)).

Test data (`test` profile, the summary's `test_selection`):

- Sheet `input = 'https://raw.githubusercontent.com/nf-core/test-datasets/cutandrun/samplesheet_2_0/test-GSE145187-small.csv'` (conf/test.config:23). Phase 1 fetched it: two paired-end rows, `h3k27me3` replicate 1 with control `igg_ctrl`, and `igg_ctrl` replicate 1, from `testdata/GSE145187_10000/`.
- References by URL: `hg38-chr20.fa.gz` (conf/test.config:26), `hg38-chr20-bowtie2.tar.gz` (conf/test.config:27), `hg38-chr20-genes.gtf.gz` (conf/test.config:28), `hg38-chr20-genes.bed.gz` (conf/test.config:29), `e_coli_U00096_3.fa.gz` (conf/test.config:31), `e_coli_U00096_3.tar.gz` (conf/test.config:32); bundled blacklist `blacklist                  = "${projectDir}/assets/blacklists/hg38-blacklist.bed"` (conf/test.config:30). No `--genome`. Sizes by phase-1 HTTP HEAD probe: chr20 FASTA 18.8 MB, chr20 Bowtie2 tarball 82.8 MB, E. coli tarball 8.6 MB.
- Non-default settings: `mito_name                  = 'chrM'` (conf/test.config:33), `remove_linear_duplicates   = true` (conf/test.config:34), `remove_mitochondrial_reads = true` (conf/test.config:35).
- Its single target leaves the more-than-one-file branches unexercised (correlation/PCA, IGV peak tracks, reproducibility, consensus across all samples). `test_full_small` is the bounded multi-replicate complement: `input = 'https://raw.githubusercontent.com/nf-core/test-datasets/cutandrun/samplesheet_2_0/test-GSE145187-all-small.csv'` (conf/test_full_small.config:11), with `peakcaller                 = 'seacr,MACS2'` (conf/test_full_small.config:23); phase 1 fetched its sheet: `h3k27me3` and `h3k4me3`, 2 replicates each, against `igg_ctrl` replicates 1 and 2.
- `test_no_control` sets `use_control               = false` (conf/test_no_control.config:34) with a one-row sheet without IgG (`input = 'https://raw.githubusercontent.com/nf-core/test-datasets/cutandrun/samplesheet_2_0/test-GSE145187-noigg-small.csv'` (conf/test_no_control.config:23)); `test_tech_reps` uses `test-GSE145187-small-tech-reps.csv` (conf/test_tech_reps.config:23).

### Requirements and preferences

- John: "Convert the whole pipeline to an equivalent Galaxy workflow." No other requirement, Galaxy or otherwise, was stated (coordinator, `caller-request.md`).
- Coordinator context (not John's words): IgG controls, spike-in normalisation, the alternative peak caller and the alternative normalisation modes stay in scope. How they are supplied or selected is a question for this brief.
- Source behaviour that "equivalent" is read to cover (agent reading, for expert review):
  - IgG control assignment. Only `if use_control == "true":` (bin/check_samplesheet.py:248), each target replicate gets its own control replicate when the target group has as many replicates as the control group (`ctrl_group_new = ctrl_group + "_" + str(rep)` (bin/check_samplesheet.py:270)), otherwise every replicate gets control replicate 1 (`ctrl_group_new = ctrl_group + "_1"` (bin/check_samplesheet.py:272)). Pairing then keys controls by `row[0].control_group + "_" + row[0].replicate` (workflows/cutandrun.nf:489) against targets keyed by `ch_bedgraph_target.map{ row -> [row[0].control_group, row] }` (workflows/cutandrun.nf:490) for SEACR, and the same on BAMs for MACS2 (`ch_bam_control.map{ row -> [row[0].control_group + "_" + row[0].replicate, row] }` (workflows/cutandrun.nf:512)). One control replicate can serve several targets. Controls are never peak-called: targets are `it[0].is_control == false` (workflows/cutandrun.nf:464).
  - `use_control` consistency: `if use_control == "true" and not control_present:` (bin/check_samplesheet.py:235) is an error; `if use_control == "false" and control_present:` (bin/check_samplesheet.py:242) only warns, and the named controls are then processed but not used for peaks (`ch_bedgraph_target.map{ row-> [ row[0], row[1], [] ] }` (workflows/cutandrun.nf:541)).
  - Alignment: `end_to_end                 = true` (nextflow.config:51) selects `--end-to-end --very-sensitive --no-mixed --no-discordant --phred33 --minins 10 --maxins 700 --dovetail` (conf/modules.config:243), `--local` otherwise; the spike-in alignment adds `--no-overlap --no-dovetail` (conf/modules.config:266).
  - Filtering: `ext.args = "-b -q ${params.minimum_alignment_q_score} -F 0x004 -F 0x0008 -f 0x001"` (conf/modules.config:358) with `minimum_alignment_q_score  = 20` (nextflow.config:54); allowed regions via `def blacklist = regions ? "-L $regions" : ""` (modules/local/for_patch/samtools/view/main.nf:28-32). Mitochondrial reads are removed with `ext.args2 = { params.remove_mitochondrial_reads ? "-e 'rname != \"${params.mito_name}\"'" : '' }` (conf/modules.config:364); when `if (params.mito_name == null && params.genome == null){` (conf/modules.config:359) holds, `ext.args2 = ''` (conf/modules.config:360) and the request has no effect beyond a warning (`if (!params.genome && !params.mito_name && params.remove_mitochondrial_reads) {` (lib/WorkflowCutandrun.groovy:44)).
  - Duplicates: marking on all libraries (`--REMOVE_DUPLICATES false` (conf/modules.config:435)); removal (`--REMOVE_DUPLICATES true` (conf/modules.config:469)) on controls only, and on targets too when `dedup_target_reads` is true (default `dedup_target_reads         = false` (nextflow.config:60); `if( process_target ) {` (subworkflows/local/mark_duplicates_picard.nf:26)). Removal is turned off by `if(params.skip_removeduplicates || !params.run_mark_dups) { params.run_remove_dups        = false }` (conf/flowswitch.config:38). Linear duplicates (`remove_linear_duplicates   = false` (nextflow.config:62)) are found from read coordinates and removed by read name (`FIND_UNIQUE_READS (` (subworkflows/local/deduplicate_linear.nf:43)), with the same target/control rule.
  - Spikein scaling: per library `params.normalisation_c / (denominator != 0 ? denominator : params.normalisation_c)` (subworkflows/local/prepare_peakcalling.nf:41), where the denominator is the spike-in `bt2_total_aligned` (subworkflows/local/prepare_peakcalling.nf:40) = `data["bt2_total_aligned"] = data["bt2_align1"] + data["bt2_align_gt1"]` (bin/bt2_report_to_csv.awk:33) and `normalisation_c            = 10000` (nextflow.config:67). It applies to targets and IgG alike; a library with no spike-in alignments gets factor 1.
  - Coverage: `if (norm_mode == "Spikein" || norm_mode == "None") {` (subworkflows/local/prepare_peakcalling.nf:58) uses genome coverage with `args += (scale > 0 && scale != 1) ? " -scale $scale" : ""` (modules/nf-core/bedtools/genomecov/main.nf:25) and `ext.args = params.extend_fragments ? '-bg -pc' : '-bg'` (conf/modules.config:602). Otherwise (RPKM, CPM, BPM) deepTools coverage runs with targets at factor 1 (`[ row[0], row[1], row[2], 1 ]` (subworkflows/local/prepare_peakcalling.nf:114)) and IgG at `[ row[0], row[1], row[2], params.igg_scale_factor ]` (subworkflows/local/prepare_peakcalling.nf:125), plus `"--binSize ${params.normalisation_binsize}",` (conf/modules.config:616), `"--normalizeUsing ${params.normalisation_mode}",` (conf/modules.config:617) and `params.extend_fragments ? '--extendReads' : '',` (conf/modules.config:618). Defaults `normalisation_binsize      = 50` (nextflow.config:66), `igg_scale_factor           = 0.5` (nextflow.config:68), `extend_fragments           = true` (nextflow.config:76).
  - SEACR: the control bedGraph, or the threshold without one (`def function_switch = ctrlbedgraph ? "$ctrlbedgraph" : "$threshold"` (modules/nf-core/seacr/callpeak/main.nf:25)), with `ext.args   = "${params.seacr_norm} ${params.seacr_stringent}"` (conf/modules.config:664); defaults `seacr_norm                 = 'non'` (nextflow.config:77), `seacr_stringent            = 'stringent'` (nextflow.config:78), `seacr_peak_threshold       = 0.05` (nextflow.config:79).
  - MACS2: `"--nomodel --shift -75 --extsize 150 --keep-dup all ",` (conf/modules.config:680), `params.macs2_pvalue ? "-p ${params.macs2_pvalue}" : "-q ${params.macs2_qvalue}",` (conf/modules.config:681), `params.macs2_narrow_peak ? '' : "--broad --broad-cutoff ${params.macs2_broad_cutoff}"` (conf/modules.config:682), format `def format    = meta.single_end ? 'BAM' : 'BAMPE'` (modules/nf-core/macs2/callpeak/main.nf:30), control `def control   = controlbam ? "--control $controlbam" : ''` (modules/nf-core/macs2/callpeak/main.nf:31). Defaults `macs2_qvalue               = 0.01` (nextflow.config:81), `macs2_narrow_peak          = true` (nextflow.config:83), `macs2_broad_cutoff         = 0.1` (nextflow.config:84), `macs_gsize                 = 2700000000.0` (nextflow.config:82).
  - Consensus: `BEDTOOLS_MERGE ( SORT.out.file )` (subworkflows/local/consensus_peaks.nf:21) with `-c 2,3,4,5,6,7,7 -o collapse,collapse,collapse,collapse,collapse,collapse,count_distinct` (conf/modules.config:748), kept where `ext.command = "' \$10 >= " + params.replicate_threshold.toString() + " {print \$0}'"` (conf/modules.config:759); `replicate_threshold        = 1.0` (nextflow.config:88).
  - FRiP: fragments in peaks, `READS_IN_PEAKS=\$(bedtools intersect -a ${fragments_bed} -b ${peaks_bed} -bed -c -f $min_frip_overlap` (modules/local/peak_frip.nf:25), over the flagstat `mapped (` (modules/local/peak_frip.nf:26); fragments are same-chromosome pairs under 1000 bp (`ext.command = "'\$1==\$4 && \$6-\$2 < 1000 {print \$0}'"` (conf/modules.config:941)); `min_frip_overlap           = 0.2` (nextflow.config:101).
  - Data-dependent gates, operators as in source: consensus across all samples needs `.filter { row -> row[2] > 1 }` (workflows/cutandrun.nf:635); reproducibility needs `.filter { row -> row[2] > 1 }` (subworkflows/local/peak_qc.nf:87); correlation and PCA need `.filter { row -> row[4] > 1 }` (subworkflows/local/deeptools_qc.nf:47); IGV peak tracks need `ch_peaks_primary.collect{it[1]}.filter{ it -> it.size() > 1}.ifEmpty([])` (workflows/cutandrun.nf:699); the peak heatmap needs a non-empty summit file, `.filter ( it -> it[-1].size() > 1)` (workflows/cutandrun.nf:746).

### Acceptance criteria

- On the source's `test` inputs the workflow completes with the source defaults plus the `test` settings: Spikein scaling against the E. coli genome, IgG-controlled SEACR peaks for `h3k27me3` replicate 1, linear-duplicate removal (on the control only, as `dedup_target_reads` stays false) and mitochondrial-read removal, and every reporting branch whose data-dependent gate holds on one target.
- Each target is peak-called against the control replicate the source would assign (replicate to replicate when counts match, otherwise control replicate 1). Controls yield no peaks; a control replicate shared by several targets is reused.
- With controls switched off, each target is called against the SEACR threshold or without a MACS2 control, and libraries the sheet still names as controls get no peaks.
- Each normalisation mode produces the source's scaling: Spikein `normalisation_c` over spike-in aligned pairs (factor 1 when there are none), None factor 1, and RPKM/CPM/BPM with IgG scaled by `igg_scale_factor`.
- Data-dependent branches run exactly under the source gates listed under Requirements (`> 1` file counts, non-empty summits), and group consensus runs for single-replicate groups too (see Open questions).
- Results are scientifically comparable to an nf-core/cutandrun 3.2.2 run on the same inputs and parameters: scale factors, peak sets, FRiP, consensus intervals and fragment-length distributions. The comparison method and tolerances belong to test development (see Open questions).

### Open questions

- How are IgG controls supplied and paired, and is control-free calling offered?
  - Proposed: keep the source's sample-sheet contract (five columns; a row's `control` names a control group; that group's rows are controls) and its replicate assignment (replicate to replicate when counts match, otherwise control replicate 1). Controls are never peak-called; a control replicate may serve several targets. Offer the source's `use_control` choice, on by default.
  - Evidence: Requirements above; `use_control                = true` (nextflow.config:74). The coordinator keeps IgG controls in scope. `test` and `test_full_small` pair every target; `test_no_control` runs without IgG.
  - Confidence: high
- How is spike-in normalisation supplied?
  - Proposed: Spikein is the default mode, as in the source. In that mode the spike-in genome FASTA is a required input (E. coli K-12 MG1655 for the source tests); its index is built from it unless a prebuilt one is accepted (see the index question). The factor is `normalisation_c` (10000) over the library's concordant spike-in pairs aligned once or more than once, factor 1 when that count is 0, applied to targets and IgG alike. In other modes no spike-in input is needed and no spike-in alignment runs.
  - Evidence: Requirements above; `if(params.normalisation_mode == "Spikein") {` (subworkflows/local/prepare_genome.nf:46) is the only place the spike-in FASTA is read, otherwise `ch_spikein_fasta = Channel.empty()` (subworkflows/local/prepare_genome.nf:31), and the spike-in alignment takes `ch_spikein_index.collect{ it[1] }` (subworkflows/local/align_bowtie2.nf:39). The coordinator keeps spike-in normalisation in scope. Phase 1 read the spike-in-skipping behaviour outside Spikein mode from channel semantics, not from a run.
  - Confidence: high
- Which normalisation modes are selectable, and how?
  - Proposed: all five source modes as one run-time choice, Spikein by default, with `normalisation_binsize` (50), `igg_scale_factor` (0.5) and `extend_fragments` (true) as run-time values used by the modes that read them.
  - Evidence: `normalisation_mode         = "Spikein"` (nextflow.config:65) and the enum above; the pytest cases name the bedGraph `results/03_peak_calling/01_bam_to_bedgraph/h3k27me3_R1.sorted.bedGraph` (tests/test_04_bam_scaling.yml:7) for each mode. The coordinator keeps the alternative modes in scope. `normalisation_binsize` has no effect in Spikein or None mode.
  - Confidence: high
- How is the peak caller chosen, and how are two callers combined?
  - Proposed: a run-time choice of SEACR (default), MACS2, or both. With both, the first named is primary and feeds summits, consensus, peak QC and heatmaps; the secondary's peaks are produced and appear only in the IGV session, as in the source.
  - Evidence: `peakcaller                 = 'seacr'` (nextflow.config:71); `callers = params.peakcaller ? params.peakcaller.split(',').collect{ it.trim().toLowerCase() } : ['seacr']` (workflows/cutandrun.nf:93); `if(callers[0] == 'seacr') {` (workflows/cutandrun.nf:589) sets `ch_peaks_primary   = ch_seacr_peaks` (workflows/cutandrun.nf:590). `test_full_small` runs both. The coordinator keeps the alternative caller in scope.
  - Confidence: medium
  - Missing: whether John wants the secondary caller's peaks only in the browser session, as in the source, or as a full second analysis.
- How is the MACS2 genome size supplied?
  - Proposed: a numeric run-time value with the source default 2.7e9, passed straight to MACS2, with no derivation and no iGenomes lookup. The source applies this human-sized default even to the chr20 test genome; keep that for equivalence.
  - Evidence: `macs_gsize                 = 2700000000.0` (nextflow.config:82) passed as `params.macs_gsize` (workflows/cutandrun.nf:524); phase 1 found no k-mer derivation and no read of the iGenomes `macs_gsize` key. Known trap: the chipseq golden brief notes that real genome sizes exceed 2^31 − 1 and that its build never passed such a value (gap `macs-gsize-large-int`); 2.7e9 is above that limit.
  - Confidence: medium
  - Missing: whether John wants a per-genome default rather than the source's single number.
- Is the `--genome` iGenomes lookup reproduced?
  - Proposed: no. The target FASTA, GTF, optional gene BED, optional blacklist and the spike-in FASTA are supplied directly. The source's bundled blacklists (`assets/blacklists/`, 8 files by phase-1 probe) stay usable as the blacklist input.
  - Evidence: `includeConfig 'conf/igenomes.config'` (nextflow.config:297) unless `if (!params.igenomes_ignore) {` (nextflow.config:296); the spike-in default `'K12-MG1655' {` (conf/igenomes.config:447) comes from iGenomes. `test` and `test_full_small` supply references by URL; `test_full`, `test_full_multi`, `test_linear_dedup` and `test_no_genome` use `genome     = 'GRCh38'` (conf/test_full.config:17) or `genome          = "GRCh38"` (conf/test_no_genome.config:26). The precedence caveat under Inputs is unverified.
  - Confidence: medium
  - Missing: whether John considers reference lookup part of "the whole pipeline".
- Must the workflow accept prebuilt Bowtie2 indexes (target and spike-in)?
  - Proposed: build both from the FASTAs by default; accepting a prebuilt index is optional and not required for equivalence, since the source builds the same index when none is given.
  - Evidence: `if (params.bowtie2.endsWith(".tar.gz")) {` (subworkflows/local/prepare_genome.nf:141) unpacks, a plain path is used as given, or `BOWTIE2_BUILD_TARGET ( ch_fasta )` (subworkflows/local/prepare_genome.nf:148) builds. Every bounded source test supplies both tarballs (`hg38-chr20-bowtie2.tar.gz` (conf/test.config:27), `e_coli_U00096_3.tar.gz` (conf/test.config:32)). Phase 1 did not check that the tarball indexes match an index built from the test FASTAs.
  - Confidence: medium
  - Missing: John's preference, and whether built and supplied indexes align the test reads identically.
- Are the default-off and skippable analyses selectable at run time?
  - Proposed: yes, each with its source default: linear-duplicate removal (off), target deduplication (off), mitochondrial-read removal (off, needs a mitochondrial sequence name), consensus across all samples (off; group by default), duplicate removal, FastQC, trimming, preseq, heatmaps, the all-sample gene matrix, deepTools QC, peak QC, IGV and MultiQC (on).
  - Evidence: `run_remove_linear_dups = false` (conf/flowswitch.config:20), `run_consensus_all      = false` (conf/flowswitch.config:23), the skip derivations (`if(params.skip_preseq)` (conf/flowswitch.config:40) through `if(params.skip_igv)` (conf/flowswitch.config:44)), `if(params.skip_reporting) {` (conf/flowswitch.config:45), `dt_calc_all_matrix         = true` (nextflow.config:113). The pytest suite runs most skips as cases (phase-1 probe).
  - Confidence: medium
  - Missing: how much run-time selection John wants.
- How is a mitochondrial-removal request without a sequence name handled?
  - Proposed: follow the source. Removal uses the supplied mitochondrial sequence name; when removal is requested without a name, nothing is removed and the run notes it, as the source warns. Since the iGenomes lookup is proposed out, the name always comes from the run's settings.
  - Evidence: `ext.args2 = ''` (conf/modules.config:360) when mito_name and genome are both null, with only a warning (quoted under Requirements). With `--genome`, the source takes `mito_name   = "chrM"` (conf/igenomes.config:35) from iGenomes. `test` sets `mito_name = 'chrM'`.
  - Confidence: low
  - Missing: whether John would rather make the name required when removal is requested, which departs from the source.
- Does group consensus run for single-replicate groups?
  - Proposed: yes, follow the code: every group gets a consensus BED, including single-replicate groups, although a source comment says otherwise.
  - Evidence: `.map { row -> [ row[0].group, row[1] ] }` (workflows/cutandrun.nf:659) and `.groupTuple(by: [0])` (workflows/cutandrun.nf:660) feed `CONSENSUS_PEAKS (` (workflows/cutandrun.nf:670) with no count filter; the comment reads `where there is more than 1 replicate in a group` (workflows/cutandrun.nf:668). The all-samples branch does filter (`row[2] > 1`).
  - Confidence: medium
  - Missing: whether John reads "equivalent" as the code's behaviour or the comment's intent.
- Which tunable source parameters become run-time values?
  - Proposed: expose the science-affecting ones with source defaults: `use_control`, `normalisation_mode`, `normalisation_c`, `normalisation_binsize`, `igg_scale_factor`, `extend_fragments`, `peakcaller`, `seacr_norm`, `seacr_stringent`, `seacr_peak_threshold`, `macs2_qvalue`, `macs2_pvalue`, `macs2_narrow_peak`, `macs2_broad_cutoff`, `macs_gsize`, `end_to_end`, `minimum_alignment_q_score`, `remove_mitochondrial_reads`, `mito_name`, `dedup_target_reads`, `remove_linear_duplicates`, `skip_removeduplicates`, `consensus_peak_mode`, `replicate_threshold`, `min_frip_overlap`, `min_peak_overlap`, the `clip_*`, `three_prime_clip_*` and `trim_nextseq` trimming values, the deepTools heatmap and QC values, `igv_show_gene_names`, `igv_sort_by_groups`, and the skips. Leave out `fragment_size`, marked `fragment_size              = 100 // PARAM NOT USED` (nextflow.config:112) and only read for single-end data, which the source rejects.
  - Evidence: `summary-nextflow.json` `params[]` (126 entries) and defaults in the `params {` (nextflow.config:18) block (see Requirements for the cites of each value used).
  - Confidence: low
  - Missing: the expert's preferred breadth of run-time choices.
- Are the `only_*` partial-run switches and `save_*` outputs reproduced?
  - Proposed: no. They stop the pipeline after a stage or keep intermediates; neither changes a scientific result.
  - Evidence: the `only_*` derivations (quoted under Excluded) force `params.run_multiqc      = true` (conf/flowswitch.config:91) and cut later stages. Agent proposal.
  - Confidence: high
- Are the per-library scale factors an output?
  - Proposed: yes, as an optional table of library, group and factor in Spikein and None modes, off by default, matching `dump_scale_factors`.
  - Evidence: `dump_scale_factors         = false` (nextflow.config:98); the source writes `new File('scale-factors.csv')` (subworkflows/local/prepare_peakcalling.nf:80) from a channel closure, outside any process and the results directory. No source test asserts it (phase-1 probe of the pytest assertions).
  - Confidence: low
  - Missing: whether John wants the factors at all.
- Is the IGV session a deliverable?
  - Proposed: yes, a genome-browser session listing the bigWigs, primary and secondary peaks and gene annotation against the target FASTA, with the source's grouping and sort order; the source's file layout is not reproduced.
  - Evidence: `IGV_SESSION (` (workflows/cutandrun.nf:694) takes the FASTA, its index, the indexed gene BED, peaks only when there is more than one primary peak file (Requirements), the bigWigs and `igv_sort_by_groups         = true` (nextflow.config:100). The chipseq golden brief records the same deliverable question for a sibling session file built from source-relative paths.
  - Confidence: low
  - Missing: whether John wants a session file, and what it should reference.
- Which sections must the MultiQC report carry?
  - Proposed: the source's QC inputs: FastQC and Trim Galore, Bowtie2 target and spike-in logs, samtools stats, flagstat and idxstats, duplicate and linear-duplication metrics, preseq, deepTools fingerprint, correlation and PCA, FRiP, peak counts, consensus counts, reproducibility and fragment-length histograms.
  - Evidence: `MULTIQC (` (workflows/cutandrun.nf:921) with 24 inputs (phase-1 probe of lines 922-945), most as `.collect{it[1]}.ifEmpty([])` (workflows/cutandrun.nf:927-942).
  - Confidence: medium
  - Missing: how complete John wants the report.
- Which test cases establish equivalence?
  - Proposed: the `test` profile inputs as the primary case. Add `test_full_small` (multi-replicate, both callers, replicate-matched IgG, the more-than-one-file branches), `test_no_control`, `test_tech_reps`, a variant per non-default normalisation mode, a `consensus_peak_mode = 'all'` variant on `test_full_small` inputs, and a MACS2-primary variant.
  - Evidence: `test_selection` selects `profile:test`; the pytest suite's whole-pipeline cases mostly use `docker,test` (73 of 91; phase-1 probe) and assert file existence only, e.g. `h3k27me3_R1.seacr.peaks.stringent.bed` (tests/test_05_peak_callers.yml:7) and `all_samples.seacr.consensus.peaks.awk.bed` (tests/test_06_consensus_peaks.yml:18). Two cases lack a `tags:` key (`- name: test_normalisation_mode_invalid` (tests/test_04_bam_scaling.yml:50)). The chipseq golden brief reports one test case of that sibling took about an hour on this host.
  - Confidence: medium
  - Missing: how many cases John wants, given the run time.
- How is scientific comparability established without a source run?
  - Proposed: compare against a reference run of nf-core/cutandrun 3.2.2 on the `test` and `test_full_small` inputs, taken where Nextflow is available; until then, the expert judges scale factors, peak counts, FRiP and consensus intervals.
  - Evidence: the source ships no expected outputs; the pytest assertions are file paths and `should_exist: false` only (phase-1 probe). The probes found `nextflow` and `java` absent from PATH (`environment-probes.txt`, 2026-10-31T08:34:36Z).
  - Confidence: low
  - Missing: John's definition of "comparable", and whether a reference run is wanted.

### Decisions

Only the first item is an expert decision. The second is coordinator context recorded with its source so the expert can confirm or override it. Agent proposals are open questions above, not decisions.

- John: "Convert the whole pipeline to an equivalent Galaxy workflow." No other Galaxy requirement (coordinator, `caller-request.md`).
- Coordinator context (not John's words): IgG controls, spike-in normalisation, the alternative peak caller and the alternative normalisation modes stay in scope; how they are supplied or selected is for the brief.

The driver's reading (scope is every analysis reachable under some parameter setting; plumbing excluded) is an assumption, recorded under Scope, not a decision.

### Related artifacts

- `summary-nextflow.json`: process topology, containers, 126 parameters, 1 sample sheet, 7 reference assets and 3 rebuilds, 11 test candidates with `test_selection`, and correction-pass warnings.
- `summary-nextflow.cli.json`: the raw CLI summary before correction, kept for audit; not evidence.
- `phase1-notes.md`: phase-1 source facts with cites, the fetched test sample sheets, the pytest-case census and the pre-plan check.
- `.scratch/pytest_cases.json` and `.scratch/fetched/` (run directory): parsed pytest-workflow cases and fetched test sample sheets.
- `caller-request.md`: John's objective, coordinator context and the driver's reading.
- `environment-probes.txt`: environment probes, 2026-10-31T08:34:36Z.
- Fixture: `workflow-fixtures/pipelines/nf-core__cutandrun` at `6e1125d4fee4ea7c8b70ed836bb0e92a89e3305f`.

## Agent Environment

These are observations from `environment-probes.txt` (probes at 2026-10-31T08:34:36Z), unless marked as requirements, prior-run observations or unknowns. John stated no tooling, version or container requirement. The coordinator stated none either.

### Tooling

- Required versions: none stated by John or the coordinator. The brief Mold's bundle declares `foundry` with no version.
- Observed (probe 2026-10-31T08:34:36Z):
  - `gxwf`: absent from PATH. Present in the Foundry worktree's `node_modules/.bin`, version 1.15.0.
  - `foundry`: absent from PATH. A per-run shim runs the worktree build; `foundry --help` exited 0. During brief production (2026-10-31) the shim's `validate-workflow-brief --schema-sha256` pin check matched this bundle's schema.
  - `summarize-nextflow`: absent from PATH. A per-run shim runs the worktree build; `--help` exited 0.
  - `planemo`: absent from PATH. A per-run shim runs a planemo master install reporting `planemo, version 0.75.48.dev0`.
  - `node`: v26.13.0. `uvx`: present.
  - `nextflow`, `nf-test`, `java`: absent from PATH.
  - `seacr`, `SEACR_1.3.sh`, `macs2`, `macs3`, `bowtie2`: absent from PATH.
  - `conda`, `mamba`: absent from PATH. A `~/miniforge3` directory exists, not on PATH.
- Prior-run observations (chipseq golden brief, same host, 2026-10-30; not re-probed here): planemo master ran Galaxy `release_26.1`; the Tool Shed API, quay.io and nf-core test-datasets were reachable.
- Unknown (not probed in this run): the Galaxy version planemo would use now, and whether the Tool Shed, container registries and nf-core test-datasets are reachable today.

### Constraints

- Host (probe): Linux x86_64, 4 CPUs, MemTotal 15333296 kB with MemAvailable 13714068 kB at probe time, SwapTotal 16777212 kB. `/` had 410G free. `/tmp` is a tmpfs of 7.4G with 4.9G free.
- Other processes (probe; counts are upper bounds from command-line pattern matches): 0 matching `planemo`, 0 matching `galaxy`, 0 matching `nextflow`.
- Prior-run observation (chipseq golden brief, same host): a long `TMPDIR` path broke Galaxy's socket path, and a short on-disk path was used instead.
- Brief production installs nothing, pulls no containers and downloads no data. Small source-referenced metadata (sample sheets, configs under 1 MB) may be fetched to verify facts (coordinator).

### Containerization

- Container preference: none stated by John or the coordinator.
- Docker (probe): client at `/usr/bin/docker`; the probe reported `29.1.3 linux/amd64`, `cpus=4`, `mem=15701295104` and `driver=overlayfs`. Whether Docker can pull and run the images this workflow needs was not probed in this run.
- Cached images (probe, no pull): 60 in total. They include biocontainers images for ucsc-wigtobigwig 502, gawk 5.4.1 and 5.1.0, trim-galore 0.6.10, multiqc 1.33, samtools 1.21 and 1.22, bedtools 2.31.1, deeptools 3.5.5, picard 3.1.1 and fastqc 0.12.1. These are observations, not tool choices.
- `singularity`, `apptainer`, `podman`: absent from PATH (probe).
- Prior-run observation (chipseq golden brief, same host, 2026-10-30): planemo's default conda resolution failed one tool there, the same tool ran from its biocontainer, and quay.io pulls worked.
- Source facts: modules declare biocontainers or mulled images (`summary-nextflow.json` `tools[]`); the sample-sheet checker uses a literal `container "quay.io/biocontainers/python:3.8.3"` (modules/local/python/samplesheet_check.nf:6), and MACS2 uses `'biocontainers/macs2:2.2.7.1--py38h4a8c8d9_3' }"` (modules/nf-core/macs2/callpeak/main.nf:8).
