# Checklist evaluation

Fresh subagent, 2026-10-15, at `27d72f8b62d` against `origin/release_26.2`. GENERAL + WORKFLOW_RELATED. No item fails; the human-read item is left for John.

Findings carried into polishing:
- **Rerun dropped on rejection.** With an input fetch that keeps failing, a poll landing during that fetch is dropped when the pass rejects. If it was the last poll before terminal, a header can stay stale with no error.
- **`InvocationGraph.test.ts:54`** counts calls on a mock; the next line (the alert disappearing) already proves the retry. Removing/replacing it needs John's OK.
- **Comment nit**: `refreshSteps` docstring "latest inputs" reads as workflow inputs.

Item answers are in [pr_description.md](pr_description.md) under "John's Checklist".
