# Initial review: galaxy#24716

- Profile: `default`
- Model: claude-opus-5-5
- Effort: medium
- Reviewed commit: `79c6aac67bbd04a94e8fbd704cd3e92b07740c5d` (base `release_26.2`)

## Verdict

Correct fix, fine to merge as is. No P1 or P2 findings; two optional P3s below.

`user_tool_tool_filters` exists nowhere else in the tree. The three new option names match `config_schema.yml`, `GalaxyAppConfiguration` and `UserAPIController._get_filter_types`, so the allow-list now agrees with what the preferences form offers. The allow-list stays enforced: a preference outside it is still refused.

## Verification

- `test_toolbox_filters.py` and `test_users_toolbox_filters.py` pass at the PR head (9 passed).
- Running the new tests against the base `filters/__init__.py`: `test_user_preference_filters_allowed_by_config` fails with `Refusing to load tool filter`, so the test is a true red-to-green. `test_user_preference_filters_not_allowed_by_config` passes on both, as expected for a guard on the refusal path.
- Section and label behavior is unchanged: their old f-string names equal the new literals.
- Tests were run with another worktree's venv and the base module loaded by a scratch script, leaving this worktree untouched. No Selenium or API test was run.

## Findings

### P3 1: Preference-to-config mapping now lives in two places

`build_filters` gains a third parallel variable in an `if/elif` chain mapping preference name to category and config option. `UserAPIController._get_filter_types` (`lib/galaxy/webapps/galaxy/api/users.py:1241`) already maps the same three preference names to the same three options, and `users.py` already imports `FilterFactory` from this module. The bug came from these names being derived separately from that mapping, and the fix still leaves two copies that can drift.

A module-level table in `filters/__init__.py` would replace the chain and the empty-string sentinels, and `_get_filter_types` could build from it:

```python
USER_FILTER_PREFERENCES = {
    "toolbox_tool_filters": ("tool", "user_tool_filters"),
    "toolbox_section_filters": ("section", "user_tool_section_filters"),
    "toolbox_label_filters": ("label", "user_tool_label_filters"),
}

for name, (category, config_option) in USER_FILTER_PREFERENCES.items():
    value = trans.user.preferences.get(name)
    if value and value.strip():
        validate = getattr(trans.app.config, config_option, [])
        self.__init_filters(category, listify(value, do_strip=True), filters, validate=validate)
```

The minimal diff is a reasonable choice for a release-branch bug fix, so this could also go to `dev` as a follow-up.

### P3 2: New test repeats the position assertion the file's TODO calls out

`test_user_preference_filters_allowed_by_config` asserts `filters["tool"][-1].__doc__`, the pattern `test_custom_filters` flags with a TODO as an implementation detail. The same test compares full doc lists for section and label. Something like this drops the position dependence:

```python
assert [f.__doc__ for f in filters["tool"] if f.__doc__] == ["Test Filter Tool"]
```

This also fails if a filter gets loaded twice, which `[-1]` would miss.

## Checked, no finding

- **Filter application:** the panel and the flat `/api/tools` listing both go through `_build_filter_method`, so an allowed tool filter takes effect in both, as admin `tool_filters` already do.
- **Stale preferences:** anyone who enabled a tool filter since 18.01 will now see it applied after upgrading. That is what they asked for, and the PR describes the old behavior as the bug.
- **Test level:** a unit test fits this lookup. The Selenium `test_toolbox_filters.py` covers only section filters, and the code past the lookup is shared with admin filters.

## Outside this PR

Both are pre-existing in code the PR doesn't touch, and neither is a request for this PR.

- `__init_filters` tests `filter in self.default_filters`, whose keys are `tool`, `section` and `label`. A stored preference value of `tool` skips the allow-list and raises `KeyError` from `build_filter_function` (reproduced by calling `build_filters` directly; not traced whether the API can store that value).
- `ToolsService.search_tools` checks only `allow_user_access`, not `FilterFactory`, so filtered tools can still come back as server search hits. Not traced through the client.
