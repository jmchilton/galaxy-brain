Find open `galaxyproject/galaxy` PRs worth reviewing next, and let the user pick one or two.

This is a *suggestion* command. It reads GitHub and reports; it never edits
`vault/reviews/galaxy/index.md`, never creates worktrees, and never starts a review on its
own. `/sync-galaxy-reviews` handles worktrees once the user has picked.

## What to surface

**Foreground first:** PRs where the user is a requested reviewer and has *not* yet commented
or reviewed. Those are asks sitting unanswered, so they lead the report regardless of author
or topic.

**Then rank the rest** of the open PRs by, roughly in this order:

1. **Author** — mvdbeek, nsoranzo, davelopez, ahmedhamidawan, natefoo, guerler, dannon,
   in about that order. Others are fine, just lower.
2. **Topic** — jobs, backend, collections, tools, testing, refactoring, architecture.
   Client/UI-only work ranks lower unless it's a substantial refactor.
3. **Ready over draft** — a non-draft PR beats a draft. Drafts aren't excluded (the user
   reviewed a draft as recently as #23295), they just sink.

Recency matters as a tiebreak. A draft last touched in 2024 is almost certainly dead;
say so rather than listing it straight-faced.

## Skip

- Anything with a note in `vault/reviews/galaxy/` (`ls` it — filenames are `<number>_*.md`)
  or a number in `index.md`. Those are reviewed or in flight.
- Anything the user has already commented on or reviewed.

## Finding them

```sh
gh pr list --repo galaxyproject/galaxy --search "review-requested:@me" --state open \
  --json number,title,author,isDraft,updatedAt
gh search prs --repo galaxyproject/galaxy --state open --author <login> \
  --json number,title,isDraft,updatedAt
```

Use `review-requested:@me`, not `user-review-requested:@me` — the latter misses team-based
requests. `gh pr list --search` with several `author:` qualifiers has been observed
returning nothing; loop `gh search prs` one author at a time instead.

Search's `-commenter:@me` / `-reviewed-by:@me` negations lag the index — #23295 still
matched a day after a comment landed. Treat them as a rough prefilter and confirm per PR:

```sh
gh pr view <N> --repo galaxyproject/galaxy --json comments,reviews \
  --jq '[(.comments[]?,.reviews[]?)|select(.author.login=="jmchilton")]|length'
```

Read-only calls can run in parallel.

## Reporting

Fetch the body for the shortlist (`gh pr view <N> --json body,additions,deletions,changedFiles`)
and describe each PR **only from its own description** — don't read the diff, don't judge the
code. One or two sentences each, plus author, draft state, size, and why it surfaced.
Note when a PR says it's stacked on another; that changes what reviewing it means.

Then call **AskUserQuestion** with the strongest candidates as options so the user can pick
one or two to review. Keep it to a handful — a long list is a worse answer than a short one.
