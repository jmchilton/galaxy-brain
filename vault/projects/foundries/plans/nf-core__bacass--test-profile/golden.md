# nf-core/bacass 2.5.0: default test-profile short-read bacterial assembly

## Workflow

Brief for expert review, produced from the phase-1 source summary (`summary-nextflow.json`), the caller request (`caller-request.md`) and real environment probes (`environment-probes.txt`). Source facts cite the pinned source as `path:line`, relative to the repository root. Expert requirements are attributed to the caller. Source tools, formats and process names below are evidence of what the source does, not Galaxy choices.

### Objective

Caller objective: convert the default test-profile path of nf-core/bacass (`conf/test.config` with its sample sheet `bacass_short_reseq.tsv`) to an equivalent Galaxy workflow. The scientific goal of that path is per-sample de novo assembly of bacterial genomes from paired-end Illumina short reads: merge sequencing runs that belong to the same sample, quality-check and trim the reads, assemble each sample, assess the assemblies (reference-free assembly statistics and BUSCO completeness), annotate them with Prokka, and summarise all QC in one aggregate MultiQC report.

This is the test-profile variant of a golden plan; a separate whole-pipeline plan exists (caller). The terminal artifact of this run is this brief.

### Sources

- Source: nf-core/bacass 2.5.0, https://github.com/nf-core/bacass, commit `76e4b12cacdc242891ea57e723c5e273f4ac71b4`, MIT. The pin is in the source summary's `source.version`; the local fixture clone `workflow-fixtures/pipelines/nf-core__bacass` was used for the citations here.
- Selected test candidate: `tests/default.nf.test::-profile test` (summary `test_selection.status: selected`). The test runs `test("-profile test")` (tests/default.nf.test:7), with profile `test` coming from `profile "test"` in nf-test.config:15, and overrides only `outdir` (tests/default.nf.test:10-12).
- Test profile: `conf/test.config` sets `input = params.pipelines_testdata_base_path + 'bacass/bacass_short_reseq.tsv'` (conf/test.config:26) and `prokka_args = " --fast"`, `assembly_type = 'short'`, `skip_pycoqc = true`, `skip_kraken2 = true`, `skip_kmerfinder = true` (conf/test.config:29-33). With `pipelines_testdata_base_path = 'https://raw.githubusercontent.com/nf-core/test-datasets/'` (nextflow.config:90) the sample sheet URL is https://raw.githubusercontent.com/nf-core/test-datasets/bacass/bacass_short_reseq.tsv.
- Evidence availability: the remote sample sheet and its FASTQ files were not fetched during brief production. The coordinator fetched the sheet afterwards (`bacass_short_reseq.tsv` at nf-core/test-datasets branch `bacass`, fetched by the coordinator 2026-10-29); its contents below come from that fetch and the test snapshot `tests/default.nf.test.snap`.
- Caller instructions: `caller-request.md` (objective, scope, "no Galaxy requirements beyond that").
- Caller-supplied evidence about Galaxy (recorded with attribution, not inferred): the Galaxy BUSCO wrapper is offline-only and reads lineages from the `busco_database` data table.

### Scope

What the test profile runs was established from source with nextflow.config defaults in force: `assembler = 'unicycler'` (nextflow.config:30), `annotation_tool = 'prokka'` (nextflow.config:48), `skip_busco = false` (nextflow.config:66), `skip_annotation = false` (nextflow.config:67).

#### Included

Caller: stay within what the default test profile runs, including steps it turns on by default (e.g. BUSCO, Prokka, MultiQC), and include run merging of the duplicate sample ID. Under that rule the source path is:

- Sample-sheet parsing and run merging. Rows are grouped by sample ID (`.groupTuple()`, subworkflows/local/utils_nfcore_bacass_pipeline/main.nf:92); the schema declares the ID column `"unique": false` (assets/schema_input.json:13). Samples whose FASTQ list is longer than one run (`multiple: meta.single_end ? fastqs.size() > 1 : fastqs.size() > 2`) are concatenated by CAT_FASTQ_SHORT, gated by `params.assembly_type in ['short', 'hybrid']` (workflows/bacass.nf:120-134). For paired-end input the source splits the run list by alternating position into read 1 and read 2 and concatenates each (modules/nf-core/cat/fastq/main.nf:36-42).
- Short-read QC and trimming: FastQC on raw reads, fastp trimming, FastQC on trimmed reads (FASTQ_TRIM_FASTP_FASTQC, gated by `params.assembly_type != 'long'`, workflows/bacass.nf:175-184; inner gates `!val_skip_fastqc` and `!val_skip_fastp` at subworkflows/nf-core/fastq_trim_fastp_fastqc/main.nf:39,56,85).
- Short-read de novo assembly with Unicycler (`params.assembler == 'unicycler'`, workflows/bacass.nf:295-301), fed the trimmed reads (workflows/bacass.nf:269-276).
- Reference-free assembly QC with QUAST, run once over all samples' assemblies as a single report (`ch_assembly.collect{it[1]}` mapped to `[id:'report']`, run under `if(params.skip_kmerfinder)` with no reference unless `reference_fasta`/`reference_gff` are set; workflows/bacass.nf:504-515).
- Assembly completeness with BUSCO (`!params.skip_busco`, workflows/bacass.nf:546-557), lineage `busco_lineage = 'bacteria_odb10'`, mode `genome` (nextflow.config:41-42).
- Decompression of gzipped assemblies and genome annotation with Prokka (`!params.skip_annotation && params.annotation_tool == 'prokka'`, workflows/bacass.nf:563-576), using the test profile's `prokka_args = " --fast"` (conf/test.config:29; applied via conf/modules.config:242).
- One aggregate MultiQC report (CUSTOM_MULTIQC, no gate; workflows/bacass.nf:660-681) over FastQC raw/trimmed, fastp, QUAST, BUSCO and Prokka results.

The snapshot agrees with this set: 17 succeeded tasks (tests/default.nf.test.snap:4) and version entries for BUSCO, CAT_FASTQ_SHORT, fastp, FastQC (raw and trimmed), GUNZIP, Prokka, QUAST and Unicycler (tests/default.nf.test.snap:6-31).

#### Excluded

Caller: exclude long-read, hybrid, other assemblers/annotators, and tools the test profile skips. Source gates confirming each is off under the test profile:

- Long-read and hybrid paths: CAT_FASTQ_LONG (`params.assembly_type in ['long', 'hybrid']`, workflows/bacass.nf:141), PORECHOP (workflows/bacass.nf:221), FILTLONG (workflows/bacass.nf:234), and polishing (`(params.assembly_type == 'long' && !params.skip_polish) || ( params.assembly_type != 'short' && params.polish_method)`, workflows/bacass.nf:378).
- Long-read QC (NanoPlot, ToulligQC): QC_NANOPLOT_TOULLIGQC is called unconditionally (workflows/bacass.nf:194-198) but its input is `Channel.empty()` when the long-read branch is off (workflows/bacass.nf:166), so it runs no tasks under the test profile.
- Other assemblers: Canu (`params.assembler == 'canu'`, workflows/bacass.nf:307), Dragonflye (`params.assembler == 'dragonflye'`, workflows/bacass.nf:367), and Miniasm.
- Other annotators: Bakta, DFAST, Liftoff (`params.annotation_tool == 'bakta'`, `'dfast'`, `'liftoff'`; workflows/bacass.nf:582, 600, 611).
- Tools the test profile skips: pycoQC (`!params.skip_pycoqc`, workflows/bacass.nf:209), Kraken2 (`!params.skip_kraken2`, workflows/bacass.nf:439), Kmerfinder and the reference download plus by-reference QUAST that only run with it (`!params.skip_kmerfinder`, workflows/bacass.nf:476, 516).
- Source pipeline bookkeeping that is not scientific work: parameter validation, completion email/notification, and the collated software-versions file (except as an input to the report; see Open questions).

### Inputs and outputs

Inputs (source-supported):

- A sample sheet (`.tsv` in the test profile, conf/test.config:26) with columns ID, R1, R2, LongFastQ, Fast5, GenomeSize (assets/schema_input.json). Only ID is required; `NA` marks an absent file. In the test sheet, ID, R1, R2 and GenomeSize (`2.8m` on every row) carry data; LongFastQ and Fast5 are `NA` (`bacass_short_reseq.tsv` at nf-core/test-datasets branch `bacass`, fetched by the coordinator 2026-10-29).
- Per run, gzipped FASTQ short reads. The test data are paired-end: the snapshot has fastp Read 2 plots (tests/default.nf.test.snap:342).
- The test sheet has three rows and two sample IDs: ERR044595 appears twice (runs `ERR044595_1M_*` and `r-ERR044595_1M_*`), ERR064912 once (`bacass_short_reseq.tsv` at nf-core/test-datasets branch `bacass`, fetched by the coordinator 2026-10-29). The snapshot shows two samples, ERR044595 and ERR064912 (tests/default.nf.test.snap:77-82), and a CAT_FASTQ_SHORT version entry (tests/default.nf.test.snap:9-11).
- BUSCO lineage dataset `bacteria_odb10`. The source downloads it at runtime: `busco_db_path` defaults to `null` (nextflow.config:43), so the module omits `--download_path` (`busco_lineages_path ? "--download_path ${busco_lineages_path}" : ''`, modules/nf-core/busco/busco/main.nf:52) and the output contains `busco/busco_downloads` (tests/default.nf.test.snap:146).
- Prokka uses no external database parameter in this path; `ch_proteins` is `[]` when `prokka_proteins` is empty and the third argument is `[]` (workflows/bacass.nf:97, 569-573).

Outputs (scientific roles; per sample unless noted):

- Merged reads for samples with several runs.
- Raw and trimmed read QC reports (FastQC) and trimming reports (fastp JSON/HTML).
- Assembly: scaffolds FASTA and assembly graph (Unicycler `*.scaffolds.fa.gz`, `*.assembly.gfa.gz`, tests/default.nf.test.snap:77-82).
- One QUAST report across all samples.
- BUSCO completeness summaries against `bacteria_odb10`.
- Prokka annotation (GFF, GenBank, protein/nucleotide FASTA, summary text; per-sample `Prokka/<ID>` directories at tests/default.nf.test.snap:54-55).
- One aggregate MultiQC report (`multiqc/multiqc_report.html`).

### Requirements and preferences

- Caller (required): scope is the default test-profile path as listed under Scope; run merging of the duplicate sample ID is in scope and must be exercised.
- Caller (required): BUSCO, Prokka and MultiQC are in.
- Caller: no Galaxy requirements beyond the objective.
- Source behaviour to preserve (source, strength unstated by caller):
  - Runs of one sample must all be single-end or all paired-end; the source errors otherwise (subworkflows/local/utils_nfcore_bacass_pipeline/main.nf:199-207).
  - After fastp, samples with zero reads passing filtering are dropped before trimmed-read FastQC and assembly (`if (getFastpReadsAfterFiltering(json) > 0)`, subworkflows/nf-core/fastq_trim_fastp_fastqc/main.nf:75-83).
  - Only non-empty assemblies are annotated (`ch_to_prokka.filter{ meta, fasta -> !fasta.isEmpty() }`, workflows/bacass.nf:570).
- Source test resource caps: `resourceLimits = [cpus: 4, memory: '15.GB', time: '1.h']` (conf/test.config:13-19).
- Source quirks surfaced, not to be fixed here:
  - FASTQ_TRIM_FASTP_FASTQC is called with `(ch_shortreads_concat, [], params.save_trimmed_fail, [], params.discard_trimmed_pass, params.skip_fastp, params.skip_fastqc)` (workflows/bacass.nf:176-184), while its `take:` order is `ch_reads, ch_adapter_fasta, val_save_trimmed_fail, val_discard_trimmed_pass, val_save_merged, val_skip_fastp, val_skip_fastqc` (subworkflows/nf-core/fastq_trim_fastp_fastqc/main.nf:23-30). So `[]` binds `val_discard_trimmed_pass` and `params.discard_trimmed_pass` binds `val_save_merged`. Both values are falsy under the test profile (`discard_trimmed_pass = false`, nextflow.config:62; `save_trimmed_fail = false`, nextflow.config:18).
  - `skip_multiqc = false` is declared (nextflow.config:69) but never read; CUSTOM_MULTIQC runs unconditionally (workflows/bacass.nf:660-681).
  - BUSCO receives `--mode` and `--lineage_dataset` twice: from the module script (modules/nf-core/busco/busco/main.nf:49-51, 94-95) and from `ext.args = { "--mode ${params.busco_mode} --lineage_dataset ${params.busco_lineage}" }` (conf/modules.config:233).
  - The test profile's MultiQC config is `assets/multiqc_config.yml`, chosen because the condition `!params.skip_kmerfinder && params.assembly_type` is false (workflows/bacass.nf:653).

### Acceptance criteria

- The workflow runs to completion on the test-profile sample sheet and data (source asserts `workflow.success`, tests/default.nf.test:21).
- The sample with repeated runs is processed as one sample built from all of its runs; the other sample passes through unmerged. Two samples reach assembly.
- Each sample gets raw and trimmed read QC, a trimming report, an assembly, BUSCO completeness against `bacteria_odb10`, and a Prokka annotation.
- One QUAST report covers both assemblies, and one aggregate MultiQC report includes FastQC (raw and trimmed), fastp, QUAST, BUSCO and Prokka results.
- Source checks for reference only: the nf-test snapshots the succeeded-task count, the versions file, output names and stable-content md5s (tests/default.nf.test:22-31), including md5s of the Unicycler scaffolds and graphs (tests/default.nf.test.snap:334-337). BUSCO outputs are excluded from content checks (`busco/**`, tests/.nftignore:20). Whether to match those md5s is an open question below.

### Open questions

- Must final results match the source snapshot's content checksums (e.g. Unicycler scaffold md5s)?
  - Proposed: no. Require the scientific outputs listed under Acceptance criteria for both samples; do not require byte-identical outputs or the source's tool versions.
  - Evidence: the caller asks for an "equivalent" workflow without naming fidelity criteria. The source pins Unicycler 0.5.1, fastp 0.24.0, BUSCO 5.8.3, Prokka 1.14.6, QUAST 5.2.0 in its snapshot (tests/default.nf.test.snap:6-31), and assembler output depends on the tool version.
  - Confidence: low
  - Missing: the expert's tolerance for differences in assembly and QC results.
- How much of the bacass-specific MultiQC presentation must the aggregate report reproduce?
  - Proposed: aggregate the same tool results (FastQC raw and trimmed, fastp, QUAST, BUSCO, Prokka). Distinguishing raw from trimmed FastQC sections is wanted; bacass-specific extras (workflow summary, methods description, software-versions section, custom assembly-metrics table) are not required.
  - Evidence: the source config separates raw and trimmed FastQC and fastp by path filter (assets/multiqc_config.yml:9-27). CUSTOM_MULTIQC also receives the workflow summary, methods description and collated versions (workflows/bacass.nf:660-666) and runs a bacass helper script between two MultiQC passes (modules/local/custom/multiqc/main.nf:43-59). Whether the custom assembly-metrics table survives under the test profile was not verified.
  - Confidence: low
  - Missing: the expert's view on report fidelity.
- How should the BUSCO lineage `bacteria_odb10` be made available?
  - Proposed: provide `bacteria_odb10` as pre-installed reference data before testing, rather than downloading at run time.
  - Evidence: the source downloads the lineage at runtime (nextflow.config:43; modules/nf-core/busco/busco/main.nf:52; tests/default.nf.test.snap:146). Caller-supplied evidence: the Galaxy BUSCO wrapper is offline-only and reads lineages from the `busco_database` data table. The environment probe found no BUSCO lineage data (Agent Environment).
  - Confidence: medium
  - Missing: whether the build agent may install reference data, and which lineage dataset version is acceptable (source lineage is named only `bacteria_odb10`).
- Should the workflow accept single-end short reads too?
  - Proposed: no; support paired-end short reads as the test profile exercises.
  - Evidence: the source handles both single- and paired-end (workflows/bacass.nf:122-126; subworkflows/local/utils_nfcore_bacass_pipeline/main.nf:86-90), but the caller limits scope to what the test profile runs, and the test data are paired-end (tests/default.nf.test.snap:342).
  - Confidence: medium
- Should Prokka run with the test profile's `--fast` option?
  - Proposed: yes.
  - Evidence: the caller scopes the conversion to the test profile, which sets `prokka_args = " --fast"` under the comment "some extra args to speed tests up" (conf/test.config:28-29). The pipeline default is `prokka_args = ""` (nextflow.config:49).
  - Confidence: medium
- Should the fastp step reproduce the source's effective behaviour despite the misaligned call arguments?
  - Proposed: yes; trim with no adapter FASTA, without saving failed reads, without merging pairs, and without discarding passing reads, which is what the test profile effectively runs.
  - Evidence: the misalignment (workflows/bacass.nf:176-184 vs subworkflows/nf-core/fastq_trim_fastp_fastqc/main.nf:23-30) only swaps falsy values under the test profile (nextflow.config:18, 62).
  - Confidence: high
- Should MultiQC be unconditional?
  - Proposed: yes; the aggregate report is always produced.
  - Evidence: caller includes MultiQC; the source never reads `skip_multiqc` (nextflow.config:69; workflows/bacass.nf:660-681).
  - Confidence: high
- Should QUAST produce one report across all samples rather than one per sample?
  - Proposed: one combined report, as the source does.
  - Evidence: workflows/bacass.nf:504-515.
  - Confidence: high

### Decisions

- Caller: the scope is the default test-profile path; long-read, hybrid, other assemblers and annotators, and the tools the test profile skips are out.
- Caller: run merging of the duplicate sample ID is in scope.
- Source fact (fetched sheet `bacass_short_reseq.tsv`, nf-core/test-datasets branch `bacass`, 2026-10-29): ERR044595 has two runs (`ERR044595_1M_*`, `r-ERR044595_1M_*`), ERR064912 one; all three rows are paired-end with GenomeSize `2.8m`. The test uses the sheet as published.
- Caller: BUSCO, Prokka and MultiQC are in.
- Caller: no expert-provided Galaxy requirements; the terminal artifact of this run is the brief.

### Related artifacts

- `summary-nextflow.json`: phase-1 source summary (process topology, containers, parameters, sample-sheet schema, test candidates, warnings).
- `phase1-notes.md`: phase-1 source-verified notes for the test-profile scope.
- `caller-request.md`: caller objective and expert intent.
- `environment-probes.txt`: environment probes used below.

## Agent Environment

Observed from probes taken 2026-10-29T20:26:21Z on the brief-production host (`environment-probes.txt`). The caller supplied no required tool versions. A separate preflight is still needed on the build host.

### Tooling

- `gxwf`: not on PATH; worktree copy present, version 1.15.0.
- `foundry`: not on PATH; per-run shim to the worktree build present, `foundry --help` exit 0. Its `validate-workflow-brief` accepted schema sha256 `8e65acb789057c59f2fe3a2e7920682ad272a82e0caa92de69b62cc56d5036e0`.
- `planemo`: not on PATH; `uvx --from planemo==0.75.47` reports `planemo, version 0.75.47`.
- `summarize-nextflow`: not on PATH; per-run shim present, `--help` exit 0.
- `node`: v26.13.0. `uvx`: present.
- `nextflow`, `nf-test`, `java`: not on PATH.
- `conda`, `mamba`: not on PATH.
- `galaxy-tool-cache`: not on PATH.

### Constraints

- Host: Linux x86_64, 4 CPUs, MemTotal 15333296 kB (MemAvailable 9229708 kB at probe time), swap 16777212 kB, root filesystem 496G with 440G available.
- Another driver's Galaxy server and `planemo test` run were active on the host at probe time.
- Brief production ran under no-install, no-container-pull, no-download rules (caller). Network access and install permissions for the build agent: not stated (unknown).
- BUSCO lineage data: a search for BUSCO lineage data and Galaxy data tables returned nothing (the brief-production probe's search covered `~/.planemo`).

### Containerization

- Container preference: none stated by the caller.
- Docker: version probe reports 29.1.3 linux/amd64, 4 CPUs, ~15.7 GB memory, overlayfs storage driver. `hello-world` ran with pull disabled.
- Cached biocontainers matching source tools: fastp 1.4.0, multiqc 1.33, fastqc 0.12.1, coreutils 9.11/8.31/8.25 (37 cached images in total). The match list contained no Unicycler, QUAST, BUSCO or Prokka images.
- Singularity, Apptainer, Podman: not on PATH.
