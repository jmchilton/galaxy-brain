# Foundry Worktree Inventory

The 9 worktrees in `~/projects/worktrees/foundry/branch/`: 8 carrying outstanding work, 1 fresh.
Regenerate any time with `./scan_worktrees.sh` — see [Repeating the survey](#repeating-the-survey).

State as of 2026-09-12, against `origin/main` @ `92e924d`.

Outstanding work means either uncommitted changes (`git status --porcelain`, so `.gitignore`d build junk
doesn't count) or commits not reachable from `origin/main`. Commits ahead of a tree's own *remote branch*
are deliberately ignored — stale remote branches left behind by rebases show big unpushed counts while
the work is already in main.

A tree sitting exactly on `origin/main` — clean, nothing ahead, nothing behind — is **fresh**, not safe to
delete. It has no work because it was just created, which every other measure here reads as identical to
abandoned.

## Uncommitted changes (8)

Split by whether the dirt looks like real work. For the substantive group each modified file was diffed
against `origin/main` to check the edits weren't just catching up to main — they aren't, all genuinely
divergent.

### Substantive — review before deleting (4)

| Tree | Branch | Dirty | Behind | Notes |
|---|---|---|---|---|
| `glossary_sync` | `types/kind-directories` | 33 modified, 2 untracked | 278 | Broad schema/kind-system edits. **23 of the 33 modified files no longer exist in `origin/main`** — the repo restructured underneath this tree, so most of it is likely obsolete rather than salvageable. Two new untracked files (`generate-kind-manifest.ts`, `kind-manifest.test.ts`). |
| `casting` | `discover-shed-tool-normalize-tool-id-queries` | 18 modified, 4 untracked | 366 | Skill `_provenance.json` + `SKILL.md` + `tests-format.schema.json` edits. All 18 diverge from main. 2 of the 4 untracked are `_emulated-runs/` (disposable); the other 2 are `open-requirements-ledger.md` notes. |
| `cast-package-adopt` | `cast-package-adopt` | 5 modified | 150 | `cast-mold.ts` + schema + test edits; 3 of 5 diverge from main, 2 already match. Smallest of the substantive set — quickest to triage. |
| `egapx` | `ledger-name-the-drop` | 1 modified | 37 | Single file: `content/pipelines/nextflow-to-galaxy/scenarios.md` (12+/11-). Also has a matching **stash**. Recent (2026-09-04). |

### Untracked-only, mostly disposable artifacts (4)

`_emulated-runs/` directories are dev artifacts, not publishable output — they don't count as work to
preserve. `refinements/` files are mold-refinement records and may be worth keeping.

| Tree | Branch | Untracked | Behind | Notes |
|---|---|---|---|---|
| `sarek` | `docs/state-vs-tool-state` | 10 | 37 | 1 `_emulated-runs/` dir (disposable) + 9 `refinements/` entries dated 2026-09-04. Recent — check the refinements. |
| `drafting` | `fix-mold-scenarios-health` | 5 | 415 | Loose draft outputs at repo root (`freeform-summary.md`, `galaxy-workflow-draft.gxwf.yml`, etc.). Scratch output from a run, 415 commits stale. |
| `story` | `agent/fix-architecture-links` | 3 | 187 | 1 `_emulated-runs/` dir + 2 `refinements/` entries. |
| `update-workflow` | `astro-7` | 3 | 223 | 3 `refinements/` entries, incl. one dated 2026-07-11. |

## Fresh (1)

| Tree | Branch | Created | Notes |
|---|---|---|---|
| `planemo-pin-gate` | `planemo-pin-gate` | 2026-09-12 | Exactly on `origin/main` @ `92e924d`, clean, no remote branch. Newly set up, work not started. Leave it. |

## Stashes (3, repo-wide)

Stashes live in the shared repo, not in any one worktree, so they survive `git worktree remove`:

- `stash@{0}` — On `egapx`: `egapx-fixes-wip` (pairs with the dirty `egapx` tree above)
- `stash@{1}` — On `main`: MOLD_SPEC drop usage.md + mark casting.md/cast-skill-verification.md unused
- `stash@{2}` — On `mold-changes-md`: WIP

## Gotchas

**Tree names drift from branch names.** Trees get reused for unrelated branches, so the directory name is
an unreliable guide to what's inside. `casting` holds `discover-shed-tool-normalize-tool-id-queries`,
`glossary_sync` holds `types/kind-directories`, `story` holds `agent/fix-architecture-links`. Read the
branch, not the folder.

**`egapx` and `sarek` sit on the same commit** (`3a2500a`) — duplicated checkouts of one state, with
different uncommitted work on top of each.

**A brand-new tree looks exactly like an abandoned one.** Both are clean with nothing ahead of main. Only
the `behind` count separates them, which is why `--safe` excludes anything sitting precisely on the
baseline. Worth remembering before deleting on any tooling's say-so.

## Triage queue

Easiest first:

1. `drafting`, `story`, `update-workflow` — decide keep-or-drop on the `refinements/` entries; the
   `_emulated-runs/` dirs and root-level draft scratch can go.
2. `sarek` and `egapx` — recent (2026-09-04) and likely still live work. `egapx` also has a stash.
3. `cast-package-adopt`, then `casting`, then `glossary_sync` — increasing size and staleness;
   `glossary_sync` is probably a write-off given 23 of its files no longer exist in main.

To remove a tree once triaged:

```sh
git -C ~/projects/repositories/foundry worktree remove ~/projects/worktrees/foundry/branch/<name>
git -C ~/projects/repositories/foundry worktree prune
```

`git worktree remove` refuses to drop a tree with uncommitted changes unless forced — a useful safety net
that matches the buckets above. Removing a tree deletes neither its branch nor any stash.

## Repeating the survey

`scan_worktrees.sh` (beside this file) regenerates everything above, so this doesn't have to be a
hand-maintained snapshot:

```sh
./scan_worktrees.sh            # table of every tree + safe/outstanding/fresh counts
./scan_worktrees.sh --safe     # names only: clean + fully merged, safe to remove
./scan_worktrees.sh --work     # names only: trees with outstanding work
./scan_worktrees.sh --fresh    # names only: sitting exactly on the baseline, never used
./scan_worktrees.sh --markdown # regenerate the tables in this document
./scan_worktrees.sh --no-fetch # skip the origin fetch (faster, risks a stale baseline)
```

It fetches `origin` by default: a stale baseline silently inflates the outstanding-work count, flagging
trees whose PRs have since merged.

Paths are overridable via `FOUNDRY_REPO`, `FOUNDRY_WORKTREES`, and `FOUNDRY_BASELINE`, so the same script
works for another repo's worktrees.

Driving a cleanup off it directly:

```sh
./scan_worktrees.sh --safe | while read t; do
  git -C ~/projects/repositories/foundry worktree remove ~/projects/worktrees/foundry/branch/"$t"
done
```

## What's been cleared

- **2026-09-12** — 43 clean, fully-merged trees removed. Their branches all still exist in the repo.
- **2026-09-12** — `pipelines` dropped (`87322d1` "add Galaxy test plan schema", PR #214 closed unmerged);
  worktree and local branch both deleted. `origin/pipelines` still holds the commit.
- **2026-09-12** — `gallery-license-cases` rebased and merged as
  [PR #502](https://github.com/galaxyproject/foundry/pull/502); worktree and local branch removed. The
  rebase shrank it to the byte-for-byte badge parity test — site-kit 0.9.7/0.10 had already brought the
  gallery half onto main. `origin/gallery-license-cases` still exists and can be deleted.
