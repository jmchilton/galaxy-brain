# Content review: six poster drafts

Reviewer: content agent, 2026-10-29. This review covers content only; visual design is reviewed separately. Each poster was
read from its source (`content.yml`, `poster.html` or `poster.typ`), its README, its `preview.png` and a `pdftotext` of its
`poster.pdf`. I checked claims against `DESIGN_DOSSIER.md`, `research/r2`, `research/r7` and the primary artifacts:

- the preprint PDF;
- the DengueSeq, direct-arm, bacass and demo run directories;
- the foundry git history (`73af1f62`, the `9adc20b7` merge of PR #701, and `origin/main` at `9f83fd55`);
- the GitHub state of the upstream PRs.

## Verdict

No poster has a fabricated number. Every DengueSeq pin, ledger count and hash pair I checked matches the run files or
foundry git. None of the six quotes "48 analyses", the retracted sweep, or an explicit "N of M pipelines" rate. All six
spell *Galaxy Workflow Foundry*, *EGAPx*, *Tool Shed* and *gxwf* correctly.

**Two errors repeat across posters, and both come from the dossier itself:**

- **"Fig 6A" for Hokken.** It is Fig **S4A** (p.36) in the posted preprint.
- **MRSA/ATAC "pass gxwf".** The MRSA run summary says the draft validated, but full validation was never reached.
  I couldn't check ATAC, because no UC3 run summary is in foundry git history, so the ATAC claim is unverified rather
  than wrong.

The primary artifact wins in both cases, so **correct the dossier** before the revision pass, or the error will come
back.

The most-repeated framing problem is the Orbit **0/15** result. Four of six posters drop "open-weight models", and two
also drop "Orbit", so the number reads as if it came from Foundry runs.

**Strongest content:**

- **specimen-vision:** the theory, through its anatomy of a skill.
- **transit-vision:** the story, and the "Route ≠ journey" device that defuses any rate reading.
- **receipt-grounded:** the evidence and its honesty.

**Weakest on the brief:** specimen-grounded. It never states the "knowledge problem" thesis, and it lacks two of the §3
ideas: the two kinds of provenance, and the argument that methods sections omit result-changing choices. Its five
graphs are DengueSeq ×2, MRSA, bacass and nf-core/demo. The last two are unpublished Nextflow development fixtures
outside the evidence bank.

---

## 1. Errors to fix, per poster

Each finding has a tier:

- **MUST:** contradicted by a primary source.
- **SHOULD:** misleading or stale.
- **NIT:** minor.

### transit-grounded

| Tier | Item | Fix |
| - | - | - |
| MUST | "Already published: Baker et al. 2026, Fig. 6A" (`journey.also`) | **Fig. S4A** (preprint p.36). Fig 6A was v2 manuscript numbering (r7 §2.2) |
| SHOULD | MRSA + ATAC notice: "both pass gxwf". The E line is drawn solid through gxwf | MRSA run summary (`4e21bc4f^:…/uc1-mrsa-interview/run-summary.md`, rows 10 and 101): "draft validates; concrete subset terminal-validates; full concrete validate+roundtrip not reached". ATAC (UC3) is unverified: no run summary is in git. Say "drafts validate in gxwf; Planemo never ran", and dash the E track at gxwf |
| SHOULD | Map key: "**Solid:** a public demo cleared this stage" | No run directory is published (r2 §3.1, and the poster's own README). Say "a shown run cleared this stage", or settle it with the publish sign-off (§4) |
| SHOULD | "usegalaxy-tools #1791 … (open)" | **Merged** 2026-10-29 (`gh pr view`). IUC #8808 is merged. galaxy #24435 is still open |
| SHOULD | The methods-text line and the journey record never mention that the agent also had the paper's code | `source-selection.md` checks out DENV_pipeline v1.0 @ `8214cfbb` under `sources/`. Add "paper + linked code (DENV_pipeline v1.0)", as the other five do |
| SHOULD | "0 of 15 graded runs in the Orbit study" | Add "(open-weight models)". p.18: Qwen3 and Llama 3.3 via TACC, on a notebook-approval rule |
| NIT | The E-line entry station shows the Mold slug `interview-to-freeform-summary` | "interview" is on the map despite the dossier's wording rule. Use plain English, as transit-vision does ("Summarize the account") |
| NIT | Map key: "Lines are source types. 13 pipelines" | 2 of the 13 target CWL and 2 are review/maturation (`origin/main content/pipelines/`). Say "13 pipelines on `main`" without implying 13 routes to Galaxy |

### transit-vision

| Tier | Item | Fix |
| - | - | - |
| SHOULD | Compiled-skills card: `tool-search.md cdf8be42…→72f5f7cc…` | This is **source hash → compiled-sidecar hash** (`src_hash`→`dst_hash` in `_provenance.json` at `origin/main`), not before→after. It sits beside the depot's before→after `256e3861…→2e5fa1f8…` and will be misread. Borrow specimen-vision's `≠` / `=` and its "source → copy" header |
| SHOULD | Board here: "One plugin … for Claude Code, Codex and Antigravity: `/plugin marketplace add galaxyproject/foundry`" | That is the Claude Code command (foundry `README.md` l.43). Codex uses `codex plugin marketplace add …` (l.51). Label it "Claude Code:", or point to the Install QR |
| SHOULD | 0/15 | Already says "open-weight models" and "Companion Orbit study". Correct as is; keep it |
| NIT | "Gaps are output": "written as a requirement and **never deleted**" | Not verified against the ledger contract. Drop "never deleted", or confirm entries are resolved, not removed |
| NIT | "Lines are routes … each line is a pipeline … to a Galaxy workflow; 13 are on `main`" | Same 13-pipelines gloss as transit-grounded |
| NIT | "Why the network needs knowledge" header over 30→18 | The preprint attributes the divergence to unstated methods choices plus missing infrastructure and provenance, not to missing knowledge, and the agents were barred from Galaxy skills (r7 §6.5). The body text is accurate. Consider the header "Why methods text isn't enough" |

The rest checked out: the timetable (`foundry-run.yml`), ×7 rounds, the 7 pins, 17 Jun / `73af1f62`, 22 Oct / #701,
UseGalaxy.org for Hokken (preprint p.19), 30/18/29-of-30 (p.2), Fig S4A, and 5 refs hashed.

### receipt-grounded

| Tier | Item | Fix |
| - | - | - |
| MUST | Other routes, Hokken: "Orbit preprint Fig 6A" | **Fig S4A** |
| MUST | CHECKS: `parity vs paper's code … identical` on the Galaxy run receipt | `workflow-debug-report.md` l.44: "Galaxy output bytes were not retained … Byte identity … was not checked in Galaxy." The identity is between the **wrapper chain run outside Galaxy** and the source chain. The footnote ("parity probe ran the paper's code outside Galaxy") understates this. Reword to `wrapper-chain probe vs paper's code (outside Galaxy) … consensus identical`, or drop it. It also sits uneasily next to "No replication of the paper's results yet" |
| SHOULD | Expert spec "Pass gxwf; Planemo never ran" | As for transit-grounded: "drafts validate in gxwf" |
| SHOULD | 0/15 box: "graded runs followed a rule given only in the prompt … So the tools judge. (Baker et al. 2026)" | It never says Orbit or open-weight models, so it reads as Foundry runs. Add "In the Orbit study, on open-weight models, …" |
| SHOULD | "usegalaxy-tools #1791, galaxy #24435 (open)" | #1791 is **merged** now |
| SHOULD | Title: "From **Nextflow, CWL**, Papers, and Conversations…" | It leads with the supporting case, although the 10-24 decision made unstructured sources the lead, and it promises CWL, which this poster honestly marks NONE YET. If the four-source family is kept, reorder it: "From Papers, Conversations, Nextflow and CWL…" (John's call, §4) |
| SHOULD | EGAPx "(fix on a branch)" | That branch is local only (r2 §3.4: push `egapx-refinements` before citing). Push it, or drop the parenthesis |
| SHOULD | BAQ ledger glosses quote later probe values ("0 consensus positions differ", "484 vs 476 rows (472 vs 467 PASS)") while the ledger says open | These match the debug report l.51–52. Their source is the debug report, not the ledger. Label them "measured after the ledger was written", or close the entries (§4) |
| NIT | "AGENT TIME 6 + 144 min" | The scorecard says 7 + 147 min. Both are defensible. Pick one span and use it across all posters |
| NIT | Ref "Karpathy A. The 'LLM wiki' idea." | Give the gist (`gist.github.com/karpathy/442a6bf5…`, created 2026-04-04, r1 §7) |

The rest checked out: the 13 stage Mold revisions and hashes, all pins, the review (10/1/9), the held-out date against
`f275059e` (committed 2026-10-19), and the bacass figures (`b9c16bad`, 6/6, 9/9, 4/5, 3 of 13 with 2 dropped, the
`'^S\t1\t'` assertion, `workflow_defect: false`). $37.26 is in the scorecard (row 6). The three runs behind #701 match r2.

### receipt-vision

| Tier | Item | Fix |
| - | - | - |
| MUST | Hokken note: "(Baker et al. 2026, Fig 6A)" | **Fig S4A**. The README also cites "p.19 and Fig 6A" |
| MUST | Wiki box: "13 pipelines **(source-to-Galaxy routes)**" | False as worded. `origin/main` has `nextflow-to-cwl`, `paper-to-cwl`, `galaxy-workflow-review` and `galaxy-workflow-maturation` among the 13. Say "13 pipelines (routes)" |
| SHOULD | Ledger: "Not yet measured on SRR25366733" (×2) | The debug report l.51–52 records a measurement on SRR25366733: 0 consensus positions differ; 484 vs 476 variant rows. Say "ledger still open", or drop "not yet measured" |
| SHOULD | Note 4: "In the Orbit evals, a rule given only in the prompt…" | Add "on open-weight models" |
| SHOULD | `[[ASK]]` sticky: "nf-core/rnaseq & atacseq **translations**, Foundry-validated" | "Translations" implies Foundry-generated. The dossier says the latest builds were script-assembled. Use "rebuilds", and add "atacseq partial" |
| NIT | The human review is credited to "a human" / "expert" | The expert was an author (J.C.). One parenthesis keeps the Visionary poster honest (r2 §3.1) |

The rest checked out: the run start and end times, f275059e / `foundry-skills 0.2.0`, review brief `e52aca4e` (10/1),
the pins, 7/7, 1/1 test, Galaxy `b18269a1`, 10,707 Ns, 1 of 10,707, +6 of 352, `73af1f62`, and #701 → 8.

### specimen-grounded

| Tier | Item | Fix |
| - | - | - |
| SHOULD | Header: "Why not just prompt the model? A rule given only in the prompt was followed in 0 of 15 graded runs. Baker et al. 2026, p.18" | No Orbit, no open-weight models. Next to five Foundry specimens, it reads as a Foundry result. Add "In the Orbit study (open-weight models)" |
| SHOULD | No. 1 subtitle: "from a methods section" | The source was the paper plus DENV_pipeline code (`source-selection.md`). The ORIGIN row says so, but the subtitle overclaims. Say "from a paper and its linked code" |
| SHOULD | No. 1 D4/D5: "not yet checked on SRR25366733" | Contradicted by the debug report l.51–52. See receipt-vision |
| SHOULD | Fix-the-knowledge, #701: "an **outside user's** nf-core/rnaseq run (#657)" | #657 is Scott Cain's run (r2 §3.1). He co-authors the Orbit preprint. Say "another user's" or "a colleague's" |
| SHOULD | "usegalaxy-tools #1791 and galaxy #24435 (open)" | #1791 is **merged** |
| SHOULD | Implicit rate | Five mounted specimens with ✓ / ✗ / ◐ marks are easy to tally ("1 of 5 green"). Add transit-vision's one-liner that a specimen is one run, not a sample from a population |
| NIT | Key: "13 pipelines: from paper, spec, Nextflow, CWL" | Same 13-pipelines gloss |
| NIT | "1a not yet re-run" | Inferred (r2 §3.1, tagged [I]). The README flags it. Confirm before print |

The rest checked out:

- the pins, 7/7, 1/1, 5 open / 14 resolved;
- 1a: 8/8, 13/13, 0 of 1, 4 open / 6 resolved, 2 dropped;
- bacass;
- demo: 7 open / 11 resolved, 0 drops; the case-2 Planemo `TypeError` crash; case 1 passed;
- MRSA iter1: "1 of 11 bound", and step 5 is the `mobile_to_bed` arity bug (run summary l.113);
- "Planemo: never run (no Galaxy in that environment)", which the run summary says verbatim;
- the PR #701 hash pair `64c477c4→9a636385` (the `planemo-asserts-idioms` `src_hash` in `9adc20b7`);
- "69 skills = 56 from Molds + 13 pipeline harnesses" (69 dirs, 13 `pipeline-*`);
- Fig. S4A.

### specimen-vision

| Tier | Item | Fix |
| - | - | - |
| SHOULD | Key stat row: "0 of 15 · Orbit¹" sits among 13 / 420 / 56 / 69, which are Foundry counts | At 3 m, "0 of 15" in a row of Foundry stats reads as a Foundry score. The sub-text is correct ("Orbit study … open-weight models"). Move it out of the numeric row, or replace the number with "TOOLS DECIDE" and keep 0/15 in the prose |
| SHOULD | Fig 1 shows `discover-shed-tool` "revision 5 · content hash 05c99cba". Fig 3 says the recompile changed the hash to `2e5fa1f8` | Both are true (`origin/main` is rev 5; `73af1f62` was the rev-4 recompile), but the reader sees two "current" hashes. Add a timeline (`256e3861 → 2e5fa1f8` (Jun, rev 4) … `05c99cba` (today, rev 5)), or caption Fig 1 "as of `main` today" |
| NIT | ROUTE: "expert review (1 of 10 answers edited)" | Add "(an author)". Same note as receipt-vision |
| NIT | Title: *From Papers to Runnable Galaxy Workflows* | Honest given the content, but it departs from the dossier options. John's call (§4) |
| NIT | Key: "From a paper, an expert's specification, Nextflow or CWL" | Fine, but this is the only place the expert route appears, and "Conversations" was dropped from the title. Consistent |

The rest checked out: `05c99cba`, `status: reviewed`, revision 5, the 5 refs, `c0940fc0` in `_verify.json`
(`--schema-sha256`), threshold 0.75 and min depth 10 (the gxwf defaults), the 8 skills from the `9adc20b7` diff, Fig.
S4A, and casting being deterministic (`packages/build-cli/README.md` l.50).

---

## 2. Per poster: strengths, weaknesses, and ideas to borrow

### The §3 ideas, by poster

Key: ✓✓ strong, ✓ present, ~ implied or partial, ✗ missing.

| §3 idea | T-grnd | T-vis | R-grnd | R-vis | S-grnd | S-vis |
| - | - | - | - | - | - | - |
| 1 Knowledge problem, not syntax | ✓✓ hero | ✓✓ hero | ✓ body only | ✓✓ concrete example | ✗ | ✓✓ hero |
| 2 LLM wiki, extended | ✓ depot | ✓ | ✓ | ✓ | ~ refs only | ✓ |
| 3 Molds → skills + provenance | ✓ | ✓ | ✓ receipt block | ✓ | ✓ key | ✓✓ anatomy |
| 4 Pipelines are routes | ✓✓ map | ✓✓ map | ✓ | ~ (wrong gloss) | ✓ | ✓ |
| 5 Tools decide (+0/15) | ✓ | ✓✓ | ✓ | ✓ | ✓ | ✓ |
| 6 Explicit incompleteness ("methods omit choices") | ✓ ledger, ✗ argument | ✓✓ both | ✓ ledger, ✗ argument | ✓✓ both | ✓ defects, ✗ argument | ✓ ledger, ✗ argument |
| 7 Fix the knowledge, recompile | ✓ | ✓ | ✓ | ✓ | ✓ | ✓✓ "Molting" |
| 8 Two kinds of provenance | ✗ | ✓ | ✗ | ✓✓ top/bottom of receipt | ✗ | ✓ note 4 |
| 9 What "native" means | ✓ terminal | ✓✓ | ~ pins only | ✓ | ~ pins only | ✓ |
| Unstructured-sources lead | ✓, but N notices crowd it | ✓✓ | ✓, but title leads with Nextflow | ✓✓ | ✓, but 2 of 5 graphs are unpublished Nextflow fixtures | ✓✓ |

Gaps that show up across the posters:

- **Idea 8 (two kinds of provenance)** is missing from all three Grounded posters.
- **The argument behind idea 6** ("methods sections routinely omit result-changing choices, so gaps are expected") is
  stated only in transit-vision and receipt-vision. It is the strongest public evidence for the ledger (r7 §6.4). Every
  poster should carry it.

### transit-grounded

- **Strengths:**
  - The tightest hero line: "A correct workflow is a knowledge problem, not a syntax problem."
  - All four lines, with honest states (CWL hollow and "planned").
  - Service notices are a natural, readable place for the limitations.
  - Ledger glosses in plain English ("zero-read sample: empty consensus").
  - The build fails if the ledger counts drift.
- **Weaknesses:**
  - Three of the four notices (EGAPx, sarek and the `[[ASK]]`) sit on the Nextflow line. The eye goes to the supporting case's
    problems, not the methods-text lead.
  - No two-provenances idea.
  - No "methods omit choices" argument.
  - The DengueSeq source omits the linked code.
  - The map key says "public demo".
- **Borrow:**
  - **transit-vision** "Route ≠ journey". One sentence in the map key kills any rate reading of solid and dashed track.
  - **transit-vision** timetable times on the M-line stations (real `foundry-run.yml` data, and good on a transit map).
  - **transit-vision** Hokken framing, "checking it against the authors' data surfaced a modelling choice the methods
    never stated". It turns the "Also on this line" card into evidence for the ledger idea.
  - **receipt-vision** note 1 (the iVar wrapper has no reference input) as a one-line example in the hero body.
  - **receipt-vision / transit-vision** "two provenances" line at the terminal: "The Foundry records which knowledge
    built each skill; Galaxy records what actually ran."
  - **specimen-grounded** "(an author)" on the expert review, and "paper + linked code".

### transit-vision

- **Strengths:**
  - The best story: three lines, one shared track, one drawn journey.
  - "Route ≠ journey" explicitly addresses the N-of-M risk.
  - The map key teaches all nine §3 ideas, one card per idea.
  - The 30→18 motivation stat is accurate (p.2) and is the only use of the preprint's strongest framing number.
  - The Hokken framing is the most honest of the six (r7 §3.1).
  - "Learning happens in the wiki, where anyone can read the change, not in model weights."
- **Weaknesses:**
  - The E line is labelled "hero line" but has no journey. Its only evidence is the recompile trigger. Together with
    "Conversations" in the title, the expert route looks better supported than it is.
  - The hash arrow is ambiguous (§1).
  - The install command is Claude-only.
  - "Never deleted" is unverified.
- **Borrow:**
  - **specimen-vision** anatomy table (source `≠` copy, verbatim `=`) to make the provenance snippet self-explanatory.
  - **receipt-grounded / specimen-grounded** "(an author)" on the expert review.
  - **receipt-vision** iVar example in the "Why the network needs knowledge" box: it ties the 30→18 motivation to the
    run on the poster.
  - **specimen-grounded** "EGAPx is already one Tool Shed tool". Leave it out, per the Visionary stance, but if John
    wants a supporting-line notice, that is the strongest one-line version.

### receipt-grounded

- **Strengths:**
  - The most evidence per square inch: every stage, Mold revision and hash, pin, check, time, cost and ledger line.
  - The second receipt shows a real red Planemo result with a clean, quotable diagnosis: "The workflow was right; the
    test was wrong."
  - The NOTE line is model candour: no replication, the BioSample doubt, n = 1, the expert was an author.
  - The "Other routes" status table is the clearest grounded summary of the abstract's promises.
- **Weaknesses:**
  - The knowledge-problem thesis is only body text. The hero says "drafts / decide / written down" but not *why*.
  - The four-source title leads with Nextflow and promises CWL.
  - The second receipt is an unpublished development fixture (bacass).
  - The 0/15 box has no context.
  - The "parity … identical" line overclaims.
  - No two provenances.
- **Borrow:**
  - **receipt-vision** margin annotations, as 2–3 short callouts with arrows from the left column into the receipt
    (e.g. "HELD OUT" → why that matters; "CHECKS" → 0/15).
  - **receipt-vision** "Two provenances" stub: "EXECUTED: planemo 0.75.47 · disposable Galaxy @ b18269a1" as the bottom
    line of the receipt, captioned "execution provenance".
  - **transit-grounded** hero sentence as the left-column headline, above "The model drafts…".
  - **transit-vision** 30→18 as a second stat beside 0/15.
  - **transit-vision** "Route ≠ journey" note on the "Other routes" table header.

### receipt-vision

- **Strengths:**
  - Margin notes tie each §3 idea to the receipt line that proves it. This is the best idea-to-evidence binding of the
    six.
  - Note 1 is the best concrete statement of the knowledge problem on any poster.
  - "Two provenances" is shown spatially (top and bottom of the receipt).
  - "Not on it: a replication of the paper's results" is honest without hedging.
  - "Open gaps written down" (not "every gap") is a careful choice.
- **Weaknesses:**
  - The title is the only large-type hero. "Knowledge problem" is a margin heading, not a 20-second line.
  - The wiki-box gloss is wrong (§1).
  - The BAQ "not yet measured" lines are stale.
  - Fig 6A.
  - No motivation stat.
- **Borrow:**
  - **transit-vision** tagline "The model translates. The tools decide. The gaps are written down." in the hero-note
    slot, or **transit-grounded**'s hero sentence under the title.
  - **transit-vision** 30→18, as a sticky note beside note 1.
  - **specimen-vision** "Casting is deterministic; no model runs" for note 2. It answers the obvious "isn't the skill
    just more prompt?" question.

### specimen-grounded

- **Strengths:**
  - Real workflow graphs, with defects pinned to the nodes the ledger names. This is the most literal "rendered from
    real files" of the six.
  - The "Empty mounts" drawer is an elegant, honest home for EGAPx, sarek, CWL, Hokken and the ASK slots.
  - "Came out as `steps: {}`, yet gxwf passed it. EGAPx is already one Tool Shed tool." is the best grounded EGAPx line.
  - It was the only Grounded poster to catch Fig S4A and the MRSA gxwf nuance.
  - Two real recompile hash pairs.
- **Weaknesses:**
  - It never states the thesis. Neither "knowledge problem" nor the Galaxy-practice-outpaces-training-data argument
    appears.
  - Of its five graphs, three are unstructured-source runs (DengueSeq No. 1 and 1a, MRSA No. 2). The other two
    (bacass No. 3, nf-core/demo No. 4) are unpublished Nextflow development fixtures outside the evidence bank. They
    take a third of the plate.
  - No two provenances.
  - No "methods omit choices" argument.
  - The 0/15 has no context.
- **Borrow:**
  - **specimen-vision / transit-grounded** hero sentence: replace or precede "The agent drafts…" with "Writing a
    correct workflow is a knowledge problem, not a syntax problem."
  - **specimen-vision** key-to-the-plate copy (wiki = source of truth; Molds declare; casting deterministic; build vs
    execution provenance).
  - **transit-vision** "Route ≠ journey" as a plate caption: "Each specimen is one run, not a sample."
  - **transit-vision** Hokken line in its "Described elsewhere" mount.
  - Consider cutting No. 4 (nf-core/demo) for a one-line "methods omit choices" panel with the preprint's five
    under-specification cases (r7 §6.4). That frees space and strengthens the lead.

### specimen-vision

- **Strengths:**
  - "Anatomy of a skill" is the best theory panel of the six. Real hashes show `sidecar ≠` against `verbatim =`, and
    five numbered notes cover source of truth, declared dependencies, deterministic cast, build vs execution provenance,
    and the validator pinned to a schema hash.
  - "Molting" is a memorable name for the recompile loop.
  - The title is honest, and the Key row carries the whole system in one line.
- **Weaknesses:**
  - 0/15 sits in the stat row.
  - Two `discover-shed-tool` hashes go unexplained.
  - The DengueSeq ledger shows raw slugs only. A genomics visitor can't tell what "baq-deviation-check-on-test-sample"
    means.
  - No "methods omit choices" argument, though the ledger is shown.
  - No motivation stat.
- **Borrow:**
  - **transit-grounded** ledger glosses: one plain-English phrase per slug ("zero-read sample: empty consensus", "cut in
    reviewed brief").
  - **transit-vision / receipt-vision** sentence "Methods sections routinely omit result-changing choices, so gaps are
    expected" as the KNOWN GAPS caption.
  - **transit-vision** Hokken framing for Specimen II.
  - **specimen-grounded** "Each specimen is a real Galaxy workflow, drawn from its workflow file" under the plate title.

---

## 3. Best lines bank

### Hero and thesis lines

- "A correct workflow is a knowledge problem, not a syntax problem." *(transit-grounded; the tightest version)*
- "Writing a correct workflow is a knowledge problem, not a syntax problem." *(transit-vision, specimen-vision)*
- "The model translates. The tools decide. The gaps are written down." *(transit-vision; the best three-beat)*
- "The model drafts. The tools decide. The gaps are written down." *(receipt-grounded)*
- "The agent drafts. The tools decide. Defects go on the label." *(specimen-grounded; on-concept)*
- "Agent-built. Tool-verified. Open gaps written down." *(receipt-vision; uses the dossier's preferred phrase)*
- "Every run prints a receipt." *(receipt-grounded)*

### Titles

- *From Papers to Runnable Galaxy Workflows* *(specimen-vision; honest, short)*
- *From Papers and Expert Descriptions to Runnable Galaxy Workflows* *(transit-vision README)*
- *From Papers and Expert Specifications to Runnable Galaxy Workflows* *(receipt-vision README)*
- If the four-source family is kept, put the lead first: *From Papers, Conversations, Nextflow and CWL to Runnable Galaxy
  Workflows*.

### Section titles and labels

- "Map key = how the Foundry works" *(transit-vision)*
- "Route ≠ journey" *(transit-vision)*
- "The depot = the Foundry wiki, where faults are fixed" *(transit-vision)*
- "Why the interchanges decide" *(transit-grounded)*
- "Anatomy of a skill" and "Molting: fix the knowledge, recompile" *(specimen-vision)*
- "Empty mounts" and "Described elsewhere" *(specimen-grounded)*
- "Tear here · open-requirements ledger" and "Keep this receipt." *(the receipts)*
- "Other routes, as of today" *(receipt-grounded)*

### Explanations

- "A model can read this paper. It can't be assumed to know today's Galaxy: which wrapper, which Tool Shed revision,
  which collection shape. Here: Galaxy's iVar consensus wrapper has no reference input, so its pileup differs from the
  paper's pipeline. The run found that, measured it, and wrote it down." *(receipt-vision; the best concrete knowledge
  problem)*
- "A line shows that a route exists. A pale band marks a journey: one real run, with its timetable and the tools'
  verdicts." *(transit-vision; the anti-rate device)*
- "Learning happens in the wiki, where anyone can read the change, not in model weights." *(transit-vision)*
- "Casting is deterministic; no model runs. A compiled sidecar changes its hash, a verbatim copy keeps it."
  *(specimen-vision)*
- "The tool decides: the skill's output is checked by a validator pinned to the hash of the schema it ships."
  *(specimen-vision)*
- "A false 'miss' would have sent the agent off to write a wrapper that already exists." *(specimen-vision; why the
  recompile mattered)*
- "The workflow was right; the test was wrong." *(receipt-grounded)*
- "Checking it against the authors' data surfaced a modelling choice the methods never stated." *(transit-vision,
  Hokken; the r7-safe framing)*
- "The Foundry records which knowledge built each skill; Galaxy records what actually ran." *(transit-vision)*
- "Galaxy's own tools, pinned to Tool Shed revisions, with Galaxy collection semantics, not someone else's pipeline in
  a container." *(transit-vision, receipt-vision)*
- "Came out as `steps: {}`, yet gxwf passed it. EGAPx is already one Tool Shed tool." *(specimen-grounded; Grounded
  only)*
- "Not on it: a replication of the paper's results." *(receipt-vision)*
- "Why not just prompt the model?" *(specimen-grounded; a good hook, once the Orbit context is added)*
- "30 → 18": "30 coding agents planning to replicate one RNA-seq paper proposed 18 distinct pipelines; 29 of 30 diverged
  from the published one." *(transit-vision; accurate to p.2)*

---

## 4. John's sign-off items

The first block is time-critical.

| # | Decision | Affects | Source |
| - | - | - | - |
| 1 | **Is the print file locked?** The preprint posted on the Oct 28 upload deadline. If it is locked, the citation and the Fig S4A fix go on the QR page or an insert | all | r7 §4, Q1 |
| 2 | **CSHL "new and unpublished"** rule, given the same-group preprint. All posters cite it and claim only the non-overlapping parts | all | r7 Q2 |
| 3 | **Correct the dossier** before the revision pass, or it reintroduces these:<br>• Fig 6A → S4A.<br>• MRSA "pass gxwf" → "drafts validate in gxwf". ATAC is unverified; confirm or soften it the same way.<br>• §3.4's "each a route … to a Galaxy workflow": 4 of the 13 pipelines aren't (this is the source of receipt-vision's MUST). | dossier, then all | preprint p.36; MRSA run summary rows 10 and 101; `git ls-tree` |
| 4 | **Title.** Five posters keep "Conversations", but the dossier bans "conversation" for the expert route, and #500 (real interviews) is still open. Options: keep the submitted family; "Papers and Expert Specifications/Descriptions"; or "From Papers to…" | all except specimen-vision; specimen-vision already changed it | dossier §1 vs §4–5; r2 §3.2 |
| 5 | **The DengueSeq run directories are local and unpublished**, and `foundry_head: null` (cite plugin `f275059e`). Publish or archive them before the QR codes point people at the repo or live page | all | r2 §3.1 |
| 6 | **DengueSeq framing: "methods section" vs "paper + linked code".** The agent had DENV_pipeline v1.0 checked out. This bears on the lead claim | transit-grounded, specimen-grounded (overclaim); the others already disclose it | `source-selection.md` |
| 7 | **Disclose that the expert reviewer was an author (J.C.)?** The Grounded posters do; the Visionary posters don't | transit-vision, receipt-vision, specimen-vision | r2 §3.1 |
| 8 | **bacass receipt and specimen** (unpublished development fixture, outside the evidence bank) | receipt-grounded, specimen-grounded | r2 §4 |
| 9 | **nf-core/demo specimen** (unpublished development fixture; Planemo harness crash) | specimen-grounded | demo run dir |
| 10 | **DengueSeq direct arm (red)** shown as specimen 1a, plus "not yet re-run" (inferred) | specimen-grounded (and receipt-grounded in text) | r2 §3.1 |
| 11 | **Model cost $37.26 and agent time** on a public poster. The two time spans differ (6+144 vs 7+147 min) | receipt-grounded | scorecard row 6 |
| 12 | **Parity and BAQ probe numbers** (byte-identical; 0 positions; 484 vs 476 rows) come from the debug report, but the ledger still lists both BAQ entries as open. Close the entries, or label the numbers "measured after the ledger" | receipt-grounded; the "not yet measured" text in receipt-vision and specimen-grounded | `workflow-debug-report.md` l.44, 51–52 |
| 13 | **Anton's rnaseq/atacseq `[[ASK]]` slots**: fill, or drop entirely. If kept, use "Foundry-validated rebuilds", mark atacseq **partial**, and avoid "translations". specimen-grounded's README names Patel 2025 and Punga 2026 | all six | dossier §4 |
| 14 | **EGAPx "fix on a branch"**: push `egapx-refinements` (`d2c404df`), or drop the claim | transit-grounded, receipt-grounded | r2 §3.4, Q4 |
| 15 | **Visionary posters drop sarek and EGAPx**, which the abstract names | transit-vision, receipt-vision, specimen-vision | plan Q6 |
| 16 | **Hokken attribution**: did the Foundry compile the pooled model, or was it switched after diagnosis? Which SHA? All posters say only "fold changes agree" and cite the preprint, which is safe | all | r7 Q3 |
| 17 | **Live-results URL** for the `[[QR]]` placeholder | all | dossier §6 |
| 18 | **Re-count at print.** `verification/workflows` now has 31 `.gxwf.yml` on `main`; the posters say 30. At `9f83fd55` I re-confirmed 13 pipelines, 69 skills and 56 Molds, but not the other corpus counts, which are dated 2026-10-24. usegalaxy-tools #1791 has since merged | all | `git ls-tree origin/main`; `gh` |
| 18a | **The upstream PRs** are featureCounts (IUC #8808) and HOMER/Chromap (usegalaxy-tools #1791), which look rnaseq/ATAC-driven. If Anton's `[[ASK]]`-gated conversions forced them, then "upstream fixes the conversions forced" partly surfaces that work. The dossier marks them PUBLIC, so this is a one-line check | transit-grounded, receipt-grounded, specimen-grounded, transit-vision (IUC #8808) | `gh pr view` |
| 19 | **Karpathy eponym**: keep it with the gist citation, or drop it. Neither repo cites him | all | r1 §7, Q9 |
| 20 | **Name Scott Cain's #657 run**, or say "another user's". specimen-grounded's "outside user" is inaccurate | specimen-grounded | r2 §3.1 |
| 21 | **The 30→18 figure** from Orbit Fig 1 used as Foundry motivation. It is fine to cite (r7 §5.2), but the Orbit posters next door will show it too | transit-vision | r7 §5.2, §6.5 |

---

## Verification log

| Claim | Result | Source |
| - | - | - |
| DengueSeq ledger | 19 entries; 5 open (low-coverage, 2 dropped, 2 BAQ); 14 resolved | `open-requirements.ledger.yml` |
| 7 changesets | Identical on all six posters | `galaxy-workflow.gxwf.yml` |
| The receipts | Same Mold hashes and timestamps on both | `foundry-run.yml` |
| `73af1f62` | `content_hash 256e3861… → 2e5fa1f8…` on the `discover-shed-tool` Mold; 2026-06-17; "UC1 MRSA re-run" | `git show 73af1f62` |
| PR #701 merge `9adc20b7` (2026-10-22) | 8 `_provenance.json` files; `planemo-asserts-idioms` `src_hash 64c477c4 → 9a636385` | foundry git |
| `discover-shed-tool` on `origin/main` | rev 5, reviewed, `05c99cba`, 5 refs; `tool-search` `cdf8be42` (src) → `72f5f7cc` (dst); `_verify.json` schema `c0940fc0` | foundry `9f83fd55` |
| $37.26 | $3.21 + $34.05, 7 + 147 min | scorecard `563/runs/dengueseq-denv3.md` row 6 |
| Preprint p.2 | 30 agents, 18 pipelines, 29 of 30, *B. cereus* RNA-seq | preprint |
| Preprint p.18 | 0 of 15, open-weight models via TACC | preprint |
| Preprint p.19 | Hokken on UseGalaxy.org | preprint |
| Preprint p.36 | Hokken figure is S4A | preprint |
| Vogels et al. | First authors Vogels CBF, Hill V; *BMC Genomics* 25:433; doi 10.1186/s12864-024-10350-x | `fulltext.xml`, `source-selection.md` |
| Upstream PRs | IUC #8808 merged; usegalaxy-tools #1791 **merged 2026-10-29**; galaxy #24435 open; galaxy-tool-util-ts #204 is an issue, closed by PR #205 (merged 10-26), released in 1.15.0 on 10-27 | `gh` |
| 13 pipelines on `origin/main` | Includes 2 to-CWL and 2 review/maturation pipelines | `git ls-tree` |
| Casting | Deterministic | `packages/build-cli/README.md` l.50 |
