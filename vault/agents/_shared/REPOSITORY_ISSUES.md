Store details about triaging and tracking progress on issues in:

vault/repositories/PROJECT/issues/STATUS/ISSUE_NUMBER/

For project in (galaxy, pulsar, planemo, etc...).

## Statuses

The status answers "whose move is it?". An issue lives under exactly one:

- `needs_decision/` — John's: scope, approach, close or transfer.
- `queued/` — an agent's, not started: triaged, with a next step.
- `wip/` — in motion: a branch or open PR (ours or someone else's) addresses it.
- `blocked/` — someone else's: an upstream PR, reporter info, an infrastructure decision.
- `delegated/` — nobody's, released: we posted a plan or handed it to a project in `vault/projects/`, and aren't working it.
- `closed/` — nobody's, done: closed on GitHub.

Size is not a status. A big issue that is otherwise queued stays in `queued/` and is marked `(large)` in the index. Likewise assignment: whether jmchilton is assigned is marked `(assigned)` in the index, not in the directory.

Untriaged issues get no directory; they are lines in the agent's `ISSUES.md` until triaged.

When the status changes, move the directory. Until permanent URLs exist, a move breaks path links, so find an issue by number (`issues/*/ISSUE_NUMBER/`) rather than trusting a stored path.

## Contents

Each directory contains an `index.md` file without frontmatter. It serves as an ongoing debrief as work is done.

Track research, plans, etc. in this directory and link them toward the top of `index.md`. A `delegated/` issue's `index.md` says, near the top, to whom or what it was delegated, when, and where (plan comment, project).
