# Review debrief

Acted on the P1 and four of the five P2s in `db8801f2`, along with most P3s:

- **P1:** repair adds a producer for a wrapper missing an output, which for STAR re-creates the blocked step. Repair now folds when a consumer's wrapper does the step's work, and a repair scenario describes the STAR fold.
- **P2s:** discovery now searches the executable and drops data-manager hits. A rejected `weak` counts as a `miss`. A wrapper that lacks only a parameter gets a plain entry.
- **P3s:** the draft-format wording now matches the ledger, the collection-shape clause is cut, and the wording cuts are applied.

Not acted on:

- **P2 4, re-pick after the cap:** this already happens on `main` for every step-1 category. It goes in the PR description as a known limitation, tied to #678's dead-end question.
- **P3, `author-galaxy-tool-wrapper` contradictions:** left to #773, by decision. They don't change routing, because `advance` calls author only on `miss`.
- **P3, `summarize-galaxy-tool:186`, `update-interview-to-galaxy/scenarios.md:256` and `nextflow-to-galaxy-reference-data-mapping:95`:** optional, or out of scope.
- **P3, schema release:** for the PR description. The recast changes the schema hash, so a validator from the current release rejects the recast `discover-shed-tool` until `@galaxy-foundry/gxwf-foundry` is released.
- **The STAR fold scenario has no committed fixture.** The scenario says so.

<details><summary>Full review (opus, default effort)</summary>

See [review.md](review.md).

</details>
