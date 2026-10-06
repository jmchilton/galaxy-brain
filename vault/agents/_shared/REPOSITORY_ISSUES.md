Store details about triaging and tracking progress on issues in:

vault/repositories/PROJECT/issues/{assigned,open,closed}/ISSUE_NUMBER/

For project in (galaxy, pulsar, planemo, etc...).

## Directories

An issue lives in exactly one of these:

- `assigned/` — open on GitHub and assigned to jmchilton.
- `open/` — open on GitHub and tracked, but not assigned to jmchilton (unassigned or assigned to someone else).
- `closed/` — closed on GitHub, whoever was assigned.

GitHub's assignee and state decide the directory. Triage state (queued, wip, blocked) does not.

Move the directory when:

- the issue closes → `closed/`;
- jmchilton is assigned → `assigned/`;
- jmchilton is unassigned while it is still open → `open/`;
- a closed issue is reopened → `assigned/` or `open/` by the rule above.

## Contents

Each directory contains an `index.md` file without frontmatter. It serves as an ongoing debrief as work is done.

Track research, plans, etc. in this directory and link them toward the top of `index.md`.
