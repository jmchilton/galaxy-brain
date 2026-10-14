# Readability churn pruning — 2026-10-13

**Updated 2026-10-14:** the duplicate JS suite restoration below is superseded by the correction at the end. Current local head: `4290a9186155a299c7621c65f5196dd83bc3be21`; upstream deduplication is retained.

John requested preserving a `_with_churn` branch and removing the 77 assessed score-2 changes, while summarizing score-3 work.

Preserved `vitest_readability_with_churn` at `7f2db5e59415f07c09fec5be75ff4885fbad047e`. It is reference only, do not PR; registered in MY_BRANCHES.md. Rebuilt local `vitest_readability` at `5d87d32b2af316cf4de657ff9f033b51d60fdb40`, retaining its current upstream and accessibility base. No remote push, PR change, or downstream cascade.

## History and exceptions

The frozen scoring snapshot predates a rebase. Exact full commit messages map all 493 scored commits to the preserved current history; every score-2 patch is identical. Dropped 76 branch-exclusive commits by interactive rebase onto existing upstream base `63192fd64e46234a7a1aa933e44d8e0930112ccf`. All 417 surviving branch commits retain their complete messages and trailers. The other score-2 commit, `91618e026c85845dd1fbaaa22891993167e35d18`, already landed upstream. Explicit revert `258813e6d73` counteracts its deletion on this branch: the original 74-line CollectionProgress JavaScript suite returns alongside the TypeScript suite, duplicating four cases. This is an intentional consequence of removing that scored-2 change, not new coverage.

Five conflicts required adapting retained commits: reintroduce the completed page factory where a later retained iteration needs it; reconcile AnonymousUser imports; preserve GenericItem's local observer; preserve ChatModeSelector's inline fixtures; preserve WorkflowHelpDisplay's original sanitizer setup with the surviving typed mounts. Automatic replay additionally adapted two hunks, for seven changed surviving patches total. The mapping records each.

Independent review found ten surviving test consumers needing helpers removed with score-2 commits. Dependency-only commit `5d87d32b2af` restores chat, object-store and storage-operation fixtures, the shared observer, and extended-history factory. The page factory is also required by retained later tests. Those definitions remain because deleting them would break surviving work; the discarded test rewrites remain absent. Removing commits therefore does not mean removing every line they introduced.

Score-3, 4 and 5 work remains. The original YAML assessment is historical and keeps its snapshot SHAs; it is not rewritten to falsely score this new history.

## Verification and review

Final client run: 90 suites / 832 tests pass, exit 0. Tool Shed: four suites / 34 tests pass, exit 0. Both full frontend type checks pass; changed-file ESLint and Prettier pass, as does diff whitespace checking. Source checkout clean. Validation includes surviving shared-fixture consumers and restored JavaScript suite. No new runtime behavior or UI was introduced, so no screenshots/E2E required. No full-repository/backend suite run.

The first client typecheck exposed missing shared definitions; that run is superseded by the passing run after dependency recovery. The first test command used the pipeline's `--project unit` guidance, but lane 1 has a single-project configuration; the final passing run uses its actual configuration. Tool Shed uses `typecheck`, not the client's `type-check` script.

[Normal review](../../../../../projects/just_jesting_around/readability_assessment/prune_review.md) and [test challenge](test_challenges_debrief.md) are complete; acted on the missing dependencies, initially restored the duplicate suite under an overly literal score-cutoff interpretation (corrected below), and made no unrelated test changes. Status: ready for human review locally; existing draft remains `author_work` until the rewritten branch is published and CI settles. No approval to open another PR inferred.

## Evidence and marginal examples

- [Prune selection and snapshot/current mapping](../../../../../projects/just_jesting_around/readability_assessment/prune_plan.json)
- [Retained old/new mapping and adapted patches](../../../../../projects/just_jesting_around/readability_assessment/prune_result.json)
- [Reproducible history verifier](../../../../../projects/just_jesting_around/readability_assessment/verify_prune.py)
- [Selected validation suites](../../../../../projects/just_jesting_around/readability_assessment/prune_test_selection.json)
- [Validation results and local logs](../../../../../projects/just_jesting_around/readability_assessment/prune_validation.json)
- [Twelve representative marginal changes](../../../../../projects/just_jesting_around/readability_assessment/marginal_examples.md)

The marginal collection spans renames; already-awaited promise syntax; equivalent regex/query/matcher changes; lifecycle hygiene without an observed leak; tables for already short cases; useful fidelity fixes diluted by renaming; stronger checks capped by deleted explanation; and new coverage outside the narrow readability gate. Some warrant narrowing rather than wholesale removal. There are 177 unique score-3 commits; this is a selected collection, not measured pattern frequencies.


## Duplicate-suite correction — 2026-10-14

John clarified that the repeated CollectionProgress JavaScript suite should stay deleted. The prior literal score-cutoff interpretation was incorrect: the deletion was scored 2 for a contradicted commit-note claim, not because deleting duplicate tests was undesirable. Removed unpublished restoration commit `258813e6d73` by rebasing only the dependency repair onto its parent. Local head is now `4290a9186155a299c7621c65f5196dd83bc3be21`; the preserved `_with_churn` branch is unchanged.

Compared with the previously validated `5d87d32b2af`, the tree differs only by deleting the 74-line JavaScript duplicate. The TypeScript suite and shared dependencies are byte-identical. The 76 branch-local score-2 commits remain removed; the one upstream deduplication is an explicit exception and remains effective. No push or downstream changes.

Correction validation: retained TypeScript CollectionProgress suite passes all five tests. Independent review confirms only the duplicate JS file was deleted; the history verifier passes with upstream deduplication retained.
