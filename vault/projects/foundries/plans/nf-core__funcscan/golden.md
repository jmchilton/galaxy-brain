# nf-core/funcscan 3.0.0 functional screening workflow

## Workflow

### Objective

Convert the whole nf-core/funcscan 3.0.0 pipeline into an equivalent Galaxy workflow. The workflow should screen assembled contigs for functional genes, as the source does: it prepares and annotates contigs, optionally assigns taxonomy and annotates proteins, and then screens for antimicrobial peptides (AMP), antimicrobial resistance genes (ARG) and biosynthetic gene clusters (BGC). Each screen produces its own aggregated summary.

This objective is the caller's. No expert Galaxy requirements were supplied.

### Sources

- Source pipeline: nf-core/funcscan, https://github.com/nf-core/funcscan, tag `3.0.0`, commit `fa9db018e528ffb5149cdde928e2fa24e7c546fe`, MIT licence. A local fixture clone at that commit was used to verify the cited lines.
- Source summary: artifact `summary-nextflow` (`summary-nextflow.json`). This is phase 1 output corrected by the coordinator. Its corrections are listed in its `warnings`.
- Coordinator-reviewed source facts with file:line citations: `phase1-notes.md`.
- Caller request: `caller-request.md`. It gives the objective and the whole-pipeline selection, and records the coordinator's interpretation of that selection.
- Environment evidence: `environment-probes.txt`. These are real, harmless probes, run 2026-10-26.

### Scope

#### Included

The caller selected the whole pipeline. The coordinator recorded the following interpretation: every scientific analysis the source can perform is in scope, with each tool-level member at its source default (the `*_skip_*` flags are false in `nextflow.config`). That covers:

- **Input preparation.** Decompress gzipped inputs. Copy long contigs for BGC screening, filtered by `bgc_mincontiglength`.
- **Gene prediction and annotation** (source ANNOTATION). One of pyrodigal, prodigal, Prokka or Bakta; see Open questions.
- **Taxonomic classification of contigs** (source TAXA_CLASS, MMseqs2), with taxonomy merged into each screen's summary.
- **Protein domain annotation** (source PROTEIN_ANNOTATION, InterProScan). Its table feeds the AMP summary.
- **AMP screening.**
  - Tools: AMPlify, Macrel and ampir.
  - Opt-in HMMER hmmsearch against user models.
  - AMPcombi2 parsing, completion and clustering.
- **ARG screening.**
  - Tools: fARGene, RGI (CARD), AMRFinderPlus, DeepARG and ABRicate.
  - argNorm normalisation.
  - hAMRonization harmonisation and summary.
- **BGC screening.**
  - Tools: antiSMASH, DeepBGC and GECCO.
  - Opt-in HMMER hmmsearch against user models.
  - comBGC summary.

Single-valued or mutually exclusive source choices are not "all on". The writing agent has not picked them; each one is an open question below.

#### Excluded

- The caller excluded nothing explicitly.
- Proposed exclusion (see Open questions): the source's pipeline infrastructure. That means the MultiQC report, the software-versions collation, and the nf-core initialisation and completion utilities (`PIPELINE_INITIALISATION`, `PIPELINE_COMPLETION`, `UTILS_*`). These are not scientific analyses.
- The source's `test_full` profile is excluded as test evidence. It exists only as `.manualtesting`.

### Inputs and outputs

Inputs (source evidence: `assets/schema_input.json`, the samplesheet behind param `input`):

- One record per sample, with these fields:
  - `sample`: an identifier with no whitespace.
  - `fasta`: assembled contigs, required. The source accepts `.fasta`, `.fas`, `.fna` or `.fa`, optionally gzipped.
  - `protein` and `gbk`: optional pre-annotated proteins (`.faa` or `.fasta`) and GenBank annotation (`.gbk` or `.gbff`), optionally gzipped. Each requires the other.
- Reference databases for the selected tools. Each has a source param that defaults to null and is downloaded at runtime when unset; see Open questions. The params are:
  - `taxa_classification_mmseqs_db`
  - `annotation_bakta_db`
  - `protein_annotation_interproscan_db`
  - `amp_ampcombi_db`
  - `arg_amrfinderplus_db`
  - `arg_deeparg_db`
  - `arg_rgi_db`
  - `bgc_antismash_db`
  - `bgc_deepbgc_db`
- Optional `arg_abricate_db`. ABRicate otherwise uses its built-in database.
- User-supplied HMM models (`amp_hmmsearch_models`, `bgc_hmmsearch_models`). These are needed only if hmmsearch is enabled.

Outputs (scientific roles named in the source):

- Per-sample gene predictions and annotations: proteins, genes and GenBank-style annotation from the chosen annotator.
- Per-sample, per-tool AMP, ARG and BGC hit tables.
- The AMP summary: AMPcombi2 parsed tables per sample, then complete and cluster summaries across samples.
- The ARG summary: hAMRonization summarize across tools and samples, plus argNorm-normalised tables.
- The BGC summary: comBGC.
- When taxonomy is on, the taxonomy-merged versions of the three summaries (source `MERGE_TAXONOMY_AMPCOMBI`, `MERGE_TAXONOMY_HAMRONIZATION` and `MERGE_TAXONOMY_COMBGC`), plus the per-sample MMseqs2 taxonomy tables.
- InterProScan protein annotation tables, when protein annotation is on.

### Requirements and preferences

- The caller requires equivalence to the source pipeline across the whole selected scope (strong; caller wording "equivalent Galaxy workflow").
- Source behaviour: AMPcombi2 always parses tables. It runs its complete and cluster steps only when two or more summaries exist (`subworkflows/local/amp.nf:116-152`; it logs a skip warning otherwise).
- Source behaviour: ARG needs predicted proteins only for DeepARG. ANNOTATION runs only when `(run_arg_screening && !arg_skip_deeparg) || run_amp_screening || run_bgc_screening` (`workflows/funcscan.nf:125`).
- Source behaviour: samplesheet rows that carry a `gbk` skip ANNOTATION and the BGC length filter, and are mixed back in afterwards (`workflows/funcscan.nf:96-99,140,151`).
- Source defect to be aware of: `annotation_bakta_hmms` is never interpolated, because it sits in a single-quoted string at `conf/modules.config:210`. See Open questions.

### Acceptance criteria

- For every enabled screen, each sample yields per-tool hit tables and the screen's aggregated summary.
- The workflow handles both contig-only samples and pre-annotated samples, if the pre-annotated route is accepted.
- When taxonomy is on, the AMP, ARG and BGC summaries carry per-contig taxonomy.
- The reference database versions used are recorded.
- Results on the source test data are comparable to the source's for the profiles listed under Open questions. The comparison method belongs to test development.

### Open questions

- Source defaults screen nothing, but the caller selected the whole pipeline. Which analyses should be enabled?
  - Proposed: enable AMP, ARG and BGC screening, taxonomic classification and protein annotation, as the caller's whole-pipeline intent asks. Use the source defaults for every per-tool `*_skip_*` flag (all false).
  - Evidence:
    - Every `run_*` switch defaults to false (`nextflow.config:39,108,119,157,208`). With all defaults, ANNOTATION, TAXA_CLASS, PROTEIN_ANNOTATION, AMP, ARG and BGC are all skipped (`workflows/funcscan.nf:125,166,182,219,258,316`). Only gzip input preparation and MultiQC run.
    - The caller asked for the whole pipeline. This is a clear selection that conflicts with the source defaults, not an ambiguous one.
  - Confidence: high
- Which gene annotation tool should be used (`annotation_tool`: pyrodigal | prodigal | prokka | bakta)?
  - Proposed: pyrodigal, the source default. Treat Prokka and Bakta as alternatives that an expert may substitute, not as parallel branches.
  - Evidence:
    - `nextflow.config:57` sets the default to `annotation_tool = 'pyrodigal'`.
    - `subworkflows/local/annotation.nf:24-33` forces prodigal to pyrodigal, with a warning, whenever AMP is on or BGC runs antiSMASH, DeepBGC or GECCO. Under the whole-pipeline scope, prodigal is therefore effectively unreachable.
    - Each of bakta and prokka has its own test profiles (`test_bakta`, `test_prokka`, `test_bgc_*`, `test_taxonomy_*`).
  - Confidence: medium
  - Missing: whether the expert wants annotator choice exposed as a workflow option, or wants separate workflows per annotator.
- Should taxonomic classification be on, given that it switches AMP, ARG and BGC to their taxonomy-merging call forms?
  - Proposed: on. Taxonomic classification is part of the whole pipeline, and the taxonomy-merged summaries are its scientific product.
  - Evidence:
    - `run_taxa_classification` (default false, `nextflow.config:39`) selects different AMP, ARG and BGC invocations (`workflows/funcscan.nf:234,280,335`).
    - MMseqs2 is the only taxonomy tool (`nextflow.config:40`).
    - The `test_taxonomy_{pyrodigal,bakta,prokka}` profiles exercise this route.
  - Confidence: medium
  - Missing: whether taxonomy-free summaries are also wanted as outputs. The source produces one form or the other per run.
- Should pre-annotated samples (samplesheet `protein`+`gbk`) be supported as an input route?
  - Proposed: yes. Support pre-annotated samples alongside contig-only samples, as the source does.
  - Evidence:
    - `assets/schema_input.json` makes `protein` and `gbk` optional and dependent on each other.
    - Rows with `gbk` bypass ANNOTATION and the BGC length filter (`workflows/funcscan.nf:96-99,140,151`).
    - `test_preannotated` and `test_preannotated_bgc` exercise this route.
  - Confidence: medium
  - Missing: whether the expert's users ever supply pre-annotated genomes.
- Should the opt-in HMMER hmmsearch screens in AMP and BGC be included? They need user-supplied models.
  - Proposed: include both, each conditional on user-supplied HMM models.
  - Evidence:
    - `amp_run_hmmsearch` and `bgc_run_hmmsearch` default to false (`nextflow.config:129,246`).
    - When either is on, its models param is required, and the run errors without it (`subworkflows/local/amp.nf:71-72`, `subworkflows/local/bgc.nf:108-114`). The summary lists both models params as `required: false`.
    - The `test` and `test_bgc_*` profiles supply test-datasets models (for example `hmms/mybacteriocin.hmm`).
  - Confidence: medium
  - Missing: which HMM models the expert wants. The test models are for test data only.
- Should reference databases be downloaded at runtime, as the source does when the params are unset, or supplied as pinned, pre-staged references?
  - Proposed: supply each database as a pinned, versioned reference input instead of downloading it at run time. Record each database's version.
  - Evidence: the source downloads databases at runtime through dedicated processes:
    - MMseqs2 `Kalamari` (`taxa_class.nf:31`)
    - Bakta (`annotation.nf:79`, `full` or `light`)
    - InterProScan (`protein_annotation.nf:27`)
    - AMPcombi DRAMP (`amp.nf:120`)
    - AMRFinderPlus (`arg.nf:46`)
    - DeepARG (`arg.nf:136`)
    - antiSMASH (`bgc.nf:44`)
    - DeepBGC (`bgc.nf:78`)

    Runtime downloads can change between runs (for example the unpinned CARD `latest` URL at `arg.nf:99`), which weighs against the caller's "equivalent" requirement.
  - Confidence: low
  - Missing: which database versions the expert accepts, and how large each one is. Sizes were not measured, because downloads were prohibited in this phase.
- Which CARD release should RGI use? The source fetches the unpinned `https://card.mcmaster.ca/latest/data`.
  - Proposed: a pinned CARD release supplied through `arg_rgi_db`, not "latest".
  - Evidence: when `arg_rgi_db` is unset, `subworkflows/local/arg.nf:95-99` untars the hardcoded `latest` URL, so successive runs can use different CARD versions. The `test` profile also fetches this URL.
  - Confidence: medium
  - Missing: the CARD version the expert wants pinned.
- Is InterProScan protein annotation feasible to include, given its database and version evidence?
  - Proposed: include it per the caller's whole-pipeline intent, with the database supplied as a pre-staged reference. The tool version and the database version must match.
  - Evidence:
    - `protein_annotation_interproscan_db_url` defaults to an InterProScan 5.72-103.0 tarball (`nextflow.config:111`). Its size was not measured.
    - The summary records the tool container at 5.59_91.0, which differs from that database version.
    - The probes show about 29Gi free disk (94% used).
    - No source test profile enables `run_protein_annotation`.
  - Confidence: low
  - Missing: the database size, a matched tool and database version pair, and test evidence for this branch.
- Should the source's `bgc_mincontiglength` default (3000) be kept?
  - Proposed: keep 3000, the source default. Leave the value exposed so it can be changed.
  - Evidence: `nextflow.config:210` sets it to 3000. The `test_taxonomy_*` profiles lower it to 1000, which suggests the default filters out small test contigs.
  - Confidence: medium
- How should the `annotation_bakta_hmms` source defect be handled if Bakta is used?
  - Proposed: treat the intended behaviour, optional extra HMMs passed to Bakta, as the requirement. Do not reproduce the non-interpolated string.
  - Evidence: `conf/modules.config:210` puts the param in a single-quoted string, so its value never reaches Bakta.
  - Confidence: low
  - Missing: confirmation of the intended upstream behaviour (for example an upstream fix or issue).
- Should pipeline infrastructure (MultiQC report, software-versions collation, nf-core utility subworkflows) be part of the Galaxy workflow?
  - Proposed: exclude them from scientific scope.
  - Evidence: the summary classifies `PIPELINE_INITIALISATION`, `PIPELINE_COMPLETION`, `UTILS_*` and the anonymous `main.nf` entry as utility. MULTIQC belongs to no scientific subworkflow. The caller left this for the brief to state.
  - Confidence: low
  - Missing: whether the expert wants an aggregated QC or report output equivalent to MultiQC.
- Which source tests should serve as evidence, given that no single profile covers the whole scope?
  - Proposed: use several candidates together:
    - `test` (selected by the summary): pyrodigal, AMP with hmmsearch, and ARG with all tools.
    - `test_taxonomy_pyrodigal`: taxonomy with AMP, ARG and BGC.
    - `test_bgc_pyrodigal`: BGC with hmmsearch.
    - `test_preannotated` and `test_preannotated_bgc`: the pre-annotated route.
    - Bakta and Prokka variants only if those annotators are kept.
  - Evidence:
    - The summary lists 12 nf-test candidates and selects `tests/default.nf.test::-profile test`.
    - `test_minimal` runs nothing, like the defaults.
    - No profile exercises InterProScan or prodigal.
    - `test_taxonomy_*` skips DeepARG, AMRFinderPlus and DeepBGC.
    - `test_bakta` skips DeepARG.
  - Confidence: medium
  - Missing: test evidence for InterProScan, and any single run of everything together.

### Related artifacts

- `summary-nextflow.json`: processes, subworkflows, params, source container references, reference assets and rebuilds, `publish_dir`, and the 12 test candidates.
- `phase1-notes.md`: default-run analysis, gating flags, test profiles and database params, with file:line citations.
- `caller-request.md`: objective, selection and coordinator interpretation.
- `environment-probes.txt`: tooling and container probes.

## Agent Environment

These are observations from `environment-probes.txt` (2026-10-26). No container pulls, data downloads or installs were performed.

### Tooling

- `gxwf`: 1.0.0, at `/opt/homebrew/bin/gxwf` (observed).
- `foundry`: absent from PATH.
  - The run shim (`<run>.bin/foundry`) points at the pipeline-run worktree build. It is the expected invocation.
  - It does not support `--version`. Its workflow-brief validator schema matches `8e65acb789057c59f2fe3a2e7920682ad272a82e0caa92de69b62cc56d5036e0` (observed).
- `planemo`:
  - 0.75.44 is on PATH.
  - The expected invocation is `uvx --from planemo==0.75.47 planemo`. It resolves 0.75.47 from the local uv cache without network (observed).
- `galaxy-tool-cache`, `uvx` and `node` v25.6.1 are present.
- Not present: `nextflow`, `nf-test` and conda/mamba. `java` is a system stub with no runtime. The source pipeline therefore cannot be run locally for comparison (observed).

### Constraints

- Host: macOS (Darwin), arm64, 14 CPUs, 48GiB RAM.
- Disk: about 29Gi free on the home volume (94% used). This limits staging large reference databases (InterProScan, DeepARG, antiSMASH, Bakta full, MMseqs2 Kalamari). Their sizes are unmeasured.
- Brief production ran without pulls, downloads or installs. Whether later phases may download databases or containers needs the operator's decision, and it is unknown here.
- The source test data lives on GitHub (`nf-core/test-datasets`, `funcscan` branch). Its reachability was not probed.

### Containerization

- Docker 29.9.2 (linux/arm64) works. `hello-world` ran with `pull=never` (observed).
- The Docker VM has 14 CPUs and about 7.7GiB of memory (`docker info`), well below host RAM. Memory-heavy tools (for example DeepARG, antiSMASH, InterProScan) may exceed it. That is untested.
- Running amd64 images under emulation works: one cached biocontainer (`seqkit` 2.14.0) ran under emulation with a platform warning. Emulation has not been tested for heavier tools.
- Only five small biocontainers are cached locally. None of this pipeline's tool containers is known to be cached.
- Singularity, Apptainer and Podman are absent.
- No expert container preference was supplied.
