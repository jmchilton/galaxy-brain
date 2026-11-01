# receipt-vision

Design agent #4. Concept B (run receipt / lab ledger), Visionary stance.

The poster is a sheet of lab-notebook graph paper with one long DengueSeq run receipt taped to it. The receipt is rendered from the real run files. Handwritten margin notes explain one idea each (dossier §3), and each note has an arrow to the receipt line it explains:

1. A knowledge problem: the source line.
2. A compiled wiki: the station list and its Mold hashes.
3. Native, pinned: the Tool Shed pins.
4. The tools decide: the CHECKS block and its stamps, plus the Orbit 0/15 result.
5. Gaps are output: the tear-off open-requirements ledger.
6. Fix the knowledge, recompile: a "REPRINT" stub for `73af1f62` and PR #701.
7. Two provenances: build at the top of the receipt, execution at the bottom.

The hero lines are the title and the handwritten "Agent-built. Tool-verified. Open gaps written down." (Not "every gap": the ledger holds only the gaps this run found.)

## Rebuild

```sh
./build.sh
```

The script does four things:

1. Re-extracts `receipt.json` from `~/projects/foundry-runs/dengueseq-denv3`, if that directory exists (override with `FOUNDRY_RUNS=...`). If it doesn't exist, the committed `receipt.json` is used.
2. Regenerates the vector QR SVGs in `assets/`.
3. Compiles `poster.typ` with Typst 0.15.0 (the `typst` PyPI package, run through `uvx`) into `poster.pdf` (44 × 44 in) and `preview.png` (about 1500 px).
4. Writes `preview-gray.png` with `pdftoppm -gray`, which is the greyscale check.

It needs `uv`, and `pdftoppm` (poppler) only for the greyscale preview. Nothing is installed globally, and the uv cache stays in its default location outside the vault.

**To edit the text:** all prose is in `poster.typ`.
- Margin notes are the `#note(...)` calls in the "left column" and "right column" sections.
- Receipt lines are in the block after `// ---------- receipt shadow + body`.
- Positions are absolute inches. Arrows find their receipt line through `#anchor("a-...")` labels, so they follow the receipt automatically.

## Fonts

All are SIL OFL fonts from `github.com/google/fonts` and stored as TTFs in `fonts/`. `pdffonts` shows all of them embedded.

| Font | Used for |
| - | - |
| Archivo Black | title, stamps |
| IBM Plex Mono (Regular, SemiBold, Bold, Italic) | receipt, authors |
| Kalam (Regular, Bold) | handwritten notes |

## Data sources

| On the poster | Source |
| - | - |
| Stations, times, assembly hashes | `dengueseq-denv3/dengueseq-denv3-{brief,galaxy}/foundry-run.yml` |
| Mold revision and hash per station; "36 wiki sources" (distinct `ref`s across the 13 skills) | `~/projects/foundry-runs/_plugin/f275059e/casts/claude/skills/*/_provenance.json`. Snapshot `f275059e` is named in the run's `_logs/*.jsonl`; it is foundry commit f275059e, merge of #688, 2026-10-19. `foundry-skills 0.2.0` comes from that snapshot's `plugin.json`. |
| Tool Shed pins (7) | `galaxy-workflow.gxwf.yml` |
| gxwf PASS (tool_state 7/7, connections valid) | `galaxy-workflow-validation-result.json` |
| planemo PASS (1 test on SRR25366733, 0 failures, 7/7 jobs, planemo 0.75.47, Galaxy `b18269a1`) | `workflow-test-result.json`. The secondary `denv3_test` was not run, so the poster says "1 test" and doesn't claim "all tests". |
| 5 open (2 cuts), 14 resolved; the 10,707 / 1 of 10,707 / +6 of 352 figures | `open-requirements.ledger.yml` (entries and decisions) |
| Human review: brief `e52aca4e`, 10 proposals, 1 edited | `dengueseq-denv3/review.md` |
| Source and code pin, test sample | `dengueseq-denv3/source-selection.md`, `workflow-brief.md` |
| Recompile stub: `discover-shed-tool` `256e3861 → 2e5fa1f8` | `git show 73af1f62` in foundry (`_provenance.json` diff) |
| PR #701: 1 note → 8 skills | dossier |
| Corpus tally (420 / 56 / 69 / 51 / 13) | dossier §4, `origin/main` 2026-10-24, footnoted on the poster |
| 0 of 15; "Skills are guidance, not enforcement." | preprint p.18 and p.16, checked with `pdftotext` |
| *A. fumigatus*, about 60 steps, fold changes agree | dossier; preprint p.19 and Fig 6A |

## Left out on purpose (Visionary stance)

- **sarek, EGAPx, CWL and the gxwf zero-step blind spot:** weak or partial.
- **The expert-spec MRSA/ATAC workflows as results:** MRSA appears only as the recompile trigger, labelled "expert spec".
- **Workflow / invocation IDs:** they came from a disposable Galaxy.
- **The secondary test fixture.**
- **Rates of any kind.**

The receipt footer says "Not on it: a replication of the paper's results", and lists the run files it was printed from (on-poster attribution for non-dossier numbers). The ledger figures (10,707, 1 of 10,707, +6 of 352) come from the same files.

## `[[ASK]]` slots

- **One yellow sticky note**, right column: "Supporting case with ground truth: nf-core/rnaseq & atacseq translations, Foundry-validated." It contains no numbers. To drop it, set `#let show-ask = false` at the top of `poster.typ`.
- **`[[QR: live results]]`**, bottom right: a dashed placeholder box. Swap in a segno SVG once the URL exists, by adding it to `make_qr.py` and replacing the `rect(...)` in `poster.typ`.

## Open questions

1. Title: I kept "From Papers and Conversations to …". The only conversation-like evidence shown is the human brief review. Is "Papers and Expert Specifications" more accurate?
2. The Karpathy citation is given as "llm-wiki.md (GitHub gist, 2026)". Is that OK, or should the eponym be dropped (see research r1 §7)?
3. Re-check the corpus tally against `origin/main` before printing.
4. Keep the `[[ASK]]` sticky, or drop it for a purer single-receipt poster?
