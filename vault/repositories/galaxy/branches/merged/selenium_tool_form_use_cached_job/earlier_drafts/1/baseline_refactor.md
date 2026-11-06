# Baseline refactor

No refactoring of the base branch was performed.

Branch is 2 commits, +41 lines, all additive (two `navigation.yml` targets, `tool_form_set_switch` / `tool_form_set_use_cached_job` helpers, one test). Nothing changes existing code, so there's no refactor to land on `release_26.2` first. Splitting the helpers into their own commit would only add callerless infrastructure ahead of the test, not restructure base behavior. Head unchanged: `91a2f246e7b`.
