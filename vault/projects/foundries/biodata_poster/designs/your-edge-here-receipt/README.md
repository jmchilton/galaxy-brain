# your-edge-here-receipt

Pitch `your-edge-here` (`../PITCHES.md`, pitch 4) in the visual language of the Visionary Run Receipt (`../receipt-vision-v2/`): graph paper, thermal-print mono, tape, stamps, torn edges and pen notes. The content and structure are new.

## The idea

A passer-by should leave with one sentence, the thesis on the taped slip (Archivo Black, 138 pt): **"Models already know the textbook. Build a Foundry for your field's edge."** Under it, one typed line says what a Foundry is.

The giant receipt is the one data visual. It is a **shared-core receipt** for `foundry-lib`, rendered from each Foundry's real `package.json`:

- one row per foundry-lib package (12);
- one column per Foundry: Galaxy Workflow, Statistical Genomics, TDA Bioinformatics;
- `IN USE` totals of 9 / 9 / 12;
- a fourth column, **YOUR FIELD**, of empty dashed boxes and a `?`.

Below the matrix, **MEANING OF CORRECT · KEPT LOCAL** gives each Foundry's verdict line, taken from its rings diagram, and ends with `YOUR FOUNDRY ... you decide`. The receipt footer prints the pattern's rule, "Share converged mechanics. Keep domain meaning local."

Pen notes carry the ideas, one each:

| Note | Idea | Points at |
| - | - | - |
| circle sketch + "The model is the circle." | inside the circle vs. the edge | (self-contained, top left) |
| "Abstraction ahead of evidence." | derive abstractions from a second application; fresh context broke it | the package rows |
| "I seeded the Foundry wrong." | four jobs at once; "a better skill mill is still a skill mill"; stepped back to a new repo | the Statistical Genomics verdict line |
| "your edge here" | the call to action | the YOUR FIELD column |
| "Hardening leaves receipts." + tear-off stub | upstream fixes, recipes, honest replication verdicts (stamps), citation audit | (TDA stub, right) |
| "Installing is a measurement." | Biopixi L0–L4 | (right) |

No rate and no success claim appears. The three replication verdicts are stamped verbatim and are never totalled.

## Rebuild

```sh
./build.sh
```

The script runs these steps:

1. **Ledger.** `extract.py` reads `package.json` files read-only with `git show origin/main:…` from `~/projects/repositories/{foundry,statistical-genomics-foundry,topological-data-analysis-bioinformatics-foundry,foundry-lib}`, or from `FOUNDRY_REPOS=…`, and writes `ledger.json`. If the repos are missing, the committed JSON is used. Run `git fetch` in those repos first to refresh.
2. **QR codes.** `make_qr.py` (segno) writes vector SVGs and `assets/qr.json`.
3. **Render.** `render.py` runs Typst 0.15.0 via `uvx --from typst==0.15.0` and writes `poster.pdf`, `poster-bleed.pdf` (`bleed=1`), `preview.png` and a word-count PDF (`count=1`) in `/private/tmp/claude-503/your-edge-here-receipt-deps/build/`, or in `POSTER_TMP`.
4. **Audit.** `audit.py` (PyMuPDF) fails the build on any of these:
   - a font outside the 7 vendored faces;
   - an unembedded font;
   - text under 24 pt;
   - more than **400 body words** in the count PDF;
   - body text under 28 pt in the count PDF.
5. **Checks.** `pdftoppm` writes the `checks/` PNGs.

Typst-side gates in `poster.typ` fail the build on:

- receipt overflow;
- any pen note, stub, QR block or reference block overlapping another or running inside the 1 in safe margin at the bottom;
- a thesis line wider than the slip;
- a QR code under 2.5 in.

The build needs `uv` and poppler. There is no npm and no `node_modules`.

**To edit:**
- The title and authors are at the top of `poster.typ`.
- The thesis is in the `thesis slip` block.
- Pen notes are the `#put(…, note-body(…))` calls.
- Receipt lines are in `#slip-at(rx, ry, …)`.

## Deliverables

- `poster.pdf`: 44 × 44 in, vector, fonts embedded.
- `poster-bleed.pdf`: 44.25 in. Only the paper and grid extend into the bleed. A 40 dpi pixel diff against `poster.pdf`, after cropping the bleed, is 0.
- `preview.png`: 1496 px.
- `checks/`:
  - `preview-25.png` (1056 px);
  - `preview-gray.png`;
  - `thumb-200.png`.

  There is no SHOW_ASK=0 render because the poster has no `[[ASK]]` slot (see below).

## Body word count

The body has **304 words**, checked by the build guard against a cap of 400. The guard counts every token with a letter or digit in the `count=1` render. That render hides the title, subtitle, author block, references and QR captions. The live-results placeholder text is still counted, so the count is conservative.

## Fonts

All fonts are SIL OFL from `github.com/google/fonts`, vendored in `fonts/` (copied from `receipt-vision-v2`) and embedded. Typst runs with `ignore_system_fonts=True`.

| Font | Used for |
| - | - |
| Archivo Black | title, thesis, stamps |
| IBM Plex Mono (Regular, SemiBold, Bold, Italic) | receipt, stub, definition line, authors, references |
| Kalam (Regular, Bold) | pen notes and sketch labels |

Kalam has no `→` glyph. The first build fell back to Libertinus for it, and the font gate caught it, so pen notes avoid that arrow.

## Sources for every fact

- `FP` = `~/projects/repositories/jmchiltondotnet/src/content/slides/foundry-pattern.mdx`
- `QA` = `foundry-qa.mdx`
- `1M` = `foundry-pattern-in-one-minute.mdx`

All three are at origin/main `ac69980`.

| On the poster | Source |
| - | - |
| Thesis | pitch 4 thesis (`../PITCHES.md`); FP:332-337 |
| "A Foundry: people maintain a domain's knowledge base; agents receive small, frozen skills compiled from it." | 1M:80 ("People maintain the source. Agents receive small, frozen artifacts."), with the KB/casting analogy on 1M slides 2–3 |
| Circle sketch: "the textbook", "a frontier model writes this well", "the edge: progress happens here" | FP:337, FP:373; `ASSETS/foundry-pattern/circle-sorting.svg`. The concept follows Matt Might's *Illustrated guide to a Ph.D.* (CC BY-NC 2.5), credited on the poster. It is redrawn, not reproduced. |
| "The model is the circle." … "push that edge and make it executable" | FP:387, FP:460 |
| The 12 packages; 9 / 9 / 12; only TDA uses `audit-base`, `audit-citations`, `source-note` | `extract.py` parses every `package.json` at origin/main and collects the `@galaxy-foundry/*` keys under `dependencies`, `devDependencies` and `peerDependencies`. Package `name` fields are ignored. It then intersects those names with the `packages/` directories of foundry-lib. The repo states, fetched 2026-10-30, are listed below this table. |
| Meaning of correct, per Foundry | the `MEANING OF CORRECT` box of each `ASSETS/foundry-pattern/foundry-rings-*.svg` |
| "Share converged mechanics. Keep domain meaning local." | FP:720 |
| "Not a turnkey solution: a pattern for pushing into a domain with agents." | FP:1570-1577 |
| Abstraction note | FP:1138 (the rule), FP:1165 (fresh sessions), FP:1363 (foundry-lib extracted early), FP:1371 |
| Seeded-wrong note | FP:1211, FP:1232 (four jobs), FP:1288, FP:1312 and pitch 4 (stepped back into the TDA repository) |
| "Hardening leaves receipts." | FP:1443 |
| petls-pytorch#1 merged; TopoQA#1 and PETLS#2 filed | FP:1449-1460. Re-checked with `gh` on 2026-10-30: petls-pytorch#1 MERGED 2026-08-05; TopoQA#1 OPEN; PETLS#2 OPEN. |
| "17 local recipes; 1 merged to conda-forge" | 17 = `content/recipes/*.md` at TDA `e7fc4fa` (FP:1464 agrees). The slide says staged-recipes#34367 was "submitted"; `gh pr view 34367 -R conda-forge/staged-recipes` on 2026-10-30 shows it **MERGED 2026-09-11** as "Add tadasets 0.2.2", one recipe. Its author is `jmchilton`, and `tadasets` is one of the 17 (`content/recipes/tadasets.md`). The poster says 1, not 12 or 17. |
| Stamps REPRODUCED / PARTIAL / INCONCLUSIVE (TopoQA, TopoMetry, HiPoNet); "with caveats" under TopoQA | FP:1498-1500; pitch 4 fact sheet ("reproduced (with caveats)"). PARTIAL is short for "Partially reproduced". |
| "audited every build; caught 3 DOIs that named other papers" | pitch 4 §6 ("a citation audit runs on every build"); FP:1859 (`pnpm validate` replays the audit offline); FP:1873-1889 (three DOIs, historical) |
| "Installing is a measurement." "Building environments surfaced conflicts reading never would." | QA:897-902 |
| "Biopixi grades each one from L0 to L4." | QA:855, QA:880 |
| QR targets (all returned HTTP 200 on 2026-10-30) | see the QR section below |

The repo states used for the ledger (fetched 2026-10-30):

| Repo | Commit | Date |
| - | - | - |
| galaxyproject/foundry | `eb2de3f1` | 2026-10-30 |
| statistical-genomics-foundry | `908a8c2` | 2026-08-17 |
| bio-topo-foundry | `e7fc4fa` | 2026-08-18 |
| foundry-lib | `7ec6a85` | 2026-09-13 |

The pitch cites foundry `9f83fd55`. The count is the same at the newer commit.

**Deliberately unused**, although sourced:

- the citation-audit counts (104 resolved, 0 mismatched, 98/104 verified, 104 of 122 lines extracted);
- the TDA corpus counts;
- the 1-in-277 and 1-in-20 base rates;
- HiPoNet's 67.27% vs 90.90%;
- the Biopixi ladder graphic and the rings SVGs themselves. Their 10.5 px labels would print under 24 pt at any size that fits, and they have dark fills and drop-shadow transparency, so the poster redraws their content as receipt lines instead.

## Included, and left out

- **In:** the circle and the edge; one core and three applications (the ledger); domain-local meaning of correct; the two failure stories (abstraction ahead of evidence; seeded wrong / skill mill); the TDA hardening receipts; installing is a measurement; the call to action.
- **Out**, per the pitch:
  - Galaxy workflow internals, gxwf/draft-format detail, DengueSeq, the gap ledger and the recompile loop;
  - Orbit, Hokken and 0/15, so there is no preprint QR;
  - corpus counts;
  - named skill repos. The skill-mill quote stays unnamed.

## `[[ASK]]` and placeholder slots

- **No `[[ASK]]` slot.** Anton's foundry-paper work (nf-core rnaseq/atacseq) is Workflow Foundry evidence on textbook pipelines, and this pitch keeps the Workflow Foundry to one column labelled as the first instance. It has no natural place, so it is left out entirely and `SHOW_ASK` is not implemented.
- **`[[QR: live results]]`**, top right, 3.9 in, always rendered. Once the URL exists:
  1. add it to `LINKS` in `make_qr.py`;
  2. replace the `placeholder(...)` in the header with `image("assets/qr-live.svg", width: live-w)`;
  3. add it to the QR gate at the bottom of `poster.typ`.

## QR codes

| Code | Target |
| - | - |
| receipt footer | https://galaxyproject.github.io/foundry-pattern/ |
| Start a Foundry | https://galaxyproject.github.io/foundry-pattern/pattern/standing-up-a-foundry/ |
| Slides | https://jmchilton.net/slides/foundry-pattern/ |

All codes have a 4-module quiet zone on white tiles, with about 3 in of printed code.

## Open questions

1. **Title.** The poster uses the pitch's working title, "A Foundry for Your Field's Edge", with the subtitle "Agents, knowledge, and checks beyond Galaxy". The dossier wants the ecosystem words ("Galaxy Workflows") in the title, which this pitch moves away from. OK?
2. **Statistical Genomics is dormant** (last commit 2026-08-17). It is still shown as a live column with 9/12. Fine, or mark it "stepped back"?
3. **"1 merged to conda-forge."** Should the poster instead say "12 verified" (the deck's figure) next to the merge, or file the remaining recipes before print?
4. **Re-check at print:** TopoQA#1 and PETLS#2 status, and re-run `./build.sh` after `git fetch` for the ledger.
5. **Matt Might credit:** is the redrawn circle-and-dent sketch with a CC BY-NC 2.5 credit line enough, or drop the attribution because it is only the idea?
6. **Shop:** edge-to-edge on the trim, or `poster-bleed.pdf`?
