# R2 — Demonstration-target status

> [!WARNING]
> **Internal use only.** This file names run artifacts that live only on John's or Marius's machines,
> and it points into `foundry-paper` (sensitive) without copying from it. Check with John before
> committing it, because the galaxy-brain site renders `vault/projects/**` sub-files.

- **Researched:** 2026-10-24.
- **Foundry state:** `galaxyproject/foundry` `origin/main` @ `bc790960` (2026-10-24 14:22). Fetched,
  and all 756 remote branches were checked by name.
- **Worktrees:** `~/projects/worktrees/foundry/branch/*`, from `git worktree list`.
- **Local run directories:** `~/projects/foundry-runs/` and `~/foundry-runs/`.
- **Vault:** `vault/repositories/foundry/`, `vault/projects/foundries/` and `vault/agents/wf_foundry/`.
- **foundry-paper:** @ `c1c9bcf6` (2026-10-24), checked for overlap only.
- **Tags:**
  - **[V]** verified from a primary artifact: a file at a SHA, a run directory, or planemo or gxwf JSON;
  - **[V2]** verified secondhand from a GitHub PR or issue body, with no artifact seen;
  - **[L]** verified, but local-only (not on any remote);
  - **[I]** inferred;
  - **[NF]** looked for and not found.

## 1. Executive summary

- **Methods section: ready.** The strongest result is a paper-derived workflow, not anything the
  abstract names.
  - DengueSeq (Vogels et al. 2024, *BMC Genomics* 25:433) was converted on 2026-10-20 through
    paper → Workflow Brief → expert review → Galaxy.
  - Result: **7 Tool Shed tools pinned to changesets, `gxwf validate --strict --connections` pass
    (7/7 tool states), and `planemo test` green** (1 test, 7/7 jobs ok, all assertions passed).
    **[V]**
  - It comes with an explicit gap ledger: 5 open entries, 2 of them stated drops. **[V]**
  - The paper was picked on that day, which makes it the cleanest **"chosen after the skills"**
    case. **[V]**
  - It also avoids the Orbit manuscript's methods-section case (Hokken, see R4).
- **Interview: partly ready.**
  - The June runs (UC1 MRSA, UC3 ATAC) got through gxwf static validation but never ran planemo.
    **[V]**
  - Marius's `ebola-rnaseq` interview-to-galaxy run completed 12/12 phases. **[V2]** Its planemo
    result hasn't been seen.
  - **Caveat: no live interview exists yet.** The "interview" input is a saved issue body, and
    foundry#500, "Implement actual interviews", is open. **[V]**
- **nf-core/sarek: run exists, result not in hand.**
  - Marius ran a 13-phase nextflow-to-galaxy run on sarek around 2026-07-20. **[V2]** Its directory
    is on his machine.
  - A separate attempt on the GATK preprocessing plane hit a Galaxy Tool Shed install rollback
    (picard). **[V]**
  - No gxwf or planemo result for sarek is available locally. **[NF]**
  - Sarek has been a development fixture since 2026-05-01, so it is **written-against, not
    held-out**. **[V]**
- **EGAPx: ran, failed honestly, and taught a lot.**
  - The 2026-08-19 run ended with **an empty extracted workflow** that `gxwf validate` still passed.
  - Planemo errored on unresolved test data.
  - It produced five Mold refinements and filed #466, #467 and #468. #466 and #467 were fixed in
    #469; #468 is open. **[V]/[L]**
  - **EGAPx is already wrapped whole in the Tool Shed** (`richard-burhans/ncbi_egapx`,
    `fubar/egapx_runner`). This reframes the target: a one-tool workflow may be the right Galaxy
    translation. That is an open design question for John. **[V]**
  - It has been a fixture since 2026-05-03, so it is **written-against**. **[V]**
- **CWL: no demo-grade result.**
  - Four "5-step" emulated runs on `main` (May 2026) stop at a template draft. Every `tool_id` is
    `TODO`, gxwf validation is structural only (`--no-tool-state`), and planemo was never run. **[V]**
  - The `cwl-to-galaxy` pipeline has no `scenarios.md` or `eval.md` on `main`. **[V]**
- **Routes are moving right now.** PR #696 (open) rebuilds the direct paper and interview routes on
  the Workflow Brief Molds and retires four freeform Molds. **[V]** Every run made before Nov 1
  should record its Foundry SHA and the route it used.

## 2. Per-target status table

"After skills?" means whether the target was chosen after the skills that converted it were written.
The first Mold was written on 2026-04-30 (`18eb0ca8`), the first cast on 2026-05-01 (`8008dfe2`), and
the plugin marketplace on 2026-05-02 (`3672261d`).

### Overview

| Target | Attempt exists? | Where | After skills? | Readiness |
| - | - | - | - | - |
| **Methods: DengueSeq DENV3** | Yes, 2 arms, 2026-10-20 **[V]** | `~/projects/foundry-runs/dengueseq-denv3/` (brief arm) and `…/dengueseq-denv3-direct/` (direct arm), each a git repo of phase commits. Scorecard: `vault/repositories/foundry/issues/closed/563/runs/dengueseq-denv3.md` **[V]** | **Yes.** Picked 2026-10-20 as a non-Galaxy paper. Not on Foundry `main` **[V]** | **S** |
| **Methods: auris-scf1** (Marius, paper-to-galaxy) | Yes, 2026-09-16 **[V2]** | Marius's machine. Cited by #549 and #569, and in `content/research/foundry-run-manifest/index.md` @ `bc790960` | Unknown | Backup only |
| **Interview: UC1 MRSA, UC3 ATAC** | Yes, June 2026 **[V]** | Removed emulated run `1c299ead` (added), `4e21bc4f` (removed 2026-06-17). Refinements on `main`: `advance-galaxy-draft-step/refinements/2026-06-17-uc1-…`, `find-test-data/…/2026-06-19-interview-atac-…`, `implement-galaxy-workflow-test/…/2026-06-19-interview-mrsa-…` | No. UC1/UC3 were the development scenarios, and their targets are published in the Galaxy Notebooks SI **[V]** | M |
| **Interview: ebola-rnaseq** (Marius) | Yes **[V2]** | Marius's machine. Cited only in the #569 PR body | Unknown | S if green, else M |
| **nf-core/sarek** | Yes, ≥2 attempts **[V2]/[V]** | Marius: `~/src/foundry-runs/sarek` (#361, #569, `packages/build-cli/README.md` @ `bc790960`). GATK-plane attempt: `vault/projects/foundries/TOOLSHED_CACHE_ROLLBACK_ISSUE.md`. Lost: the `sarek` worktree (TREE_MANAGE.md) **[NF]** | **No.** Fixture since 2026-05-01 (`a1f097e2`), with an explicit cast-loop target (#23) and a 2026-05-08 refinement **[V]** | **M** |
| **ncbi/egapx (EGAPx)** | Yes, 2026-08-19, plus a later test-drive **[V]/[L]** | Refinements: local-only branch `egapx-refinements` @ `d2c404df` **[L]**. Fixes merged in #469 (`0f259e85`), #478 (`100c17f5`), #479 (`6be00e80`) **[V]**. Scenario: `content/pipelines/nextflow-to-galaxy/scenarios.md` @ `bc790960`. Run directory **[NF]** | **No.** Fixture since 2026-05-03 (`de2aafb5`) and used to grow the resolver (#220, `d238ecc4`) **[V]** | **S–M** as a one-tool reframe, **L** as a decomposition |
| **CWL** (ga4gh-challenge, salmon-rnaseq, mgnify-seqprep, user-guide) | Yes, 5-step emulations only **[V]** | `casts/claude/_emulated-runs/*` @ `bc790960`. Original runs on `galaxy_cwl` `0129b5e6` (2026-05-27) and mid-May | No. They exercised the CWL Molds while those were written **[I]** | **M**, or accept the gap |

### Evidence

| Target | Tool coverage and pinning | gxwf | Planemo |
| - | - | - | - |
| **Methods: DengueSeq** | Brief arm: 7 Tool Shed tools at changesets, e.g. `devteam/bwa/bwa_mem` 0.7.19+galaxy1 @ `c598cbb8b019` and `iuc/ivar_trim` 1.4.4+galaxy1 @ `6606a8c97889`. Direct arm: 8 tools **[V]** | Brief arm: `gxwf validate --json --connections --strict` **pass**, tool_state 7/7. Direct arm: pass, 8/8 tool states and 13/13 connections **[V]** | Brief arm: **green**, planemo 0.75.47, 1/1 test, 7/7 jobs ok. A second, 178 MB test case was defined but not run. Direct arm: **red**, with 8/8 jobs ok and one whole-line `has_line_matching` assertion defect **[V]** |
| **Interview: UC1/UC3** | UC1: `isescan` @ `81539b9ae80a` and `integron_finder` @ `5429646e486d` pinned. The loop didn't finish (8 wrappers needed a tool cache) **[V]** | UC1: draft valid. Only the concrete subset reached terminal validation **[V]** | Not run. Reported "blocked", which was a misreading: the delay was cost, not infeasibility **[V]** |
| **Interview: ebola-rnaseq** | Not seen **[NF]** | Not seen **[NF]** | Not seen **[NF]** |
| **nf-core/sarek** | 2026-05-08 summary: `tool` foreign key null on 26/123 processes. Fixed in #213/#218 **[V]** | Not seen **[NF]** | Marius: phase 12 invocation rejected on old Galaxy (#361). GATK plane: 3 of 8 `planemo test` attempts lost to the picard repository rollback **[V2]/[V]** |
| **ncbi/egapx** | 8 draft steps, 2 identity-pinned, 6 deferred. `gxwf tool-search "EGAPx"` found 4 whole-pipeline Tool Shed tools **[L]** | Extraction dropped all 8 steps, and `gxwf validate` passed on `steps: {}` **[L]** | Runs 1–2 hit a startup timeout. Run 3 (`--galaxy_startup_timeout 2400`) gave `num_errors: 1`, `job: null`, from an unresolved test-data path **[L]** |
| **CWL** | None. All `tool_id: TODO`. mgnify-seqprep's IWC comparison named real pins (`iuc/fastp` 0.24.1+galaxy0, `bgruening/mgnify_seqprep` 1.2+galaxy0) **[V]** | `gxwf validate --no-tool-state` structural OK only **[V]** | Never run **[V]** |

### Gaps and failure modes

| Target | Gaps and failure modes |
| - | - |
| **Methods: DengueSeq** | Open-requirements ledger: 19 entries (5 open, 14 resolved), plus 25 discoveries and 34 decisions. Open items include empty-BAM behavior, 2 BAQ-deviation checks and 2 `kind: dropped` planes. Also: test-sample identity is in doubt (BioSample mismatch), and the run record has `foundry_head: null`. The plugin came from a `git archive` of `f275059e` **[V]** |
| **Interview: UC1/UC3** | Discovery query normalization (`integron_finder` → no hits). Fabricated placeholder test paths (UC3). Test data that nothing materializes (UC1) **[V]** |
| **Interview: ebola-rnaseq** | 12/12 phases, every declared artifact present, 2 resolved obligations **[V2]** |
| **nf-core/sarek** | Old-Galaxy guess fixed in #363. Galaxy install rollback (an upstream issue, draft not filed **[NF]**). The 9 refinements dated 2026-09-04 are lost **[NF]** |
| **ncbi/egapx** | 528/548 IO names synthesized and the script summary templated (both fixed in #469). UDT failed `validate-tool-source` with 120 errors (#468 open). Empty workflow passes validation (eval-add proposed). Later test-drive: "95 processes → 3 steps" (#478, #480) **[V]/[L]** |
| **CWL** | No `summarize-cwl` CLI: three ad-hoc `extract.mjs` files. Nested-workflow `when`/`pickValue` lost. `cwl-normalizer` broken on v1.2 **[V]** |

## 3. Per-target detail

### 3.1 Methods section: DengueSeq DENV3 (recommended)

**Setup [V].** The run was planned as an A/B test of whether two Mold families should merge.

- Sources: the paper (OA, CC BY) and `grubaughlab/DENV_pipeline` v1.0 @ `8214cfbb`, checked out
  under `sources/`.
- Scope was set by expert intent in `source-selection.md`: Illumina DENV3 amplicon consensus with
  variants and per-base depth. The serotype loop, Nanopore processing and phylogenetics were
  excluded.
- Ground truth (`mapper.sh`) and the IWC equivalent were fixed before either arm ran and weren't
  given to either agent. See the `563/runs/dengueseq-denv3.md` scorecard.

**Brief arm [V].** The arm lives at `dengueseq-denv3/`, with a brief repo and a galaxy repo, phase
commits `d1d6951` through `6737777`.

- Pipelines: `paper-to-workflow-brief`, then John's review (`6b8b630`, 1 of 10 open questions
  edited), then `workflow-brief-to-galaxy`. Both pipelines were added to `main` in #682 (`b2cdd98b`,
  2026-10-15). The run used the #688 casts (`f275059e`).
- `foundry-run.yml` shows `status: complete`, 11 phases and a 7-iteration draft loop.
- `workflow-test-result.json` shows `status: pass`, planemo exit 0.
- The consensus is byte-identical to the source commands on the test sample, according to the
  scorecard.
- Cost was about $37 over 154 minutes.

**Direct arm [V].** The arm lives at `dengueseq-denv3-direct/`, phase commits `a792223` through
`6e25e40`.

- It ran `paper-to-galaxy` with no review and produced the same topology.
- Planemo was red on a test-assertion defect. Every job produced correct output, which the debug
  phase diagnosed without self-repair.
- The same anchored `has_line_matching` defect showed up in three independent runs:
  - bacass brief run 2 (2026-10-17, GFA assertions);
  - Scott Cain's nf-core/rnaseq run, filed as #657 (2026-10-12);
  - this direct arm.
- The knowledge fix is #701 ("Fixes #657", merged 2026-10-22).
  - It updated the `planemo-asserts-idioms` note to revision 10.
  - It regenerated the 8 casts that bundle the note.
  - It was triggered by #657, not by DengueSeq. **[V]**
- That makes a ready-made **claim 7** story: a structured failure, then a note update, then a
  recompile. **[V]**
- A green re-run of the direct arm on post-#701 casts would complete the red-to-green pair. That
  re-run hasn't happened. **[I]**
- **Held-out scope.** DengueSeq is held-out only for casts at or before `f275059e`. Run 3 fed #694
  and #696, so a post-fix re-run is a claim-7 demo, **not** a second held-out success. Don't count
  it as both. **[I]**

**Explicit incompleteness [V].** `dengueseq-denv3-galaxy/open-requirements.ledger.yml` has 19
entries: 5 open, 14 resolved.

- `serotype-coverage-plane-not-carried` and `filtered-variant-frequency-table-not-carried` are
  `kind: dropped`, each with `units` and a cited `because`.
- `consensus-baq-deviation-check-on-test-sample` and `variants-baq-deviation-check-on-test-sample`
  stay open, with stated reasons.

That is the poster's "gap list" panel, from a real run.

**Caveats:**

- n = 1 on one machine, and the second test case was not run. **[V]**
- `foundry_head: null`. Cite plugin SHA `f275059e` instead. **[V]**
- The "expert" was John. Fine for a demo, but say so. **[I]**
- None of it is on `galaxyproject/foundry`. The run directories are local, and nothing is published.
  **[V]**

### 3.2 Expert interview

- **What the route consumes today [V].**
  - `interview-to-galaxy` takes a **saved issue body** as the interview result
    (`content/pipelines/interview-to-galaxy/scenarios.md` @ `bc790960`, intro).
  - The interview itself is "harness-owned".
  - foundry#500, "Implement actual interviews" (jmchilton, 2026-09-12), is open.
  - So "a conversation with a domain expert" is currently a pre-written spec. Worded honestly, it
    is "a free-form expert specification", which is what abstract claim 8 already says.
- **UC1 MRSA (2026-06-15/17) [V].**
  - A real test-pipeline run in which the loop pinned 2 wrappers.
  - The run summary is still in git (`1c299ead:casts/claude/skills/_emulated-runs/uc1-mrsa-interview/run-summary.md`).
  - Its own scorecard rates "validates and round-trips" **partial** and runtime **N/A**.
  - Qualitatively it beat the reference target on mobile-context classification.
- **UC3 ATAC (2026-06-19) [V].** The find-test-data refinement records fabricated placeholder
  paths. Real data (GEO GSE74912) was deducible.
- **ebola-rnaseq [V2].** This is Marius's run.
  - The #569 PR body lists it as "12 of 12 phases, every declared artifact present, 2 resolved
    obligations".
  - The source, planemo outcome and date are unknown. **[NF]**
  - **Ask Marius for the run directory.** It's the cheapest path to an interview result.
- **Overlap risk [V].**
  - UC1 and UC3 reference targets "reproduce … both published in the Galaxy Notebooks supporting
    information" (interview scenarios intro).
  - Showing UC1 or UC3 as Foundry demos is fine, but the golden `.ga` files aren't new work.
  - UC4–UC7 (spec-only, no published target) are cleaner for a held-out interview demo.
- **Brief route as interview proxy [I].** `interview-to-workflow-brief` exists on `main`.
  - A UC4–UC7 spec run through the brief, then a John or Marius review, then `workflow-brief-to-galaxy`
    would mirror the green DengueSeq recipe.
  - The expert-review step is the most "conversation-like" thing the Foundry actually does today.

### 3.3 nf-core/sarek

- **Pinned fixture [V].** `nf-core/sarek` 3.8.1 @ `4bd2948f`, in `workflow-fixtures/fixtures.yaml:73`.
- **Development history [V].**
  - Sarek drove summarize-nextflow development from May on: #23, #213, #229 and
    `content/molds/summarize-nextflow/refinements/2026-05-08-sarek-emulation.md`.
  - The scenario "nf-core/sarek capped at 5 steps" in
    `content/pipelines/nextflow-to-galaxy/scenarios.md` asks for a **stated partial scope**, not a
    full conversion.
- **Marius's run [V2].**
  - #361 (2026-07-20): the agent-generated `run-planemo.sh` pointed planemo at
    `~/src/foundry-runs/sarek/galaxy-workflow.gxwf.yml` with `--galaxy_branch release_25.0`.
    Galaxy rejected the sample-sheet workflow at invocation. The fix landed in #363.
  - #569 reads a sarek run as "13 phases, 29 commits, no feedback ledger". The matching path
    suggests it's the same run as in #361, but nothing states that. **[I]**
  - Whether it went green later is unknown. **[NF]**
- **GATK preprocessing plane [V].**
  - Recorded in `vault/projects/foundries/TOOLSHED_CACHE_ROLLBACK_ISSUE.md` (galaxy-brain
    `a3faae2e`, 2026-09-12; planemo 0.75.44, no Docker).
  - A conda failure on `picard_CollectRnaSeqMetrics` rolled back all 31 `devteam/picard` tools.
  - No matching galaxyproject/galaxy issue was found, so it's probably unfiled. **[NF]**
  - This is a **real upstream failure found by the Foundry**, worth a line on the oracle panel.
- **Lost work [NF].**
  - `vault/agents/wf_foundry/TREE_MANAGE.md` (2026-09-12) lists a `sarek` worktree holding 1
    `_emulated-runs/` directory and 9 refinements dated 2026-09-04, created 2026-08-29 per the
    ghwt note.
  - The worktree is gone, and nothing is in git or `salvage-2026-09-18/`. Treat it as lost unless
    John has a copy.
- **foundry-paper [V].**
  - Sarek appears only as 5 replication-candidate summaries under
    `research/replication/summaries/MED_*__sarek/` (added `e9ba1481`, 2026-10-17).
  - These are literature assessment, not conversions.
  - Sarek is not on the paper's scoreboard, which covers rnaseq and atacseq only (README, 2026-10-20).
  - Contents not reproduced here.

### 3.4 NCBI EGAPx

- **Styling [V].** "EGAPx" is correct. The fixture README @ `40ec7362` titles it "Eukaryotic Genome
  Annotation Pipeline - External (EGAPx)" and uses "EGAPx" 86 times against 44 for lowercase.
- **Pin [V].** `ncbi/egapx` v0.5.2 @ `40ec7362`, `fixtures.yaml:301`.
- **The 2026-08-19 run [L].**
  - Read from `git show d2c404df` on the local branch `egapx-refinements`, which no remote
    contains.
  - Five refinements cover `summarize-nextflow`, `author-galaxy-tool-wrapper`,
    `compare-against-iwc-exemplar`, `validate-galaxy-workflow` and `run-workflow-test`.
  - Commit message: "The run did not reach a green planemo result."
  - **Push or merge these before citing them publicly.**
  - More local-only work in progress: `stash@{0}` "egapx-fixes-wip", mirrored in
    `vault/agents/wf_foundry/salvage-2026-09-18/egapx-stash0.patch`. **[L]**
- **Outcome:**
  - 8 draft steps, with 2 pinned and 6 deferred.
  - `gxwf draft-extract` dropped all 8, leaving `steps: {}`.
  - `gxwf validate` still passed, exit 0. The refinement names this as a hole in the oracle.
  - Planemo runs 1–2 hit the 900 s startup timeout, with no JSON written.
  - Planemo run 3 returned an execution error on the `UNRESOLVED-reads-metadata.tabular` test input.
- **The headline finding [L].** `compare-against-iwc-exemplar` ranked `annotation-braker3`, where
  structural annotation is one tool step.
  - `gxwf tool-search "EGAPx"` then found `richard-burhans/ncbi_egapx` (3 tools) and
    `fubar/egapx_runner`.
  - The refinement leaves the question open: should the pipeline ask "is this source already a
    tool?" before decomposing it?
- **Second test-drive [V].**
  - Separately, the #478 commit (`100c17f5`) says an EGAPx test-drive "cut 95 processes to 3 steps".
  - #480 (closed, not merged) describes that run's 6 ledger entries for the cuts.
  - The fix that merged was #479 (`6be00e80`), which adds `kind: dropped|gap` ledger entries.
  - That run may differ from the 8-step one above, so don't merge the two numbers. **[I]**
- **Fixed since [V].**
  - #466 and #467 (IO names, `script_excerpt`) were fixed in #469.
  - #485 (commented-workflow parsing) was fixed in #486.
  - #714 (bind authored UDTs to workflow steps, merged 2026-10-24) is relevant to any decomposition
    retry.
  - #468 (UDT schema and validation) is open.
- **Don't cite** "95 processes against 95 grep ground truth". That is the grep oracle RESEARCH_GOALS
  rules out.
- **foundry-paper [V].** EGAPx appears only in Tool Shed tool-family data under
  `research/galaxy_tools/`.

### 3.5 CWL

- **Runs [V].** The four emulated runs on `main`, under `casts/claude/_emulated-runs/`, are
  `cwl-userguide-1st-workflow`, `ga4gh-challenge-cwl-galaxy-5step`, `mgnify-seqprep-subwf` and
  `salmon-rnaseq-cwl-galaxy-5step`.
  - Each run summary calls its draft "a stub, not runnable".
  - The salmon-rnaseq summary reports that nested `when`/`pickValue` was lost.
  - Each run used a hand-written `extract.mjs`, because no `summarize-cwl` CLI exists.
- **Fixtures [V].** 8 CWL bio-workflow repositories were added in `6a04074e` (2026-05-27), including
  `NCI-GDC/gdc-dnaseq-cwl` and `pitagora-cwl`.
- **Best candidate [I].**
  - `mgnify-seqprep-subwf` already has IWC pins for fastp and mgnify_seqprep and matches an IWC
    entry.
  - Driving it through `advance-galaxy-draft-step`, test data and planemo is the shortest CWL path.
  - Its `when:` on every step stresses the right thing.
- **Other CWL pipelines [V].** `nextflow-to-cwl` and `paper-to-cwl` produce CWL as a target. They
  aren't CWL-source demos.
- **Same gap on the paper route [V].** Like `cwl-to-galaxy`, `paper-to-galaxy` has only
  `index.md` on `main`, with no `scenarios.md` or `eval.md`. `paper-to-workflow-brief` has both.

## 4. "Chosen after the skills were built"

| Target | Selected | Skills it used existed since | Verdict |
| - | - | - | - |
| DengueSeq (paper) | 2026-10-20 (`563/index.md`) | brief pipelines 2026-10-15 (`b2cdd98b`), paper-to-galaxy earlier | **Held-out [V]** |
| bacass, demo (brief runs 1–2) | 2026-10-16 | | Not held-out. Corpus fixtures since 2026-05-01 **[V]** |
| auris-scf1 (paper, Marius) | ≤ 2026-09-16 | | Unknown **[NF]** |
| ebola-rnaseq (interview, Marius) | ? | | Unknown **[NF]** |
| nf-core/rnaseq 3.27.0 (Scott Cain, #655, 2026-10-12, 53 loop iterations) | 2026-10 | | External user, but rnaseq is a fixture since May. **Not held-out [V]** |
| UC4–UC7 interview specs | Vendored into Foundry 2026-06-19 (`3032fdb1`, UC4; from galaxy-brain #27–#30) | | Spec-only. No run seen **[NF]** |
| sarek, EGAPx, CWL fixtures | 2026-05-01, 05-03, 05-27 | | **Written-against [V]** |

So the only clean held-out claim today is **DengueSeq**, against casts at or before `f275059e`.
Runs after the #694, #696 or #701 changes it fed are not held-out. The abstract's "pipelines the skills were
never written against" should lean on it. A second paper or spec picked now and run before Nov 1
would turn n = 1 into n = 2.

## 5. Poster readiness (by about Nov 1; 8 days, serial planemo, about 2.5 h per run)

| Target | Size | Path |
| - | - | - |
| Methods (DengueSeq) | **S** | (1) Push or archive the two run directories somewhere citable. (2) Optionally run the second (`denv3_test`) case. (3) Optionally re-run the direct arm after #701 for a claim-7 red-to-green pair. (4) Write the figure: brief → ledger → pins → gxwf → planemo. |
| Interview | **S** if Marius's ebola run is green, else **M** | (1) Ask Marius for `ebola-rnaseq`. (2) Failing that, run one UC4–UC7 spec through `interview-to-workflow-brief` → review → `workflow-brief-to-galaxy`, the DengueSeq recipe. (3) Word it as "expert specification + expert review", because #500 is open. |
| nf-core/sarek | **M** | (1) Get Marius's `~/src/foundry-runs/sarek` and read its final state. (2) If it isn't green, scope to one plane (mapping or the GATK preprocessing), as the "capped at 5 steps" scenario intends. Avoid the picard rollback with Docker or by not installing the whole `devteam/picard` set. (3) Report the partial scope explicitly. |
| EGAPx | **S–M** reframed, **L** decomposed | Reframe (John's call): show the run's finding, "the corpus says annotation is one tool, and the Tool Shed already has it". Then build a workflow around `ncbi_egapx`, test it on `input_D_farinae_small.yaml`, and present the failed decomposition plus ledger as the "no template" lesson. Decomposition (L): needs #468 plus UDT authoring for NCBI C++ binaries and a 2.4k-second Galaxy boot. Not realistic by Nov 1. |
| CWL | **M**, or accept the gap | Carry `mgnify-seqprep-subwf` through the loop to planemo. Or say "CWL route implemented; validation in progress", consistent with RESEARCH_GOALS' "accept the gap". |

## 6. Open questions (ask John)

1. Use DengueSeq as the "published methods section" demo? It's held-out, green, and avoids the
   Orbit Hokken overlap.
2. EGAPx reframe to a whole-tool workflow (`ncbi_egapx`), or present it as an honest partial or
   failure?
3. Ask Marius for the `sarek`, `ebola-rnaseq` and `auris-scf1` run directories and their final
   planemo state?
4. Push `egapx-refinements` (`d2c404df`)? It's local-only.
5. Any copy of the lost 2026-09-04 sarek refinements?
6. Interview wording: OK to call it a "free-form expert specification" while #500 is open?
7. CWL: run mgnify-seqprep end to end, or accept the gap?
8. Merge #696 before or after the poster runs? It changes the paper and interview routes.
9. File the picard rollback as a Galaxy issue? It's an oracle-panel example.
