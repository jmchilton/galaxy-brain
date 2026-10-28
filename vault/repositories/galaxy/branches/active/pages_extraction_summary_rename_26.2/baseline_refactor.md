Run via claude-opus-5-5 at medium effort.

No refactoring of the base branch was performed.

All three commits are API changes, not refactors that could land first and keep base behavior:

- `d4a265d39c3`: route rename, drops `report_title`. Must stay byte-identical to `c076821e882` on `extract_next_followups`, so it was not split or reordered.
- `be1f46b9688`: wire rename `kind` -> `src` on `OutputLabelHint`/`StepLabelHint`. This changes the API schema, so it is not behavior-preserving.
- `9425d5e862b`: narrows the `_build_report_config` `title` type to `str`. This is only valid after commit 1, because commit 1 makes the title always `workflow_name`. It can't move ahead of commit 1.

History was not changed and nothing was pushed. Still not acted on, as in the prior run (`earlier_drafts/1/baseline_refactor.md`): the internal names `fetchWorkflowExtractionSummary` and `TestNotebookWorkflowExtractionSummary` keep their old wording.
