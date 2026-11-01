# Three new poster concepts

Concept lead, 2026-10-29. Three concepts that are not a transit map, a run receipt or a specimen plate. Each is specified so
that a designer agent can build it from this file plus `../DESIGN_DOSSIER.md`. Where this file and the dossier disagree,
the dossier wins; where the dossier and `REVIEW_CONTENT.md` disagree, the primary artifact wins (Fig **S4A**, MRSA "draft
validates in gxwf", "paper + linked code", `#1791` merged).

| # | Brief | Name | Slug | Conceit in one line |
| - | - | - | - | - |
| 1 | more technical | **Trace** | `trace` | One real run drawn as a span trace: every phase timed, every handoff typed, every verdict a tool's, with the open-requirements count burning down beside it and never reaching zero. |
| 2 | more clever | **Noticeboard** | `noticeboard` | The run's outputs pinned to a community noticeboard as MISSING, WANTED, FOUND, CUT and INSPECTED flyers, so the open gaps are literally posted, not hidden. |
| 3 | different angle | **Ten Questions** | `ten-questions` | Told from the reader's chair: before it built anything, the Foundry asked you ten questions about your paper; you corrected one; then the tools decided; five things stayed open. |

## 0. Rules every concept inherits

These come from `REVIEW_DESIGN.md` §3, `REVIEW_CONTENT.md` §1 and the dossier §7. The designer agent builds them in as
checks, not as intentions.

**Distance and hierarchy**

- Hero ≥ 100 pt bold sans (≥ 120 pt if an upright serif; never italic), highest contrast on the page, at most two lines.
  The thesis ("A correct workflow is a knowledge problem, not a syntax problem") appears at ≥ 72 pt even when the hero is
  the concept's own line.
- One dominant visual at 40–55% of the area. No row of equal cards anywhere, and especially not at the bottom.
- Headings ≥ 72 pt. Body ≥ 28 pt. Tags, labels, references ≥ 24 pt. Any text run under 24 pt fails the build.
- No rotated text for anything a visitor needs to read. Labels horizontal.
- Body copy is for the 3-minute visitor. Each concept lists its 20-second read; everything else is secondary.
- Check at `checks/preview-25.png` (1056 px), `checks/preview-200.png`, `checks/preview-gray.png`.

**Print**

- 44 × 44 in trim `poster.pdf` plus `poster-bleed.pdf` at 44.25 in with 0.125 in bleed. No rules or frames 0.25–0.9 in
  from the trim. Critical content 1 in in.
- Large dark areas as K-rich black (or confirm with the shop); saturated colour only on strokes, badges, stamps. No
  out-of-gamut placeholder colour. Greyscale must still encode status (glyph or weight, never hue alone).
- OFL fonts only, embedded; `pdffonts` gate that fails on any other family. Arrows, `≠`, `×`, ticks and ring glyphs as
  inline SVG (specimen-vision's approach).
- QR codes vector, black on white, 4-module quiet zone, ≥ 2.5 in (3 in preferred). The live-results code is the largest
  and sits bottom-right or beside the hero; its slot always renders, as a dashed ochre outline until the URL exists.
- One build flag hides every `[[ASK]]` slot with no hole left behind (`SHOW_ASK=0` / `--hide-ask`).
- `node_modules` and font caches live outside `vault/` (symlink in for the build, remove after).

**Content guards (hard-won across the twelve drafts)**

- 0/15 is always "companion Orbit study, open-weight models (Baker et al. 2026, p.18)", never in a row of Foundry
  numerals, always hung next to the tool verdicts it explains.
- "One run, not a sample" / "Route ≠ journey" wherever a reader could tally a rate.
- DengueSeq source is "the paper and its linked code (DENV_pipeline v1.0)". The reviewer was "an author (J.C.)". The
  paper was chosen 2026-10-20, after the skills were cast (`f275059e`, 2026-10-19). No replication of the paper's results
  yet. Second test case defined, not run.
- Hokken: "about 60 steps from methods text, run on UseGalaxy.org; fold changes agree; checking against the authors' data
  surfaced a modelling choice the methods never stated" (Fig **S4A**). Cited, never presented as new.
- Expert specs: "drafts validate in gxwf; full validation not reached; Planemo never ran". Never "interview" or
  "conversation" for that route.
- 13 pipelines on `main` includes 2 to CWL and 2 review/maturation. Say "13 pipelines", not "13 routes to Galaxy".
- Upstream: IUC #8808 merged; usegalaxy-tools #1791 merged 2026-10-29; galaxy #24435 open; galaxy-tool-util-ts #205 in
  gxwf 1.15.0, after which the Foundry recompiled.
- BAQ probe numbers (0 consensus positions differ; 484 vs 476 rows) come from `workflow-debug-report.md`, not the ledger;
  label them "measured after the ledger was written" or leave them out (sign-off #12).
- Hashes truncated to 8 characters, consistently. Corpus counts footnoted "galaxyproject/foundry `main`, 2026-10-24",
  re-counted at print (CI pattern workflows are 31 now, not 30).
- Never: "48 analyses", any N-of-M rate, "AI-generated", "From papers to skills" as a heading, "Workflow Foundry" alone.
- Title: the designer uses dossier option 1 unless John settles sign-off #4 first. Each concept notes if its layout prefers
  the short title.

**Shared data (all local, read-only; snapshot into `data/` with a manifest of source paths and SHAs)**

| Item | Path |
| - | - |
| Brief run (timestamps, 2 phases) | `~/projects/foundry-runs/dengueseq-denv3/dengueseq-denv3-brief/foundry-run.yml` |
| The ten questions | `…/dengueseq-denv3-brief/workflow-brief.md` § "Open questions" (low-confidence first) |
| Expert review | `~/projects/foundry-runs/dengueseq-denv3/review.md` (brief `e52aca4e`, 10 proposals, 1 edited) |
| Galaxy run (11 phases, 7 iterations, timestamps, assembly `51f1744d`) | `…/dengueseq-denv3-galaxy/foundry-run.yml` |
| Ledger (19 entries: 5 open, of which 2 `kind: dropped`; 14 resolved; discoveries; decisions; 2 brief-change recommendations) | `…/dengueseq-denv3-galaxy/open-requirements.ledger.yml` |
| Workflow and 7 pins | `…/dengueseq-denv3-galaxy/galaxy-workflow.gxwf.yml` |
| Tool pin (a `hit`, score, alternates) | `…/dengueseq-denv3-galaxy/galaxy-tool-pin.json` |
| gxwf verdict | `…/dengueseq-denv3-galaxy/galaxy-workflow-validation-result.json` (pass; tool_state 7/7; connections valid; gxwf 1.14.0) |
| Planemo verdict | `…/dengueseq-denv3-galaxy/workflow-test-result.json` (pass; planemo 0.75.47; 7/7 jobs; Galaxy `b18269a1`, not pinned; `denv3_test` not run) |
| Debug report (attempt 1 infra failure; bytes not retained; BAQ probe) | `…/dengueseq-denv3-galaxy/workflow-debug-report.md` |
| Build provenance | `~/projects/foundry-runs/_plugin/f275059e/casts/claude/skills/*/_provenance.json`; current: `~/projects/repositories/foundry/casts/claude/skills/discover-shed-tool/{_provenance,_verify}.json` |
| Recompile instances | foundry `73af1f62` (`256e3861 → 2e5fa1f8`); PR #701 merge `9adc20b7` (`planemo-asserts-idioms` `64c477c4 → 9a636385`, 8 skills) |

---

## 1. Trace (`trace`), the technical one

### Conceit

One run of the Foundry, rendered the way an engineer reads a distributed trace: a waterfall of spans against a clock,
one row per skill, each row ending in the typed artifact it handed to the next. Rows where a deterministic tool spoke
(Tool Shed, gxwf, Planemo) are drawn in a different fill from rows where the model wrote. Beside the waterfall, a
burndown of open requirements climbs to 13 and settles at 5. Below it, the artifacts themselves, verbatim.

The argument it carries: the machinery is inspectable end to end. Build provenance (which knowledge made each skill) is
the hash on every row; execution provenance (what Galaxy ran) is the last span; the gaps are the line that never hits
zero.

### Hero line (≥ 100 pt)

> **The model writes. The tools decide. Nothing is off the record.**

Three beats, two lines if needed. Thesis at 72 pt under it: *A correct workflow is a knowledge problem, not a syntax
problem: Galaxy changes faster than training data, so the knowledge lives in a wiki, compiled into skills with a
provenance hash, and the verdicts come from tools.*

### Layout

```
+------------------------------------------------------------------------------+
| GALAXY WORKFLOW FOUNDRY · eyebrow            From Papers and Conversations…   |
| authors / affiliations                       (title 120 pt, 2 lines, left)    |
|------------------------------------------------------------------------------|
| THE MODEL WRITES. THE TOOLS DECIDE. NOTHING IS OFF THE RECORD.   [QR live]   |
| thesis line, 72 pt                                               3.5 in      |
|------------------------------------------------------------------------------|
| 1 paper + code -> 13 skills -> 7 tools pinned -> 9 h 28 min incl. review -> 7/7 -> 5 open  (stat strip)
|------------------------------------------------------------------------------|
| TRACE · dengueseq-denv3 · 2026-10-20 15:06Z -> 10-21 00:34Z     open reqs    |
| summarize-paper        ▇ 15:10            -> freeform-summary.md   ac601516   |
| …-to-workflow-brief     ▇ 15:13           -> workflow-brief.md     c4ed7645   |
| expert review (author) ░░░░░░//░░░░░░      -> brief e52aca4e 10 prop · 1 edit |
| ---- axis break --------//--------------------------------------------------- |
| …-galaxy-interface            ▇▇ 22:17    -> …interface.md     +9   ●9        |
| …-galaxy-data-flow              ▇▇ 22:29  -> …data-flow.md  +5 −2   ●12       |
| compare-against-iwc-exemplar      ▇▇ 22:40-> iwc-exemplar.gxwf.yml +3−2 ●13   |
| …-galaxy-template                   ▇ 22:44 -> draft.gxwf.yml        ●13      |
| advance-galaxy-draft-step ×7         ▇▇▇▇▇▇▇▇▇▇▇▇ 22:51…23:39   +2 −8  ●7     |
|   ├ hit c598cbb8 bwa_mem  ├ hit 5cf9fcc9 samtools_view  ├ … (7 pin marks)     |
| find-test-data (branch)                        ▇ 23:44   −2          ●5       |
| …-galaxy-test-plan                               ▇ 23:55             ●5       |
| implement-galaxy-workflow-test                    ▇ 23:58            ●5       |
| validate-galaxy-workflow  [TOOL]                   ▓ 00:00  PASS 7/7 ●5       |
| run-workflow-test         [TOOL]                    ▓▓▓▓▓▓▓ 00:33 PASS 7/7 ●5 |
| debug-galaxy-workflow-output                              ▇ 00:34   ●5 open   |
|   |-- 0/15 callout (Orbit, open-weight) hung from the two [TOOL] rows         |
|------------------------------------------------------------------------------|
| INSPECT: _provenance.json      | INSPECT: verdicts (gxwf + planemo JSON) |     |
| (sidecar ≠ / verbatim =)       | execution provenance: Galaxy b18269a1   |     |
| INSPECT: one ledger entry, YAML, abridged                                      |
| RECOMPILE mini-trace: 17 Jun 73af1f62 · 22 Oct #701  (git-log style, 2 commits)|
|------------------------------------------------------------------------------|
| Board here: QR code · install · preprint   refs   counts @ main 2026-10-24    |
+------------------------------------------------------------------------------+
```

**Header (top 6 in).** Title left at 120 pt, authors beneath; the hero band spans the width under it; the live-results
QR sits at the hero's right end (3.5 in). A one-row stat strip under the hero (numerals ≥ 72 pt with 28 pt labels):
`1 paper + its code → 13 skills → 7 tools pinned → 2 h 23 min build (+ review) → 7/7 jobs → 5 open`. These are the only
numerals in the strip; no corpus counts here (they go in the footer).

**The trace (middle, about 50% of the height, roughly 21 in).** An SVG generated from the two `foundry-run.yml` files
and the ledger:

- X axis is wall-clock UTC. The brief run (15:06–15:13) and the Galaxy run (22:11–00:34) are separated by an axis break
  glyph; the expert-review span between them is hatched and labelled "expert review (an author): 10 proposals, 1
  edited; brief `e52aca4e`". The axis break is drawn, not implied.
- One row per phase: skill name in mono at ≥ 32 pt, the span bar (≥ 0.5 in tall), the artifact file it emitted at the
  bar's right end, the Mold content hash (8 chars) from `_plugin/f275059e/…/_provenance.json` in grey. Phase 5 is one
  row with seven sub-spans at the iteration timestamps (22:51, 22:56, 23:03, 23:27, 23:31, 23:36, 23:39), each carrying a
  pin mark and the pinned tool (`hit` from `galaxy-tool-pin.json`; order map_reads, filter_mapped_primary, primer_trim,
  consensus, per_base_depth, variants, consensus_header). Phase 6 is drawn as a branch (`test-data-resolution →
  find-test-data`).
- Two fills: model rows solid ink; the two tool rows (`validate-galaxy-workflow`, `run-workflow-test`) cross-hatched
  with a bold `PASS 7/7` tag. A small legend at the trace's top-right: "solid: the model wrote; hatched: a tool decided".
- The seven pin marks also use the hatched fill (Tool Shed discovery is a tool verdict inside a model phase).
- Ledger deltas as badges on the row of the Mold that raised or resolved them (`raised_by` / `resolved_by` in the
  ledger): interface +9; data-flow +5 −2; compare-against-iwc +3 −2; advance-draft +2 −8; find-test-data −2. A
  right-hand column shows the running open count: 9 → 12 → 13 → 13 → 7 → 5 → 5, drawn as a stepped line that ends at
  **5 open** in oxblood, with "2 of them cut at review" beneath.
- `run-workflow-test` shows two attempts if sign-off #T1 allows: attempt 1 struck through with "infra: TMPDIR AF_UNIX
  path too long, no workflow ran" and attempt 2 PASS. Otherwise one span.
- The 0/15 callout hangs from the two hatched rows with a leader line: "Why the hatched rows decide: in the companion
  Orbit study (open-weight models) a rule given only in the prompt was followed in 0 of 15 graded runs. 'Skills are
  guidance, not enforcement.' Baker et al. 2026, pp. 16–18."

**Inspect panels (below the trace, about 25%).** Three verbatim excerpts in mono at 28–30 pt, each with a leader line
to the span that produced it. Not a card grid: the left two are stacked and the ledger entry runs the full right
column at a larger height.

1. `_provenance.json` for `discover-shed-tool` (the skill behind the pin marks): `mold.content_hash`, three refs showing
   `sidecar` `src_hash ≠ dst_hash` and `verbatim` `src_hash = dst_hash`, `"source": "deterministic"`, and the
   `_verify.json` validator line. Caption: "Build provenance: which knowledge made this skill. Casting runs no model."
2. The two verdict JSONs, abridged: `"status": "pass"`, `"tool_state": {"ok": 7, "fail": 0}`, `"connections_valid":
   true`; `"planemo": {"version": "0.75.47", "num_failures": 0}`, `"galaxy": …b18269a1`. Caption: "Execution
   provenance: Galaxy's record of what ran. Not pinned to a Galaxy release; output bytes not retained, assertions are the
   evidence."
3. One ledger entry verbatim, abridged to `id`, `status: open`, `raised_by`, `step`, `unmet`, `missing` (use
   `low-coverage-and-empty-bam-behavior`, with its note cut to the one sentence "a zero-read sample's consensus is an
   empty-sequence record, not all-N"). Caption: "An open requirement is a typed object, not a footnote. It is resolved or
   surrendered, never deleted (confirm wording against the ledger note, sign-off #T3)."

**Recompile mini-trace (bottom-left, under panel 1).** A two-commit git-log strip: `17 Jun 2026 · 73af1f62 · MRSA
expert-spec run: false Tool Shed miss for integron_finder · Mold + eval fixed · recast · 256e3861 → 2e5fa1f8` and
`22 Oct 2026 · #701 · one test-assertion defect in 3 runs · planemo-asserts-idioms 64c477c4 → 9a636385 · 8 skills
recast`. One line: "Learning happens in the wiki, where anyone can read the diff, not in model weights."

**Footer.** "Board here": Code, Install, Preprint QRs at 3 in with the two install commands labelled by runtime (Claude
Code `/plugin marketplace add galaxyproject/foundry`; Codex `codex plugin marketplace add galaxyproject/foundry`);
references [1]–[3]; corpus counts in one footnote line (420 notes · 56 Molds, 27 reviewed · 13 pipelines · 16 schemas ·
69 skills · 31 CI pattern workflows green on Galaxy 26.1 · `main` 2026-10-24).

### Reading path

- **20 seconds.** Hero (three beats). The waterfall's staircase shape. Two hatched rows with `PASS 7/7`. The stepped
  line ending at **5 open**. The live QR.
- **3 minutes.** Read the rows top to bottom as a story: paper summarised in 7 minutes, a human reviewed the brief, the
  interface phase raised nine requirements, the draft loop pinned seven tools in seven rounds and resolved eight, gxwf
  and Planemo passed, five requirements stayed open and were written down. Then the inspect panels: what a provenance
  record, a verdict and a ledger entry actually look like. Then the recompile strip and the 0/15 note for why the tools
  judge.

### Evidence used, and left out

**Used:** DengueSeq brief and Galaxy runs in full (timestamps, phases, iterations, pins, verdicts, ledger counts and
one entry, review summary); `discover-shed-tool` provenance and verify records; both recompile instances; the Orbit 0/15
and "guidance, not enforcement" lines; corpus counts; CI count; upstream PR list (one footer line).

**Left out:** every other run (MRSA/ATAC, bacass, demo, the direct arm, sarek, EGAPx, CWL), Hokken (one footnote line
only: "An earlier methods-text workflow, Hokken et al., is published in [1], Fig. S4A"), the 30→18 figure (the neighbouring
Orbit posters show it), Anton's `[[ASK]]` material (no slot; this poster is one run), model cost and agent minutes
(sign-off #11; a slot exists in the stat strip if John wants it).

### Stance

Candid at the artifact level, silent on the rest of the programme. Every limitation shown is a property of this run and
is printed where it occurs: unpinned Galaxy branch, bytes not retained, second test not run, two cut requirements, three
open, no replication, n = 1, the reviewer was an author. The poster does not survey other routes; the footer says "one
run, not a sample; other routes and their status: see the live page". This is the honest shape for an expert audience:
nothing is hedged, nothing is surveyed.

### Toolchain

**HTML/CSS + inline SVG via Playwright.** The trace is data-driven geometry, which is easiest in a `build.mjs` that
reads YAML/JSON and emits SVG; the inspect panels are `<pre>` blocks filled from the same files. Start from
`transit-grounded-v2`'s skeleton (`content.yml` for all prose, `journey.expect` drift guard, overflow and safe-area
reports, `pdffonts` gate, bleed export, 25%/200 px/grey checks) and `specimen-vision-v2`'s inline glyphs and sub-24 pt
hard failure. Pin `playwright-core` to a version whose Chromium is already cached (1.57.0/1200, 1.59.1/1217 or
1.64.x/1248) and say which in the README.

Fonts (OFL, vendored from `@fontsource`): **Inter** (hero, headings, 800–900), **JetBrains Mono** (rows, hashes,
excerpts). Both have `→` and `≠`, but draw them as SVG anyway so the `pdffonts` gate stays simple.

Build guards specific to this design: the trace fails if the run files no longer give 11 phases, 7 iterations, 19
entries / 5 open / 2 dropped, or either verdict changes; every span label is measured ≥ 32 pt; the stepped line's final
value must equal the ledger's open count.

### Lessons applied, pitfalls avoided

- Receipt-grounded's "70% mono 28 pt line items" is the pitfall this design is most exposed to. The fix is built in: the
  trace is geometry (bars, hatching, a stepped line) before it is text, labels are ≥ 32 pt, and only three excerpts are
  verbatim.
- Transit-grounded's rotated −40° station labels: every label here is horizontal; the X axis carries times only.
- transit-vision's "0/15 in the Foundry stat row": the number hangs from the hatched rows and names Orbit and
  open-weight models.
- specimen-vision's unexplained double hash: one hash per row, dated; the recompile strip shows before → after with
  commit and date.
- receipt-grounded's "parity … identical" overclaim: the verdict panel says bytes were not retained and assertions are
  the evidence; the BAQ numbers are not on this poster.
- Design review §3.3: one dominant visual at about 50%; no card row at the bottom (the inspect area is two stacked
  panels plus one tall column).

### Unlike the twelve

No map, no paper object, no plate. The dominant image is a time-proportional waterfall with a burndown line, which no
draft has. Nothing on the poster is a drawn illustration: the trace, the badges, the excerpts and the pin marks are all
rendered from files. The receipts list the same phases, but as equal-height mono rows with no time geometry, no
artifact-contract column, no raised/resolved accounting and no verdict/model distinction.

---

## 2. Noticeboard (`noticeboard`), the clever one

### Conceit

A community noticeboard, cork and pins, with the run's outputs posted as flyers in the familiar genres: **MISSING**
(open requirements), **WANTED → FOUND** (Tool Shed discovery), **LOST & FOUND** (the false `integron_finder` miss, which
turned out never to be lost, so the knowledge was fixed and recompiled), **CUT** (the two deliberate drops), **INSPECTED**
(the gxwf and Planemo certificates), **FREE TO A GOOD HOME** (the workflow itself), one official **NOTICE** (the thesis)
and tear-off tabs with the QR codes. The joke is that an open-requirements ledger *is* a lost-pet flyer: what is missing,
where it was last seen, who to call. The argument stays exact: the model drafts, the tools inspect, what can't be resolved
is posted in public.

### Hero line (≥ 100 pt)

> **Missing something? It's on the board.**

Painted across the board's header rail. The thesis is the headline of the NOTICE flyer at 72 pt or more: *A correct
workflow is a knowledge problem, not a syntax problem.* (The hero and the NOTICE together give the 20-second visitor the
ledger idea and the knowledge idea; neither is buried in body copy.)

### Layout

```
+------------------------------------------------------------------------------+
| From Papers and Conversations to Runnable Galaxy Workflows    authors        |
| ======== header rail: MISSING SOMETHING? IT'S ON THE BOARD. ========== [QR]  |
|  .---------------------.  .------------------------------.  .-------------.  |
|  | NOTICE               |  | FREE TO A GOOD HOME          |  | MISSING     |  |
|  | A correct workflow   |  | One Galaxy workflow, DengueSeq|  | 10,707 N    |  |
|  | is a knowledge       |  | DENV3. 7 tools, pinned.      |  | last seen in|  |
|  | problem, not a syntax|  | Native: list:paired. Tested  |  | DENV_pipeline|  |
|  | problem. (wiki ->    |  | on SRR25366733. Held out.    |  | ledger id…  |  |
|  | Molds -> skills)     |  | [mini graph strip, 7 nodes]  |  '-------------'  |
|  '---------------------'  | Not included: a replication. |  .-------------.  |
|  .---------------------.  '------------------------------'  | MISSING     |  |
|  | WANTED -> FOUND ×7   |  .------------------------------.  | a reference |  |
|  | bwa_mem  c598cbb8 …  |  | INSPECTED  gxwf PASS 7/7     |  | for the     |  |
|  | (7 rows, hit)        |  |            planemo PASS 7/7  |  | pileup (BAQ)|  |
|  '---------------------'  | Galaxy b18269a1. Why inspectors|  '-------------'  |
|  .---------------------.  | not rules: Orbit 0/15 …      |  .-------------.  |
|  | LOST & FOUND         |  '------------------------------'  | CUT ×2      |  |
|  | integron_finder …    |  .------------------------------.  | serotype    |  |
|  | 73af1f62 256e3861 -> |  | ELSEWHERE ON THIS BOARD       |  | plane;      |  |
|  | 2e5fa1f8  · #701 1->8|  | Hokken (published, S4A) ·     |  | filtered    |  |
|  '---------------------'  | expert specs · [[ASK]] Anton  |  | table       |  |
|                           '------------------------------'  '-------------'  |
| ===== TAKE ONE: [QR code] [QR install] [QR preprint] [QR live results] ===== |
| refs · counts @ main 2026-10-24 · "one run, not a sample"                     |
+------------------------------------------------------------------------------+
```

**Board.** The whole live area below the title is the board: a flat mid-warm tint (not a photographic cork texture; a
subtle vector stipple at most, and checked in greyscale), a dark header rail carrying the hero in white at ≥ 100 pt,
and a bottom rail of tear-off tabs. Flyers are white, each pinned with one or two SVG push-pins, tilted by at most
±1.5°, with text inside kept horizontal. The board's edge sits ≥ 1 in from the trim; it is a filled panel, not a rule.

**Flyer hierarchy (sizes vary on purpose; three weights).**

- Large (about 14 × 13 in): **NOTICE** (thesis, the wiki → Molds → skills chain with 420 / 56 / 69 as numerals, "casting
  is deterministic; each skill hashes the notes that made it"); **FREE TO A GOOD HOME** (the workflow: source "paper +
  linked code", 7 pinned tools as a small horizontal node strip drawn from the `.gxwf.yml`, "native: Galaxy collections,
  not a container", "held out: chosen after the skills were built", "not included: a replication of the paper's results;
  n = 1"); **MISSING: 10,707 N** (the largest headline on the board, ~160 pt: "A zero-read sample's consensus. Last seen
  in DENV_pipeline. Galaxy's iVar wrapper emits an empty-sequence record instead. If found, see
  `low-coverage-and-empty-bam-behavior`. Status: open.").
- Medium (about 10 × 9 in): **WANTED → FOUND ×7** (seven rows: tool, owner, changeset, each stamped FOUND; "found by `gxwf
  tool-search`, pinned by `tool-revisions`; a `hit` is a tool's verdict, not the model's"); **INSPECTED** (two
  certificates: `gxwf validate --strict` PASS 7/7 tool states, connections valid; `planemo test` PASS 1 test, 7/7 jobs,
  Galaxy `b18269a1`; then "Why inspectors, not rules on the board: in the companion Orbit study (open-weight models) a rule
  given only in the prompt was followed in 0 of 15 graded runs. Skills are guidance, not enforcement."); **LOST & FOUND**
  ("Reported missing 17 Jun 2026 by an expert-spec run: the `integron_finder` wrapper. Never lost: `iuc/integron_finder`.
  The report was wrong, so the knowledge was fixed: Mold and eval updated, skill recast, `73af1f62`, hash
  `256e3861 → 2e5fa1f8`. Oct 2026, #701: one note fixed, 8 skills recast."); **MISSING: a reference for the pileup**
  ("Galaxy's iVar wrappers run their pileup with BAQ off (the consensus wrapper takes no reference at all); the paper's
  chain runs BAQ on. Two ledger entries
  open; awaiting the expert's ruling. Probe measured after the ledger was written: 0 consensus positions differ on
  SRR25366733; 484 vs 476 variant rows", subject to sign-off #12).
- Small (about 7 × 6 in): **CUT ×2** ("Cut at review by an author: the serotype coverage plane; the filtered variant
  table. The full iVar table is output instead."); **ELSEWHERE ON THIS BOARD** (Hokken, published [1] Fig. S4A, with the
  "surfaced a modelling choice the methods never stated" line; expert-spec drafts validate in gxwf, Planemo never ran;
  the `[[ASK]]` slot for Anton's nf-core rebuilds, drawn as a dashed-outline flyer that the hide flag removes).

**Tear-off tabs.** Four 3.2 in tabs along the bottom rail, perforated above, each a QR with a 28 pt caption: Code,
Install, Preprint, Live results (largest, 3.6 in, rightmost, dashed placeholder until the URL exists). The two install
commands sit above the tabs at 28 pt, labelled by runtime.

**Legend line (28 pt, bottom-left of the board):** "Every flyer is one real run (DengueSeq DENV3, 2026-10-20/21), rendered
from its files. One run, not a sample."

### Reading path

- **20 seconds.** The hero on the rail. Five flyer headlines at ≥ 72 pt: NOTICE, FREE, MISSING, WANTED, INSPECTED. The
  big "10,707 N". The tear-off QR tabs.
- **3 minutes.** NOTICE explains the system in five lines. FREE describes what was built and from what. WANTED → FOUND
  shows how a tool is pinned. INSPECTED shows the two verdicts and why tools judge. MISSING ×2 and CUT show the ledger
  as five concrete items. LOST & FOUND tells the recompile story, which is the only flyer about a different run and is
  labelled as such. ELSEWHERE is where the honest partials live.

### Evidence used, and left out

**Used:** DengueSeq run (pins, verdicts, five open ledger items with plain-English glosses, held-out date, review by an
author, no replication); the `73af1f62` and #701 recompiles; Orbit 0/15 and "guidance, not enforcement"; corpus counts
(three numerals on NOTICE, the rest in the footer); Hokken as cited prior work; expert-spec status in one line; the Anton
`[[ASK]]` slot.

**Left out:** EGAPx, sarek, CWL, bacass, demo and the direct arm (no flyers; if John wants EGAPx, it is a one-line
"MISSING: 100% of the steps. `steps: {}`, and gxwf passed it. Fix on a branch, pushed before print or not mentioned", on
the ELSEWHERE flyer, sign-off #14); 30→18; cost and minutes; the "methods omit choices" argument appears only as the
Hokken line on ELSEWHERE and as the NOTICE's last sentence ("Methods sections routinely omit result-changing choices, so
gaps are expected; posting them is the output").

### Stance

Candid by construction: the open items are the largest objects on the page, so there is nothing to hedge. Keep the
survey of other routes to one small flyer; the board is about one run and one recompile. Tone: dry, never mocking the
paper or its authors. The MISSING flyers describe what *Galaxy's wrappers* don't do or what the *expert* cut, never
what the paper "forgot". Avoid "LOST" for the DengueSeq items; LOST & FOUND is reserved for the false miss, where the
joke is on the Foundry itself.

### Toolchain

**HTML/CSS via Playwright.** Each flyer is a flow-layout block (so copy edits reflow) placed on a CSS grid with named
areas; the tilt is a `transform: rotate()` on the whole flyer, applied after layout, so text stays horizontal inside and
measurement for the sub-24 pt and overflow guards happens before rotation. Pins, tape, perforations and the ✂ are inline
SVG. Prose in `content.yml` (transit-grounded-v2 pattern); the ledger glosses in a `gloss` table keyed by ledger id with
a build failure on any open entry lacking a gloss (specimen-grounded's `prepare.mjs` guard). Receipt-vision-v2 is the
reference for placeholder and `[[ASK]]` handling. If the designer prefers Typst, the same structure works with `grid` +
`rotate`, but Typst's `rotate` reflows less kindly; HTML is the recommendation.

Fonts (OFL): **Anton** for flyer headlines and the hero (condensed black, reads at distance; check the greyscale weight
against the rail), **Work Sans** for flyer body (500/700), **IBM Plex Mono** for ids, hashes and commands. Draw `→`, `≠`,
`✂` as SVG.

Colour: board tint about `#d9c9a8` lightened to stay under the "muddy mid-value" warning (`REVIEW_DESIGN` receipt-grounded
#4), flyers white, rail K-rich near-black, one accent (oxblood `#8a2e1c`) for MISSING headlines and FOUND stamps, ochre
dashed for the placeholder. In greyscale MISSING must still be heavier than WANTED: check the rendered weight, not the
hue.

### Lessons applied, pitfalls avoided

- receipt-vision v1's "no thesis at headline size" and "handwritten body copy": the hero is typeset on the rail; no script
  face anywhere; the thesis is the NOTICE headline at ≥ 72 pt.
- specimen-grounded's "ten regions of equal weight": three flyer sizes, one headline per flyer, the MISSING headline
  deliberately largest.
- receipt-vision's zig-zag reading order: flyers are not numbered; the reader is meant to browse. Hierarchy comes from
  size and headline, which is how a real board reads. The 3-minute path above is the order the designer should test, but
  it needs no numbers.
- transit-vision v1's "too many black areas": exactly two dark areas, the rail and the tab strip's perforation line.
- Rotated text: whole-flyer tilt ≤ 1.5°, nothing else rotated; no text at an angle a reader notices.
- Design review §3.10: placeholder style is shared; the `[[ASK]]` flyer removes cleanly.
- Content review on 0/15, "(an author)", "paper + linked code", S4A, BAQ numbers' provenance: all written into the flyer
  copy above.

### Unlike the twelve

Not a single long document (receipt), not a path (transit), not a plate of mounted drawings (specimen). It is many small
documents of different genres, and the genres do the explaining. No workflow graph as a hero (the node strip on FREE is a
small part of one flyer). It is the only concept that makes the ledger the largest type on the page, which the content
review identified as the under-carried argument across all six originals.

---

## 3. Ten Questions (`ten-questions`), the different angle

### Conceit

The poster is about the reader, a biologist holding a paper, not about the system. It tells them, in the second person,
what happened when a paper like theirs went through: *before it built anything, the Foundry asked you ten questions*.
The ten are real, from the DengueSeq workflow brief (`workflow-brief.md`, "Open questions", low-confidence first), each
with the answer the Foundry proposed and the evidence it cited. You accepted nine and corrected one. Then the tools
decided. Five things were still open, so they were written down for you.

Why this reframing: the twelve drafts all explain the machine. None shows the one moment the visitor would actually
experience, the review of a brief, and none shows that the "knowledge problem" is partly *their* knowledge: Q6 ("minimum
depth 10 or 20? Methods say 10; Results report 20×") is the dossier's "methods omit result-changing choices" argument in
one real line, and it is the kind of thing only the reader can settle.

### Hero line (≥ 100 pt)

> **Before it built anything, it asked you ten questions.**

Two lines. Sub-line at 72 pt: *You accepted nine proposals and corrected one. Then the tools decided. Five things stayed
open, in writing.* The thesis sits as the first line of the right column at 72 pt: *A correct workflow is a knowledge
problem, not a syntax problem; some of that knowledge is yours.*

### Layout

```
+------------------------------------------------------------------------------+
| From Papers and Conversations to Runnable Galaxy Workflows     authors       |
|------------------------------------------------------------------------------|
| BEFORE IT BUILT ANYTHING,                                                    |
| IT ASKED YOU TEN QUESTIONS.                        sub-line 72 pt   [QR live]|
|------------------------------------------------------------------------------|
| WORKFLOW BRIEF · DengueSeq DENV3 · from the paper   |  A correct workflow is |
| and its linked code · low-confidence first          |  a knowledge problem…  |
|                                                     |  (72 pt) + 5 lines on  |
|  1  Which primer scheme amplified the test sample?  |  where the proposals   |
|     Proposed: DENV3 BED only, as the pipeline does  |  came from: wiki ->    |
|     [LOW]  ✓ accepted                               |  Molds -> skills, hash |
|  2  Is the test sample's metadata correct?          |------------------------|
|     Proposed: yes (SRR25366733)                     |  THEN THE TOOLS DECIDED|
|     ✎ corrected: you checked the ENA record         |  Tool Shed  7 of 7 hit |
|  3  Compare the consensus with a published genome?  |  gxwf       PASS 7/7   |
|     Proposed: yes, if one can be found   [LOW]  ✓   |  Planemo    PASS 7/7   |
|  4  Which primer BED is authoritative?   [LOW]  ✓   |  0/15 (Orbit) aside    |
|  5  Produce a completeness metric?       [LOW]  ✓   |------------------------|
|  6  Minimum depth 10 or 20? Methods: 10. Results:   |  STILL OPEN AFTER YOUR |
|     20x.  Proposed: 10, adjustable.           ✓     |  ANSWERS: 5 of 19      |
|  7  Full iVar table or the filtered one?      ✓     |  ○ zero-read sample    |
|  8  Emit outputs at any coverage?             ✓     |  ○ BAQ, consensus      |
|  9  Keep the trimmed BAM as an output?        ✓     |  ○ BAQ, variants       |
| 10  Use the repo's small fixture as a 2nd test? ✓   |  ⊘ serotype plane (cut)|
|                                                     |  ⊘ filtered table (cut)|
|  9 accepted · 1 corrected · 4 marked low confidence |  not yet: replication; |
|  reviewer: an author (J.C.) · brief e52aca4e        |  2nd test case         |
|------------------------------------------------------------------------------|
| FIX THE KNOWLEDGE, RECOMPILE (one strip: 73af1f62 · #701)  | Board here: QRs |
| refs · counts @ main 2026-10-24 · one run, not a sample                      |
+------------------------------------------------------------------------------+
```

**Header (top 7 in).** Title at 120 pt; hero on two lines at ≥ 104 pt, with "ten" set in the accent colour and
underlined so the emphasis survives greyscale; the live QR (3.5 in) at the right of the hero band.

**The form (left 60%, about 24 in tall; the dominant visual).** Styled as the brief's own section, with a form rule
grammar (hairlines, a wide numeral gutter), not as a card grid:

- A numeral column at 110 pt (`1`–`10`), the single most legible thing after the hero; at 200 px the poster reads as a
  column of ten big numbers.
- Each row: the question in bold at 40 pt, cut to one line by the designer (≤ 70 characters; the original wording is
  in the brief and the designer's shortened version must keep its meaning; list both in the README); "Proposed:" at 30 pt
  on one line; one line of evidence at 28 pt grey where it carries the argument (Q1, Q3, Q6, Q7, Q8 do; the rest can
  omit it); a `LOW` confidence tag (24 pt badge) on the four low-confidence proposals (Q1, Q3, Q4, Q5, which the brief
  lists first); a 1.2 in verdict glyph in the right gutter: a tick for accepted, a pen mark for corrected (Q2 only).
- Q2's correction is shown as the proposal struck through lightly with the reviewer's line beneath: "corrected: ENA
  record checked 2026-10-20; MiSeq, paired, BioSample SAMN35803653, 183,398 read pairs" (from `review.md` and the
  brief). It is the only strike-through on the page.
- Q6 is highlighted with a margin tag: "the paper disagrees with itself: Methods say 10, Results report 20×. Only you can
  settle it." This is the knowledge-problem argument in evidence, and the only place the poster editorialises.
- Footer of the form at 30 pt: "9 accepted · 1 corrected · 4 low-confidence · reviewer: an author (J.C.) · brief
  `e52aca4e` · 2026-10-20 15:13–22:11 UTC between the brief and the build".

**Right column (40%), three stacked blocks of unequal height, top to bottom.**

1. **Where the proposals came from** (thesis at 72 pt, then 5 lines): the knowledge is a wiki of 420 notes on current
   Galaxy practice; 56 Molds declare what one action needs; 69 skills are compiled from them with a provenance hash;
   casting runs no model; the skill that wrote this brief is `freeform-summary-to-workflow-brief` (Mold hash `c4ed7645`
   at cast `f275059e`).
2. **Then the tools decided** (the three verdicts as 72 pt words with 28 pt detail: `Tool Shed` 7 of 7 steps pinned, all
   `hit`; `gxwf validate --strict` PASS, tool state 7/7, connections valid; `planemo test` PASS, 7/7 jobs, Galaxy
   `b18269a1`), then the 0/15 aside with Orbit and open-weight models named, then one line: "The Foundry records which
   knowledge built each skill; Galaxy records what ran."
3. **Still open after your answers: 5 of 19** (the ledger as five plain-English lines with open-ring and cut-ring
   glyphs; "19 requirements were raised during the build; 14 were resolved by later steps; 2 were cut at your review; 3
   wait for your judgment"; then "Not yet: a replication of the paper's results; the second test case").

**Bottom strip (3.5 in).** Left: "Fix the knowledge, recompile" as one line with the two hash flips (the learning loop in
the wiki, not the weights). Right: Board here, three 3 in QRs plus the live slot already used above, install commands by
runtime. References and the counts footnote under them.

### Reading path

- **20 seconds.** The hero. Ten big numerals with nine ticks and one pen mark. Three 72 pt verdict words with PASS.
  "5 of 19" still open. The live QR.
- **3 minutes.** Read the ten questions as a biologist would, noticing that they are their questions (primer scheme,
  depth threshold, which table, what to keep). See what the Foundry proposed and that it cited the paper against itself
  on Q6. See the one correction. Then the right column: where the proposals came from, what the tools then decided, what
  is still theirs to decide. Then the recompile strip.

### Evidence used, and left out

**Used:** the ten questions, proposals, evidence and confidence tags verbatim from the brief (shortened with care);
`review.md` (reviewer, one edit, brief hash, timestamps); the build's verdicts and pins; the ledger's five open items
and 19/14 accounting; corpus counts (four numerals in block 1, rest in the footer); the Mold hash of the brief skill
from `_plugin/f275059e`; Orbit 0/15 and the two-provenances line; both recompile instances in one strip.

**Left out:** the workflow graph (deliberately: this poster is about the conversation, and the plates own the graph);
every other run; Hokken except as a reference line ("an earlier methods-text workflow is published in [1], Fig. S4A");
30→18; cost and minutes; EGAPx, sarek, CWL; Anton's material (no slot). If John wants an `[[ASK]]` slot, it goes as a
sixth line under block 2 ("also being checked: nf-core/rnaseq and atacseq rebuilds, Foundry-validated"), dashed, hidden
by the flag.

### Stance

Candid about the human in the loop, which the other drafts mention in one line and this one makes the subject. It says
plainly that the reviewer was an author, that four proposals were low-confidence, that three requirements wait on the
expert, that nothing is replicated. It does not survey other routes. The "you" voice is a framing device, not a claim:
the legend line reads "You, here, was one of us (J.C.), on one paper. One run, not a sample."

### Toolchain

**Typst via `uvx` (typst 0.15.0 pinned, as the receipt builds do).** The page is typographic: a numbered form, three
stacked blocks, no generated graphics beyond glyphs and QR codes. Typst's `grid`, `table` and measured `fit()` columns
(receipt-grounded-v2's overflow panic) give exact control of the ten rows and fail loudly if a question wraps. Data
(`questions.json`, `verdicts.json`, `ledger.json`) is extracted by a `build.py` from the brief, review and run files,
with the shortened question texts in `content.yml` keyed by question index and a guard that the count is ten and that
exactly one is marked edited. QR SVGs via `segno`. Fonts cached outside the vault. `--hide-ask` flag, bleed PDF, checks.

Fonts (OFL): **Public Sans** (hero and headings, 900; a forms face), **Atkinson Hyperlegible** (questions and body; built
for legibility at a glance), **IBM Plex Mono** (ids and hashes). Tick, pen, ring and cut-ring glyphs are drawn shapes,
not font glyphs.

### Lessons applied, pitfalls avoided

- "Wall of 28 pt text" (receipt-grounded, specimen-vision lower-left): the form's weight is in 110 pt numerals, 40 pt
  questions and 1.2 in glyphs; proposals are one line each; evidence lines appear on five rows only. Word budget for the
  whole poster ≤ 550 words, counted by the build.
- "No thesis at headline size" (receipt-vision v1): hero at ≥ 104 pt, thesis at 72 pt at the top of the right column.
- "0/15 reads as a Foundry score": it sits in the verdict block, under the three tools, attributed.
- "Expert reviewer credited as 'a human'" (content review on the Visionary posters): named as an author in the form
  footer and in the legend.
- "Implicit rate": the form's 9/1 count is a review tally on one brief, labelled; the legend says one run, not a sample.
- Right column is three blocks of unequal height, not cards; the bottom strip is one line plus QRs, not a card row.
- Title: the layout holds the two-line dossier title; the short title would free 1.5 in for the form and is preferred if
  sign-off #4 allows.

### Unlike the twelve

Every draft shows the system's output (a map, a receipt, a mounted graph). This one shows the system's *input from the
reader*, the brief review, and puts the reader in the second person. It has no workflow graph, no map, no paper prop; its
dominant image is a numbered form. It is also the only concept whose central evidence (the ten questions) has never
appeared on any draft beyond the phrase "10 proposed answers, 1 edited".

---

## 4. Sign-off items these concepts add

Numbered to continue `REVIEW_CONTENT.md` §4 (1–21 still apply, especially #4 title, #5 publishing the run dirs, #11
cost, #12 BAQ numbers, #13 Anton slots, #14 EGAPx branch, #17 live URL).

| # | Decision | Affects |
| - | - | - |
| T1 | Show Planemo attempt 1 (infra failure, `AF_UNIX path too long`, no workflow ran) on the trace? Honest and technical, but it is a Planemo/macOS bug, not a Foundry story | trace |
| T2 | Show the Galaxy branch as "not pinned (`b18269a1`)" in print? | trace, ten-questions |
| T3 | Ledger wording: "resolved or surrendered, never deleted" is from the ledger research note (r1 §6.1); confirm it describes the contract before printing | trace |
| N1 | Noticeboard tone for a CSHL board: MISSING / WANTED / FREE TO A GOOD HOME flyers next to two Orbit posters. OK, or too jokey for the Tools track? | noticeboard |
| N2 | "MISSING: 10,707 N" as the largest headline on the poster; it is accurate (zero-read consensus) but a passer-by may read it as a defect in the paper's method rather than in the wrapper. Keep, or lead with the BAQ flyer? | noticeboard |
| Q1 | Print the ten brief questions verbatim-ish, with their low-confidence tags and the one correction, naming J.C. as reviewer? They are from an unpublished run dir (#5) | ten-questions |
| Q2 | Q6's margin note ("the paper disagrees with itself: Methods 10, Results 20×") editorialises about Vogels et al. Keep, soften ("the paper reports both"), or drop? | ten-questions |
| Q3 | Second-person voice on a scientific poster: fine, or switch to "the expert"? | ten-questions |
| A1 | Which of the three to build first? Suggested order if only one: ten-questions (cheapest, most distinct, no graphics), then trace, then noticeboard | all |
