# gxwf: Galaxy Workflows, Typed, Not Guessed

A standalone 44 × 44 in printed vector poster about **gxwf**, the Galaxy workflow CLI from `@galaxy-tool-util/cli`. One claim: gxwf type-checks tool calls and connections in a Galaxy workflow before any job runs. The evidence is a real gxwf receipt over IWC rnaseq-pe, with planted typos and a one-letter repair. Galaxy style (`../../biodata_poster/designs/STYLE_GALAXY.md`).

Copied from `../../biodata_poster/designs/typed-not-guessed-receipt-r4-galaxy/` (left untouched). That poster's README has the full round-4/5 design history, font table and per-fact source table; the facts carried over here are unchanged.

**Format (assumed).** 44 × 44 in trim (`poster.pdf`) plus `poster-bleed.pdf` with 0.125 in bleed. Confirm with the printer.

## What changed from SRC

- **Title.** "Galaxy Workflows: Typed, Not Guessed" → **"gxwf: Galaxy Workflows, Typed, Not Guessed"**. The author/affiliation lines are replaced by a descriptor ("The Galaxy workflow command line: validate, lint, convert, clean") and the docs URL, so the masthead has no hole. The Galaxy logo moves into the old live-results slot. A new `measure()` gate fails the build if the title block reaches the logo or the gold bar.
- **Thesis.** "Galaxy can type-check each scientific tool call…" → "gxwf type-checks **tool calls and connections** before any job runs." No "every"/"each" in front of connections, because the receipt's connection check is top level only (`jq` over `data/validate.json`: 30 step results, none inside a subworkflow).
- **Note 1** ends "In Galaxy, gxwf can type each tool call and each connection."
- **Note 5, "One validator, everywhere"** reworded to what the repos support (see below): the CLI and the gxwf-web browser app run one TypeScript core; the Galaxy Workflows VS Code extension's main branch reuses its tool-state checks.
- **Note 6** "Rails, not reminders" (Orbit) → **"Runs in CI"**: no Python, no Galaxy server; fill the tool cache, then `validate-tree` checks a whole repo's tool state, as for all of IWC on the receipt (that run was `galaxy-tool-cache populate-workflow` per file, then `validate-tree`); any failure exits non-zero; JSON or Markdown report. Its arrow now points at ALL OF IWC (was the INVALID line). Capability only: no CI job running gxwf was found in any repo checked.
- **GET STARTED** leads with gxwf: `npm install -g @galaxy-tool-util/cli`, `galaxy-tool-cache populate-workflow my-wf.gxwf.yml` (validation needs a populated cache), `gxwf validate my-wf.gxwf.yml --connections --strict`, `gxwf validate-tree workflows/ --strict-state` (labelled "tool state"; `validate-tree` has no `--connections`; `--strict-state` turns uncached/skipped tools into failures so a cold CI cache can't pass green), `gxwf convert my-wf.ga --to format2`. The `--strict` example uses a Format 2 file because legacy `.ga` fails `--strict-encoding` (`data/strict-encoding.txt`, exit 2).
- **Bottom band** "Where gxwf sits in a Galaxy Workflow Foundry run" → **"Where gxwf fits"**: one paragraph plus a draft → (check `gxwf validate` ⇄ fix, "until it passes, under a second a lap") → test `validate-tests · Planemo` loop, each station with a one-line caption ("each tool call's state", not "every", as in SRC's wording decision; "under a second on a warm cache" to match the receipt). The Foundry is one line ("One example…"). The "types aren't biology" caveat stays as a paraphrase with no citation.
- **References** card: preprint line gone; "GCC 2026 slides" → "Galaxy workflow editor; arrows added"; run date gone; source repo added.
- **Timeless.** `date` removed from `extract.py`, `rerun_gxwf.sh` and `data/run-meta.txt`, so no rebuild can bring it back. `set document(date: none)` strips the PDF creation date. Built twice; no `2026-`/`10-2x` in the PDF text, metadata or the grepped sources.
- **Build.** Temp/deps root is `/private/tmp/claude-503/gxwf-gxwf-typed-not-guessed-deps/` (build.sh, render.py, rerun_gxwf.sh). `audit.py` label updated. Word count 591 → 631 (budget 700).
- **Visual.** Same Galaxy tokens, receipt, stamps and tape. The band stations are larger (48 pt names, 30 pt captions) and read at 6 ft.

## Dropped

- Author list and affiliations (no `set document(author:)` or meta.json existed).
- All QR codes (Foundry, Install, Preprint, gxwf docs) and the `[[QR: live results]]` tile: `make_qr.py`, its build step, `assets/qr-*.svg`, `assets/qr.json`, `qr-tile`, `placeholder`, `qr-w` and the QR size gate.
- Claude Code / Codex plugin-install lines.
- Orbit study, "Rails, not reminders", "guidance, not enforcement (p.16)", "Orbit preprint p.4", the Baker et al. reference.
- The Foundry route diagram (paper/Nextflow → brief → interface → … → debug) and its paragraph about the wiki and skills.
- THE WIKI counts box (420 notes / 56 Molds / 69 skills, dated).
- The run date ("run 2026-10-30") and the "GCC 2026" event label.

## Note 5 check (repos fetched; read from `origin/main`)

- **CLI**: `galaxy-tool-util-ts` `packages/cli` (bin `gxwf`) depends on `schema`, `core`, `connection-validation`. npm `@galaxy-tool-util/cli` is 1.15.0, the version on the receipt.
- **Browser**: TS `@galaxy-tool-util/gxwf-web` (npm 1.15.0, not private) ships `gxwf-ui`, which can run `connection-validation` in the browser (`useClientEdgeAnnotations`; docs/packages/gxwf-ui.md).
- **VS Code**: `davelopez/galaxy-workflows-vscode` main imports `@galaxy-tool-util/core`/`schema`/`search` ^1.9.0 for tool-state validation (`validateFormat2StepStateStrict` etc.). Its connection service uses only normalisation helpers, so the poster claims tool-state checks only. **Not released**: the latest tag and Open VSX version are 0.5.0 (2024), before the integration.
- **CI**: supported by the CLI (exit codes, tree commands use the worst exit, `--json`, `--report-markdown`, offline `--tool-schema-dir`; docs/guide/workflow-operations.md, workflow-validation.md). Moved to note 6.
- **`~/projects/repositories/gxwf-web` is a different engine**: a Python FastAPI app over Galaxy's Python `workflow_state`, pinned to local dev worktrees. It is not evidence for "one core" and is not cited on the poster.

## Flagged (not decided)

- **Counts that will drift:** "ALL OF IWC 133 workflows · 3,217" (IWC `23ccd9915`; IWC `origin/main` has already moved on, not re-run) and note 3's "typed schemas for 10,000+ community tools".
- **Pinned version string:** "gxwf 1.15.0" on the receipt and references (current npm latest, today).

## Open questions

1. VS Code in note 5 is main-branch only (unreleased). Keep it, or wait for an extension release and drop "main branch"?
2. Docs URL is `jmchilton.github.io/galaxy-tool-util-ts` (HTTP 200). Is there a more neutral home planned?
3. Keep the pinned 1.15.0 and the IWC counts as dated evidence, or re-run before print?
4. Thesis has no quantifier. Want "each tool call" back, at the cost of the connections wording?
5. The descriptor lists validate, lint, convert, clean. Add "test-check" (`validate-tests`)?

## Final-grep hits kept

`grep -rniE "chilton|nekrutenko|orbit|preprint|bioRxiv|live results|2026-|cshl|QR"` over `*.typ *.py *.json *.sh` leaves two hits, both deliberate: `poster.typ` `docs-url` (`jmchilton.github.io/galaxy-tool-util-ts`, the verified docs site) and the references' `github.com/jmchilton/galaxy-tool-util-ts` (the source repo). These are URLs, not an author credit.

## Rebuild

```sh
./build.sh                   # offline: data/ -> receipt.json -> PDFs + preview -> audits -> checks/
SKIP_TREE=1 ./rerun_gxwf.sh  # optional: re-run gxwf 1.15.0 and refresh data/ (drop SKIP_TREE to redo all of IWC)
```

- `extract.py` turns `data/` into `receipt.json` and asserts every printed number and message against the saved gxwf output.
- `render.py` runs Typst 0.15.0 (`uvx --from typst==0.15.0`), vendored fonts only, and writes `poster.pdf`, `poster-bleed.pdf`, `preview.png` (1496 px) and a word-count PDF.
- `audit.py` fails on non-vendored or unembedded fonts, text under 24 pt, or a body over 700 words. The only 24–28 pt spans are the references.
- Gates in `poster.typ`: receipt natural height, left column, right column, band, masthead title vs. logo and gold bar, and the 1 in safe zone.
- Rasters below the 24 pt floor, as in SRC: the nf-core entrance crop and the Galaxy editor-graph crop.

**Checks on the final render.** Built twice; all gates and audits pass.
- 6 ft (`checks/preview-25.png`): title, thesis, receipt totals, WALL TIME, stamps, band head and stations read.
- 3 ft (100 ppi crops of the thesis, notes 5–7 and the band head): new highlights ("exits non-zero", "Only a workflow that passes moves on") start at x-height and clear the line above; the thesis passes cap-height as in SRC. No holes where the QR codes, live-results tile, authors and wiki box were.
- Greyscale (`checks/preview-gray.png`): gates go near-black, stamps mid-grey with double borders, highlights near-white, as STYLE_GALAXY warns.
- Tight spot: note 7's last line sits about 0.3 in above GET STARTED's tape.

**To edit the copy:** title, descriptor and docs URL are at the top of `poster.typ`; the receipt is `receipt-body`; notes are the `#note(...)` calls; GET STARTED is `start-slip`; the band is `band-body`.
