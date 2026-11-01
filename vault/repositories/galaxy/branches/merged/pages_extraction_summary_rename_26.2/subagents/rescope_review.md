Verdict: approve, no bugs. I renamed the `kind` locals in `extract_steps_by_ids` (`lib/galaxy/workflow/extract.py`) to `src` and folded that into commit 2 (`be1f46b9688`). The label API tests still pass (21).

Not acted on:
- **Reusing `OutputLabelKind` for `OutputLabelHint.src`:** the alias lives in `extract.py`, which imports the schema. Reusing it means moving the alias into the schema module, which is churn for a two-value Literal.
- **Renaming the internal `OutputLabelKind` and the helper `kind` params:** these are internal and never frozen. Renaming them would also touch `workflow_extraction_report.py`.
- **The `"icj"` internal key:** it's internal, so I left it.
- **Field order (`src` first in both hints):** cosmetic. It would churn schema.ts.

<details>
<summary>Full review</summary>

See [rescope_review_raw.md](rescope_review_raw.md).

</details>
