# Initial review — PR #24610 (default profile)

- Profile: [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md)
- Model: Claude Opus 5.5 (`claude-opus-5-5`), effort medium
- Reviewed commit: `e085821c3565e51a3998271cbd7e9d1f6c9ec78d` (diff vs `origin/release_26.1`)

## Verdict

Approve. Correct one-character off-by-one fix (`> 0` -> `>= 0`) in `HasDockerLikeVolumes._expand_volume_str`, appropriate for a release branch, with a focused regression test. The leading comma left behind when the first entry is removed is dropped by `preprocess_volumes` (`if v` filter, already commented "this happens for tools without tool directories"). One optional P3 below.

## Verification

- New tests pass: `test/unit/tool_util/test_container_volumes.py` 8 passed (run with the main galaxy checkout's `.venv`, `PYTHONPATH=lib` from the PR worktree; the worktree has no `.venv`).
- The two "first" cases fail on base by inspection: `find()` returns 0 there and the old `> 0` guard skipped it.
- Probed remaining edge cases on the PR head with `tool_directory=None` (Docker):
  - `"$tool_directory:ro"` -> `""` (ok)
  - `"${tool_directory}:ro,$working_directory:rw"` -> `"${tool_directory}:ro,/w:rw"` (not stripped)
  - `"$tool_directory:ro,$tool_directory/x:/x:ro,$working_directory:rw"` -> `",$tool_directory/x:/x:ro,/w:rw"` (second entry survives)

## Findings

### P3 1: Strip is still single-occurrence, `$`-form only

The strip handles only the first `$tool_directory` occurrence and not the `${tool_directory}` brace form that `string.Template` also accepts. A destination listing a subpath (`$tool_directory/foo:/foo:ro`) alongside `$tool_directory:ro`, or using braces, still leaks a literal into the container command for tools without a tool directory, which is the same failure mode the PR fixes. Pre-existing behaviour, but it lives in the exact block being fixed, and a per-entry filter fixes all cases while being simpler than index arithmetic:

```python
if "tool_directory" not in variables:
    volumes_str = ",".join(
        v for v in volumes_str.split(",") if "$tool_directory" not in v and "${tool_directory}" not in v
    )
```

Fine to take as-is on `release_26.1` and leave this for `dev`; not a merge blocker.

## Notes (no action)

- Tests exercise private `_expand_volume_str` directly; acceptable here since full container command construction would need much more setup, and the parametrization covers Docker and Singularity and first/middle/last positions plus the keep case.
- Test asserts after filtering empty entries, matching how `preprocess_volumes` consumes the string.
- Imports at module top; no doctests added; comments minimal.
