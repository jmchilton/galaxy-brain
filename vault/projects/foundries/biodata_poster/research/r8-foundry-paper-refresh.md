# R8: foundry-paper refresh (`c1c9bcf6` → `e866ed12`)

> [!WARNING]
> **Sensitive. Internal use only.** `nekrut/foundry-paper` is still **private**: `gh repo view`
> reported `PRIVATE` on 2026-10-29.
> - This file follows R3's rules. It summarizes and points. It reproduces no correlations, gene,
>   transcript, record, peak or count-cell figures, no Galaxy invocation, history or workflow IDs,
>   and no host paths.
> - The only counts here are structural: workflows, step kinds, test-case tallies and commit dates.
>   They also include gxwf results I produced myself today.
> - Public upstream PR and issue numbers are named.
> - The galaxy-brain site renders `vault/projects/**` sub-files, so check with John before
>   committing.

- **Repo state read:** `~/projects/repositories/foundry-paper`. The tree was clean, so I ran
  `git fetch` and `git pull --ff-only`. HEAD and `origin/main` are both **`e866ed12`**
  (2026-10-29 15:10 EDT).
  - That is 15 commits since `c1c9bcf6`, all by `nekrut`: 9 on 10-26 and 6 on 10-29.
  - The diff is about 16k files, but roughly 13.7k of them are renames from the 10-29 layout
    standardization. About 2.5k files are genuinely new.
- **Cross-checks, 2026-10-29:**
  - `galaxyproject/foundry` `origin/main` @ `9f83fd55` (10-28, fetched);
  - `jmchilton/galaxy-tool-util-ts` `origin/main` @ `a0476900` (fetched);
  - npm `@galaxy-tool-util/cli` 1.15.0 (published 10-27);
  - `gh` reads of foundry#723, tools-iuc#8554/#8808, usegalaxy-tools#1791 and galaxy#24435.
- **My own check:** I ran unpatched, released `gxwf` 1.15.0 (`validate --strict-state --connections`)
  in the scratchpad against 16 foundry-paper workflows (§4.3).
- **Tags:** **[V]** verified from a primary artifact or command today, **[I]** inferred, **[NF]**
  looked for and not found, **[V-R3]** taken from R3 and not re-checked.
- **Path convention (same as R3):** `fp:` = `foundry-paper/`, `fo:` = `foundry/`.

---

## 1. Executive summary

1. **Nothing new is held out, and nothing comes from an unstructured source.**
   - The same two pipelines (nf-core/rnaseq 3.13.2 and nf-core/atacseq 2.1.2) and the same
     trajectories were rebuilt. No new pipeline, methods-section, expert-spec, CWL, sarek or EGAPx
     work appears. **[V]**
   - Everything new belongs to the **Nextflow ground-truth supporting panel**, not to the poster's
     lead.
2. **The headline change is a Tool Shed reversal.** On 10-26 a hard policy was recorded as a "User
   instruction": if a Galaxy, IUC or Tool Shed tool exists, no UDT
   (`fp:workflows/TOOL_SELECTION_POLICY.md`). The user is presumably Anton **[I]**. Both pipelines
   are being rebuilt on published wrappers under that policy, as "maintained-tools" / "native"
   successors. **[V]**
   - **RNA-seq:** five successor workflows. Every Planemo case passes on both the original and the
     renamed two-sample fixture.
     - Four of the five have zero UDTs. The fifth (STAR+RSEM) has one explicitly authorized RSEM
       adapter, because the merged IUC wrapper (#8554) isn't installed on usegalaxy.org.
     - The scientific comparison is **incomplete, and stated as incomplete**. One route has
       unresolved expression differences, and the repo declines to call them agreement. **[V]**
   - **ATAC-seq:** a migration in progress.
     - All ten routes have alignment-stage checkpoints.
     - Component checks for orphan removal, coverage and consensus pass.
     - **One** complete native trajectory exists: no-consensus BWA, 76 steps, using only HOMER
       adapters. It passes Planemo and matches all of its primary outputs against pinned nf-core.
     - The other nine full routes and the paper rerun are **not done**. **[V]**
3. **R3 caveats, scored:**

   | Caveat | Direction | Why |
   | - | - | - |
   | Tool Shed bypass | **Much better** | Every Tool Shed step in the new candidates carries a changeset pin |
   | Patched checker | **Resolved upstream** | Unpatched released gxwf 1.15.0 accepts all 16 workflows I tried, with zero invalid and zero skipped connections (§4.3). Anton's own runs still use the local patch |
   | Criteria set after results | **Better for RNA, unproven for ATAC** | RNA now refuses to relabel differences as agreement. ATAC has no pre-declared plan |
   | Old Foundry SHA | **Worse** | The same `foundry-skills` 2026.9.17 plugin cache, now 204 commits behind main |
   | Held-out status | **Unchanged** | Still not held out |

   **New caveat:** these are **tool-swap migrations of the earlier Foundry translations**, not fresh
   Nextflow translations.
   - The builders read the historical Galaxy workflow as their baseline. The RNA summary records
     source ecosystem `galaxy` @ `6720c3ca`. Pinned nf-core outputs serve only as the comparison
     oracle. **[V]**
   - The successors were composed by **scripted Python builders** checked into the repo **[V]**,
     presumably agent-written **[I]**, not by a Foundry pipeline skill. **[V]**
   - The per-step `gxwf draft-next-step` / `draft-validate` "gates" are a replay over a finished
     candidate (§4.6). **[V]**
   - Foundry's oracles and schemas were used. Its Molds and pipelines did not compose these
     workflows.
4. **Best new poster material:**
   - **Claim 1 (knowledge, not syntax).** A real Foundry failure was traced to a knowledge defect,
     not a syntax one. Mold text let a "weak" discovery hit route to UDT authoring. The defect was
     filed publicly as **foundry#723** with exact Mold locators and hashes. It is still open, with
     no Foundry fix yet. **[V]**
   - **Claim 5 (oracles).** Upstream fixes went to real artifacts: IUC featureCounts **#8808**
     (merged 10-29, which the repo hasn't recorded yet), a usegalaxy.org install request
     (**usegalaxy-tools#1791**, open), and an oracle fix (galaxy-tool-util-ts #204/#205, released
     as 1.15.0). Foundry was then re-cast against that release (`f3cbdd24`). **[V]**
   - **Claim 6 (explicit gaps).** This keeps getting stronger. There are open-requirements ledgers
     with blocking flags, an "output limitations" inventory, and a report rule that forbids
     borrowing an earlier PASS (`fp:workflows/WORKFLOW_STANDARD.md`). **[V]**
5. **Timing.** The on-time print upload date (Oct 28) has passed. A late upload still works but
   carries a fee (R6). These results can go on a late-fee print, the live page or QR target, an
   insert, or the virtual gallery. **[V-R6]** for the rule; **[I]** for the options.

---

## 2. What changed, by commit

| Date | Commit(s) | Change | Tag |
| - | - | - | - |
| 10-26 | `21634bd7`, `6720c3ca` | RNA **visual report**: nf-core overview, five historical UDT workflow diagrams with UDTs in orange, and published Fig. 3A–D beside the retained reconstruction (`fp:workflows/rnaseq/visual-report/`) | [V] |
| 10-26 | `4c7e86a0` | `fp:workflows/TOOL_SELECTION_POLICY.md` created ("User instruction, 26 October 2026") plus RNA Tool Shed and installed-tool discovery receipts | [V] |
| 10-26 | `c4331930` | Five RNA successors built "entirely from maintained Galaxy tools" (`fp:workflows/rnaseq/maintained-tools/2026-10-26/`) | [V] |
| 10-26 | `211ebb70` | **foundry#723 filed.** Also a fastp datatype runtime repair (wrapper labels plain FASTQ as gzipped) | [V] |
| 10-26 | `28e78a03` | RNA maintained-tool Planemo results and `VISUAL_REPORT.md` | [V] |
| 10-26 | `1273c89a`, `cc7ff09b` | RSEM exception added to the policy. A UDT adapter that profiles merged IUC #8554, validated locally and on Galaxy | [V] |
| 10-26 | `9b5aa3c7` | ATAC **visual report** plus `TOOL_AUDIT.md`. Every historical UDT family gets a named published replacement. "Zero new UDTs and zero new Galaxy invocations" | [V] |
| 10-29 | `8adb90cc` | `fp:workflows/WORKFLOW_STANDARD.md` and templates, plus a layout checker. ATAC is relocated to the RNA layout with a hash manifest (`fp:workflows/atacseq/status/2026-10-29-layout-*.json`). No executions | [V] |
| 10-29 | `bfda8534` | ATAC missing-tool exception added to the policy, covering HOMER and Chromap adapters only. **usegalaxy-tools#1791** opened. Alignment checkpoints for all ten routes | [V] |
| 10-29 | `9d62b582`, `ea3627c4`, `4864ed4a` | ATAC component compositions (orphan, coverage, consensus), the featureCounts fix (**tools-iuc#8808**) and its upstream CI, and the full no-consensus candidate | [V] |
| 10-29 | `e866ed12` | No-consensus candidate verdict, scoped to the primary outputs of the original fixture only | [V] |

The top-level `README.md` scoreboard was reworded. RNA now leads with the maintained-tool result.
ATAC is shown as "historical UDT … migration not yet implemented". That ATAC line predates the 10-29
work and is already stale. **[V]**

**Not new [V]:**
- Both paper replications (Patel 2025, Punga 2026). Their directories were relocated, and visual
  side-by-side reports were added, but **neither was rerun**. Both READMEs say so.
- IUC #8554 (RSEM), merged 10-19, before `c1c9bcf6`.
- galaxy#24435 (editor), still open.

---

## 3. Per new item

| # | Item | What it is | Maturity | Date / SHA | Foundry version used | Tag |
| - | - | - | - | - | - | - |
| 1 | Tool-selection policy | A hard "existing tool ⇒ no UDT" rule. It explicitly overrides "Foundry skill fallbacks". Two dated, scoped exceptions: RSEM, and ATAC HOMER/Chromap adapters | Policy, in force | `4c7e86a0` → `bfda8534` | n/a. It is a local override of Foundry knowledge, not part of it | [V] |
| 2 | RNA successors, trajectories 1–5 (`fp:workflows/rnaseq/maintained-tools/2026-10-26/`) | Tool-swap migration of the historical Foundry-translated workflows (baseline `6720c3ca`): five flat workflows on IUC/bgruening wrappers plus text and collection tools. Tool Shed steps per workflow range from single digits to high teens, and every one has a changeset pin. Zero UDTs in workflows 1–4, one in workflow 5 | **Runtime-green, scientifically incomplete.** Every Planemo case passes (original plus renamed two-sample). Numerical comparison: some routes match, one has unresolved differences, one is still pending. Wrapper output gaps are inventoried. Not promoted over the historical registry | 10-26, `c4331930` → `cc7ff09b` | Plugin cache `foundry-skills/2026.9.17` (`scripts/build.py` `SKILLS`). Same plugin as R3, so Foundry `5aac370f` [I]. The skill hashes weren't re-checked | [V] mechanics; [I] pin |
| 3 | RSEM IUC-profile adapter | A UDT reproducing the workflow-used profile of merged IUC #8554 RSEM, which is absent on usegalaxy.org | Local IUC-fixture checks pass. Galaxy cases pass. Matches local replay. Full trajectory equivalence is "unassigned" because published STAR settings differ | 10-26, `1273c89a`, `cc7ff09b` | Validated with the `galaxy-skills/2026.9.17` `udt-authoring` validator | [V] |
| 4 | **foundry#723** | Public issue: "Require existing Galaxy/IUC/Tool Shed tools; prohibit replacement UDTs …". It cites `discover-shed-tool`, `advance-galaxy-draft-step` and `author-galaxy-tool-wrapper` by line, with hashes, plus acceptance cases | **Open, zero comments** (10-29). No Foundry commit addresses it | Filed 2026-10-26. Ledger at `fp:workflows/rnaseq/maintained-tools/2026-10-26/foundry-policy-issue/` | The Molds were checked against Foundry main `f48c01b6` (10-25). The ledger's `foundry_head` is `215b0a4c` (09-16), an ancestor of `5aac370f`, so it probably records the cast's lineage commit [I] | [V] |
| 5 | RNA and ATAC visual reports | Standard-order reports: conversion, trajectories, tests, paper. UDTs are orange. Published panels sit beside reconstructions | Presentation of existing results. ATAC uses CC0/MIT nf-core art and CC BY 4.0 paper panels, as recorded | 10-26 | n/a | [V] |
| 6 | ATAC tool audit and migration spec (`fp:workflows/atacseq/maintained-tools/2026-10-26/`) | Every historical UDT family is mapped to a published wrapper, a composition, an install, or "helper equivalence unresolved". Includes `replacement-requirements.json` per route and `DEPENDENCIES.md` | A specification, explicitly "not executable successor workflows" | 10-26, `9b5aa3c7` | Discovery schema from `foundry-skills/2026.9.17` (`scripts/audit.py`) | [V] |
| 7 | Workflow standard and layout migration | A shared directory and report contract, `layout.json`, templates, a checker, and a relocation manifest. The layout check passes | Infrastructure | 10-29, `8adb90cc` | n/a | [V] |
| 8 | ATAC wrapper adapters (HOMER, Chromap) plus install request | UDT adapters that reproduce the actual IUC XML command profiles. usegalaxy-tools#1791 asks to install both on Main and Test | The component checks pass locally and on Main. The first Chromap attempt ran out of memory and the retry passed. #1791 is **open** | 10-29, `bfda8534` | n/a | [V] |
| 9 | ATAC alignment checkpoints, 10 routes (`…/2026-10-29/alignment-checks/`) | Alignment-stage partial workflows with zero UDTs, except one on the Chromap route | Explicitly "not full ATAC-seq trajectory". Most passed. One Bowtie2 diagnostic was still being repaired at the last commit (`pending-comparisons.json`) | 10-29 | Validated with local gxwf plus the patch | [V] |
| 10 | ATAC component compositions (orphan, coverage, consensus, SAF↔GTF) | Native SAMtools/AWK/BEDTools compositions replacing helper UDTs. **CWPair2 rejected** as non-equivalent, with the reason recorded | Local fixtures and Galaxy component tests pass for the scoped cases. Higher replicate thresholds and membership matrices are still open | 10-29, `ea3627c4`, `4864ed4a` | n/a | [V] |
| 11 | featureCounts float `frac_overlap` fix | A wrapper patch with regressions. Local Planemo suite passes. Upstream CI passes | **tools-iuc#8808 merged 2026-10-29 19:14 UTC**. The repo still says "awaiting review". Tool Shed publication and Main deployment are unverified | 10-29, `9d62b582` | n/a | [V] (merge from `gh`) |
| 12 | **ATAC no-consensus native trajectory** (`…/native-no-consensus/trajectory-9-…/`) | 76 steps: mostly pinned Tool Shed tools, built-ins for the rest, and 2 UDT steps (one HOMER adapter family). The only full native ATAC route | Planemo passes on the original fixture. A scoped verdict says all primary library and group outputs match pinned nf-core. Retained differences are listed. **No renamed or two-sample case.** Planemo assertions are shallow (size, column, line count, one text check); agreement comes from the separate downloaded comparison | 10-29, `9d62b582` → `e866ed12` | Local gxwf plus the patch; builder script similar to item 2 | [V] |
| 13 | Validator correction, carried forward | The same Apply Rules collection-type patch, re-applied to the local tool-util install (`…/2026-10-29/validator-correction/`). It retains `uncorrected-terminal.json`, which shows the unpatched local checker **rejecting** the 76-step candidate with cascading invalid edges | Still a local patch in Anton's tooling | 10-29 | Local tool-util is probably still 1.14.x [I] | [V] |

---

## 4. R3 caveats: better or worse?

### 4.1 Held-out status: **unchanged** [V]

- Same pipelines at the same SHAs (`a10f41af`, `1a1dbe52`).
- `fo:workflow-fixtures/fixtures.yaml` still pins nf-core/atacseq 2.1.2 [V-R3].
- No new target, no selection protocol, and no "never written against" claim anywhere in the new
  docs. The grep for held-out, interview, methods-section and brief wording returns nothing.

### 4.2 Tool Shed bypass: **much better, with three qualifications** [V]

**Structural evidence** (my counts over the candidate `.gxwf.yml` files):
- RNA successors: all non-built-in steps are pinned Tool Shed tools, except one RSEM UDT.
- ATAC alignment checkpoints: zero UDTs, except the Chromap route.
- ATAC native trajectory: 2 UDT steps out of 76.
- Every Tool Shed step checked carries a `changeset_revision`.
- Compare R3: canonical RNA had zero Tool Shed steps, and canonical ATAC had 1–2 per workflow
  against dozens of UDTs.

**Qualifications:**
1. **The fix came from a human policy, not from Foundry.** The policy text says it overrides
   "Foundry skill fallbacks". #723 remains open and unaddressed on Foundry main. So the knowledge
   base still encodes the behavior that produced the UDT-heavy workflows. **[V]**
2. **UDT adapters remain where a wrapper is published but not installed** (RSEM, HOMER, Chromap).
   They are documented profiles of real IUC XML with install requests. That's honest, but
   "installable revisions" is only true once #1791 lands and RSEM is installed. **[V]**
3. **ATAC is mostly unfinished.** Nine of ten full routes are still historical UDT workflows.
   **[V]**

### 4.3 Patched checker: **resolved upstream, not yet adopted by Anton** [V]

**Timeline (all [V]):**

| Date | Event |
| - | - |
| 10-20 | Anton's local patch |
| 10-25 | John opens galaxy-tool-util-ts#204 on the unknown map-over cascade. PR #205 merges: `RuleSet` is ported, and `collection_type_from_rules` outputs are now typed |
| 10-27 | 1.15.0 published to npm |
| 10-27 | Foundry `f3cbdd24` (merged in #736, 10-28): "upgrade gxwf and Galaxy schemas to 1.15.0 … Re-cast molds and pipelines" |

Don't imply foundry-paper caused #204. The issue doesn't cite it. **[I]**

**My check today** used unpatched `@galaxy-tool-util/cli@1.15.0` with `validate --strict-state
--connections`. Every workflow returned exit 0, all tool states OK, connections valid, **0 invalid,
0 skip**. The 16 workflows were:
- the 10-29 ATAC native candidate;
- all ten historical canonical ATAC workflows (`fp:workflows/atacseq/trajectories/*/galaxy-workflow.gxwf.yml`);
- all five RNA successors.

Anton's 10-29 receipt shows the unpatched *older* checker rejecting the same native candidate. So
the patch was necessary then and isn't needed now. **[V]**

**Remaining gap:** Anton's recorded gates still come from the patched local install. Any poster
statement should cite a 1.15.0 re-validation, either mine or, better, one by Anton. **[V]**

### 4.4 Old Foundry SHA: **worse** [V]/[I]

- The new scripts load skills and schemas from the same `foundry-skills/2026.9.17` plugin cache
  (`fp:workflows/rnaseq/maintained-tools/2026-10-26/scripts/build.py`, `fp:workflows/atacseq/maintained-tools/2026-10-26/scripts/audit.py`).
  The `udt-authoring` validator comes from `galaxy-skills/2026.9.17`. **[V]**
- That this is still Foundry `5aac370f` is **[I]**, because I didn't re-hash the SKILL.md files.
- `5aac370f` is now **204 commits** behind Foundry main `9f83fd55` (R3: 191). **[V]**
- Main now has things this work lacks:
  - the gxwf 1.15.0 re-cast;
  - #722, "extract on the last concretizing call", in `advance-galaxy-draft-step`;
  - Nextflow end-to-end scenarios (#729, `fdf45cc4`/`34c11371`). **[V]**

### 4.5 Criteria set after results: **better for RNA, not shown for ATAC**

- **RNA [V].** The successor report refuses to transfer the historical PASS. It states that the
  STAR+Salmon expression differences "are not admitted as scientific agreement" and claims "no
  overall scientific PASS". That reverses R3's concern about a FAIL relabeled as PASS at the user's
  direction.
- **ATAC [NF].** I found no comparison plan written before results.
  - `record_no_consensus_verdict.py` and `scientific-verdict.json` landed in the same commit
    (`e866ed12`).
  - The verdict reuses the earlier "admitted HOMER variation" from repeats of the unchanged source,
    which R3 classed as retrospective.
  - Its scope statement is narrow and explicit: original fixture, primary outputs only, not the
    other nine routes, not the paper. That helps.
  - The 10-20 `COMPARISON_PLAN.md` may define the primary-output set **[I]**.

### 4.6 New caveat: migrations composed by scripted builders, gates replayed

The script mechanics are **[V]**. That an agent wrote the scripts is **[I]**.

- **These are migrations, not translations.**
  - **RNA [V].** `build.py` `baseline()` loads each historical Galaxy workflow, which the 10-24
    Foundry translation produced. It writes `summary-galaxy-workflow.json` with source ecosystem
    `galaxy` @ `6720c3ca`. Then it hand-encodes the replacement steps.
  - **ATAC [V].** `build_alignment_checks.py` reads each historical trajectory for its inputs and
    tests. `build_no_consensus.py` extends the alignment checkpoint and copies the historical test
    data and job.
  - **ATAC step graph [I].** The step graph is re-authored in the script rather than copied, but it
    follows the historical topology.
  - **Ground truth [V].** nf-core enters only as the comparison ground truth.
- `fp:workflows/rnaseq/maintained-tools/2026-10-26/scripts/build.py` writes `candidate.gxwf.yml` directly
  from discovered wrapper schemas. It then derives `initial-draft.gxwf.yml` by stripping state and
  setting `tool_version: TODO`.
- `scripts/validate.py` loops over the *finished* candidate's steps. For each one it calls
  `gxwf draft-next-step`, copies the concrete step into the draft, and calls `draft-validate`.
- The ATAC builders (`…/2026-10-29/scripts/build_*.py`, `validate_alignment_checks.py`) follow the
  same pattern.
- There is no `foundry-run.yml` phase ledger, and no reference to `pipeline-nextflow-to-galaxy`,
  anywhere under either `maintained-tools/` tree.
- **Consequence for claims 3 and 4 [I].** These runs show Foundry **oracles and schemas** at work:
  gxwf, discovery schemas, `report-foundry-run-feedback`, and `validate-galaxy-tool-discovery`.
  They do **not** show Molds or pipelines composing the workflow. The gates are an honest
  per-step validation of a finished design, but they aren't a prospective draft loop. Wording on
  the poster must not blur this. R3's 10-24 audit flagged a related pattern: a ledger "populated
  retroactively".

### 4.7 New caveat: shallow Planemo assertions on the ATAC native run [V]

- The no-consensus tests assert size, column count, line count and one text check, on a single
  fixture with no renamed case.
- Under R5's composite "Planemo-green" gate (§5.2) this wouldn't count on its own. Correctness
  rests on the downloaded comparison.
- The RNA successors do have the renamed two-sample case and richer text assertions.

### 4.8 Feedback loop: **half-closed** [V]

| R3 status | Now |
| - | - |
| Two unfiled Foundry drafts | **Rules collection type:** overtaken by galaxy-tool-util-ts#204/#205, John's oracle fix plus the Foundry re-cast. Never a Foundry issue. **featureCounts:** went to IUC as #8808 and merged. Never a Foundry issue |
| No Foundry issue from Anton | **foundry#723 filed** (Anton's only Foundry issue). Open, unanswered, no re-cast yet |
| galaxy#24435 | Still open |

---

## 5. Which new results strengthen which poster arguments

Frame every row as a supporting-panel item (Nextflow ground truth), unless it says otherwise.

### 5.1 Abstract claims 1–9

| Claim | New evidence | Effect | Tag |
| - | - | - | - |
| **1. Knowledge problem, not syntax** | foundry#723 traces UDT duplication to *knowledge*: Mold prose that treats a weak discovery hit as licence to author. Every UDT workflow was syntactically valid, and gxwf 1.15.0 accepts all ten historical ATAC workflows. Faithful translation also needed knowledge the models don't have: which wrappers are installed where, wrapper quirks (fastp gzip label, featureCounts integer threshold), and server availability | **Strong.** Probably the cleanest real-world illustration available | [V] |
| 2. Inspectable knowledge base | #723 cites Mold files by line and content hash. The KB's inspectability let an outside user pinpoint the defect | Moderate | [V] |
| 3. Molds compile into skills with provenance | The #723 ledger carries a cast's revision, content hash and SKILL.md hash. But the new runs weren't *composed* by Molds (§4.6) | Weak to moderate. Use the ledger, not the runs | [V] |
| 4. Pipelines compose skills | Nothing new. The successors bypass the pipeline skill | **No support** from the new work | [V] |
| **5. Oracles decide correctness** | (a) Tool Shed discovery receipts and changeset pins on every Tool Shed step. (b) gxwf strict-state and connection checks per step, with the oracle *itself* fixed upstream and released. (c) Planemo green on all RNA cases and the ATAC native run. (d) Structured failures fed fixes: fastp datatype repair, Chromap OOM retry, CWPair2 rejection, and featureCounts → IUC#8808 | **Much stronger** on the Tool Shed leg. Qualify: gxwf passed the UDT-heavy workflows too, because it doesn't judge tool *choice* | [V] |
| **6. Incompleteness is explicit** | Open-requirements ledgers with `blocking` flags. RNA "output limitations" (unexposed matrices not counted as reproduced). `WORKFLOW_STANDARD.md` forbids manufacturing a stage or borrowing a prior PASS (`NOT_IMPLEMENTED`/`NOT_RUN` allowed). ATAC `TOOL_AUDIT.md` marks "helper equivalence unresolved". The verdict carries an explicit scope | **Stronger.** Still the best material in the repo | [V] |
| **7. Update knowledge, recompile** | (a) Oracle loop: the RuleSet gap was patched locally (10-20), fixed upstream (#205, 10-25), released (1.15.0), and Foundry re-cast against it (`f3cbdd24`, 10-27). The unpatched released checker now accepts Anton's workflows (my check). (b) Knowledge loop: #723 filed with acceptance cases; **not yet fixed or re-cast** | **Verified:** the oracle was fixed upstream, released, and adopted by a Foundry re-cast [V]. The `f3cbdd24` message doesn't name the RuleSet port; the release it pins includes it. **Inferred:** that this counts as claim 7 ("knowledge behind a failed conversion"). #204 gives a standalone repro and cites no conversion [I]. The knowledge-layer loop is half done. Fixing #723 and re-casting before Nov 4 would close it | [V] mechanics; [I] as claim 7 |
| **8. Early results** | RNA successors and the ATAC native trajectory are partial in scope and say so. They are *tool-swap migrations of earlier Foundry translations, checked against pinned nf-core*, not fresh Nextflow translations (§4.6). No new free-form expert-spec results | Supports the "partial Nextflow" half only, with that wording | [V] |
| 9. Released openly | Upstream contributions are public (IUC #8554/#8808, usegalaxy-tools#1791, galaxy#24435, foundry#723). The repo itself is still private, and the README release questions are still open | Neutral. The upstream PRs are citable public artifacts | [V] |

### 5.2 Unstructured-sources lead

- **No new direct evidence [NF].** foundry-paper remains Nextflow-only. The lead still rests on
  DengueSeq and the expert-spec runs (R2, R5).
- **Indirect support [I]:**
  - The tool-selection failure is route-independent. Any route that reaches
    `advance-galaxy-draft-step` and `discover-shed-tool`, including `workflow-brief-to-galaxy`,
    inherits it. The fix (#723) therefore benefits the unstructured routes too.
  - The repo's "native" vocabulary (installed published wrappers, no UDTs) gives the poster a
    concrete definition of what a "native Galaxy workflow" means. Keep it separate from "from
    unstructured sources".
- **Ground-truth contrast [I].** The supporting panel can say: "When ground truth exists
  (nf-core), translated workflows were checked output-by-output against pinned upstream runs. That
  is the check unstructured sources can't have, which is why the oracle stack matters there."

### 5.3 Explicit-gaps argument

**Strengthened [V].** Candidate figure sources, which need sign-off:
- `fp:workflows/atacseq/maintained-tools/2026-10-29/open-requirements.ledger.yml` (blocking and non-blocking
  entries, each with `unmet`/`missing`);
- the RNA maintained-tools README "Output limitations" paragraph;
- `fp:workflows/atacseq/maintained-tools/2026-10-26/TOOL_AUDIT.md` (status per family);
- the no-consensus `scientific-verdict.json` `scope` and `retained_differences` fields.

All of them state what isn't claimed.

### 5.4 Recompile loop

- **Oracle loop: closed.** It went patch → upstream fix → release → Foundry re-cast →
  re-validation. **[V]**
  - The re-validation is mine, not Anton's.
  - Whether this counts as claim 7 is **[I]**: #204 doesn't cite a conversion, and the `f3cbdd24`
    message doesn't name the RuleSet port.
- **Knowledge loop: open [V].** #723 is filed and unaddressed. No Foundry PR references it
  (`gh pr list --search 723` returns nothing).
- **Wrapper loop [V].** featureCounts → IUC#8808, merged. It is outside Foundry, but it shows the
  translation surfacing fixes in the ecosystem.
- **Poster card idea [I]:** "a conversion found 4 kinds of upstream defect, each fixed or filed
  where it lives". The four are:
  - Mold knowledge (#723);
  - the validator (tool-util#204);
  - a wrapper (IUC#8808);
  - server installation (usegalaxy-tools#1791).

  galaxy#24435, an editor fix, is a fifth.

### 5.5 Theory and ideas

All of these are **[I]**, drawn from **[V]** observations.

- **Static oracles can't see tool-selection errors.** gxwf validated the UDT-duplicating workflows
  as readily as the native ones. #723's "tool-selection manifest" gate is a new oracle type: a
  provenance check on *why* each implementation was chosen. That extends claim 5.
- **Existence ≠ installation ≠ version ≠ capability.** #723's taxonomy is a crisp, transferable
  knowledge rule:
  - existing but uninstalled → install request;
  - missing option → wrapper enhancement or a stated gap;
  - inconclusive search → block, don't invent absence.
- **Human policy as a hot-patch to the KB.** A one-paragraph local policy overrode compiled skills.
  That argues for policy-shaped knowledge being first-class and recompilable (claim 7), and it is a
  live example of a "developer updates the knowledge".
- **Ground-truth translation as an ecosystem probe.** Matching against pinned nf-core outputs
  exposed wrapper bugs (the fastp gzip label, the featureCounts integer threshold) that Planemo and
  gxwf alone wouldn't. That's a reason to keep the Nextflow panel even with an unstructured lead.

---

## 6. Ask John (updated)

R3 items 1–4 and 8–12 still stand. These are new or revised.

1. **Late-fee print vs live page.** The on-time upload (Oct 28) has passed. Do the 10-26/10-29
   results go on a late-fee reprint, or only on the QR or live page, an insert, or the virtual
   gallery? (R6)
2. **Lead with the tool-selection story for claim 1?** Use foundry#723 as the example of "a
   knowledge defect, not a syntax defect". It's a public issue, but it's Anton's, so it needs his
   OK to feature.
3. **Fix #723 and re-cast before Nov 4.** That closes the claim-7 knowledge loop publicly (Mold
   edits in `discover-shed-tool`, `advance-galaxy-draft-step` and `author-galaxy-tool-wrapper`).
4. **Ask Anton to re-validate on unpatched gxwf 1.15.0.** My scratchpad run passed all 16
   workflows. A receipt in his repo would retire the patched-checker caveat for good. (R3 item 5
   and R5 decision 6 are effectively done upstream.)
5. **Cite the upstream fixes as one "the conversion surfaced real fixes" card?** IUC#8808 (merged
   10-29), IUC#8554, usegalaxy-tools#1791 (open), galaxy#24435 (open), tool-util#204/#205 and
   foundry#723. All are public PRs or issues.
6. **Show ATAC native at all?** Only one of ten full routes is native, with shallow Planemo
   assertions and agreement from a separate comparison. Show it as "in progress", or show only the
   RNA successors?
7. **Wording on composition.** The successors were built by scripted (presumably agent-written) builders with Foundry
   oracles, not by the `pipeline-nextflow-to-galaxy` skill (§4.6). Agree on poster wording, such as
   "Foundry-validated", not "Foundry-generated", for these.
8. **RNA scientific-incomplete status.** Is "every runtime test green, numerical agreement
   partial and stated" acceptable on the poster, or cite only the historical UDT results with their
   caveats? R3 rated the historical results superseded for poster use; the repo now calls them
   "not recommended".
9. **Foundry version to cite (R3 item 12, revised).** The gap is now 204 commits and main has gxwf
   1.15.0. Ask Anton for a current-main re-run of even one successor? Otherwise cite
   `foundry-skills` 2026.9.17.
10. **Repo staleness.** The README still says #8808 is "awaiting review", and the ATAC scoreboard
    line predates 10-29. Ask Anton to refresh before anyone links it.

---

## 7. Evidence index

- **Policy and standard:** `fp:workflows/TOOL_SELECTION_POLICY.md`, `fp:workflows/WORKFLOW_STANDARD.md`,
  `fp:workflows/README.md` (pipeline index), `fp:README.md` (scoreboard),
  `fp:workflows/scripts/check_workflow_layout.py`.
- **RNA successors:** `fp:workflows/rnaseq/maintained-tools/2026-10-26/`, including:
  - `README.md`, `VISUAL_REPORT.md` and `progress.json`;
  - `scripts/build.py` and `scripts/validate.py`;
  - `trajectory-*/{candidate.gxwf.yml,gates/,attempt-*/planemo.json}`;
  - `trajectory-5-star-rsem/rsem-iuc-bridge/`;
  - `foundry-policy-issue/`.
- **ATAC audit:** `fp:workflows/atacseq/maintained-tools/2026-10-26/`, including `TOOL_AUDIT.md`,
  `DEPENDENCIES.md` and `*/replacement-requirements.json`.
- **ATAC native rerun:** `fp:workflows/atacseq/maintained-tools/2026-10-29/`, including:
  - `README.md`, `status.json`, `pending-comparisons.json` and `open-requirements.ledger.yml`;
  - `native-no-consensus/trajectory-9-bwa-pe-broad-no-consensus/attempt-2-comparison/scientific-verdict.json`;
  - `validator-correction/` and `featurecounts-fix/`;
  - `scripts/build_no_consensus.py`.
- **Upstream (public):** foundry#723 (open), tools-iuc#8554 (merged 10-19), tools-iuc#8808 (merged
  10-29), usegalaxy-tools#1791 (open), galaxy#24435 (open), galaxy-tool-util-ts#204 (issue) and
  #205 (merged 10-25). npm `@galaxy-tool-util/cli` 1.15.0 was published 10-27. Foundry `f3cbdd24`
  (gxwf 1.15.0 re-cast) and `f48c01b6` (#722).
- **My gxwf 1.15.0 check:** run in the session scratchpad (not retained in the vault). The command
  was `gxwf validate <wf> --strict-state --connections --cache-dir <tmp>`, over the 16 workflow
  files listed in §4.3.
