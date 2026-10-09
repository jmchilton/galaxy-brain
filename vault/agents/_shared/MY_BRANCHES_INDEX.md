## The Index

`agents/gx_branches/MY_BRANCHES.md` is the categorized work queue for the user's open Galaxy PRs and for Galaxy branches meant to become PRs. Each open PR appears exactly once. Adding a non-PR branch is the signal to move it toward a PR, except entries explicitly marked reference-only or do-not-PR. Merged and explicitly abandoned branches leave the queue; closed unmerged PRs await a decision.

Branch records and supporting files follow [REPOSITORY_BRANCHES.md](REPOSITORY_BRANCHES.md). Galaxy's active records live at `vault/repositories/galaxy/branches/active/<branch_name>/index.md`; keep workflow status in that record consistent with its queue section.

## Sections

Keep these sections in this order. Write `None yet.` under an empty one. Each heading ends with its key in parentheses, e.g. "Galaxy branches — needs polish (`branches_need_polish`)".

1. `ready`: open, not draft, and no known author-side work. Upstream review or merge waits are blockers, not work for us.
2. `attention`: open, not draft, and something we own (conflicts, relevant reds, unanswered review).
3. `draft_ready`: draft, mergeable and greenish. Skipped checks or a diagnosed unrelated red are fine; an unexplained relevant red isn't.
4. `ci_wait`: draft with a run still queued or in progress. Move it once the run settles.
5. `author_work`: draft with conflicts, stale or absent CI, relevant failures or open design work.
6. `branches_implemented` | `branches_implemented_needs_ci`: an agent finished a unit of work and pushed it. Polish it with [`POLISH_BRANCH.md`](../gx_branches/POLISH_BRANCH.md) once fork CI is greenish; branch notes retain CI evidence and any known limitations.
7. `branches_need_polish`: polishing in progress. The entry moves here when polishing starts and on to `branches_ready_for_final_review` when it ends.
8. `branches_ready_for_final_review`: polished. The description is in the branch directory's `pr_description.md`, linked from `index.md`, and the branch waits for the user's read-through, including the human-read checklist item. Only the user moves an entry out.
9. `branches_need_pr`: the user approved it. The branch record holds the approved SHA, approval date and chosen title; retain the SHA in the queue entry too. Agents open the PR once fork CI on that SHA is greenish (see Automatic Actions in `gx_branches/AGENTS.md`).
10. `branches_need_decision`: the user has to choose (scope, an alternative, drop it) or it's reference only.

Classify from live GitHub state, never from a PR's age or title. Put a branch in a `branches_*` section only when there's a documented intent to open a PR; a worktree on its own isn't one.

## Entries

Each entry is one short bullet linking the branch record:

```text
- [`branch-name`](BRANCH_INDEX_PATH) — Short description. [#12345](PR_URL).
- [`branch-name`](BRANCH_INDEX_PATH) — Short description. [Open PR](COMPARE_URL).
```

- Keep the description to at most 120 characters. It says what the change does; testing, reviews, CI history and dependencies belong in the branch notes.
- Status communicates routine progression. No next step or blockers field is required. Include an explicit user decision or do-not-PR instruction when useful; do not invent one from the status.
- Branch records hold approvals, chosen titles, standing instructions and supporting links. Read them before acting on the queue.
- End every `branches_*` entry with an `[Open PR]` compare link from the `jmchilton` fork branch to its upstream target (`dev` unless the entry names a release branch). Skip it only for entries marked do-not-PR.
- Refresh the snapshot date at the top whenever GitHub state is re-queried.
## Merged PRs

When a PR is merged, remove its entry and move the branch directory to `merged/` per `REPOSITORY_BRANCHES.md`, after agents working there have finished. Update links together. Remove its worktree only if it meets `WORKTREES.md`'s cleanup checks.
## Closed PRs

When a PR is closed move its entry from the PRs section- to branches_need_decision. A branch not merged needs to by explicitly abandoned by user to leave this index - not just a close.
## Abandoned Branches

When the user explicitly abandons a branch, remove it from the queue and move its directory to `abandoned/` after agents working there finish. Update links and add a one-line entry to `ABANDONED_BRANCHES.md` linking the record and describing why it was abandoned.
## Cleaning up Worktrees

Try to reclaim space when we can while trying to preserve work where we can - remove clean merged/closed/abandoned worktrees from disk after ensuring nothing is going to be lost because they are pushed to Github.

If there is uncommitted work - diff it into a patch and save it to ./lost_and_found/BRANCH_NAME_uncommitted.patch. If there are notes, etc... sitting in the branch - likewise move this to lost_and_found/ (up to 1MB) so the tree can be reclaimed.

Remove only clean worktrees whose commits are confirmed pushed, following WORKTREES.md. If a worktree has staged, unstaged, or untracked changes, unpushed commits, or no upstream, leave it intact and report what prevents cleanup. A patch in lost_and_found/ is supplemental documentation, not sufficient grounds to remove the worktree.
