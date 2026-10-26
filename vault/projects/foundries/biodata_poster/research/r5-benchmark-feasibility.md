# R5 — Benchmark feasibility (whitepaper)

> [!WARNING]
> **Internal use only.** This file synthesizes R1–R4 and R6. It names run artifacts that exist only on
> John's or Marius's machines, and it points into `foundry-paper` (private, sensitive) without copying
> results from it. Every foundry-paper item is marked **ask John**. The galaxy-brain site renders
> `vault/projects/**` sub-files, so check with John before committing.

- **Written:** 2026-10-24 (Sat). Print upload deadline Wed **2026-10-28** (R6). Meeting **Nov 4–7**.
- **Sources read at:**
  - `galaxyproject/foundry` `origin/main` @ **`bc79096`** (fetched today; no newer commits);
  - `jmchilton/galaxy-tool-util-ts` `origin/main` @ **`34012c0a`** (2026-10-24, fetched);
  - `galaxyproject/iwc` `origin/main` (fetched, directory listing only);
  - `foundry-paper` `origin/main` @ **`c1c9bcf6`** (file names and JSON keys only);
  - local Foundry branch `egapx-refinements` @ **`d2c404df`**, which is not on any remote;
  - local run directories `~/projects/foundry-runs/*` and `~/foundry-runs/nf2g-demo-*`.
- **Tags:**
  - **[V]** verified today from a primary artifact;
  - **[V-Rn]** taken from research file Rn, which verified it, and not re-checked;
  - **[V2-R2]** R2's secondhand tag: from a GitHub PR or issue body, with no artifact seen;
  - **[L]** verified, but the artifact is local-only;
  - **[I]** inferred;
  - **[NF]** looked for and not found.

---

## 1. Executive summary

1. **A defensible printed number is not achievable by Oct 28.** The number in question is "of N
   held-out upstream pipelines, k are gxwf-valid and Planemo-green".
   - Only **one** held-out source has ever gone green end to end: DengueSeq, brief arm, n = 1, local
     only. **[L]**
   - The automated harness (`foundry-build test-pipeline`) has never completed a full route, even on
     nf-core/demo. Its 16 local runs are phase prefixes, the longest is 7 phases, and 3 of 4
     spot-checked SHAs aren't on `main`. **[L]**
   - Four days isn't enough to pick targets, freeze a SHA, fix the gate, run, triage and lay out.
2. **What already exists is case-study evidence, not a sample.**
   - **Four local end-to-end runs reached Planemo** (DengueSeq brief, DengueSeq direct, bacass,
     nf-core/demo). gxwf passed on all four. Planemo was green on **one**. The three reds were two
     identical test-assertion defects and one Planemo crash; no workflow logic failed. **[L]**
   - Anton's foundry-paper adds **2 pipelines** (15 trajectories), reported green by that repo's own
     criteria. Neither pipeline is held out, the run used Foundry `5aac370f`, and the ATAC checker was
     patched (R3). **Ask John.**
3. **gxwf has three blind spots, and they point in different directions.**
   - **False accept:** a zero-step workflow exits 0. Verified in
     `packages/cli/src/commands/validate-workflow.ts` @ `34012c0a`.
   - **Coverage gap:** Galaxy's `RuleSet` isn't ported, so Apply Rules outputs stay untyped
     (`graph-builder.ts` @ `34012c0a`). That is why ATAC needed a patch.
   - **Semantic false accept:** a wrong tool choice passed every static gate (foundry#655).
   - The first two have small fixes. The third needs Planemo assertions plus review. Under any
     benchmark, "gxwf-valid" must be a **composite gate** (§5), not the bare exit code.
4. **Extraction fidelity against `nextflow inspect` is cheap to run but worth little. Leave it off
   the poster.** **[I]**
   - Inspect reports only process-definition names and containers. It has no IO, no edges and no
     branches.
   - The Foundry corpus is in-sample for `summarize-nextflow`.
   - Nextflow and Java aren't installed on this machine, and the fixtures aren't materialized.
   - Better use: an **independent process denominator** for the scope coverage of the pilot targets.
5. **The most honest claim:** per-target case studies with explicit gap lists. Give every promised
   target a row, red or unknown ones included. Add a **pre-registered held-out pilot** whose protocol
   is printed and whose results go to a live page behind a QR code, filled Oct 25 – Nov 3.
6. **The cheapest wins before print:**
   - For bacass and DengueSeq direct, regenerate the tests by re-running `implement-galaxy-workflow-test`
     on post-#701 casts, then re-run Planemo. **Don't hand-edit the assertions.** That gives a
     red→green pair for claim 7. It is not held-out. If a run is still red, record it as red.
   - Fix the zero-step false accept (S).
   - Upstream the RuleSet port (S–M).
   - All three are claim-7 material.

---

## 2. Verdict: is the end-to-end number achievable in time?

### 2.1 What "defensible" requires

For a benchmark rate to survive a genomics audience (R6 §4), all of these must hold. Each is **[I]**,
derived from the failure modes below.

| Requirement | Why | Status today |
| - | - | - |
| **Unit = upstream source.** Not arms, trajectories or trials | DengueSeq counts as 1, not 2. Anton's work counts as 2, not 15 | Not defined anywhere **[NF]** |
| **Pre-registered target list**, chosen after a frozen Foundry SHA | "Never written against" is the abstract's promise | Only DengueSeq qualifies (R2 §4) **[V-R2]** |
| **Frozen Foundry SHA for the whole sweep.** Any knowledge fix a target triggers removes that target from the held-out count | DengueSeq run 3 fed #694/#696, so its re-runs are claim-7 demos, not held-out wins (R2 §3.1) | PR #696 (route rebuild) is **open** **[V-R2]** |
| **A composite gxwf gate** (§5) | gxwf accepts a zero-step workflow | Not wired. The Mold eval has no zero-step property **[V]** |
| **A minimum-assertion rule for "Planemo-green"** | gxwf can't see trivial assertions or hardcoded fixture names (both found by the foundry-paper audit, R3 §1) | Not defined **[NF]** |
| **Outcome ladder fixed in advance, with infra reds counted** | 3 of 4 local reds are test or infra, not workflow | Not defined **[NF]** |
| **Scope coverage reported next to "green"** | Every green so far was scoped: DengueSeq by expert intent, sarek "capped at 5 steps", Anton's "core-only" | Ledgers record `kind: dropped`. No coverage denominator **[V-R2]** |

### 2.2 What has actually run end to end

The rows below are every run found that got as far as a gxwf or Planemo verdict. Statuses were read
from the run's own `galaxy-workflow-validation-result.json` and `workflow-test-result.json`.

| Source (unit) | Route | Held-out? | Foundry | gxwf | Planemo | Tag |
| - | - | - | - | - | - | - |
| DengueSeq DENV3 (Vogels 2024), brief arm | paper → brief → review → Galaxy | **Yes** (picked 10-20, casts ≤ `f275059e`) | `f275059e` (`foundry_head: null`) | pass | **pass** (1/1 test; second case not run) | [L] read today |
| DengueSeq DENV3, direct arm (*same source*) | paper → Galaxy | Yes, same source | `f275059e` | pass | fail: assertion defect, all jobs ok | [L] |
| nf-core/bacass (`bacass-sr-assembly`) | nextflow → brief → Galaxy | No (fixture since 2026-05-01, `a1f097e2`) | local | pass | fail: `assertion-failure`, "Workflow and all jobs succeeded"; partial-line `has_line_matching` on the Unicycler GFA | [L] read today |
| nf-core/demo (`demo-qc-trim`) | workflow-brief-to-galaxy | No (fixture since 05-01) | local | pass | fail: case 1 pass, case 2 Planemo crash, case 3 not runnable | [L], R1 §6.2 |
| ncbi/egapx (2026-08-19) | nextflow-to-galaxy | No (fixture since 05-03) | local branch | **pass on `steps: {}`** | error: unresolved test data | [L] `d2c404df` |
| nf-core/sarek (Marius, ~07-20) | nextflow-to-galaxy | No (05-01) | ? | not seen | invocation rejected on old Galaxy; later state unknown | [V2-R2] |
| nf-core/rnaseq 3.27.0 (Scott Cain, #655) | nextflow-to-galaxy | No | ? | static gates passed (issue body) | not established | [V] #655 body; Planemo [NF] |
| UC1 MRSA / UC3 ATAC (June) | interview-to-galaxy | No (dev scenarios) | June | draft-valid subset | not run | [V-R2] |
| ebola-rnaseq (Marius) | interview-to-galaxy | Unknown | ? | not seen | not seen | [V2-R2] / [NF] |
| 4 CWL emulations | cwl-to-galaxy (5 steps) | No | May | structural only (`--no-tool-state`) | never run | [V-R2] |
| foundry-paper: nf-core/rnaseq 3.13.2 and nf-core/atacseq 2.1.2 | nextflow-to-galaxy (Codex) | **No.** atacseq is a fixture at the same SHA since 05-09; rnaseq is a fixture at another release | `5aac370f` (2026-09-17) | reported pass; **ATAC on a patched checker** | reported green by repo criteria | [V-R3]; **ask John** |

**Harness automation [L].** The 16 `~/foundry-runs/nf2g-demo-*` runs (10-15 to 10-22) are all
nf-core/demo, with 0–7 phases each.
- 11 passed, 4 failed, 1 blocked.
- None ran through `run-workflow-test`.
- Spot-checked SHAs (`e30341000a`, `65a5d53df6`, `989faad1ae`) are **not ancestors of
  `origin/main`**, so they were dev branches. Only `8cf752515f` is on main.

So the scripted runner (`packages/build-cli/src/commands/test-pipeline.ts` @ `bc79096`) exists and
records `foundry_head`. A sweep, though, would be driven by hand or by agents, one target at a time.

### 2.3 Calendar arithmetic **[I]**

| Window | Days | What fits |
| - | - | - |
| Oct 24 → Oct 27 (content freeze for the Oct 28 upload) | ~3 working | Fix the gate (S). Claim-7 red→green re-runs (bacass, DengueSeq direct). Pick and freeze the pilot list and SHA. Write the protocol. Lay out case studies. |
| Oct 28 → Nov 3 (after print, before the meeting) | ~7 | Run the pre-registered pilot (§4, set B) on 2 machines (John + Marius). Publish results to a live page behind a QR code, and optionally a letter-size insert pinned to the board. |
| Nov 4–7 | — | Live demo over the poster-area Wi-Fi (R6 §1) |

Per-target cost, from the only clean held-out run: DengueSeq brief took about **$37 and 154 min of
agent time** for 7 tools [V-R2]. Planemo is serial at about 2.5 h per run [V-R2 estimate], and Galaxy
can take up to 2,400 s to boot for heavy tool sets (EGAPx run 3) [L].

- A 6-target pilot is roughly **18–40 machine-hours** and **$200–500** in tokens, plus about 30 min
  of expert review per brief-route target. **[I]**
  - The upper bound assumes a **capped scope** for each nf-core target, set in its brief. Full
    nf-core pipelines are far larger than DengueSeq's 7 tools. #655's rnaseq run took 53 loop
    iterations for a 63-step draft.
- Triage, not compute, dominates. Every end-to-end run so far needed human diagnosis of a red.

---

## 3. What already exists, by promised target

This is the evidence base for the fallback (§7). Everything is synthesized from R2 and R3 and
re-checked where marked.

| Promised target | Best existing evidence | Held-out | Planemo | Gap list exists? | Poster-ready by Oct 27 |
| - | - | - | - | - | - |
| Methods section | DengueSeq brief arm | **Yes** | green (n = 1) | Yes: 19-entry ledger, 5 open, 2 `kind: dropped` [V-R2] | **Yes** (S) |
| Expert interview | UC1 / UC3 partial. ebola-rnaseq unseen. No live interview exists (#500 open) | No / unknown | none seen | UC1 refinements | Only as "partial", unless Marius's ebola run is green (S) |
| nf-core/sarek | Marius run, plus the GATK-plane attempt (picard rollback) | **No** | unknown / infra-red | scenario asks for a stated partial scope | Partial at best (M) |
| NCBI EGAPx | 08-19 run: empty workflow passed gxwf, Planemo errored; five refinements | **No** | error | refinements (local) | **Yes, as a failure case study** (S). Reframing as a whole-tool workflow is a John decision |
| CWL | 4 emulations; template stubs | No | never | salmon summary ✅/⚠/❌ | Accept the gap, or run mgnify-seqprep (M) |
| "Never written against" | DengueSeq only | — | — | — | n = 1 |
| nf-core/rnaseq, atacseq (not promised) | foundry-paper | No | reported green | strongest ledgers available | **Ask John** |

---

## 4. Candidate pipeline sets

### Set A — "Everything that ran" (no new compute)

- **Members:** every row in §2.2.
- **Held-out:** 1 of ~14 sources (counting each CWL emulation, UC1, UC3 and each foundry-paper
  pipeline as separate sources).
- **Use:** the case-study table (§7). Present it as a ledger of outcomes, **not as a rate**. It isn't
  a sample, because the targets were picked by development needs. **[I]**

### Set B — Pre-registered held-out pilot, one per route (recommended)

The DengueSeq recipe is the only one that has worked held-out: source → Workflow Brief → expert review
→ `workflow-brief-to-galaxy`. Extend it to every route so the abstract's promises each get one
held-out target. **[I]**

| Route | Candidate | Held-out basis | Note |
| - | - | - | - |
| Paper | A second OA methods paper, picked fresh and **not Hokken** (Orbit overlap, R4) | picked after freeze | Turns n = 1 into n = 2 for the paper route |
| Interview / spec | One of UC4–UC7 (spec-only, no published target) | in Foundry since 06-19, never run [V-R2] | "Held out from runs", not "from the KB". Word it that way |
| Nextflow (template-conformant) | nf-core/cutandrun or nf-core/chipseq | zero `nf-core/<name>` hits in `content/`, `casts/`, `packages/` @ `bc79096` [V]. But assay terms appear in 11 files each, and IWC has `epigenetics/cutandrun`, `chipseq-pe/-sr` [V] | "Held-out pipeline, in-distribution assay". Expected to be easiest |
| Nextflow (no template) | nf-core/nascent or nf-core/methylseq | nascent: 0 name hits and 0 assay-term hits. methylseq: 0 name hits and 1 incidental term hit. No IWC workflow for either [V] | The EGAPx-style "no template" case, done held-out |
| CWL | Any of the 5 CWL fixtures whose short repo name has **zero hits** in `content/{molds,pipelines,research,patterns}` (case-sensitive grep): pitagora-cwl, GGR-cwl, h3agatk, gdc-dnaseq-cwl, gdc-rnaseq-cwl [V] | in fixtures since 05-27, but never cited in those dirs | Weak held-out. Accepting the CWL gap is equally honest |

Freeze rule: pick the list and a Foundry SHA **before** any run, and resolve #696 first (merge it or
pin before it). Any Mold edit a target triggers is logged as claim-7 material. If that edit merges
before the run's verdict, the target leaves the held-out count. **[I]**

### Set C — Held-out nf-core pool for a later true benchmark (post-meeting)

Candidates with **zero** `nf-core/<name>` mentions in the KB @ `bc79096` [V]:

> ampliseq, chipseq, cutandrun, scrnaseq, methylseq, hic, nanoseq, rnavar, raredisease, crisprseq,
> circrna, nascent, mhcquant, differentialabundance, rnasplice, phaseimpute, pairgenomealign

- **Excluded:** viralrecon and mag. Both are named in `compare-against-iwc-exemplar/scenarios.md`
  [V].
- **Grading:** grade each candidate by assay-term exposure as well as name exposure. For example,
  amplicon and 16S terms appear in 36 KB files and single-cell terms in 21 [V]. Also record whether
  an IWC exemplar exists.
- **LLM caveat:** "held-out" means held out from the Foundry's development. The model may have
  seen any nf-core pipeline in training. Say so. **[I]**

### Set D — In-sample fixture sweep (26 Nextflow fixtures)

- **Status:** written-against by construction. Every fixture predates or overlaps the Molds: adds
  dated 2026-05-01..07-16 [V, `git log -S` on `fixtures.yaml`]. summarize-nextflow rev 16 was tuned
  across all 26 (R1 §5.3).
- **Use:** valid as a regression or development metric. **Don't** present it as generalization.

---

## 5. gxwf blind spots

### 5.1 The three failure directions

| # | Blind spot | Direction | Evidence | Fix | Effort |
| - | - | - | - | - | - |
| 1 | **Zero-step workflow validates** | false accept | `validate-workflow.ts` @ `34012c0a`: with no tool steps it prints "No tool steps to validate state for." and exits 0 on structure and connections OK [V]. EGAPx: `draft-extract` dropped all 8 drafty steps and 4 outputs, and `gxwf validate` exited 0 (`d2c404df` refinement) [L]. The `validate-galaxy-workflow` eval on main has no zero-step property, and the proposed `eval-add` exists only in the local branch [V] | (a) Merge the `d2c404df` refinement and add the eval property. (b) The Mold procedure also runs `gxwf draft-extract --report-json` (itemizes every drop) and `gxwf validate-tests --workflow <extracted>`, which the refinement says "fails cleanly". (c) Optionally, a gxwf flag that fails on 0 tool steps | **S** |
| 2 | **Apply Rules collection types aren't inferred** | coverage gap: outputs stay `ANY`, so downstream connections can't be confirmed | `graph-builder.ts` @ `34012c0a`: Python's `_resolve_rules_collection_types` / `RuleSet` "is not yet ported — affected outputs stay unresolved (ANY)" [V]. foundry-paper ATAC acceptance used a local 38-line `rules-collection-type.patch` to `@galaxy-tool-util/connection-validation`. Its `reference-check.json` compares the patched CLI against Galaxy's Python RuleSet [V, structure only]. Whether the unpatched checker gave fail or skip: [I], not checked | Port `RuleSet` mapping-axes inference upstream in `jmchilton/galaxy-tool-util-ts` (John's repo), release it, and bump `_required_tools.json`. That is also a public claim-7 "oracle updated, skills re-cast" instance | **S–M** |
| 3 | **A wrong tool choice passes every static gate** | semantic false accept | #655 (open, 2026-10-12): nf-core/rnaseq 3.27.0, 63-step draft. A step was identity-pinned to `iuc/gtftobed12` while an equivalent concrete `gffread` was already in the draft, and "the wrong answer would have been invisible to every static gate: `gxwf draft-validate`, `--concrete --strict-state` and `gxwf validate --connections`" [V] | Not a gxwf job. Only Planemo with real assertions, the review Mold, or an expert can catch it. Disclose it as a residual risk | — |

Two related Planemo-side holes. Neither is a gxwf issue, but both matter for "green":

- **Assertion idioms.** The anchored `has_line_matching` defect showed up in 3 independent runs and
  was fixed in #701 [V-R2]. Bacass's red today is the same family [L].
- **Trivial or fixture-hardcoded assertions** were found by the foundry-paper audit (R3 §1).
  Green Planemo with trivial assertions is a false accept at the runtime layer.

### 5.2 Composite gate to use in any count **[I]**

"gxwf-valid" in a benchmark means **all** of the following:

1. `gxwf validate --json --connections --strict` exits 0 on an **unpatched, released**
   `@galaxy-tool-util/cli`, with the version recorded.
2. The workflow has at least 1 tool step, and every declared in-scope output is wired.
3. Every drop in `gxwf draft-extract --report-json` corresponds to an open-requirements ledger
   entry (`kind: dropped|gap`, #479).
4. `gxwf validate-tests` passes against the *extracted* workflow.
5. Connection `skip`s are listed as `residual_runtime_risks` (already done in demo-qc-trim [V-R1]).

"Planemo-green" means **all** of the following:

1. Every test case defined is run.
2. Every workflow output has at least one content assertion beyond existence.
3. At least one test case uses renamed sample identifiers, which catches fixture hardcoding.
4. Infra reds (Planemo crash, Tool Shed rollback, boot timeout) are reported as their own category
   and count in the denominator.

**Verdict.** These blind spots **block a rate** until the gate is fixed and stated. They **don't
block case studies**, which can show each blind spot as a finding. The EGAPx empty-workflow pass is a
good poster story: "our own oracle had a hole; the run found it."

---

## 6. Extraction fidelity against `nextflow inspect`

### 6.1 What the oracle can measure [V]

These come from `content/research/component-nextflow-inspect/index.md` @ `bc79096`, which was
checked against Nextflow 26.04.6 source.

- `inspect` enumerates `ScriptMeta.allProcesses()`, the **loaded** definitions. That includes
  definitions the entry workflow never calls, but not every `.nf` on disk.
- It emits **one entry per name**, as `{name, container}`. It carries "no process IO, source
  locations, labels, resource directives, subworkflow hierarchy, or channel edges".
- It loads configuration and code through the Nextflow runtime, and may need network access for
  remote projects, config includes and plugins.

### 6.2 How the Foundry uses it today [V]

- `packages/summarize-nextflow/src/resolver.ts` @ `bc79096`:
  - `mergeNextflowInspect` runs `nextflow inspect <root> [-profile P] -format json`, with a
    **30 s timeout** in `commandOutput`;
  - it only overwrites each matched process's `container`;
  - on failure it falls back silently, with a warning.
- Processes come from `discoverProcessFiles`, which walks the whole pipeline root and keeps every
  `.nf` file matching `process NAME {` (skipping `.git`, `work`, etc.). So they are **not** the
  loaded set. The static and inspect name sets differ by design (unused on-disk modules, aliases).
- foundry-paper ran `--no-with-nextflow` (R3 §3b), so it has no inspect oracle either.

### 6.3 Cost [I]

| Step | Estimate |
| - | - |
| Install Java 17+ and Nextflow ≥ 25.04.4 (not present here: `nextflow` not found, and `java` reports no runtime) | ~0.5 h |
| `make -C workflow-fixtures nextflow` (fixtures not materialized locally) | ~0.5 h |
| Run `inspect -profile test` on 26 pipelines; plugin and config downloads on first run | 1–3 h, including failures |
| Comparison script: normalize simple names and aliases, then precision and recall against the summary's process set | 2–4 h |
| Calibrate false diffs (uncalled definitions, aliases, name collisions) | 2–4 h |
| **Total** | **~1–1.5 days** |

### 6.4 Value and recommendation [I]

- What it measures is a **process-name inventory**. That is the shallowest layer, and
  `summarize-nextflow` is likely near-ceiling on nf-core template pipelines. Topology, IO and
  branches, which are what translation fidelity actually depends on, need hand-labeled sets.
- On the 26 fixtures it is **in-sample**.
- Container comparison is **circular** unless `summarize-nextflow` runs with `--no-with-nextflow`,
  because the summary's containers come *from* inspect by default.
- **Recommendation:** don't put an extraction-fidelity number on the poster. If inspect is used at
  all, use it on the Set B Nextflow targets only, as an **independent denominator for scope
  coverage**: "translated workflow covers k of n source process definitions, the rest are ledgered
  as dropped". That number makes "partial translation" (claim 8) concrete. Never restate the
  retracted grep-based sweep.

---

## 7. The most honest fallback claim

**Claim shape [I]:** *"For each target we report what the deterministic oracles said, and what the
Foundry admitted it could not do."* One row per promised target, red rows included, plus a gap list
from a real ledger. No rate.

| Row | Status line (draft facts, not copy) | Gap-list source |
| - | - | - |
| Methods section: DengueSeq | held-out; 7 Tool Shed pins; gxwf pass; Planemo green (1 case); 5 open obligations, incl. 2 stated drops | `dengueseq-denv3-galaxy/open-requirements.ledger.yml` [L] |
| Methods, direct route (same source) | gxwf pass; all jobs OK; red on a test-assertion idiom shared with 2 other runs → knowledge fix #701 → re-cast | #657, #701 [V-R2] |
| Expert spec: UC1 MRSA (or ebola-rnaseq if green) | wrappers pinned after a false Tool Shed miss was fixed and re-cast (`73af1f62`); Planemo not run | R1 §5.1 [V-R1] |
| nf-core/sarek | stated partial scope; upstream picard install rollback found | R2 §3.3 |
| NCBI EGAPx | already a Tool Shed tool; decomposition produced an empty workflow that gxwf accepted → oracle fix | `d2c404df` [L] → push first |
| CWL | route implemented; template-stage only; nested `when`/`pickValue` lost | `_emulated-runs/salmon-rnaseq-cwl-galaxy-5step` [V-R1] |
| (optional) rnaseq / atacseq | ask John / Anton | R3 |

**Cheapest pre-print additions [I]:**

1. For **bacass** and **DengueSeq direct**, regenerate the tests by re-running
   `implement-galaxy-workflow-test` on post-#701 casts, then re-run Planemo. **Don't hand-edit the
   assertions**: a hand edit is a manual fix, not a recompile. That gives two red→green claim-7
   pairs, about 2 × 2.5 h serial. Label them *not held-out*. If a run is still red, record it as
   red.
2. Push or merge `egapx-refinements` and the zero-step eval so the EGAPx story is citable.

---

## 8. Recommended results-panel structure **[I]**

1. **Results table, the main element.**
   - Rows are grouped by route: Paper · Interview/spec · Nextflow · CWL.
   - Columns:
     - Source @ pin;
     - Held-out? (✓ with selection date, or ✗ "development fixture");
     - Foundry SHA;
     - Tools: Tool Shed-pinned / UDT / deferred;
     - gxwf (composite gate);
     - Planemo: green / assertion-red / infra-red / not run;
     - Scope: covered vs ledgered-dropped;
     - Open gaps: count, plus the top one.
   - Use colour only for the Planemo column. Footnote that "green is relative to the declared
     scope".
2. **"What the oracles caught, and missed".** Four cards:
   - EGAPx empty workflow accepted → gate fixed;
   - wrong tool passes static gates (#655) → why Planemo and review exist;
   - assertion idiom red ×3 → note rev → re-cast (claim 7);
   - picard Tool Shed rollback (an upstream bug found).
3. **Gap-list card.** Render the DengueSeq ledger as ✓ resolved / ○ open / ✗ dropped (R1 §9 item 7).
4. **Benchmark box.** Pick one:
   - (a) "Pre-registered held-out pilot: protocol + targets + frozen SHA, results live →QR". This is
     printable today and true whatever the outcome.
   - (b) Only if the pilot finishes before Oct 27: "k of N".

   Don't print a rate built from Set A or Set D.
5. **Honesty footer.** Three lines:
   - held-out = held out from Foundry development, not from model training;
   - n per route;
   - the run SHA, plus local runs to be archived at a stated URL.

---

## 9. Decisions for John

1. **Benchmark on the poster:** print the protocol plus a live QR (recommended), print nothing, or
   push for a small "k of N" by Oct 27?
2. **Unit and gate:** approve "unit = upstream source" plus the composite gxwf and Planemo gate (§5.2)?
3. **Pilot list (Set B):** which second paper, which UC4–UC7 spec, cutandrun vs chipseq, nascent vs
   methylseq, and CWL in or out? Who runs which (John or Marius)?
4. **Freeze SHA:** merge #696 before the freeze, or pin pre-#696?
5. **Zero-step fix:** merge the `d2c404df` refinement plus the eval property, and/or add a gxwf flag?
6. **RuleSet port upstream** in `galaxy-tool-util-ts` before the poster, as a public claim-7 instance?
7. **foundry-paper on the poster:** name rnaseq/atacseq at all? If yes, qualitatively, with the
   not-held-out, `5aac370f` and patched-checker caveats, and with Anton's sign-off (R3 §7)?
8. **Claim-7 re-runs:** do the bacass and DengueSeq-direct re-runs (test phase regenerated on
   post-#701 casts, then Planemo) before Oct 27?
9. **Archive local runs** (DengueSeq ×2, bacass, demo-qc-trim, EGAPx refinements) somewhere public
   enough to cite?
10. **Extraction fidelity:** drop it (recommended), or use inspect only as the Set B coverage
    denominator?
11. **Ask Marius** for the final sarek, ebola-rnaseq and auris-scf1 states before freeze?
12. **"Never written against" wording:** rephrase to "selected after the skills were frozen
    (n = 1 today)"?

---

## Appendix — evidence index

- **gxwf zero steps:** `jmchilton/galaxy-tool-util-ts` `packages/cli/src/commands/validate-workflow.ts`
  @ `34012c0a` (the `results.length === 0` branch). **[V]**
- **RuleSet not ported:** same repo, `packages/connection-validation/src/graph-builder.ts` @
  `34012c0a`, the comment in the tool-step resolver. **[V]**
- **EGAPx empty-workflow refinement:** foundry `d2c404df`,
  `content/molds/validate-galaxy-workflow/refinements/2026-08-19-egapx-pipeline-run.md`. **[L]**
- **validate Mold eval:** foundry `content/molds/validate-galaxy-workflow/eval.md` @ `bc79096`, which
  has no zero-step property; last touched `11b19b65`. **[V]**
- **Inspect contract:** `content/research/component-nextflow-inspect/index.md` @ `bc79096`. Resolver:
  `packages/summarize-nextflow/src/resolver.ts` @ `bc79096`. **[V]**
- **Harness:** `packages/build-cli/src/commands/test-pipeline.ts` @ `bc79096` (last change `d4aa317d`,
  10-15). Runs: `~/foundry-runs/nf2g-demo-*/run.json`. **[L]**
- **Run verdicts:** `~/projects/foundry-runs/{dengueseq-denv3,dengueseq-denv3-direct,bacass-sr-assembly,demo-qc-trim}/**/{galaxy-workflow-validation-result,workflow-test-result}.json`. **[L]**
- **Fixture dates:** `git log -S"name: <x>" -- workflow-fixtures/fixtures.yaml` on `origin/main`.
  **[V]**
- **Held-out grep:** `git grep -i "nf-core/<name>"` and assay-term greps over `content/` @ `bc79096`.
  IWC dirs from `galaxyproject/iwc` `origin/main`. **[V]**
- **#655 and #657:** `gh issue view` (galaxyproject/foundry). **[V]**
- **foundry-paper:** `workflows/atacseq/setup/validator-correction/` @ `c1c9bcf6` (file names, patch
  line count, JSON keys only). Everything else is via R3. **Ask John.**
