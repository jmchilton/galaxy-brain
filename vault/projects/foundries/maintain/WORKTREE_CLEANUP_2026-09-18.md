# Foundry worktree cleanup survey — 2026-09-18

Disk: **7.3 GiB free of 460 GiB (99% full)**. `~/projects/worktrees/foundry` = **29 GB**.
Baseline `origin/main` fetched at survey time. Nothing has been deleted yet.

`scan_worktrees.sh` only walks `$BASE/*/`, so it **missed 9 registered worktrees**: the 8 under
`branch/codex/` (one level deeper) and `pr/508`. Plus `/private/tmp/foundry-pr-555` is registered
and lives on the Data volume. Real count is 36 trees, not the 26 the script reports.

## A. Provably lossless — 23 trees, ~13.5 GB

`ahead=0` vs `origin/main` (HEAD is an ancestor of main, so no commit can be lost) **and** clean
working tree. PR state is corroboration, not the load-bearing check. Branches and stashes survive
`git worktree remove`.

| Tree | Branch | PR | Size |
|---|---|---|---|
| `branch/drop-pipeline-eval-boilerplate` | `drop-pipeline-eval-boilerplate` | #511 merged | 619M |
| `branch/iwc-review` | `scenarios-specificity-cleanup` | #512 merged | 619M |
| `branch/iwc-review-509` | `iwc-review-pipeline` | #509 merged | 620M |
| `branch/nextflow-test-selection` | `agent/nextflow-test-selection` | #528 merged | 622M |
| `branch/pattern-verification` | `pattern-verification-batch-1` | #522 merged | 619M |
| `branch/pattern-verification-batch-2` | `pattern-verification-batch-2` | #524 merged | 619M |
| `branch/pattern-verification-batch-3` | `pattern-verification-batch-3` | #527 merged | 620M |
| `branch/pi-container-test-budget` | `pi-container-test-budget` | #546 merged | 588M |
| `branch/planemo-bump` | `planemo-0.75.47` | #521 merged | 619M |
| `branch/planemo-pin-gate` | `planemo-pin-gate` | #506 merged | 619M |
| `branch/profile-kinds` | `profile-kinds` | #529 merged | 620M |
| `branch/roadmap-sync` | `roadmap-sync-531-535` | #540 merged | 620M |
| `branch/site-wiki-map` | `site-one-wiki-link-map` | #514 merged | 620M |
| `branch/triage-fix` | `fix-triage-add-labels` | #541 merged | 19M |
| `branch/codex/conversion-bundle-hash` | `codex/…` | #542 merged | 629M |
| `branch/codex/conversion-command-whitespace` | `codex/…` | #538 merged | 588M |
| `branch/codex/conversion-mold-cleanup-main` | `codex/…` | #536/#537 merged | 588M |
| `branch/codex/conversion-test-coverage` | `codex/…` | #539 merged | 588M |
| `branch/codex/nfcore-conversion-honest-agent` | `codex/…` | #530 merged | 620M |
| `branch/codex/nfcore-lab-package` | `codex/…` | #544 merged | 623M |
| `branch/codex/nfcore-lab-staging` | `codex/…` | #560 merged | 623M |
| `pr/508` | `iwc-maturation-pipeline` | #508 merged | 619M |
| `/private/tmp/foundry-pr-555` | `rebase/pr-555` | rebase scratch, clean, 0 ahead | 623M |

`planemo-pin-gate` was the tree TREE_MANAGE.md said to leave alone as "fresh" on 2026-09-12. Main
has since moved past it and #506 merged, so it is now ordinary safe. The `--fresh` heuristic only
holds on the day a tree is created — a real hole in the script.

## B. Unmerged but pushed to origin — 3 trees, ~1.8 GB

Commits exist on an `origin/` branch (`git branch -r --contains HEAD`), so the work is durable
off-machine and the tree is re-creatable. Deleting loses only the checkout.

| Tree | Branch | Unmerged | Status | Size |
|---|---|---|---|---|
| `branch/drop-scenarios-boilerplate` | `drop-scenarios-boilerplate` | 1 commit | **PR #520 closed unmerged** — most literally abandoned in the set | 619M |
| `branch/naming-probe` | `cross-collection-address-collision` | 1 commit | no PR ever opened | 619M |
| `branch/codex/remove-conversion-revision-history` | `codex/…` | 2 commits | #533 merged, 2 later commits pushed but never PR'd | 588M |

## C. Dirty + merged PR — 8 trees, ~12.7 GB (needs salvage first)

All have a merged PR; the only thing at risk is the uncommitted residue.

### Untracked-only, mostly disposable (4, ~7.9 GB)

`_emulated-runs/` are dev artifacts, not publishable. The keepers are the `refinements/` entries —
a few KB total. Salvage those into this directory, then `worktree remove --force`.

| Tree | PR | Residue | Size |
|---|---|---|---|
| `update-workflow` | #409 merged | 3 `refinements/` entries (one from 2026-07-11) | 3.7G |
| `sarek` | #481 merged | 9 `refinements/` (2026-09-04) + 1 `_emulated-runs/` | 3.1G |
| `story` | #430 merged | 2 `refinements/` + 1 `_emulated-runs/` | 2.2G |
| `drafting` | #304 merged | 5 loose draft files at repo root, 533 commits stale | 509M |

### Substantive uncommitted edits (4, ~3.2 GB)

| Tree | PR | Residue | Size |
|---|---|---|---|
| `casting` | #325 merged | 18 modified (`_provenance.json`, SKILL.md, schema) + 2 ledger notes + 2 `_emulated-runs/` | 1.5G |
| `egapx` | #479 merged | 1 modified `scenarios.md` + matching `stash@{0}` | 774M |
| `cast-package-adopt` | #440 merged | 5 modified (`cast-mold.ts`, schema, tests) | 469M |
| `glossary_sync` | #383 merged | 33 modified + 2 untracked; 23 of the 33 no longer exist in main — likely a write-off | 416M |

## D. Keep — 2 trees

| Tree | Why |
|---|---|
| `branch/issue-534` | 1 commit **not on any remote** (local-only) + active work (`ISSUE_534_SCENARIO_RESULTS.md`), 2026-09-16. 2.1G |
| `branch/author-tool-optional-nextflow` | **PR #545 open**, pushed. 621M |

## E. Regenerable bulk inside trees you keep — ~9.2 GB

`workflow-fixtures/pipelines/` is gitignored, materialized by `workflow-fixtures/scripts/fetch.sh`
from `fixtures.yaml`. It totals **9.3 GB across the foundry trees** and is the single biggest item:

- `update-workflow` 3.1G, `sarek` 2.6G, `story` 1.4G, `issue-534` 1.5G, `casting` 1.1G

Deleting it touches no git state and no uncommitted work. In `issue-534` alone (a keep-tree) that
is 1.5 GB recoverable without removing anything. `node_modules` (~450–570M/tree, gitignored,
restored by `npm install`) is the same kind of win.

## Stashes (survive every removal)

- `stash@{0}` — On `egapx`: `egapx-fixes-wip`
- `stash@{1}` — On `main`: MOLD_SPEC drop usage.md
- `stash@{2}` — On `mold-changes-md`: WIP

## Removal recipe

```sh
git -C ~/projects/repositories/foundry worktree remove <path>     # refuses if dirty
git -C ~/projects/repositories/foundry worktree prune
```

`git worktree remove` exiting 0 does not guarantee the ~600M of ignored files went with it —
verify each path is gone (`test -d`), `rm -rf` any husk, then prune.

---

## Executed 2026-09-18

**34 worktrees removed** (buckets A + B + C). `~/projects/worktrees/foundry`: **29 GB → 2.7 GB**.
Free space on the Data volume: 7.3 GiB → 19 GiB. The gap between the 26 GB removed and the ~12 GiB
of free space gained is APFS holding freed blocks as purgeable — it releases under pressure.

Remaining trees: `issue-534` (2.1G) and `author-tool-optional-nextflow` (621M), plus the main
checkout. Empty `branch/codex/` and `pr/` directories removed.

**Verified after removal:** every branch survives (`astro-7`, `cast-package-adopt`,
`types/kind-directories`, `drop-scenarios-boilerplate`, `cross-collection-address-collision`,
`codex/remove-conversion-revision-history` all still listed) and all 3 stashes survive.

### Salvaged to `salvage-2026-09-18/` (268K)

Per instruction, `refinements/` entries were **not** salvaged — `sarek`, `story` and
`update-workflow` were removed with their untracked residue.

| Item | What |
|---|---|
| `drafting-tal1-draft/` | 5 files — the complete galaxy-brain #13 pipeline run: freeform summary (141L), interface brief (111L), data-flow brief (160L), `galaxy-workflow-draft.gxwf.yml` (401L), IWC comparison notes (114L). Nothing at those paths in main. |
| `cast-package-adopt.patch` | 327-line `cast-mold.ts` rewrite + 61 lines of tests. **Will not apply cleanly** — main moved 3 commits on that file since 2026-08-04, incl. `d9e6f1af refactor: rename gxwf-specific packages`. |
| `egapx-stash0.patch` | Snapshot of `stash@{0}` (29 files, +340/-75, incl. 165 lines of `packages/summarize-nextflow` resolver tests). The stash itself still exists; this is a readable copy now that its tree is gone. |
| `casting.patch`, `casting-open-requirements-ledger.md` | 18 modified files; the two ledger copies were byte-identical, so one kept. |
| `glossary_sync.patch`, `egapx.patch` | Captured for completeness. `glossary_sync`'s untracked `generate-kind-manifest.ts` was **not** kept — main already has a file at that exact path. |

### Still on the table

`workflow-fixtures/pipelines/` in `issue-534` is **1.5 GB** of gitignored, refetchable data
(`workflow-fixtures/scripts/fetch.sh` from `fixtures.yaml`) — deletable without touching any work.
`node_modules` in both remaining trees is another ~1.1 GB.

Outside foundry: `~/projects/worktrees/galaxy` is **97 GB**, `foundry-lib` and
`statistical-genomics-foundry` **11 GB each** — none surveyed here.

### Script bug to fix

`scan_worktrees.sh` walks `$BASE/*/` only, so nested trees (`branch/codex/*`) and sibling roots
(`pr/`) are invisible to it. Driving a cleanup off `--safe` would have silently skipped 9 trees.
Consider `git worktree list --porcelain` as the source of truth instead of a glob.

### Script fixed (2026-09-19)

`scan_worktrees.sh` now enumerates via `git worktree list --porcelain`. Nested trees, sibling roots and
trees registered outside `$BASE` are all in scope; the main checkout is excluded; a registered-but-missing
tree is reported as prunable instead of silently counting as "no work". `FOUNDRY_WORKTREES` defaults to
the worktree root rather than `.../branch`. Added an AGE column and a `--idle` bucket so the fresh
verdict no longer depends on being run the same day a tree was created (`FOUNDRY_FRESH_DAYS`, default 3).

Verified against purpose-built cases — nested tree, tree outside `$BASE`, tree aged past the cutoff, and
a prunable entry — plus a cross-repo run (`pulsar`, `FOUNDRY_BASELINE=origin/master`, which also has a
`pr/` root the old glob would have missed). All modes exit 0; `--bogus` exits 2. `TREE_MANAGE.md`'s
"Repeating the survey" section updated to match.
