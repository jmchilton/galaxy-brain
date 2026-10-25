# selenium_tool_form_use_cached_job

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.2...jmchilton:galaxy:selenium_tool_form_use_cached_job?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/selenium_tool_form_use_cached_job)

## Status

`ready_for_final_review`: polished, head `f62f22acedf` on `release_26.2` (`39084b89e8f`).

No PR.

Fork CI running on `f62f22acedf`.

## Polish

- [PR description](pr_description.md), [titles](pr_titles.md), [tags](pr_tags.md)
- [Polish debrief](polish_debrief.md)

## Scope

Add a missing E2E test (missing tests are bugs, so `release_26.2`): the tool form's "Attempt to re-use jobs with identical parameters?" switch. Nothing on `release_26.2` drove it from the UI.

Pulled out of [`galaxy_ui_driver`](../galaxy_ui_driver/index.md) commit `fff4be834ab` "Test the tool form's re-use equivalent jobs switch" (FAQ batch 14, `re_use_equivalent_jobs`). Ported off `tool_form_fill` (dev-only, #24331) to `tool_form_select_data`; the switch is clicked through a new `tool_form.parameter_switch_label` target instead of `_set_boolean_value`'s JS click. On restack, drop the source commit by subject and keep this branch's helper. gxui `tool-run --reuse` stays on `galaxy_ui_driver`.

## Worktree

`~/projects/worktrees/galaxy/branch/selenium_tool_form_use_cached_job/`. `.venv` and `client/node_modules` are symlinks into `galaxy_ui_driver_gxui`; never run `pnpm install` here. Client built in place. Tests use a framework-managed server; Selenium needs `GALAXY_TEST_SELENIUM_BROWSER=CHROME` and `~/.cache/selenium/chromedriver/...` on `PATH`.
