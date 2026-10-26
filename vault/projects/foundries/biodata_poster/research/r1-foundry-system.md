# R1 — Foundry System Inventory

Researched 2026-10-24 against `galaxyproject/foundry` `origin/main` @ **`bc79096`** (`bc7909600151a5cb2bc136921edf11c85d910595`, 2026-10-24 14:22 -0400, "Merge pull request #715"), after `git fetch`. `galaxyproject/foundry-pattern` `origin/main` @ **`98be1e2`** (2026-08-14; matches the GitHub API's head). All counts come from a `git archive` of `bc79096`, not from the local checkout. Unless a different repo is named, citations are `path @ sha` in `galaxyproject/foundry`.

Labels: **[V]** verified against the cited primary source today. **[I]** inferred from the sources. **[NF]** not found.

This document holds findings, not poster copy.

---

## Executive summary

- **"Seven pipelines" no longer matches `main`.** There are **13 Pipeline notes** today. On 2026-08-25/27 (`434cb89c`, `dcff227`) there were exactly 7, and those are the seven the abstract means. Since then six more landed: three `*→ WORKFLOW BRIEF` planning pipelines, `WORKFLOW BRIEF → GALAXY`, and two lifecycle pipelines (review and IWC maturation). The abstract's "seven" is accurate history, but it now undercounts. **Ask John** which framing the poster uses. [V]
- **The 2026-08-26 corpus figures reproduce exactly at `434cb89c` (2026-08-25), and all have grown since.** Under the same raw-file definitions: notes (`.md` under `content/`) 341 → **420**; Molds 47 → **56** (27 reviewed, 29 draft); CLI pages 32 → **36**; schemas 14 → **16**; cast skill dirs 54 → **69** (56 Mold casts + 13 pipeline harnesses); `eval.md` 36 → **51**; `scenarios.md` 32 → **46** (the last two count Mold and Pipeline files combined). Patterns are steady at **54**. The README's generated table uses different definitions (290 frontmatter notes; Mold-only 42 / 36). Both are in §1. [V]
- **Molds don't declare "exemplars" as a reference kind.** No `kind: example` reference appears in any of the 56 Molds. The declared kinds are `schema`, `cli-command`, `cli-tool`, `research`, `pattern` and `prompt`. IWC exemplars reach casts indirectly: pattern and research notes cite IWC workflow IDs, and `compare-against-iwc-exemplar` fetches live IWC at runtime. Ten Molds declare no references at all. Two of them, `summarize-paper` and `interview-to-freeform-summary`, are the entry Molds for the methods-section and interview demos. [V]
- **Worked example for the provenance figure: `discover-shed-tool`.** It is small, it is the Tool Shed leg of the oracle chain, and the Foundry already annotates it in `content/meta/cast-walkthrough.md`. That walkthrough is stale against the real `_provenance.json` (rev 4 / schema v2 versus rev 5 / schema v4), so cite the JSON. [V]
- **The oracle chain is real and typed, but it is "gxwf in two roles + galaxy-tool-cache + Planemo", not three independent programs.** Tool Shed discovery is the `gxwf tool-search` / `tool-versions` / `tool-revisions` subcommands. Every stage emits a schema'd, closed-status artifact (§4). Failures route two ways: *within a run*, through named buckets and the open-requirements ledger; *across runs*, through a feedback ledger, issue drafts, a Mold edit and a re-cast. [V]
- **Claim 7 has a clean, dated, public instance.** On 2026-06-17 an interview→Galaxy run on the UC1 MRSA case hit a false Tool Shed `miss` (`integron_finder`). It was written up in two refinement journals, fixed in the Mold and in `eval.md`, and re-cast in a single commit **`73af1f62`**, which changed the provenance `content_hash` from `256e3861…` to `2e5fa1f8…`. A second instance is the original summarize-nextflow loop of 2026-05-01 (`8008dfe2`), recorded in the now-retired `content/log.md`. [V]
- **Explicit incompleteness is a first-class artifact.** The **open-requirements ledger** carries obligations (`open` / `resolved` / `surrendered`, with a `blocking` grade), discoveries, decisions and proposed brief changes. A real end-to-end local run (nf-core/demo, 2026-10-16) finished with 7 open and 11 resolved obligations, 28 discoveries, 19 decisions, gxwf validate **pass**, Planemo **pass** on 1 of 3 cases, and a structured "fail" whose cause was a Planemo crash, not the workflow. That run is **unpublished**. [V local]
- **Planemo-green evidence that is public today:** 30 of 54 pattern pages carry `verification_paths` to checked-in workflows. CI runs `planemo test` on those against Galaxy `release_26.1`, and recent `main` runs are green. These are pattern-level verifications, not pipeline conversions. [V]
- **Karpathy lineage: neither repo mentions it.** `git log -S Karpathy` is empty in `foundry` and `foundry-pattern`. The only mentions are the abstract drafts in this vault. The structural lineage is concrete, though. The Foundry's `content/Index.md` catalog and its original `content/log.md` ("Append-only journal for `cast`, planned `lint`, `query`") mirror the gist's `index.md` / `log.md` and its ingest/query/lint operations. The extension is typed contracts plus a deterministic compile step with provenance. [V for artifacts, I for lineage]
- **Distribution is public and open.** There is one plugin, `foundry-skills` v0.2.0, with Claude Code, Codex and Antigravity manifests over the same `casts/claude/skills/` tree. It installs via `/plugin marketplace add galaxyproject/foundry`. The license is MIT (GitHub shows "Other" because of the vendored `LICENSES/`). The site is <https://galaxyproject.github.io/foundry/>, and seven `@galaxy-foundry/*` npm packages are published (all seven confirmed live with `npm view`). [V]

---

## 1. Corpus figures on current `main`

### 1.1 Headline counts

**The 2026-08-26 figures reproduce exactly at `434cb89c`** (`434cb89ca68296955430953901eef9b175bc07f8`, 2026-08-25 10:26, "Merge pull request #470"; first-parent on `origin/main`), using these raw-file definitions:
- **notes** = every `.md` under `content/`;
- **Molds** = directories in `content/molds/`;
- **CLI pages** = `.md` files under `content/cli/` (command pages plus per-tool `index.md`);
- **cast skills** = directories in `casts/claude/skills/` (Mold casts plus `pipeline-*` harnesses);
- **`eval.md` / `scenarios.md`** = Mold and Pipeline files **combined**.

I found these definitions with a first-parent `git ls-tree` sweep over 2026-07-15..08-28. The sweep shows 341 `.md` first appearing at `434cb89c` and 344–345 on 08-27/28. [V]

The project's own README table (`packages/build-cli/src/commands/generate-readme-stats.ts @ bc79096`) uses *different* definitions. It counts frontmatter notes by `type`, excludes `archived`, and counts `eval.md` / `scenarios.md` **for Molds only**. CI enforces it (`make check-generated`; `Packages` green on `bc79096`). Both columns are given below so neither definition is mistaken for the other.

| Figure | 2026-08-26 figure | Reproduced @ `434cb89c` (raw-file definition) | Now @ `bc79096`, same definition | Now @ `bc79096`, README/generator definition | Status |
| - | - | - | - | - | - |
| Notes | 341 | 341 `.md` | **420** `.md` | 290 frontmatter notes (277 typed + 13 refinement entries with no `type`); 130 `.md` have no frontmatter | V |
| Molds | 47 | 47 | **56** | 56 (27 reviewed, 29 draft) | V |
| Pipelines | 7 | 7 | **13** | 13 (3 reviewed, 10 draft) | V |
| Pattern pages | 54 | 54 | **54** | 54 (all draft) | V |
| CLI manual pages | 32 | 32 | **36** | 30 `cli-command` + 6 `cli-tool`. Per tool: gxwf 10, planemo 7, foundry 13, galaxy-tool-cache 4, cwltool 1, cwl-utils 1 | V |
| Schema notes | 14 | 14 | **16** | 16 (`content/schemas/*.md`; the JSON lives in packages) | V |
| Cast skills | 54 | 54 = 47 Mold + 7 pipeline | **69** = 56 Mold + 13 pipeline | (not reported) every Mold has a cast | V |
| `eval.md` | 36 | 36 = 33 Mold + 3 Pipeline | **51** = 42 + 9 | 42 (Mold only) | V |
| `scenarios.md` | 32 | 32 = 28 Mold + 4 Pipeline | **46** = 36 + 10 | 36 (Mold only) | V |
| Source-pattern pages | — | — | 7 | 7 | V |
| Research notes | — | — | 72 | 72 | V |
| Prompt notes | — | — | 5 | — | V |
| Meta (design) records | — | — | 18 (+ hand-curated `glossary.md`) | — | V |
| Refinement-journal entries | — | 12 | 13 | — | V |
| Verified pattern workflows | — | — | **30** (30 of 54 patterns carry `verification_paths`) | — | V |

Sources: `git ls-tree` on `434cb89c` and `bc79096`; `README.md` generated table @ `bc79096`, which agrees with the generator column.

Note: the generator's header comment records that the README once "said 45 Molds while 47 existed". That is why the README now generates its counts instead of stating them by hand. [V]

**Maturity caveat for the poster:** every pattern, research, schema and CLI note is `status: draft`. Only Molds (27 of 56), Pipelines (3 of 13) and meta records carry `reviewed`. [V]

### 1.2 Fixture corpus by real type

Source: `workflow-fixtures/fixtures.yaml @ bc79096`. Every entry is pinned to a commit SHA. The clones themselves are gitignored.

| Bucket | Count | Breakdown | Status |
| - | - | - | - |
| Nextflow pipelines | **26** | 16 `nf-core`, 10 `adhoc` | V |
| — by tier | | nf-core: 2 tiny, 10 small, 4 large (rnaseq 3.24.0, sarek 3.8.1, taxprofiler 2.0.0, eager untagged); adhoc includes `ncbi/egapx` v0.5.2 (large), `epi2me-labs/wf-human-variation`, `What_the_Phage` | V |
| CWL repositories | **12** | **9 `bio-workflow`** (EBI MGnify pipeline-v5, ga4gh_challenge, pitagora, GGR, h3agatk, Barski workflows, GDC dnaseq, GDC rnaseq, HuBMAP salmon-rnaseq); 1 `user-guide`, 1 `conformance` (cwl-v1.2), 1 `tool-library` (bio-cwl-tools) | V |
| IWC | 1 pinned clone | `galaxyproject/iwc` @ `deafc4876f2c` | V |

- The looser "38 pinned pipelines (16 nf-core / 10 ad-hoc / 12 CWL)" is exactly 26 + 12, so it is reproducible. But only **9 of the 12 CWL entries are real bioinformatics workflows**. The other three are a user guide, a conformance suite and a tool library. Honest phrasing: "26 Nextflow pipelines + 9 CWL workflow repos (+3 CWL reference corpora)". [V]
- **"120 curated Galaxy workflow skeletons": not reproducible on `main`.** The skeleton directory is gitignored, and no materialized copy exists in the Foundry checkout. A separate, older checkout `~/projects/repositories/workflow-fixtures` (last commit `24ee4d7`, 2026-04-28) has **120 `*.gxwf.yml` files under `iwc-format2/`**, and its `iwc-src` is at the same IWC SHA `deafc48` that is pinned today. So "120" is the cleaned **format2** IWC corpus at an April IWC snapshot, not "skeletons". [V count in that checkout, I identity]
- Committed artifact fixtures under `content/molds/*/examples/` total 66 files across 5 Molds (`review-galaxy-workflow` 44, `mature-galaxy-workflow-for-iwc` 10, `freeform-summary-to-workflow-brief` 8, `advance-galaxy-draft-step` 3, `nextflow-summary-to-workflow-brief` 1). Pipelines add 9 example files, including two real interview-derived `.ga` workflows under `content/pipelines/interview-to-galaxy/examples/` (UC1 MRSA, UC3 ATAC). `make check-fixtures` validates these. [V]

---

## 2. The pipelines: source → target, and their Molds

Spine source: the `phases:` frontmatter in `content/pipelines/<slug>/index.md @ bc79096`. Narrative: `content/meta/harness-pipelines.md @ bc79096` (rev 23, 2026-10-15). Each pipeline is also assembled into a harness skill at `casts/claude/skills/pipeline-<slug>/` (`SKILL.md` + `_assembly.json`). [V]

### 2.1 The original seven (what the abstract counts)

On 2026-08-27 (`dcff227`) these were the only seven. Six are tagged `journey/direct-build`; `update-interview-to-galaxy` is tagged `journey/existing-workflow`. [V]

| # | Pipeline | Source → target | Status | Mold phases, in order (`[loop]` / `[branch]` marked) |
| - | - | - | - | - |
| 1 | `nextflow-to-galaxy` | Nextflow → Galaxy gxformat2 | reviewed | summarize-nextflow → nextflow-summary-to-galaxy-reference-data → nextflow-summary-to-galaxy-interface → nextflow-summary-to-galaxy-data-flow → compare-against-iwc-exemplar → nextflow-summary-to-galaxy-template → **[loop]** advance-galaxy-draft-step → **[branch: test-data-resolution]** nextflow-to-test-data → find-test-data → user-supplied → nextflow-test-to-galaxy-test-plan → implement-galaxy-workflow-test → validate-galaxy-workflow → run-workflow-test → debug-galaxy-workflow-output |
| 2 | `cwl-to-galaxy` | CWL → Galaxy | draft | summarize-cwl → cwl-summary-to-galaxy-interface → cwl-summary-to-galaxy-data-flow → compare-against-iwc-exemplar → cwl-summary-to-galaxy-template → **[loop]** advance-galaxy-draft-step → **[branch]** cwl-to-test-data → find-test-data → user-supplied → cwl-test-to-galaxy-test-plan → implement-galaxy-workflow-test → validate-galaxy-workflow → run-workflow-test → debug-galaxy-workflow-output |
| 3 | `paper-to-galaxy` | Paper (methods) → Galaxy | draft | summarize-paper → freeform-summary-to-galaxy-interface → freeform-summary-to-galaxy-data-flow → compare-against-iwc-exemplar → freeform-summary-to-galaxy-template → **[loop]** advance-galaxy-draft-step → **[branch]** paper-to-test-data → find-test-data → user-supplied → freeform-summary-to-galaxy-test-plan → implement-galaxy-workflow-test → validate-galaxy-workflow → run-workflow-test → debug-galaxy-workflow-output |
| 4 | `interview-to-galaxy` | Expert interview → Galaxy | reviewed | interview-to-freeform-summary → freeform-summary-to-galaxy-interface → freeform-summary-to-galaxy-data-flow → compare-against-iwc-exemplar → freeform-summary-to-galaxy-template → **[loop]** advance-galaxy-draft-step → **[branch]** find-test-data → user-supplied → freeform-summary-to-galaxy-test-plan → implement-galaxy-workflow-test → validate-galaxy-workflow → run-workflow-test → debug-galaxy-workflow-output |
| 5 | `update-interview-to-galaxy` | Galaxy + interview → edited Galaxy | reviewed | summarize-galaxy-workflow → interview-to-galaxy-workflow-changeset → apply-galaxy-workflow-changeset → **[loop]** advance-galaxy-draft-step → changeset-to-galaxy-test-plan → implement-galaxy-workflow-test → validate-galaxy-workflow → run-workflow-test → debug-galaxy-workflow-output |
| 6 | `nextflow-to-cwl` | Nextflow → CWL | draft | summarize-nextflow → nextflow-summary-to-cwl-interface → nextflow-summary-to-cwl-data-flow → summary-to-cwl-template → **[loop]** summarize-cwl-tool / implement-cwl-tool-step / validate-cwl → nextflow-test-to-cwl-test-plan → implement-cwl-workflow-test → validate-cwl → run-workflow-test → debug-cwl-workflow-output |
| 7 | `paper-to-cwl` | Paper → CWL | draft | summarize-paper → freeform-summary-to-cwl-design → summary-to-cwl-template → **[loop]** summarize-cwl-tool / implement-cwl-tool-step / validate-cwl → **[branch]** paper-to-test-data → find-test-data → user-supplied → implement-cwl-workflow-test → validate-cwl → run-workflow-test → debug-cwl-workflow-output |

**Leaf Molds hidden inside the loop.** `advance-galaxy-draft-step` is a single phase, but its body sequences `discover-shed-tool` → (on miss) `author-galaxy-tool-wrapper` → `summarize-galaxy-tool` → `implement-galaxy-tool-step` → `gxwf draft-validate --concrete`, and it escalates to `repair-galaxy-draft-topology`. Source: `content/molds/advance-galaxy-draft-step/index.md @ bc79096`, Procedure steps 1–6. `_assembly.json` lists phases only, so a "Molds per pipeline" count must add these 5 leaves. [V]

**Composed paths** (`PAPER → CWL → GALAXY`, `NEXTFLOW → CWL → GALAXY`) are runtime compositions of two pipelines, not separate notes. See the `paper-to-galaxy` `harness_notes` and issue #200 cited in `harness-pipelines.md`. [V]

### 2.2 The six added after 2026-08-27

| Pipeline | Tags | Created | Phases |
| - | - | - | - |
| `galaxy-workflow-review` | `source/galaxy`, `lifecycle/review` | 2026-09-12 | summarize-galaxy-workflow → validate-galaxy-workflow → run-workflow-test → review-galaxy-workflow (read-only; emits an advisory report) |
| `galaxy-workflow-maturation` | `source/galaxy`, `target/galaxy`, `lifecycle/publication` | 2026-09-12 | summarize-galaxy-workflow → mature-galaxy-workflow-for-iwc → validate-galaxy-workflow → run-workflow-test |
| `paper-to-workflow-brief` | `source/paper`, `journey/plan` | 2026-09-17 | summarize-paper → freeform-summary-to-workflow-brief |
| `interview-to-workflow-brief` | `source/interview`, `journey/plan` | 2026-09-17 | interview-to-freeform-summary → freeform-summary-to-workflow-brief |
| `nextflow-to-workflow-brief` | `source/nextflow`, `journey/plan` | 2026-09-17 | summarize-nextflow → nextflow-summary-to-workflow-brief |
| `workflow-brief-to-galaxy` | `target/galaxy`, `journey/build-from-plan` | 2026-09-17 | workflow-brief-to-galaxy-interface → -data-flow → compare-against-iwc-exemplar → -template → **[loop]** advance-galaxy-draft-step → **[branch]** find-test-data → user-supplied → workflow-brief-to-galaxy-test-plan → implement-galaxy-workflow-test → validate-galaxy-workflow → run-workflow-test → debug-galaxy-workflow-output |

Sources: the respective `content/pipelines/*/index.md @ bc79096`. [V]

**Framing options [I]:**
- (a) "7 translation pipelines + 6 newer planning/lifecycle pipelines".
- (b) "13 pipelines".
- (c) "Seven source→target routes". Counting distinct source→target pairs today: Nextflow→Galaxy, CWL→Galaxy, Paper→Galaxy, Interview→Galaxy, Galaxy→Galaxy (edit), Nextflow→CWL, Paper→CWL. That is still 7, because the brief route is two halves of the same source→Galaxy trip.

Option (c) depends on two judgment calls. It excludes `galaxy-workflow-review`, whose output is an advisory report and so arguably a distinct target. It also folds `galaxy-workflow-maturation` into Galaxy→Galaxy. The plain fact is 13 Pipeline notes on `main`, and 7 in late August. John's call.

---

## 3. Worked example: one Mold and its compiled skill

### 3.1 The Mold: `discover-shed-tool`

Source: `content/molds/discover-shed-tool/index.md @ bc79096`, `revision: 5`, `status: reviewed`, `axis: target-specific`, `target: galaxy`. Last content commit `70fa943e`. [V]

**Declared output contract:**

```yaml
output_artifacts:
  - id: galaxy-tool-pin
    kind: json
    schema: "[[galaxy-tool-discovery]]"
    description: "(owner, repo, tool_id, version, changeset_revision) pin … plus discovery classification."
```

**Declared references** (5 of them, with 3 dispatch behaviours):

| kind | ref | load | mode | evidence | purpose (abridged) |
| - | - | - | - | - | - |
| cli-command | `[[tool-search]]` | on-demand | sidecar | corpus-observed | search the Tool Shed for candidate wrappers |
| cli-command | `[[tool-versions]]` | on-demand | sidecar | corpus-observed | list versions for a candidate |
| cli-command | `[[tool-revisions]]` | on-demand | sidecar | corpus-observed | resolve a version → installable changeset |
| schema | `[[galaxy-tool-discovery]]` | upfront | verbatim | **cast-validated** | validate the hit / weak / miss recommendation |
| research | `[[component-tool-shed-search]]` | on-demand | verbatim | corpus-observed | Tool Shed indexing caveats |

Every on-demand ref carries a `trigger` (the load condition). The body is a 5-step procedure: search → triage → resolve version → resolve changeset → classify and emit. The closed output status is `hit | weak | miss`, and the output is validated by `validate-galaxy-tool-discovery` before return. [V]

**Schemas.** The Mold declares one schema. **Command contracts.** It declares three gxwf CLI pages. **Exemplars.** It declares none. This is true of every Mold: no reference uses `kind: example` (script count over all 56 frontmatters @ `bc79096`). The kind exists in `reference_contract.yml` ("Fixture or exemplar copied verbatim"), and the glossary calls it "authored vocabulary the caster declines", but no Mold uses it. For claim 3, exemplars enter as `pattern` and `research` refs that cite IWC IDs, plus runtime IWC fetches by `compare-against-iwc-exemplar`. A Mold richer in exemplars for a figure is `nextflow-summary-to-galaxy-template`: 20 refs (10 research, 4 pattern, 2 schema, 2 cli-command), revision 10. [V]

### 3.2 The compiled skill: `casts/claude/skills/discover-shed-tool/`

Bundle @ `bc79096`: `SKILL.md`, `_provenance.json`, `_verify.json`, `_required_tools.json`, `_feedback.md`, `references/cli/{tool-search,tool-versions,tool-revisions}.json`, `references/notes/component-tool-shed-search.md`, `references/schemas/galaxy-tool-discovery.schema.json`. Last touched in `e104dfde` (2026-10-23, "Pin cast bundles to the schema their validator carries"). [V]

**Provenance record**, from `_provenance.json @ bc79096` (excerpt; hashes truncated):

```json
"provenance_schema_version": 4,
"cast_target": "claude",
"mold": { "name": "discover-shed-tool", "revision": 5,
          "content_hash": "05c99cba…", "commit": "63a3f9cf…" },
"cast_at": "2026-09-13T20:58:27Z",
"refs": [
  { "kind": "cli-command", "mode": "sidecar", "src": "content/cli/gxwf/tool-search.md",
    "dst": "references/cli/tool-search.json",
    "src_hash": "cdf8be42…", "dst_hash": "72f5f7cc…", "source": "deterministic" },
  { "kind": "research", "mode": "verbatim",
    "src": "content/research/component-tool-shed-search/index.md",
    "src_hash": "37d96e36…", "dst_hash": "37d96e36…", "source": "deterministic" },
  { "kind": "schema", "mode": "verbatim",
    "src": "package://@galaxy-foundry/gxwf-foundry#galaxyToolDiscoverySchema",
    "src_hash": "c0940fc0…", "dst_hash": "c0940fc0…", "evidence": "cast-validated" }
  …
],
"artifacts": { "produces": [ { "id": "galaxy-tool-pin", "schema": "[[galaxy-tool-discovery]]" } ] }
```

What the provenance record shows [V]:
- **A sidecar transforms its source.** Its `src_hash` and `dst_hash` differ because the markdown CLI page is compiled into JSON.
- **A verbatim copy proves itself.** Its `src_hash` equals its `dst_hash`.
- **Schemas are pulled from a package export**, written as `package://…#export`, so a package bump shows up as a hash change.
- **Every ref is `source: deterministic`.** Schema v4 admits no other value. No LLM runs in the cast step (`content/meta/glossary.md`, "Casting").

**Verification contract**, from `_verify.json`: the output `galaxy-tool-pin` is checked by `foundry validate-galaxy-tool-discovery --schema-sha256 c0940fc0… {artifact_path}`. That pins the validator to the same schema hash the bundle ships. **Required tools**, from `_required_tools.json`: `gxwf` from `@galaxy-tool-util/cli ^1.14.0`, with an `npx` fallback. [V]

**Drift caveat.** `content/meta/cast-walkthrough.md @ bc79096` (rev 2, 2026-07-30) still describes this bundle at `revision: 4`, "schema v2" and commit `8fed7f9…`. It also omits `_feedback.md`. The JSON above is authoritative; the walkthrough's narrative still holds. [V]

**Figure-ready contrast** [V]: `summarize-nextflow`'s cast carries `validation_results[]` with a real recorded run: `runs/nf-core__demo/summary.json`, validated by `validate-summary-nextflow`, status `passed`, exit 0. That gives "provenance includes checks that ran", whereas `discover-shed-tool` validates at runtime only.

---

## 4. How the validation loop is wired

### 4.1 The chain, stage by stage

| Stage | Program | Where invoked | Structured artifact (closed states) | Source | Status |
| - | - | - | - | - | - |
| Tool Shed discovery and pinning | `gxwf tool-search` / `tool-versions` / `tool-revisions` (remote Tool Shed via TRS); `galaxy-tool-cache add` caches the pin | `discover-shed-tool`, inside `advance-galaxy-draft-step` step 2 | `galaxy-tool-pin.json`: `status: hit \| weak \| miss`, plus `(owner, repo, tool_id, version, changeset_revision)` | `content/molds/discover-shed-tool/index.md` | V |
| Per-step loop oracle | `gxwf draft-next-step` | `advance-galaxy-draft-step` step 1 | `draft: true/false` and the next step id | `content/molds/advance-galaxy-draft-step/index.md` | V |
| Per-step validation | `gxwf draft-validate --concrete --strict-state --json` | `advance-galaxy-draft-step` step 6 | JSON diagnostics → 3 failure buckets (§4.2) | same | V |
| Computability check (not gxwf) | open-requirements ledger | `advance-galaxy-draft-step` step 5 | a new `open` + `blocking` entry → escalate to `repair-galaxy-draft-topology` | same; `content/research/open-requirements-ledger/index.md` | V |
| Terminal structural validation | `gxwf validate` (`--json`, optionally `--connections --strict`) | `validate-galaxy-workflow` | `galaxy-workflow-validation-result.json`: `status: pass \| fail \| not-run`, `diagnostics[]` (each with the phase it routes back to), `residual_runtime_risks[]` | `content/molds/validate-galaxy-workflow/index.md` | V |
| Test static check | `gxwf validate-tests` | `run-workflow-test` step 1 | (blocks before Planemo) | `content/molds/run-workflow-test/index.md` | V |
| Runtime | `planemo test` (Planemo-managed Galaxy by default; no `--galaxy_branch` pin) | `run-workflow-test` | `workflow-test-result.json`: `status: pass \| fail \| test-definition-missing \| not-run`, invocation/history/workflow ids, failure modality, and the single "next reference surface" | same | V |
| Triage | — | `debug-galaxy-workflow-output` | debug report that classifies the failure surface first (job / invocation / collection / missing output / assertion) | `content/molds/debug-galaxy-workflow-output/index.md` | V |

Two things the "three independent programs" framing should not obscure [I]:
- Tool Shed discovery and structural validation are **both gxwf** (TypeScript `@galaxy-tool-util/cli`). Discovery queries the live Tool Shed; validation checks against cached tool metadata.
- The design-time/run-time split is stated in the KB itself: "Design time: `gxwf` … Run time: Planemo" (`content/meta/harness-pipelines.md`, "Runtime tooling").

The project's stated validation posture is "schema, not caveats". gxwf replaces the prose caveat lists that earlier prior-art skills carried (`content/meta/glossary.md`, "Validation posture"; `harness-pipelines.md`). [V]

### 4.2 Where a structured failure goes

**Within a run** [V], per `content/molds/advance-galaxy-draft-step/index.md` § "Failure routing":
1. A local defect (sentinel violation, wrong port name, bad `state`) re-enters `implement-galaxy-tool-step` with the diagnostic.
2. A wrapper-choice mismatch backs out to discovery and either re-discovers or authors a wrapper.
3. An earlier-step defect is flagged to the user. The loop does not unwind on its own.
4. Beyond those three buckets: a green-validating but uncomputable step is found through the ledger and goes to bounded topology repair. Each escalation must strictly reduce the open-blocker count, under a hard cap, or the entry is surrendered.

At the terminal stage, `validate-galaxy-workflow` diagnostics name the authoring phase to return to. A red Planemo result goes to `debug-galaxy-workflow-output`. The debug Mold forbids weakening an assertion unless the relaxation is an accepted IWC shortcut (step 5).

**Across runs: the feedback ledger** [V]. With `--feedback` on, the harness initializes `foundry-feedback.ledger.yml`. The artifact is registered in `runtime_artifacts.yml @ bc79096`, and all 13 assembled pipelines expose the `feedback` option (each `_assembly.json` lists it; e.g. `pipeline-nextflow-to-galaxy` has `options: [use-subagents, checkpoint, feedback]`). Skills append observations keyed by a canonical locator (path + content hash). The terminal Mold `report-foundry-run-feedback` (created 2026-08-25) clusters those observations, checks them against current `main`, searches for duplicate issues, and writes local issue drafts. Filing is a separate confirmed step. All drafts target `galaxyproject/foundry` (`content/molds/report-foundry-run-feedback/index.md`).

**What one looks like in the wild** [V]:
- Issue **galaxyproject/foundry#673** (2026-10-12, "Posted by an AI assistant on scottcain's behalf") is a structured feedback report from an nf-core/rnaseq run. It covers three locators, evidence per phase, and named open-requirement ids closed in a later phase. [V] That this shows use outside the core team rests only on that attribution line. [I]
- The local nf-core/demo run (§6) logged **33** feedback entries: 7 major and 26 minor, with subjects spread across Molds, research notes, CLI pages, schemas, patterns and related projects.

### 4.3 Public, CI-backed Planemo evidence

`.github/workflows/verification-workflows.yml @ bc79096` runs `planemo lint` and `planemo test --galaxy_branch release_26.1` on every `verification/workflows/**/*.gxwf.yml`. There are **30** such workflows, each tied to a pattern page through `verification_paths`. Recent push runs on `main` succeeded (2026-10-22: `a9df7b4`, `c2406d4`, `19199fe`). That makes 30 pattern-level "Planemo-green" claims in CI. These are not translated pipelines. [V]

---

## 5. "Update knowledge, recompile" (claim 7): real instances

### 5.1 Primary instance: a false Tool Shed miss, fixed and re-cast in one commit

1. **Observed.** On 2026-06-17, an `/test-pipeline interview-to-galaxy` re-run on UC1 MRSA mobile-AMR reached a deferred `integron_finder` step. `gxwf tool-search integron_finder` returned no hits, while `integron finder` scored 34.60 against the existing `iuc/integron_finder` wrapper (changeset `5429646e486d`, 2.0.5+galaxy1). The false `miss` would have sent the loop down the expensive wrong branch: authoring a wrapper that already exists. Source: `content/molds/advance-galaxy-draft-step/refinements/2026-06-17-uc1-mrsa-interview-galaxy-rerun.md @ bc79096` (`decision: open-question`).
2. **Knowledge updated.** `content/molds/discover-shed-tool/refinements/2026-06-17-tool-id-query-normalization.md` (`decision: eval-add`) records three changes: a new §1 step, "normalize a tool-id-shaped need before searching"; a strengthened caveat; and a new `eval.md` property, "a miss survives query-variant normalization".
3. **Recompiled.** Commit **`73af1f62`** (authored 2026-06-17, committed 2026-06-18, an ancestor of `origin/main`) touches the Mold `index.md`, `eval.md`, both refinement journals, the cast `SKILL.md` and `_provenance.json`. In the provenance record `mold.content_hash` went from `256e3861…` to `2e5fa1f8…` and `cast_at` was refreshed. The commit message ends "Surfaced by /test-pipeline interview-to-galaxy UC1 MRSA re-run." [V]

Nuance [V]: `cast_history` got **no new entry** for this re-cast; it still ends at rev 5, 2026-05-07. The Mold `revision` field also stayed at 4 in that commit. The content hash is the reliable change signal; the human-readable history lags.

### 5.2 Origin instance: the first summarize-nextflow loop (2026-05-01)

Commit **`8008dfe2`** (2026-05-01, "First summarize-nextflow cast: hand-cast loop against demo + bacass") ran the skill on nf-core/demo and nf-core/bacass. It logged every gap in `content/log.md` (tags `gap:nextflow-{pipeline-anatomy,containers-and-envs,testing}`) and grew schema rev 1→3, Mold rev 2→4 and cast rev 1→3 together. The log reports the effect: on demo, warnings fell 8 → 2, and 9 of 13 logged gaps became schema-captured. These numbers are self-reported in the log, from a single toy pipeline, and are not an extraction-fidelity measurement. Source: `content/log.md @ 94ad76d2^`. The current `_provenance.json` `cast_history` revs 2–3 cite the same loop. [V]

`content/log.md` **no longer exists on `main`**. It was retired in `94ad76d2` (2026-08-28, "Retire the unused global operations log"), and its roles moved to `scenarios.md`, the refinement journals, per-Mold `changes.md` and the feedback ledger. RESEARCH_GOALS still calls it "the history", but on current `main` the history is `content/molds/*/changes.md`, `refinements/`, and `cast_history` / `git log`. [V]

### 5.3 Supporting instances

- **`content/molds/summarize-nextflow/changes.md @ bc79096`** has 18 revisions, each with a concrete trigger, for example:
  - rev 16 fixed profile parsing across the 26-pipeline corpus. `changes.md` self-reports before/after correctness counts, but the oracle is unstated. That makes them **not poster-grade** under the RESEARCH_GOALS extraction-fidelity rule (`nextflow inspect` or a hand-labeled set only). Use rev 16 as a claim-7 instance, not as a number;
  - rev 15 fixed comment-aware parsing, pinned against an `ncbi/egapx` case (#485).
- **Commit `0457a1ba`** (2026-09-08) bumped the `summary-nextflow` schema. The changed schema was re-copied into every cast that ships it, so several `references/schemas/summary-nextflow.schema.json` files and many `_provenance.json` files change in one commit. That shows one knowledge edit fanning out across skills. [V]

---

## 6. Explicit incompleteness: what a gap list looks like

### 6.1 The mechanism

The **open-requirements ledger** (`open-requirements.ledger.yml`) is defined in `content/research/open-requirements-ledger/index.md @ bc79096` (rev 5, 2026-10-19) and summarized in `content/meta/glossary.md`. [V] Its contents:
- `entries[]`: obligations with `status: open | resolved | surrendered`, a `blocking` grade, `raised_by` / `resolved_by` (Mold names), `missing` and `unmet`;
- `discoveries[]` and `decisions[]`;
- `brief_change_recommendations[]`, which only an expert edit can accept;
- `topology_repair: { escalations, cap, open_history }`, the convergence budget.

The Mold rule: Molds **append** entries and **mark resolved** the ones they close. An entry nothing can close stays visible as `surrendered`; it is never deleted. The brief-driven pipelines require the harness to list open questions "low-confidence first" at Done (`content/pipelines/workflow-brief-to-galaxy/index.md` `harness_notes`).

### 6.2 A real gap list (local, unpublished run)

Run: `~/projects/foundry-runs/demo-qc-trim/demo-qc-trim-galaxy/`, a git repo at **`f54711f`** ("close run: record and ledger complete"). Pipeline `workflow-brief-to-galaxy`, source nf-core/demo, run 2026-10-16 23:07Z to 2026-10-17 02:37Z, status `complete`. Source `foundry-run.yml`. **Not in any public repo.** [V local]

- **Ledger:** 18 obligations (11 resolved, 7 open, 0 blocking), 28 discoveries, 19 decisions, 1 proposed brief change. The open obligations, by id, with the Mold that raised each:
  - `skip-trim-output-absence-semantics` (interface)
  - `samplesheet-run-identifier-convention` (interface)
  - `sample-name-charset-narrowing` (interface): the source allows any `^\S+$` name, Galaxy element identifiers are narrower
  - `mapover-nested-paired-or-unpaired-shape` (data-flow)
  - `mixed-paired-or-unpaired-path-no-corpus-precedent` (compare-against-iwc-exemplar): "IWC @ b80bc927 has 0 uses of paired_or_unpaired or sample_sheet"
  - `mixed-endedness-expect-failure-test` (template)
  - `seqtk-trimfq-source-snapshot-agreement` (template)
- **Oracle results:**
  - `gxwf validate --json --connections --strict` passed: tool state 8 ok / 0 fail, connections 8 ok / 0 invalid / 3 skip. The 3 skips are listed as `residual_runtime_risks`, not claimed as verified.
  - `planemo test` (0.75.47, managed Galaxy): case 1 **PASS**. Case 2 had **no verdict** because Planemo crashed (TypeError on skipped `expression.json` leaves). Case 3, an expect-failure test, was "not planemo-runnable". The overall `status: fail` carries a note placing the fault in Planemo, not the workflow.
  - The debug report offers three repair options (R1–R3), pending a user decision.
- **Expert review step:** `../review.md`. The reviewer is John, who made six decisions on the brief's open questions.

Pointer only, for R3 / ask John: `~/projects/repositories/foundry-paper` holds per-trajectory `open-requirements.ledger.yml` and `foundry-run.yml` files for its rnaseq and atacseq conversions (under `workflows/{rnaseq,atacseq}/trajectories/*/`). These are probably the strongest real gap lists in existence, but they are sensitive. Contents were not read or copied here.

Caveat: nf-core/demo is a toy pipeline (FastQC + trim). It illustrates the *shape* of a gap list, not a biology result. Two sibling local runs exist: `bacass-sr-assembly` and `dengueseq-denv3(-direct)`, dated 2026-10-16..20. R2 should assess them. [V existence, NF assessment]

### 6.3 In-repo, public gap examples

- `casts/claude/_emulated-runs/salmon-rnaseq-cwl-galaxy-5step/run-summary.md @ bc79096` runs `cwl-to-galaxy` phases 1–5 against HuBMAP salmon-rnaseq (`2f77bcf`). It has per-check ✅/⚠/❌ verdicts. One example: a nested-workflow `when:` and `pickValue` "absent from the summary". It is also a **CWL demo candidate** for R2. Note the run is *emulated* and stops at the template: no Planemo. [V]
- `content/molds/review-galaxy-workflow/examples/with-foundry-context/open-requirements.ledger.yml` is a hand-authored **fixture**, not a run. It is useful for a clean figure with one `surrendered` and one `open` entry. [V]

---

## 7. Karpathy LLM-wiki lineage

- **Not named in either repo.** `git log --all -S Karpathy` / `-S karpathy` returns nothing in `foundry` or `foundry-pattern`, and `git grep -i 'llm wiki'` on both `main`s also returns nothing. The only mentions are this vault's abstract drafts (`../biodata_abstract/abstract-b1-artifact-and-oracle.md`, `abstract-b3-deliverable.md`). `../biodata_abstract/README.md` (polish pass 2026-08-28) already flags the eponym as weak because the abstract says neither *how* the pattern is extended nor what it is. [V]
- **Karpathy's pattern**, from the gist `karpathy/llm-wiki.md`, created 2026-04-04 (<https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f>, fetched 2026-10-24): an LLM-maintained markdown wiki between immutable raw sources and the user, with a schema file (CLAUDE.md/AGENTS.md) and three operations, ingest, query and lint. It also keeps an `index.md` catalog (one-line summary per page) and an append-only `log.md`. [V external]
- **Where the Foundry visibly descends from it** [V artifacts, I lineage]:
  - The Foundry's first commit is `fc49964f` (2026-04-30), 26 days after the gist.
  - `content/Index.md` is a generated catalog of every note with a one-line `summary` (on `main` since `f4e1de50`, 2026-05-02).
  - `content/log.md` existed from the first commit `fc49964f`. It opened with "Append-only journal for `cast`, planned `lint`, `query`", which is the gist's operations with `ingest` replaced by `cast` (`@ fc49964f` and `@ 94ad76d2^`).
  - `AGENTS.md`/`CLAUDE.md` serve as the schema file.
  - Raw sources stay upstream ("URL-not-mirror": `content/meta/corpus.md`; "keep upstream systems authoritative": `README.md`).
- **What "extends" concretely means** [I, grounded in `content/meta/comparisons.md` Part A, rev 5]:
  - (1) Wiki pages become **typed notes under a strict zod contract**, so lint becomes a CI gate (`npm run validate`, `make check`).
  - (2) A Mold is a **typed manifest of which pages one action needs**.
  - (3) A **deterministic compile step** ("cast") turns that selection into a frozen agent skill with a hash-level **provenance** record.
  - (4) The output of each skill is checked by **external validators**, not by the LLM.

  `comparisons.md` frames this as "compile-time grounding with provenance" versus runtime retrieval, and contrasts it with "just put it in a wiki" ("the casting step is what a wiki lacks": `foundry-pattern` `content/case/05-comparisons.md @ 98be1e2`).
- **One-sentence gloss (draft, for John):** "Karpathy's LLM wiki is a markdown knowledge base that agents maintain and read. The Foundry adds a schema-checked note contract and a compiler that turns selected pages into frozen, provenance-stamped skills whose outputs external tools verify." [I]

---

## 8. Distribution

| Item | Finding | Source | Status |
| - | - | - | - |
| Plugin | `foundry-skills` **v0.2.0**, one tree `casts/claude/` with three manifests: `.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`, `plugin.json` (Antigravity) | those files @ `bc79096` | V |
| Marketplace | `.claude-plugin/marketplace.json` → name `galaxy-workflow-foundry`, plugin source `./casts/claude` | @ `bc79096` | V |
| Claude Code install | `/plugin marketplace add galaxyproject/foundry` → `/plugin install foundry-skills@galaxy-workflow-foundry` → e.g. `/foundry-skills:discover-shed-tool` | `README.md` | V |
| Codex install | `codex plugin marketplace add galaxyproject/foundry` → `codex plugin add foundry-skills@galaxy-workflow-foundry` | `README.md` | V |
| Antigravity | `git clone …` then `agy plugin install foundry/casts/claude` | `README.md` | V |
| "Claude is the only cast target" | The README says so, but this does not conflict with the three manifests: there is one cast format (Agent Skills `SKILL.md`), read by three runtimes; a second *target* would need `casts/<target>/_target.yml` | `README.md` "Status" | V |
| Skills shipped | 69: 56 Mold skills + 13 `pipeline-*` harness skills | `casts/claude/skills/` | V |
| License | Root `LICENSE` is **MIT** (© 2026 John Chilton); vendored third-party content is under `LICENSES/` (Apache-2.0 for CWL and nf-schema, MIT for others). GitHub's license detector reports **"Other"**, presumably because of `LICENSES/` | `LICENSE`, `LICENSES/README.md`; `gh repo view` | V / I cause |
| Repo | <https://github.com/galaxyproject/foundry>, public, created 2026-04-29, 4 stars | `gh repo view` | V |
| Site | <https://galaxyproject.github.io/foundry/> (GitHub Pages; deploy green on `bc79096`); install page `/usage/` (Codex manifest homepage) | `gh api …/pages`; `gh run list` | V |
| Pattern site | <https://galaxyproject.github.io/foundry-pattern/>, public | `gh repo view galaxyproject/foundry-pattern` | V |
| npm | Published with Changesets and OIDC provenance: `@galaxy-foundry/summarize-nextflow` 0.4.0, `gxwf-foundry` 0.3.0, `gxwf-foundry-note-schema` 0.4.0, plus `gxwf-pi-harness`, `nfcore-tool-lab`, `planemo-cli-meta`, `planemo-test-report-schema` (versions from `package.json`; `build-cli` is private) | `npm view`; `packages/*/package.json`; `docs/development/publication.md` | V (3 checked live) |
| Other Foundries | `foundry-pattern` lists sibling instances (statistical-genomics, topological-data-analysis) that consume the published `@galaxy-foundry/*` packages | `foundry-pattern` `content/instances/*.md @ 98be1e2` | V |

---

## 9. Candidate figures and diagrams

1. **System panel, "KB → Mold → Cast → Provenance".** Adapt `foundry-pattern` `content/pattern/the-model.md`. Its figure already reads "01 source of truth / 02 one action / 03 cast / 04 lineage record". Overlay the real counts from §1.1.
2. **Annotated bundle tree for `discover-shed-tool`.** Mold frontmatter on the left (5 typed refs), bundle tree on the right. Draw arrows labelled `sidecar` (hashes differ) and `verbatim` (hashes equal), and tag the `_verify.json` validator with its schema SHA. Source: §3.
3. **Subway map of `nextflow-to-galaxy`.** 13 stations with the `[loop]` station expanded into its 5 leaves, plus the discover-or-author diamond and the test-data chain. The site already renders this (`PipelineBody.astro` / `PhaseGraph.astro`). A screenshot could work.
4. **Route matrix, sources × targets.** Rows: Nextflow, CWL, Paper, Interview, Galaxy. Columns: Galaxy, CWL, Workflow Brief. Fill the cells with pipeline names, which shows the "seven routes" reading (§2.2) honestly.
5. **Oracle-chain swimlane.** Tool Shed (gxwf) → draft-validate (gxwf) → validate (gxwf) → planemo test. Each box shows its closed status set, with failure arrows labelled by bucket going back to the Mold that repairs. Add a second, slower loop: feedback ledger → issue → Mold edit → re-cast.
6. **Claim-7 timeline (one row).** 2026-06-17 run → refinement journal → `73af1f62`: `index.md` + `eval.md` + re-cast, `content_hash 256e…→2e5f…`. Show the actual diff lines of the §1 normalization rule.
7. **Gap-list card.** Render a ledger as a checklist: resolved ✓, open ○, surrendered ✗, with the `topology_repair` budget bar. Use either the fixture (§6.3) or the demo-qc-trim run (§6.2, ask John).
8. **Corpus strip.** 26 Nextflow (16 nf-core / 10 ad-hoc) + 9 CWL workflow repos pinned by SHA; IWC pinned at `deafc48`; 30 Planemo-verified pattern workflows in CI.

---

## 10. Open questions

1. Poster count: "7 pipelines", "13 pipelines", or "7 routes"?
2. Claim 3 says Molds "declare exemplars", but none do as a ref kind. Reword to "cite corpus exemplars", or add `example` refs before the poster?
3. OK to cite the local `foundry-runs/demo-qc-trim` run (unpublished)? Or publish it first?
4. Use the corpus figures "as of `bc79096`, 2026-10-24", or re-count closer to print (Oct 28)?
5. "120 skeletons": drop it, or restate as "120 IWC format2 workflows @ IWC `deafc48`"?
6. CWL count: say 9 workflow repos, not 12?
7. Fix `cast-walkthrough.md` drift (rev 4 / v2) before the QR code points people at it?
8. Should `cast_history` be appended on content-hash re-casts (`73af1f62`), so the provenance trail tells the claim-7 story without git?
9. Karpathy: keep the eponym plus the §7 gloss, or drop it? The repos never cite him.
10. Mention external use (#673, scottcain) on the poster? That needs his OK.
11. Bump the plugin version (0.2.0) before the poster QR code? The README says installed plugins cache by version.
12. The GitHub license shows "Other". Is it worth a fix so the "open (MIT)" claim reads cleanly?
