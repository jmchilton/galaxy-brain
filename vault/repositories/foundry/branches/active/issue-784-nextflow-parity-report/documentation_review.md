Run via Claude Opus 5.5.

# Documentation review — `a9311739`

Reviewed the branch's Markdown against the worktree's `.agents/skills/foundry-documentation/SKILL.md`. That covers the parity Mold's `index.md`, `eval.md` and `scenarios.md`, `content/cli/foundry/{check-scope-records,nextflow-parity}.md`, the interface Mold's rev 8 lines, the pipeline note, `packages/gxwf-foundry/README.md`, the CLI meta descriptions and the changeset. The domain review's cuts weren't re-expanded, and no check was weakened. Fixes in `9b100aa5`.

## Changed

- **`nextflow-parity.md`.**
  - The intro paragraph mixed the command's stance with a one-sentence keying rule. It is now a stance sentence plus a short keying paragraph, one sentence per step form.
  - The exit codes moved to the top of Output, as in `check-step-removals.md` and `check-scope-records.md`.
  - The `steps` and `source_args.rows` bullets were walls of text. Each field is now a sub-bullet.
  - Documented the missing `steps_from: null` case (no step either way), checked against `nextflow-parity.ts`.
- **Parity Mold body.** "A removed step repair folded into another" didn't parse; it now reads "A step that repair folded into another". The Outputs sentence about `dropped_entries` no longer restates what the JSON field joins.
- **`scenarios.md`.** The case 1 list ended its items with semicolons (banned in prose). Each item is now a sentence, and the bare entry id is labelled "Entry".
- **`eval.md`.** "Overridden entries are not rows that need a record" became "are listed as needing no record".
- **Changeset.** One 60-word sentence split into one paragraph per command.

Casts regenerated.

## Checked, no change

- No banned words in the branch-authored text. The pipeline's `harness_notes` key is a defined term. "ships" was removed from the `[[gxwf]]` verification in the domain pass.
- `check-scope-records.md` reads cleanly and has the same section order as its siblings: intro, Output, Examples, Gotchas.
- The CLI meta descriptions match the page summaries.

## Not changed (pre-existing, not branch-authored)

- Semicolons in the interface Mold's frontmatter descriptions (lines 17 and 106) and in `packages/gxwf-foundry/README.md` ("Browser-safe; no commander…").

## Gate

`npm run packages-build`, `make -k check`, `npm run typecheck`, `npm run packages-typecheck` and gxwf-foundry `vitest` at `9b100aa5`: red only on `validate-roadmap` (GitHub rate limit) and `check-vendored` (machine-only), as before. 503 root and 149 package tests pass.
