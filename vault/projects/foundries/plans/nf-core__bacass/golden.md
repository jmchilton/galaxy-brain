# nf-core/bacass 2.5.0: whole-pipeline bacterial assembly and annotation

## Workflow

### Objective

John (the expert), quoted from the caller request:

> Convert the whole pipeline to an equivalent Galaxy workflow — all assembly modes (short, long, hybrid), assemblers and annotators, and the optional QC/contamination/species-ID steps.

Scientifically, the source assembles bacterial genomes per sample from short reads, long (Oxford Nanopore) reads, or both. It QCs and trims or filters the reads, assembles them, optionally polishes long-read and hybrid assemblies, screens reads for contamination and species, assesses the assemblies, and annotates them. It then aggregates every report into one summary report. John's objective selects all of this.

John gave no Galaxy requirements beyond the objective, and the terminal artifact of this run is this brief (caller request, John section).

### Sources

- Source: nf-core/bacass 2.5.0, https://github.com/nf-core/bacass, commit `76e4b12cacdc242891ea57e723c5e273f4ac71b4`. The coordinator supplied the pin. The local fixture clone `workflow-fixtures/pipelines/nf-core__bacass` is at that commit (`git rev-parse HEAD`).
- Structured source evidence: `summary-nextflow.json` (phase 1, validated against the summary-nextflow schema). It holds 34 processes, 11 subworkflows, 68 params, 32 conditionals, 10 reference assets and 10 test candidates. Supplementary phase-1 notes are in `phase1-notes.md`.
- Caller request: `caller-request.md`. It separates John's objective from coordinator context.
- Environment evidence: `environment-probes.txt` (probes taken 2026-10-29T20:48:09Z).
- Cites below are `path:N` into the source tree at the pin. Each was checked against a numbered read of that range.

### Scope

#### Included

All scientific work the source can run under some parameter setting, per John's objective:

- **Input handling.** A per-sample sheet with columns ID, R1, R2, LongFastQ, Fast5 and GenomeSize. `NA` is the absent-value sentinel (`workflows/bacass.nf:91-96`). Rows sharing an ID are grouped (`subworkflows/local/utils_nfcore_bacass_pipeline/main.nf:92`), and multiple read files per sample are concatenated (`workflows/bacass.nf:120-167`).
- **Short-read QC and trimming.** FastQC on the raw reads, fastp trimming, then FastQC on the trimmed reads. This runs when `params.assembly_type != 'long'` (`workflows/bacass.nf:175`). Each tool is skippable (`subworkflows/nf-core/fastq_trim_fastp_fastqc/main.nf:39`, `:56`).
- **Long-read QC.** NanoPlot and ToulligQC, each skippable (`subworkflows/local/qc_nanoplot_toulliqc/main.nf:26`, `:43`). pycoQC runs on the Fast5 directories under `!params.skip_pycoqc` (`workflows/bacass.nf:209`).
- **Long-read filtering.** Porechop under `(params.assembly_type == 'hybrid' || params.assembly_type == 'long' && !('short' in params.assembly_type)) && params.long_reads_filtering == 'porechop'` (`workflows/bacass.nf:221`). Filtlong under `!('short' in params.assembly_type) && params.long_reads_filtering == 'filtlong'` (`workflows/bacass.nf:234`); in hybrid mode Filtlong also receives the trimmed short reads (`workflows/bacass.nf:235-236`).
- **Assembly modes.** `short`, `long` and `hybrid` (`workflows/bacass.nf:255-285`).
- **Assemblers.**
  - Unicycler: `params.assembler == 'unicycler'` (`workflows/bacass.nf:295`).
  - Canu, on long reads with `canu_mode` and the per-sample genome size: `params.assembler == 'canu'` (`workflows/bacass.nf:307-311`).
  - miniasm: minimap2 overlaps, then miniasm, then a minimap2 and Racon consensus, under `params.assembly_type != 'short' && params.assembler == 'miniasm'` (`workflows/bacass.nf:320-359`).
  - Dragonflye: `params.assembler == 'dragonflye'` (`workflows/bacass.nf:367`). It takes long reads and optional short reads for polishing (`modules/nf-core/dragonflye/main.nf:11`, `:28`).
- **Polishing.** Runs under `(params.assembly_type == 'long' && !params.skip_polish) || ( params.assembly_type != 'short' && params.polish_method)` (`workflows/bacass.nf:378`).
  - Medaka: `params.polish_method == 'medaka'` (`workflows/bacass.nf:384`).
  - Nanopolish, after minimap2 alignment and BAM indexing, using the Fast5 data: `params.polish_method == 'nanopolish'` (`workflows/bacass.nf:391-427`).
- **Contamination screening and species identification.**
  - Kraken2 on short and long reads against a supplied database, under `!params.skip_kraken2` (`workflows/bacass.nf:439-467`).
  - Kmerfinder species identification on reads against the bacteria database, under `!params.skip_kmerfinder` (`workflows/bacass.nf:476-490`; `subworkflows/local/kmerfinder_summary_download/main.nf:30-34`). It also writes a per-run Kmerfinder summary and fetches the best-matching reference genome for each identified species (`subworkflows/local/kmerfinder_summary_download/main.nf:40-77`).
- **Assembly QC.**
  - QUAST over all assemblies, always run. It is reference-guided by `reference_fasta`/`reference_gff` when `params.skip_kmerfinder` and those are set. Otherwise it runs reference-free, plus a per-reference QUAST against the Kmerfinder-selected references (`workflows/bacass.nf:509-531`).
  - BUSCO completeness under `!params.skip_busco` (`workflows/bacass.nf:546-557`).
- **Annotation.** One tool per run, selected by `annotation_tool` and gated by `!params.skip_annotation`:
  - Prokka, with an optional trusted protein FASTA (`workflows/bacass.nf:563-573`).
  - Bakta, with a supplied, untarred or downloaded database (`workflows/bacass.nf:582-592`; `subworkflows/local/bakta_dbdownload_run/main.nf:22-39`).
  - DFAST, with a config file (`workflows/bacass.nf:600-604`).
  - Liftoff, from a user reference or a Kmerfinder-selected reference (`workflows/bacass.nf:611-635`).
- **Aggregate report.** A MultiQC report over all QC, assembly and annotation logs, which also writes a custom per-sample assembly-metrics table (`workflows/bacass.nf:660-681`; `modules/local/custom/multiqc/main.nf:32-35`).

#### Excluded

Pipeline plumbing that is not scientific work, per the driver's reading of scope in the caller request:

- parameter and schema validation;
- software-version collation (`workflows/bacass.nf:641-647`);
- completion emails and hooks (`main.nf:76-84`);
- the nf-core utility subworkflows (PIPELINE_INITIALISATION, PIPELINE_COMPLETION, UTILS_*);
- institutional config and help options;
- publish-directory modes.

Phase 1 also recorded modules that are present in the source but never run, so they have no scientific role: the nf-core MULTIQC module and SAMTOOLS_SORT (summary `warnings`).

### Inputs and outputs

Inputs, by scientific role (source evidence; no Galaxy representation implied):

- Per-sample reads:
  - paired- or single-end short reads (gzipped FASTQ per the sheet pattern);
  - long ONT reads (gzipped FASTQ);
  - optional ONT Fast5 signal directories;
  - an optional per-sample genome size such as `2.8m`.

  Sample sheet columns and patterns are in the summary's `sample_sheets[input]`, from `assets/schema_input.json`.
- Run-level choices:
  - assembly mode, assembler and long-read filter;
  - polishing method, annotation tool and BUSCO lineage/mode;
  - the skip switches for each optional step.
- Reference data:
  - Kraken2 database: a tar archive of `*.k2d` files (`modules/local/kraken2/db_preparation/main.nf:23-25`);
  - Kmerfinder bacteria database: a directory or `.gz` (`subworkflows/local/kmerfinder_summary_download/main.nf:18-27`);
  - Bakta database (directory, `.tar.gz`, or download);
  - BUSCO lineage dataset, optionally a local path (`workflows/bacass.nf:550-552`);
  - DFAST config;
  - optional reference FASTA/GFF;
  - optional Prokka trusted proteins.

  These are listed in the summary's `reference_assets`.

Outputs, by scientific role:

- per-sample assemblies, polished where polishing applies;
- read QC reports;
- Kraken2 reports;
- Kmerfinder per-sample results, a summary, and the downloaded species references;
- QUAST reports, overall and per reference;
- BUSCO summaries;
- the annotation outputs of the selected annotator;
- the aggregate MultiQC report with its assembly-metrics table.

### Requirements and preferences

- **John.** The converted workflow must cover every assembly mode, assembler, polisher and annotator, and the optional QC, contamination and species-ID steps. It must be "equivalent" to the source. John gave no Galaxy-specific requirements.
- **Coordinator context (evidence for the build, not design).** The coordinator verified that the Galaxy BUSCO wrapper is offline-only and reads lineages from the `busco_database` data table (tools-iuc `tools/busco/busco.xml`, BUSCO 6.1.0). The coordinator also states that Kraken2, Bakta and DFAST similarly use data tables. This brief records these as attributed evidence only. They are not tool-availability claims.
- **Coordinator context.** A separate golden plan covers only the default test-profile path; this brief is the whole-pipeline plan.
- **Source behaviors that bear on equivalence:**
  - The source validates parameters at run time: an assembly mode is required (`subworkflows/local/utils_nfcore_bacass_pipeline/main.nf:186-193`), a Kraken2 DB is required unless Kraken2 is skipped (`:166-172`), and a Kmerfinder DB is required unless Kmerfinder is skipped (`:175-183`).
  - Short reads with miniasm stop the run: `params.assembly_type == 'short' && params.assembler == 'miniasm'` exits (`workflows/bacass.nf:360-361`).
  - Within a sample, multiple runs must share endedness (`subworkflows/local/utils_nfcore_bacass_pipeline/main.nf:202-205`).

### Acceptance criteria

- For each assembly mode, and for each assembler/mode combination the source accepts, the workflow produces per-sample assemblies. The assemblies and their QUAST/BUSCO metrics should be comparable to the source run on the same inputs and reference data.
- Each optional step can be turned off independently: FastQC, fastp, NanoPlot, ToulligQC, pycoQC, Kraken2, Kmerfinder, BUSCO, polishing per the resolved open question, and annotation.
- Each annotator (Prokka, Bakta, DFAST, Liftoff) can be selected and yields annotations of the final assemblies.
- The aggregate report covers whichever QC, assembly and annotation reports were produced.
- Source test candidates are comparison evidence. The summary records nine nf-test cases and a deferred, reference-scale `test_full` profile. No candidate is privileged; detailed fixtures and assertions belong to test development.

### Open questions

- How should Nanopolish polishing be represented? The source wiring cannot run as written.
  - Proposed: include Nanopolish as John's objective requires. Use the intended behavior: align long reads to the draft, index the alignment, and polish with the reads plus the sample's Fast5 signal data. Require Fast5 for samples polished this way, rather than reproducing the source's mis-wired call.
  - Evidence:
    - The NANOPOLISH input is a 7-element tuple `tuple val(meta), val(reads), file(longreads), file(assembly), file(bam), file(bai), file(fast5)` (`modules/local/nanopolish/main.nf:11`). The joined channel built from `ch_polish_long` `[meta, lr, fasta]` plus bam, bai and fast5 has 6 elements (`workflows/bacass.nf:380-383`, `:419-423`).
    - The guard `if (!ch_fast5)` (`workflows/bacass.nf:395`) tests a channel object. Phase 1 records it as always truthy, so the missing-Fast5 error is dead.
    - The source itself notes the path is untested (`workflows/bacass.nf:424`).
    - Phase 1 found no test sheet with Fast5 data.
  - Confidence: low
  - Missing: a working source run or Fast5 test data to define expected outputs, and whether John wants the missing-Fast5 case to be an error, as the source intends.
- Should `skip_polish` disable polishing as documented, or behave as the source code does?
  - Proposed: reproduce the source's effective behavior. Long and hybrid assemblies are polished with the selected method (Medaka by default), and short assemblies are not. Offer one explicit polishing on/off choice, default on, that actually disables polishing for long and hybrid assemblies. That honors the documented intent without changing default outputs.
  - Evidence:
    - The guard is `(params.assembly_type == 'long' && !params.skip_polish) || ( params.assembly_type != 'short' && params.polish_method)` (`workflows/bacass.nf:378`).
    - `polish_method` defaults to `'medaka'` (`nextflow.config:38`), and its schema enum is `["medaka", "nanopolish"]` (`nextflow_schema.json:214`). The second disjunct is therefore true for every long or hybrid run.
    - The schema documents `skip_polish` as "Skip polishing the long-read assembly with fast5 input. Will not affect short/hybrid assemblies." (`nextflow_schema.json:302`).
    - Phase 1 records that the `test_long` candidate sets `skip_polish: true` yet still runs MEDAKA. John asked for an "equivalent" workflow; snapshots reflect the polished output.
  - Confidence: low
  - Missing: whether John wants a working polishing switch at all, or strict reproduction of the source, where it cannot be turned off.
- How should the hybrid/long assembler combinations be bounded?
  - Proposed: support the combinations the source runs:
    - short: Unicycler;
    - long: Unicycler, Canu, miniasm, Dragonflye;
    - hybrid: Unicycler, Dragonflye with short-read polishing, and Canu and miniasm on the long reads only.

    Reject short reads with Canu, miniasm or Dragonflye.
  - Evidence:
    - `params.assembly_type == 'short' && params.assembler == 'miniasm'` exits (`workflows/bacass.nf:360-361`).
    - Canu takes only the long reads (`workflows/bacass.nf:309`).
    - Dragonflye's input is `tuple val(meta), path(shortreads), path(longreads)` and it always passes `--reads ${longreads}` (`modules/nf-core/dragonflye/main.nf:11`, `:31`).
    - `nextflow.config:31` comments "hybrid works only with Unicycler", but the `test_hybrid_dragonflye` candidate runs hybrid Dragonflye.
    - The source has no guard rejecting short reads with Canu or Dragonflye.
  - Confidence: low
  - Missing: test evidence for hybrid Canu, hybrid miniasm, and any Canu run at all (phase 1: no candidate exercises CANU). Also missing: whether John wants those hybrid combinations offered.
- What should `discard_trimmed_pass` mean?
  - Proposed: keep the source's effective behavior. Trimmed reads that pass fastp always feed downstream steps, and the option is not carried as a read-discarding switch, because discarding passing reads would leave assembly without input. The misbinding is recorded as a source defect, not reproduced.
  - Evidence:
    - The call passes `params.discard_trimmed_pass` as the 5th positional argument (`workflows/bacass.nf:181`). The take block's 5th name is `val_save_merged`, and `val_discard_trimmed_pass` is 4th (`subworkflows/nf-core/fastq_trim_fastp_fastqc/main.nf:27-28`). The 4th argument passed is `[]` (`workflows/bacass.nf:180`).
    - The schema describes the option as using "fastp for the output report only" (summary `params[discard_trimmed_pass]`).
  - Confidence: low
  - Missing: whether John wants a report-only fastp mode at all.
- Should the aggregate report be skippable?
  - Proposed: always produce it, as the source does; do not carry `skip_multiqc`.
  - Evidence:
    - `skip_multiqc` is declared (`nextflow.config:69`), but CUSTOM_MULTIQC runs unconditionally (`workflows/bacass.nf:660-681`). Phase 1 found no read of the param.
    - The report's base config depends on `!params.skip_kmerfinder && params.assembly_type` (`workflows/bacass.nf:653`).
- How should the reference databases the source downloads or unpacks at run time be supplied?
  - Proposed: treat the Kraken2, Kmerfinder, Bakta, BUSCO lineage and DFAST databases as pre-provisioned reference data, selected per run rather than downloaded or untarred inside the workflow. Equivalence is judged with matching database versions. Record John's objective as requiring the steps, not the source's download mechanics.
  - Evidence (source):
    - BUSCO downloads the lineage unless a path is given: `busco_lineages_path ? "--download_path ${busco_lineages_path}" : ''` (`modules/nf-core/busco/busco/main.nf:52`).
    - DFAST downloads its protein DB in every run (`modules/local/dfast/main.nf:26-29`).
    - The Bakta DB is untarred or downloaded on demand (`subworkflows/local/bakta_dbdownload_run/main.nf:22-39`).
    - The Kraken2 DB must be a tarball, which is unpacked per run (`modules/local/kraken2/db_preparation/main.nf:23-25`).
    - The Kmerfinder DB is untarred when `.gz` (`subworkflows/local/kmerfinder_summary_download/main.nf:20-27`).
  - Evidence (coordinator context): the Galaxy BUSCO wrapper is offline-only, and BUSCO, Kraken2, Bakta and DFAST use data tables.
  - Evidence (environment probe): no local Galaxy tool-data was found for busco/kraken2/bakta/dfast.
- How should Kmerfinder's per-species reference download, which feeds the per-reference QUAST and optionally Liftoff, be handled?
  - Proposed: keep it in scope as John asked (species-ID). Keep the same scientific behavior: pick the most common Kmerfinder reference per species group and evaluate and optionally annotate against it. Allow the reference to be supplied as data when run-time retrieval from NCBI is not possible.
  - Evidence:
    - The reference is chosen and downloaded from NCBI at run time (`modules/local/kmerfinder/download_reference/main.nf:22-30`).
    - Samples are grouped by top species hit, and "Unknown Species" is dropped (`subworkflows/local/kmerfinder_summary_download/main.nf:47-65`).
    - Phase 1 found that only the deferred `test_full` profile enables Kmerfinder. That profile sets no `assembly_type` (`conf/test_full.config:22-30`), so it would fail validation as written.
  - Confidence: low
  - Missing: whether the build environment can fetch NCBI references at run time, and whether John accepts a user-supplied reference instead.
- What should happen when Liftoff is chosen without a reference?
  - Proposed: treat it as an input error. Liftoff needs a reference FASTA and GFF, either user-supplied or Kmerfinder-selected when Kmerfinder runs and `liftoff_ref_from_kmerfinder` is set.
  - Evidence:
    - The user-reference branch is guarded by `params.skip_kmerfinder || !params.liftoff_ref_from_kmerfinder` (`workflows/bacass.nf:612`).
    - A missing `reference_fasta`/`reference_gff` only logs an error (`workflows/bacass.nf:614-616`) before LIFTOFF is invoked anyway (`:618-623`).
- Is a long-read filter mandatory for long and hybrid runs?
  - Proposed: yes, either Porechop or Filtlong, as in the source; there is no unfiltered path.
  - Evidence:
    - Only the Porechop (`workflows/bacass.nf:221`) and Filtlong (`:234`) branches assign `filtered_long_reads`, which long and hybrid assembly consume (`:257`, `:279-280`).
    - The allowed values are commented as `['porechop', 'filtlong']` (`nextflow.config:19`).
- Which source test candidates should define equivalence, given coverage gaps?
  - Proposed: use the nine nf-test candidates as per-mode comparison evidence, none privileged. Treat the branches with no candidate (Canu, Filtlong, Bakta, Nanopolish, pycoQC, and Kmerfinder with its per-reference QUAST and short-read Kraken2, seen only in `test_full`) as needing new small test inputs during test development.
  - Evidence: phase-1 `test_selection` rationale and `phase1-notes.md` coverage gaps. `conf/test_long_miniasm.config:33` sets a Kraken2 DB, so long-read Kraken2 has one candidate.
  - Confidence: low
  - Missing: John's test-input requirements, small Fast5 and Kmerfinder-capable test data, and whether `test_full` (reference-scale) should ever be run.

### Decisions

- Scope is the whole pipeline: all assembly modes, assemblers, polishers, annotators, and the optional QC, contamination and species-ID steps. Decided by John (objective, caller request).
- No Galaxy requirements beyond the objective; this run ends at the brief. Recorded in the caller request's John section.

### Related artifacts

- `summary-nextflow.json`: processes, channels, edges, conditionals (verbatim guards), params with notes, reference assets, test candidates, and 25 warnings on source quirks.
- `phase1-notes.md`: phase-1 corrections, test-candidate decisions and coverage gaps.
- `caller-request.md`: John's objective and coordinator context.
- `environment-probes.txt`: environment observations.

## Agent Environment

Agent tooling and operating conditions as observed by harmless probes on 2026-10-29T20:48:09Z (`environment-probes.txt`). John stated no environment requirements.

### Tooling

Observed:

- `gxwf`, `planemo` and `foundry` are not on PATH.
- `gxwf` 1.15.0 is at the worktree's `node_modules/.bin/gxwf`.
- `foundry` is a per-run shim to the worktree's `packages/gxwf-foundry/dist`. `foundry --help` exited 0, and its workflow-brief schema pin check exited 0.
- `planemo` is a per-run shim to `uvx --from planemo==0.75.47 planemo`, which reports version 0.75.47.
- `summarize-nextflow` is a run shim; its `--help` exited 0.
- node v26.13.0 and `uvx` are on PATH.
- Not on PATH: `nextflow`, `nf-test`, `java`, `conda`, `mamba`, `galaxy-tool-cache`.

Unknown: the `gxwf` and `foundry` versions required by later stages. No requirement was given.

### Constraints

Observed:

- Linux x86_64, 4 CPUs.
- MemTotal 15333296 kB, MemAvailable 8335700 kB, SwapTotal 16777212 kB.
- 437 GB free on `/`.
- Galaxy data tables / tool-data search for busco, kraken2, bakta and dfast: the probe printed no matches (`(end search)` with nothing before it).
- Process counts: 20 matching `planemo` and 24 matching galaxy/gunicorn. The probe notes these are upper bounds, and another driver's planemo run is known to be active.

Unknown:

- network access to NCBI, Zenodo, the BUSCO lineage server and the DFAST DB server (not probed);
- whether a Galaxy instance with the needed reference data is available.

### Containerization

- No container preference was requested.
- Docker: `/usr/bin/docker`, reporting 29.1.3 linux/amd64, cpus=4, driver overlayfs. A `hello-world` run with `--pull=never` succeeded.
- 37 images are cached locally. Those matching bacass tools are fastp 1.4.0, multiqc 1.33, samtools 1.22 and 1.21, and fastqc 0.12.1 (biocontainers).
- Not on PATH: Singularity, Apptainer, podman.
