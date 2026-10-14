# Galaxy review morning check — 2026-10-14

Checked all 15 queued reviews. Every record already has an initial review, so none launched. No subagents, GitHub comments, labels, or new review worktrees created.

## Cleanup

Merged and archived: #24097, #23975, #23954, #23965. Clean worktrees removed for #24097, #23975 and #23965. #23954’s clean old-head worktree was retained under WORKTREES.md: no upstream and its head is outside the merged history; ask John before removal.

## User decisions and available reports

- [#23827 author question](https://github.com/galaxyproject/galaxy/pull/23827#issuecomment-6148458209): put the `histories/from_store_async` discarded-data policy fix and Recent Exports task-ID persistence in separate follow-ups, allowing the link-based PR to proceed? Reported fixes need verification; CI has two failures.
- [#23869 report](../../repositories/galaxy/reviews/active/23869/index.md): unposted, John has not commented/reviewed this PR; account for overlapping Marius findings and merged #24097 before posting. Compressed FASTA remains separate.
- [#23953 report](../../repositories/galaxy/reviews/active/23953/index.md): unposted approval-with-nits report; still draft.
- #23956 remains held under the explicit do-not-post instruction.
- #24005 and #23966 need changed-head verification before a fresh merge recommendation. #23966 CI is freshly queued; #24005 has two failures. Do not infer failed-check attribution from this snapshot.
- Merged #23975, #23954 and #23965 have GitHub Actions comments requesting a missing `kind/` label. No labels changed.

## Recent John push

[#23999](https://github.com/galaxyproject/galaxy/pull/23999): last commit authored by jmchilton and committed 2026-10-13T17:12:36Z, within 24 hours of the 2026-10-14T08:30:44Z check. 61 successful checks, two skipped, none failed or pending. No other tracked PR meets that author/time condition. The delivered CI-filter finding remains with the author.

## New review candidates

Descriptions below are from PR bodies, not code review. Confirmed no existing active/archived review record and no John comment/review for these five; none has a recent outstanding request to another contributor. Only #24101 directly requests John.

| PR | Author | State | Size | Description and reason |
| --- | --- | --- | --- | --- |
| [#24101](https://github.com/galaxyproject/galaxy/pull/24101) | guerler | draft | 16 files, +403/−20 | Standalone Galaxy widgets exposed by the running server, starting with History Graph. Direct request to John at 2026-10-13T20:37:18Z; leads despite draft state. |
| [#24110](https://github.com/galaxyproject/galaxy/pull/24110) | mvdbeek | draft | 3 files, +191/−13 | Shares watchdog observers to prevent watcher exhaustion from stopping TPV scheduling. Strong backend/job-handling fit; draft. |
| [#24111](https://github.com/galaxyproject/galaxy/pull/24111) | mvdbeek | draft | 37 files, +2027/−381 | Restores post-login destinations and adds configured trusted redirect hosts. Stacked on #24099; draft until that merges, with only the last two commits new. |
| [#24112](https://github.com/galaxyproject/galaxy/pull/24112) | arash77 | ready | 5 files, +45/−14 | NOMAD follow-up to merged #23975: listing costs, retry behavior, token normalization and clearer errors. Small, ready backend follow-up. |
| [#24095](https://github.com/galaxyproject/galaxy/pull/24095) | ksuderman | ready | 20 files, +874/−5 | Declarative Admin-panel link plugins, narrowed from #24019; forms and settings table deferred. Ready architectural extension point. |

Excluded #23522, #22937, #24092, #24087 and #24099 from new suggestions because John already commented/reviewed. #24090 is eligible but lower-priority UI work. Old inactive requested drafts were not surfaced.

## Full tracked snapshot

| PR | State | Draft | Head | CI |
| --- | --- | --- | --- | --- |
| #24089 | OPEN | False | `0cbea855736f` | 2 failure, 4 skipped, 57 success |
| #24097 | MERGED | False | `68e2b47adb92` | 2 failure, 1 skipped, 58 success |
| #23869 | OPEN | False | `a3b2e328f0c2` | 1 failure, 2 skipped, 55 success |
| #23999 | OPEN | False | `097f25bdbee0` | 2 skipped, 61 success |
| #23975 | MERGED | False | `70f0fde40a36` | 2 failure, 3 skipped, 58 success |
| #23827 | OPEN | False | `a113532f91e8` | 2 failure, 2 skipped, 54 success |
| #24005 | OPEN | False | `0acdecef3ce4` | 2 failure, 3 skipped, 56 success |
| #23966 | OPEN | False | `1e6c3efda7e8` | 39 queued, 2 skipped, 1 success |
| #23954 | MERGED | False | `c1ccdf4f5119` | 2 failure, 4 skipped, 65 success |
| #24018 | OPEN | True | `711d2e4f1a70` | 2 failure, 2 skipped, 51 success |
| #23223 | OPEN | True | `8afbc3efc09c` | 2 skipped, 57 success |
| #23560 | OPEN | True | `c5384b3eb3fc` | 8 failure, 2 skipped, 49 success |
| #23953 | OPEN | True | `9ac1627fc79a` | 1 failure, 1 skipped, 58 success |
| #23956 | OPEN | True | `4bf89d638bd4` | 6 failure, 2 skipped, 48 success |
| #23965 | MERGED | False | `2fa8a517b8c9` | 2 skipped, 59 success |

Current mergeability was UNKNOWN for most PRs; no merge recommendation inferred. Author fixes are not re-reviewed by this status check.

## Vault sync

Validation passes: 122 files, zero errors, 15 advisory warnings. The morning checkpoint is committed locally. Push is held because `main` has 89 unrelated commits ahead of the fetched `origin/main`; VAULT_SYNC.md forbids publishing unrelated work. Other agents’ staged and unstaged changes were preserved.
