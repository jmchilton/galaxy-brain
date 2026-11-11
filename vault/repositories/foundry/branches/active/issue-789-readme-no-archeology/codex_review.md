Codex reported no model or effort.

Acted on all three findings in `dbe77aaf`:
- P1 (confirmed): the fixture's Clair3-over-medaka reason was only in the supplied README, so the workflow couldn't evidence it. Now the workflow `doc` states it.
- P2 (confirmed): moving the whole history section could drop a current limitation. The rule now keeps current limitations in the README.
- P3 (partly): the README bullet repeated the bundled IWC checklist. It's merged into one bullet, and the extras are optional "when they help". The source comparison applies only "when the workflow evidently departs from its source".

Refuted: none.

<details><summary>Raw findings</summary>

1. P1 test-coverage, scenarios.md: the new scenario requires a Clair3 rationale its workflow (`steps: []`) can't support.
2. P2 correctness, index.md: moving an entire history section can remove current limitations from the README.
3. P3 reuse, index.md: the new README checklist duplicates the bundled IWC review prompt and broadens the comparison to the source.

Coverage note: this is the only Mold found that writes a workflow README.

</details>
