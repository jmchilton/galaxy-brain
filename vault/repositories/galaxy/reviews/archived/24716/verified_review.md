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

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at low effort. Verified via claude-opus-5-5 at medium effort.

</details>
