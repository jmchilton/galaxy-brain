# Initial implementation debrief

```
created /home/ubuntu/projects/repositories/galaxy-brain/vault/repositories/galaxy/branches/active/issue_24600_pulsar_none_extra_files_25.1/differential-review/snapshots/20261101T144740Z-implementation-0f3ed112d3f0.json
  implementation @ 0f3ed112d3f0 vs origin/release_25.1 (merge-base 32317280ecb5)
  first snapshot: 3 commits, 4 files, 4 hunks
```

## Fix

When Pulsar returns no rewrite for a dataset's path, `PulsarComputeEnvironment.input_extra_files_rewrite` and `output_extra_files_rewrite` (`lib/galaxy/jobs/runners/pulsar.py`) now return `dataset.extra_files_path`. This happens with `default_file_action: none`, a per-path `none`, or a `rewrite` action that leaves the path unchanged. Previously the hooks crashed slicing `None`. `path_rewrites_input_extra` records nothing in that case, since there is nothing to stage. Both hooks are now annotated `-> str`.

## Decisions

- **Base `release_25.1`.** The bug is present there unchanged; on 25.1 the only callers are `$x.extra_files_path` / `$x.files_path` in `wrappers.py`. 25.1 shipped 2025-12-12 and is the oldest release in the 1-year window, and the fix is small.
- **The hooks return the local path, not `None`.** This departs from the issue proposal. On 25.1 every extra-files hook returns a `str`, including `SharedComputeEnvironment`'s, and every caller uses the result directly. On dev, merged-forward callers such as `tools/runtime.py` (Directory paths) and `_bundle_path_rewrite` (typed `str`) then work with no changes, so a single-file fix also covers the Directory and data-manager cases after merge-forward. It also matches the primary-path fallback: with no false path, the wrapper uses `dataset.get_file_name()`.
- **New integration module `test_pulsar_embedded_none_local_metadata.py`** (with a `remote_metadata: false` job conf, the setup from the #21566 report), running `composite` and `composite_output_tests`. I didn't extend `test_pulsar_embedded_none.py` because its conf has `remote_metadata: true`, and under `none` remote `set_meta` never runs: Pulsar doesn't stage `metadata/set.py`. That breaks every job's metadata, which composite outputs need. `markdown_report_extra_files` also fails there for a third `none` gap (`$__tool_directory__` rewritten to an unstaged `tool_files`). Both are queued as `issues_incubator/incubating/pulsar_none_remote_metadata_unstaged/`.
- **Sample job_conf comment drift (from the issue's "Related" section) is left out.** It's a separate docs follow-up.

## Testing

- Unit: `test/unit/app/jobs/test_pulsar_compute_environment.py` builds a real `PulsarComputeEnvironment` with the real `PathMapper`/`FileActionMapper`. The baseline commit has the transfer and path-changing rewrite cases, which pass before the fix. The fix commit adds the `none` and unchanged-`rewrite` cases, which fail before it.
- Integration: the new module fails 2/2 without the fix (job errors before running, `exit_code: None`) and passes 2/2 with it. The existing `test_pulsar_embedded_none.py` still passes.

## Process note

Before the coordinator's warning, a mistaken `git stash pop` applied another worktree's stash (issue_24474's `basic.py` WIP) to this worktree. I restored it to the shared stash list by SHA (`c4c78f502cd`). That worktree has since committed its work. This branch is unaffected.
