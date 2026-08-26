Sync local Galaxy PR worktrees with `vault/reviews/galaxy/index.md` — create missing ones, tear down settled ones.

Reconcile two things:

- **Create** — every PR number listed in `vault/reviews/galaxy/index.md` should have a worktree.
- **Remove** — every existing worktree whose PR has been merged or closed for **3+ days** should be gone.

The two directions are independent. A PR dropping off `index.md` is *not* a reason to
destroy its worktree, and an open PR keeps its worktree even if it isn't listed.

## Steps

### 1. Read the list

Read `vault/reviews/galaxy/index.md`. It's a flat list of `- <number>` lines under
`PRs To Review:`. Collect the numbers; ignore anything else in the file.

### 2. List existing worktrees

```sh
ls ~/projects/worktrees/galaxy/pr/
```

Each directory name is a PR number.

### 3. Check PR state for every existing worktree

For each worktree number:

```sh
gh pr view <PR_NUMBER> --repo galaxyproject/galaxy --json number,state,title,mergedAt,closedAt
```

A worktree is a **removal candidate** when `state` is `MERGED` or `CLOSED` *and*
`mergedAt`/`closedAt` is at least 3 days before today. Anything `OPEN`, or settled
less than 3 days ago, stays — say so in the report rather than silently dropping it.

### 4. Verify the directory name actually matches the PR

The directory number is *not* trustworthy — worktrees get reused, and a directory named
`pr/22791` has been observed holding the branch for a different, still-open PR. Before
proposing any removal, confirm identity:

```sh
git -C ~/projects/worktrees/galaxy/pr/<PR_NUMBER> rev-parse --abbrev-ref HEAD
gh pr view <PR_NUMBER> --repo galaxyproject/galaxy --json headRefName --jq .headRefName
```

If they differ, the worktree is **not** what the directory name claims. Find the real
owner (`gh pr list --repo galaxyproject/galaxy --head <branch> --state all`) and report
the mismatch — never remove a mismatched worktree without asking.

### 5. Guard against losing work

Before proposing a removal, check for uncommitted *and* unpushed work:

```sh
git -C ~/projects/worktrees/galaxy/pr/<PR_NUMBER> status --porcelain
git -C ~/projects/worktrees/galaxy/pr/<PR_NUMBER> rev-list @{u}..HEAD --count
```

Non-empty status means uncommitted changes. A non-zero unpushed count — or no upstream
at all (`rev-parse @{u}` fails) — means local commits exist nowhere else. Do **not**
remove either case automatically; list them separately and ask the user.

### 6. Report the plan, then execute

Print a short plan before touching anything:

- `create: <numbers>` — listed in `index.md`, no worktree
- `remove: <number> (merged YYYY-MM-DD, N days ago)` — clean worktrees only
- `hold: <number> (open | settled N days ago | dirty)` — with the reason

Then run the actions. Clean removals and creations proceed without asking; dirty
removals only after the user confirms.

```sh
ghwt create galaxy <PR_NUMBER>      # create takes a bare number
ghwt rm galaxy pr/<PR_NUMBER>       # rm REQUIRES the pr/ prefix
```

**The `pr/` prefix on `rm` is mandatory.** `ghwt rm galaxy 22484` resolves to
`worktrees/galaxy/branch/22484`, finds nothing, and still prints
`✅ Done! Worktree removed` — a silent no-op that also archives the PR's ghwt note out
of the Obsidian vault to `~/projects/old/`. Never truncate `ghwt rm` output; read the
whole thing and confirm a `✅ Deleted worktree:` line appeared.

After removals, verify against `ls ~/projects/worktrees/galaxy/pr/` — trust the
directory listing, not ghwt's exit message.

If `ghwt create` fails (PR not found, branch gone, disk), report it and keep going with
the rest — one bad number shouldn't abort the sync.

### 7. Summarize

One-line-per-action summary of what actually happened, plus anything held back and why.

## Notes

- Read-only `gh` and `ls` calls for step 3 can be batched in parallel; `ghwt` mutations
  should run one at a time.
- Don't edit `index.md` as part of this — it's hand-maintained input, not state.
- Don't create or delete review note files here; this command only manages worktrees.
