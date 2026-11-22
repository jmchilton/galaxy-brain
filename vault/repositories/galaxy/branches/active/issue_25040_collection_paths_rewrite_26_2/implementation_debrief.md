# Implementation debrief

**STATUS: BLOCKED.** Parked on a scope decision. The second scope evaluation recommends one more small change, and under the workhorse rules a second recommendation parks the branch instead of re-scoping again. The work itself is complete, reviewed and green.

Fixes [#25040](https://github.com/galaxyproject/galaxy/issues/25040). Base `release_26.2` (`4cc69d30122`), local head `cd4d46bb801`, 6 commits, 9 files, +449/−88.

```
created /home/ubuntu/projects/repositories/galaxy-brain/vault/repositories/galaxy/branches/active/issue_25040_collection_paths_rewrite_26_2/differential-review/snapshots/20261122T173325Z-hardening-cd4d46bb801a.json
  hardening @ cd4d46bb801a vs origin/release_26.2 (merge-base 4cc69d30122e)
  since 20261122T162806Z-implementation-5543883b6622:
    commits: 0 same, 2 rebased, 3 changed, 1 new, 2 dropped
    hunks:   14 carried, 4 changed, 2 new, 0 dropped
    changed 777d96e2af97 Baseline tests for collection and dataset wrapper path accessors (1 differing hunk)
    changed fece82a987e2 Put the collection name once at the top of nested staging paths (1 differing hunk)
    new     e486edd1465d Build collection path accessors from the element wrappers
    changed cd4d46bb801a Route collection and metadata file path accessors through the compute environment (6 differing hunks)
```

**Pushed** to the fork at `cd4d46bb801` (2026-11-22, approved by John); issue note posted: https://github.com/galaxyproject/galaxy/issues/25040#issuecomment-7084235946. The alt `issue_25040_collection_paths_rewrite_26_2_alt_original_scope` (`d525f5da834`) is pushed.

## Commits

1. `777d96e2af9` Baseline tests: they pin `all_paths`, `all_metadata_files`, `serialize()`, `data_style="paths"`, repeated identifiers and flat `include_collection_name` without rewriting. Green on base.
2. `fece82a987e` Put the collection name once at the top of nested staging paths. Self-contained; applies to 25.1–26.1. Covered by an `export_remote` integration test.
3. `023fd402d11` Extract `_job_metadata_path` (refactor, no behavior change).
4. `39d9792a984` Build collection staging JSON from the wrapper rows directly (refactor).
5. `e486edd1465` Build collection path accessors from the element wrappers (refactor): cached `_DatasetRow`s and a per-wrapper metadata cache. It deletes the model property `DatasetCollection.element_identifiers_extensions_paths_and_metadata_files`. Paths are still Galaxy-side.
6. `cd4d46bb801` The fix (19 lib lines): row paths come from `str(element)`, and input metadata files go through `input_metadata_rewrite`. Includes the Pulsar integration test and the framework tool.

## Choices

- Paths come from the per-element wrappers, which already carry the compute environment's rewrites, so every accessor matches `#for $e in $collection`. Element identifiers come from the collection wrapper's own list, so `consumes_identifiers` doesn't change and repeated identifiers are kept.
- Paths-only accessors never load metadata, so Pulsar isn't asked to stage files a tool doesn't read. Metadata is loaded and rewritten once per wrapper and handed out as fresh lists. Output wrappers keep Galaxy-side metadata paths.
- The model property is deleted: it had no callers and its name was the bug. This differs from the issue text, which said to keep it.
- Base `release_26.2`: the bug is on every supported release, but the fix is intricate. The nested-prefix commit is the piece that would backport.

## Decision needed

1. **Scope.** The [second scope evaluation](scope_evaluation.md) recommends dropping the stale per-segment collection-name length allowance in `get_all_staging_paths`, inside commit 2. As it stands, a 240-character identifier is truncated only when "include collection name" is set, and a collection name of about 252+ characters fails with `AssertionError` in `export_remote`. The change would alter export filenames for identifiers over about 240 characters. Optional extras: take the staging extension from `element.file_ext`, and fix the neighbouring `export_remote` test's `infiles` parameter. Options: apply it to commit 2, leave it for a follow-up, or ship the [original-scope alt](alts/original_scope.md).
2. **Overlap with mvdbeek's drafts.** #25023's `fee0cf0ff4` is the same accessor fix, with the three bugs this branch fixed. #25021 overlaps the Pulsar integration test's intent. Coordinate which lands, or ask #25023 to drop `fee0cf0ff4`.
3. **Packaging.** One PR, or baseline + nested-prefix first? See "Possible Decompositions" in `scope_evaluation.md`.

## What still applies and what remains

- Still valid for any scope option: [normal review](subagents/normal_review.md), [re-scope review](subagents/rescope_review.md), round 2 [test challenges](test_challenges_debrief.md), [performance](performance_challenges_debrief.md), [Codex](codex_review.md) (at `64d66d54ec3`), [thermo-nuclear](thermo_nuclear_review.md), [baseline refactor](baseline_refactor.md). Round 1 is under [earlier_drafts/1/](earlier_drafts/1/).
- Validated at head: unit tests (`test/unit/app/tools/` + mapping, 1056 passed), the Pulsar `rewrite_parameters` integration test, the `export_remote` integration tests (10), the related framework tool tests (23), `make format`, and `make mypy` (clean).
- If the allowance change is applied: update the baseline assertion that pins the allowance, add a long-identifier/long-name test, rerun `test_wrappers.py` per commit plus the `export_remote` integration tests, and take a revision snapshot.
- Then force-push the revision to the fork.
