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
- MultiQC report sections built by nf-core utilities on every run: the parameter summary (`workflow_summary_mqc.yaml`) and the templated methods description (`methods_description_mqc.yaml`, from `assets/methods_description_template.yml` when `params.multiqc_methods_description` is null), `workflows/demo.nf:88-104`. The bundled config's `report_comment` and `report_section_order` are cosmetic. All are infrastructure under the item above.
- Reference genome inputs (`genome`, `fasta`). They are declared in the parameter schema but no process uses them.

### Inputs and outputs

- Input: a set of sequencing samples. Each sample has an ID and gzipped FASTQ reads, either single-end or paired-end. The source sample sheet is a CSV with the columns `sample` (required), `fastq_1` (required, `.fq.gz` or `.fastq.gz`) and `fastq_2` (optional). Several sheet rows can share one sample ID. The test data has a single-end sample split across two rows.
- The source groups sheet rows by sample ID (`subworkflows/local/utils_nfcore_demo_pipeline/main.nf:103-120`, `groupTuple`) and then flattens the files again. FASTQC and SEQTK_TRIM process each file separately and nothing is concatenated, so grouping affects only output naming.
- Optional inputs to MultiQC in the source: a custom config, a logo, a methods-description YAML, and a report title. None of them is set by default or in the test profile. `conf/modules.config:39` adds `--title` only when `params.multiqc_title` is set.
- Output: per-read-file FastQC HTML reports. `conf/modules.config:21-28` publishes FASTQC `*.{html,json}` only; the FastQC zip is not published and serves only as MultiQC's input.
- Output: per-sample quality-trimmed reads, gzipped FASTQ. In the source these are a published terminal output, and no downstream analysis consumes them.
- Output: an aggregated MultiQC report (HTML) with its data and plots. In the source, MultiQC receives the FastQC results of the raw reads and not those of the trimmed reads. `workflows/demo.nf:78` always passes the bundled `assets/multiqc_config.yml`, which sets `export_plots: true`, so the default run publishes static plot images (`multiqc_plots/{pdf,png,svg}` in the test snapshot).

### Requirements and preferences

- Caller requirement (strong): match the default-run behavior of the whole source pipeline.
- Caller statement: there are no expert-provided Galaxy requirements.
- Source behavior to preserve: trimming and QC run independently on the raw reads, and the aggregated report covers QC of the raw reads.
- Source tool arguments (`conf/modules.config` at the pinned commit): FASTQC `ext.args = '--quiet'` (logging only); SEQTK_TRIM has no `ext.args` (seqtk trimfq defaults); MULTIQC has none by default.
- Tool evidence from build v0 (not a design choice): Tool Shed wrappers exist that run the source's FastQC 0.12.1 and seqtk 1.4; a MultiQC 1.33 wrapper also exists beside newer ones.

### Acceptance criteria

- Given the source test data (the samples in the `test` profile sample sheet), the workflow produces FastQC reports for every input read file, trimmed reads for every input read file, and one MultiQC report covering all samples.
- The workflow handles both single-end and paired-end samples in one run, as the source test data does.
- Outputs agree scientifically with the source test run. Detailed fixtures and assertions are left to test development.
- Byte-level comparison with the source snapshot is not expected where the source's naming or compression cannot be reproduced. The source gzips trimmed reads with `gzip --no-name` (`modules/nf-core/seqtk/trim/main.nf`), so compare trimmed reads by decompressed content. MultiQC sample names in the source come from FastQC file renames (`SAMPLE1_PE_1`, `SAMPLE3_SE_2`), so compare MultiQC data by content (one row per read file, per-file total sequences).
- Test-data fact: the test sheet's two `SAMPLE3_SE` rows reuse the R1 files of `SAMPLE1_PE` and `SAMPLE2_PE` (27721 and 21481 reads), so 6 read files come from 4 unique files and their per-file results must match pairwise.

### Open questions

- Should the software-versions report (nf-core `versions.yml`, included in MultiQC) be reproduced?
  - Proposed: no. Treat it as pipeline infrastructure and leave it out.
  - Evidence: it is collated from the Nextflow `versions` topic by an nf-core utility (`workflows/demo.nf:65-75`) and mixed into MultiQC (`:98`); it is not a scientific analysis. Build v0 left it out and the test stayed green.
  - Confidence: low
  - Missing: whether the expert wants software provenance inside the aggregated report.
- Should the source's optional switches be exposed, such as skipping trimming or supplying a custom MultiQC config, logo, title or methods description?
  - Proposed: no. Always run trimming, as the default does, and do not expose the MultiQC customizations.
  - Evidence: the caller scoped the work to the default run with no skip flags. `nextflow.config:21-28` sets these to null or false. The default run does use the bundled MultiQC config and the templated methods text (see Excluded and Inputs and outputs), but neither is a user switch.
  - Confidence: medium
- Must the aggregated report's plots be delivered as images, as the source's `export_plots: true` produces, or are the plot data tables enough?
  - Proposed: images are not required; the HTML report carries the plots, and the plot data tables carry their values.
  - Evidence: build v0 delivered plot data tables and left them unasserted; the source snapshot lists `multiqc_plots/{pdf,png,svg}`.
  - Confidence: low
  - Missing: whether the expert uses the static plot images.

### Decisions

- Multiple sample-sheet rows sharing a sample ID are not merged; each read file stays a separate item under its sample. The source groups rows but never concatenates them (`main.nf:103-120`; FASTQC and SEQTK_TRIM run per file). Proven in build v0 (green test). Was an open question (low) at v0.
- Quality trimming uses the seqtk trimfq defaults: `conf/modules.config:31-37` sets no SEQTK_TRIM `ext.args`. Was an open question (low) at v0.
- The trimmed reads are a workflow output: the source publishes them under `fq/` and the default test snapshot asserts them. Proven in build v0. Was an open question (medium) at v0.
- MultiQC reports on raw-read FastQC only, as the source does (`FASTQC.out.zip` alone feeds the MultiQC files). Proven in build v0. Was an open question (medium) at v0.

### Related artifacts

- `summary-nextflow.json`: the process inventory, the source container references, parameters, the sample-sheet schema, profiles and test candidates. The selected test is `tests/default.nf.test::-profile test`, and its snapshot is `tests/default.nf.test.snap`.
- `caller-request.md`: the caller's objective and selected scope.
- Test data: the `test` profile sheet is nf-core/test-datasets viralrecon `samplesheet_test_illumina_amplicon.csv` (rows `SAMPLE1_PE`, `SAMPLE2_PE`, and `SAMPLE3_SE` twice); its four FASTQ URLs returned HTTP 200 on 2026-10-25, Phred+33.
- Build v0 run: `~/foundry-runs/prose-wb2g-demo-v0-2026-10-25/` (planemo green, ledger `open-requirements.ledger.yml`).

### Blockers

## Agent Environment

These are observed facts from orchestrator probes on the agent machine, dated 2026-10-25, unless marked as requirements or unknowns.

### Tooling

- `gxwf`: on PATH at `/opt/homebrew/bin/gxwf`; `--version` prints 1.0.0 though the CLI package is 1.14.0.
- `planemo`: 0.75.44 installed; 0.75.47 runs through `uvx --from planemo==0.75.47` and its managed Galaxy (26.1.2.dev0, a master clone; planemo deletes it at exit) ran the workflow test green.
- `foundry`: not on PATH globally. A local worktree build of `@galaxy-foundry/gxwf-foundry` 0.3.0 is available through a shim. It has no `--version` flag, so the version comes from the package metadata.
- Nextflow, nf-test and a Java runtime are absent, so the source pipeline cannot be re-run locally for comparison.
- Required versions for downstream phases: unknown. The caller stated none.

### Constraints

- Brief production pulls no containers and downloads no data. Workflow builds may fetch the source test data and pull the containers the workflow test needs.
- Install nothing as part of brief production.
- Disk is tight: 13–19 GiB free during the 2026-10-25 runs, with other runs active.

### Containerization

- Docker Desktop 29.8.2 (aarch64) is usable: `docker run --rm --pull=never hello-world` succeeded.
- Singularity and Apptainer are absent.
- Container preference: none stated by the caller. The source declares biocontainers (Docker) and Galaxy depot Singularity images, plus a Wave image for MultiQC. These source references are evidence, not choices.
- The host is aarch64 and the biocontainers are amd64; they run under emulation. The build v0 workflow test took about 65 minutes this way (FastQC jobs 4–11 min each; one image pull stalled 22 min).

### Blockers
