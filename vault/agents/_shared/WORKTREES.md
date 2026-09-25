
For repository with name PROJECT (e.g.  planemo, pulsar, galaxy, etc..)

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

**Remove** — driven by PR state, *not* by the document. When a PR has been merged or
closed tear its worktree down:

```sh
ghwt rm PROJECT <BRANCH_NAME>
```
## Status

Check PR state with `gh pr view <PR_NUMBER> --repo galaxyproject/planemo --json state,mergedAt,closedAt`.
