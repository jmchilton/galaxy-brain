# Workflow Brief: nf-core/hic 2.1.0 (whole pipeline)

## Workflow

### Objective

John: "Convert the whole pipeline to an equivalent Galaxy workflow." (John's words as relayed in `caller-request.md`; these are the only words from John. The coordinator records no Galaxy requirement beyond this objective.)

The source describes itself as `"description": "Analysis of Chromosome Conformation Capture data (Hi-C)",` (nextflow_schema.json:5). It takes paired-end Hi-C reads described by a sample sheet and one reference genome. Per sample it aligns each mate on its own with HiC-Pro's two-step strategy (`Mapping using a two steps strategy to rescue reads spanning the ligation` (README.md:26)), pairs the mates, classifies read pairs against restriction fragments (or, in DNase mode, by distance only), keeps valid pairs, removes duplicates across runs, and writes the valid pairs as indexed `.pairs` files. From those it builds cooler contact maps at every requested resolution, balances them, exports them as text and a multi-resolution file, and runs distance-decay plots, A/B compartment calling and TAD calling with one or two callers. Optional HiC-Pro raw and ICE-normalised maps can be built alongside. A run-level QC report summarises read QC and HiC-Pro statistics.

### Sources

- Source: nf-core/hic, `version         = '2.1.0'` (nextflow.config:306), commit `fe4ac656317d24c37e81e7940a526ed9ea812f8e` (coordinator pin `fe4ac656`; full SHA from `git rev-parse HEAD` in the fixture). `MIT License` (LICENSE:1). Repository https://github.com/nf-core/hic. Every `path:N` cite below is relative to the fixture root `workflow-fixtures/pipelines/nf-core__hic`.
- Expert intent: John's objective only. Coordinator context and the driver's reading come from `caller-request.md`; neither is John's, and this brief attributes each where it uses them.
- Source evidence: `summary-nextflow.json` (phase-1 CLI output plus a correction pass; schema-valid, 29 processes, 76 parameters, 6 reference assets, 3 rebuilds, 2 test candidates, 24 warnings) and `phase1-notes.md` (phase-1 source facts with cites and pre-plan verdicts). This phase re-read the source for every fact below. Where this brief restates a condition, it quotes the source expression with its operators.
- Pre-plan: `PREPLAN.md` in the galaxy-brain plans directory, supplied by the coordinator as unverified hints. This brief uses only facts that phase 1 or this phase re-read in the source. Its claims about Galaxy tools and IWC workflows are not source facts and are not used.
- Environment evidence: `environment-probes.txt` (driver probes, 2026-11-01T19:10:52Z), this phase's validator pin check and HEAD requests for the test-profile data (2026-11-01T19:31:45Z).
- Test evidence: no nf-test files and no `tests/` directory (phase-1 probe). The only executable test evidence is two profiles. CI runs one of them: `nextflow run ${GITHUB_WORKSPACE} -profile test,docker --outdir ./results` (.github/workflows/ci.yml:40).

### Scope

#### Included

The scope is every scientific analysis the source can run under some parameter setting (driver's reading of John's objective, an assumption recorded in `caller-request.md`). The coordinator's context adds that every analysis branch stays in scope (HiC-Pro mapping and valid-pair filtering, both restriction-enzyme and DNase modes, ICE-normalised HiC-Pro maps, cooler maps at every requested resolution, distance-decay plots, compartments and both TAD callers), that HiC-Pro's helper scripts and the enzyme-name lookup are a question of how to carry them rather than a reason to drop steps, and that substituting a different Hi-C method is a scope change this brief may propose only with evidence. Process topology stays in `summary-nextflow.json`.

There is one primary workflow, `workflow HIC {` (workflows/hic.nf:147). It has no `take:` block; every input channel is built at file scope before it, e.g. `if (params.input) { ch_input = file(params.input) }` (workflows/hic.nf:22).

- Protocol selection at file scope, quoted with operators: an enzyme name (`if (params.digestion){` (workflows/hic.nf:26)), else manual motifs (`}else if (params.restriction_site && params.ligation_site){` (workflows/hic.nf:31)), else DNase (`}else if (params.dnase){` (workflows/hic.nf:34)), else stop (`exit 1, "Ligation motif not found.` (workflows/hic.nf:38)). The enzyme name is looked up in the in-repo `digest {` (nextflow.config:39) map of four enzymes (hindiii, mboi, dpnii, arima); `'arima' {` (nextflow.config:52) carries two restriction motifs, `restriction_site='^GATC,G^ANTC'` (nextflow.config:53).
- Reference preparation (`subworkflows/local/prepare_genome.nf`): build the Bowtie2 index unless one is given (`if(!params.bwt2_index){` (subworkflows/local/prepare_genome.nf:20)); derive chromosome sizes unless given (`if(!params.chromosome_size){` (subworkflows/local/prepare_genome.nf:35)); in restriction-enzyme mode, digest the genome into restriction fragments unless a fragment BED is given (`if(!params.restriction_fragments && !params.dnase){` (subworkflows/local/prepare_genome.nf:49)), with `digest_genome.py -r ${res_site} -o restriction_fragments.bed ${fasta}` (modules/local/hicpro/get_restriction_fragments.nf:20).
- Read QC: FastQC per sample (`FASTQC (` (workflows/hic.nf:170)).
- HiC-Pro mapping (`subworkflows/local/hicpro_mapping.nf`): each mate aligned as single-end (`ch_reads_r1 = reads.map{ it -> pairToSingle(it,"R1") }` (subworkflows/local/hicpro_mapping.nf:45)) end-to-end with Bowtie2; in restriction-enzyme mode (`if (!params.dnase){` (subworkflows/local/hicpro_mapping.nf:58)) unaligned reads are trimmed at the ligation motif (`cutsite_trimming --fastq tmp.fastq` (modules/local/hicpro/trim_reads.nf:21)), realigned, and both passes merged and name-sorted per mate (`samtools merge -@ ${task.cpus}` (modules/local/hicpro/bowtie2_merge.nf:22), `-n \\` (modules/local/hicpro/bowtie2_merge.nf:27)); in DNase mode only mapping statistics are taken (`MAPPING_STATS_DNASE(` (subworkflows/local/hicpro_mapping.nf:94)). Mates are then paired with MAPQ and multi-hit filters (`mergeSAM.py -f ${bam[0]} -r ${bam[1]} -o ${prefix}_bwt2pairs.bam ${args}` (modules/local/hicpro/combine_mates.nf:22)).
- Valid-pair detection: restriction-enzyme mode assigns pairs to fragments and classifies them (`mapped_2hic_fragments.py \\` (modules/local/hicpro/get_valid_interaction.nf:26), `--all \\` (modules/local/hicpro/get_valid_interaction.nf:29)); DNase mode keeps pairs by distance only (`mapped_2hic_dnase.py \\` (modules/local/hicpro/get_valid_interaction_dnase.nf:21)).
- Per-sample merge and duplicate removal: valid pairs from every run (and chunk) of a sample are merged (`ch_valid_pairs = ch_valid_pairs.map{ it -> removeChunks(it)}.groupTuple()` (subworkflows/local/hicpro.nf:74)) and duplicates removed unless kept (`ext.args = { params.keep_dups ? '' : '-d' }` (conf/modules.config:140)); statistics are merged per sample (`MERGE_STATS(` (subworkflows/local/hicpro.nf:89)).
- Conversion of valid pairs to an indexed `.pairs` file (`awk '{OFS="\t";print \$1,\$2,\$3,\$5,\$6,\$4,\$7}' $vpairs | bgzip -c > ${prefix}_contacts.pairs.gz` (modules/local/hicpro/hicpro2pairs.nf:22), `pairix -f ${prefix}_contacts.pairs.gz` (modules/local/hicpro/hicpro2pairs.nf:24)).
- HiC-Pro contact maps and ICE, default off (`if (params.hicpro_maps){` (subworkflows/local/hicpro.nf:105), `hicpro_maps = false` (nextflow.config:72)): raw maps per resolution (`--binsize ${resolution} \\` (modules/local/hicpro/build_contact_maps.nf:22)) and ICE normalisation (`ice --filter_low_counts_perc ${params.ice_filter_low_count_perc} \` (modules/local/hicpro/run_ice.nf:21)).
- Cooler maps (`subworkflows/local/cooler.nf`): bins per resolution (`COOLER_MAKEBINS(` (subworkflows/local/cooler.nf:36)); one `.cool` per sample and resolution (`pairs.combine(cool_bins),` (subworkflows/local/cooler.nf:46)); balancing of each (`COOLER_BALANCE(` (subworkflows/local/cooler.nf:56), `ext.args = '--force'` (conf/modules.config:217)); a multi-resolution file built from the raw map at the finest resolution unless zoom resolutions are given (`ch_res_zoomify = cool_bins.min()` (subworkflows/local/cooler.nf:63), `ext.args = "--balance"` (conf/modules.config:251)); text export of balanced and raw counts (`ext.args = "--one-based-ids --balanced --na-rep 0"` (conf/modules.config:226), `cat ${bedpe} | awk '{OFS="\t"; print \$1,\$2,\$4}' > ${prefix}_balanced.txt` (modules/local/split_cooler_dump.nf:25)).
- Distance decay (`if (!params.skip_dist_decay){` (workflows/hic.nf:202)): `hicPlotDistVsCounts --matrices ${cool} \` (modules/local/hicexplorer/hicPlotDistVsCounts.nf:25) on the balanced map at each distance-decay resolution.
- Compartments (`if (!params.skip_compartments){` (workflows/hic.nf:218)): `cooltools eigs-cis ${args} -o ${prefix}_compartments ${cool}` (modules/local/cooltools/eigscis.nf:29) with `ext.args = '--bigwig'` (conf/modules.config:263).
- TADs (`if (!params.skip_tads){` (workflows/hic.nf:236)), with two independent callers selected by name: `if (params.tads_caller =~ 'insulation'){` (subworkflows/local/tads.nf:13) runs `cooltools insulation ${cool} ${args} > ${prefix}_insulation.tsv` (modules/local/cooltools/insulation.nf:25) with `ext.args = '15 25 50 --window-pixels'` (conf/modules.config:276); `if (params.tads_caller =~ 'hicexplorer'){` (subworkflows/local/tads.nf:19) runs `hicFindTADs --matrix ${cool} \` (modules/local/hicexplorer/hicFindTADs.nf:24) with `ext.args = '--correctForMultipleTesting fdr'` (conf/modules.config:286).
- Run-level QC report from FastQC and the HiC-Pro statistics (`MULTIQC (` (workflows/hic.nf:269), `HICPRO.out.mqc.collect()` (workflows/hic.nf:274)).

#### Excluded

- Pipeline plumbing (driver's reading, an assumption, not John's or the coordinator's words): parameter validation and help, the schema summary, software-version collation (`CUSTOM_DUMPSOFTWAREVERSIONS(` (workflows/hic.nf:252)), completion emails and chat hooks (`workflow.onComplete {` (workflows/hic.nf:285)), the debugging print `INPUT_CHECK.out.reads.view()` (workflows/hic.nf:178), institutional config profiles and publishing options.
- Report presentation inputs that never reach a process: `ch_multiqc_logo` (workflows/hic.nf:90) and `ch_multiqc_custom_methods_description` (workflows/hic.nf:91) are built and not passed to MultiQC.
- No scientific analysis is excluded. Default-off branches (HiC-Pro maps and ICE, DNase mode, the second TAD caller) stay in scope as run-time choices (see Open questions). Parameters that do nothing and FASTQ chunking are open questions, not silent drops.

### Inputs and outputs

Inputs (scientific roles; formats are the source's):

- Samples: a CSV sample sheet with `sample`, `fastq_1` and `fastq_2` (gzipped FASTQ), checked by `check_samplesheet.py \\` (modules/local/samplesheet_check.nf:22). The run needs both mates: `if (!file(row.fastq_2).exists()) {` (subworkflows/local/input_check.nf:56) stops it, although the row schema lists only `"required": ["sample", "fastq_1"]` (assets/schema_input.json:34). Rows that share a sample name are runs of that sample, numbered as chunks (`row[1].eachWithIndex() { file,i ->` (subworkflows/local/input_check.nf:66)) and merged at the valid-pair stage.
- Reference: one genome FASTA, required (`.ifEmpty { exit 1, "Genome index: Fasta file not found: ${params.fasta}" }` (workflows/hic.nf:134)), either given directly or looked up by iGenomes name (`params.fasta = WorkflowMain.getGenomeAttribute(params, 'fasta')` (main.nf:20)). Optional prebuilt Bowtie2 index (`params.bwt2_index = WorkflowMain.getGenomeAttribute(params, 'bowtie2')` (main.nf:21)), chromosome-sizes file and restriction-fragment BED.
- Protocol: an enzyme name from the four-key lookup, or explicit restriction and ligation motifs (comma-separated for multi-motif digests), or DNase mode.
- Resolutions: comma-separated bin sizes for the maps (`bin_size = '1000000'` (nextflow.config:70)) and for each downstream analysis (`res_dist_decay = '250000'` (nextflow.config:79), `res_tads = '40000'` (nextflow.config:81), `res_compartments = '250000'` (nextflow.config:82)), plus optional zoom resolutions. All lists are merged into one set (`ch_map_res = ch_map_res.unique()` (workflows/hic.nf:81)), so maps are built at every resolution any enabled analysis needs; each analysis then takes the balanced map at its own resolutions (`.filter{ it[0].resolution == it[2] }` (workflows/hic.nf:205)).

Outputs (per sample unless noted; source names and formats):

- Read QC (FastQC) and HiC-Pro statistics: per-mate mapping, pairing, valid-pair class and merge statistics (`if ( (fstat =~ /.mapstat/) ){ ext = "${meta.mates}.mmapstat" }` (modules/local/hicpro/merge_stats.nf:19), `echo -e -n "valid_interaction\t" > ${prefix}_allValidPairs.mergestat` (bin/hicpro_merge_validpairs.sh:55)), including cis/trans and short/long-range counts.
- Paired, filtered alignments (`*bwt2pairs.bam`) and, optionally, an interaction-tagged BAM (`params.save_interaction_bam ? " --sam" : ''` (conf/modules.config:112)) and the invalid-pair classes (dangling-end, self-circle, religation, filtered), which are always produced and published only on request (`enabled: params.save_pairs_intermediates` (conf/modules.config:104)).
- Deduplicated valid pairs (`*.allValidPairs`) and the indexed `.pairs.gz` with its `.px2` index.
- Optional HiC-Pro raw maps (`*.matrix` plus bin `*.bed` per resolution) and ICE-normalised maps with biases (`path ("*.biases"), emit:bias` (modules/local/hicpro/run_ice.nf:15)).
- Cooler bins per resolution, balanced `.cool` per resolution (raw `.cool` on request), the multi-resolution `.mcool`, and text matrices (balanced always, raw on request: `enabled: params.save_raw_maps` (conf/modules.config:235)).
- Distance-decay plot and table per resolution (`--plotFile ${prefix}_distcount.png \` (modules/local/hicexplorer/hicPlotDistVsCounts.nf:26)).
- Compartment eigenvectors per resolution, with a bigWig track.
- Insulation tables and hicFindTADs results per TAD resolution.
- Run-level: the aggregate QC report.

### Requirements and preferences

- John (binding): the Galaxy workflow is equivalent to the whole pipeline. Coordinator (not John's words): no Galaxy requirement beyond this objective.
- Coordinator context (not John's words; steers proposals, John confirms): every analysis branch listed under Scope stays in; helper scripts and the enzyme lookup are carried, not dropped; a different Hi-C method is a scope change needing evidence; how branches are selected is a question for this brief.
- Source behaviour that equivalence depends on (source; strength: required unless John overrides):
  - Alignment settings: `bwt2_opts_end2end = '--very-sensitive -L 30 --score-min L,-0.6,-0.2 --end-to-end --reorder'` (nextflow.config:29) for the first pass and `bwt2_opts_trimmed = '--very-sensitive -L 20 --score-min L,-0.6,-0.2 --end-to-end --reorder'` (nextflow.config:30) for trimmed reads; the first pass keeps only aligned reads in restriction-enzyme mode (`ext.args2 = !params.dnase ? "-F 4" :""` (conf/modules.config:54)).
  - Mate pairing: `"-t",` (conf/modules.config:92), `params.keep_multi ? "--multi" : "",` (conf/modules.config:93), `params.min_mapq ? "-q ${params.min_mapq}" : ""` (conf/modules.config:94), default `min_mapq = 10` (nextflow.config:33).
  - Pair filters, each applied only when above 0: `params.min_cis_dist > 0 ? " -d ${params.min_cis_dist}" : '',` (conf/modules.config:107), `params.min_insert_size > 0 ?  " -s ${params.min_insert_size}" : '',` (conf/modules.config:108), `params.max_insert_size > 0 ? " -l ${params.max_insert_size}" : '',` (conf/modules.config:109), `params.min_restriction_fragment_size > 0 ? " -t ${params.min_restriction_fragment_size}" : '',` (conf/modules.config:110), `params.max_restriction_fragment_size > 0 ? " -m ${params.max_restriction_fragment_size}" : '',` (conf/modules.config:111). DNase mode receives only the first: `ext.args = { params.min_cis_dist > 0 ? " -d ${params.min_cis_dist}" : "" }` (conf/modules.config:123).
  - Duplicates are pairs with the same two chromosomes and positions, after sorting (`sort -k2,2 -k5,5 -k3,3n -k6,6n -T ./tmp/ -o ${ofile} ${vfile}` (bin/hicpro_merge_validpairs.sh:34), `awk -F"\t" 'BEGIN{c1=0;c2=0;s1=0;s2=0}(c1!=$2 || c2!=$5 || s1!=$3 || s2!=$6){print;c1=$2;c2=$5;s1=$3;s2=$6}' > ${prefix}.allValidPairs` (bin/hicpro_merge_validpairs.sh:43)), across all runs of a sample.
  - Cooler loading from the pairs columns: `ext.args = "pairs -c1 2 -p1 3 -c2 4 -p2 5"` (conf/modules.config:208).
  - ICE settings: `--max_iter ${params.ice_max_iter} --eps ${params.ice_eps} --remove-all-zeros-loci --output-bias 1 --verbose 1 ${rmaps}` (modules/local/hicpro/run_ice.nf:24) with defaults `ice_max_iter = 100` (nextflow.config:73), `ice_filter_low_count_perc = 0.02` (nextflow.config:74), `ice_filter_high_count_perc =  0` (nextflow.config:75), `ice_eps = 0.1` (nextflow.config:76).
  - Multi-motif enzymes work end to end: the ligation motifs reach the trimmer as one comma-separated string (`--cutsite ${motif[0]} \\` (modules/local/hicpro/trim_reads.nf:22)), split by `size_t pos = cutSitesSequence.find(",");` (bin/src/cutsite_trimming.cpp:39), and the restriction motifs by `for m in s.split(","):` (bin/digest_genome.py:125).
  - HiC-Pro's helper code defines results and is reproduced where it does: 9 processes run pipeline-bundled helpers in `bin/` (seven Python or shell scripts, plus `build_matrix` and `cutsite_trimming`, committed as compiled executables with C++ sources in `bin/src/`; phase-1 probe). ICE is the `iced` package's `ice` command, not a bundled script.

### Acceptance criteria

- The restriction-enzyme path runs end to end on the source's `test` profile inputs (one paired sample SRR4292758, the W303 yeast genome, HindIII, bin sizes 2000 and 1000, both TAD callers) and produces every output kind listed above for that configuration.
- Valid-pair counts, duplicate-removal counts and the cis/trans and short/long-range statistics match the source's statistics files for the same inputs; balanced maps, compartments and TAD calls match the source's at each resolution within numerical tolerance.
- Each run-time choice kept in scope (protocol and enzyme or motifs, DNase mode, HiC-Pro maps with ICE, TAD caller selection, the analysis switches, resolutions, filters, duplicate and multi-hit handling) changes the outputs the way the corresponding source parameter does.
- Runs of one sample are merged before duplicate removal, so duplicates across runs are removed once, as in the source.

### Open questions

- How is the protocol chosen (restriction enzyme by name, explicit motifs, or DNase)?
  - Proposed: one run-time protocol choice with the source's three ways and precedence: an enzyme name from the four-key table wins over explicit motifs, and a run with neither and without DNase mode stops. Whether that is one entry point or several is left to design, provided each mode can be run and tested on its own.
  - Evidence: the file-scope chain quoted under Scope; unknown names stop the run (`if (params.digest && params.digestion && !params.digest.containsKey(params.digestion)) {` (lib/WorkflowHic.groovy:17)); coordinator context keeps both modes.
  - Confidence: medium
  - Missing: whether John wants a single entry point for both modes.
- What happens when an enzyme name (or motifs) and DNase mode are both set?
  - Proposed: follow the source, where DNase mode wins and the motifs are ignored; optionally reject the combination up front.
  - Evidence: the file-scope chain sets motifs first (`if (params.digestion){` (workflows/hic.nf:26)), but every mode-dependent step tests `params.dnase` on its own (`if (!params.dnase){` (subworkflows/local/hicpro.nf:47), `if(!params.restriction_fragments && !params.dnase){` (subworkflows/local/prepare_genome.nf:49)). The usage notes say `In DNAse Hi-C mode, all options related to digestion Hi-C` (docs/usage.md:455) are ignored.
  - Confidence: medium
  - Missing: whether John prefers an error over silent precedence.
- How is the enzyme-name lookup carried?
  - Proposed: keep the four names (hindiii, mboi, dpnii, arima) with the motifs recorded at the pin as a fixed table, plus explicit motifs for any other enzyme.
  - Evidence: `digest {` (nextflow.config:39) is in-repo and static (no remote config: `//   includeConfig "${params.custom_config_base}/pipeline/hic.config"` (nextflow.config:148) is commented out); the test profiles use `digestion = 'hindiii'` (conf/test.config:27) and `digestion = 'dpnii'` (conf/test_full.config:23). Coordinator context: the lookup is carried, not dropped.
  - Confidence: high
- Is HiC-Pro's processing method kept, or may a different Hi-C method replace it?
  - Proposed: keep HiC-Pro's method (two-pass mapping with ligation-site trimming, mate pairing, fragment-based classification, its duplicate rule and statistics). A different method changes results and statistics, so it is a scope change for John to decide, not an implementation choice.
  - Evidence: `(https://github.com/nservant/HiC-Pro)` (README.md:25) heads the processing steps; the behaviour that defines results sits in the bundled helpers (Requirements). Coordinator context: substitution needs evidence and is a scope change. This phase found no source evidence that another method gives equivalent valid pairs or statistics.
  - Confidence: high
- How are the bundled helpers (Python and shell scripts, and the two compiled C++ tools) carried?
  - Proposed: reproduce their behaviour exactly as at the pin; the scripts and the C++ sources in `bin/src/` are the reference. The committed compiled executables are x86-64 builds of those sources; rebuilding from source is preferred over reusing the committed builds. How they are packaged is left to design.
  - Evidence: phase-1 `file bin/*` probe (two ELF executables, six `#!/usr/bin/env python` scripts, one bash script). Six helper processes share one source container whose conda specs differ (`conda "conda-forge::python=3.9 bioconda::iced=0.5.10 conda-forge::numpy=1.22.3"` (modules/local/hicpro/run_ice.nf:5)); the helpers' Python dependencies are therefore only partly declared per process. Coordinator context: carrying them is the question, not dropping them.
  - Confidence: medium
  - Missing: whether John accepts rebuilt helpers in place of the committed binaries, and whether results must be checked byte-for-byte against the committed builds.
- Which source defaults apply where `nextflow_schema.json` and `nextflow.config` disagree?
  - Proposed: the `nextflow.config` values, which are what the source runs with: `bin_size = '1000000'` (nextflow.config:70), no zoom resolutions, `res_dist_decay = '250000'` (nextflow.config:79), `tads_caller = 'insulation'` (nextflow.config:80), `res_tads = '40000'` (nextflow.config:81). The schema values are the alternative.
  - Evidence: schema defaults `"default": "1000000,500000",` (nextflow_schema.json:236), `"default": "5000",` (nextflow_schema.json:264), `"default": "1000000",` (nextflow_schema.json:282), `"default": "hicexplorer,insulation",` (nextflow_schema.json:287), `"default": "40000,20000",` (nextflow_schema.json:293). The usage notes repeat the schema's zoom default (`Default:'5000'` (docs/usage.md:547)).
  - Confidence: medium
  - Missing: which set John treats as the pipeline's intended defaults.
- Which analyses are run-time choices, and with which defaults?
  - Proposed: distance decay, compartments and TADs on by default, each switchable off; HiC-Pro maps with ICE off by default and switchable on; TAD callers chosen as any of insulation and hicExplorer, default insulation only.
  - Evidence: `if (!params.skip_dist_decay){` (workflows/hic.nf:202), `if (!params.skip_compartments){` (workflows/hic.nf:218), `if (!params.skip_tads){` (workflows/hic.nf:236), `hicpro_maps = false` (nextflow.config:72); the callers are independent pattern matches (Scope); `tads_caller = 'insulation,hicexplorer'` (conf/test.config:37). Coordinator context keeps every branch.
  - Confidence: high
- Are switches that the source declares but never reads offered?
  - Proposed: no. Balancing, the multi-resolution file, the cooler maps and the QC report always run, as in the source. The documented meanings (skip balancing, skip the multi-resolution file, skip maps, skip the report, a report title) are the alternative.
  - Evidence: `skip_maps = false` (nextflow.config:85), `skip_balancing = false` (nextflow.config:86), `skip_mcool = false` (nextflow.config:87), `skip_multiqc = false` (nextflow.config:91), `multiqc_title              = null` (nextflow.config:95) are read nowhere (phase-1 grep); the usage notes still document them and a `--skip_cool` (docs/usage.md:714) option that does not exist; `MULTIQC (` (workflows/hic.nf:269) is unconditional.
  - Confidence: medium
  - Missing: whether John wants the documented switches implemented.
- Do the insert-size filters apply in DNase mode?
  - Proposed: no, as in the source: DNase mode filters only by minimum cis distance. The usage notes do not say the insert-size filters are ignored in DNase mode; applying them there is the alternative.
  - Evidence: DNase valid-pair detection receives only `-d` (`ext.args = { params.min_cis_dist > 0 ? " -d ${params.min_cis_dist}" : "" }` (conf/modules.config:123)), and the DNase helper takes only `"r:o:d:g:avh",` (bin/mapped_2hic_dnase.py:44) short options, with `-d` as `elif opt in ("-d", "--minCisDist"):` (bin/mapped_2hic_dnase.py:219) and none for insert size. The usage notes list the insert-size filters under `### HiC-pro processing` (docs/usage.md:464), outside the digestion section that they say DNase mode ignores, and for DNase mode they recommend the minimum cis distance (`it is highly recommended to use the` (docs/usage.md:457)).
  - Confidence: low
  - Missing: John's intent for DNase data; no source test covers DNase mode.
- Is FASTQ chunking reproduced?
  - Proposed: no, as a run-time feature. Chunking only splits a run's reads for parallel mapping; the chunks rejoin at the valid-pair merge with the same duplicate rule, so the results do not depend on it. Multi-run samples are kept (they reuse the same merge).
  - Evidence: `if (params.split_fastq){` (subworkflows/local/input_check.nf:12), `.splitFastq( by: params.fastq_chunks_size, pe:true, file: true, compress:true)` (subworkflows/local/input_check.nf:18), default `split_fastq = false` (nextflow.config:25); the merge quoted under Scope. No test profile sets it.
  - Confidence: medium
  - Missing: whether John uses chunk-level statistics; this phase did not run the source to confirm identical outputs.
- Are paired-end reads the only input?
  - Proposed: yes; every sample must have both mates, as the source requires at run time.
  - Evidence: the run-time check quoted under Inputs versus the row schema that makes `fastq_2` optional; HiC-Pro pairs mates from separate single-end alignments (`COMBINE_MATES (` (subworkflows/local/hicpro_mapping.nf:105)).
  - Confidence: high
- What happens when duplicates are kept?
  - Proposed: keep the source's merge (plain concatenation without sorting), but sort the pairs before indexing so the `.pairs` file can be indexed, as it is when duplicates are removed.
  - Evidence: with `keep_dups` the merge is `cat ${vpairs} > ${prefix}.allValidPairs` (bin/hicpro_merge_validpairs.sh:52), and the conversion does not sort (`##sort -k2,2 -k4,4 -k3,3n -k5,5n ${prefix}_contacts.pairs | bgzip -c > ${prefix}_contacts.pairs.gz` (modules/local/hicpro/hicpro2pairs.nf:23) is commented out) before `pairix -f ${prefix}_contacts.pairs.gz` (modules/local/hicpro/hicpro2pairs.nf:24). Whether pairix accepts the unsorted file was not checked (nextflow and pairix are absent here); no test sets `keep_dups`.
  - Confidence: low
  - Missing: a source run with `keep_dups` to show whether it succeeds.
- Are compartment eigenvectors oriented by GC content?
  - Proposed: follow the source, which does not orient them: the GC track is computed and not passed to eigs-cis. Orienting by GC is the alternative.
  - Evidence: `cooltools genome gc genome_bins.txt ${fasta} > genome_gc.txt` (modules/local/cooltools/eigscis.nf:28) followed by `cooltools eigs-cis ${args} -o ${prefix}_compartments ${cool}` (modules/local/cooltools/eigscis.nf:29) without a phasing track.
  - Confidence: low
  - Missing: whether John reads the unoriented sign as intended or as a source defect.
- How is the multi-resolution file built?
  - Proposed: follow the source: from the raw `.cool` at the finest requested resolution, balanced during zooming; given zoom resolutions, one file from each, and those resolutions also join the map set.
  - Evidence: the zoom choice quoted under Scope; `ch_res_zoomify = Channel.from(params.res_zoomify).splitCsv().flatten().unique().toInteger()` (subworkflows/local/cooler.nf:65); `ch_map_res = ch_map_res.concat(ch_zoom_res)` (workflows/hic.nf:48). The schema describes the parameter as a single maximum (`"description": "Maximum resolution to build mcool file"` (nextflow_schema.json:265)).
  - Confidence: medium
  - Missing: whether John expects one multi-resolution file per sample.
- How are the genome and its indexes supplied?
  - Proposed: supply the genome FASTA directly, with optional prebuilt Bowtie2 index, chromosome sizes and restriction-fragment BED as overrides, building each from the FASTA when absent, as the source does. Do not reproduce the iGenomes name lookup; record the test profile's mm10 key as test-data provenance.
  - Evidence: the three rebuild guards quoted under Scope; `igenomes_base = 's3://ngi-igenomes/igenomes'` (nextflow.config:18); `genome = 'mm10'` (conf/test_full.config:20). The iGenomes entries provide only a FASTA and a Bowtie2 index (phase-1 notes).
  - Confidence: medium
  - Missing: whether John wants named-genome lookup kept as a feature.
- Which tunable source parameters become run-time values?
  - Proposed: the science-affecting ones with source defaults: protocol (enzyme name, motifs, DNase), resolutions (`bin_size`, `res_zoomify`, `res_dist_decay`, `res_compartments`, `res_tads`), `tads_caller`, the analysis switches, `hicpro_maps` and the four ICE settings, `min_mapq`, `keep_multi`, `keep_dups`, `min_cis_dist`, the insert-size and fragment-size limits, and the two Bowtie2 option strings. Save-intermediate switches (`save_reference`, `save_aligned_intermediates`, `save_pairs_intermediates`, `save_raw_maps`) become optional outputs, not settings; `save_interaction_bam` adds the interaction-tagged BAM as an optional output. Report presentation (`multiqc_config`, `multiqc_logo`, `multiqc_methods_description`) is left out.
  - Evidence: `summary-nextflow.json` `params[]` (76 entries) and the `params {` (nextflow.config:10) block.
  - Confidence: low
  - Missing: John's preferred parameter surface.
- What must the run-level QC report contain?
  - Proposed: read QC and the HiC-Pro mapping, pairing, valid-pair and merge statistics per sample. The exact MultiQC layout is not required.
  - Evidence: MultiQC receives only FastQC zips and `HICPRO.out.mqc.collect()` (workflows/hic.nf:274); `mqc = MERGE_VALID_INTERACTION.out.mqc.concat(MERGE_STATS.out.mqc)` (subworkflows/local/hicpro.nf:129).
  - Confidence: medium
  - Missing: whether John uses the report beyond the statistics files.
- How is equivalence established, given that the source has no recorded expected outputs?
  - Proposed: the `test` profile is the primary equivalence case (restriction-enzyme mode, cooler maps, distance decay, compartments, both TAD callers). Reference outputs come from one source run of that profile at the pin on a host with Nextflow and a working container engine. Add the same inputs with HiC-Pro maps on, and a DNase-mode run of the same reads as a mechanics check only (the reads are HindIII Hi-C). `test_full` (mm10, three runs of one sample, DpnII) is the only multi-run evidence and is reference-scale, so it is optional.
  - Evidence: `summary-nextflow.json` `test_selection` selects `profile:test` and says no candidate covers DNase mode or HiC-Pro maps; no nf-test snapshots exist (phase-1 probe); CI runs only the test profile (Sources). Test data is on HTTPS: `fasta = 'https://github.com/nf-core/test-datasets/raw/hic/reference/W303_SGD_2015_JRIU00000000.fsa'` (conf/test.config:26) (HEAD 2026-11-01: 200, 11,542,637 B) and `SRR4292758,https://github.com/nf-core/test-datasets/raw/hic/data/SRR4292758_00_R1.fastq.gz` (assets/samplesheet.csv:2) (R1 26,066,317 B; R2 26,201,604 B). The `test_full` reads are on S3 (not probed).
  - Confidence: low
  - Missing: where a reference source run can execute (Nextflow and Java are absent on this host), John's choice of equivalence cases and tolerances, and DNase test data.
- Are source elements with no effect on results reproduced?
  - Proposed: no. Besides the unread switches above: the MultiQC logo and methods description never reach MultiQC, the read-tuple print is debugging, and two usage-note examples are stale (a glob instead of a sample sheet, and an enzyme name `dnpii` the lookup rejects).
  - Evidence: Excluded section; `nextflow run main.nf --input './*_R{1,2}.fastq.gz' --genome 'mm10' --digestion 'dnpii'` (docs/usage.md:243).
  - Confidence: high

### Decisions

Only the first item is an expert decision.

- John: "Convert the whole pipeline to an equivalent Galaxy workflow." (John's words, relayed in `caller-request.md`.) Coordinator (not John's words): no Galaxy requirement beyond this objective.
- Coordinator context (not John's words): every analysis branch stays in scope; helper scripts and the enzyme lookup are carried, not dropped; a different Hi-C method is a scope change needing evidence; branch selection is a question for this brief.

The driver's reading (scope is every analysis reachable under some parameter setting; plumbing excluded) is an assumption, recorded under Scope, not a decision. This brief makes no agent decisions; its own proposals are in Open questions.

### Related artifacts

- `summary-nextflow.json`: process topology (29 processes, 9 workflow blocks, 76 edges, 27 in the primary body and 49 inside subworkflows), containers, 76 parameters, the sample sheet, 6 reference assets and 3 rebuilds, 2 test candidates with `test_selection`, and 24 correction-pass and source warnings (including the `conf/modules.config` bindings and the bundled-helper list).
- `summary-nextflow.cli.json`: the raw CLI summary before correction, kept for audit; not evidence.
- `phase1-notes.md`: phase-1 source facts with cites, CLI defects and the pre-plan verdicts.
- `.scratch/fetched/samplesheet_HiC_mESC_full_test.csv`: the `test_full` sample sheet (3 rows, sample `HIC_ES_4`).
- `caller-request.md`: John's objective, coordinator context and the driver's reading.
- `environment-probes.txt`: environment probes, 2026-11-01T19:10:52Z.
- Fixture: `workflow-fixtures/pipelines/nf-core__hic` at `fe4ac656317d24c37e81e7940a526ed9ea812f8e`.

## Agent Environment

Observed on the agent host by the driver's probes (`environment-probes.txt`, 2026-11-01T19:10:52Z) unless marked otherwise. `caller-request.md` records no tooling, version or container requirement from John or the coordinator.

### Tooling

- Required versions: none stated by John or the coordinator. The brief Mold's bundle declares `foundry` with no version.
- `foundry`: ABSENT on PATH; a per-run shim to the Foundry worktree build exists and `foundry --help` through it exited 0. This phase ran `foundry validate-workflow-brief --schema-sha256 8e65acb7…` through the shim at 2026-11-01T19:29:51Z: `schema matches`, exit 0.
- `summarize-nextflow`: ABSENT on PATH; a per-run shim exists and its `--help` exited 0.
- `gxwf`: ABSENT on PATH; `node_modules/.bin/gxwf` in the Foundry worktree reported `1.15.0`.
- `planemo`: ABSENT on PATH; a per-run shim to a planemo master checkout reported `planemo, version 0.75.48.dev0`.
- `node` v26.13.0, `python3` and `uvx` are on PATH. `python2` is ABSENT.
- `nextflow`, `nf-test` and `java`: ABSENT, so the source cannot be run on this host as observed.
- Source tools probed by name (`bowtie2`, `samtools`, `cooler`, `cooltools`, `hicexplorer`, `hicFindTADs`, `hicPlotDistVsCounts`, `HiC-Pro`, `iced`, `pairtools`, `multiqc`, `fastqc`, `R`): ABSENT on PATH.
- `conda` and `mamba`: ABSENT on PATH; a `~/miniforge3` directory exists (not on PATH).
- Running processes at probe time (pgrep counts, upper bounds because the pattern matches any command line): planemo 1, galaxy 1, nextflow 1. Counts that match any command line do not show that any of these services is running.

### Constraints

- Host: Linux x86_64, 4 CPUs, MemTotal 15,333,296 kB with 12,812,480 kB available at probe time, 16,777,212 kB swap; `/` has 340G available of 496G; `/tmp` is a 7.4G tmpfs with 2.9G available.
- Network: this phase reached GitHub raw files with HEAD requests on 2026-11-01 (test FASTA and reads, sizes under Open questions). S3 locations (`s3://ngi-igenomes/...`, used by `test_full` and the iGenomes lookup) were not probed; their reachability is unknown.
- Brief production installs nothing, pulls no containers and downloads no reads, databases or genomes. Small source-referenced metadata (sample sheets, configs under 1 MB) may be fetched to verify facts (coordinator).
- Unknown: where reference outputs from a source run can be produced (needs Nextflow, Java and a working container engine or conda), and whether later builds may download the test data (about 64 MB over HTTPS for the `test` profile).

### Containerization

- Container preference: none stated by John or the coordinator.
- Docker: `/usr/bin/docker` is on PATH; the probe's docker section recorded `29.1.3 linux/amd64` and `cpus=4 mem=15701295104 driver=overlayfs` from the daemon, and 108 cached images. Cached images for tools the source uses (bowtie2 2.5.4, samtools 1.21 and 1.22, multiqc 1.31 and 1.33, fastqc 0.12.1) differ in version from the source's pins (bowtie2 2.4.4, samtools 1.15.1 and 1.16.1, multiqc 1.14, fastqc 0.11.9); the probe's bedtools matches are not source tools. No container was run, so whether a tool container executes here is not established.
- `singularity`, `apptainer` and `podman`: ABSENT at 2026-11-01T19:10:52Z.
- Source facts: modules declare biocontainers and mulled images (`summary-nextflow.json` `tools[]`); the shared mulled image used by six HiC-Pro helper processes was not resolved to packages in phase 1 (summary warning).
