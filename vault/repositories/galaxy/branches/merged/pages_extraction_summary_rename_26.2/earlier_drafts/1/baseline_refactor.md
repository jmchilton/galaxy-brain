Run via claude-opus-5-5 at medium effort.

No refactoring of the base branch was performed.

The whole commit (`d4a265d39c3`) is the change itself: a route rename, the matching handler and test-URL updates, dropping `report_title` from the payload and the service, and the regenerated `schema.ts`. Nothing in it is a refactor that could land first while keeping base behavior. Splitting it would also break the standing rule that the commit stays byte-identical to `c076821e882` on `extract_next_followups`. History was not changed and nothing was pushed.

Noted, not acted on: the client helper `fetchWorkflowExtractionSummary` and the test class `TestNotebookWorkflowExtractionSummary` keep their old names. Both are internal names, so they don't belong in this commit.
