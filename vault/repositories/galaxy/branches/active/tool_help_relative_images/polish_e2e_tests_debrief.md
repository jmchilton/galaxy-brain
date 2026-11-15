Added screenshots to the two tool form help image E2E tests and made the test SVG visible. Nothing else needed polish. Both tests pass on the Selenium (Chrome) and Playwright backends.

Commit `5ac56b5994a` "Screenshot tool form help images; make test SVG visible", pushed to `jmchilton/tool_help_relative_images`.

## Changes

- **Screenshots.** These are the only E2E tests over tool help images. `test_tool_help_markdown_relative_images` and `test_tool_help_rst_relative_images` now capture `tool_form_help_markdown_relative_images` and `tool_form_help_rst_relative_images`. The shared helper returns the loaded images and scrolls the first one into view, so the footer Help section is in frame.
- **Test SVG.** `static/images/help_image.svg` was a transparent 1x1. It passed the `naturalWidth > 0` check but showed nothing in a screenshot, so it is now a filled 32x32 square, the same size as the PNGs. No test depends on its bytes: the API test checks only status, Content-Type and CSP.

## Checked, no change needed

- **Selectors.** The tests already go through `tool_form.help_image` in navigation.yml, and that selector is scoped by the branch's new `data-description="tool form help"`. There is no raw CSS in the tests.
- **Shared abstractions.** One helper serves both tests. The `execute_script` image-loaded check is used only here and nothing like it exists in `lib/galaxy/selenium`, so it stays in the test file rather than moving to `NavigatesGalaxy`.
- **Sleeps.** There are none. The tests use `wait_for_present` plus `@retry_assertion_during_transitions`.
- **DOM decoration or client refactor.** Neither would improve the tests. The help container already has a `data-description`, and the images come from user help HTML, so per-image attributes would mean changing the sanitized content.

## Verification

- Playwright: both tests passed. The markdown test was re-run after the SVG change. I viewed the screenshots: 4 images in the markdown help (including the SVG) and 3 in the RST help.
- Selenium with `GALAXY_TEST_SELENIUM_BROWSER=CHROME` and headless `auto`, chromedriver via Selenium Manager: both tests passed and the screenshots looked right.
- Both ran on an embedded Galaxy from the test framework (random port, `sample_tool_conf.xml`) against a fresh `make client` build.
- ruff, black and pre-commit are clean.
