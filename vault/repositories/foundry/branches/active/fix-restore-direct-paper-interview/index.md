# fix/restore-direct-paper-interview

PR: [galaxyproject/foundry#605](https://github.com/galaxyproject/foundry/pull/605) → `rfc/workflow-brief`. Follow-up to #567 (mandatory Workflow Brief in PAPER/INTERVIEW → GALAXY). Toward #3.

- Description: [pr_description.md](pr_description.md), applied to #605 on 2026-10-14 at John's request.
- Screenshots: local `screenshots/` (ignored); hosted for the PR on the orphan branch `jmchilton/foundry:pr-605-screenshots`.

## Decisions

- 2026-10-14: John confirmed the UI scope (journey taxonomy, landing route chooser, Usage grouping, catalog Journey column) belongs in this PR; it's not split out.
- 2026-10-14: John chose to keep both Galaxy design Mold families (freeform and brief) for now; revisit a merge after the brief route has real runs.

## Review (2026-10-14)

- Restore verified: four `freeform-summary-to-galaxy-*` Mold dirs byte-identical to `main`; no leftover #567 wording in the paper/interview pipelines, glossary, or research note.
- CI was red on `check-generated` (Dashboard drift), and hid a second red: `check-casts` (12 casts drifted after commit 3 edited shared patterns/research). Fixed in `03b7c5d8` (regen + `make casts`). All CI gates pass locally except `check-vendored`, which compares against local Galaxy/galaxy-tool-util clones and is unrelated to this branch.
- Resolved:
  - `journey` vs `lifecycle` overlap: kept both; `meta_tags.yml` journey description now says journey drives navigation and complements `lifecycle` (`2aad8174`).
  - Plan & Build command boxes on Usage scrolled at desktop width (indented column). Harness rows now give commands `minmax(29rem, 0.7fr)` and stack below 960px; verified at 1400/1000/961/390 with no command overflow (`536c138e`). Usage screenshot refreshed on the screenshots branch.
  - Brief Mold `axis: target-specific`: left as is. `source-specific` needs a `source` from `sourceKinds`, which has no `workflow-brief`; the brief Molds accept briefs from any source with optional summaries as evidence, the same shape as target-specific `summary-to-cwl-template`. My earlier "really source-specific" call was wrong.
  - The journey rule lives in published `gxwf-foundry-note-schema`. With John's OK, the changeset now releases it as a minor (`e7598c5a`); `foundry-site` gets an automatic dependent patch and is private.
- Not this branch: the landing header overflows at 390px; the base branch has the same problem.

## Mold families: keep both vs merge

Keep both (current):
- Matches the per-source convention (`nextflow-summary-to-galaxy-*`, `cwl-summary-to-galaxy-*`).
- Each Mold states one authority model; eval/scenarios stay simple.
- The direct route is byte-identical to `main`, so there's no regression risk for existing users.
- Cost: 4 pairs; ~106 cast files; every shared ref edit recasts both (it bit this branch).

Merge (brief optional):
- One set of eval/scenarios to maintain, and refs update once.
- Cost: a branching authority rule inside each Mold body ("if a brief is present it governs; otherwise the summary does"), which is harder to eval. It also has to cover a brief with no summary and a summary with no brief, which the input contract can't express as "at least one".
- It reopens the restored `main` Molds, so it's not a restore anymore.
