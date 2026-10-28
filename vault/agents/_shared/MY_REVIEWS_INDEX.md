@REPOSITORY_REVIEWS.md

## The index

`vault/repositories/PROJECT/reviews/MY_REVIEWS.md` is the review queue for PROJECT's PRs. Keep a flat list under ``## PRs to review (`to_review`)``; write `None yet.` when empty. An agent covering several projects keeps one queue per PROJECT.

Each entry is one short bullet:

```text
- [#12345](PR_URL) — short tracking status. [notes](active/12345/index.md)
```

Keep findings, reviewed commits, delivery history, CI logs, worktrees, and supporting plans in the review record. Status communicates routine progression; no next step is required when it follows from that status. Preserve explicit user decisions and instructions without inventing new ones.

## Lifecycle

A PR stays in the queue until merged, closed, or removed by John. Delivering or approving a review does not remove it; update its status instead (e.g. `approved; awaiting merge`).

On merge, close, or John's removal, remove the entry and archive the record per [REPOSITORY_REVIEWS.md](REPOSITORY_REVIEWS.md), once agents working there have finished. Refresh the snapshot date when GitHub state is re-queried.

Worktree cleanup follows [WORKTREES.md](WORKTREES.md). Removing a queue entry or moving its notes does not by itself authorize removing a worktree.
