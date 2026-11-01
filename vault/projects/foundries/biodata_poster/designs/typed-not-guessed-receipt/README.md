# typed-not-guessed-receipt

Pitch `typed-not-guessed` (`../PITCHES.md`, Pitch 1), drawn in the run-receipt visual language of `../receipt-vision-v2/`: graph paper, taped thermal-print slips, rubber stamps, a tear-off and pen notes in the margin.

## The idea

**Thesis (hero, 124 pt):** *Galaxy can type-check each scientific tool call before a single job runs.*

The poster's one data visual is a long receipt printed from a real run of `gxwf validate --connections` over the unmodified IWC `rnaseq-pe.ga`. The receipt has these parts:

- **TOOL CALLS.** One PASS line per tool and version, with a quantity. The four subworkflows get one line each.
- **Totals.** `Tool state: 39 validated, 0 skipped` and `Connections: 57 ok, 0 invalid`.
- **The punchline.** `JOBS RUN ... 0`, then the wall time.
- **ALL OF IWC.** The same tool-state check over all 133 IWC workflows.
- **VOID tear-off.** Two copies of the same file, each with one planted error, and gxwf's real rejection of each.

On the left is the picture the audience already knows: John's nf-core/rnaseq metro map, with its single "validated here" arrow circled. Under it, a short slip reads `pipeline params CHECKED`, `tool flags NOT CHECKED`. The visual argument is length: a short slip against a long receipt. That is where checking happens, not how many parameters there are.

Seven pen notes carry the ideas from the pitch's sections. Each note has an arrow to the receipt line it explains.

1. Most checks stop at the entrance (nf-schema; Snakemake and WDL).
2. Types come from the Tool Shed (10,000+ tools *served*).
3. Connections carry collection algebra (map-over inferred, list into paired rejected).
4. One validator everywhere, under a second.
5. Caught before compute.
6. Format 2 makes the types writable. A card shows the real `.ga` string beside Format 2 YAML.
7. Good for humans, so good for agents. This is the only Foundry line.

A pen tally under note 1 restates the evidence at reading distance: nf-core checks *the entrance*; Galaxy rnaseq-pe checks **39** tool calls and **57** connections.

**Left out, per the pitch:** DengueSeq, the gap ledger and the recompile loop, Molds and casting, Foundry corpus counts, the 0/15 and Hokken results, and the draft format. The only Foundry content is note 7.

**`[[ASK]]` (Anton's nf-core rnaseq/atacseq work):** **left out entirely.** The pitch has no place for it: the poster is about Galaxy's type system, with Foundry work confined to one line. There is no `SHOW_ASK` flag, because there is nothing to hide.

**Placeholder:** `[[QR: live results]]`, 3.8 in, top right, 1 in from the trim. It always renders.

## Rebuild

```sh
./build.sh          # offline: data/ -> receipt.json -> QR -> PDFs + preview -> audits -> checks/
./rerun_gxwf.sh     # optional: re-run gxwf and refresh data/ (network on a cold tool cache)
```

`build.sh` runs these steps:

1. **Extract.** `extract.py` turns the saved gxwf output in `data/` into `receipt.json`. It asserts that the totals match gxwf's own text summary, that quantities sum to 39, that the VOID lines are parsed from the saved JSON errors, and that the `.ga` string really contains `PE_fragments`. The VOID lines are quoted from those messages: the `Incompatible types:` prefix is dropped and both messages are reflowed onto two lines.
2. **QR codes.** `make_qr.py` (segno) writes the vector QR SVGs and `assets/qr.json`.
3. **Render.** `render.py` runs Typst 0.15.0 via `uvx --from typst==0.15.0`, with vendored fonts only. It writes `poster.pdf`, `poster-bleed.pdf` (44.25 in), `preview.png` (1496 px), and a word-count PDF in `/private/tmp/claude-503/typed-not-guessed-receipt/`. That PDF hides the exempt text (title, authors, references, QR captions).
4. **Audit.** `audit.py` (PyMuPDF) fails the build on any of these:
   - a non-vendored or unembedded font;
   - any text under 24 pt;
   - a body over **400 words**, counted from the word-count PDF.

   It also lists every span between 24 and 28 pt. There are four: the three reference lines, one of which wraps.

   The one deliberate exception to the 24 pt floor is the nf-core metro map. It is a raster figure placed at 200 dpi, its station labels print at about 8–10 pt, and the audit can't see them.
5. **Layout gates in `poster.typ`.** The build fails if:
   - the receipt's natural height overflows its slip;
   - either margin column runs past 42.95 in;
   - any QR code is under 2.5 in, quiet zone excluded;
   - a content box sits less than 1 in from the trim (tape and grid excluded).
6. **Checks.** `pdftoppm` writes `checks/preview-25.png` (1056 px, 25%), `checks/preview-gray.png` and `checks/thumb-200.png`. There is no SHOW_ASK render, because there is no ASK slot.

**What the build needs:**
- `uv`, plus poppler for the checks.
- `rerun_gxwf.sh` also needs `node`, `npm`, `jq` and the local IWC clone. It takes about 3 minutes; most of that is populating the tool cache for 133 workflows.
- npm deps and the tool cache go in `/private/tmp/claude-503/typed-not-guessed-receipt-deps`. The script calls the binaries by absolute path, so nothing is symlinked into the vault, and there is no `node_modules` here.

**To edit the copy:**
- The title and authors are at the top of `poster.typ`; the thesis is under `// thesis slip`.
- The receipt is `receipt-body`.
- The notes are the `#note(...)` calls in `left-col` and `right-col`.
- The arrows are in the `// arrows` block, keyed by note id and receipt anchor.

**Body word count: 395 / 400.** This is the PDF token count (tokens containing a letter or digit) with the title, authors, references and QR captions hidden. It includes every receipt line item, so the PASS/QTY texture counts against the budget. `build.sh` prints it on its last line.

## Fonts

All are SIL OFL fonts from `github.com/google/fonts`, vendored in `fonts/` and embedded (the audit checks this):

- Archivo Black: title, thesis, stamps.
- IBM Plex Mono (Regular, SemiBold, Bold): receipt, slips, authors, references.
- Kalam (Regular, Bold): pen notes and the tally.

## Sources for every fact

**Run facts.** The runs are pinned to `@galaxy-tool-util/cli@1.15.0` and IWC `origin/main` `23ccd9915` (2026-10-29). Node v25.6.1, macOS, run on 2026-10-30.

| On the poster | Source |
| - | - |
| Command on the receipt header | `rerun_gxwf.sh` step 1: `gxwf validate rnaseq-pe.ga --connections --strict-structure --strict-state` |
| Tool lines, quantities, 4 subworkflows, `Tool state: 39 validated, 0 skipped` | `data/validate.json` `.results` and `data/validate.txt` (gxwf's text summary, verbatim). 15 top-level tool steps plus 24 inside subworkflows. |
| `Connections: 57 ok, 0 invalid`, "top level" | `data/validate.json` `.connection_report.summary`. The connection report covers the 30 top-level steps only (45 into tool steps + 12 into subworkflow steps), so the receipt says "top level". |
| list:paired → fastp, map over list; 5 map-overs; 13 reductions into MultiQC | `.connection_report.step_results[].connections[]`: `mapping` and `reduction` fields |
| `JOBS RUN 0` | `gxwf validate` is static: it runs no Galaxy jobs |
| "< 1 s, warm cache"; note 4 "under a second" | `data/timing.txt`: 5 runs of 0.57–0.70 s wall, with node start-up, on a warm cache. Matches `vault/papers/gxwf/manuscript.md:162` ("sub-second … once the tool cache is warm"). One full `rerun_gxwf.sh` pass ran during heavy machine load (load average 10–16) and timed 3.8–18 s. The file holds a re-timing of the identical command, run after that pass. |
| ALL OF IWC: 133 workflows, 3,217 validated, 0 failed, 1 skipped | `data/iwc-tree-summary.json`. Command: `galaxy-tool-cache populate-workflow` on each `.ga`, then `gxwf validate-tree workflows/ --json`. This checks tool state only, non-strict; `validate-tree` has no `--connections`. The one skip is in `fragment-based-docking-scoring.ga`: the step's `tool_version` (`2013.1.1_148c5bd1+galaxy0`) disagrees with the version in its `tool_id` (`2013.1-0+galaxy0`). The Tool Shed returns 404 for the requested version, so no schema was cached. The receipt says "version mismatch in file". |
| VOID FAIL, quoted: `Expected "PE_individual" \| "PE_fragments", actual "PE_fragment"` | `data/void-param.json`. The copy had featureCounts `paired_end_status` changed from `PE_fragments` to `PE_fragment` (step 21). This is the first error line; the others are union-branch alternatives. |
| VOID INVALID, quoted from `Incompatible types: output is collection<list>, input expects collection<paired>` | `data/void-conn.json`. The copy had STAR's `singlePaired\|input` rewired from fastp `output_paired_coll` to `out1`. That is 1 root error, which cascades to 7 downstream connections; only the root is printed. |
| Format 2 card: the `.ga` state is one 1,149-character string | `data/featurecounts-tool_state.txt` (step 21's raw `tool_state`). The YAML is an excerpt of the same keys. |
| nf-core: pipeline params checked, tool flags not checked; "Snakemake and WDL also stop at the workflow level" | `manuscript.md:136-145` (Table 1: per-tool invocation validation is No for Nextflow, Snakemake and WDL); `GCC:376-377` |
| Metro map with arrow | `jmchiltondotnet/public/slides/gcc2026/rnaseq-nfcore-arrows.png`: nf-core artwork, credited on the poster. The image's badge shows CC BY with no version, so the poster prints "CC BY". Placed at 200 dpi. |
| Tool Shed serves typed schemas for 10,000+ tools ("served", not "validated") | `GCC:408`; `manuscript.md:5,146`; caveat at `vault/papers/gxwf/tasks.md:98` |
| CLI, VS Code, browser and CI share one core | `manuscript.md` Abstract, and "Consumers of the Validation Core" |
| "Good for humans, so good for agents" | `GCC:602-619` ("Format 2 is good for agents because it is good for humans") |
| The Foundry's agents write Format 2, and gxwf judges it | `DESIGN_DOSSIER.md` §3.5 (gxwf validates); Foundry runs emit Format 2, e.g. `~/projects/foundry-runs/dengueseq-denv3/dengueseq-denv3-galaxy/galaxy-workflow.gxwf.yml` and `demo-qc-trim/.../galaxy-workflow.gxwf.yml` |

**QR targets** (all returned HTTP 200 on 2026-10-30):

| Caption | URL |
| - | - |
| gxwf docs | https://jmchilton.github.io/galaxy-tool-util-ts/ |
| Slides | https://jmchilton.net/slides/gcc2026/ |
| Foundry | https://galaxyproject.github.io/foundry/ |

`https://jmchilton.github.io/galaxy-brain/papers/gxwf/`, the gxwf paper link in the decks, returns **404**, so it is not used.

## Wording decisions

- **"each", not "every".** The pitch's rule: change "every" to "each" if rnaseq-pe or validate-tree over IWC shows nonzero skips. rnaseq-pe has 0 skips, but IWC has 1 (a schema the Tool Shed doesn't serve), so the thesis says "each".
- **Not full `--strict`.** On the unmodified `.ga`, `--strict` exits 2. Its `--strict-encoding` part rejects the legacy JSON-string `tool_state` on all 15 top-level tool steps (`data/strict-encoding.txt`). The receipt therefore prints the command that was actually run: `--strict-structure --strict-state`. After `gxwf clean` (which decodes the strings), full `--strict` passes with the same 39/57 counts; I checked this by hand but don't print it. The encoding rejection is the same point the Format 2 card makes.
- **Collection algebra.** The slide example "list:paired → paired with no flatten" was not re-planted. The poster shows two real cases instead: list:paired → paired input is mapped over (from the passing run), and a flat list → paired input is rejected (from the planted copy).

## Iterations

- **v1.** The title wrapped; there was a 9 in hole in the left column; the receipt's bottom third was empty; arrows crossed; the stamps covered numbers; smart quotes appeared in code; and `--` became an en dash in the command.
- **v2.** I set the title on one line at 120 pt and the receipt in 35 pt type with 1fr section spacing. The pen tally fills the left hole. Notes are re-ordered so the arrows don't cross. Stamps moved onto the dot leaders. Smart quotes are off.
- **Checks on the final render:**
  - At 25%, the thesis, the title, JOBS RUN 0, the stamps and the tally numbers all read.
  - In greyscale, the stamps go dark grey and the highlights light grey, and nothing depends on hue.
  - The bleed PDF diffs to 0 sampled pixels against the trim PDF after cropping.
- **v3 (review).** The title and the live-results QR moved to 1 in from the trim, with a safe-zone gate added. The credit changed from "CC BY 4.0" to "CC BY". The IWC skip was re-labelled after checking its cause.

## Open questions

1. **Title.** "Galaxy Workflows: Typed, Not Guessed" or the pitch's "Galaxy Type-Checks the Science, Not Just the Pipeline"? The pitch title nearly duplicates the thesis. Neither is a dossier option.
2. **IWC corpus line.** Keep "ALL OF IWC 3,217 / 0 / 1"? It is tool state only and non-strict, and corpus results in the manuscript are still `[NUMBER]` (`manuscript.md:86`). Re-run at print.
3. **Format 2 conversion.** `gxwf convert` of rnaseq-pe fails post-validation on `when:` connections (steps 23, 26, 27), and the converted YAML is not strict-valid. This is not on the poster. Is it a gxwf bug worth an issue?
4. **VOID typo.** Keep featureCounts `PE_fragment`, or switch to the slide's MACS2 `BAMX`? A BAMX plant on samtools_view gave noisy union errors.
5. **Shop:** edge-to-edge on the trim, or `poster-bleed.pdf`?
