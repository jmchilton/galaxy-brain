Run via gpt-6-sol at medium effort.

Acted on both findings with one change: `implement-galaxy-workflow-test` now checks every data-table value the test reaches against a row, with an eval property and a scenario. It has the workflow and the refs, and it already owns the local `test-data/` layout.

Not acted on: nothing. No source-specific leg was edited, because the check downstream covers a value they resolve.

<details><summary>Full review</summary>

Codex read content and the pinned planemo and Galaxy sources.

- P1, certain: `content/molds/find-test-data/index.md:97`. Step 6 runs only for workflow inputs, so a step whose table-backed value is fixed in tool state gets no staged table. Confirmed: `find-test-data` has no workflow input.
- P1, likely: `content/molds/find-test-data/index.md:92`. Step 1 keeps a source leg's `resolved: true` refs unchanged, so a scalar database value resolved there skips step 6, and the test reaches a managed Galaxy with no row. Confirmed by reading step 1 and the source-leg Molds.

Coverage note: generated `Dashboard.md` and `Index.md` not reviewed.

</details>
