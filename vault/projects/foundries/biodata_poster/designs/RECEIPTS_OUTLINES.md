# Round 3: six outlines for one poster built from several receipts

Creative direction for the CSHL Biological Data Science 2026 poster (44×44 in, Nov 4–7). Each outline below is self-contained: a designer gets one outline, `FEEDBACK_ROUND3.md`, and the three keeper directories (`typed-not-guessed-receipt/`, `known-unknowns-receipt/`, `skills-are-binaries-receipt/`). Build into `designs/receipts-<slug>/`.

The pitch every outline serves: **build better skills, build better workflows, and keep the receipts.** A "receipt" is a thermal-print slip rendered from a real artifact, in the keepers' visual language (graph paper, tape, stamps, tear lines, Kalam pen notes). The receipts are the evidence; the margin notes are the argument. Several receipts on one sheet must read as one case, not as three posters glued together.

## Non-negotiables repeated in every outline (from FEEDBACK_ROUND3.md)

- Authors, verbatim: **John Chilton¹, Marius van den Beek¹, Dannon Baker², Danielle Callan³, Scott Cain¹, Anton Nekrutenko¹**. ¹The Pennsylvania State University, University Park, PA, USA · ²Johns Hopkins University, Baltimore, MD, USA · ³Temple University, Philadelphia, PA, USA.
- QR codes: **Foundry** (`https://galaxyproject.github.io/foundry/`) and **preprint** (`https://doi.org/10.64898/2026.10.26.761864`) on every poster, plus the `[[QR: live results]]` placeholder. **Never** a lightning-talk QR (`gcc2026-lightning`, `foundry-pattern-in-one-minute`). Optional others are listed per outline. Vector SVG via segno (`make_qr.py` in any keeper).
- Orbit 0/15 is never a hero number. Frame positively: the tools decide, prompts alone don't. Sources, all in the preprint (Baker et al. 2026, bioRxiv doi:10.64898/2026.10.26.761864): "Skills are guidance, not enforcement" (p.16); the static connection validator caught an agent's bad `tximport` wiring before execution (p.4, pp.15–16, Fig S3A); Orbit refuses by default after v0.8.0 (pp.17–18). 0/15 may stay as small attributed context (p.18) or be dropped; each outline says which.
- Body ≤ 400 words counted the keeper way (every alphanumeric token on the page, receipt line items included; title, authors, references and QR captions exempt). Hero ≥ 100 pt, all text ≥ 24 pt, body ≥ 28 pt. Receipt type never goes below 28 pt, so the lever on density is **line count**, not point size.
- Every number traces to a source file named in the outline. No benchmark rates, no invented statistics. Anton's nf-core work: an optional `[[ASK]]` slot with no numbers, or absent.
- Vector PDF, Typst 0.15.0 via `uvx --from typst==0.15.0 python`, fonts vendored from a keeper (`Archivo Black`, `IBM Plex Mono`, `Kalam`). Copy `build.sh`, `render.py`, `audit.py`, `make_qr.py` and the layout gates from the keeper named in each outline.
- Case studies are not stories here. A run name may appear in a receipt header and a footnote; the biology and the paper stay in the references.

## Receipt catalogue (shared facts; each outline names which it uses)

| Key | Receipt | Rendered from | Verified facts to print |
| - | - | - | - |
| **A** | BUILD RECEIPT, one cast | `~/projects/repositories/foundry` @ origin/main `eb2de3f1` (2026-10-30): `casts/claude/skills/discover-shed-tool/_provenance.json`, `_required_tools.json`, `_verify.json`; keeper `skills-are-binaries-receipt/receipt.json` + `extract.py` | SKILL.md `discover-shed-tool` · MOLD rev 5 · hash `05c99cba` · cast at 2026-09-13 · target claude. 5 refs: `tool-revisions`, `tool-search`, `tool-versions` (cli-command · sidecar · on-demand · corpus-observed; `82061af5→db0b13f2`, `cdf8be42→72f5f7cc`, `d11b5ee6→90f35a40`), `component-tool-shed-search` (research · verbatim · on-demand; `37d96e36=37d96e36`), `galaxy-tool-discovery` (schema · verbatim · **upfront** · cast-validated; `c0940fc0=c0940fc0`). 1 upfront · 4 on demand. REQUIRES gxwf `^1.15.0`. VERIFY `galaxy-tool-pin.json` → `foundry validate-galaxy-tool-discovery --schema-sha256 c0940fc0…`. |
| **B** | TYPE-CHECK RECEIPT, IWC rnaseq-pe | keeper `typed-not-guessed-receipt/data/` (`validate.json`, `validate.txt`, `timing.txt`, `void-param.json`, `void-conn.json`, `run-meta.txt`) + `extract.py`, `rerun_gxwf.sh` | `gxwf validate rnaseq-pe.ga --connections --strict-structure --strict-state` · cli 1.15.0 · IWC `23ccd9915`. Tool state **39 validated, 0 skipped** (15 top-level + 24 in 4 subworkflows). Connections **57 ok, 0 invalid** (top level). Wall 0.57–0.70 s warm. VOID 1: featureCounts `paired_end_status` → `Expected "PE_individual" \| "PE_fragments", actual "PE_fragment"`. VOID 2: fastp `out1` → STAR paired input → `output is collection<list>, input expects collection<paired>`. |
| **C** | DRAFT STATEMENT, burn-down | `~/projects/foundry-runs/dengueseq-denv3/dengueseq-denv3-galaxy` commits `bd40715 80de2f3 3556725 658af4e daf2928 d366ab3 07062a2 b82fa5e`; keeper `known-unknowns-receipt/receipt.json` + `extract.py` (gxwf 1.15.0 replay) | TODO 31 → 27 → 24 → 19 → 13 → 9 → 4 → 0; steps in order `map_reads` (bwa_mem 0.7.19+galaxy1), `filter_mapped_primary` (samtools_view 1.22+galaxy2), `primer_trim` (ivar_trim 1.4.4+galaxy1), `consensus` (ivar_consensus 1.4.4+galaxy0), `per_base_depth` (bedtools_genomecoveragebed 2.31.1+galaxy0), `variants` (ivar_variants 1.4.4+galaxy0), `consensus_header` (tp_sed_tool 9.11+galaxy0); `draft-validate` ok at every commit; promoted `GalaxyWorkflowDraft → GalaxyWorkflow` at `b82fa5e`, 18:44–19:39 local on 2026-10-20. |
| **D** | PINNED slip, Tool Shed changesets | same run dir: `galaxy-workflow.gxwf.yml` (`tool_id` + `changeset_revision` per step), `galaxy-tool-summaries/*.pin.json`, `galaxy-tool-pin.json` | 7 tools: devteam/bwa `bwa_mem` 0.7.19+galaxy1 @ `c598cbb8b019`; iuc `samtools_view` 1.22+galaxy2 @ `5cf9fcc93508`; iuc `ivar_trim` 1.4.4+galaxy1 @ `6606a8c97889`; iuc `ivar_consensus` 1.4.4+galaxy0 @ `1c5448133894`; bgruening/text_processing `tp_sed_tool` 9.11+galaxy0 @ `30b60202d990`; iuc `ivar_variants` 1.4.4+galaxy0 @ `5e5dfc9e71e2`; iuc/bedtools `bedtools_genomecoveragebed` 2.31.1+galaxy0 @ `d57471728f7b`. Each pin's `status: hit` and `score` are in the `.pin.json`. |
| **E** | RUN RECORD, bill of phases | same run dir: `foundry-run.yml`; `git log --reverse` for local times | pipeline `workflow-brief-to-galaxy` · started 2026-10-20T22:11:22Z · finished 2026-10-21T00:34:52Z · status complete. 11 phases: 1 `workflow-brief-to-galaxy-interface` · 2 `…-data-flow` · 3 `compare-against-iwc-exemplar` · 4 `workflow-brief-to-galaxy-template` · 5 `advance-galaxy-draft-step` ×7 · 6 branch `test-data-resolution → find-test-data` · 7 `…-test-plan` · 8 `implement-galaxy-workflow-test` · 9 `validate-galaxy-workflow` · 10 `run-workflow-test` · 11 `debug-galaxy-workflow-output` (no failures). |
| **F** | OPEN-REQUIREMENTS LEDGER | same run dir: `open-requirements.ledger.yml`, **`entries:` section only** (the file also has `discoveries:`, `decisions:`, `brief_change_recommendations:`) | 19 entries: 14 resolved, 5 open, of which 2 are `kind: dropped` (`serotype-coverage-plane-not-carried`, `filtered-variant-frequency-table-not-carried`). Other open: `low-coverage-and-empty-bam-behavior`, `consensus-baq-deviation-check-on-test-sample`, `variants-baq-deviation-check-on-test-sample`. Recount at build. |
| **G** | ALL OF IWC tally | keeper `typed-not-guessed-receipt/data/iwc-tree-summary.json` | 133 workflows · 3,217 tool calls validated · 0 failed · 1 skipped (version mismatch in file). Tool state only, non-strict. |
| **H** | REISSUE slip, a recast | `git -C ~/projects/repositories/foundry show 73af1f62` and `73af1f62^` for `_provenance.json`; merge `9adc20b7` (PR #701) | `73af1f62` (2026-06-17) "normalize tool-id-shaped queries before declaring miss": 6 files, +118 −5; `mold.content_hash 256e3861… → 2e5fa1f8…`, `mold.commit 8d6e79cb → aa9b9425`, `cast_at 2026-06-19T00:21:39Z → 00:55:16Z`; `eval.md` +11 (new property "a miss survives query-variant normalization"). Trigger: `gxwf tool-search integron_finder` → no hits, while `integron finder` → `iuc/integron_finder` @ `5429646e486d` (deck `foundry-pattern.mdx:1754-1785`; `research/r1-foundry-system.md` §5.1). PR #701: the `planemo-asserts-idioms` note revised once → every cast bundling it recast (count the `_provenance.json` files in `git show --stat 9adc20b7`; `research/r2-demo-targets.md` says 8). |
| **L** | TESTED slip, planemo | same run dir as C: `workflow-test-result.json`, `tool_test_output.json`, `galaxy-workflow-validation-result.json` | validate: `gxwf validate --json --connections --strict` · tool_state ok 7, fail 0, skip 0 · connections valid · structure errors 0 (recorded with cli 1.14.0; a 1.15.0 replay is preferred, print whichever ran). planemo 0.75.47 · exit 0 · 1 test · 0 failures · 0 errors · 7 Tool Shed repos installed at the pinned changesets · 6 containers. Jobs-ok count must be read from `tool_test_output.json` (R2 says 7/7); print only what the file says. |
| **M** | EVIDENCE TALLY, all casts | every `casts/claude/skills/*/_provenance.json` at `eb2de3f1` (56 Mold casts carry provenance; 13 pipeline harnesses don't) | 360 reference citations: evidence `corpus-observed` 223 · `hypothesis` 104 · `cast-validated` 33; load on-demand 226 · upfront 134; mode verbatim 326 · sidecar 34 (`PITCHES.md` fact sheet, computed 2026-10-29; the keeper README reconfirmed 360 and 104 at `eb2de3f1`). Recompute all six at build. |

---

## Outline 1 — `side-by-side`

**Directory:** `designs/receipts-side-by-side/`
**Working title (hero, ≥ 120 pt, two lines):** *Build better skills. Build better workflows. Keep the receipts.*
**Thesis (pen line under the title, one sentence):** A skill is compiled from notes people can read; a workflow is type-checked before any job runs; both print a receipt you can keep.

**Receipts: 2.** The skill receipt and the workflow receipt stand side by side at equal height, same width, same type size, and a single pen note bridges them. The symmetry is the argument: the same discipline on both sides.

| | Left: **BUILD RECEIPT** (A) | Right: **TYPE-CHECK RECEIPT** (B) |
| - | - | - |
| Prints | Header (`galaxyproject/foundry · cast target claude · @ eb2de3f1`); `SKILL.md … discover-shed-tool`; `MOLD revision … 5 · 05c99cba`; `cast at … 2026-09-13`; red **NEVER HAND-EDITED** stamp; REFERENCES: 5 lines with name, `load · mode`, `src → dst` hashes; `5 refs … 1 upfront · 4 on demand`; legend `src = dst: copied · src → dst: compiled`; TERMS: `REQUIRES gxwf ^1.15.0`, `VERIFY galaxy-tool-pin.json … schema c0940fc0`; footer **KEEP THIS RECEIPT. It is the part a model cannot regenerate.** | Header (`IWC rnaseq-pe @ 23ccd9915 · gxwf 1.15.0`, command on two lines); TOOL CALLS: the 10 top-level tool lines with QTY and PASS, one line `inside 4 subworkflows … 24 PASS`, total `Tool state: 39 validated, 0 skipped`; red **TYPED** stamp; CONNECTIONS: `list:paired → fastp … map over list`, `map-overs inferred … 5`, `reductions into MultiQC … 13`, `Connections: 57 ok, 0 invalid`; then **`wall time, warm cache … < 1 s`** and only then **`JOBS RUN … 0`** (the feedback order); TEAR HERE; VOID: both planted errors, two lines each, red **VOID** stamp; footer `printed from gxwf's JSON report`. |
| Cut from keeper | The whole Z-REPORT slip. The ORACLE section (replaced by the single VERIFY line). `cast_history`. The two QR codes inside the receipt (they move to the margins). | The ALL OF IWC section (moves to the pen tally). The four per-subworkflow lines (collapsed to one). The nf-core metro map and the "pipeline params CHECKED" slip. The Format 2 `.ga`-vs-YAML card. |

**Layout sketch** (44 × 44 in; 1 in safe zone):

```
+------------------------------------------------------------------------+
| Build better skills. Build better workflows.               [[QR: live]]|
| Keep the receipts.                                          results    |
| authors / affiliations                                                 |
| ~ thesis, one pen line ~                                                |
|                                                                        |
| (1) Skills are   | BUILD RECEIPT     | R | TYPE-CHECK RECEIPT | (4) Typed, |
|  binaries        | SKILL.md ....     | a | TOOL CALLS         |  not       |
|                  | MOLD rev 5 ...    | i | fastp ...... PASS  |  guessed   |
| (2) Every ref    | [NEVER HAND-ED.]  | l | ...                |            |
|  has a hash      | REFERENCES        | s | Tool state 39/0    | (5) Caught |
|                  |  tool-revisions   | , | [TYPED]            |  before    |
|                  |  ...              |   | CONNECTIONS 57/0   |  compute   |
|                  | 5 refs 1 up 4 dem | n | wall time  < 1 s   |            |
|                  | TERMS             | o | JOBS RUN      0    | pen tally: |
|                  |  REQUIRES gxwf    | t | --- TEAR HERE ---  | ALL OF IWC |
|                  |  VERIFY schema    |   | VOID ... [VOID]    | 133 wfs    |
|                  | KEEP THIS RECEIPT | r | printed from JSON  | 3,217 / 0  |
|                  +-------------------+ e +--------------------+            |
|  QR Foundry       (6) Good for humans, so good for agents   QR preprint   |
|  QR gxwf docs      refs [1]                                QR slides      |
+------------------------------------------------------------------------+
```

The centre gutter (about 3 in) carries note 3 set vertically or as a tall narrow block with two arrows, one onto each receipt's VERIFY/TYPED line.

**Word budget (target 370, hard 400):** thesis 20 · BUILD receipt 105 · TYPE-CHECK receipt 125 · notes 1–5 at ≤ 20 each = 100 · pen tally 15 · closing line 6 · footers 12.

**Margin notes** (Kalam head ≥ 60 pt, body ≥ 28 pt):
1. **Skills are binaries. Keep the source.** *(carried)* The knowledge base is the source, the cast is the compiler, this slip is the build log. Nobody edits the binary.
2. **Every reference has a hash.** *(carried, from "Every claim has a receipt")* `src = dst` was copied verbatim; `src → dst` was compiled to a sidecar. You can trace which note produced which line of the skill.
3. **Rails, not reminders.** *(carried, centre gutter, bridges both receipts)* The model translates and repairs; the tools validate. A rule in a prompt is guidance, not enforcement [1]; a schema check caught an agent's bad `tximport` wiring before execution [1]. (0/15: **dropped** on this poster.)
4. **Typed, not guessed.** *(carried, merges the keeper's "Types from the Tool Shed" and "Connections carry collection algebra")* The Tool Shed serves typed schemas for 10,000+ tools; gxwf checks each tool call and each connection against them, map-overs inferred.
5. **Caught before compute.** *(carried, absorbs "One validator, everywhere")* A one-letter typo fails here, before any job is queued. Under a second, so an agent can repair in a loop.
6. **Good for humans, so good for agents.** *(carried, closing line under both receipts, no arrow)* The Foundry's agents write Format 2; gxwf, not the model, judges it.

**The one data visual:** the pen tally **ALL OF IWC** under note 5: `133 workflows · 3,217 tool calls · 0 failed · 1 skipped (version mismatch in file)` from `iwc-tree-summary.json` (G). Hand-drawn numerals, Kalam Bold, same idiom as the keeper's "39 / 57" tally.

**QR codes:** Foundry, preprint (required); gxwf docs `https://jmchilton.github.io/galaxy-tool-util-ts/` and full GCC slides `https://jmchilton.net/slides/gcc2026/` (optional, bottom corners); `[[QR: live results]]` top right.

**Deliberately left out:** Z-report, oracle/eval.md, blind regeneration, draft format, DengueSeq, ledger, recast loop, nf-core comparison and metro map, Format 2 card, corpus counts, Orbit 0/15, `[[ASK]]` (none).

**Tooling:** copy from `skills-are-binaries-receipt/` (absolute `put()`/`note-at()` placement with overflow guards, word-count PDF, `audit.py`). Take `extract.py`, `rerun_gxwf.sh` and `data/` from `typed-not-guessed-receipt/` for the right-hand receipt; commit both `receipt-*.json` so the build is offline.

**Must not turn into:** two keeper posters shrunk and pasted together. If the two receipts don't share a baseline, a type size and the bridging note, it has failed.

---

## Outline 2 — `long-hero-stubs`

**Directory:** `designs/receipts-long-hero-stubs/`
**Working title (kicker + hero):** kicker GALAXY WORKFLOW FOUNDRY; hero (≥ 110 pt) *Checked before compute.*
**Thesis (pen, under hero):** Galaxy type-checks each tool call before a job runs. The Foundry's agents write the same format and get the same check.

**Receipts: 3** — one long hero receipt and two short stubs taped beside it. The hero is the longest tape on the sheet by design: length is the argument (the typed-not-guessed keeper's idea, with its weak side points removed).

1. **Hero: TYPE-CHECK RECEIPT** (B), full keeper length, centre-right, about 27 in tall. Prints: header + command; TOOL CALLS, all 15 top-level lines (QTY · PASS) and the four subworkflow lines; `Tool state: 39 validated, 0 skipped`; TYPED stamp; CONNECTIONS (4 lines); **`wall time, warm cache … < 1 s`** then **`JOBS RUN … 0`**; ALL OF IWC (3 lines); TEAR HERE; VOID (both plants). *Cut:* nothing inside the receipt; the fix is the order of the two punchline lines.
2. **Stub, top-left: DRAFT STATEMENT** (C), 8 rows only. Prints: `GALAXY WORKFLOW DRAFT · run dengueseq-denv3-galaxy`, `OPENING BALANCE … 31 TODO`, then seven rows `▸ step_name … ok … N` with the printed TODO bar, `BALANCE DUE … 0`, small **PROMOTED** stamp. *Cut from keeper:* the YAML excerpt, the tool/version sub-lines, the SHA sub-lines, the 7-square meter, the bacass second-run stub, the footnote.
3. **Stub, bottom-left: BUILD RECEIPT** (A), 6 lines. Prints: `BUILD RECEIPT · discover-shed-tool`, `MOLD rev 5 · 05c99cba`, `5 refs · 1 upfront · 4 on demand`, `VERIFY galaxy-tool-pin.json · schema c0940fc0`, `NEVER HAND-EDITED` stamp, `KEEP THIS RECEIPT`. *Cut:* the five reference lines, TERMS, ORACLE, Z-report, cast_history.

**Layout sketch:**

```
+------------------------------------------------------------------------+
| GALAXY WORKFLOW FOUNDRY                                     [[QR: live]]|
| Checked before compute.                                      results   |
| authors                                                                |
| ~ thesis ~                                                              |
| +--DRAFT STUB-------+   +--TYPE-CHECK RECEIPT----------+ (1) Types from |
| | OPENING   31 TODO |   | $ gxwf validate rnaseq-pe.ga |  the Tool Shed |
| | map_reads  27 ### |   | TOOL CALLS                   |                |
| | ...               |   | fastp ............ 1 PASS    | (2) Connections|
| | BALANCE DUE   0   |   | ... 15 lines + 4 subwf       |  carry         |
| | [PROMOTED]        |   | Tool state 39 / 0  [TYPED]   |  collection    |
| +-------------------+   | CONNECTIONS 57 ok, 0 invalid |  algebra       |
| (4) Known unknowns  --> |                              |                |
|     are typed           | wall time ......... < 1 s    | (3) Caught     |
|                         | JOBS RUN ............... 0   |  before        |
| +--BUILD STUB-------+   | ALL OF IWC 133 / 3,217 / 0   |  compute       |
| | discover-shed-tool|   | ---------- TEAR HERE ------- |                |
| | MOLD rev 5        |   | VOID  FAIL ... [VOID]        | (6) Rails, not |
| | 5 refs            |   | VOID  INVALID ...            |  reminders     |
| | VERIFY schema     |   +------------------------------+                |
| +-------------------+   pencil: other engines check the pipeline's    |
| (5) Skills are binaries  parameters; tool flags stay free text [2]   |
| QR Foundry  QR gxwf                          QR preprint  QR slides    |
+------------------------------------------------------------------------+
```

**Word budget (target 380, hard 400):** thesis 22 · hero receipt 140 · draft stub 45 · build stub 28 · notes 6 × 17 = 102 · pencil line 14 · footers 15.

**Margin notes:**
1. **Types from the Tool Shed.** *(carried)* Typed schemas for 10,000+ community tools: names, types, select options, conditionals, collections.
2. **Connections carry collection algebra.** *(carried; the keeper's strongest side point, kept)* A list of pairs into a paired input is a map-over, inferred. A flat list into a paired input is rejected.
3. **Caught before compute.** *(carried, absorbs "One validator, everywhere")* A one-letter flag typo fails here, before any job is queued. CLI, editor, browser and CI share one core, under a second.
4. **Known unknowns are typed.** *(carried from the draft keeper, one note instead of five)* `TODO_*` sentinels are checked at every resolution and promoted to plain gxformat2 at 0.
5. **Skills are binaries.** *(carried, one line)* The agent that wrote the draft is itself compiled from notes, with a build receipt. Keep the source.
6. **Rails, not reminders.** *(carried)* The model translates and repairs; gxwf validates. Skills are guidance, not enforcement [1]; a connection check caught an agent's bad `tximport` wiring before execution [1]. 0/15: one 28 pt attributed line under this note, or dropped if the budget is tight.
- Pencil line under the hero (replaces the keeper's "Most checks stop at the entrance" note and its metro map): *Other engines check the pipeline's parameters; the flags inside each process stay free text [2].* Cite `vault/papers/gxwf/manuscript.md:136-145` (Table 1) in the references. **No Nextflow workflow drawing of any kind.**

**The one data visual:** the burn-down bars in the draft stub (31 → 0 as printed black bars).

**QR codes:** Foundry, preprint (required); gxwf docs; full GCC slides (optional); `[[QR: live results]]`.

**Deliberately left out:** metro map, "pipeline params CHECKED" slip, Format 2 card, the keeper's "39 / 57" tally (the receipt totals carry it), Rumsfeld, YAML excerpt, bacass, Z-report, oracle, blind regeneration, ledger, recast, `[[ASK]]` (none).

**Tooling:** `typed-not-guessed-receipt/` (its `extract.py`, `rerun_gxwf.sh`, `data/`, two-column flow with `1fr` spacing). Take the draft replay `extract.py` from `known-unknowns-receipt/` for the stub, or read its committed `receipt.json`.

**Must not turn into:** the typed-not-guessed keeper with two stickers. The stubs must be visibly the same paper, the same printer and the same discipline as the hero, and the thesis must mention agents.

---

## Outline 3 — `spike`

**Directory:** `designs/receipts-spike/`
**Working title (hero ≥ 110 pt):** *Four programs sign off.*
**Thesis (pen):** The model translates and repairs. At every stage a program, not the model, prints the receipt and signs it.

**Receipts: 4**, all from one run (`dengueseq-denv3-galaxy`, named only in headers and a footnote), skewered on a drawn receipt spike in the order they were printed. Each receipt ends with a `SIGNED BY` line naming the program that wrote it. A pen column at the right reads the "jobs run" line off each receipt: 0 · 0 · 0 · then a real number.

1. **CAST** (A, 7 lines): `BUILD RECEIPT · discover-shed-tool`, `MOLD rev 5 · 05c99cba · 2026-09-13`, `5 refs · 1 upfront · 4 on demand`, `VERIFY galaxy-tool-pin.json · schema c0940fc0`, `JOBS RUN … 0`, `SIGNED BY foundry cast`. *Cut:* reference lines, TERMS, ORACLE, Z-report.
2. **PINNED** (D, 10 lines): header `TOOL SHED PINS · 7 steps`; one line per tool `owner/tool version … @changeset`; `JOBS RUN … 0`; `SIGNED BY gxwf tool-search · tool-versions · tool-revisions`. New receipt; render from `galaxy-workflow.gxwf.yml` and cross-check each changeset against the `.pin.json` files.
3. **VALIDATED** (L, validation half, 8 lines): the command line; `Tool state … 7 ok, 0 fail, 0 skip`; `Connections … valid`; `map-over … all 7 steps over list`; **`wall time … < N s`** then **`JOBS RUN … 0`** (replay with cli 1.15.0 and `--connections --strict --json` to get a timing; print the replay command); `SIGNED BY gxwf validate`.
4. **TESTED** (L, planemo half, 9 lines): `planemo test 0.75.47 · exit 0`; `tests … 1 · failures … 0 · errors … 0`; `Tool Shed repos installed at pinned changesets … 7`; `containers … 6`; `JOBS RUN … N · failed … 0` where N is read from `tool_test_output.json`; green-ink **TESTED** stamp is not allowed (no green in the palette: use the red stamp ink, text PASS); `SIGNED BY planemo test`.

**Layout sketch:**

```
+------------------------------------------------------------------------+
| Four programs sign off.                                     [[QR: live]]|
| authors  ~ thesis ~                                                     |
|      |  <- spike (pen line from top)                                    |
|  +---+----------+                                           (1) Skills |
|  | CAST        |                                              are      |
|  | 7 lines     |                                              binaries |
|  +---+---+-----+----------+                                 (2) Pinned,|
|      |   | PINNED        |                                   not named|
|      |   | 10 lines      |                                            |
|      |   +---+---+-------+----------+                       (3) Typed, |
|      |       |   | VALIDATED       |                          not      |
|      |       |   | 8 lines         |                          guessed  |
|      |       |   +---+---+---------+-----------+           (4) Not run,|
|      |           |   | TESTED                 |              not known |
|      |           |   | 9 lines                |                        |
|      |           |   +------------------------+  jobs run:  0  0  0  N |
| (5) Rails, not reminders  (bottom-left, no arrow)        pen column    |
| QR Foundry   QR preprint                        [[ASK]] optional stub  |
+------------------------------------------------------------------------+
```

Receipts step down and to the right, each overlapping the previous receipt's lower-left corner by at most 1 in and never covering text. The spike is a single pen line from the top margin through every header.

**Word budget (target 350, hard 400):** thesis 22 · CAST 35 · PINNED 65 · VALIDATED 45 · TESTED 55 · notes 5 × 20 = 100 · jobs column 8 · footers 20.

**Margin notes:**
1. **Skills are binaries.** *(carried)* The agent's skill is compiled from a knowledge base, with a receipt. Keep the source.
2. **Pinned, not named.** *(new)* A tool is a Tool Shed changeset, not a name the model remembers. The pins are what Planemo installs later.
3. **Typed, not guessed.** *(carried)* Each tool call and connection is checked against the tool's real schema before anything runs.
4. **Not run, not known.** *(carried, from "Unknown unknowns")* "A validated workflow that nobody has run is a strong hypothesis about an analysis. It is not the analysis." The fourth receipt is the only one with jobs on it.
5. **Rails, not reminders.** *(carried, bottom-left)* Guidance in a prompt is not enforcement [1]; the four signatures are. 0/15: **dropped**.

**The one data visual:** the pen "jobs run" column at the right edge, one numeral per receipt (0, 0, 0, N), reading downward with the spike.

**QR codes:** Foundry, preprint (required); install the skills `https://galaxyproject.github.io/foundry/usage/` (optional); `[[QR: live results]]`.

**`[[ASK]]`:** one optional fifth stub on the spike, blank except `[[ASK]] nf-core pipeline · Foundry-validated · Planemo-green`, no numbers, behind a `SHOW_ASK` flag with a no-ASK check render. Default off.

**Deliberately left out:** IWC rnaseq-pe and VOID plants, draft burn-down, ledger, Z-report, oracle, blind regeneration, recast, nf-core comparison, any biology from the run, the second (178 MB) test case.

**Tooling:** `skills-are-binaries-receipt/` (absolute placement, rotation, guards). Reuse `known-unknowns-receipt/extract.py`'s gxwf invocation for the VALIDATED replay. Commit a `receipts.json` holding all four.

**Must not turn into:** a pipeline diagram with receipts as icons. Four real slips with real signatures, or nothing. Also not a DengueSeq case study: the paper is a reference line only.

---

## Outline 4 — `stapled-bundle`

**Directory:** `designs/receipts-stapled-bundle/`
**Working title (hero ≥ 120 pt):** *Write down what you don't know.*
**Thesis (pen):** A draft types its unknowns. A ledger lists the gaps it kept. A skill labels how far to trust each source. All three are checked, not promised.

**Receipts: 3**, stapled at one corner and fanned so each is fully readable. This is the known-unknowns keeper's idea widened from one artifact to three: explicit incompleteness is the output, at the step level, the requirement level and the knowledge level.

1. **Top: DRAFT STATEMENT** (C), the keeper's receipt trimmed. Prints: `OPENING BALANCE bd40715 … 31 TODO`; the `map_reads` YAML excerpt cut to 6 lines (`tool_version: TODO`, the two `TODO_*` inputs, `_plan_state: |` first line); BURN-DOWN: 8 rows with step, `ok`, TODO count and bar (keep the SHA·tool sub-line, drop the 7-square meter); `BALANCE DUE … 0` circled; **PROMOTED** stamp. *Cut:* bacass stub, the picked-by column header, the footnote.
2. **Middle: OPEN-REQUIREMENTS LEDGER** (F). Prints: header `run dengueseq-denv3-galaxy · after planemo test pass`; `entries … 19`, `resolved … 14`, `open … 5`, `of which dropped on purpose … 2`; the five open ids as line items, each with `open` or `dropped`; stamp **CARRIED FORWARD**; footer `gxwf validate pass · planemo test pass · with these five written down`. The ids are single tokens, so this costs about 45 words.
3. **Bottom: EVIDENCE TALLY** (M), a 3-row slip. Prints: `ALL 56 SKILLS · 360 citations`; `corpus-observed … 223`; `hypothesis … 104`; `cast-validated … 33`; footer `hypothesis must name a verification · on-demand must name a trigger · the schema refuses the shortcut`. This is the Z-report reduced to three rows, the feedback's size complaint answered.

**Layout sketch:**

```
+------------------------------------------------------------------------+
| Write down what you don't know.                             [[QR: live]]|
| authors  ~ thesis ~                                                     |
|  (1) Known      *staple                                  (4) Gaps are   |
|   unknowns      +--DRAFT STATEMENT-------------+          output        |
|                 | OPENING BALANCE   31 TODO    |                        |
|  (2) Valid at   |  class: GalaxyWorkflowDraft  |   +--LEDGER----------+ |
|   every         |  tool_version: TODO          |   | entries       19 | |
|   resolution    | BURN-DOWN                    |   | resolved      14 | |
|                 |  map_reads  ok  27 ########  |   | open           5 | |
|  (3) Promote,   |  ...                         |   |  dropped       2 | |
|   don't         | BALANCE DUE   (0) [PROMOTED] |   | low-coverage.. o | |
|   translate     +------------------------------+   | serotype..  drop | |
|                                                    | ...              | |
|  (7) Unknown         +--EVIDENCE TALLY-------+     | [CARRIED FORWARD]| |
|   unknowns           | 360 citations         |     +------------------+ |
|   take a run         | corpus-observed  223  |   (5) Hypothesis is a    |
|                      | hypothesis       104  |       label              |
|                      | cast-validated    33  |                          |
|                      +-----------------------+   (6) Rails, not         |
| QR Foundry  QR draft docs                QR preprint   reminders        |
+------------------------------------------------------------------------+
```

A drawn staple sits at the top-left corner of the draft receipt; the ledger and tally are rotated +2° and +4° and offset so their top-left corners tuck under the same staple graphic while their bodies stay clear.

**Word budget (target 365, hard 400):** thesis 25 · draft 110 · ledger 50 · tally 30 · notes 7 × 16 = 112 · footers 20.

**Margin notes:**
1. **Known unknowns.** *(carried; the Rumsfeld quote is cut to this two-word phrase, attributed in the references only, no clipping)* Versions, ports, anything not yet known: typed `TODO_*` sentinels; `_plan_*` carries the intent.
2. **Valid at every resolution.** *(carried)* `draft-validate` checks what is concrete against real tool schemas and skips what is deferred.
3. **Promote, don't translate.** *(carried, one line)* At zero the draft is ordinary gxformat2.
4. **Gaps are output.** *(new)* Methods sections omit result-changing choices [1]. Each gap is stated as a requirement; two were dropped on purpose and say so.
5. **Hypothesis is a label.** *(new, replaces the oracle note)* 104 of 360 citations are marked hypothesis, and each must name how it will be verified.
6. **Rails, not reminders.** *(carried)* The model translates and repairs; the tools validate. Guidance is not enforcement [1]. 0/15: small attributed line under this note (keeper wording), or dropped.
7. **Unknown unknowns take a run.** *(carried)* The QA:466 quote, kept whole; it closes the poster honestly.

**The one data visual:** the burn-down bars in the draft receipt. The ledger and tally print numbers only, no bars, so there is one chart on the sheet.

**QR codes:** Foundry, preprint (required); draft format docs `https://jmchilton.github.io/galaxy-tool-util-ts/#/guide/draft-format` (optional); `[[QR: live results]]`.

**Deliberately left out:** the Rumsfeld clipping, bacass, the 7-square meter, type-check receipt, VOID plants, pins, run record, recast, blind regeneration, Nextflow, `[[ASK]]` (none).

**Tooling:** `known-unknowns-receipt/` (its replay `extract.py`, `meta.json` word-count exemption, margin-collision gates). Add a small extractor for the ledger (`entries:` section only, PyYAML) and for the tally (walk `casts/claude/skills/*/_provenance.json`).

**Must not turn into:** a DengueSeq case study, or a confession. The ledger is evidence of discipline: the run passed its test *and* wrote down what it did not do.

---

## Outline 5 — `bill-of-skills`

**Directory:** `designs/receipts-bill-of-skills/`
**Working title (hero ≥ 120 pt):** *A workflow is a bill of skills.*
**Thesis (pen):** Every phase of a run is a compiled skill. The run record is the bill; each skill on it has its own build receipt; each pin it made is checked against the skill's own schema.

**Receipts: 3** — one tall ledger and two tear-off stubs perforated off its right edge. The stubs are not decoration: they are the real files the ledger lines point to, so the poster shows a chain of receipts you can follow from a run down to a hashed note.

1. **Ledger: RUN RECORD** (E). Prints: header `pipeline workflow-brief-to-galaxy · run dengueseq-denv3-galaxy · 2026-10-20 22:11 → 00:34 UTC · status complete`; eleven line items `n · skill-name … hh:mm`, the skill name set bold, phase 5 as `advance-galaxy-draft-step ×7`, phase 6 as `branch test-data-resolution → find-test-data`; two subtotal lines under phases 9 and 10: `tool state 7 ok · connections valid` and `planemo 1 test · 0 failures`; footer `every line is a cast skill with a build receipt`. Skill names are single tokens, so eleven lines cost about 40 words.
2. **Tear-off 1, off phase 5: PINNED** (D). Prints `TOOL SHED PINS · 7` and the seven `owner/tool version @changeset` lines; footer `pinned by discover-shed-tool → galaxy-tool-pin.json`.
3. **Tear-off 2, off tear-off 1's footer: BUILD RECEIPT stub** (A). Prints `discover-shed-tool · MOLD rev 5 · 05c99cba`, `5 refs · 1 upfront · 4 on demand`, `VERIFY galaxy-tool-pin.json · schema c0940fc0`, `NEVER HAND-EDITED` stamp. The link is real: `_verify.json` gates the artifact `galaxy-tool-pin` and `galaxy-tool-pin.json` is in the run directory; say so in the footnote. *Cut:* reference lines, TERMS, ORACLE, Z-report.

**Layout sketch:**

```
+------------------------------------------------------------------------+
| A workflow is a bill of skills.                             [[QR: live]]|
| authors  ~ thesis ~                                                     |
| (1) Skills   +--RUN RECORD--------------------+                        |
|  are         | workflow-brief-to-galaxy       |                        |
|  binaries    | 1 ...-interface      22:17  |---+--PINNED-----------+   |
|              | 2 ...-data-flow      22:29  |   | bwa_mem @c598cbb8 |   |
| time ruler   | 3 compare-against-iwc 22:40 |   | samtools_view @.. |   |
| 22:11        | 4 ...-template       22:44  |   | ... 7 lines       |   |
|  |           | 5 advance-draft-step x7 23:39|<--| pinned by         |   |
|  |  2h23m    | 6 branch -> find-test-data   |   |  discover-shed-tool   |
|  |           | 7 ...-test-plan      23:55  |   +---+---------------+   |
|  |           | 8 implement-...-test 23:58  |       | BUILD stub    |   |
|  |           | 9 validate-galaxy-wf 00:00  |       | rev 5 05c99cba|   |
|  v           |   tool state 7 ok · conn ok |       | VERIFY schema |   |
| 00:34        | 10 run-workflow-test 00:33  |       | [NEVER HAND-  |   |
|              |   planemo 1 test · 0 fail   |       |  EDITED]      |   |
| (4) Rails,   | 11 debug-...-output  00:34  |       +---------------+   |
|  not         | every line is a cast skill  |   (2) Receipts all the    |
|  reminders   +-----------------------------+       way down            |
|                                                 (3) Pinned, not         |
| QR Foundry   QR install                QR preprint   remembered         |
+------------------------------------------------------------------------+
```

**Word budget (target 350, hard 400):** thesis 28 · ledger 100 · PINNED 60 · BUILD stub 30 · notes 5 × 20 = 100 · ruler 8 · footers 24.

**Margin notes:**
1. **Skills are binaries. Keep the source.** *(carried)* Each line on the bill is a skill compiled from notes people can read, never hand-edited.
2. **Receipts all the way down.** *(new)* The bill names the skill; the skill's receipt hashes its sources; its `VERIFY` line is the schema the pin file was checked against.
3. **Pinned, not remembered.** *(new)* A tool is a Tool Shed changeset the skill looked up, not a name from training data. Planemo installed exactly these seven.
4. **Rails, not reminders.** *(carried)* Phases 9 and 10 are programs, not prompts: gxwf and Planemo wrote those subtotals. Guidance is not enforcement [1]; the connection check that caught an agent's `tximport` wiring [1] is the same check on line 9. 0/15: **dropped**.
5. **Good for humans, so good for agents.** *(carried, closing line)* The format the skills write is the one people read.

**The one data visual:** a vertical time ruler in the left gutter, 22:11 → 00:34 UTC (2 h 23 m), with a tick per phase and phase 5 shaded as the widest band (22:44 → 23:39 UTC, seven iterations). Times come from `foundry-run.yml` artifact timestamps; cross-check against `git log`.

**QR codes:** Foundry, preprint (required); install the skills `https://galaxyproject.github.io/foundry/usage/` (optional); `[[QR: live results]]`.

**Deliberately left out:** the draft burn-down (phase 5 is one line), the ledger of open requirements, the type-check receipt, Z-report, oracle, recast, blind regeneration, the paper's biology, planemo container names, the unrun 178 MB test case, `[[ASK]]` (none).

**Tooling:** `skills-are-binaries-receipt/` (placement guards, word-count PDF). New `extract.py`: PyYAML over `foundry-run.yml`, the seven `changeset_revision` values from `galaxy-workflow.gxwf.yml`, and the cast's `_provenance.json` / `_verify.json` via `git show`.

**Must not turn into:** a Gantt chart or a process diagram. It is an itemised bill with two stubs, and the stubs must look torn from the bill's perforation.

---

## Outline 6 — `reissue`

**Directory:** `designs/receipts-reissue/`
**Working title (hero ≥ 120 pt):** *Fix the source. Reissue the binary.*
**Thesis (pen):** When a skill is wrong, nobody edits the skill. The note or Mold is fixed, the skill is recast, and its receipt changes hash. That is the learning loop, and it leaves a paper trail.

**Receipts: 2** — the same build receipt before and after one real fix. The "after" is a short reissue slip stapled over the "before", with the changed lines highlighted in the keeper's yellow and the old hash struck through in red pen. This is the skills-are-binaries keeper taken to its consequence.

1. **Left: BUILD RECEIPT, before** (A at `73af1f62^`). Render `_provenance.json` from `git show 73af1f62^:casts/claude/skills/discover-shed-tool/_provenance.json`. Prints: `SKILL.md … discover-shed-tool`; `MOLD revision 4 · 256e3861 · commit 8d6e79cb`; `cast at … 2026-06-19 00:21`; the reference lines as they were at that commit (verified: provenance schema 2, Mold revision 4, the same five refs with `load`/`mode`/`evidence` present, but different `src_hash` values, e.g. `tool-revisions 4a2e231e → db0b13f2`, `galaxy-tool-discovery 38f28eab = 38f28eab`; take the list from that revision, not from today's file); `VERIFY` line if `_verify.json` exists at that ref, else omit; `NEVER HAND-EDITED` stamp; footer `KEEP THIS RECEIPT`. *Cut from keeper:* Z-report, ORACLE, TERMS beyond VERIFY, cast_history, in-receipt QR codes.
2. **Right: REISSUE slip, after** (H). Prints: `REISSUE · 73af1f62 · 2026-06-17`; `MOLD … 256e3861 → 2e5fa1f8` (old struck through); `commit … 8d6e79cb → aa9b9425`; `cast at … 00:21 → 00:55`; `REASON` block: `gxwf tool-search integron_finder … no hits`, `gxwf tool-search "integron finder" … iuc/integron_finder @ 5429646e486d`; `FIXED IN THE SOURCE`: `index.md … normalize a tool-id-shaped need before searching`, `eval.md … +11 · property 3: a miss survives query-variant normalization`; `files 6 · +118 −5`; `SKILL.md … recast, not edited`; stamp **RECAST**. Below it, the one data visual (see below).

**Layout sketch:**

```
+------------------------------------------------------------------------+
| Fix the source. Reissue the binary.                         [[QR: live]]|
| authors  ~ thesis ~                                                     |
| (1) Skills are  +--BUILD RECEIPT (before)--+  +--REISSUE 73af1f62----+ |
|  binaries       | discover-shed-tool       |  | MOLD 256e3861->2e5fa1f8|
|                 | MOLD 256e3861 8d6e79cb   |  | commit 8d6e79cb->aa9b..|
| (2) Text is     | cast at 2026-06-19 00:21 |  | cast at 00:21 -> 00:55 |
|  cheap          | [NEVER HAND-EDITED]      |  | REASON                 |
|                 | REFERENCES               |  |  tool-search integron_ |
| (3) A false     |  tool-revisions  ..hash  |  |   finder ..... no hits |
|  miss passes    |  tool-search     ..hash  |  |  "integron finder" ... |
|  every static   |  ...                     |  |   iuc/integron_finder  |
|  check          | VERIFY schema c0940fc0   |  | FIXED IN THE SOURCE    |
|                 | KEEP THIS RECEIPT        |  |  index.md normalize..  |
| (6) The receipt +--------------------------+  |  eval.md +11 prop 3    |
|  is the diff                                  | files 6  +118 -5       |
|                                               | [RECAST]               |
|           (5) Rails, not reminders            +------------------------+ |
|                                               one row: 1 note -> N skills|
|                                               reissued (PR #701)         |
|                                               (4) One fix, many skills   |
| QR Foundry  QR blind regeneration        QR preprint  QR pattern slides  |
+------------------------------------------------------------------------+
```

**Word budget (target 345, hard 400):** thesis 30 · before-receipt 95 · reissue slip 75 · notes 6 × 17 = 102 · one-row visual 15 · footers 25.

**Margin notes:**
1. **Skills are binaries. Keep the source.** *(carried)* "No serious engineering culture treats the compiled binary as the place you make changes."
2. **Text is cheap.** *(carried)* A model rewrote two deleted skills from their topic alone; the light one came back better. What it could not supply: provenance and an enforced check.
3. **A false miss passes every static check.** *(carried, de-technicalised; replaces the "oracle" note)* The Tool Shed search said no; the wrapper existed; a workflow run surfaced it and would have authored a wrapper that already ships. The Mold now checks name variants, and its eval has a property for it.
4. **One fix, many skills.** *(carried from "One note, many skills", now as an event)* PR #701 revised one note on test assertions; every skill bundling it was recast in one merge.
5. **Rails, not reminders.** *(carried)* The fix is not a reminder in a prompt. `_verify.json` gates the output against a pinned schema; guidance is not enforcement [1]. 0/15: small attributed line or dropped.
6. **The receipt is the diff.** *(new)* The hash is how you know which knowledge produced the skill in front of you. Without it, "fixed" is a feeling.

**The one data visual:** a single Z-report row under the reissue slip: `planemo-asserts-idioms · 1 note → N skills reissued`, N filled cells out of 56, N counted from `git show --stat 9adc20b7` (expect 8). One row only; the keeper's five-row Z-report is gone.

**QR codes:** Foundry, preprint (required); blind regeneration `https://galaxyproject.github.io/foundry-pattern/blog/2026-06-blind-regeneration/` and pattern slides `https://jmchilton.net/slides/foundry-pattern/` (optional); `[[QR: live results]]`.

**Deliberately left out:** today's rev-5 receipt (the before/after pair is the point; note in the README that current `main` is `05c99cba`), Z-report, eval.md property list, draft format, type-check receipt, DengueSeq, ledger, other Foundries, named skill repos, `[[ASK]]` (none).

**Tooling:** `skills-are-binaries-receipt/` (extract via `git show` at a ref, placement guards, word-count PDF). Parameterise `extract.py` by two refs (`73af1f62^`, `73af1f62`) and add the PR #701 count.

**Must not turn into:** a git log. Two slips, one correction, one row. If a reader needs to know what a commit is to follow it, cut words until they don't.

---

## How the six differ

| Slug | Receipts | Thesis in five words | Hierarchy / layout | Margin notes argue | Data visual | Carries |
| - | - | - | - | - | - | - |
| `side-by-side` | 2: A + B | skills compiled, workflows type-checked | two equal columns, bridged by one centre note | symmetry: same discipline on both sides | IWC pen tally | binaries metaphor, rails, typed-not-guessed |
| `long-hero-stubs` | 3: B hero + C stub + A stub | checked before compute | one long tape, two taped stubs | typing depth; agents write the same format | burn-down bars (stub) | typed-not-guessed fixed, draft strength, rails |
| `spike` | 4: A, D, L-validate, L-test | four programs sign off | diagonal spike, chronological | the tools decide, stage by stage | jobs-run column 0·0·0·N | rails, binaries, "not the analysis" |
| `stapled-bundle` | 3: C + F + M | write down what you don't know | fanned bundle under one staple | explicit incompleteness at three levels | burn-down bars | draft strength, known unknowns, rails |
| `bill-of-skills` | 3: E + D + A stub | a workflow is a bill of skills | tall ledger with two perforated tear-offs | receipts chain from run to hashed note | time ruler | binaries metaphor, rails, humans/agents |
| `reissue` | 2: A before + H after | fix the source, reissue the binary | before/after pair, correction stapled over | the learning loop lives in the source | one Z-report row | binaries metaphor (favourite), rails |

Receipt A appears in five outlines but in four forms (full, 6-line stub, 7-line stub, before/after pair); B in two; C in two; D in two; E, F, G, H, L, M once each. No two outlines share the same set, the same hero or the same layout family.

## Recommendation

If John can build only one: **`side-by-side`**. It is the lowest-risk realisation of the literal pitch, it reuses two keepers' verified data and tooling, it fixes every flagged item (Z-report gone, oracle gone, jobs/wall-time order, no Nextflow drawing, no 0/15, required QRs, Scott Cain), and its two receipts are the two John has already said he is close to happy presenting. The bridging "Rails, not reminders" note is what stops it reading as two posters glued together.

Runner-up: **`bill-of-skills`**. It is the most original and the most literally "keep the receipts", and its chain (run record → pin slip → the skill's `_verify.json`) is a real file link rather than an analogy. It costs a new extractor and leans on one run directory, so build it second.
