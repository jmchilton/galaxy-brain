## Source of truth

`MY_BRANCHES.md` in this directory is the categorized work queue for the user's open PRs and
active branches that are intended to become PRs. Keep every open PR exactly once. Adding a
non-PR branch there is the signal to move it toward a PR.

## Index format and classification

Keep these sections in this order:

1. `Open Galaxy PRs — ready from our side`
2. `Draft Galaxy PRs — ready to undraft`
3. `Draft Galaxy PRs — waiting for CI`
4. `Galaxy branches — needs a PR`
5. `Open PRs in other projects`

Add `Open Galaxy PRs — needs attention` or `Draft Galaxy PRs — needs author work` when
needed so no open Galaxy PR is hidden or inaccurately called ready.

Each entry must be one Markdown bullet and one sentence. Use these shapes:

```text
- [#12345](PR_URL) — branch `branch-name` — Description: at most 120 characters; blockers: none.
- Branch `branch-name` — Description: at most 120 characters; blockers: concrete next step.
```

The 120-character limit applies only to the text after `Description:` and before
`; blockers:`. Always include the branch name and blockers; write `none` when there are no
known blockers. Prefer a concrete failing check, dependency, review state, or required action
over vague labels such as "CI trouble."

Classify from live GitHub state, not the age or title of a PR. Always request `isDraft`,
`state`, `reviewDecision`, `mergeStateStatus`, and `statusCheckRollup` when refreshing the
index. Use the categories as follows:

- **Ready from our side:** open and not draft, with no known author-side work. Record upstream
  review or merge dependencies as blockers without turning them into work for us.
- **Ready to undraft:** draft, mergeable, and greenish in CI. "Greenish" may include skipped
  checks or a diagnosed unrelated/flaky failure, but not an unexplained relevant failure.
- **Waiting for CI:** draft with a current run still queued or in progress. Move it when the
  run settles; do not leave completed red CI here.
- **Needs a PR:** an active local or pushed Galaxy branch with a documented intention to open
  a PR. Do not infer this from the mere existence of a worktree.
- **Needs attention / author work:** the exhaustive fallback for conflicts, stale or absent CI,
  relevant failures, unresolved design work, or another concrete action we own.

Refresh the snapshot date in `MY_BRANCHES.md` whenever GitHub state is re-queried. Remove merged or
closed PRs from the active lists, but follow the separate worktree rules below before deleting
anything locally.

## Merged PRs

Once PRs are merged - move any documentation about them in this directory to old/ and remove them from MY_BRANCHES.md. Do not tracked PRs that have been merged in MY_BRANCHES.md - that is for active work. Clean up clean worktrees after merges also.
