# Galaxy PR Reviews

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

## Galaxy Review Notes

The above linked advice is for general review notes - but for Galaxy specifically please be sure to include a risk assessment in reviews.

@../_shared/GX_ASSESSING_RISK.md
## Delivery and follow-up

Once a review is delivered, the ball is theirs. Do not propose nudging the author, bumping a
stale thread, or chasing an unmerged fork PR. Work remains ours only while a review is unposted,
author fixes need verification, we explicitly committed to a follow-up, or an approved PR awaits
the user's merge. Delivered/approved PRs stay in `PULL_REQUESTS.md` until merged or closed.

## File format

These files are excluded from vault validation and the Astro site. Do not add YAML frontmatter.
Wiki links to real vault notes are allowed, but review files receive no automatic backlinks.
