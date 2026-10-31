### P3 1: Strip still handles only the first `$tool_directory` entry and not `${tool_directory}` (implementation verified)

The strip removes only the first `$tool_directory` occurrence and ignores the `${tool_directory}` brace form that `string.Template` also accepts. A destination that lists a subpath (`$tool_directory/data:/data:ro`) alongside `$tool_directory:ro`, or uses braces, still leaks a literal into the container command for tools without a tool directory - the same failure mode this PR fixes. The logic predates the PR but lives in the exact block being changed.

<details><summary>Evidence</summary>

On the PR head with `tool_directory=None` (Docker and Singularity):

- `"${tool_directory}:ro,$working_directory:rw,$job_directory:rw"` -> `${tool_directory}:ro` kept
- `"$tool_directory:ro,$working_directory:rw,$tool_directory/data:/data:ro,$job_directory:rw"` -> second entry kept

Both added as parametrizations of `test_tool_directory_stripped_without_tool_directory`; 4 cases red on the PR head, green after the fix.

</details>

Replace the index slicing with a per-entry filter when `tool_directory` is unresolved. It is shorter than the index arithmetic and no longer leaves a leading comma for `preprocess_volumes` to clean up. Fine to defer to `dev` if you'd rather keep the release fix one character.

<details><summary>Details</summary>

```python
if "tool_directory" not in variables:
    volumes_str = ",".join(
        v for v in volumes_str.split(",") if "$tool_directory" not in v and "${tool_directory}" not in v
    )
```

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>
