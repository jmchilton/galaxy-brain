# Scope evaluation: issue_24411_job_cache_identifier_25.1

**Recommendation: expand modestly.** Keep both current fixes (the NOT EXISTS guard, and `element_identifier` setting `consumes_names`). Add two small fixes on 25.1 in the same cache-matching code, and settle where a third belongs. (1) Require a name match for mapped requests too, so a mapped rerun after renaming the element's dataset stops reusing a stale job for `$input.name` tools. `model_attributes` plus `rename_dataset` give a cheap red test. (2) Pass `tool_evaluator=self` in `__populate_input_dataset_wrappers`, and correct the "unreachable" comment in `model/__init__.py` (~1771), which was already wrong; the new `cat1` baseline test contradicts it. (3) The UDT half: this branch alone does **not** cover user-defined tools. `UserToolEvaluator` never sets `consumes_names`, so UDTs always take the name-agnostic late search, which skips the guard. #24410's branch feeds the mapped identifier in through `ElementIdentifierMapper` and `to_cwl`/`runtimeify`, not `DatasetFilenameWrapper`. So after both land on dev, a plain UDT run will still reuse a mapped UDT job (`sample_a` instead of `null`). The fix is one line (`consumes_names = True` in `UserToolEvaluator`), but it has no red test on 25.1, because mapped and plain UDT runs both render `null` there. Land it on the #24410 branch with a red test there, unless a 25.1 `basename`-after-rename repro turns up, in which case it lands here. Leave the multi-value `input11|__identifier__` keys and the JobSearch refactors (identifier-key helper, unified label predicate, `consumes_names` rename) as dev follow-ups.

The branch is about 83 lines (8 production, 75 test), under the 100-line threshold, so there's no decomposition section. The expansion would add about 5 production lines and 1 API test here.

## As implemented

Two production changes on `release_25.1`. `JobSearch._build_stmt_for_hda` gets a NOT EXISTS on `<k>|__identifier__` when the request has no identifier and `require_name_match` is set. `DatasetFilenameWrapper.element_identifier` sets `consumes_names`, so identifier-reading jobs skip the name-agnostic late search. There are 5 API tests: 2 baseline and 3 red-to-green.

| Pros | Cons |
| --- | --- |
| <ul><li>Fixes the issue and its reverse direction (mapped reusing plain, mapped reusing a different list's job).</li><li>Tiny diff, easy backport, reviewed clean (normal, codex, thermo-nuclear).</li><li>Each production change has its own failing test.</li></ul> | <ul><li>The guard lives only in the `require_name_match` search. UDTs never set `consumes_names`, so their late search bypasses it, and the #24410 case stays broken after merge-forward.</li><li>The mapped path still has no name condition. That is the mirror of the bug being fixed, in the same function.</li><li>Leaves the stale model comment in place. It was already wrong, and the new `cat1` baseline test contradicts it.</li></ul> |

## Contract: issue only (drop the `wrappers.py` change)

Ship only the NOT EXISTS guard, which is what the issue proposes. The reverse direction (mapped reusing plain or another list) goes to its own issue.

| Pros | Cons |
| --- | --- |
| <ul><li>Smallest possible diff, matches the issue text exactly.</li></ul> | <ul><li>The issue's claim that "reverse direction is guarded" is wrong. Shipping half would leave a known wrong-output bug in the same feature.</li><li>Reviewers prefer related bugs fixed together. The fix is 3 lines and already tested.</li></ul> |

## Expand modestly (recommended)

As implemented, plus: (1) in `_build_stmt_for_hda`, apply the name conditions whenever `require_name_match` is set, not only when the request has no identifier. (2) `__populate_input_dataset_wrappers` passes `tool_evaluator=self`, and the stale model comment is fixed. (3) `UserToolEvaluator` sets `consumes_names = True`. That one goes to the #24410 branch on dev, where it has a red test, unless a 25.1 repro turns up.

| Pros | Cons |
| --- | --- |
| <ul><li>Covers every route by which the cache can serve output computed from a different label (name or identifier) than the request would see: plain and mapped, XML and UDT.</li><li>With (3) on #24410, the guard covers UDTs on dev, not just XML tools.</li><li>All in code the branch already touches or the same `consumes_names` contract. Each item is a line or two.</li><li>Only adds cache misses, never wrong hits.</li></ul> | <ul><li>Fewer cache hits: identifier-only tools miss on a mapped rerun after an element rename, and UDTs lose the name-agnostic late search.</li><li>(3) has no red test on 25.1, so splitting it across branches means coordinating with #24410.</li><li>More to re-review and re-harden.</li></ul> |

<details><summary>Details</summary>

**(1) Rename + mapped `$input.name`.** The normal review flagged this. In `_build_stmt_for_hda` the `if identifier:` branch adds only the identifier join; `name_condition` / `hda_history_join_conditions` live in the `elif require_name_match:` arm. A tool reading `$input1.name` (`model_attributes`), mapped over a list, then rerun mapped after `rename_dataset` on the element HDA, matches on identifier alone and gets the old name. Restructure as `if require_name_match: <name conditions>` plus `if identifier: <join> elif require_name_match: <NOT EXISTS>`. That's the same symmetry the thermo-nuclear review praised, and it removes the last asymmetry. Test: `test_cached_job_mapped_run_skips_renamed_element` next to the new tests, modelled on `test_tools.py::test_run_identifier_single_use_cached_job_renamed_input`.

**(2) Small consistency fixes.** `__populate_input_dataset_wrappers` (`evaluation.py:532`) builds `DatasetFilenameWrapper` without `tool_evaluator`, so name or identifier reads there never set `consumes_names`. It's a one-argument fix in the same contract. The `model/__init__.py` comment claims relaxed matching never finds map-over jobs; the `cat1` baseline test shows it does. No test is needed for either.

**(3) `UserToolEvaluator`.** UDT inputs go through `to_cwl` (`workflow/modules.py`) or `runtimeify`, not `DatasetFilenameWrapper`. So `consumes_names` stays `False`, and `JobWrapper` (`jobs/__init__.py:1303`) always reruns the search with `require_name_match=False`, which skips the new guard.
- **dev + `udt_element_identifier_api_test` (verified from that diff):** the mapped identifier is fed in via `ElementIdentifierMapper.identifiers_by_dataset_id` into `setup_for_runtimeify`/`to_cwl` `properties["element_identifier"]`. Nothing there touches `consumes_names`. So a plain UDT run (`null`) can be served from a mapped UDT job (`sample_a`). That's #24411's UDT case, and merging this branch forward doesn't close it.
- **25.1:** mapped and plain UDT runs both render `null` for the identifier, so reusing across them gives identical output; there's no bug to show. A stale `basename` after a rename is possible only when `created_from_basename` is unset; that's unverified, and uploads usually set it.

A conservative `self.consumes_names = True` in `UserToolEvaluator` (e.g. in `build_param_dict`) closes the dev case. The red test is a `test_unprivileged_tools.py` UDT reading `$(inputs.x.element_identifier)`, run mapped then plain with `use_cached_job`, on the #24410 branch. Checking precisely which fields the expression reads would keep more hits, but that is dev work.

</details>

## Expand further: multi-value identifier keys

Also handle `multiple="true"` data params, where values after the first are recorded as `input11|__identifier__` etc. Neither the existing positive identifier check nor the new guard looks at those keys.

| Pros | Cons |
| --- | --- |
| <ul><li>Closes the last known identifier hole in `JobSearch`.</li></ul> | <ul><li>Predates the branch, and reachability isn't established: a `multiple` input given an HDCA is searched as `hdca`, not per-HDA with identifiers.</li><li>Needs key mapping from value index to the `input1N` naming, which is more intricate than the rest.</li><li>No repro yet. Should start as an issue with a failing test.</li></ul> |

## Expand much further: JobSearch restructure

Unify the "label the job saw" predicate into one helper, add a shared `|__identifier__` key helper (about 6 literals in `managers/jobs.py` plus actions), rename `consumes_names` to something like `consumes_input_labels`, or record `__identifier__` for every data input.

| Pros | Cons |
| --- | --- |
| <ul><li>Real maintainability win; makes writer/reader coupling explicit.</li><li>Recording identifiers everywhere would let name and identifier matching merge.</li></ul> | <ul><li>Refactor and rename churn on a stable branch. Thermo-nuclear and baseline-refactor reviews both deferred it to dev.</li><li>Recording more parameters changes stored job state, and old jobs would need handling.</li></ul> |
