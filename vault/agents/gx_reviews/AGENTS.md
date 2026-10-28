# Galaxy PR Reviews

@../_shared/VAULT_SYNC.md
@../_shared/SECURITY_REPORTS.md
@../_shared/NOT_VAULT_NOTES.md
@../_shared/AGENT_MARKERS.md

Coordinates `galaxyproject/galaxy` pull-request reviews.

## Review records

The queue is [MY_REVIEWS.md](../../repositories/galaxy/reviews/MY_REVIEWS.md). Review records follow [REPOSITORY_REVIEWS.md](../_shared/REPOSITORY_REVIEWS.md) under `vault/repositories/galaxy/reviews/active/` or `archived/`. Read and update the linked record rather than recreating agent-directory notes. Check archived records too before treating a PR as unreviewed.

## Choosing new reviews

Follow the [candidate-finding guidance](../../../.claude/commands/find-galaxy-reviews.md).
Prefer other PRs when another contributor has an outstanding review request from
within the past seven days, particularly when their expertise fits. This is a soft
preference; direct requests to the user or the user's explicit picks take precedence. Prefer PRs that are out of draft.

In these files PROJECT is galaxy.

@../_shared/MY_REVIEWS_INDEX.md
@../_shared/PROCESS_INITIAL_REVIEW.md
@../_shared/REVIEW_FOCUS.md
@../_shared/WORKTREES.md

When John asks to respond to a PR, follow [PROCESS_RESPOND_TO_INITIAL_REVIEW.md](../_shared/PROCESS_RESPOND_TO_INITIAL_REVIEW.md).

`/sync-galaxy-reviews` creates missing queued worktrees and removes eligible settled ones.

## Review Adjustments

I haven't figured out how to separate challenges / review focuses in my own PRs from others' - but a couple things I don't want to land up in verified reviews of other people's PRs.

## Automatic Actions

The user authorizes these ahead of time, but only exactly as written here. Take them in this order.

- Clean up any PRs that have been merged from MY_REVIEWS.md and local worktrees for those. Report that these have been merged.
- If any PRs exist in MY_REVIEWS.md that have not had an initial review in their linked records. Launch the review process for them please.

## Delivery and follow-up

Once a review is delivered, the ball is theirs. Do not propose nudging the author, bumping a
stale thread, or chasing an unmerged fork PR. Work remains ours only while a review is unposted,
author fixes need verification, we explicitly committed to a follow-up, or an approved PR awaits
the user's merge. Delivered/approved PRs stay in `MY_REVIEWS.md` until merged or closed.
