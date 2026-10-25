# nf-core/demo read QC and trimming

## Workflow

Convert the nf-core/demo pipeline, as run with default parameters, into an equivalent Galaxy workflow. This brief records source evidence and caller intent only. It makes no Galaxy design choices.

### Objective

Reproduce the scientific behavior of nf-core/demo 1.1.0's default run. The pipeline takes a sample sheet of short-read FASTQ files, single- or paired-end, and runs three analyses. It produces per-sample read-quality reports (FastQC), quality-trimmed reads (seqtk trimfq), and one aggregated QC report (MultiQC) across all samples.

### Sources

- Source pipeline: nf-core/demo, https://github.com/nf-core/demo, tag `1.1.0`, commit `45904cb9d12db3d89900e6c479fe604ef71b297b`. MIT license. The summary's `source.version` records only the commit SHA. The tag comes from the caller.
- Caller instructions: `caller-request.md` in the run directory. They give the objective and the whole-pipeline scope, and they supply no Galaxy requirements.
- Structured source evidence: `summary-nextflow.json`, produced by `summarize-nextflow` in static mode and refined in an LLM pass.
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
- Reference genome inputs (`genome`, `fasta`). They are declared in the parameter schema but no process uses them.

### Inputs and outputs

- Input: a set of sequencing samples. Each sample has an ID and gzipped FASTQ reads, either single-end or paired-end. The source sample sheet is a CSV with the columns `sample` (required), `fastq_1` (required, `.fq.gz` or `.fastq.gz`) and `fastq_2` (optional). Several sheet rows can share one sample ID. The test data has a single-end sample split across two rows.
- Optional inputs to MultiQC in the source: a custom config, a logo, a methods-description YAML, and a report title. None of them is set by default or in the test profile.
- Output: per-sample FastQC reports, one for each read file (HTML report and zipped data).
- Output: per-sample quality-trimmed reads, gzipped FASTQ. In the source these are a published terminal output, and no downstream analysis consumes them.
- Output: an aggregated MultiQC report (HTML) with its data and plots. In the source, MultiQC receives the FastQC results of the raw reads and not those of the trimmed reads.

### Requirements and preferences

- Caller requirement (strong): match the default-run behavior of the whole source pipeline.
- Caller statement: there are no expert-provided Galaxy requirements.
- Source behavior to preserve: trimming and QC run independently on the raw reads, and the aggregated report covers QC of the raw reads.

### Acceptance criteria

- Given the source test data (the samples in the `test` profile sample sheet), the workflow produces FastQC reports for every input read file, trimmed reads for every input read file, and one MultiQC report covering all samples.
- The workflow handles both single-end and paired-end samples in one run, as the source test data does.
- Outputs agree scientifically with the source test run. Detailed fixtures and assertions are left to test development.

### Open questions

- Should multiple sample-sheet rows that share a sample ID be merged before QC and trimming?
  - Proposed: no. Keep each read file separate under its sample, as the source does.
  - Evidence: the source test snapshot lists separate FastQC reports and trimmed files for each row of `SAMPLE3_SE` (`SAMPLE3_SE_sample1_R1`, `SAMPLE3_SE_sample2_R1`) and does not concatenate them.
  - Confidence: low
  - Missing: the expert's own data layout, and whether each run file must stay a separate item.
- Should the software-versions report (nf-core `versions.yml`, included in MultiQC) be reproduced?
  - Proposed: no. Treat it as pipeline infrastructure and leave it out.
  - Evidence: it is collated from the Nextflow `versions` topic by an nf-core utility and is not a scientific analysis. The summary marks this edge low confidence.
  - Confidence: low
  - Missing: whether the expert wants software provenance inside the aggregated report.
- Should the trimmed reads be a workflow output even though no downstream step consumes them?
  - Proposed: yes. Keep them as an output.
  - Evidence: the source publishes them under `fq/`, and the default test snapshot asserts them. The caller asks for equivalence with the whole pipeline.
  - Confidence: medium
- Should MultiQC also report on the trimmed reads?
  - Proposed: no. Report on raw-read FastQC only, as the source does.
  - Evidence: the summary's edges feed only `FASTQC.out.zip` into the MultiQC files. SEQTK_TRIM reaches MultiQC only through the versions topic.
  - Confidence: medium
- Should the source's optional switches be exposed, such as skipping trimming or supplying a custom MultiQC config, logo or methods description?
  - Proposed: no. Always run trimming, as the default does, and do not expose the MultiQC customizations. The default run uses none of them.
  - Evidence: the caller scoped the work to the default run with no skip flags. The parameter schema marks these parameters optional with no default.
  - Confidence: medium
- Which quality-trimming settings should be used?
  - Proposed: the seqtk trimfq defaults the source uses. The summary records no extra arguments for SEQTK_TRIM.
  - Evidence: the SEQTK_TRIM `script_summary` says only that seqtk trimfq runs. The summary does not capture any `ext.args` from `conf/modules.config`.
  - Confidence: low
  - Missing: confirmation from `conf/modules.config` at the pinned commit that SEQTK_TRIM has no `ext.args`.

### Related artifacts

- `summary-nextflow.json`: the process inventory, the source container references, parameters, the sample-sheet schema, profiles and test candidates. The selected test is `tests/default.nf.test::-profile test`, and its snapshot is `tests/default.nf.test.snap`.
- `caller-request.md`: the caller's objective and selected scope.

### Blockers

## Agent Environment

These are observed facts from orchestrator probes on the agent machine, dated 2026-10-25, unless marked as requirements or unknowns.

### Tooling

- `gxwf`: 1.0.0 observed at `/opt/homebrew/bin/gxwf`.
- `planemo`: 0.75.44 observed.
- `foundry`: not on PATH globally. A local worktree build of `@galaxy-foundry/gxwf-foundry` 0.3.0 is available through a shim. It has no `--version` flag, so the version comes from the package metadata.
- Nextflow, nf-test and a Java runtime are absent, so the source pipeline cannot be re-run locally for comparison.
- Required versions for downstream phases: unknown. The caller stated none.

### Constraints

- During this run, pull no containers and download no data. The source test data, which comes from nf-core/test-datasets URLs, has not been fetched.
- Install nothing as part of brief production.
- About 14 GiB of disk was free, with other runs active.

### Containerization

- Docker Desktop 29.8.2 (aarch64) is usable: `docker run --rm --pull=never hello-world` succeeded. No images were pulled.
- Singularity and Apptainer are absent.
- Container preference: none stated by the caller. The source declares biocontainers (Docker) and Galaxy depot Singularity images, plus a Wave image for MultiQC. These source references are evidence, not choices.
- The host is aarch64, while the source containers are commonly amd64. Whether they run here is unknown. The source declares `arm64` and `emulate_amd64` profiles.

### Blockers
