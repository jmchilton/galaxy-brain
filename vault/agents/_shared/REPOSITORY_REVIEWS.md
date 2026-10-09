Store details about reviewing pull requests in:

vault/repositories/PROJECT/reviews/STATUS/PR_NUMBER/

For PROJECT in (galaxy, pulsar, planemo, etc...). One agent may cover several repositories.

## Statuses

A review lives under exactly one directory status:

- `active/` — tracked reviews, including unposted drafts, author-fix verification, and waits for the author or John's merge.
- `archived/` — the PR merged or closed, or John removed it from tracking.

Delivering or approving a review does not archive it. Keep finer workflow status in `index.md` and the agent's `PULL_REQUESTS.md`; routine progress does not move the directory.

When archiving, move the directory once agents working there have finished, remove the queue entry, and update links together. Record the GitHub state and why tracking ended in `index.md`.

## Contents

Each directory contains an `index.md` file without frontmatter. It serves as an ongoing debrief as work is done.

Review findings, research, reproduction scripts, draft comments, and other supporting files go here. Link them near the top of `index.md`; organize the rest to suit the repository's process. Keep the agent's queue short, with links to these details.

Make the latest review, reviewed commit, and whether it was delivered easy to find. Preserve earlier findings with their reviewed commits so they aren't mistaken for current blockers. Record explicit decisions and dependencies as needed; don't invent next steps from the status.

Reviews within branch, issue, or project work can stay in those records. Link related records rather than copying their notes.

Security findings and sensitive evidence follow [SECURITY_REPORTS.md](SECURITY_REPORTS.md).
