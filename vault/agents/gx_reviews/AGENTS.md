# Galaxy PR Reviews

@../_shared/VAULT_SYNC.md
@../_shared/SECURITY_REPORTS.md

Working notes for active `galaxyproject/galaxy` pull-request reviews.

## Choosing new reviews

Follow the [candidate-finding guidance](../../../.claude/commands/find-galaxy-reviews.md).
Prefer other PRs when another contributor has an outstanding review request from
within the past seven days, particularly when their expertise fits. This is a soft
preference; direct requests to the user or the user's explicit picks take precedence. Prefer PRs that are out of draft.

In these files PROJECT is galaxy.

@../_shared/PULL_REQUESTS_INDEX.md
@../_shared/REVIEW_NOTES.md
@../_shared/REVIEW_FOCUS.md
@../_shared/WORKTREES.md

`/sync-galaxy-reviews` creates missing queued worktrees and removes eligible settled ones.
## Delivery and follow-up

Once a review is delivered, the ball is theirs. Do not propose nudging the author, bumping a
stale thread, or chasing an unmerged fork PR. Work remains ours only while a review is unposted,
author fixes need verification, we explicitly committed to a follow-up, or an approved PR awaits
the user's merge. Delivered/approved PRs stay in `PULL_REQUESTS.md` until merged or closed.

## File format

These files are excluded from vault validation and the Astro site. Do not add YAML frontmatter.
Wiki links to real vault notes are allowed, but review files receive no automatic backlinks.
