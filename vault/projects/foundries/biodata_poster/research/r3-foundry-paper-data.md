# R3 — Anton's replication data (`foundry-paper`), read-only assessment

> [!WARNING]
> **Sensitive. Internal use only.** `nekrut/foundry-paper` is a **private** GitHub repo with no
> license (verified with `gh repo view`, 2026-10-24). This file summarizes and points. It
> reproduces no result tables, figures, agreement statistics, correlations, or DE/peak counts.
> The only counts here are structural: trajectories, tool-step kinds, and commit dates. The
> galaxy-brain site renders `vault/projects/**` sub-files, so check with John before committing.
> Galaxy server IDs, private atlas URLs and host paths are deliberately left out.

- **Repo state read:** `~/projects/repositories/foundry-paper`, `origin/main` @ `c1c9bcf6`
  (2026-10-24, fetched; clean, equal to the checkout). There are 284 commits from 2026-10-17 to
  2026-10-24. All are by `nekrut` except one README edit by Björn Grüning (`30809421`).
- **Cross-checks:** foundry `origin/main` @ `bc790960` (2026-10-24). `galaxyproject/agentic-plugins`
  clone (fetched). `gh` reads of galaxyproject/galaxy, foundry and iwc.
- **Tags:** **[V]** verified from a primary artifact, **[I]** inferred, **[NF]** looked for and not
  found.
- **Path convention:** `fp:` = `foundry-paper/`, `fo:` = `foundry/` at the stated SHA.

## 1. Executive summary

- **Scope.** foundry-paper holds three kinds of material:
  - a literature and candidate assessment of published nf-core use (frozen 2026-10-15);
  - **two** converted pipelines, **nf-core/rnaseq 3.13.2** (5 trajectories) and **nf-core/atacseq
    2.1.2** (10 trajectories);
  - one paper replication per pipeline.

  No other workflow has a directory. Sarek appears only as a *replication candidate* in the
  candidate report, never as a conversion. EGAPx appears only as an existing ToolShed wrapper in
  server tool listings. There is no CWL, methods-section or expert-interview target. **[V]**
- **Maturity.** Both pipelines reached "all trajectories pass" by the repo's own criteria. Planemo
  assertions passed, and scientific-core agreement held against pinned containerized nf-core runs
  on upstream fixtures. All of it is less than a week old, and most of it was redone on
  2026-10-24. **[V]**
  - The RNA "Generation 1" workflows (10-17 to 10-19) were superseded twice:
    1. 10-20, by matched validation.
    2. 10-24, by "generalized" workflows, after an audit found hardcoded fixture names in tool
       definitions, a retroactively filled Foundry ledger, trivial assertions, and a legacy report
       with hardcoded statistics.
  - ATAC editor-compatibility repairs landed on 10-24, and one part waits on an open Galaxy PR.
- **Foundry version.** Two Foundry snapshots were in play:
  - **Orbit-era RNA Gen-1:** Foundry `c98ae05c` (2026-10-16). **[I]**
  - **Everything since 10-20** (RNA matched and generalized, all of ATAC): the Codex plugin
    `foundry-skills` 2026.9.17, i.e. agentic-plugins `862fd8ce`, which pins Foundry **`5aac370f`
    (2026-09-17)**. That commit is **191 commits behind** today's Foundry main. **[V]** by
    SKILL.md hash match.
- **Biggest caveats for the abstract's claims:**
  1. **Tool Shed is largely bypassed.** The canonical ATAC workflows have 1–2 Tool Shed steps
     against 25–41 account-owned user-defined tools (UDTs) each. The canonical generalized RNA
     workflows have **zero** Tool Shed steps. Version pinning comes from nf-core containers
     inside UDTs, not from installable Tool Shed revisions. That also blocks an IWC submission
     as-is. **[V]**
  2. **gxwf acceptance used a locally patched checker for ATAC.** The patch adds Apply Rules
     collection-type inference to `@galaxy-tool-util/connection-validation`. **[V]**
  3. **The scientific-agreement criteria are partly retrospective.** The RNA verdicts were
     relabeled from strict FAIL to PASS "at the user's direction". **[V]**
  4. **Neither pipeline is held out.** nf-core/atacseq at the exact SHA used here has been a
     Foundry fixture since 2026-05-09. nf-core/rnaseq is a Foundry fixture too, at a different
     release. **[V]**
  5. **The feedback loop is not closed upstream.** Structured Foundry feedback ledgers and issue
     drafts exist, but nothing was filed. **[V]**
- **Poster usability.** This is the strongest real-pipeline evidence available: per-trajectory
  gxwf validation, Planemo green, comparison against pinned upstream, and explicit gap ledgers.
  Using any of it publicly needs John's and Anton's go-ahead (§7), and it has to carry the caveats
  above. The open questions in the repo README on release, IWC, attribution and outreach all
  remain unchecked. Presenting at conferences is itself one of the open outreach choices (§6).

## 2. What's in the repo (layout)

| Area | What it is | Dates (first → last commit) | Tag |
| - | - | - | - |
| `fp:report/` | Two PDFs with LaTeX sources and source zips: `foundry_nfcore_assessment.*` (nf-core literature-use assessment) and `foundry_workflow_candidates.*` (per-workflow pilot candidates, cohort/sample mapping, Galaxy EU/US tool coverage). `report_provenance.json` hashes the inputs. | `e9ba1481` 10-17 (evidence snapshot 10-15) | [V] |
| `fp:data/` | Processed evidence tables, frozen replication reviews, per-paper `freeform-summary.md`. Raw caches are gitignored. | `e9ba1481` 10-17 | [V] |
| `fp:research/` | Tool-availability matrices (`galaxy_tools/`), replication-review builders, the Orbit skill access check (`orbit_skills/access_check.json`), dashboard screenshots, and two `*.tar.gz` that are static snapshots of the dashboard site (contents listed, not extracted) | 10-17 | [V] |
| `fp:dashboard/dist/` | Static "atlas" dashboard (literature and replication candidates). The assessment PDF also links a privately hosted copy (URL withheld). | 10-17 | [V] |
| `fp:scripts/` | Literature-collection, accession-resolution and report-build scripts (stdlib Python) | 10-17 | [V] |
| `fp:workflows/rnaseq/` | Conversion, validation and replication for nf-core/rnaseq | `39ed6353` 10-19 → `c1c9bcf6` 10-24 | [V] |
| `fp:workflows/atacseq/` | Same for nf-core/atacseq (most of the repo's bulk and commits) | `1ded6f2e` 10-20 → `12ca389a` 10-24 | [V] |

The README scoreboard (`fp:README.md`) says "Updated 20 October 2026". It predates the 10-24 RNA
generalization and the ATAC editor repair, so it is stale against the per-workflow READMEs. **[V]**

## 3. Per-workflow map

Stage one is "conversion + upstream test data". Stage two is "paper replication". Both prompts
require every conversion and structural revision to go through Foundry's
`pipeline-nextflow-to-galaxy` skill. They also require flat workflows, with no subworkflows and no
"run all of Nextflow in one tool" (`fp:workflows/rnaseq/prompts/stage-1-galaxy-workflow-reconstruction.md`;
`fp:workflows/atacseq/prompts/autonomous-conversion-validation-and-replication.md`). **[V]**

### 3a. nf-core/rnaseq 3.13.2 (`a10f41af`)

| Sub-stage | Where | Metric kind | Maturity | Date / commit | Foundry version | Tag |
| - | - | - | - | - | - | - |
| Gen-1 conversion (5 trajectories: STAR+Salmon, read Salmon, Kallisto, HISAT2, STAR+RSEM) | `fp:workflows/rnaseq/generalization/2026-10-24/generation-1/` (archived), `fp:workflows/rnaseq/status/2026-10-1{8,9}.json` | Job success; component comparisons that used different tool versions | **Superseded.** Shallow workflows of 2–3 Tool Shed tools each. Per the audit, the Foundry phase ledgers stayed `pending`, Kallisto had no tests, and the assertions were trivial. | 10-17 → `39ed6353` 10-19 | Orbit app with `skills_fetch` from `foundry-skills` pinned to Foundry **`c98ae05c`** (2026-10-16). The pipeline SKILL.md hash matches that commit. | pin [V]; that conversions ran at this pin [I] (the access check states it ran no conversion; the Gen-1 records don't restate the pin) |
| Matched upstream validation | `fp:workflows/rnaseq/matched-upstream-validation/2026-10-20T103031Z/` (`RESULTS.md`, `SCIENTIFIC_AGREEMENT.md`, `EXACT_COMPARISON.md`, `foundry/`) | Pinned Nextflow in containers vs Galaxy on one upstream fixture lane: exact-file diagnostics plus "scientific agreement"; Planemo assertions; strict gxwf state/connection validation | **Historical.** Verdict reinterpreted from strict to scientific agreement (`6237dec5`). Workflows later found to hardcode fixture sample names and settings inside UDTs; Foundry step loop "populated retroactively" by a replay script (`fp:…/generalization/2026-10-24/REQUEST.md` §2.1) | `ac69a722` 10-20 | Foundry skill pin **`5aac370f`** (`fp:…/setup/tool-versions.json`, `foundry/foundry-run.yml`); foundry CLI pkg 0.2.0, tool-util CLI 1.14.0, gxwf 1.0.0, Planemo 0.75.47 | [V] |
| Generalized successors (canonical now) | `fp:workflows/rnaseq/trajectories/*`, `fp:workflows/rnaseq/generalization/2026-10-24/` (`RESULTS.md`, `VERIFICATION_NOTES.md`, `environment.json`) | Planemo on two cases per trajectory (original fixture plus a renamed two-sample duplicate); scientific checkpoints against the retained 10-20 source outputs; tool-contract tests | **Current, a few hours old.** Collection-based, no hardcoded fixture names. One STAR metadata repair re-ran. Some assessment is "explicitly retrospective". The two-sample case tests collection behavior, not biology. | `fd9447e5` → `c1c9bcf6` 10-24 | `foundry-skills` 2026.9.17; the four SKILL.md hashes in `environment.json` match agentic-plugins `862fd8ce`, which pins Foundry **`5aac370f`** | [V] |
| Paper replication (Patel et al. 2025, NAR; GSE285638) | `fp:workflows/rnaseq/replication-report/` (`README.md`, `STAGE_TWO_REPORT.pdf`, `…SIDE_BY_SIDE…html`, `evidence/`, `superseded/`) | Count-matrix agreement with the deposited matrix; downstream DE and enrichment run **locally** (PyDESeq2/GSEApy), not in Galaxy; recovery of qualitative biology | **Reported and revised.** The legacy Markdown report and figure generators carried hardcoded published values and overstated significance; they are isolated under `superseded/` (`a0210a4a`). | `a2eae0fc` 10-20 → `c08756de` 10-24 | Galaxy part = the Gen-1-style 3-tool Tool Shed workflow (`replication-report/workflow_star_salmon_hg38.ga`), **not** the validated UDT workflows. The README says the generalized tests don't claim a fresh replication. | [V] |

### 3b. nf-core/atacseq 2.1.2 (`1a1dbe52`)

| Sub-stage | Where | Metric kind | Maturity | Date / commit | Foundry version | Tag |
| - | - | - | - | - | - | - |
| Source and trajectory matrix | `fp:workflows/atacseq/source/` (`source-manifest.json`, `summary-nextflow.json`, `trajectory-matrix.json`) | 10 trajectories: 4 aligners (PE), plus SE, controls, narrow peaks, no-merge, no-consensus, no-trim | Finite and explicit; full-pipeline QC/presentation omissions listed | `1ded6f2e` 10-20 | `foundry summarize-nextflow … --no-with-nextflow` (not `nextflow inspect`) | [V] |
| Conversion, import, Planemo, matched comparison | `fp:workflows/atacseq/trajectories/<slug>/` (Foundry phase handoffs, `foundry-run.yml`, `open-requirements.ledger.yml`, `foundry-feedback.ledger.yml`, gates, attempts, IWC exemplar notes), `fp:…/matched-upstream-validation/2026-10-20/` (`RESULTS.md`, `SCIENTIFIC_AGREEMENT.md`, `COMPARISON_PLAN.md`), `fp:…/status.json`, `fp:…/workflow-registry.json` | Per trajectory: validated tool states and connections, Planemo assertions, upstream Docker run, scientific checkpoints (records, coordinates, count cells), with exact-file diagnostics kept separate | **Complete by the repo's criteria**, after many attempt/repair cycles (attempt dirs retained). HOMER tie-breaking variation admitted from repeated runs of the unchanged source. Checker patched locally (`fp:…/setup/validator-correction/`). | 10-20 → 10-24 (bulk on 10-20/21) | `foundry-skills` 2026.9.17 @ agentic-plugins **`862fd8ce`**, i.e. Foundry **`5aac370f`** (`fp:workflows/atacseq/setup/provenance.json`). That file also embeds the summarize-nextflow skill's own provenance record (Mold commit `d1b4cabe`, cast rev 11), which is the skill's lineage, not a run pin. | [V] |
| Paper replication (Punga et al. 2026, Sci Rep; GSE308337) | `fp:workflows/atacseq/replication-report/` (`REPORT.md`/`.pdf`, `METHODS.md`, `TARGETS.md`, `publication-benchmarks/`, `figure-comparison/`), `fp:…/pilot/` | Independent peak/region/count analysis vs published benchmarks; differential accessibility as a documented **local** R extension; published Figure 6A–C beside reconstructions (source CC BY 4.0 noted in `RUN_LOG.md`) | **Reported and reviewed** (`87ae12b4`). Methods spec written before results. Original samplesheet and settings were not supplied by the paper, so they were reconstructed. | 10-20 → 10-24 | Separate "paper-full" workflow derived from the BWA route, with a **declared substitution** (GNU external sort in the group-coverage region after an OOM) (`status.json` → `paper_replication.coverage_external_sort_recovery`) | [V] |
| Editor compatibility | `fp:…/editor-connection-audit/2026-10-24/`, `fp:…/editor-connection-repair/2026-10-24/` (`galaxy-pr/`) | Live editor connection warnings | Consensus-related warnings resolved via new UDT revisions plus fixture regressions; the null-filter warnings wait on **galaxyproject/galaxy#24435** (Anton's PR, opened 2026-10-24, OPEN, unmerged) | `5879fda0` → `12ca389a` 10-24 | same | [V] |
| Foundry feedback review | `fp:workflows/atacseq/foundry-feedback-review/` (`foundry-run-review.md`, `foundry-issue-drafts.md`, `coverage.json`, `current-main-and-duplicate-searches.json`) | Ledger triage: local-only vs issue-draft | Two issue drafts for `galaxyproject/foundry`: the galaxy-tool-util-ts Rules collection-type gap, and the featureCounts 2.0.1 wrapper interface. **Not posted.** | 10-21 | Screened against Foundry main `8a9f4187` (2026-10-20). That is the main consulted for duplicate search, **not** the conversion pin. | [V] |

### 3c. Literature and candidate assessment (not a workflow, but relevant)

- `fp:report/foundry_nfcore_assessment.pdf` gives full-text screening of nf-core use, linked
  public read metadata, and a targeted review that produced recommended, conditional and excluded
  pilots. It states that it "does not yet demonstrate executable reconstruction … or conversion at
  scale". **[V]**
- `fp:report/foundry_workflow_candidates.pdf` names the first pilot per workflow. The rnaseq and
  atacseq pilots are the two that were later run. The sarek pilot is a telomere-maintenance
  genome branch (p.47 of that PDF) that was never attempted. The report says "None of these
  analyses has been rerun". Per-pilot Galaxy EU/US tool coverage is in `research/galaxy_tools/`.
  **[V]**
- The agent harnesses were Orbit (Gen-1 RNA, stage-two RNA per its prompt) and then, from the
  `~/.codex/plugins` paths, Codex on a Linux host. Orbit is a specific desktop app. Only the Linux
  prompts are written for "a generic agent harness". **[V]** for the paths, **[I]** for the Codex
  identity.

### 3d. Mature vs provisional (summary)

- **Showable, with sign-off:**
  - ATAC matched validation (`fp:…/atacseq/matched-upstream-validation/2026-10-20/`) and the ten
    canonical ATAC trajectories.
  - The RNA generalized successors (`fp:…/rnaseq/generalization/2026-10-24/`).
  - The claim-6 ledgers and operation mapping.
- **Provisional:**
  - Anything dated 10-24 (hours old at time of reading).
  - The null-filter editor warnings pending galaxy#24435.
  - Retrospective scientific-agreement criteria (RNA relabel, admitted HOMER and Salmon variation).
  - Both paper replications. They are "reported and reviewed" by the agent, with no human
    adjudication recorded.
- **Superseded, don't cite:**
  - RNA Gen-1 workflows.
  - The 10-20 RNA matched workflows (fixture-hardcoded UDTs).
  - The legacy RNA Markdown replication report (`replication-report/superseded/`).
  - The README scoreboard dated 10-20.

## 4. Foundry version provenance (detail)

| Pin | What it is | Evidence | Tag |
| - | - | - | - |
| Foundry `c98ae05c` (2026-10-16, PR #684) | Orbit `foundry-skills` repo pin used for Gen-1 RNA | `fp:research/orbit_skills/access_check.json`. The pipeline SKILL.md sha256 `aede7d93…` equals `git show c98ae05c:casts/claude/skills/pipeline-nextflow-to-galaxy/SKILL.md`. | pin [V]; usage [I] |
| agentic-plugins `862fd8ce` (2026-09-27), plugin version 2026.9.17 | Marketplace bundle installed in Codex | `fp:workflows/atacseq/setup/provenance.json` (`agentic_plugins_commit`). The `plugin.json` version is 2026.9.17 at `862fd8ce`, but **2026.9.16 at tag `v2026.9.17`** (tag/version oddity). | [V] |
| Foundry `5aac370f` (2026-09-17, PR #565) | `plugins/foundry-skills/UPSTREAM.json` at `862fd8ce`; the tag `v2026.9.17` pins the older `4e88464f` | RNA `tool-versions.json` and `foundry-run.yml` cite `5aac370f` directly. The four generalized-RNA SKILL.md hashes match `862fd8ce` and not the `v2026.9.17` tag (`advance-galaxy-draft-step` differs). | [V] |
| Gap to today | `5aac370f` is an ancestor of `c98ae05c` (133 commits earlier) and of `bc790960` (191 commits behind). So the post-10-20 work ran on an **older** Foundry than Gen-1 did. | `git rev-list --count` | [V] |

- **Implication [I].** Any poster claim of the form "Foundry at version X produced these" has to
  name the 2026-09-17 snapshot, not current main. Foundry changes since then, such as UDT workflow
  binding (#714, 10-24), aren't reflected.
- **CLI/skill mismatch.** The 10-24 RNA request asked for `gxwf draft-init` and `gxwf test`. The
  run recorded that the installed gxwf 1.0.0 has neither. `draft-init` appears nowhere in Foundry
  at `5aac370f` or on current main (`git grep -l draft-init` returns 0 files at both). That points
  to a prompt error, not a skill error. **[V]**

## 5. Relation to the abstract's claims, promises and the benchmark

| Abstract item | What foundry-paper offers | Strength | Tag |
| - | - | - | - |
| Claim 3: Molds compile into skills with a provenance record | `fp:workflows/atacseq/setup/provenance.json` embeds a real cast provenance record (Mold path/rev/hash/commit, refs with hashes, validation results, open questions) carried into a downstream run | Good figure material for "provenance travels with the skill" | [V] |
| Claim 4: pipelines compose skills | Every trajectory has a `foundry-run.yml` phase ledger (summarize → reference-data → interface → data-flow → template → test-plan …) | Real, but per the 10-24 audit (`REQUEST.md`) the RNA Gen-1 ledgers were empty and the 10-20 RNA ledger was replayed retroactively. The 10-24 generalized RNA ledgers are "completed, evidence-linked" per the RNA README. The audit didn't flag the ATAC ledgers, but it also didn't check them for replay, and the bwa-pe-broad feedback ledger has open entries **[I]**. | [V] |
| Claim 5: Tool Shed pins, gxwf validates, Planemo runs | Planemo green and strict gxwf state/connection validation per trajectory; deterministic Tool Shed summaries retained (`fp:…/atacseq/setup/tool-summaries/`, `TOOL_DECISIONS.md`) | **Qualified.** Tool Shed *discovery* ran, but the *chosen* route is mostly source-container UDTs (§1). ATAC gxwf used a locally patched connection checker. | [V] |
| Claim 5: structured failures feed the next revision | `foundry-feedback.ledger.yml` and `open-requirements.ledger.yml` per trajectory; attempt dirs; repair entries naming the Foundry skill that resolved them (e.g. `repair-galaxy-draft-topology / implement-galaxy-tool-step`) | Good, at run level | [V] |
| Claim 6: incompleteness is explicit | Open-requirements ledgers; operation-mapping/test-matrix (`fp:…/rnaseq/matched-upstream-validation/…/shared/operation-mapping.tsv`, `test-matrix.json`); ATAC trajectory matrix with listed omissions; "core-only" scope stated everywhere | **Strong.** Probably the best poster material in the repo. | [V] |
| Claim 7: update knowledge, recompile | Feedback was triaged into local-only items and issue drafts, then **not filed**. No `nekrut` issues on galaxyproject/foundry (`gh issue list --author nekrut` returns empty). The RNA feedback review says "No issues, comments, or other upstream messages were sent." | No instance of knowledge updated upstream and recompiled | [NF] |
| Claim 8: partial Nextflow translations | Two nf-core pipelines, 15 flat trajectories, core-only | Directly supports "partial", with the gaps explicit | [V] |
| Claim 8: working workflows from free-form expert specs | Nothing in foundry-paper | — | [NF] |
| Promise: sarek | Candidate report only (telomere genome branch); no conversion | — | [NF] |
| Promise: EGAPx | No conversion. Only an existing `ncbi_egapx` ToolShed wrapper appears in server tool listings (`fp:research/galaxy_tools/raw/eu_tools.json`). That wrapper runs EGAPx as one tool, which the paper's prompts disallow as a conversion. | — | [NF] |
| Promise: methods-section workflow | Not as such. Stage-two `METHODS.md` reconstructs analysis *settings* from a paper for an nf-core-derived workflow. That's a different thing from building a workflow from methods text. See R4 for the Orbit/Hokken overlap. | Weak/indirect | [I] |
| Promise: pipelines the skills were never written against | **Neither qualifies.** `fo:workflow-fixtures/fixtures.yaml` pins nf-core/atacseq **2.1.2 @ `1a1dbe52`**, the same SHA, added in `1a57178b` 2026-05-09. It also pins nf-core/rnaseq at 3.24.0. Foundry skill notes cite both by name. The paper-selection step (10-15) came after the skills, but the pipelines didn't. | Contradicts a held-out framing | [V] |
| Promise: per-target coverage, pinning, gxwf, Planemo, failures, gaps | Exists for both pipelines, per trajectory | Strong in form; must carry the caveats | [V] |
| CWL | foundry-paper's README "Scope of the Foundry paper" lists other Nextflow projects, Snakemake and WDL, **not CWL** | Doesn't help the CWL gap | [V] |

**End-to-end benchmark.** The target metric is *of N upstream pipelines, how many reach gxwf-valid
and Planemo-green*. foundry-paper gives **N = 2 pipelines, decomposed into 15 trajectories**, all
reported gxwf-valid and Planemo-green on the upstream fixture, plus a scientific comparison with
pinned nf-core runs. That is more than gxwf/Planemo alone. Caveats a defensible number must state:
**[V]** unless marked otherwise.

- It isn't a sweep. The two pipelines were picked because publication pilots existed, and both are
  Foundry fixtures.
- Many attempt/repair cycles per trajectory, with heavy human or agent steering (audit-driven
  rework, a verdict reinterpreted at the user's direction). The Planemo-green part is clean. The
  scientific-agreement part is partly post hoc.
- Core-only scope; downstream statistics run outside Galaxy in both replications.
- UDT-heavy, so "Tool Shed pinning" isn't what made them pass.
- ATAC gxwf passes depend on a locally patched checker.
- Foundry snapshot `5aac370f` (2026-09-17), not current main.
- Extraction ran with `--no-with-nextflow`. There is no `nextflow inspect` oracle here, so this
  data doesn't support extraction-fidelity claims. Per-trajectory upstream process counts are in
  `status.json` but come from the run, not from an independent oracle. **[I]**

## 6. Open questions in foundry-paper that limit a public poster

The source is `fp:README.md`, "Open questions before release". Every checkbox is unchecked as of
`c1c9bcf6`. Björn's `30809421` (10-19) reformatted the list as checkboxes, widened the IWC question
to "nf-core / snakemake / WDL", and dropped a "Reciprocal conversion (Galaxy→Nextflow)" question.
**[V]**

| Question | Bears on the poster? | Why | Tag |
| - | - | - | - |
| Release sequence / public transparency | **Yes.** | No release decision exists. The poster can't present a released converted collection, link to the private repo, or link to usegalaxy workflows (the registry has no published/importable flags; shared links "may require the account"). | [V] repo private; [I] links |
| Outreach ("broad campaign … or gradual introduction through IWC, the paper, conferences") | **Yes, directly.** | Conferences are one of the listed undecided channels, so showing these results at CSHL is itself an open decision. | [V] |
| Framing Foundry (translation across systems vs converted collection) | Yes | Decides whether rnaseq/atacseq lead the poster or illustrate it | [V] |
| IWC organization / release via IWC | Yes | No IWC PRs for these conversions (`gh pr list -R galaxyproject/iwc --author nekrut`; none nf-core-related since 10-01). UDT-heavy workflows are unlikely to be IWC-acceptable as-is. | [V] no PRs; [I] acceptability |
| Contributor credit / attribution | Yes, if shown | nf-core authors and the two pilot papers' authors need credit. The ATAC figure comparison reuses published figure panels (CC BY 4.0). | [V] |
| Maintenance, upstream alignment, community changes, extra testing | Lower | They matter for "released openly" (claim 9) for converted workflows, not for the Foundry knowledge base or skills themselves | [I] |
| Scope of the paper (Nextflow, Snakemake, WDL) | Some | Signals that Anton's paper will claim the cross-system story. Avoid pre-empting it on the poster, and check the "new and unpublished" overlap with R4. | [I] |

## 7. Ask John

Each item names a thing and where it lives. No values are given.

1. **Name rnaseq and atacseq on the poster at all?** Anton's data is unpublished and in a private
   repo. If yes, decide whether to attribute it as "with A. Nekrutenko" or as foundry-paper.
   (`fp:README.md`)
2. **Scoreboard-level outcome, stated qualitatively?** For example: "all 5 RNA / all 10 ATAC
   trajectories gxwf-valid and Planemo-green vs pinned nf-core fixtures". Source:
   `fp:workflows/rnaseq/README.md`, `fp:workflows/atacseq/README.md`. That would serve as the
   benchmark seed for R5.
3. **Paper replications** (Patel 2025, Punga 2026). Showing them needs Anton's sign-off and
   possibly courtesy to the authors. Downstream statistics ran outside Galaxy.
   (`fp:workflows/*/replication-report/`)
4. **UDT vs Tool Shed framing.** How to state pinning honestly when most steps are source-container
   UDTs. (`fp:workflows/atacseq/setup/TOOL_DECISIONS.md`, §1 counts)
5. **Patched gxwf connection checker.** The gap is in `jmchilton/galaxy-tool-util-ts` (Apply Rules
   `collection_type_from_rules`). An upstream fix plus a Foundry recompile could be the claim-7
   "update knowledge, recompile" instance that R1 is looking for.
   (`fp:workflows/atacseq/setup/validator-correction/`, `foundry-feedback-review/foundry-issue-drafts.md`)
6. **File the two unfiled Foundry issue drafts?** Rules collection type, and the featureCounts
   2.0.1 wrapper. That would close the loop publicly. (`fp:workflows/atacseq/foundry-feedback-review/`)
7. **Galaxy PR #24435** as a "conversion surfaced a real Galaxy editor bug" story. The PR is public
   and Anton's. (`fp:workflows/atacseq/editor-connection-repair/2026-10-24/galaxy-pr/`)
8. **Explicit-incompleteness figure** (claim 6) from a real `open-requirements.ledger.yml` plus the
   operation-mapping TSV. (`fp:workflows/rnaseq/matched-upstream-validation/2026-10-20T103031Z/shared/operation-mapping.tsv`,
   `fp:workflows/atacseq/trajectories/bwa-pe-broad/open-requirements.ledger.yml`)
9. **Provenance-record figure** (claim 3) from the cast provenance embedded in a run.
   (`fp:workflows/atacseq/setup/provenance.json`)
10. **Observed agent failure modes.** The 10-24 audit found hardcoded fixture names in tools, a
    retroactive Foundry ledger, trivial assertions, and hardcoded statistics in a legacy report.
    That's honest "deterministic oracles catch what agents fake" material, but sensitive.
    (`fp:workflows/rnaseq/generalization/2026-10-24/REQUEST.md`)
11. **Held-out wording.** atacseq at the same SHA is a Foundry fixture, so drop "never written
    against" for these pipelines, or find other targets. (`fo:workflow-fixtures/fixtures.yaml`)
12. **Version to cite.** foundry-skills 2026.9.17 / Foundry `5aac370f`. Is a re-run on current main
    wanted before Nov 4?

## 8. Pointers for other tasks

- **R1:** foundry `content/log.md` no longer exists on `origin/main`. It was retired in `94ad76d2`
  ("Retire the unused global operations log"), but RESEARCH_GOALS still points to it. **[V]**
- **R2:** no sarek, EGAPx, CWL, methods-section or interview attempt exists in foundry-paper.
  **[NF]**
- **R4:** Gen-1 and stage-two RNA ran in Orbit (loom 0.6.0 app; `pi-galaxy-analyst` checkout),
  per `fp:research/orbit_skills/access_check.json` and the RNA stage prompts. Check the manuscript
  for overlap with these runs. **[V]**
- **R5:** use §5's benchmark caveats. ATAC's `status.json` and the RNA `results.json` are the
  machine-readable per-trajectory sources.
