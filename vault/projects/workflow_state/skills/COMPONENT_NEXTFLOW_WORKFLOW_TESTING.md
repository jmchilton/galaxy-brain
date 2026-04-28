# Component — Nextflow Workflow Testing

Synthesis of (a) external documentation/community material and (b) concrete evidence from a pinned local corpus of 7 nf-core pipelines at `~/projects/repositories/nextflow-fixtures/pipelines/`. Every corpus claim is grounded in a file path + line numbers; every external claim has a URL.

Corpus pins (see `fixtures.yaml`): demo 1.1.0, fetchngs 1.12.0, bacass 2.5.0, hlatyping 2.2.0, taxprofiler 2.0.0, rnaseq 3.24.0, sarek 3.8.1.

---

## 1. The framework landscape

Nextflow itself ships no testing framework. Official docs cover only one test-adjacent feature: the `stub:` block executed via `-stub-run` ([Nextflow process docs](https://docs.seqera.io/nextflow/process)). Everything else is community-driven.

Two frameworks have mattered in practice:

- **pytest-workflow** (older; Python + YAML) — used by nf-core for modules/subworkflows until ~2023. Driven out because it had no native profile multiplexing, required manual MD5s everywhere, split pipeline tests from module tests, and made local reproduction of CI painful ([Seqera blog](https://seqera.io/blog/nf-test-in-nf-core/), [Bytesize 17](https://hackmd.io/@nf-core/bytesize-17)).
- **nf-test** (current; askimed/nf-test, MIT) — created by Lukas Forer & Sebastian Schönherr at Innsbruck. Peer-reviewed in *GigaScience* 2025 ([DOI](https://doi.org/10.1093/gigascience/giaf130)). Docs at [nf-test.com](https://www.nf-test.com/). Migration through nf-core was announced Oct 2023 at Nextflow Summit Barcelona and completed in early 2026 when the last subworkflows were converted ([nf-core blog](https://nf-co.re/blog/2026/modules-pytest-conversion)).

**Corpus evidence:** all 7 pipelines use nf-test. Zero `pytest.ini`, `.pytest_workflow.yml`, or `conftest.py` found anywhere under the pipelines (`find -name 'pytest*'` returns empty). Each pipeline has a root `nf-test.config` and a `.github/workflows/nf-test.yml`. pytest-workflow is operationally extinct in the active nf-core corpus.

---

## 2. File layout of a tested pipeline

Every pipeline in the corpus follows the same shape:

```
<pipeline>/
├── nf-test.config                       ← framework config
├── conf/
│   ├── test.config                      ← minimal-dataset profile
│   ├── test_full.config                 ← AWS megatest profile
│   └── test_<variant>.config            ← per-flavor test profiles (sarek, taxprofiler, ...)
├── tests/
│   ├── default.nf.test                  ← pipeline-level test
│   ├── <scenario>.nf.test               ← additional pipeline tests
│   ├── *.nf.test.snap                   ← snapshot outputs
│   ├── .nftignore                       ← unstable files to exclude from snapshots
│   └── nextflow.config                  ← test-only overrides
├── modules/nf-core/<tool>/tests/        ← per-module tests (when vendored in-repo)
├── subworkflows/nf-core/<sw>/tests/     ← per-subworkflow tests
└── .github/workflows/nf-test.yml        ← CI entry point
```

Concrete `nf-test.config` (from `nf-core__demo/nf-test.config:1-24`):

```groovy
config {
    testsDir "."                                            // search repo root down
    workDir System.getenv("NFT_WORKDIR") ?: ".nf-test"
    configFile "tests/nextflow.config"                      // layered on top of main
    ignore 'modules/nf-core/**/tests/*', 'subworkflows/nf-core/**/tests/*'
    profile "test"
    triggers 'nextflow.config', 'nf-test.config',
             'conf/test.config', 'tests/nextflow.config',
             'tests/.nftignore'                             // changes that force full run
    plugins { load "nft-utils@0.0.3" }
}
```

The `ignore` directive is a load-bearing convention: nf-core pipelines vendor modules from `nf-core/modules` verbatim, and those module tests are exercised upstream in the `nf-core/modules` repo — pipelines only run their own pipeline-level tests.

---

## 3. Test profiles (`conf/test.config`, `conf/test_full.config`, variants)

Two canonical profiles plus per-scenario variants for branchy pipelines.

**`test` = minimal smoke dataset, CI-runnable.** Overrides `params.input`, references, and caps resources. Example: `nf-core__rnaseq/conf/test.config:13-36` (excerpt):

```groovy
params {
    input            = 'https://raw.githubusercontent.com/nf-core/test-datasets/626c8fab639062eade4b10747e919341cbf9b41a/samplesheet/v3.10/samplesheet_test.csv'
    fasta            = 'https://raw.githubusercontent.com/nf-core/test-datasets/626c8fab.../reference/genome.fasta'
    gtf              = '...genes_with_empty_tid.gtf.gz'
    salmon_index     = '...salmon.tar.gz'
    skip_bbsplit     = false
    pseudo_aligner   = 'salmon'
    umitools_bc_pattern = 'NNNN'
}
process {
    withName: 'RSEM_PREPAREREFERENCE_GENOME|...' { ext.args2 = "--genomeSAindexNbases 7" }
    withName: '.*:BOWTIE2_ALIGN$'                { ext.args = '--very-sensitive-local --seed 1 --reorder' }
    withName: '.*:RIBODETECTOR'                  { ext.args = '--seed 1' }
}
```

Two notable patterns here:

1. **Test data URLs are pinned to a full test-datasets commit SHA** (`626c8fab63...`). That's a deliberate reproducibility choice — the test-datasets branch can evolve without breaking pinned pipeline tests.
2. **Process-level seeds/flags are set from the test profile.** Determinism hacks (`--seed 1`, `--reorder`, `--genomeSAindexNbases 7` for tiny indices) live in the test profile, not in the module — modules stay generic.

`nf-core__demo/conf/test.config:13-27` shows a minimum-overhead variant with only a `resourceLimits` map (`cpus: 2`, `memory: '4.GB'`, `time: '1.h'`) and a single `input` URL.

**`test_full` = full-size public dataset, AWS megatest only.** Example `nf-core__rnaseq/conf/test_full.config:13-21`:

```groovy
params {
    input          = 'https://raw.githubusercontent.com/nf-core/test-datasets/626c8fab.../samplesheet/v3.10/samplesheet_full.csv'
    genome         = 'GRCh37'
    pseudo_aligner = 'salmon'
}
```

Run on real hardware via `.github/workflows/awsfulltest.yml`, not CI. Results land in `s3://nf-core-awsmegatests` ([nf-core/awsmegatests](https://github.com/nf-core/awsmegatests), [Bytesize 19](https://nf-co.re/events/2021/bytesize-19-aws-megatests)).

**Variant profiles.** Branchy pipelines carry per-flavor configs rather than encoding the matrix in test code. Examples:

- `nf-core__bacass/conf/`: `test.config`, `test_long.config`, `test_hybrid.config`, `test_dfast.config`, `test_liftoff.config`, `test_long_miniasm.config`, `test_long_dragonflye.config`, … (10 total)
- `nf-core__hlatyping/conf/`: `test.config`, `test_dna_rna.config`, `test_fastq.config`, `test_fastq_cat.config`, `test_hlahd.config`, `test_optitype_hlahd.config`, `test_rna.config` (8 total)
- `nf-core__taxprofiler/conf/`: 9 variants including `test_minimal`, `test_malt`, `test_motus`, `test_nopreprocessing`, …
- `nf-core__sarek/conf/`: 5 variants including `test_mutect2.config`

Each variant corresponds 1:1 to a `.nf.test` under `tests/`. This is how nf-core handles workflow-level branching in testing: **one profile + one test file per mode**, rather than a single parametric test.

---

## 4. Test data: where it actually comes from

Test data is stored in the `nf-core/test-datasets` GitHub repo — **one git branch per pipeline** plus a special `modules` branch ([nf-core/test-datasets README](https://github.com/nf-core/test-datasets)). Rationale: "Due [to] the large number of large files in this repository for each pipeline, we highly recommend cloning only the branches you would use." Branching (instead of subdirectories) lets contributors shallow-clone exactly what they need.

Guiding principle: "as small as possible, as large as necessary." Contributors are told to ask on Slack before adding test data.

**Access pattern in the corpus:** raw GitHub content URLs pinned to a commit SHA. Per-pipeline examples:

- `nf-core__rnaseq/conf/test.config:18` → `...test-datasets/626c8fab639062eade4b10747e919341cbf9b41a/samplesheet/v3.10/samplesheet_test.csv` (pin to SHA)
- `nf-core__fetchngs/tests/main.nf.test:12` → `...test-datasets/2732b911c57e607fa7aea5ba0c3d91b25bafb662/testdata/v1.12.0/sra_ids_test.csv`
- `nf-core__demo/conf/test.config:26` → uses the `viralrecon` branch of test-datasets by symbolic name (no SHA pin on demo — it's template-default)

**Module-level test data** uses a different base path: `params.modules_testdata_base_path` → `https://raw.githubusercontent.com/nf-core/test-datasets/modules/data/`. The `modules` branch is the shared pool for module/subworkflow tests. Example: `nf-core__sarek/tests/variant_calling_mutect2.nf.test:1-2` literally hardcodes `def modules_testdata_base_path = 'https://raw.githubusercontent.com/nf-core/test-datasets/modules/data/'` at file scope.

In-repo test fixtures (CSVs, small sample sheets) show up under `tests/csv/` and `assets/` — e.g., `nf-core__sarek/tests/csv/3.0/recalibrated_somatic.csv` referenced at `variant_calling_mutect2.nf.test:20`. FASTQs / references are never in-repo.

---

## 5. The shape of an nf-test test

Tests are written in a Groovy-like DSL with BDD-style `when { }` / `then { }` blocks. Official reference: [nf-test.com](https://www.nf-test.com/) and [nf-core's writing-tests tutorial](https://nf-co.re/docs/tutorials/tests_and_test_data/nf-test_writing_tests).

**Four kinds of tests,** each with its own outer block name:

- `nextflow_pipeline { … }` — end-to-end pipeline run
- `nextflow_workflow { … }` — a `workflow { }` definition from `main.nf` or a subworkflow
- `nextflow_process { … }` — a single `process { }`
- `nextflow_function { … }` — a Groovy function

### 5a. Pipeline-level test (canonical shape)

`nf-core__demo/tests/default.nf.test:1-33`:

```groovy
nextflow_pipeline {
    name "Test pipeline"
    script "../main.nf"
    tag "pipeline"

    test("-profile test") {
        when {
            params { outdir = "$outputDir" }
        }
        then {
            def stable_name = getAllFilesFromDir(params.outdir, relative: true, includeDir: true,
                                                 ignore: ['pipeline_info/*.{html,json,txt}'])
            def stable_path = getAllFilesFromDir(params.outdir, ignoreFile: 'tests/.nftignore')
            assertAll(
                { assert workflow.success },
                { assert snapshot(
                    removeNextflowVersion("$outputDir/pipeline_info/nf_core_demo_software_mqc_versions.yml"),
                    stable_name,   // path tree listing
                    stable_path    // md5 of each file's content
                ).match() }
            )
        }
    }
}
```

The three-part snapshot is the nf-core idiom:

1. **Normalized versions.yml** — Nextflow version stripped so the test passes on multiple Nextflow versions in CI.
2. **`stable_name`** — recursive file listing as strings (catches renamed/added/removed outputs).
3. **`stable_path`** — content-hashed files (catches output drift), with `.nftignore` filtering out known-unstable files.

Wrapping in `assertAll()` is idiomatic — one failed assertion doesn't mask others ([assertions tutorial](https://nf-co.re/docs/contributing/tutorials/nf-test_assertions)).

### 5b. Pipeline-level test — explicit assertions (no snapshot)

`nf-core__fetchngs/tests/main.nf.test:16-60` takes a different approach — heavy use of `assertAll({ assert new File(...).exists() })` for specific filenames plus targeted `readLines()` checks:

```groovy
then {
    assert workflow.success
    assertAll(
        { assert new File("$outputDir/samplesheet/samplesheet.csv").readLines().size() == 15 },
        { assert new File("$outputDir/samplesheet/samplesheet.csv").readLines()*.split(',')[0].take(4)
              == ['"sample"', '"fastq_1"', '"fastq_2"', '"run_accession"'] },
        { assert new File("$outputDir/fastq/md5/DRX024467_DRR026872.fastq.gz.md5").exists() },
        // ... dozens more existence checks
    )
}
```

Seqera's blog cites fetchngs as nf-core's best-practice reference ([Seqera blog](https://seqera.io/blog/nf-test-in-nf-core/)). The style fits: FASTQ downloads produce binary content with embedded metadata that md5 can't snapshot meaningfully, so the test checks shape + key files + specific header content instead.

### 5c. Matrix-of-scenarios pattern

`nf-core__sarek/tests/variant_calling_mutect2.nf.test:4-45` shows how sarek does multi-scenario testing in a single file — top-of-file Groovy list of scenario maps:

```groovy
def test_scenario = [
    [ name: "-profile test --tools mutect2 somatic",
      params: [ genome: null, igenomes_ignore: true,
                dbsnp: modules_testdata_base_path + 'genomics/.../dbsnp_138.hg38.vcf.gz',
                fasta: modules_testdata_base_path + '...',
                input: "${projectDir}/tests/csv/3.0/recalibrated_somatic.csv",
                step: "variant_calling", tools: 'mutect2', wes: true ] ],
    [ name: "-profile test --tools mutect2 somatic --no_intervals", params: [ ..., no_intervals: true, ... ] ],
    // ...
]
```

These are fanned out into separate `test(...)` blocks later in the file. Sarek has 59 pipeline-level tests and 0 module-level tests in the corpus — it inherits modules from nf-core/modules upstream.

### 5d. Module-level test

`nf-core__rnaseq/modules/nf-core/rustqc/tests/main.nf.test:1-50` is representative of `nextflow_process` tests:

```groovy
nextflow_process {
    name "Test Process RUSTQC"
    script "../main.nf"
    process "RUSTQC"

    tag "modules"
    tag "modules_nfcore"
    tag "rustqc"

    test("homo_sapiens paired-end [bam]") {
        config './nextflow.config'
        when {
            process {
                """
                input[0] = channel.of([ [ id:'test', single_end:false ],
                                        file(params.modules_testdata_base_path + "...test.paired_end.sorted.bam", checkIfExists: true),
                                        file(params.modules_testdata_base_path + "...test.paired_end.sorted.bam.bai", checkIfExists: true) ])
                input[1] = channel.of([ [ id:'homo_sapiens' ],
                                        file(params.modules_testdata_base_path + "...genome.gtf", checkIfExists: true) ])
                """
            }
        }
        then {
            assertAll(
                { assert process.success },
                { assert snapshot(
                    process.out.featurecounts,
                    process.out.preseq,
                    process.out.rseqc[0][1].findAll { it.toString().endsWith("infer_experiment.txt") || ... },
                    // non-reproducible outputs — filenames only
                    process.out.dupradar[0][1].collect { file(it).name }.sort(),
                    process.out.qualimap[0][1].findAll { !file(it).isDirectory() }.collect { file(it).name }.sort(),
                    ...
                ).match() },
            )
        }
    }
}
```

Key idiom: **cherry-pick stable vs unstable outputs within one snapshot call.** Reproducible text outputs go in as full content; binary/timestamped outputs go in as filenames-only (sorted). Tag hierarchy (`modules`, `modules_nfcore`, `<tool>`) drives selective CI runs.

**Tags are the scoping mechanism.** `nf-test --tag rustqc` runs only rustqc tests; `--tag modules` runs all module tests. Pipeline-level tests carry `tag "pipeline"` or `tag "PIPELINE"`. Sarek uses custom tags for vendor-specific tools: `tag "sentieon"` in `nf-core__sarek/tests/sentieon*.nf.test`.

---

## 6. Snapshots (`.nf.test.snap`)

Snapshots are pretty-printed JSON files keyed by test name, regenerated with `nf-test test <path> --update-snapshot`. Content is whatever the test passed to `snapshot(...)`. nf-test auto-hashes file paths to MD5 so binary files compare sanely; structured outputs (channel lists, maps) are serialized directly ([nf-test snapshot docs](https://www.nf-test.com/docs/assertions/snapshots/)).

Example from `nf-core__rnaseq/tests/default.nf.test.snap:1-80`:

```json
{
  "Params: default - stub": {
    "content": [
      27,                                     // workflow.trace.succeeded().size()
      {
        "FASTQC":   { "fastqc": "0.12.1" },
        "STAR_GENOMEGENERATE": { "star": "2.7.11b", "samtools": 1.21, "gawk": "5.1.0" },
        "TRIMGALORE": { "trimgalore": "0.6.10" },
        ...                                   // normalized versions.yml
      },
      [ "fastqc", "fastqc/raw", "fastqc/raw/RAP1_IAA_30M_REP1_raw.html", ... ]  // stable_name listing
    ]
  }
}
```

Observations from the corpus:

- **Snapshot counts scale roughly with pipeline complexity.** rnaseq: 124 snap files. sarek: 62. taxprofiler: 70. bacass: 34. demo: 7.
- **Keys are human-readable test names**, making diffs reviewable.
- **The snap file encodes what the test author thought was stable** — stripping Nextflow version, stripping MultiQC HTML report (in `.nftignore`), stripping timestamps. Getting this wrong is the most common nf-test anti-pattern (see §9).

**`.nftignore` filters unstable files out of `stable_path`.** `nf-core__demo/tests/.nftignore:1-14`:

```
.DS_Store
multiqc/multiqc_data/fastqc_top_overrepresented_sequences_table.txt
multiqc/multiqc_data/multiqc.parquet
multiqc/multiqc_data/multiqc.log
multiqc/multiqc_data/multiqc_data.json
multiqc/multiqc_data/multiqc_sources.txt
multiqc/multiqc_data/multiqc_software_versions.txt
multiqc/multiqc_data/llms-full.txt
multiqc/multiqc_plots/{svg,pdf,png}/*.{svg,pdf,png}
multiqc/multiqc_report.html
multiqc/multiqc_data/BETA-multiqc.parquet
fastqc/**/*_fastqc.{html,zip}
pipeline_info/*.{html,json,txt,yml}
```

This tells you directly what's known to drift: MultiQC reports, FastQC HTML/ZIP bundles, parquet caches, pipeline_info metadata. New pipelines start with a similar list out of the nf-core template.

**Helper plugins for format-aware hashing.** nf-core points to `nft-utils`, `nft-bam`, `nft-vcf` which compute checksums that ignore headers/timestamps in BAM/VCF files instead of raw MD5 ([Seqera blog](https://seqera.io/blog/nf-test-in-nf-core/)).

---

## 7. Stub blocks and `-stub-run`

Official feature: a `stub:` block inside a process supplies a dummy script that runs under `-stub-run` to produce filename-compatible outputs without real computation ([Nextflow process docs](https://docs.seqera.io/nextflow/process)).

**Corpus evidence:** widespread in module code. 76 stub blocks in `nf-core__rnaseq/modules` alone. Representative block (dupradar module, grep-extracted):

```groovy
stub:
"""
touch ${meta.id}_duprateExpDens.pdf
touch ${meta.id}_duprateExpBoxplot.pdf
touch ${meta.id}_expressionHist.pdf
touch ${meta.id}_dupMatrix.txt
touch ${meta.id}_intercept_slope.txt
touch ${meta.id}_dup_intercept_mqc.txt
...

cat <<-END_VERSIONS > versions.yml
"${task.process}":
    bioconductor-dupradar: \$(Rscript -e "library(dupRadar); cat(as.character(packageVersion('dupRadar')))")
END_VERSIONS
"""
```

Stub use in nf-test: the rnaseq `default.nf.test.snap` key is `"Params: default - stub"` — the pipeline-level test runs under `-stub-run` and the snapshot shows `.stub` marker files (`multiqc/star_salmon/multiqc_data/.stub`) rather than real outputs. This is how the flagship "is the workflow wiring correct?" CI test runs fast without burning full aligner time.

**Known anti-patterns** ([process docs](https://docs.seqera.io/nextflow/process), [Indap blog](https://indapa.github.io/2025/05/31/nextflow-stub.html), [issue #6556](https://github.com/nextflow-io/nextflow/issues/6556)):

- Processes without a `stub:` silently fall back to the real script under `-stub-run` — partial stub coverage masks a broken "dry run."
- Stub `touch` filenames drift from real `output:` globs, producing channel failures that don't exist under real execution.
- Stubs can still reserve real `cpus` / `memory` unless a dedicated lightweight profile overrides them.
- Confusion with `-preview` (different semantics — `preview` is static, `stub-run` executes the stub).

nf-core's current push is for *all* modules to have stubs so end-to-end stub runs are reliable ([nf-core blog 2026](https://nf-co.re/blog/2026/modules-pytest-conversion)).

---

## 8. CI integration

All 7 pipelines ship a `.github/workflows/nf-test.yml`. The canonical shape (from `nf-core__demo/.github/workflows/nf-test.yml`):

- **Triggers:** `pull_request`, `release: [published]`, `workflow_dispatch`. Docs-only paths excluded (`docs/**`, `**/*.md`, `**/*.svg`, `**/meta.yml`).
- **Env pins:** `NFT_VER: "0.9.3"`, Singularity cache under `${github.workspace}/.singularity`.
- **Sharding action** (`./.github/actions/get-shards`) computes how many test shards are needed based on changed files — tests are auto-split across up to 7 parallel runners. This is nf-core-specific tooling baked into the pipeline template.
- **Matrix** (lines 67-81): `shard × profile × NXF_VER` where
  - `profile: [conda, docker, singularity]`
  - `NXF_VER: ["25.10.2", "latest-everything"]`
  - `conda` and `singularity` are excluded for non-main PRs (only `docker` on dev branches — main branch gets the full grid).
  - `latest-everything` failures are `continue-on-error` (advisory signal only).
- **Self-hosted runners.** Uses runs-on.com labels (`runs-on=${{ github.run_id }}-nf-test`, `runner=4cpu-linux-x64`) — nf-core moved off GitHub's free runners for their larger pipelines.
- **AWS megatests** run from separate workflows (`awsfulltest.yml`, `cloud_tests_full.yml`) on release, not on PR — they hit `test_full` profile in a Batch environment and dump to S3 ([nf-core/awsmegatests](https://github.com/nf-core/awsmegatests)).

**Additional workflows seen in larger pipelines:**

- `linting.yml` / `fix_linting.yml` — runs `nf-core pipelines lint` against ~40 nf-core conventions ([lint docs](https://nf-co.re/docs/nf-core-tools/pipelines/lint)).
- `download_pipeline.yml` — tests that `nf-core download` works.
- `branch.yml` — enforces branch protection.
- `nf-test-arm.yml` / `nf-test-gpu.yml` (rnaseq, sarek) — architecture/GPU-specific test flavors.
- `ncbench.yml` (sarek) — benchmark integration.

---

## 9. Common shortcuts, gaps, and anti-patterns

Drawn from corpus evidence + external guidance ([Seqera blog](https://seqera.io/blog/nf-test-in-nf-core/), [nf-core testing recommendations](https://nf-co.re/docs/guidelines/pipelines/recommendations/testing), [nf-test snapshot docs](https://www.nf-test.com/docs/assertions/snapshots/)):

**What isn't rigorously tested:**

- **Output scientific correctness.** The default snapshot strategy hashes file *presence* + content, with `.nftignore` filtering anything unstable. Files that aren't unstable still only get `bytes-in = bytes-out` verification; no semantic assertion (e.g., "VCF contains variant X"). fetchngs explicitly uses `readLines()` + header checks because its outputs can't be snapshotted; most other pipelines don't.
- **Full-size / real-world runs.** `test` profile uses tiny datasets (chr21, subsampled FASTQs). `test_full` runs only on AWS release megatests, not PR CI — a pipeline can regress on real-scale inputs without triggering CI.
- **Non-default profiles.** Only `docker` runs on dev PRs; `conda` and `singularity` are main-only. A contributor can break conda/singularity without noticing until their PR merges.
- **Stub parity.** If a module lacks `stub:`, `-stub-run` silently executes the real script — partial coverage is worse than no coverage because you *think* you're doing a dry run.

**What's conspicuously good:**

- **Version pinning is thorough.** Test-data URLs pin to full commit SHAs (e.g., rnaseq pins `626c8fab...`). Nextflow versions are explicit. Test-framework version (`NFT_VER: "0.9.3"`) is env-pinned in CI.
- **pytest-workflow is fully purged.** No remnants across any of the 7 pipelines. Migration tooling (`pytest2nf-test` by @GallVp) automated most of this ([nf-core blog 2026](https://nf-co.re/blog/2026/modules-pytest-conversion)).
- **Seeds in test profiles.** Determinism hacks live in `conf/test.config`'s `process { withName: ... { ext.args } }` blocks, not the module code — keeps modules generic.

**Common mistakes** ([writing-tests tutorial](https://nf-co.re/docs/tutorials/tests_and_test_data/nf-test_writing_tests)):

- Snapshotting directories containing timestamped files → flaky CI. Fix: add to `.nftignore`.
- Running a subset of tests locally, then committing. Obsolete snapshot entries aren't detected unless *all* tests run successfully — stale snapshots accumulate silently.
- Not running tests twice locally before snapshotting → nondeterminism baked into the snapshot.
- Skipping review of `--update-snapshot` diffs in PR review. Snapshot files *should* be reviewed as code.
- Treating CI as the only test loop (pytest-workflow era habit) — nf-test's local reproducibility is much better; use it.

---

## 10. Implications for Galaxy-side tooling

For a `review-nextflow` skill or downstream translation work:

1. **Test data is structured and discoverable.** Look in `conf/test.config` params for URLs; URLs are raw GitHub content pinned to a SHA. `params.modules_testdata_base_path` in module tests resolves to the `modules` branch of `nf-core/test-datasets`. A review agent can inventory the full test-data surface with a grep.
2. **The `test` profile is the *contract* for what a minimal run looks like** — parameters, references, seeds. Translating this to a Galaxy test should preserve the same dataset choices.
3. **Variant profiles 1:1 map to testable modes.** Each `conf/test_<variant>.config` corresponds to a `tests/<variant>.nf.test`. This is the explicit enumeration of branches the pipeline authors consider test-worthy — a natural input to the "workflow splitter" problem in nf→Galaxy.
4. **`.nftignore` is a cheat sheet for unstable outputs.** When building Galaxy tests for a translated workflow, anything in `.nftignore` on the nf-core side is known-unstable and likely needs the same treatment (or an nft-bam/vcf-style format-aware comparator).
5. **Snapshots aren't directly portable to Galaxy**, but they tell you *what the pipeline authors believed was stable enough to pin*. That's useful provenance for deciding which translated outputs deserve assertions.
6. **Stub blocks are a shortcut for workflow-wiring validation.** A Galaxy analog would be dry-running the translated `.ga` with synthetic inputs to check connectivity — worth modeling on this pattern.
7. **Containers / seeds are part of the test contract.** When translating, preserve the seed flags from `conf/test.config`'s `process { ext.args }` or the translated Galaxy workflow will produce non-matching outputs.

---

## Corpus statistics (pinned SHAs)

| Pipeline | Pipeline tests | Module tests (in-repo) | Subworkflow tests | Snap files |
|---|---:|---:|---:|---:|
| nf-core/demo 1.1.0 | 1 | 3 | 5 | 7 |
| nf-core/fetchngs 1.12.0 | 1 | 10 | 9 | 15 |
| nf-core/bacass 2.5.0 | 9 | 21 | 6 | 34 |
| nf-core/hlatyping 2.2.0 | 7 | 9 | 5 | 19 |
| nf-core/taxprofiler 2.0.0 | 8 | 59 | 5 | 70 |
| nf-core/rnaseq 3.24.0 | 20 | 76 | 34 | 124 |
| nf-core/sarek 3.8.1 | 59 | 0 | 3 | 62 |

Sarek's 0 module tests reflect its policy of inheriting modules from `nf-core/modules` upstream rather than vendoring module tests in-repo.

---

## Sources

**External (documentation, blogs, papers):**
- [nf-test home](https://www.nf-test.com/) · [snapshot docs](https://www.nf-test.com/docs/assertions/snapshots/) · [configuration docs](https://www.nf-test.com/docs/configuration/)
- [askimed/nf-test on GitHub](https://github.com/askimed/nf-test)
- [Forer & Schönherr, *GigaScience* 2025](https://doi.org/10.1093/gigascience/giaf130)
- [Ewels et al., *Nature Biotechnology* 2020](https://www.nature.com/articles/s41587-020-0439-x) (nf-core framework paper)
- [Nextflow process docs (stub)](https://docs.seqera.io/nextflow/process)
- [nf-core/test-datasets](https://github.com/nf-core/test-datasets)
- [nf-core testing recommendations](https://nf-co.re/docs/guidelines/pipelines/recommendations/testing)
- [nf-core linting requirements](https://nf-co.re/docs/guidelines/pipelines/requirements/linting) · [lint docs](https://nf-co.re/docs/nf-core-tools/pipelines/lint)
- [nf-core writing-tests tutorial](https://nf-co.re/docs/tutorials/tests_and_test_data/nf-test_writing_tests) · [assertions tutorial](https://nf-co.re/docs/contributing/tutorials/nf-test_assertions)
- [nf-core blog: pytest-to-nf-test completion](https://nf-co.re/blog/2026/modules-pytest-conversion) · [Seqera blog: nf-test in nf-core](https://seqera.io/blog/nf-test-in-nf-core/)
- [Bytesize 17: pytest-workflow](https://hackmd.io/@nf-core/bytesize-17) · [Bytesize 19: AWS megatests](https://nf-co.re/events/2021/bytesize-19-aws-megatests)
- [Nextflow Summit 2023: nf-test at nf-core](https://summit.nextflow.io/2023/barcelona/agenda/summit/oct-20-nf-test-at-nf-core/)
- [nf-core/awsmegatests](https://github.com/nf-core/awsmegatests)
- [Indap blog: Nextflow stub run](https://indapa.github.io/2025/05/31/nextflow-stub.html) · [Nextflow issue #6556 (-preview vs -stub-run)](https://github.com/nextflow-io/nextflow/issues/6556) · [Nextflow discussion #2094 (stub cpu/mem)](https://github.com/nextflow-io/nextflow/discussions/2094)
- [nf-core/modules#7575](https://github.com/nf-core/modules/issues/7575) · [#7654](https://github.com/nf-core/modules/issues/7654) (migration tracking)

**Corpus (local pins at `~/projects/repositories/nextflow-fixtures/pipelines/`):**
- `nf-core__demo/` (1.1.0 @ 45904cb)
- `nf-core__fetchngs/` (1.12.0 @ 8ec2d93)
- `nf-core__bacass/` (2.5.0 @ 76e4b12)
- `nf-core__hlatyping/` (2.2.0 @ 3237d20)
- `nf-core__taxprofiler/` (2.0.0 @ fa1aab0)
- `nf-core__rnaseq/` (3.24.0 @ 47b3b0d)
- `nf-core__sarek/` (3.8.1 @ 4bd2948)
