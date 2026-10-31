(space for John's free style comments - just keep empty)

<details><summary>Automated Review Details</summary>

Reviewed with [John's Galaxy Brain Review Factory](https://galaxy-brain.jmchilton.net/factory/galaxy-reviews/).

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via Claude Opus 5.5 at medium effort.
- Review profile [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) was run via Claude Opus 5.5 at low effort.
- Review profile [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) was run via Claude Opus 5.5 at low effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via Claude Opus 5.5 at medium effort.

</details>

<details><summary>Risks</summary>

Profile: gx_risk_assessment · Model: Opus 5.5 · Effort: low · Reviewed commit: e085821c3565

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door). It is a one-character off-by-one fix (`> 0` to `>= 0`) so an unresolved `$tool_directory` volume listed first in a container volumes string is stripped like it already was in any other position, plus unit tests.

<details><summary>Risk Review Advice</summary>

When stripped from the front, the expanded string starts with a leading comma (the new test filters empty entries), so reviewers may confirm downstream volume parsing tolerates empty entries for both Docker and Singularity, as it already must for the stripped-at-end case. Note this targets release_26.1; deployments that had `$tool_directory` first previously got a literal unresolved volume and now get it dropped, which is the intended behavior.

</details>

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/galaxy/tree/pr_24610_review_0) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

# review_0 branch — PR #24610

Branch [`pr_24610_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24610_review_0) (from `e085821c3565`, pushed to `jmchilton/galaxy`) replaces the single-occurrence `$tool_directory` index slicing in `HasDockerLikeVolumes._expand_volume_str` with a per-entry filter, so every unresolved `$tool_directory` / `${tool_directory}` volume entry is dropped for tools without a tool directory. Two new parametrizations of the PR's test cover the brace form and a second subpath entry; they were red on the PR head and pass with the fix (12 passed; module doctests, ruff, black clean).

- [`963d461f102`](https://github.com/jmchilton/galaxy/commit/963d461f10260935d30691adc5fbeeed8ec4f49c) Strip every unresolved $tool_directory volume entry, brace form too — per-entry filter plus brace-form and multi-entry test cases (P3 1).

</details>

</details>

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

Fixed on the review branch in [`963d461f102`](https://github.com/jmchilton/galaxy/commit/963d461f10260935d30691adc5fbeeed8ec4f49c).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>
