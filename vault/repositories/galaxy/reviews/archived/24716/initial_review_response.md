

<details><summary>Automated Review Details</summary>

Reviewed with [John's Galaxy Brain Review Factory](https://galaxy-brain.jmchilton.net/factory/galaxy-reviews/).

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via claude-opus-5-5 at medium effort.
- Review profile [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) was run via claude-opus-5-5 at low effort.
- Review profile [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) was run via claude-opus-5-5 at low effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via claude-opus-5-5 at medium effort.

</details>

<details><summary>Risks</summary>

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door): reverting the lookup restores the old behavior, and no API, schema, or stored data changes.

The one behavior to expect at upgrade: on servers that set `user_tool_filters`, tool filter choices users saved while they had no effect will start applying, so those users may see fewer tools until they clear them. Servers that don't set the option are unaffected, and section and label filters already resolved to the right option names.

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/galaxy/tree/pr_24716_review_0) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

[`pr_24716_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24716_review_0) starts from the reviewed commit [`79c6aac67bb`](https://github.com/jmchilton/galaxy/commit/79c6aac67bb) and only changes the PR's new tests. It moves their repeated preference setup into a helper and replaces the tool filter's position check with a comparison of the filters the preference added.

- [`14b1a7b7b58`](https://github.com/jmchilton/galaxy/commit/14b1a7b7b58) Share filter preference test setup, compare only added tool filters: adds `trans_with_filter_preferences(factory)` to `test_toolbox_filters.py` and makes the allowed-filters test fail if the tool filter is loaded twice.

</details>

</details>

### P3 1: New tests repeat their setup and assert the tool filter by position (implementation verified)

Both new tests repeat the same `trans` setup and preference dict. `test_user_preference_filters_allowed_by_config` also checks `filters["tool"][-1]`, the order dependence that the `TODO` in `test_custom_filters` calls an implementation detail. That check still passes if the tool filter is loaded twice.

<details><summary>Evidence</summary>

With `build_filters` changed to load tool preference filters twice, the PR's version of the test file still passes (5 passed). With the assertion below, `test_user_preference_filters_allowed_by_config` fails. It also still fails with the pre-fix lookup restored, and `test_user_preference_filters_not_allowed_by_config` still fails with validation disabled.

These runs used another worktree's venv with pytest plugin autoload and conftest disabled, because that venv has no libpq. The mutation runs used a scratch export of the commit.

</details>

Move the setup into a `trans_with_filter_preferences(factory)` helper and compare only the filters the preference added. Commit `14b1a7b7b58` on `pr_24716_review_0` does this:

```python
added_tool_filters = [f for f in filters["tool"] if f not in factory.default_filters["tool"]]
assert [f.__doc__ for f in added_tool_filters] == ["Test Filter Tool"]
```

Fixed on the review branch in [`14b1a7b7b58`](https://github.com/jmchilton/galaxy/commit/14b1a7b7b58).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at low effort. Verified via claude-opus-5-5 at medium effort.

</details>
