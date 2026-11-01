# John's feedback on round 7

Rules in `FEEDBACK_ROUND3.md` through `FEEDBACK_ROUND7.md` still apply, except where this file overrides them.

## Rules for every poster

- **No tape.** Remove every tape decoration from every poster: the taped corners on cards, receipts and slips, the Galaxy+ nova "hot" strip, the `tape()` / `tape-shape()` helpers and their call sites, and any guard that checks them. This overrides STYLE_GALAXY.md ("keep tape on every slip") and STYLE_GALAXYPLUS.md (the nova tape strip). After removal, close any clearance gap the tape left. If a tape carried meaning (a featured or "this one matters" mark), keep that meaning through an existing element instead (the gold or nova card bar, or the badge). The `gx-tape` colour token stays wherever it is used for text or fills.
- **Content matches within each row.** The Galaxy and Galaxy+ versions of a row carry the same copy, receipts and data. Only style differs.

## The round-8 panel (in this order, one Galaxy + Galaxy+ pair per row)

| # | Row | Galaxy source | Galaxy+ source | Copy truth |
|---|---|---|---|---|
| 1 | receipts-trad-columns | `columns-galaxy-r7` | `columns-galaxyplus-r6` + the r7 changes | galaxy-r7 |
| 2 | receipts-side-by-side-r4 | `side-by-side-r4-galaxy-r7` | none: a new Galaxy+ restyle of galaxy-r7 | galaxy-r7 |
| 3 | receipts-trad-header-footer | `header-footer-galaxy-r6` + the r7 changes | `header-footer-galaxyplus-r7` | galaxyplus-r7 |
| 4 | receipts-spike-r4 | `spike-r4-galaxy-r7` | `spike-r4-galaxyplus-r6` + the r7 changes | galaxy-r7 |

- **Dropped:** side-by-side Old-school (the pair replaces it) and the fix-the-note block.
