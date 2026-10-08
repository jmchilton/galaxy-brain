*Opened by Claude (AI assistant) on behalf of @jmchilton.*

Removes the "Selenium tests" workflow (`.github/workflows/selenium.yaml`). The Playwright workflow runs the same `lib/galaxy_test/selenium` tests on every PR, so the Selenium job mostly ran each E2E test a second time: 3 shards plus a client build on every PR.

***The Selenium backend isn't removed. `./run_tests.sh -selenium` still works locally, and nothing in `lib/galaxy/selenium` or the tests changes.***

***Integration Selenium is unaffected. It already runs on the Playwright backend (`GALAXY_TEST_DRIVER_BACKEND: playwright`).***

## What loses CI coverage

Only the three tests marked `@selenium_only`, which Playwright skips:

| Test | Why it's Selenium-only |
| --- | --- |
| `test_histories_list.py` `test_tags` | Tag editor selectors don't resolve under Playwright |
| `test_history_pages.py` `test_drag_drop_visual_feedback` | Needs a held-drag gesture |
| `test_library_contents.py` `test_import_dataset_from_path` | Splits row text into cells, `KeyError: 'Name'` under Playwright |

Fixes to run all three under Playwright are in progress. The `writing_tests.md` Selenium CI section now says Selenium isn't run in CI and to run `@selenium_only` tests locally when touching their pages.

## Notes

- "Selenium tests" isn't a required status check on `dev`, so branch protection needs no change.
- The removed workflow carried the temporary SSE/notification env flags from `cc289e93f18`. `playwright.yaml` and `integration_selenium.yaml` still set them, so that shakedown keeps running.
- The weekly scheduled run (extended metadata, outputs in working directory) was also on `playwright.yaml`, so it isn't lost.

## How to test the changes?
- [x] This is a refactoring of components with existing test coverage.

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
