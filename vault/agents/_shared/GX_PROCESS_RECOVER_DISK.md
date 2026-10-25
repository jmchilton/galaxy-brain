@PROCESS_RECOVER_DISK.md

## Offer to clean up node_modules and .venv

Fully set-up Galaxy worktrees are about 3 GB each. About 2.3 GB of that is `client/node_modules` plus `.venv`, which setup rebuilds. Deleting them from idle worktrees leaves branches and commits intact.

Estimate first. This is read-only:

```sh
scripts/idle_deps_estimate.sh DAYS [ROOT...]
```

- `ROOT` defaults to `~/projects/worktrees/galaxy/{branch,pr}`. Pass other project roots to include them.
- A worktree counts as idle when its newest activity is older than `DAYS`. Activity is the newest of the last commit, the git index mtime and the HEAD mtime. `git status` can bump the index.
- `du` overcounts uv's copy-on-write `.venv` clones and pnpm hard links, so the real savings are much lower. On 2026-10-25, cleaning 32 worktrees freed only 2.5 GB, against a `du` estimate of about 40 GB.

After John agrees on `DAYS` (5 was used on 2026-10-25), clean:

```sh
scripts/idle_deps_clean.sh --dry-run DAYS [ROOT...]   # list only
scripts/idle_deps_clean.sh DAYS [ROOT...]
```

- It skips any worktree that a running process has as its working directory.
- It reports the real space freed, measured with `df` before and after.
- Before rerunning tests in a cleaned worktree, rebuild with `/galaxy-bootstrap`, or `uv sync` / `pnpm install`.