Added a screenshot to the only browser test of README rendering on the repository page; the test had no sleeps and no selector worth sharing, so nothing else changed.

# Polish E2E tests debrief

Test: `lib/tool_shed/test/functional/test_frontend_repositories.py::test_old_revision_readme_renders_with_its_images` (Tool Shed Playwright, not Galaxy Selenium).

## Changes

- Commit `f4aecefe3e6`: after the existing `img.decode()` / `naturalWidth == 16` assertion, scroll `.repository-readme` into view and call `self.screenshot("repository_old_revision_readme")`. The decode assertion is the wait, so the screenshot is taken only once the README text is there and the old-revision logo has decoded. I checked the captured image: it shows the revision selector at `1:<hash>` with "Newer revision(s) available", the About card with "Old README for column maker.", and the 16px logo.

## Checklist

- **navigation.yml / smart components:** these don't apply. Tool Shed frontend tests use raw Playwright locators and have no shared selector module. `playwrightbrowser.py` helpers cover legacy form flows only.
- **Shared abstractions:** none added. The test uses `.repository-readme` once, and no other test references it.
- **Sleeps:** the new test has none. The assertions are retrying `expect()` calls, and `locator.evaluate` auto-waits for the element. One sleep already exists in the same file, `page.wait_for_timeout(500)` in `test_metadata_inspector_screenshots`, which waits for an expansion animation. It came from `origin/dev`, not this branch, so I left it alone.
- **Screenshots:** added, as described above.
- **Assertions:** unchanged.

## Verification

- Ran `TOOL_SHED_TEST_OMIT_GALAXY=1 PYTHONPATH=lib pytest lib/tool_shed/test/functional/test_frontend_repositories.py -k old_revision_readme`, with `TOOL_SHED_TEST_SCREENSHOTS` set: 1 passed.
- black, isort and `uvx ruff check` are clean. Pre-commit hooks passed.
