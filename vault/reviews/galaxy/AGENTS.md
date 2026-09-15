# Galaxy PR Reviews

Working notes for active `galaxyproject/galaxy` pull-request reviews.

## Active queue

`index.md` is the only review queue. Keep it intentionally tiny:

- Use the heading `PRs To Review:` followed by `- <number> — <concise status>` entries.
- Limit each PR to one or two physical lines.
- Include only work we still own: an unread PR, an unposted review, author fixes awaiting
  verification, or a specifically blocked review that will resume.
- Remove a PR as soon as the review is delivered and no response needs verification, or when
  the PR is merged, closed, or removed by the user.
- Never put review history, findings, CI logs, worktree inventories, follow-up branches, issues,
  or completed/delivered PRs in `index.md`. Those details belong in the active review note or
  nowhere.

## Review-note lifecycle

Use one primary file per active PR:

```
vault/reviews/galaxy/<PR_NUMBER>_<short_description>.md
```

The slug is lowercase snake_case. Prefix any temporary companion artifact with the same PR
number so it can be pruned with the primary note.

Review notes are temporary working state, not an archive. When a PR leaves `index.md`, delete
all matching `<PR_NUMBER>_*` files unless the user explicitly promotes or retains an artifact.
Git history is sufficient for tracked notes. Promote durable material into `vault/research/` as
a proper `type: research`, `subtype: pr` note.

Non-PR work such as an active issue-response draft may temporarily live here, but it must not
appear in `index.md` and should be removed or promoted when that work ends.

**Run reviews in subagents.** Use one subagent per PR, tell it to write the primary review file,
and have it return only a short summary to the coordinator.

## Worktree lifecycle

Worktrees live at `~/projects/worktrees/galaxy/pr/<PR_NUMBER>/` and are managed by `ghwt`.

- If an indexed PR lacks a worktree, run `ghwt create galaxy <PR_NUMBER>`.
- Removing a PR from `index.md` prunes its review files but does not remove its worktree.
- Keep worktrees for open PRs even after review delivery.
- Remove a clean worktree only after its PR has been merged or closed for at least three days:
  `ghwt rm galaxy <PR_NUMBER>`.
- Hold any worktree with uncommitted changes.

Check state with `gh pr view <PR_NUMBER> --repo galaxyproject/galaxy --json state,mergedAt,closedAt`.
`/sync-galaxy-reviews` creates missing queued worktrees and removes eligible settled ones.

## Delivery and follow-up

Once a review is delivered, the ball is theirs. Do not propose nudging the author, bumping a
stale thread, or chasing an unmerged fork PR. Work remains ours only while a review is unposted,
author fixes need verification, or we explicitly committed to a follow-up.

## Review focus

Weight reviews toward:

- Reuse of existing abstractions and whether the change leaves a reusable seam rather than
  accreting another path.
- Python imports at module top level unless a lower import has a documented reason.
- Test coverage, especially whether assertions were weakened instead of fixing implementation.

## File format

These files are excluded from vault validation and the Astro site. Do not add YAML frontmatter.
Wiki links to real vault notes are allowed, but review files receive no automatic backlinks.
