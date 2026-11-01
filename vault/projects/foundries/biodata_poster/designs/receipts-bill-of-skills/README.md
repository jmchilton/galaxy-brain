# receipts-bill-of-skills

Round-3 outline 5 (`../RECEIPTS_OUTLINES.md`, "bill-of-skills"), built in the keepers' run-receipt language: graph paper, thermal slips, tape, red stamps, torn edges and Kalam pen notes. The tooling and helpers come from `../skills-are-binaries-receipt/`.

## The idea

The hero, at 184 pt, is **"A workflow is a bill of skills."** The pen line beside it reads: *"Every phase of a run is a compiled skill. The run record is the bill; each skill on it has its own build receipt."*

The poster is three receipts in one chain. You can follow it from a run down to a hashed note:

1. **RUN RECORD**, the tall ledger. It is printed from one real run's `foundry-run.yml` (`dengueseq-denv3-galaxy`).
   - It has eleven line items `n · skill … done UTC`, with skill names in bold.
   - Phase 5 is `advance-galaxy-draft-step ×7`, and the ×7 is circled in pen. Phase 6 is `branch test-data-resolution → find-test-data`.
   - Two subtotals sit under phases 9 and 10, read from the run's gxwf and Planemo result files.
   - Then come `TOTAL 11 skills · 2h 23m`, a red **COMPLETE** stamp and the footer "every line is a cast skill with a build receipt". The build asserts that footer: every skill on the bill has a `_provenance.json` in the foundry.
2. **TOOL SHED PINS · 7**, a tear-off torn from the ledger's right edge beside line 5. Both torn edges are sawtooth, and a pen arrow runs from the circled ×7 to its header.
   - It lists one pin per phase-5 iteration: `tool @changeset` and `owner/repo · version`.
   - Footer: "pinned by **discover-shed-tool** → galaxy-tool-pin.json".
3. **BUILD RECEIPT**, a stub perforated off tear-off 1's footer. It prints `discover-shed-tool`'s cast:
   - MOLD rev 5 · `05c99cba`;
   - 5 refs, 1 upfront · 4 on demand;
   - VERIFY `galaxy-tool-pin.json`, schema `c0940fc0`;
   - a **NEVER HAND-EDITED** stamp.

**The one data visual** is a vertical time ruler in the left gutter, 22:11 → 00:34 UTC. It spans the same height as the ledger's line items, and a dashed rule ties each of its ends to the bill. There is one tick per phase. Phase 5 (×7, 55 min) is the widest band, shaded yellow. Phase 10 (33 min) is hatched, so the two still differ in greyscale.

The five pen notes follow the outline:

| # | Note | Points at |
| - | - | - |
| 1 | **Skills are binaries. Keep the source.** Each line is compiled from notes people read, never hand-edited. | bill line 1 |
| 2 | **Receipts all the way down.** The bill names the skill; the skill's receipt hashes its sources and names the file it writes. | stub VERIFY line |
| 3 | **Pinned, not remembered.** A Tool Shed changeset the skill looked up, not a name from training data. "Planemo installed exactly these seven." | tear-off 1 |
| 4 | **Rails, not reminders.** Lines 9 and 10 are judged by programs, not prompts: the subtotals are gxwf's and Planemo's verdicts. Footnote: "Skills are guidance, not enforcement" [1], and the same kind of connection check caught an agent's `tximport` miswiring before it ran [1]. | bill lines 9–10 |
| 5 | **Good for humans, so good for agents.** "Every slip here is printed from a real file people can read. *Keep the receipts.*" This is the closing line, bottom left. | none |

Orbit 0/15 is **dropped**, as the outline asks.

## Body word count

**323 body words** (limit 400).

- **What is exempt:** the kicker, hero, authors, QR captions, and the references/sources block. These are hidden in the `count=1` render.
- **What counts:** everything else, including every ledger and stub line item, every hash and timestamp, the ruler labels and the `[[QR: live results]]` placeholder.
- **How a word is counted:** any whitespace token containing a letter or digit (PyMuPDF `get_text("words")`, as in the keepers).
- **Enforcement:** `audit.py --count` fails the build above 400. I checked that the gate fires: with a limit of 100 it reported "AUDIT FAILED: 344 body words > 100" (before the last copy trim).

## Rebuild

```sh
./build.sh
```

The build runs these steps:

1. **Extract.** `extract.py` (uv script, PyYAML) reads the run dir and the foundry clone read-only, with `git show` and file reads, and writes `receipt.json`.
   - The run dir is `~/projects/foundry-runs/dengueseq-denv3/dengueseq-denv3-galaxy`. Override the parent with `FOUNDRY_RUNS`.
   - The foundry clone is `FOUNDRY_REPO`, default `~/projects/repositories/foundry`, at `FOUNDRY_REF`, default `origin/main`. Fetch first.
   - If either is missing, the build uses the committed `receipt.json`.
2. **QR codes.** `make_qr.py` (segno) writes the vector QR SVGs and `assets/qr.json`.
3. **Render.** `render.py` runs Typst 0.15.0 (`uvx --from typst==0.15.0 python`) and writes:
   - `poster.pdf`, 44 in;
   - `poster-bleed.pdf`, 44.25 in;
   - `preview.png`, 1496 px;
   - `poster-count.pdf`, in `/private/tmp/claude-503/receipts-bill-of-skills-deps/`.
4. **Audit.** `audit.py` runs on both PDFs and on the count render.
5. **Checks.** `pdftoppm` writes `checks/preview-25.png` (1056 px), `checks/preview-gray.png` and `checks/thumb-200.png`.
6. **Hygiene.** The build fails if the directory contains a symlink or a `node_modules`.

**Optional replays.** These feed the README only; nothing from them is printed. If `gxwf` and `foundry` are installed in the deps dir, `extract.py` also replays them into `receipt.json` `replay`. One-time install:

```sh
npm_config_cache=/private/tmp/claude-503/receipts-bill-of-skills-deps/npm-cache \
  npm i --prefix /private/tmp/claude-503/receipts-bill-of-skills-deps \
  @galaxy-foundry/gxwf-foundry@0.4.0 @galaxy-tool-util/cli@1.15.0
```

It needs `uv` and poppler. There is no `node_modules` and no symlink in the vault.

**To edit the copy:**
- Title, thesis and authors: the top of `poster.typ` (`kicker`, `hero`, `thesis`, `authors`).
- Notes: the `note-at(...)` calls.
- Debug render: `sys_inputs={"noguard": "1"}`.

### Build guards

| Guard | Where |
| - | - |
| Every placed block (`put`, `note-at`) stays inside the 1 in safe zone or above the next block's top | `poster.typ` |
| Both stubs fit above 33.6 in, the top of note 2 | `poster.typ` |
| Bill line 5 lies on stub 1's torn edge | `poster.typ` |
| Each QR code, quiet zone excluded, is ≥ 2.5 in | `poster.typ` |
| No text under 24 pt | `audit.py`, on both PDFs |
| No body text under 28 pt | `audit.py --count` |
| No more than 400 body words | `audit.py --count` |
| No non-vendored font, no unembedded font | `audit.py` |
| The run record's times agree with git (< 2 min); the run ends at `finished_at` | `extract.py` |
| Each pinned changeset equals the one in `galaxy-workflow.gxwf.yml`; 7 pins = 7 iterations = 7 Tool Shed steps | `extract.py` |
| Every skill on the bill has a `_provenance.json` at `FOUNDRY_REF` | `extract.py` |
| The run's feedback ledger names the same Mold, revision, content hash and schema hash as the cast | `extract.py` |

Two gates fired during development, which shows they work: stub overflow (33 pt) and the word limit (forced to 100).

**Checked by hand:**
- `pdffonts` shows all 6 used faces embedded and subset.
- The cropped `poster-bleed.pdf` is pixel-identical to `poster.pdf` at 40 dpi (max diff 0).
- All three QR codes decode to their URLs (OpenCV, 60 dpi), and each URL returned HTTP 200 on 2026-10-30.

## Fonts

All are SIL OFL fonts, copied from `../skills-are-binaries-receipt/fonts/` and embedded. Typst runs with `ignore_system_fonts=True`.

| Font | Used for |
| - | - |
| Archivo Black | hero, stamps |
| IBM Plex Mono (Regular, SemiBold, Bold) | receipts, footnotes, authors, refs |
| Kalam (Regular, Bold) | pen notes, ruler labels |

## Sources for every fact

- **Run dir:** `~/projects/foundry-runs/dengueseq-denv3/dengueseq-denv3-galaxy`, HEAD `6737777`.
- **Foundry:** `galaxyproject/foundry` origin/main **`eb2de3f1`** (2026-10-30).
- **[1]:** Baker et al. 2026, bioRxiv doi:10.64898/2026.10.26.761864, as summarised in `../../research/r7-biorxiv-preprint.md`.

| On the poster | Source |
| - | - |
| pipeline `workflow-brief-to-galaxy`, run `dengueseq-denv3-galaxy`, 2026-10-20 22:11 → 00:34 UTC, status complete (COMPLETE stamp) | `foundry-run.yml`: `pipeline`, `run_slug`, `started_at`, `finished_at`, `status` |
| 11 lines: phase number, skill, ×7, `branch test-data-resolution → find-test-data` | `foundry-run.yml` `phases[]`: `skill`; `pattern`/`selected` for n 6; `iterations` for n 5 |
| DONE times 22:17 … 00:34 | max artifact `at` per phase in `foundry-run.yml`, cross-checked against the `phase N` commit times in `git log` (−04:00), all within 1 s |
| TOTAL 2h 23m; ruler bands 55 min (phase 5) and 33 min (phase 10) | the same timestamps: 143.5 min in all; 22:44:56 → 23:39:52; 00:00:03 → 00:33:09 |
| `tool state 7 ok · connections valid` | `galaxy-workflow-validation-result.json` `summary`, from the run's `gxwf validate --json --connections --strict` (cli 1.14.0). My replay with gxwf **1.15.0** agrees: 7 ok / 0 fail / 0 skip, connections 12 ok / 0 invalid. |
| `planemo 1 test · 0 failures` | `workflow-test-result.json` `planemo.summary`, which matches `tool_test_output.json` `summary` (planemo 0.75.47, exit 0) |
| "every line is a cast skill with a build receipt" | `casts/claude/skills/<skill>/_provenance.json` exists for all 11 bill skills, including `find-test-data` (asserted in `extract.py`) |
| 7 pins: tool, `@changeset`, owner/repo, version | `galaxy-tool-pin.json` at each phase-5 commit (`git log -- galaxy-tool-pin.json`): `80de2f3 3556725 658af4e daf2928 d366ab3 07062a2 b82fa5e`. Each pin's `status` is `hit`, and each changeset equals `galaxy-workflow.gxwf.yml` `tool_shed_repository.changeset_revision` (asserted). I used the per-commit file because `galaxy-tool-summaries/` has no `.pin.json` for `bwa_mem`. |
| "pinned by discover-shed-tool" | `advance-galaxy-draft-step` SKILL.md step 2 runs discover-shed-tool for Tool Shed wrappers. `discover-shed-tool/_verify.json` declares the output artifact `galaxy-tool-pin` / `galaxy-tool-pin.json`, which is the file the run wrote. |
| "the skill looked up" (note 3) | each pin's `rationale`, which cites `gxwf tool-search`, `tool-versions` and `tool-revisions` |
| "Planemo installed exactly these seven" | `workflow-test-result.json` `galaxy.tool_staging`: "planemo --shed_install … installed 7 Tool Shed repos at workflow-pinned changesets", together with the pin = workflow changeset assert above |
| BUILD RECEIPT: SKILL.md `discover-shed-tool`, cast 2026-09-13, MOLD rev 5 · `05c99cba`, 5 refs (1 upfront · 4 on demand), VERIFY `galaxy-tool-pin.json` schema `c0940fc0` | `discover-shed-tool/_provenance.json` (`mold`, `cast_at`, `refs[].load`) and `_verify.json` (`--schema-sha256`), at `eb2de3f1` |
| NEVER HAND-EDITED | carried from the keeper (`foundry-qa.mdx:790`, `foundry-pattern.mdx:172`) |
| (no longer printed; see Applied review) run → Mold revision link | `foundry-feedback.ledger.yml` entry `discovery-alternates-require-full-pin`: `observed_in` is discover-shed-tool revision 5, `content_hash 05c99cba…`, and `subject` is schema `galaxy-tool-discovery`, `content_hash c0940fc0…`. `extract.py` asserts these equal the printed cast's Mold revision, content hash and `_verify.json` schema hash. The wording says "Mold revision", not "build", because the cast was recompiled after the run (see below). |
| "Skills are guidance, not enforcement" | [1] p.16 (R7 table row F5) |
| "the same kind of connection check caught an agent's `tximport` miswiring before it ran" | [1] p.4, pp.15–16, Fig S3A (R7 §6 item 2). R7 tags the link to gxwf as inference, so the poster says "same kind of" and not "the same check". |

## What the pin replay found (not printed; please read)

I replayed the skill's own VERIFY over all seven committed pins. I used `foundry validate-galaxy-tool-discovery --schema-sha256 c0940fc0…` from `@galaxy-foundry/gxwf-foundry` 0.4.0, which bundles the same schema hash.

- **5 are valid.**
- **2 are rejected (exit 3):**
  - `d366ab3` bedtools_genomecoveragebed;
  - `b82fa5e` tp_sed_tool, which is the `galaxy-tool-pin.json` now in the run dir.

Both fail the same way: `alternates[]` items are written as short notes (owner, repo, tool_id, rationale), not as full ToolCandidates. That is the friction the run itself logged against this Mold revision, in the still-open feedback entry `discovery-alternates-require-full-pin`. The changesets themselves are right: Planemo installed them and the test passed.

**The printed cast is not byte-for-byte the cast the run loaded.**
- At run start (2026-10-20 22:11 UTC), the cast dir was at `c048a0c6`. Same Mold rev 5 / `05c99cba` (asserted), same `cast_at` 2026-09-13.
- Its `_verify.json` ran `validate-galaxy-tool-discovery {artifact_path}`, without the `--schema-sha256` pin.
- `e104dfde` (2026-10-23, "Pin cast bundles to the schema their validator carries") added the pin, and `f3cbdd24` (2026-10-27) bumped gxwf to `^1.15.0`.
- The stub prints the cast at `eb2de3f1` and says so in its header (`@ eb2de3f1`). The schema hash it prints is the same one the run's ledger recorded.
- `receipt.json` `stub.cast_at_run_start` keeps the run-time version.

So the poster **does not** claim that every pin passed VERIFY.
- The outline's thesis clause "each pin it made is checked against the skill's own schema" was cut.
- Note 2 says the receipt "names the file it writes", and nothing about the schema the pin must pass.

See open question 1.

## `[[ASK]]` slots

- **None.** Anton's nf-core work has no place in this outline, which says `[[ASK]]` (none), so it is left out entirely. `SHOW_ASK` does not apply, so there is no no-ASK check render.
- **`[[QR: live results]]`** is the only placeholder: 4.2 in, top right, always rendered. Once the URL exists:
  1. add it to `LINKS` in `make_qr.py`;
  2. replace the `placeholder(...)` in the header with `image("assets/qr-live.svg", width: live-w)`.

**QR codes:**
- The Foundry: `https://galaxyproject.github.io/foundry/`
- Install the skills: `https://galaxyproject.github.io/foundry/usage/`
- Preprint: `https://doi.org/10.64898/2026.10.26.761864`

All are vector (segno), with 2.6–2.7 in of printed code. There is no lightning-talk QR.

## Departures from the outline

- **Thesis pen line, and note 2's "was checked against".** Cut or narrowed because of the pin replay above.
- **Note 2 footnote** (removed in review). Added the run's own feedback-ledger fact. It is the most direct real link in the chain from run to skill revision: the ledger cites `05c99cba` and `c0940fc0`, the same hashes the stub prints. I left out the ledger's other fact, that the schema refused the first pin draft: printed beside the seven pins, it would imply the gate ran on them, and two fail it (below).
- **Note 4.**
  - "gxwf and Planemo wrote those subtotals" became "the subtotals are gxwf's and Planemo's verdicts". The numbers sit in result JSON the skills wrote from those programs' output.
  - "the same check on line 9" became "the same kind of connection check" (see Sources).
- **Note 5.** The body became "Every slip here is printed from a real file people can read. Keep the receipts." This lands the pitch's last clause and stays true of all three slips. The outline's "The format the skills write…" doesn't fit the build receipt, which the cast step writes, not a skill.
- **Ledger extras.**
  - The header's "status complete" became a COMPLETE stamp.
  - I added a `TOTAL 11 skills · 2h 23m` line and a TEAR HERE rule before the footer.
  - The column header is `PHASE · SKILL … DONE`, because the times are phase-end times.
- **Pins.** They are numbered 1–7 in iteration order, to tie them to ×7. Each takes two lines because `owner/tool version @changeset` doesn't fit the stub on one line at ≥ 30 pt.
- **Ruler.** Only bands 5 and 10 and the endpoints are labelled; per-phase labels would collide (phase 9 is 1.4 min). Band 10 is hatched for greyscale.
- **Layout.** Note 3 sits above tear-off 1 and note 2 below the build stub; the sketch had both under the stubs. Note 5 sits bottom left, beside the QR row.
- **Sources line.** It prints with the reference, as exempt reference text.

## Open questions

1. **Pin replay, 5 valid and 2 rejected.**
   - Should the poster stay silent on it, as now, or show it as a "rails" receipt ("the schema still rejects 2 of 7 committed pins; the run filed why")?
   - Or should the friction be fixed upstream and the run re-pinned before print?
   - The feedback ledger also records that the schema refused the first pin draft and the agent fixed it. That is a real "rails" moment, kept off the print for the reason above. Want it back with the 5-of-7 context?
   - Should the stub print the cast as it stood at run time (`c048a0c6`, no schema pin in VERIFY) instead of today's `eb2de3f1`? The outline asked for `eb2de3f1`.
2. **Kicker.** It stays "GALAXY WORKFLOW FOUNDRY". Should it carry the pitch instead ("Build better skills · build better workflows · keep the receipts")? Right now the pitch only appears in note 5.
3. **COMPLETE stamp** on the bill: OK, or too much red next to NEVER HAND-EDITED?
4. **"Install the skills"** QR → `/foundry/usage/`: is that the right target?
5. **Re-check at print:**
   - `./build.sh` after a foundry fetch: is `discover-shed-tool` still rev 5 / `05c99cba`? If not, the feedback-ledger assert fails by design, and note 2's footnote needs a rewrite.
   - The QR URLs.
6. **Shop:** print edge-to-edge on the trim, or use `poster-bleed.pdf`?

## Applied review

This section applies `REVIEW.md`. All nine items were applied and none were skipped. The build is green: every guard and audit passes, there are no symlinks and no `node_modules`, and I looked at the preview again.

| # | Item | Status |
| - | - | - |
| 1 | `hl()` top edge `ascender` → `x-height`, so highlighter bars no longer clip descenders (notes 1, 2, 4, 5; this also lowers the hero highlight) | applied |
| 2 | The ×7 arrow now lands left of the TOOL SHED PINS header (`sx + 0.45in, s1y + 0.4in`, bend 0.12) | applied |
| 3 | Note 2 footnote (the feedback-ledger Mold-revision line) deleted: it duplicated the stub's MOLD rev line and was outline drift. The fact stays in `receipt.json` and in the Sources table above. | applied |
| 4 | Stub 1 subtitle "one per line-5 iteration" deleted | applied |
| 5 | The date row now prints `22:11 → 10-21 00:34 UTC`; `finish_md` is derived from `finished_at` in `extract.py` | applied |
| 6 | Note 4: "run programs" → "are judged by programs, not prompts" | applied |
| 7 | Ruler band labels moved up 0.15 in, so "33 min" clears "00:34 UTC" | applied |
| 8 | Note 2 arrow `ady` 0.45 in → 0 in, so the tail clears the badge | applied |
| 9 | Subtotal "planemo" → "Planemo", for one spelling | applied |

| 10 | (Coordinator follow-up) Note 2: "names the schema its pin must pass" → "names the file it writes". The schema clause sat beside the PINS stub and implied the pins passed; only 5 of 7 do. The VERIFY row stays, because it is the printed link to `galaxy-tool-pin.json`. | applied |

**Body words: 321** (was 338).
