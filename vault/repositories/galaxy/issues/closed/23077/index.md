# galaxy#23077 — param_value filter options are not refreshed after switching into second-level nested conditional branch - potential UI bug

[Issue](https://github.com/galaxyproject/galaxy/issues/23077)

Branch `issue_23077_nested_param_value_filter` — Not depth-specific: tool form build (`populate_model`) gave every inactive `when` an empty state, so a `param_value` ref to a sibling in the same case resolved to `None` and the filter returned `[]`; refs to a parent in the active case still resolved, which is why the reporter's third layout worked. The client never rebuilds on a conditional switch (test param hardcoded `:refresh-on-change="false"` in `FormInputs.vue`), so the stale empty options stuck. Fix records each leaf's initial value into the case state as it is built; API (`build` endpoint) test red→green, framework test tool `filter_param_value_nested_conditional`. State: one commit on `release_26.1` `7ca102fe1f2`, pushed to `jmchilton`, **no PR**.

Closed 2026-09-28.
