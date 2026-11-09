# Poster implementation debrief

Built the plan's "Go / No-Go poll" poster for `issue_20900_invocation_validation` at `bcbd2de187c`, in STYLE_GALAXY (the branch name has 33 characters).

## Output

- `poster.html`: the source. HTML + CSS with inline SVG icons, laid out in `in` / `pt` units on a 44 in square page, so the size floors read straight from the CSS. Renders offline from this directory.
- `poster.png`: 4224 × 4224 px (44 in at 96 px/in), rendered with headless Chromium.
- `fonts/`: Atkinson Hyperlegible 400/700, Atkinson Hyperlegible Mono 400/700 and Kalam 400 (latin `woff2` subsets from `@fontsource`), with their OFL texts.
- `assets/`: `galaxy_logo_white.svg` (galaxy-hub, unmodified) and `qr_compare.svg` (compare link, black on white, 4-module quiet zone).
- `SOURCES.md`: a row for every claim.

## Tooling

- Typst wasn't installed, and the rails and board are easier to build as CSS grid and table than as Typst geometry, so I used HTML.
- Renderer: `playwright-core@1.65.0` in a scratch `node_modules`, launched with `executablePath` pointing at the cached `chromium_headless_shell-1248`. The package wants revision 1254, which isn't in the cache.
- The render script (scratch, not in the repo) also reports:
  - text boxes that overflow horizontally;
  - the bottom of `main` against the top of the footer;
  - the smallest computed font size.
- The final render reports no text overflow. The smallest text is 24 pt. `main` ends 0.3 in above the footer.
- I checked a 1000 px downscale (PR-description size) and four full-resolution quadrants by eye.

## Regions as built

1. **Masthead.** Gradient band with the 0.5 in grid and the gold bar. Title "Go / No-Go **before** liftoff" at 140 pt with "before" in gold. Thesis at 44 pt, then the sub-line with the issue, branch and SHA. Logo, plus the #7781 quote in Kalam gold, cited as the comment, not the person.
2. **Region 1, two countdowns.** Two 9-slot rails on one grid, so ignition reads at slot 2 on dev and slot 8 on the branch.
   - A `gx-tape` "side effects" zone runs from ignition to the end of each rail. On dev it covers 8 of 9 slots, on the branch 2.
   - Dev rail: red ✗ nodes with "400/404 · history left" chips, a "200 · unchecked" chip on the queued tick, and the torn debris slip (history-name prefix only).
   - Under the dev rail, a one-line "LAUNCH, THEN SCRUB" callout, labelled as the issue's Sentry report and not reproduced.
   - Branch rail: the GO/NO-GO diamond (key node, gold ring), a NO-GO drop arrow to a double-bordered `gx-ok` stamp, and the Kalam annotation.
3. **Region 2, the poll.** The featured card (gold bar) holds 11 rows from the plan, each with its test name. Dev and branch cells are status chips that carry their words; branch messages are the asserted substrings, set in mono. Both unmeasured cells keep the word "unmeasured", and the sample-sheet dev cell is marked † (from the code).
4. **Region 3, Still GO.** 5 items, each with dev and branch GO chips (dev "not run" for the untyped-collection test), the baseline and head-test footnote, and the "two dev tests changed" note.
5. **Region 4, Inside the gate.**
   - A diff-shaped pseudocode block with real names. The gate line is highlighted on a white ground.
   - The `WORKFLOW_PARAMETER_VALUE_TYPE_CHECKS` table, captioned with its name in its header row.
   - The Kalam `HistoryQuery` annotation.
6. **Region 5, Earlier stages.** 8 mission patches (number, label, merge date), the caption, and the cost chip labelled with `456acb2f1d8`, sqlite and one run.
7. **Footer.** The boundary note (heading in gold on `gx-deep`), references and SHAs, the status line, and the QR.

## Departures from the plan

- **Messages.**
  - The restrictions message is truncated to `parameter: an invalid option ('c')…` and the collection-type one to `collection type 'paired' cannot be used…`. At full length they overflow the column.
  - I dropped dev-side messages entirely. The plan didn't ask for them, and the record doesn't keep dev's message bodies.
- **Deleted-input dev cell.** I added "first case; rest not reached". The test loops over its 3 cases and fails on the first, so dev's result for the purged HDA and the deleted HDCA wasn't measured. The plan's cell implied all three.
- **Sample-sheet dev cell.** The plan sourced it to the Codex triage. Per PITCH_ADVICE that isn't evidence, so I re-sourced it to dev's code (sample-sheet metadata is validated in `derefence_collection_to_model`, which runs after the history commit) and marked it † "read from dev's code, not run".
- **"No invocation" vs "clean".** The plan's single "clean" word would overclaim for tests that use an existing `history_id`, because they assert only that no invocation was created. Branch chips say exactly what each test asserts: "no invocation", or "no history · no invocation". The restrictions row asserts neither, so its chip is a bare "400".
- **"new history" dropped from request cells.** The "history left" and "no history" chips appear only on rows whose test asked for a new history, so the chips carry it. Dropping it saved a line per row.
- **Console names shortened** to one line ("Batch validators", "Dataset for collection", "Deleted input").
- **Landing row.** Shown as the plan says: the unknown and unclaimed sub-cases only.
- **Region 4.** I dropped the optional untyped-collection micro before/after (`2aab3a22916`). It didn't fit at the 24 pt floor without pushing region 4 into the footer. It's only in `SOURCES.md` context now (see recommendation 6).
- **Region 5.**
  - The #24671 label is "input copy defaults" rather than "`no_add_to_history` / `ds_map`". The mono version didn't fit in a 2.4 in patch at 24 pt. It's condensed from the PR title.
  - The caption is shortened to one line.
- **Dev rail tick 3.** Its code reads `validate(), copy()`, short for `input_param.validate` and `content.copy`. The full names are in `SOURCES.md`.
- **Kalam weight.** Only Kalam 400 is used, so the 700 file isn't bundled.

## Friction

- **Size.** The first full render was 54 in tall against a 44 in canvas. Region 1 and the board took four passes to fit: shorter labels, ≤2-line code names with `<wbr>` breaks, one-line console names, merged legend lines, and the untyped note removed. The 24 pt floor for test names in mono is the binding constraint on the board's width.
- **Glyphs.** The `@fontsource` latin subsets lack arrows (U+2190–2193 partly). "←" and "→" in prose are inline SVG (`.arr`). A few "→" inside mono code names were rewritten as plain text.
- **Line breaks.** "…" followed by "_" allowed a line break right after the ellipsis in test names. I added U+2060 (word joiner) after each one.
- **Highlighter.** It sat on the `gx-tape` zone (IGNITION labels) and the `gx-tint` diff box, which breaks "highlighter on white only". Fixed with a white pill behind each IGNITION label and a white diff background.
- **Unavailable SHAs.** `4b4c7d39b9a` and `456acb2f1d8` aren't in the local clone (the branch was rebased). I used `gh api …/contents?ref=` to diff the old test files against head without fetching into the shared checkout. The tests behind every measured dev cell are unchanged.

## Still weak

- The board is dense: 11 rows of 28/24 pt in a 29 in card. At PR-image size the chips read as a red/green pattern, but the messages don't.
- The "launch, then scrub" story stays a paraphrase of a private Sentry event. A real trace (plan recommendation 2) would be the strongest image the poster lacks.
- The two "unmeasured" cells and the † cell are honest gaps, but they sit in the middle of the evidence table.
