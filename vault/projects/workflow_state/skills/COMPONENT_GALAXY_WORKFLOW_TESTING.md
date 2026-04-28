# Component — Galaxy Workflow Testing (IWC + planemo)

Synthesis of (a) the planemo-centric external documentation + Galaxy ecosystem specs and (b) concrete evidence from the IWC corpus at `/Users/jxc755/projects/repositories/iwc/`. Every corpus claim is grounded in a file path + line numbers; every external claim has a URL.

**Scope & positioning.** This document covers the **public-facing, contribution-oriented workflow testing layer**: the `-tests.yml` format run by planemo, bundled into IWC, and enforced by IWC CI. It is complementary to the existing vault note [`Component - Workflow Testing.md`](../../../research/Component%20-%20Workflow%20Testing.md) (887 lines), which covers Galaxy *core*'s internal frameworks (`.gxwf.yml` / `.gxwf-tests.yml` + the procedural `test_workflows.py` suite). Both layers share the assertion vocabulary — they differ in packaging, discovery, and execution environment.

---

## 1. The two layers

- **Galaxy core** (covered in the companion vault note): `.gxwf.yml` / `.gxwf-tests.yml` fixtures under `galaxy/test/functional/` + Python driver `test_workflows.py`. Exercises Galaxy internals, runs inside the Galaxy pytest suite.
- **IWC / planemo** (this document): directory-per-workflow, `-tests.yml` sibling of each `.ga`, run by `planemo test`, wrapped in a GitHub Actions shard matrix, deployed post-merge to Dockstore + WorkflowHub + `iwc-workflows` GitHub org. This is the path **contributors** follow to land a workflow in usegalaxy.*

The assertion vocabulary is shared (same `galaxy.tool_util.verify.asserts` code path). The harness, discovery mechanism, and CI environment differ.

---

## 2. The `-tests.yml` format (planemo spec)

Authoritative reference: [planemo.readthedocs.io/en/latest/test_format.html](https://planemo.readthedocs.io/en/latest/test_format.html).

A tests file is a YAML **list** of test cases. Each case has three top-level keys:

- `doc:` — description string (required in practice).
- `job:` — input mapping, keyed by the workflow's input **label** (not step index).
- `outputs:` — mapping keyed by the workflow's output label, containing assertions or file comparisons.

**Inputs referenced by workflow label, not index.** The natural-language workflow input label is the key verbatim — spaces, colons, question marks and all. Example: `/Users/jxc755/projects/repositories/iwc/workflows/scRNAseq/scanpy-clustering/Preprocessing-and-Clustering-of-single-cell-RNA-seq-data-with-Scanpy-tests.yml:23` has `Manually annotate celltypes?: true` as a job key. This makes labeled inputs a load-bearing planemo practice — unlabeled inputs fall back to "Input dataset" defaults which are fragile ([planemo best practices](https://planemo.readthedocs.io/en/latest/best_practices_workflows.html)).

### 2a. Canonical minimal example

`/Users/jxc755/projects/repositories/iwc/workflows/sars-cov-2-variant-calling/sars-cov-2-consensus-from-variation/consensus-from-variation-tests.yml` (32 lines) is the simplest complete test in the sample:

```yaml
- doc: Test consensus building from called variants
  job:
    Reference genome:
      class: File
      location: 'https://zenodo.org/record/4555735/files/NC_045512.2_reference.fasta?download=1'
      hashes:
      - hash_function: SHA-1
        hash_value: db3759c2e1d9ce8827ba4aa1749e759313591240
    aligned reads data for depth calculation:
      class: Collection
      collection_type: 'list'
      elements:
      - identifier: SRR11578257
        class: File
        path: test-data/aligned_reads_for_coverage.bam
        ...
  outputs:
    multisample_consensus_fasta:
      file: test-data/masked_consensus.fa
```

Three patterns in 32 lines: remote data + SHA-1 integrity check, a `list` collection from local fixtures, and an exact-file output assertion.

### 2b. Input shapes

All documented at the planemo test_format page; all observed in the corpus:

- **Scalar param**: bare value keyed by label. `short-read-quality-control-and-trimming-tests.yml:19-23` — `Qualified quality score: '15'`, `Adapter to remove on forward reads: null`.
- **Single file, remote**: `class: File` + `location:` + `filetype:` + `hashes:` (optional but IWC-idiomatic for integrity).
- **Single file, local**: `class: File` + `path: test-data/...`.
- **List collection**: `class: Collection, collection_type: list, elements: [{identifier, class: File, path/location, filetype}]`. Example `hyphy-core-tests.yml:8-30`.
- **Paired / list:paired / list:list:paired**: nested `class: Collection` with `type: paired` inside `elements:`. Full pattern at `pox-virus-half-genome-tests.yml:17-38`:

  ```yaml
  class: Collection
  collection_type: list:paired
  elements:
    - class: Collection
      type: paired
      identifier: 20L70
      elements:
        - identifier: forward
          class: File
          location: ...
        - identifier: reverse
          class: File
          location: ...
  ```

- **CWL-style shorthand** — list of File dicts without identifiers (documented; not observed in sampled IWC).
- **`composite_data:`** — multi-file datatypes (e.g. imzml + ibd).
- **`tags:`** on elements (Galaxy 20.09+).
- **External job file** — `job: some_job.yml` (documented; rare in IWC).
- **Data-table / built-in-index refs** — the workflow input receives a plain string (e.g. `"hg38"`) matching a `.loc` entry. IWC CI mounts CVMFS via `test_workflows.yml:83` (`setup-cvmfs: true`) to make these resolvable. No special JSON/YAML form — it's just a string parameter.

### 2c. Output assertion shapes

Three patterns (documented at [test_format.html](https://planemo.readthedocs.io/en/latest/test_format.html); all observed):

1. **Exact file**: `file: test-data/expected.ext` — byte-for-byte or via `compare:` option.
2. **Checksum**: `checksum: "sha1$..."` (documented; not observed in sampled IWC).
3. **Structured `asserts:`** — content assertions (preferred by IWC for outputs &gt; 1 MB, per `workflows/README.md`).

**File-compare options:**

- `compare: diff` (default) + `lines_diff:` tolerance.
- `compare: sim_size` + `delta:` (bytes) or `delta_frac:` — size-only with slack. Used heavily in repeatmasking for non-deterministic RepeatModeler outputs: `RepeatMasking-Workflow-tests.yml:12-20` pairs each output with `compare: sim_size, delta: 30000`, up to `delta: 90000000` on a large Stockholm alignment.
- `compare: re_match` / `re_match_multiline`.
- `compare: contains`.

**`asserts:` vocabulary** (shared with tool XML `<assert_contents>` via `galaxy.tool_util.verify.asserts`; authoritative list in the Galaxy XSD at [galaxy/lib/galaxy/tool_util/xsd/galaxy.xsd](https://github.com/galaxyproject/galaxy/blob/dev/lib/galaxy/tool_util/xsd/galaxy.xsd)):

| Category | Assertions |
|---|---|
| Text | `has_text`, `not_has_text`, `has_text_matching`, `has_line`, `has_line_matching`, `has_n_lines` (with `delta:`) |
| Tabular | `has_n_columns` |
| Size | `has_size` (`value`, `min`, `max`, `delta`) |
| Archives | `has_archive_member` (regex path; nests assertions on member content) |
| HDF5 | `has_h5_keys`, `has_h5_attribute` |
| XML | `is_valid_xml`, `has_element_with_path`, `has_n_elements_with_path`, `element_text_matches`, `element_text_is`, `attribute_matches`, `attribute_is`, `xml_element` |
| JSON | `has_json_property_with_value`, `has_json_property_with_text` |
| Images | `has_image_width`, `has_image_height`, `has_image_channels`, `has_image_center_of_mass`, plus related |

Verify exact assertion names against the XSD before relying on them — the corpus-surfaced names (`has_image_width`/`has_image_height`/`has_size`) are confirmed; the broader image-assertion list is indicative, not audit-verified.

**Diverse `asserts:` examples from the corpus:**

- Content substring on HTML: `short-read-quality-control-and-trimming-tests.yml:25-28` — `has_text: text: "Filtered Reads"` against a MultiQC report.
- Exact-line check: `Preprocessing-...-Scanpy-tests.yml:97-100` — `has_line` with a tab-delimited literal.
- AnnData structure: same file, lines 27-32 — `has_h5_keys: keys: "obs/louvain"`.
- Image plots: same file, lines 33-42 — `has_size: size: 696399, delta: 60000` + `has_image_width`/`has_image_height` with `delta:` across ~15 PNGs.

### 2d. Collection output assertions

`element_tests:` keyed by element identifier; each value is the same assertion dict used for a single file; nested collections nest `element_tests:` recursively.

- List of JSONs: `hyphy-core-tests.yml:31-71` — four output collections (`meme_output`, `prime_output`, `busted_output`, `fel_output`), each keyed by gene identifier, each element asserting `has_text: text: "{"`.
- `list:paired`: `short-read-quality-control-and-trimming-tests.yml:31-43` uses `element_tests: pair: asserts: has_text: ...`.

Deeply nested (`list:list:paired`) collection assertions are legal but sparsely exemplified; planemo's [`_writing_collections.rst`](https://github.com/galaxyproject/planemo/blob/master/docs/_writing_collections.rst) is the de-facto reference.

### 2e. Not observed in IWC

- `expect_failure:` — IWC is happy-path only across the sampled files. Zero negative tests.
- Stray `md5:` assertions — the corpus-wide preference is `sim_size+delta` or content probes (`has_text`, `has_n_lines`).

---

## 3. IWC repository contract

Per `/Users/jxc755/projects/repositories/iwc/workflows/README.md:12-18` and sampled directories, every IWC workflow directory holds:

```
<category>/<workflow-name>/
├── <workflow-name>.ga              ← Galaxy native workflow (mandatory)
├── <workflow-name>-tests.yml       ← planemo tests file (mandatory, basename matches)
├── README.md                       ← narrative + Input/Output Datasets sections
├── CHANGELOG.md                    ← keepachangelog format, ISO dates
├── .dockstore.yml                  ← Dockstore 1.2 descriptor
└── test-data/                      ← optional: small fixtures + expected outputs
```

- `requirements.txt:3` pins `planemo>=0.74.5`.
- `.ga` front matter requires `a_galaxy_workflow: "true"`, `creator:` (Person with ORCID URI or Organization with URL — `consensus-from-variation.ga:4-10`), `license:`, `name:`, `release:` (e.g. `"0.4.3"`), `annotation:`. Optional: top-level `report: markdown:` (custom invocation report, `short-read-quality-control-and-trimming.ga:21-23`), embedded `readme:`.
- `CHANGELOG.md` + `release` are kept in lockstep by the repo-root `bump_version.py` helper. `### Automatic update` entries come from the weekly planemo-autoupdate bot (`workflows/README.md:231-247`).
- `ro-crate-metadata.json` is **not** stored in this repo — it's generated on merge by `workflows/gen_crates.py` and lands in the downstream `github.com/iwc-workflows/<name>` repo.

### 3a. Multi-workflow families in one directory

- **`hyphy/`** holds four workflows. `/Users/jxc755/projects/repositories/iwc/workflows/comparative_genomics/hyphy/.dockstore.yml:2-54` enumerates all four with distinct `name:` / `primaryDescriptorPath:` / `testParameterFiles:`. One `<wfname>.ga` + one `<wfname>-tests.yml` per workflow at directory root; shared `README.md`, shared `CHANGELOG.md`, shared `test-data/`. Per `workflows/README.md:217-221`, co-resident workflows must bump version in lockstep.
- **`repeatmasking/`** has one published workflow (`RepeatMasking-Workflow.ga`) and an orphaned second tests file (`Repeat-masking-with-RepeatModeler-and-RepeatMasker-tests.yml`) without a matching registered `.ga` — an example of legacy/alternate test harness residue.

---

## 4. Test data organization

Two storage patterns, often combined in one test case:

- **Remote via `location:`** for large inputs. Overwhelmingly **Zenodo** (persistent DOI):
  - `short-read-quality-control-and-trimming-tests.yml:13,17` — `https://zenodo.org/records/11484215/files/paired_r1.fastq.gz`
  - `Preprocessing-...-Scanpy-tests.yml:8-13` — `https://zenodo.org/record/3581213/files/...`
  - `Mass_spectrometry__LC-MS_...-tests.yml` — 11+ mzML files from `zenodo.org/record/10130758/files/`
  - `consensus-from-variation-tests.yml:6` — `https://zenodo.org/record/4555735/files/...`

  Also **EBI/ENA and SRA FTP** for virology-style raw reads: `pox-virus-half-genome-tests.yml:5` (EBI reference), `:27,:34,:48,:55` (SRA FTP fastq). Every remote `location:` is paired with a SHA-1 `hashes:` block for integrity.

- **In-repo `test-data/` via `path:`** for small fixtures and expected outputs.
  - Structured subdirs: `hyphy` uses `test-data/unaligned_seqs/`, `test-data/codon_alignments/`, `test-data/iqtree_trees/` (see `hyphy-compare-tests.yml:12,19,25`).
  - Element identifiers can contain pipes (`AB178040.1|2002`) and survive the YAML round-trip.

IWC convention ([workflows/README.md](https://github.com/galaxyproject/iwc/blob/main/workflows/README.md)): large inputs go to Zenodo; only toy data in-repo. Reviewers push back on large files committed in `test-data/`.

---

## 5. CI integration

**Important path note:** the file `/Users/jxc755/projects/repositories/iwc/.github/workflows/gh-build-and-test.yml` triggers only on `website/**` changes (it's the static-site Playwright E2E job). The real workflow-test CI lives at `/Users/jxc755/projects/repositories/iwc/.github/workflows/workflow_test.yml`.

Structure of `workflow_test.yml`:

- **Triggers** (L4-14): `push` and `pull_request`, ignoring `**/*.md`, `scripts/**`, `website/**`.
- **`setup` job** (L18-25) calls reusable `setup.yml`; pins `galaxy-branch: release_25.1`, `galaxy-fork: galaxyproject`, `max-chunks: 4`, `python-version: 3.11`. Uses [`galaxyproject/planemo-ci-action@v1`](https://github.com/galaxyproject/planemo-ci-action) (`setup.yml:86-94`) to run planemo's `ci_find_repos` logic against changed files and emit `repository-list` + `chunk-list` outputs.
- **`lint` job** (L28-58) runs planemo-ci-action in `mode: lint`, `workflows: true`, `additional-planemo-options: --iwc` (the `--iwc` flag toggles IWC-specific lint rules).
- **`test` job** (L60-73) calls reusable `test_workflows.yml`, which runs a matrix of **chunk × python-version** against a PostgreSQL service (`test_workflows.yml:53-61`). Each chunk runs planemo-ci-action in `mode: test` with `setup-cvmfs: true` (L83). `fail-fast: false` — chunks fail independently.
- **`combine_outputs`** (L75-117) downloads per-chunk artifacts, runs `mode: combine` (HTML + Markdown report + `$GITHUB_STEP_SUMMARY`), then `mode: check` to fail on any test failure.
- **`deploy`** (L120-160, main branch + galaxyproject org only) regenerates RO-Crates via `workflows/gen_crates.py`, then planemo-ci-action `mode: deploy, workflow-namespace: iwc-workflows` pushes each workflow to `github.com/iwc-workflows/<name>`.
- **`deploy-report`** (L162-182) posts a PR comment on deploy failure.
- **`determine-success`** (L184-192) — non-main PRs pass only when lint + combine_outputs succeed.

**Key properties:**
- Planemo-driven, shard-parallel (max 4 chunks).
- Galaxy runs **in-CI**, not against usegalaxy.*. Release pinned to `25.1`.
- CVMFS mounted in-runner for built-in indices / `.loc` lookups.
- Three merge gates: lint passes → tests pass → human reviewer approves.
- Post-merge auto-deploy: Dockstore (via `.dockstore.yml`), WorkflowHub, `iwc-workflows/<name>` mirror repo, LifeMonitor registration.

---

## 6. Planemo toolchain for workflows

Cross-referenced from [planemo.readthedocs.io](https://planemo.readthedocs.io/) + the [GTN FAQ](https://training.galaxyproject.org/training-material/faqs/gtn/gtn_workflow_testing.html) + the [workflow-fairification tutorial](https://training.galaxyproject.org/training-material/topics/galaxy-interface/tutorials/workflow-fairification/tutorial.html):

| Command | Purpose |
|---|---|
| `planemo test <workflow.ga>` | Run `-tests.yml` (auto-discovered by filename). Local Galaxy by default; `--galaxy_url` + `--galaxy_user_key` for remote. Outputs HTML / JSON / xUnit / JUnit. |
| `planemo run <workflow.ga> <job.yml>` | Execute without assertions. Supports `--engine external_galaxy`, `--profile`, `--download_outputs`, `--output_json`. |
| `planemo serve` | Launch local Galaxy preloaded with workflow tools. |
| `planemo workflow_lint` / `planemo lint --iwc` | Validate `.ga` / format2. `--iwc` adds IWC-specific rules (creator URI, license, release, connected inputs, labeled outputs). |
| `planemo workflow_test_init` | Scaffold a `-tests.yml`. With `--from_invocation <id>` it reconstructs job + outputs + `test-data/` from a completed invocation. |
| `planemo workflow_test_on_invocation <tests.yml> <id>` | Re-validate edited assertions against a saved invocation without re-running the workflow. Added to reduce the inner-loop cost of assertion iteration. |
| `planemo workflow_job_init` | Scaffold a `job.yml` template. |
| `planemo list_invocations`, `planemo invocation_download`, `planemo invocation_export`, `planemo rerun` | Post-hoc invocation tooling. |
| `planemo dockstore_init` | Generate `.dockstore.yml` for submission. |

The `--from_invocation` pattern is strongly preferred by IWC reviewers: generate the test from a real run on usegalaxy.*, don't hand-write it. See [help.galaxyproject.org/t/adding-galaxy-eu-workflow-to-iwc-library](https://help.galaxyproject.org/t/adding-galaxy-eu-workflow-to-iwc-library-planemo-installation/13903) and the workflow-fairification tutorial.

---

## 7. The `.ga` format and gxformat2

Two formats exist ([galaxyproject/gxformat2](https://github.com/galaxyproject/gxformat2), [v19_09 spec](https://galaxyproject.github.io/gxformat2/v19_09.html)):

- **Legacy `.ga`** — Galaxy-native JSON, verbose, not human-writable; what IWC commits.
- **Format 2** — human-writable YAML with `inputs:` / `steps:` / `outputs:`, structured `state:` instead of `tool_state`. Galaxy ingests both; gxformat2 round-trips. Ships `gxwf-lint`, `gxwf-viz`, `gxwf-abstract-export`, and Python / Java / TypeScript bindings (Schema Salad-generated).

Tests reference workflow inputs / outputs by **label**, not step index. That makes labeled inputs/outputs load-bearing — `planemo workflow_lint` enforces it. Renaming a labeled output in the `.ga` silently breaks its test unless `-tests.yml` is updated in the same commit.

Format2 adoption in IWC is slow — workflows stay committed as `.ga`; gxformat2 is used for linting / round-tripping (see [gxformat2#61](https://github.com/galaxyproject/gxformat2/issues/61)).

---

## 8. Scale of corpus (sampled)

Categories sampled: `read-preprocessing`, `comparative_genomics`, `virology`, `metabolomics`, `scRNAseq`, `repeatmasking`, `sars-cov-2-variant-calling`. Other categories present include `amplicon`, `bacterial_genomics`, `computational-chemistry`, `data-fetching`, `epigenetics`, `genome_annotation`, `genome-assembly`, `imaging`, `microbiome`, `proteomics`.

Every sampled workflow carries a `-tests.yml` sibling. Per `workflows/README.md:61-64`, contribution without tests is permitted but deprioritized; publication-to-usegalaxy is gated on tests passing.

---

## 9. Common shortcuts, gaps, anti-patterns

**Corpus-observed shortcuts:**

- **Existence-only content probes.** HyPhy family tests assert only that each output JSON starts with `{` (`hyphy-core-tests.yml:37-71`). Applies to 10+ statistical outputs across MEME/PRIME/BUSTED/FEL/CFEL/RELAX — "file exists and is valid-ish JSON," nothing about content correctness.
- **Size-only comparisons for non-deterministic outputs.** `RepeatMasking-Workflow-tests.yml:12-20` — every output reduced to `compare: sim_size, delta: 30000..90000000`. Correctness = "output is within ~30KB of expected size." Pragmatic for RepeatModeler but no semantic check.
- **Image tests check pixel dimensions, not content.** Scanpy clustering asserts `has_image_width` / `has_image_height` / `has_size` with 5-10% deltas across PNG plots — catches "something rendered" but not "correct plot."
- **Happy path only.** Zero `expect_failure:` in the sampled corpus.
- **Remote-data availability dependency.** Heavy Zenodo + EBI/SRA FTP usage. SHA-1 hashes guard against silent corruption but not against service outages — a Zenodo hiccup breaks CI across many IWC PRs simultaneously.
- **Big raw data in CI.** pox-virus pulls full SRA fastq.gz pairs every run; LCMS pulls 11+ mzML files. Beyond pip / planemo caches (`setup.yml:66-77`), no cross-run data cache.

**CI / environment gaps:**

- **CVMFS-gated tests are not portable.** Tests that require built-in indices need CVMFS mounted. Works in IWC CI (`test_workflows.yml:83`), fails on a plain developer laptop running `planemo test`. The corollary: contributors hit reference-genome / `.loc` mismatches when a required entry isn't in the mounted cache.
- **Pinned Galaxy version.** CI runs `release_25.1`. Regressions against `dev`/`main` Galaxy are invisible until the next release bump.
- **No per-test timeouts, no retry.** A hanging tool hangs the whole chunk until GHA's 6-hour hard limit.
- **Format2 lag.** `.ga` is the canonical committed form; format2 (gxformat2) is a lint/round-trip side-path. Format2-first workflows aren't first-class in IWC yet.

**Workflow-testing friction points:**

- **Intermediate step outputs can't be directly asserted** — they have to be promoted to workflow outputs first. Common contributor pain point.
- **Tests are coupled to output labels.** Renaming an output in the `.ga` silently breaks the sibling test.
- **Invocation iteration cost.** `planemo test` re-runs the whole workflow per change. `workflow_test_on_invocation` was added to iterate on assertions without re-running, but it's under-used.

**Common PR-review feedback (community / help threads):**

- Generate tests via `--from_invocation`, don't hand-write. [help.galaxyproject.org thread 13903](https://help.galaxyproject.org/t/adding-galaxy-eu-workflow-to-iwc-library-planemo-installation/13903).
- Replace locally-copied large inputs with Zenodo `location:` URLs before submitting.
- Set creator `identifier:` to a full ORCID URL — the most common lint failure. Enforced in [planemo#1458](https://github.com/galaxyproject/planemo/pull/1458).
- Don't use `compare: diff` on outputs that embed timestamps — switch to `has_text` / `has_n_lines` with `delta:`.
- Bump `release` in the `.ga` and add a `CHANGELOG.md` entry in the same PR — the IWC PR template enforces this; reviewers catch it via `bump_version.py`.

---

## 10. Implications for gxwf + review-nextflow skill development

1. **Assertion vocabulary is shared between workflows and tools.** The `asserts:` block is the same code path as tool XML `<assert_contents>`. Anything gxwf or a conversion skill emits can reuse the existing Galaxy XSD as the source-of-truth schema. This is a strong schema to target for JSON-schema-driven static validation.
2. **Tests reference inputs by workflow *label*, not index.** For any nf→Galaxy translation, the label discipline has to be preserved end-to-end — an unlabeled input in the translated `.ga` means its test becomes fragile / unspecifiable.
3. **`--from_invocation` is the preferred authoring path.** The equivalent story for gxwf-authored workflows should probably be: run on a Galaxy instance, capture the invocation, regenerate the tests file. The tooling already exists (`planemo workflow_test_init --from_invocation`); wrapping it into the gxwf workflow-authoring loop would match how humans actually do this.
4. **IWC's format is the contribution contract.** Anything intended to land in IWC must satisfy: directory layout + `-tests.yml` + `README.md` + `CHANGELOG.md` + `.dockstore.yml` + labeled inputs/outputs + creator ORCID + license + release. A review skill or conversion skill should audit against this checklist, not just against planemo lint.
5. **Test data strategy for generated Galaxy workflows.** Mirror IWC's Zenodo-first pattern; toy data only in `test-data/`. For nf→Galaxy translations, the nf-core test-datasets URLs (covered in [`COMPONENT_NEXTFLOW_WORKFLOW_TESTING.md`](./COMPONENT_NEXTFLOW_WORKFLOW_TESTING.md)) are already stable persistent URLs — they can be reused directly in the translated `-tests.yml`.
6. **`.nftignore` ↔ `compare: sim_size`+delta / filename-only assertions.** The Nextflow-side convention of excluding unstable files from snapshots maps naturally to the planemo convention of using tolerant assertions (`sim_size`+delta, `has_image_*`+delta, `has_n_lines`+delta) for the same outputs. A translator should preserve this mapping so translated tests aren't stricter than their source.
7. **CVMFS + built-in indices are a translation friction point.** Nextflow pipelines parameterize references via URLs in `test.config`; Galaxy workflows frequently use `.loc`-backed data tables resolved via CVMFS. A faithful translation needs to pick a lane — stay URL-driven (portable but slow), or switch to data-table driven (fast but requires CVMFS-aware CI).
8. **This document + the core-side vault note cover both layers.** Anything targeting "Galaxy workflow testing" should reference both. The core note covers `.gxwf.yml` internals; this note covers IWC + planemo contribution flow.

---

## Key paths and sources

**IWC corpus:**
- Repo root: `/Users/jxc755/projects/repositories/iwc/`
- Contribution contract: `workflows/README.md`
- CI entry point: `.github/workflows/workflow_test.yml` (NOT `gh-build-and-test.yml`, which is the website job)
- Reusable CI jobs: `.github/workflows/setup.yml`, `.github/workflows/test_workflows.yml`
- Version helper: `bump_version.py`
- Sample workflows cited:
  - `workflows/read-preprocessing/short-read-qc-trimming/`
  - `workflows/comparative_genomics/hyphy/`
  - `workflows/virology/pox-virus-amplicon/`
  - `workflows/metabolomics/lcms-preprocessing/`
  - `workflows/scRNAseq/scanpy-clustering/`
  - `workflows/repeatmasking/`
  - `workflows/sars-cov-2-variant-calling/sars-cov-2-consensus-from-variation/`

**External:**
- Primary spec: [planemo.readthedocs.io/en/latest/test_format.html](https://planemo.readthedocs.io/en/latest/test_format.html)
- Best practices: [planemo.readthedocs.io/en/latest/best_practices_workflows.html](https://planemo.readthedocs.io/en/latest/best_practices_workflows.html)
- Running workflows: [planemo.readthedocs.io/en/latest/running.html](https://planemo.readthedocs.io/en/latest/running.html)
- Assertion source of truth (Galaxy XSD): [galaxy/lib/galaxy/tool_util/xsd/galaxy.xsd](https://github.com/galaxyproject/galaxy/blob/dev/lib/galaxy/tool_util/xsd/galaxy.xsd)
- Galaxy verify module: [docs.galaxyproject.org lib/galaxy.tool_util.verify.html](https://docs.galaxyproject.org/en/latest/lib/galaxy.tool_util.verify.html)
- gxformat2 spec: [galaxyproject.github.io/gxformat2/v19_09.html](https://galaxyproject.github.io/gxformat2/v19_09.html)
- IWC workflows README: [github.com/galaxyproject/iwc/blob/main/workflows/README.md](https://github.com/galaxyproject/iwc/blob/main/workflows/README.md)
- IWC CI workflow: [github.com/galaxyproject/iwc/blob/main/.github/workflows/workflow_test.yml](https://github.com/galaxyproject/iwc/blob/main/.github/workflows/workflow_test.yml)
- planemo-ci-action: [github.com/galaxyproject/planemo-ci-action](https://github.com/galaxyproject/planemo-ci-action)
- Collections reference: [github.com/galaxyproject/planemo/blob/master/docs/_writing_collections.rst](https://github.com/galaxyproject/planemo/blob/master/docs/_writing_collections.rst)
- GTN FAQ on workflow tests: [training.galaxyproject.org/training-material/faqs/gtn/gtn_workflow_testing.html](https://training.galaxyproject.org/training-material/faqs/gtn/gtn_workflow_testing.html)
- GTN workflow-fairification: [training.galaxyproject.org/training-material/topics/galaxy-interface/tutorials/workflow-fairification/tutorial.html](https://training.galaxyproject.org/training-material/topics/galaxy-interface/tutorials/workflow-fairification/tutorial.html)
- Creator URI enforcement: [galaxyproject/planemo#1458](https://github.com/galaxyproject/planemo/pull/1458)
- Help thread on IWC submission: [help.galaxyproject.org/t/13903](https://help.galaxyproject.org/t/adding-galaxy-eu-workflow-to-iwc-library-planemo-installation/13903)
- gxformat2 adoption issue: [galaxyproject/gxformat2#61](https://github.com/galaxyproject/gxformat2/issues/61)

**Complementary internal note:**
- `/Users/jxc755/projects/repositories/galaxy-brain/vault/research/Component - Workflow Testing.md` — covers Galaxy core's `.gxwf.yml` / `test_workflows.py` layer (887 lines).

---

### Unverified / caveats

- Galaxy release pin "25.1" reflects the CI file at research time; minor versions drift.
- The full image-assertion list is taken from XSD search output and not individually page-verified — confirm assertion names against the XSD before emitting them programmatically.
- `has_n_bytes` as a distinct assertion is unverified; only `has_size` confirmed.
- Exact IWC corpus size (workflow count) was not enumerated in this pass — subagent sampled ~7 workflows across 7 categories; the full corpus spans at least 20+ categories.
