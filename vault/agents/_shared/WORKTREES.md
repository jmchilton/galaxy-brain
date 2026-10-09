
For a repository named PROJECT (for example, `planemo`, `pulsar`, or `galaxy`).

## For Pull Request Reviews

Worktrees for PROJECT request reviews live at `~/projects/worktrees/PROJECT/pr/<PR_NUMBER>/`, managed by `ghwt`.

**Add** — driven by the document.

```sh
ghwt create PROJECT <PR_NUMBER>
```

**Remove** — driven by PR state, *not* by the document. When a PR has been merged or
closed tear its worktree down:

```sh
ghwt rm PROJECT <PR_NUMBER>
```

Note the command is `ghwt rm`, not `ghwt remove`.

## For Bug/Feature Branches

Worktrees for PROJECT request reviews live at `~/projects/worktrees/PROJECT/branch/<BRANCH_NAME>/`, managed by `ghwt`.

**Add** — driven by the document.

```sh
ghwt create PROJECT <BRANCH_NAME>
```

**Remove** — driven by branch state, *not* by the document.

- Merged, closed, or abandoned branches **should** be removed.
- When disk space is low, any branch **may** be removed once its work is pushed to a remote.
  `ghwt create` can recreate it.

Dropping an entry from the tracking document alone isn't a reason to remove its worktree.

```sh
ghwt rm PROJECT <BRANCH_NAME>
```

## Before removing any worktree

Remove only clean worktrees. First check for uncommitted and unpushed work:

```sh
git -C <WORKTREE> status --porcelain
git -C <WORKTREE> rev-list @{u}..HEAD --count
```

Non-empty status means uncommitted changes. A non-zero count, or no upstream at all
(`git -C <WORKTREE> rev-parse @{u}` fails), means local commits exist nowhere else. In
either case do **not** remove it - tell the user what's there and wait for them to confirm.

## Status

Check PR state with
`gh pr view <PR_NUMBER> --repo <OWNER>/<PROJECT> --json state,mergedAt,closedAt`.
