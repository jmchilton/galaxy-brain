# Filtered findings: galaxy#24716

- **Shared preference-to-config table for `build_filters` and `UserAPIController._get_filter_types`** (`default`, P3): not actionable on this release-branch fix. It is a behavior-free refactor that would widen a 6-line `tool_util` fix into the users API, and the names are now correct literals, so it fixes no defect. It could go to `dev` as a follow-up if wanted; no issue was drafted.
- **Stored preference value `tool` skips the allow-list and raises `KeyError`** (`default`, outside this PR): pre-existing in `__init_filters`, which the PR doesn't touch.
- **`ToolsService.search_tools` doesn't apply `FilterFactory`** (`default`, outside this PR): pre-existing in code the PR doesn't touch, and not traced through the client.
