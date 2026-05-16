# NF-Core Modules → Galaxy Tools

Plan for an IUC-shaped repository that converts nf-core modules into Galaxy tool wrappers, reviewed largely by Claude / Foundry-cast skills.

Two halves:

1. **Infrastructure plan** — the new repo, CI (planemo + deterministic lint hooks), local-skill review, Foundry molds that drive it.
2. **Tooling roadmap** — wave-based selection, high-value first, deferring hard cases.

---

## 1. Strategic Frame

- **Foundry stays the KB / skill source.** Patterns, molds, prompts, schemas, casts. Not a tool-distribution surface.
- **New repo is the IUC-shaped distribution surface.** Repo: `jmchilton/nfcore-compat-tools`. Hosts the actual `tool.xml` / `macros.xml` / `test-data/` per tool, runs planemo, publishes to Tool Shed under owner `jmchilton` (or a dedicated tool-shed owner once an org graduates).
- **Coexists with IUC; no dedup gate.** nf-core-derived wrappers expose the Nextflow process interface in a regular, mechanical way (meta-map handling, `meta.single_end` paired/single-end branching, the `task.ext.args` additional-options bag, nf-test-derived fixtures). IUC wrappers expose hand-curated Galaxy interfaces for the same upstream tools. Same tool, different interface contract — not duplicates. Don't try to detect or block overlap.
- **Foundry casts the converter + reviewer.** New molds emit Claude skill bundles, run locally during conversion and pre-merge review (no Claude-driven CI step yet).
- **Corpus-grounded.** Every conversion cites an nf-core source SHA; every test reuses or maps an nf-test fixture; every container/requirement traces to `environment.yml` or the `container` directive.

## 2. XML vs YAML — Decision

**Recommend XML.** UDT YAML (`GalaxyUserTool`, `[[author-galaxy-tool-wrapper]]`) is for ad-hoc user tools and remains in the Foundry as one path. Tool Shed distribution requires XML.

Reasons:
- IUC, Tool Shed, planemo lint, planemo test, macros.xml reuse, citations block, version_command, conditional input grammar, repeat/section grouping, output discovery rules, datatype dispatch — all XML-native and battle-tested.
- `[[galaxy-xsd]]` is vendored; planemo's lint already enforces it. We get a free correctness gate.
- IUC has thousands of XML wrappers worth of idiom; a YAML start can't reuse that corpus as ground truth.
- LLM XML generation is harder than YAML, but the XSD + planemo lint loop closes that gap. Same shape as the Foundry's existing "schema, not caveats" posture.

YAML stays useful for:
- Quick spike on a hard tool before committing to a full XML wrapper.
- Internal IR if we later add a YAML-to-XML compiler. Not on the critical path.

The new repo accepts XML only. The existing UDT path keeps its niche.

## 3. New Repository

### Layout (mirrors `tools-iuc`)

```
tools/<name>/<name>.xml          # primary wrapper
tools/<name>/macros.xml          # tool-local macros
tools/<name>/test-data/          # rare; only when a remote URL fixture won't fit (see §3 Test data)
tools/<name>/.shed.yml           # Tool Shed metadata
tools/<name>/_provenance.yml     # NEW — nf-core source SHA, conversion mold version, reviewer signoff
data_managers/                   # later
.github/workflows/pr.yaml        # planemo-ci-action on changed tools
.github/workflows/ci.yaml        # weekly global lint+test
CONTRIBUTING.md                  # human + agent onboarding
AGENTS.md                        # how the cast skill is consumed
```

### `_provenance.yml` — new file per tool

Contract: every tool wrapper points back at the upstream module it was derived from. Survives nf-core churn; signals when a refresh is due. The `nfcore_source` block mirrors `nf-core/modules`'s own `modules.json` shape — `git_sha`, `branch` — so nf-core readers find familiar fields. (`nf-core-tools/nf_core/modules/modules_json.py:27–31`.)

```yaml
nfcore_source:
  modules_repo: nf-core/modules         # mirrors modules.json: per-module entry
  module_path: modules/nf-core/fastp
  branch: master                        # modules.json field
  git_sha: <sha at conversion time>     # modules.json field — the canonical "version" of the module
  meta_yml_hash: <sha256 of meta.yml at conversion>
  main_nf_hash:  <sha256 of main.nf at conversion>
  environment_yml_hash: <sha256 of environment.yml at conversion>
  test_datasets_sha: <sha pinning nf-core/test-datasets URLs in <test> blocks>
generated:
  by_mold: convert-nfcore-module-to-galaxy-tool   # our analog to modules.json `installed_by`
  mold_revision: <semver>
  cast_target: claude
  cast_artifact_sha: <sha of cast bundle used>
  on_date: 2026-05-09
overrides:
  # any human edit beyond the cast output
  - reason: "..."
    files: ["fastp.xml"]
review:
  reviewer: claude-cast/review-galaxy-tool-pr@<sha>
  signoff_at: 2026-05-09T12:00:00Z
  unresolved: []
```

A drift checker compares current upstream hashes vs `_provenance.yml` and opens an issue when an nf-core module has moved past the pin.

### Versioning

Three orthogonal concerns, tracked in different places:

| Concern | Source | Where it lives |
|---|---|---|
| Upstream tool version | `environment.yml` bioconda pin (`bioconda::fastp=0.23.4`) | `<tool_version>` in tool XML; matches IUC convention |
| Module pin | nf-core/modules git SHA (no per-module semver — modules evolve at HEAD per `nf-core-tools/nf_core/modules/lint/module_version.py:15–29`) | `_provenance.yml.nfcore_source.git_sha` |
| Wrapper iteration | XML wrapper changes that don't move the bioconda pin | `+galaxyN` build tag |

Tool XML version string: **`<bioconda_version>+galaxy<N>`**, strict IUC convention. Don't embed the nf-core/modules SHA in the version string — Tool Shed `version_compare` expects the IUC shape and every other Galaxy wrapper follows it. The SHA lives in `_provenance.yml`.

`+galaxyN` bumps for *any* wrapper-only change, including:

- refresh to a newer module SHA where the bioconda pin didn't move,
- pure XML idiom fix (lint-driven changes, citation updates, help-text edits),
- pattern updates applied retroactively across a tool family.

Runtime version sink: nf-core's `versions:` channel idiom in `main.nf` (e.g., `eval('fastp --version 2>&1 | sed ...')`) maps to Galaxy's `<version_command>` — see pattern `nfcore-versions-emit-to-galaxy-version-command.md`.

### Test data — remote URLs, not lifted fixtures

Galaxy 23.1+ tool XML supports a `location` attribute (`xs:anyURI`) on `<param>` and `<output>` elements inside `<test>` blocks. We pin to `nf-core/test-datasets` raw GitHub URLs at a SHA — no fixture lift, no LFS, no `test-data/` bloat. The framework downloads, caches in `GALAXY_TEST_DATA_REPO_CACHE`, and (optionally) verifies a `checksum="<algo>$<hex>"`.

Evidence in galaxy:
- XSD: `lib/galaxy/tool_util/xsd/galaxy.xsd:1869–1879` (test param `location`), `:2100–2112` (test output `location` + `checksum`), `:5118–5156` (`<default>` collection element `location`, 23.2).
- Implementation: `lib/galaxy/tool_util/verify/interactor.py:1194–1227` (`test_data_download_from_location` — local first, remote fallback, cache, checksum check).
- Output comparison: `lib/galaxy/tool_util/verify/__init__.py:646–652`.
- Worked example: `test/functional/tools/remote_test_data_location.xml`.

```xml
<test>
  <!-- location-only: filename inferred from URL basename -->
  <param name="reads_1"
         location="https://raw.githubusercontent.com/nf-core/test-datasets/&lt;pinned_sha&gt;/data/genomics/sarscov2/illumina/fastq/test_1.fastq.gz"/>
  <param name="reads_2"
         location="https://raw.githubusercontent.com/nf-core/test-datasets/&lt;pinned_sha&gt;/data/genomics/sarscov2/illumina/fastq/test_2.fastq.gz"/>
  <!-- value + location: local-first, remote fallback (rare; only when a tool authors a small fixture in test-data/ but wants a remote backup) -->
  <param name="adapters" value="adapters.fa"
         location="https://raw.githubusercontent.com/nf-core/test-datasets/&lt;pinned_sha&gt;/data/delete_me/adapters.fa"/>
  <!-- output with sha256 checksum -->
  <output name="trimmed"
          file="trimmed.fastq.gz"
          location="https://raw.githubusercontent.com/nf-core/test-datasets/&lt;pinned_sha&gt;/data/genomics/sarscov2/illumina/fastq/test_trimmed.fastq.gz"
          checksum="sha256$&lt;hex&gt;"/>
</test>
```

Conventions:

- **Pin to a SHA, not a branch.** `nf-core/test-datasets` uses per-pipeline branches; only a SHA pin survives upstream churn. Pin lives in `_provenance.yml.nfcore_source.test_datasets_sha`.
- **`checksum="sha256$..."` on outputs.** Belt + suspenders even with content-addressed URLs (caches can be stale or poisoned).
- **`test-data/` is the exception**, not the default — only used when a remote URL won't do (locally-trimmed fixtures, fixtures we author, anything LFS-bound).
- **Modes the framework supports**: `location` alone, `value + location`, and `location + checksum`.

### Containers — match upstream

Mirror the upstream module's container choice. The Galaxy `<requirements>` block declares `package` + `version` matching `environment.yml` exactly; bioconda → BioContainers → singularity-at-`depot.galaxyproject.org` is the same resolution chain nf-core's `biocontainers/...` branch hits, so the runtime image is the same byte stream. This is what `lint-container-parity` enforces.

Where nf-core's `container` directive uses a multi-package mulled image (seqera mulled or `community.wave.seqera.io/library/...`), the Galaxy wrapper declares the same multi-package set in `<requirements>` so bioconda mulled-resolution produces an equivalent image. Don't substitute a hand-picked container source — bioconda parity with the upstream module is the contract. Document any forced divergence in `_provenance.yml.overrides`.

### Macros — per-tool, no shared cross-family macros

Each tool's `macros.xml` lives next to its `tool.xml`. There is no top-level `macros/` directory and no cross-family shared macros — nf-core modules are self-contained, and this repo follows that structure. Revisit only if a concrete duplication pain emerges across multiple converted tools.

### License

MIT, propagated from nf-core. Each `tool.xml`'s `<citations>` block plus the repo `LICENSE` carry MIT; double-check per-tool upstream licenses (some bundled binaries ship under non-MIT terms — record divergences in `_provenance.yml.overrides`).

### CI stack

- **`pr.yaml`**: identical scaffolding to `tools-iuc/.github/workflows/pr.yaml`. `planemo-ci-action`, chunked test matrix, planemo lint, planemo test against `release_26.0`. No invention here.
- **`ci.yaml`**: weekly global lint + test, identical to IUC.
- **No automated Claude review in CI** — the `review-galaxy-tool-pr` skill is a local pre-merge tool (see §5), not a GH Action. Build up the Mold + cast, run locally, revisit CI integration once the skill's signal is well-calibrated.
- **Custom lint hooks** beyond planemo (deterministic; no LLM):
  - `lint-provenance` — `_provenance.yml` exists, hashes resolve, `git_sha` exists in `nf-core/modules`, `test_datasets_sha` exists in `nf-core/test-datasets`.
  - `lint-container-parity` — Galaxy `<requirements>` package + version matches `environment.yml`. Or document why diverged.
  - `lint-test-parity` — every `<test>` block references an nf-test fixture (by `location` URL or matching `test-data/` filename) or has a documented why-not.

### Tool Shed publication

- Per-tool `.shed.yml`, owner = `jmchilton` (revisit if a dedicated Tool Shed account graduates).
- Use IUC's existing publication automation pattern (planemo shed_update on tag).
- Versioning: see §3 *Versioning* — `<bioconda_version>+galaxy<N>`, IUC shape; module SHA tracked in `_provenance.yml`.
- `categories`: pick from existing Tool Shed categories matching `meta.yml.keywords` heuristics.

## 4. Foundry Side — New Molds, Patterns, References

### New molds (proposed slugs)

Two molds. Earlier drafts had six; the rest are dropped as YAGNI:

- `summarize-nfcore-module` → **dropped**. The convert mold reads the module dir directly. (`[[summarize-nextflow]]` summarizes whole pipelines, not single modules — wrong granularity.)
- `lift-nfcore-test-fixture` → **dropped**. Obviated by remote `location` URLs (§3 Test data).
- `validate-galaxy-tool` → **dropped**. Thin wrapper over `planemo lint` / `planemo test`; CLI direct.
- `discover-iuc-duplicate` → **dropped**. The new repo coexists with IUC by design (§1); nf-core-shaped wrappers and IUC-curated wrappers serve different interface contracts for the same upstream tool. No dedup gate.

The kept molds:

- `convert-nfcore-module-to-galaxy-tool` — `target: galaxy`, output XML. Twin of `[[author-galaxy-tool-wrapper]]` for the nf-core-module-shaped input. Reads the module dir directly (`main.nf`, `meta.yml`, `environment.yml`, optional `tests/` and `tests/main.nf.test`). References: `[[galaxy-xsd]]`, the new pattern stubs (channel-input, meta-map, task.ext.args, versions, stub-block), `content/cli/planemo/lint.md` + `test.md`, `[[component-nf-core-module-conventions]]`, `[[component-nextflow-containers-and-envs]]`. Emits `<test>` blocks with remote `location` URLs pinned to the nf-core/test-datasets SHA recorded in `_provenance.yml`.
- `review-galaxy-tool-pr` — `axis: target-specific`, runs over a tool PR diff. Dimension-by-dimension critic. Cast to a local Claude skill, run by reviewer / merger pre-merge (no GH Action — see §5).

### New schema packages

- `packages/galaxy-tool-pr-review-schema` — structured reviewer output shape (consumed by the local skill's renderer; not posted by CI).

### New CLI manual pages

- `content/cli/planemo/lint.md`, `content/cli/planemo/test.md` — cited by the convert mold (lint compliance is part of the brief) and by review dimension #8. (`[[planemo]]` is glossary-defined; the manpages are the cited content.)

### New / extended pattern pages

- `nfcore-channel-input-to-galaxy-collection.md` — single-process variant of the existing samplesheet patterns. Process expects `tuple(meta, path)` → Galaxy `data` or `data_collection` input depending on cardinality.
- `nfcore-meta-map-to-galaxy-params.md` — meta-map keys that don't survive as channel data (id, single_end, …) become string/select params, not collection metadata.
- `nfcore-task-ext-args-to-galaxy-additional-options.md` — nf-core's escape hatch (`task.ext.args`) maps cleanly to a Galaxy "Additional command-line options" text param. Document the policy: don't expand into per-flag inputs unless the upstream tool's CLI is short enough to enumerate.
- `nfcore-versions-emit-to-galaxy-version-command.md` — every nf-core module emits versions; Galaxy's `<version_command>` is the natural sink.
- `nfcore-stub-block-to-galaxy-noop-test.md` — the `stub:` block has no Galaxy analog; document the intentional drop.

### New prompts

- `nfcore-conversion-reviewer.md` — multi-dimension review prompt for `review-galaxy-tool-pr`.

(`xml-tool-structured` / `xml-tool-critic` were proposed as XML twins of speculative `custom-tool-*` prompts and dropped as YAGNI; the convert Mold's body + the `[[galaxy-xsd]]` reference + planemo-lint feedback loop carry the same load.)

### Cast targets

- `claude-skill` (already planned). The review mold casts here for now — local invocation only.
- `gh-action-review-bot` → **deferred**. Skipping the GH Action means no Anthropic-API-on-CI packaging is needed yet. Revisit once the local skill's signal is calibrated.

## 5. Local Review — Dimensions

The `review-galaxy-tool-pr` skill is run **locally** by the reviewer / merger before merge — not by CI. It produces a structured report with these dimensions, each scored `pass | warn | fail | n/a` plus rationale:

1. **Provenance integrity** — `_provenance.yml` exists, hashes match upstream, pinned SHA reachable.
2. **Parameter parity** — every `task.ext.args`-able flag the upstream tool exposes is either: a Galaxy param, the additional-options bag, or documented as intentionally hidden.
3. **Command-line fidelity** — the rendered Galaxy command, given the test inputs, matches the rendered Nextflow `script:` block on the same conceptual fixture, modulo path differences.
4. **Output discovery** — every `output:` channel from `main.nf` has a Galaxy `<data>` / `<collection>` (or documented drop, e.g., `versions.yml`).
5. **Container / requirement parity** — Galaxy `<requirements>` versions match `environment.yml`. Container directive's BioContainers branch present and reachable.
6. **Test parity** — at least one `<test>` block consumes an nf-test fixture by remote `location` URL pinned to the `_provenance.yml` test_datasets_sha; output `<output location=… checksum=sha256$…>` where feasible. Assertions concrete (file size, key tokens, format match), not just `has_text=" "`.
7. **XML idiom** — `planemo lint` clean. Profile set. `<citations>` present (DOI from `meta.yml`). `<help>` non-empty. `detect_errors="exit_code"` unless commented otherwise.
8. **Pattern compliance** — meta-map handling, paired/unpaired branching, versions emit, additional-options bag — all consistent with the relevant Foundry patterns.
9. **Scope fit** — the wrapper isn't trying to fold a subworkflow's worth of logic into one tool. Subworkflows are out of scope (separate `nfcore-subworkflow-to-galaxy-workflow` Mold, not in this plan).

Reviewer output schema is the source of truth for the GH PR comment renderer; the comment is a deterministic projection of the JSON.

## 6. Conversion Flow (per module)

Per-module flow is short enough to describe in prose; not promoted to a Foundry pipeline note (YAGNI — pipelines exist for whole-source-to-target journeys, not per-tool conversion).

1. Run the cast `convert-nfcore-module-to-galaxy-tool` skill against the module dir. Emits XML + `_provenance.yml` + remote-URL `<test>` blocks.
2. Run `planemo lint` then `planemo test` locally; iterate inside the cast skill until clean.
3. Run the cast `review-galaxy-tool-pr` skill against the resulting diff (local, pre-merge).
4. Open the PR (`gh pr create`).

Per-tool is the unit; cross-tool batching is harness/scripting concern, not a Foundry pipeline.

## 7. Wave Strategy

Goal: ship Wave 1 fast to validate plumbing; pull subsequent waves in only as the reviewer's failure modes shrink.

### Selection heuristics

A module is **easy** if all of:

- `main.nf` script body < ~50 lines, no Groovy conditionals beyond a single ternary.
- single `tuple(meta, path)` input, ≤ 2 outputs (one main + versions).
- `environment.yml` has 1 (or 1-mulled) bioconda package.
- nf-test snapshot has `task.ext.args == ''` default and a deterministic primary output (sortable text, JSON, BAM, etc.).
- `meta.yml` ontologies populated (cleanly maps to Galaxy datatypes).

A module is **medium** if any of:

- multi-input (e.g., reads + reference index).
- optional outputs with `optional: true`.
- paired/single-end branching driven by `meta.single_end`.
- needs a Galaxy `<conditional>` due to mode-discriminated args.
- nf-test depends on a non-trivial fixture from `nf-core/test-datasets`.

A module is **hard** if any of:

- complex `task.ext.args` patterns with conditional script logic the wrapper would need to replicate.
- emits a directory output (Galaxy lacks directory datasets — see [[nf-schema-samplesheet-galaxy-gaps]] §W6).
- depends on Galaxy data tables (built-in references, .loc files) — wrapping requires data-manager too.
- meta.yml drift from main.nf, requiring upstream PR before conversion.
- consumes or emits sample sheets — interface promotion, not a single-tool concern.
- module is a thin wrapper around a subworkflow (treat as workflow conversion, not tool conversion).

### Wave 1 — bootstrap, ~30 tools

Goal: prove the loop works on the simplest end of the corpus.

Probable picks (single-input, single-main-output, simple flags):

- `seqkit/*` (subset): `seqkit/grep`, `seqkit/replace`, `seqkit/sort`, `seqkit/stats`.
- `samtools/*`: `samtools/index`, `samtools/faidx`, `samtools/dict`, `samtools/stats`.
- `bcftools/index`, `bcftools/stats`.
- `mash/sketch`, `mash/screen`.
- `mosdepth`.
- `nanoplot`, `pycoqc` — single-input QC tools.
- `agat/*` (subset) — many small subcommands, similar shape.
- `multiqc`.

Process check: each Wave 1 PR runs the full pipeline, contributor + reviewer run the local review skill before merge, human merges. Track:

- mold success rate (passed without human intervention).
- planemo lint pass rate on first cast.
- planemo test pass rate on first cast.
- reviewer false-positive rate per dimension.

These metrics drive what Wave 2 looks like.

### Wave 2 — multi-input, conditionals, paired-aware, ~60 tools

Add modules with:

- reads + reference index (`star/align`, `bowtie2/align`, `bwa/mem`, `salmon/quant`).
- mode discriminators (`samtools/sort` output format).
- paired/single-end branching from `meta.single_end`.
- optional outputs (e.g., `fastp`-shaped tools).

Foundry deliverables before Wave 2:

- `nfcore-meta-single-end-to-paired-conditional` pattern.
- `nfcore-mode-discriminator-to-galaxy-conditional` pattern.

### Wave 3 — hard / deferred

- modules emitting directory outputs (collect upstream Galaxy work needed; do **not** force a wrapper that lies about its output shape).
- modules depending on `meta` keys we can't promote (custom keys, pipeline-specific identifiers).
- modules that need a data-manager (referenced data ingested into Galaxy data tables). Plan a sibling `data_managers/<tool>` per IUC convention.
- complex `task.ext.args` with embedded Groovy logic — escape hatch as a free-text Galaxy param + heavy `<help>`. Pattern page: `nfcore-task-ext-args-to-galaxy-additional-options` covers the simple version; document deviations here.
- subworkflow-shaped modules — explicitly out of scope.

### Long tail

After Wave 3, the residual question becomes: **what is Galaxy missing that nf-core has?** Feed each refusal into the Foundry's existing roadmap items (see W1–W7 in `[[nf-schema-samplesheet-galaxy-gaps]]`). Tool conversion gets us most of the way; the remaining ~5% drives Galaxy core / gxformat2 features.

## 8. Phased Rollout (calendar)

### Phase 0 — Plumbing (1–2 weeks)

- Foundry: write `convert-nfcore-module-to-galaxy-tool` Mold. Reads the module dir directly; references the new pattern stubs and planemo CLI manpages.
- Foundry: stub the 5 nf-core→Galaxy pattern pages (§4) and `content/cli/planemo/{planemo-lint,planemo-test}.md`. Bodies flesh out as the Mold drives convergence.
- Cast the convert Mold for `target: claude`. Smoke-test locally against ~3 hand-picked nf-core modules (one trivial, one paired-aware, one with a conditional) — produce tool.xml + macros.xml + `_provenance.yml`, run `planemo lint` + `planemo test` against remote-URL `<test>` fixtures.
- Create `jmchilton/nfcore-compat-tools`. Mirror `tools-iuc/.github/workflows/{pr,ci}.yaml`. `planemo-ci-action` baseline test. Add the custom lint hooks from §3 (provenance, container-parity, test-parity). Land the 3 smoke-tested wrappers as the first commits.

#### Phase 0 progress (2026-05-10)

Foundry artifacts now in-tree on branch `module_farm`:

- `content/molds/convert-nfcore-module-to-galaxy-tool/index.md` — full Mold draft, 9 typed references, 10-step procedure.
- `content/patterns/nfcore-{channel-input-to-galaxy-collection,meta-map-to-galaxy-params,task-ext-args-to-galaxy-additional-options,versions-emit-to-galaxy-version-command,stub-block-to-galaxy-noop-test}.md` — 5 stub patterns.
- `content/cli/planemo/planemo-{lint,test}.md` — 2 stub manpages.

Validates clean (0 errors, 18 warnings — same as baseline). Pattern bodies are scaffolding only; they flesh out next as the Mold drives convergence.

### Phase 1 — Wave 1 (4–6 weeks)

- Run convert skill locally against ~30 Wave 1 candidates. Open PRs.
- Author `review-galaxy-tool-pr` Mold + cast to local `claude-skill`. Reviewers run the skill locally, paste / link the report on the PR. Track reviewer false-positive rate and conversion miss patterns; feed Phase 2 via `/refine-mold` runs.
- Capture refinement journal entries; track mold success rate, planemo lint pass rate, planemo test pass rate.

### Phase 2 — Wave 2 (8–12 weeks)

- Expand prompts and patterns for paired/conditional/multi-input modules.
- First Tool Shed publish run: pick 5 fully-clean Wave 1 tools, push under owner `jmchilton`; verify install on a usegalaxy-pasteur-like instance.
- Calibrate the local reviewer's thresholds: which dimensions warrant a hard "do not merge" call vs "warn". Revisit whether any of those gates are deterministic enough to graduate into a CI lint hook (rather than the LLM review).

### Phase 3 — Wave 3 + maintenance (open-ended)

- Decide per hard case: convert with documented loss, defer until Galaxy core lands a feature, or refuse.
- Set up the upstream-drift checker (Phase 0's `_provenance.yml` exists by now). Weekly cron opens "refresh fastp from nf-core SHA <new>" issues.
- Refresh process becomes its own minor Mold: `refresh-galaxy-tool-from-nfcore-sha` — a delta version of the conversion pipeline that re-runs from a new pin and surfaces only changed sections.

## 9. Risk

- **Container drift.** Bioconda pin in nf-core's `environment.yml` may lag behind broader Galaxy / IUC usage. Provenance file makes drift visible; local-review dimension flags it.
- **Remote test fixture availability.** SHA-pinned `raw.githubusercontent.com` URLs depend on GitHub being up at planemo-test time. Mitigation: framework caches in `GALAXY_TEST_DATA_REPO_CACHE` after first fetch; CI cache the dir between runs. Document fallback (drop a trimmed copy into `test-data/` with `value + location`) for tools where reliability matters.
- **Reviewer hallucination.** Local cast skill produces authoritative-sounding misreads. Mitigation: every reviewer claim cites a file path + line; reviewer rejects its own report if a citation doesn't resolve. Local invocation means reviewer human is in the loop on every report rather than CI auto-posting.
- **Mold revision churn.** Fixing a reviewer dimension changes Mold output for past-converted tools. `_provenance.yml.generated.mold_revision` records the contract; refreshes are explicit, not implicit.

---

## 10. What This Plan Does Not Cover

- nf-core **subworkflow** translation (different shape; addressed by the existing `nextflow-to-galaxy` pipeline at workflow scale, not module scale). The boundary is the formal one: `meta.yml`'s `components:` field — a module that lists components is composing other modules and is out of scope here.
- nf-core **pipeline** translation (full `[[nextflow-to-galaxy]]` pipeline; out of scope here).
- Translating Galaxy tools **back** to nf-core modules (no demand surfaced).
- Bidirectional IUC-nfcore drift bot (downstream concern).
- Web UI / dashboard for the new repo (downstream concern).
