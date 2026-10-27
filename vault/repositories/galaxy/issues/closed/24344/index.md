# galaxy#24344 — Edit Attributes saves "Number of comment lines" as a string

Closed 2026-10-27 (completed) by davelopez; fixed by merged PR #24357 (`comment_lines` stored as int, 25.1).

[Issue](https://github.com/galaxyproject/galaxy/issues/24344)

Delegated on 2026-10-21: posted with a proposed approach (`IntParameter` for `comment_lines`) for pickup during Q&A, unassigned. Not being worked by us.

- [issue_draft.md](issue_draft.md) — source note from the playwright FAQ loop
- [proposal.md](proposal.md) — posted text
- [debrief.md](debrief.md) — research, review round, leftovers

Follow-up: the `ColumnDataProvider` median float-index bug from the debrief was filed as [#24345](../24345/index.md). Labeled `release-testing-26.2`.
