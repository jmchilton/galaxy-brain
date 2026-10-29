# nf-core/demo read QC and trimming

## Workflow

Convert the nf-core/demo pipeline, as run with default parameters, into an equivalent Galaxy workflow. This brief records source evidence and caller intent only. It makes no Galaxy design choices.

### Objective

Reproduce the scientific behavior of nf-core/demo 1.1.0's default run. The pipeline takes a sample sheet of short-read FASTQ files, single- or paired-end, and runs three analyses. It produces per-sample read-quality reports (FastQC), quality-trimmed reads (seqtk trimfq), and one aggregated QC report (MultiQC) across all samples.

### Sources

- Source pipeline: nf-core/demo, https://github.com/nf-core/demo, tag `1.1.0`, commit `45904cb9d12db3d89900e6c479fe604ef71b297b`. MIT license. The summary's `source.version` records only the commit SHA. The tag comes from the caller.
- Caller instructions: `caller-request.md` in the run directory. They give the objective and the whole-pipeline scope, and they supply no Galaxy requirements.
- Structured source evidence: `summary-nextflow.json`, produced by `summarize-nextflow` in static mode and refined in an LLM pass.
- Source configuration read directly at the pinned commit: `conf/modules.config` (publish patterns and `ext.args`), `assets/multiqc_config.yml`, `workflows/demo.nf`. Where these disagree with the summary, this brief states the source value.
- Source tools named in the evidence: FastQC 0.12.1, seqtk 1.4 (the test snapshot reports `1.4-r122`), and MultiQC 1.33. These are evidence of what the source runs. They do not choose Galaxy tools.

### Scope

#### Included

- All three processes that the default run executes: FASTQC, SEQTK_TRIM and MULTIQC.
- FASTQC runs on the raw input reads of each sample.
- SEQTK_TRIM quality-trims the raw input reads of each sample. The step is guarded by `!params.skip_trim`, and `nextflow.config` line 28 sets `skip_trim = false`, so it runs by default. The summary's `params[].default` for `skip_trim` is null because of a static-parse defect, and the summary's `warnings[]` records the effective default.
- MULTIQC aggregates the FastQC results into a single report.

#### Excluded

- The caller excluded nothing.
- Nextflow and nf-core infrastructure that does no scientific analysis falls outside the scientific scope. This covers sample-sheet validation plugins, parameter help and summary, completion email and notifications, iGenomes reference configuration, and execution and container profiles. See the open question on the software-versions report.
- MultiQC report sections built by nf-core utilities on every run: the parameter summary (`workflow_summary_mqc.yaml`) and the templated methods description (`methods_description_mqc.yaml`, from `assets/methods_description_template.yml` when `params.multiqc_methods_description` is null), `workflows/demo.nf:88-104`. The bundled config's `report_comment`, `report_section_order` and `disable_version_detection` are cosmetic. All are infrastructure under the item above.
- Reference genome inputs (`genome`, `fasta`). They are declared in the parameter schema but no process uses them.

### Inputs and outputs

- Input: a set of sequencing samples. Each sample has an ID and gzipped FASTQ reads, either single-end or paired-end. The source sample sheet is a CSV with the columns `sample` (required, no whitespace, `^\S+$`), `fastq_1` (required, `.fq.gz` or `.fastq.gz`) and `fastq_2` (optional; its presence makes the row paired-end), per `assets/schema_input.json`. `sample` is the only metadata column. Several sheet rows can share one sample ID. The test data has a single-end sample split across two rows.
- The source groups sheet rows by sample ID (`subworkflows/local/utils_nfcore_demo_pipeline/main.nf:103-120`, `groupTuple`) and then flattens the files again. FASTQC and SEQTK_TRIM process each file separately (`modules/nf-core/seqtk/trim/main.nf:24-30` loops over the files) and nothing is concatenated, so grouping affects only output naming. No step is pair-aware.
- Source input rule: all rows of one sample must share endedness. `validateInputSamplesheet` (`subworkflows/local/utils_nfcore_demo_pipeline/main.nf:190-199`) stops the run when a sample mixes single- and paired-end rows. The test data never violates it. See the open question on enforcing it.
- Optional inputs to MultiQC in the source: a custom config, a logo, a methods-description YAML, and a report title. None of them is set by default or in the test profile. `conf/modules.config:39` adds `--title` only when `params.multiqc_title` is set.
- Output: per-read-file FastQC HTML reports. Each report must carry a name distinct per read file: the source renames FastQC inputs to `<sample>_<index>` when a sample has several files (`modules/nf-core/fastqc/main.nf:25`), and MultiQC keys its rows on those names, so without distinct names the reports of a sample's read files would collapse into one MultiQC row. `conf/modules.config:21-28` publishes FASTQC `*.{html,json}` only; the FastQC zip is not published and serves only as MultiQC's input.
- Output: per-sample quality-trimmed reads, gzipped FASTQ. In the source these are a published terminal output, and no downstream analysis consumes them.
- Output: an aggregated MultiQC report (HTML) with its data and plots. In the source, MultiQC receives the FastQC results of the raw reads and not those of the trimmed reads. `workflows/demo.nf:78` always passes the bundled `assets/multiqc_config.yml`, which sets `export_plots: true`, so the default run publishes static plot images (`multiqc_plots/{pdf,png,svg}` in the test snapshot).

### Requirements and preferences

- Caller requirement (strong): match the default-run behavior of the whole source pipeline.
- Caller statement: there are no expert-provided Galaxy requirements.
- Source behavior to preserve: trimming and QC run independently on the raw reads, and the aggregated report covers QC of the raw reads.
- Source tool arguments (`conf/modules.config` at the pinned commit): FASTQC `ext.args = '--quiet'` (logging only); SEQTK_TRIM has no `ext.args` (seqtk trimfq defaults); MULTIQC has none by default.
- Tool evidence from builds v0 and v1 (not a design choice): Tool Shed wrappers exist that run the source's FastQC 0.12.1 and seqtk 1.4; a MultiQC 1.33 wrapper also exists beside newer ones. The FastQC wrapper always passes `--quiet`, the source's only FastQC argument. The seqtk trimfq wrapper's default quality mode equals seqtk 1.4's trimfq defaults (error threshold 0.05, minimum length 30, `seqtk.c`). The MultiQC 1.33 wrapper exposes the HTML report, the general-stats table, the plot data tables and, optionally, PNG plots; it has no output for the whole `multiqc_data` directory.

### Acceptance criteria

- Given the source test data (the samples in the `test` profile sample sheet), the workflow produces FastQC reports for every input read file, trimmed reads for every input read file, and one MultiQC report covering all samples.
- The workflow handles both single-end and paired-end samples in one run, as the source test data does.
- Outputs agree scientifically with the source test run. Detailed fixtures and assertions are left to test development.
- Byte-level comparison with the source snapshot is not expected where the source's naming or compression cannot be reproduced. The source gzips trimmed reads with `gzip --no-name` (`modules/nf-core/seqtk/trim/main.nf`), so compare trimmed reads by decompressed content. MultiQC sample names in the source come from FastQC file renames (`SAMPLE1_PE_1`, `SAMPLE3_SE_2`), so compare MultiQC data by content (one row per read file, per-file total sequences).
- Test-data fact: the test sheet's two `SAMPLE3_SE` rows reuse the R1 files of `SAMPLE1_PE` and `SAMPLE2_PE` (27721 and 21481 reads), so 6 read files come from 4 unique files and their per-file results must match pairwise.
- Test-data facts observed in build v1 (seqtk 1.4 trimfq defaults, FastQC 0.12.1): trimming keeps every read (trimmed files hold 27721 and 21481 reads, the input counts), and FastQC reports sequence length 35-301 for `sample1_R1`.

### Open questions

- Should the software-versions report (nf-core `versions.yml`, included in MultiQC) be reproduced?
  - Proposed: no. Treat it as pipeline infrastructure and leave it out.
  - Evidence: it is collated from the Nextflow `versions` topic by an nf-core utility (`workflows/demo.nf:65-75`) and mixed into MultiQC (`:98`); it is not a scientific analysis. The bundled MultiQC config also sets `disable_version_detection: true`. Builds v0 and v1 left it out and both tests stayed green.
  - Confidence: low
  - Missing: whether the expert wants software provenance inside the aggregated report.
- Should the source's optional switches be exposed, such as skipping trimming or supplying a custom MultiQC config, logo, title or methods description?
  - Proposed: no. Always run trimming, as the default does, and do not expose the MultiQC customizations.
  - Evidence: the caller scoped the work to the default run with no skip flags. `nextflow.config:21-28` sets these to null or false. The default run does use the bundled MultiQC config and the templated methods text (see Excluded and Inputs and outputs), but neither is a user switch.
  - Confidence: medium
- Must the aggregated report's plots be delivered as images, as the source's `export_plots: true` produces, or are the plot data tables enough?
  - Proposed: images are not required; the HTML report carries the plots, and the plot data tables carry their values.
  - Evidence: the source snapshot lists `multiqc_plots/{pdf,png,svg}`. Build v0 delivered the plot data tables unasserted; build v1 delivered them as an output and asserted a sample name in the sequence-counts table. A MultiQC 1.33 wrapper can also emit PNG plots, so images remain feasible if wanted.
  - Confidence: low
  - Missing: whether the expert uses the static plot images.
- Must the workflow reject a sample that mixes single- and paired-end rows, as the source does?
  - Proposed: no. State the rule as a precondition on the samples input and do not enforce it.
  - Evidence: `validateInputSamplesheet` (`subworkflows/local/utils_nfcore_demo_pipeline/main.nf:190-199`) errors on mixed endedness within a sample. The test data never violates it, so no test can exercise the rule. Build v1 documented it as an input precondition and surrendered enforcement.
  - Confidence: medium
  - Missing: whether the expert wants the run to fail on such input rather than process each file as given.

### Decisions

- Multiple sample-sheet rows sharing a sample ID are not merged; each read file stays a separate item under its sample. The source groups rows but never concatenates them (`main.nf:103-120`; FASTQC and SEQTK_TRIM run per file). Proven in build v0 (green test). Was an open question (low) at v0.
- Quality trimming uses the seqtk trimfq defaults: `conf/modules.config:31-37` sets no SEQTK_TRIM `ext.args`. Was an open question (low) at v0.
- The trimmed reads are a workflow output: the source publishes them under `fq/` and the default test snapshot asserts them. Proven in build v0. Was an open question (medium) at v0.
- MultiQC reports on raw-read FastQC only, as the source does (`FASTQC.out.zip` alone feeds the MultiQC files). Proven in build v0. Was an open question (medium) at v0.

### Related artifacts

- `summary-nextflow.json`: the process inventory, the source container references, parameters, the sample-sheet schema, profiles and test candidates. The selected test is `tests/default.nf.test::-profile test`, and its snapshot is `tests/default.nf.test.snap`.
- `caller-request.md`: the caller's objective and selected scope.
- Test data: the `test` profile sheet is nf-core/test-datasets viralrecon `samplesheet_test_illumina_amplicon.csv` (rows `SAMPLE1_PE`, `SAMPLE2_PE`, and `SAMPLE3_SE` twice); its four FASTQ URLs returned HTTP 200 on 2026-10-25, Phred+33.
- Test-data files live on the mutable `viralrecon` branch of nf-core/test-datasets (`https://raw.githubusercontent.com/nf-core/test-datasets/viralrecon/illumina/amplicon/`). SHA-1 on 2026-10-29: `sample1_R1.fastq.gz` `eaf6537837437b69412285bf1a2a542f571e9336`, `sample1_R2.fastq.gz` `cbb92e7ed652d5b4008c588b318a6a12a3f0bfd5`, `sample2_R1.fastq.gz` `7b090121cfa3caa51d9051d01e5f8e7bd2babb5d`, `sample2_R2.fastq.gz` `56e48ae352b0dcbe2297fd8831ba506c19435cdc`. A changed hash means the branch moved.
- Build v0 run: `~/foundry-runs/prose-wb2g-demo-v0-2026-10-25/` (planemo green, ledger `open-requirements.ledger.yml`).
- Build v1 run: `~/foundry-runs/prose-wb2g-demo-v1-2026-10-29/` (planemo green on the first attempt, ledger `open-requirements.ledger.yml`).

### Blockers

## Agent Environment

These are observed facts from the environment preflight of build v1 on the agent machine, dated 2026-10-29, unless marked as requirements or unknowns.

### Tooling

- Host: Linux x86_64, 4 CPUs, 14 GiB RAM with no swap, about 486 GiB free disk. Other pipeline runs may share the host.
- `gxwf` and `galaxy-tool-cache`: not on PATH globally; run from the Foundry worktree's `node_modules/.bin` (`@galaxy-tool-util/cli` 1.15.0). `gxwf --version` reports 1.15.0.
- `foundry`: not on PATH globally. A worktree build of `@galaxy-foundry/gxwf-foundry` 0.3.0 runs through a node shim (node v26.13.0). It has no `--version` flag, so the version comes from the package metadata.
- `planemo`: not on PATH; 0.75.47 runs through `uvx --from planemo==0.75.47`. Its managed Galaxy from `--galaxy_branch release_26.1` (26.1.3.dev0) ran the workflow test green; the Galaxy venv under `~/.planemo` is reused between runs.
- Run-local shims for `foundry`, `gxwf`, `galaxy-tool-cache` and `planemo` go on PATH for every phase.
- Nextflow, nf-test, a Java runtime and conda are absent, so the source pipeline cannot be re-run locally for comparison.
- Required versions for downstream phases: Galaxy no older than `release_26.1` (orchestrator constraint for builds). Otherwise unknown; the caller stated none.

### Constraints

- Brief production pulls no containers and downloads no data. Workflow builds may fetch the source test data and pull the containers the workflow test needs.
- Install nothing as part of brief production.
- The IWC corpus has no shared mirror on this host; a build that compares against IWC builds it locally first (`make fixtures-iwc fixtures-skeletons`, about a minute).

### Containerization

- Docker 29.1.3, native amd64, is usable: `docker run --rm --pull=never hello-world` succeeded. The biocontainers run without emulation; build v1's 13 test jobs took 141 s in total and the whole planemo test 9 min including Galaxy start and tool installs.
- Singularity and Apptainer are absent.
- Container preference: none stated by the caller. The source declares biocontainers (Docker) and Galaxy depot Singularity images, plus a Wave image for MultiQC. These source references are evidence, not choices.
- Dated note (2026-10-25, previous host): on a macOS aarch64 host the amd64 biocontainers ran under emulation and the build v0 test took about 65 minutes.

### Blockers
