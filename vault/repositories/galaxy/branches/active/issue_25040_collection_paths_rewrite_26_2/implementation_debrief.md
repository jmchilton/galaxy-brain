# Implementation debrief

**STATUS: READY.** PR [#25049](https://github.com/galaxyproject/galaxy/pull/25049) is open against `release_26.2`, out of draft, at the request of John. It is offered as an alternative to mvdbeek's [#25048](https://github.com/galaxyproject/galaxy/pull/25048), which fixes the same bug with the same core approach.

Base `release_26.2` (`3dcb0584c40`), head `80fe612c98d`, 6 commits, 9 files.

```
created /home/ubuntu/projects/repositories/galaxy-brain/vault/repositories/galaxy/branches/active/issue_25040_collection_paths_rewrite_26_2/differential-review/snapshots/20261122T193816Z-revision-80fe612c98dc.json
  revision @ 80fe612c98dc vs origin/release_26.2 (merge-base 3dcb0584c409)
  since 20261122T173325Z-hardening-cd4d46bb801a:
    commits: 0 same, 5 rebased, 1 changed, 0 new, 0 dropped
    hunks:   18 carried, 2 changed, 0 new, 0 dropped
    changed 80fe612c98dc Route collection and metadata file path accessors through the compute environment (2 differing hunks)
```

## What changed since the hardening hand-off

- **Scope decision:** kept as hardened. The stale collection-name length allowance in `get_all_staging_paths` is deferred to a follow-up PR (it changes export filenames for very long identifiers); the PR's Risks section names it.
- **Rebased** onto the current `release_26.2`. The base's `pulsar.py` changes (per-handler persistence directories) don't touch compute-environment rewrites.
- **Integration test hardened with two checks adapted from #25048** (folded into the fix commit, test-only):
  - the per-element reference paths must sit in Pulsar's staging directory (the parent of the job's `working` directory), replacing "not under Galaxy's `file_path`";
  - `$single.serialize()["source_path"]` must equal `$single`.
- The [revision review](subagents/revision_review.md) caught a Cheetah bug in the second check (`$x.serialize()["k"]` prints the dict plus a literal subscript); fixed with `${...}`, and added a guard that the job directory is `working`.

## Comparison with #25048

Same fix at the core (rows from element wrappers, `str(element)` paths, input-only `input_metadata_rewrite`, model property removed). #25048 has no behaviour this branch lacks. This branch additionally keeps elements with repeated identifiers, never loads or rewrites metadata on path-only accessors (Pulsar `rewrite_parameters` would stage every unused metadata file), shares one metadata rewrite helper with `$input.metadata.<file>`, caches rows and metadata files per wrapper, and fixes the nested `include_collection_name` layout. Overlap with #25023 (since reworked) and #25021 is named in the PR's Context.

## Validation at head

- Pulsar `rewrite_parameters` integration test passes; with base `lib` code it fails at `ALL_PATHS` (object store path vs `pulsar_staging`).
- `test/integration/test_remote_files.py` (16) and unit tests (`test_wrappers.py` + mapping: 59 passed, 17 skipped) pass on the rebased head before the test-only fixup.
- `mypy` over `lib` and `test`: clean. ruff/black clean.
- [PR checklist](pr_checklist.md): all six items pass.
- Earlier reviews and hardening debriefs still apply (the lib code is unchanged since hardening): see the [previous debrief](earlier_drafts/2/implementation_debrief.md).

## PR

- Description: [pr_description.md](pr_description.md) (no Human Review section: `human_review.md` doesn't exist and John asked for the PR directly). Titles: [pr_titles.md](pr_titles.md). Labels: [pr_tags.md](pr_tags.md), applied.
- CI not yet seen.
