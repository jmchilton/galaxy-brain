# Baseline refactor

Split into refactor-first: `59598bef73a` adds `tool_form_set_switch` + `parameter_switch_label` and routes existing setters through it, then `1d2ae08fca2` adds the re-use test.

- Refactor commit = old `f056356adb7` plus the helper/target from `c51569a0ec9`; behavior-preserving for harness boolean cases and workflow rerun.
- Test commit folds `c51569a0ec9` (test, `tool_form_set_use_cached_job`) and `91a2f246e7b` (stabilized input pick, `parameter_data_select_value`).
- Final tree identical to old head `f056356adb7`. Rerun: Playwright reuse + workflow rerun boolean (2 passed); Selenium harness boolean + reuse (8 passed).
