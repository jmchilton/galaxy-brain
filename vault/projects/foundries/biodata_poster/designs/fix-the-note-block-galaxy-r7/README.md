# Fix the note, not the skill. (standalone block)

The "WHEN A RUN GOES WRONG / Fix the note, not the skill." card from `../receipts-trad-three-col-galaxy-r6/poster.typ` (`card-fix`) as a paste-ready block: Galaxy style, same text, 1-note to 8-skills fan and tape. The closing PR #701 / commit pen line is dropped.

- `block.pdf`: vector, fonts embedded, 13.84 x 9.05 in. The card is 13 in wide, the same as on the poster. Paste it at 100%.
- `block.svg`, `block.png` (about 1500 px wide).
- Smallest type is 28 pt.
- `block.typ` is self-contained. The skill names are inlined from r6 `receipts.json` (`recast.skills`), and the fonts are copied from r6 `fonts/`.

Rebuild: `./build.sh` (uses `uvx --from typst==0.15.0`).
