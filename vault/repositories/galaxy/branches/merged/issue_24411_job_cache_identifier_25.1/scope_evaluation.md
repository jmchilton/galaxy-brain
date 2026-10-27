# Scope evaluation (round 2, after re-scope): issue_24411_job_cache_identifier_25.1

**Recommendation: keep scope.** The re-scope already did round 1's two in-branch expansions: name match for mapped requests (with a red test), and `tool_evaluator=self` on the fallback wrappers plus the comment fix. Round 1's third item, `consumes_names` in `UserToolEvaluator`, deliberately stays with the #24410 branch on dev, where it has a red test. Every other candidate is one of three kinds: pre-existing with no repro (multi-value `input11` keys, collection-output `Job.copy_from`, HDCA names that are never matched), a dev-only refactor (the JobSearch label predicate, splitting `consumes_names`), or test-helper churn. None of them clearly justifies parking the branch for a decision. Coordination note for John: merging this branch forward does **not** close #24411 for user-defined tools. The `UserToolEvaluator` one-liner must ride with #24410.

Round 1 put the branch at about 83 lines, which no longer holds. It is now 160 insertions and 8 deletions: about 22 production lines (`jobs.py` 11, model comment 7, `wrappers.py` 3, `evaluation.py` 1) and about 146 test lines (`test_jobs.py` 90, `test_workflows.py` 51, `populators.py` 5).

## Possible Decompositions

The commits, in order:
1. `78ff86441f5` Baseline tests: 100 lines, test only (`test_jobs.py` 49, `test_workflows.py` 51). They pass on base.
2. `11535a475cd` #24411 fix plus the reverse direction: the NOT EXISTS guard and `element_identifier` setting `consumes_names`, with 3 red tests.
3. `9e28638711a` Re-scope: name match for mapped requests, `tool_evaluator` on the fallback wrappers, the `copy_from` comment, `set_user_address`, and the rename red test.

The options (not ranked):
- **A. One PR:** all three commits.
- **B. Tests first:** PR 1 is commit 1, as "Add missing job cache tests". PR 2 is commits 2 and 3. PR 1 is new coverage, so it can target 25.1.
- **C. Alt cut:** PR 1 is commits 1 and 2, which is exactly alt `original_scope` (`9159432b81e`). PR 2 is commit 3, a stacked follow-up for the mapped stale-name bug.
- **D. Three PRs:** one per commit, landing in order.
- **Sub-option for B, C or D:** split the 51-line workflow baseline test (`test_workflow_rerun_mapped_identifier_step_with_use_cached_job`) out of commit 1. It exists only to show that commit 3 keeps cross-history workflow hits. It could ride with commit 3, or land on its own.

## As implemented

`JobSearch._build_stmt_for_hda` applies the name match whenever `require_name_match` is set. It requires an equal `|__identifier__` when the request has one, and the absence of one otherwise. `element_identifier` and the fallback wrappers set `consumes_names`, so identifier and name readers skip the name-agnostic late search. The model comment is corrected. There are 7 API tests: 3 baseline and 4 red-to-green.

| Pros | Cons |
| --- | --- |
| <ul><li>Covers the issue, its reverse direction (mapped reusing a plain job or another list's job), and the mapped stale-name mirror case, all in one function.</li><li>Every production change except the `evaluation.py` one-liner has a test that fails on its own without it.</li><li>The concerns raised were refuted by running them: the codex P1s and the re-scope reviewer's lost workflow hits.</li><li>Only adds cache misses, never wrong hits.</li></ul> | <ul><li>Identifier-only tools now miss on a mapped rerun after the element's dataset is renamed. That is a lost hit, not a wrong one.</li><li>It doesn't cover UDTs on its own. That needs the #24410 branch.</li><li>160 lines, mostly tests, so it's a bit more to review than a minimal 25.1 fix.</li></ul> |

## Contract: alt `original_scope`

Drop commit 3. Ship the guard and `element_identifier` → `consumes_names`, which is the branch as of `9159432b81e`.

| Pros | Cons |
| --- | --- |
| <ul><li>Smaller, and keeps cache hits for identifier-only tools after an element rename.</li><li>Already pushed as an alt, so there's nothing to build.</li></ul> | <ul><li>Leaves a known wrong-output bug, the mirror of #24411, in the same function: a mapped `$input.name` tool rerun after a rename returns the stale name. The red test confirmed it on the alt.</li><li>Leaves the incorrect "unreachable" comment in place.</li></ul> |

## Contract: issue only

Ship only the NOT EXISTS guard, which is the issue's suggested fix.

| Pros | Cons |
| --- | --- |
| <ul><li>Matches the issue text exactly, and it's the smallest diff.</li></ul> | <ul><li>The issue's claim that the reverse direction is already guarded is wrong. That would leave two known wrong-output paths: mapped reusing plain, and mapped reusing a different list.</li><li>Reviewers want related bugs in the same code fixed together.</li></ul> |

## Expand: `UserToolEvaluator` sets `consumes_names` here

Add `self.consumes_names = True` in `UserToolEvaluator` on 25.1 rather than on the #24410 branch.

| Pros | Cons |
| --- | --- |
| <ul><li>Once merged forward, it covers UDTs without depending on another branch.</li></ul> | <ul><li>There's no red test on 25.1. Plain and mapped UDT runs both render `null` there, so reusing across them produces the same output.</li><li>UDTs would lose every late-search hit on 25.1 for no observable fix there.</li><li>The #24410 branch introduces the case and can carry the red test with it.</li></ul> |

## Expand: HDCA name in the cache match

`_build_stmt_for_hdca` takes `require_name_match` but never uses it, so collection matching is purely structural. `DatasetCollectionWrapper.name` is a plain attribute holding the HDCA name, or the element identifier for a DCE, and reading it doesn't set `consumes_names`. Test tools `collection_paired_test` and `collection_record_test_two_files` echo `$f1.name`.

| Pros | Cons |
| --- | --- |
| <ul><li>It's the same class of bug as #24411, output computed from a label the request wouldn't see, for collection inputs.</li></ul> | <ul><li>It's pre-existing, sits in a builder this branch doesn't touch, and is unreproduced: no one has shown a cached hit with a stale collection name.</li><li>A fix needs both a flag-setting `name` property and a name condition inside the CTE signature builder. That's more intricate than the rest of the branch.</li><li>Better filed as an issue with a red test first, for example `collection_paired_test` on a renamed or copied HDCA.</li></ul> |

<details><summary>Details</summary>

The wrapper sets `self.name = has_collection.name` (HDCA) or `has_collection.element_identifier` (DCE) directly in `__init__`, so a Cheetah read of `$f1.name` never goes through a `consumes_names` hook. The only writers of the flag are `DatasetFilenameWrapper.element_identifier` (`wrappers.py:426`) and `DatasetFilenameWrapper.__getattr__("name")` (`wrappers.py:520`). The HDCA builder's only data condition is `a.name == k` (the parameter name) plus the structural signature. So both the first search and the late search ignore the collection's name. The likely scenario: run `collection_paired_test` on HDCA "A", then on a copy named "B" with `use_cached_job`, and the cached output says "Collection name: A". This hasn't been run. If it reproduces, that's an issue for 25.1 or dev, not grounds to park this branch.

</details>

## Expand: multi-value `input11|__identifier__` keys

Handle the identifier keys recorded for the second and later values of `multiple="true"` data params.

| Pros | Cons |
| --- | --- |
| <ul><li>Closes the last known identifier-key hole in `_build_stmt_for_hda`.</li></ul> | <ul><li>Reachability isn't established, and there's no repro.</li><li>Needs index-to-key mapping, so it's more intricate than the rest. It should start as an issue with a failing test.</li></ul> |

## Expand: collection-output `Job.copy_from` mismatch

Handle the case where a plain cached run reuses a mapped job that has a collection output (`DatasetCollection` vs HDCA → `NotImplementedError`).

| Pros | Cons |
| --- | --- |
| <ul><li>Would close a theoretical crash in the code whose comment this branch edits.</li></ul> | <ul><li>Not reproduced: the codex P1 throwaway test ran fresh on both base and tip.</li><li>It predates the branch and has no red test, so it's a follow-up candidate.</li></ul> |

## Expand much further: JobSearch restructure and test-helper consolidation

The possible work:
- unify the "label the job saw" predicate;
- add an `identifier_param_name(k)` helper for the roughly 6 `|__identifier__` literals;
- split `consumes_names` into separate name and identifier flags, plus a `require_identifier_match`, which would restore identifier-only hits after a rename;
- migrate `set_user_address` consumers;
- add a `get_invocation_jobs(tool_id=)` filter.

| Pros | Cons |
| --- | --- |
| <ul><li>A real maintainability gain. The `consumes_names` split would win back the hits commit 3 gives up.</li></ul> | <ul><li>Refactoring and rename churn on a release branch. Both thermo-nuclear rounds and the baseline-refactor review deferred it to dev.</li><li>Test-helper migrations touch unrelated tests and don't help the fix.</li></ul> |
