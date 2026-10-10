# selenium_stories_core — Codex review

Codex (`codex exec -s read-only`) reviewed `4fe00d9e7ab..6eb1473d1c7` and reported 4 findings. I verified each one against the code. 3 are fixed and 1 is deliberately left as is.

- **Fixed: `f2314c5047e`.** An unusable `GALAXY_TEST_STORIES_DIRECTORY`, for example `/dev/null`, made the test error before its body ran.
  - `story_for_run` now logs and falls back to `NoopStory`, which matches how `write_story` never raises.
  - This settles the open question from polish. The old PR description said "an unwritable stories directory fails the test before its body runs", and the branch agent should update that.
- **Fixed: `369df1a9b70`.** An unmatched `]` in a caption, or a `#`, `?` or space in a label, broke the image reference. Alt text is now escaped and the basename is URL-quoted.
- **Fixed: `d510f54c644`.** Only `TestWithSeleniumMixin` knew where story screenshots go, and it duplicated `screenshot()`.
  - The story/legacy path choice and the copy step now live in the base `GalaxySeleniumContext`. Subclasses supply only `_screenshots_directory_path`, and the mixin's copies are deleted.
  - Side effect: a standalone or Jupyter context with an assigned story also copies `<label>.png` into the current directory. In-tree code never assigns a story there.

Not acted on:
- **Story screenshot capture failures fail the test.** Turning stories on makes every `screenshot()` call capture, so a capture error fails or retries the test. `GALAXY_TEST_SCREENSHOTS_DIRECTORY` already behaves this way, and swallowing capture errors would hide real driver problems. I kept it intentionally.

Verification: red-to-green tests for each fix. The suite (`test/unit/selenium` except the driver factory, plus the markdown tests) has 582 passed and 1 skipped. mypy is clean for the touched modules. PDF output with quoted image src wasn't checked because weasyprint isn't in the venv.

<details><summary>Full Codex findings</summary>

```json
{
  "coverage": {
    "files_reviewed": [
      "lib/galaxy/managers/configuration.py",
      "lib/galaxy/managers/markdown_util.py",
      "lib/galaxy/managers/notification.py",
      "lib/galaxy/managers/markdown_export_base.css",
      "lib/galaxy/selenium/context.py",
      "lib/galaxy/selenium/jupyter_context.py",
      "lib/galaxy/selenium/stories/__init__.py",
      "lib/galaxy/selenium/stories/runs.py",
      "lib/galaxy/selenium/stories/story.py",
      "lib/galaxy/selenium/navigates_galaxy.py",
      "lib/galaxy/selenium/has_driver.py",
      "lib/galaxy/selenium/has_playwright_driver.py",
      "lib/galaxy/selenium/has_driver_proxy.py",
      "lib/galaxy/selenium/cli.py",
      "lib/galaxy/util/markdown_convert.py",
      "lib/galaxy/util/markdown_export_base.css",
      "lib/galaxy/util/resources.py",
      "lib/galaxy/util/sanitize_html.py",
      "lib/galaxy_test/selenium/framework.py",
      "lib/galaxy_test/selenium/test_tool_form.py",
      "packages/selenium/pyproject.toml",
      "packages/util/pyproject.toml",
      "packages/app/pyproject.toml",
      "packages/test_selenium/pyproject.toml",
      "packages/package.Makefile",
      "packages/package-build-install.sh",
      "packages/package-pyproject.toml",
      "packages/pyproject.toml",
      "packages/README.md",
      "test/unit/app/managers/test_markdown_to_html.py",
      "test/unit/app/managers/test_markdown_export.py",
      "test/unit/selenium/test_selenium_test_decorator.py",
      "test/unit/selenium/test_story.py",
      "test/unit/util/test_markdown_convert.py",
      "pyproject.toml",
      "pytest.ini",
      "conftest.py"
    ],
    "notes": "All changed files reviewed. The 37 focused unit tests passed. Native PDF rendering was not exercised because WeasyPrint is absent; PDF tests use stubs. Built-wheel contents were not verified."
  },
  "findings": [
    {
      "severity": "P1",
      "category": "correctness",
      "file": "lib/galaxy_test/selenium/framework.py",
      "line": 326,
      "title": "Story initialization errors prevent the test from running",
      "detail": "story_for_run() creates directories through os.makedirs() and tempfile.mkdtemp(), but this call occurs before the wrapper's try block and has no exception protection. The protection in write_story() only covers finalization. An artifact-directory error therefore changes the test result instead of falling back to NoopStory.",
      "failure_scenario": "Set GALAXY_TEST_STORIES_DIRECTORY=/dev/null and invoke a decorated test that simply returns successfully. The wrapper raises FileExistsError before executing the test body. Reproduced with the actual decorator.",
      "confidence": "certain"
    },
    {
      "severity": "P1",
      "category": "correctness",
      "file": "lib/galaxy_test/selenium/framework.py",
      "line": 559,
      "title": "Story screenshot failures become test failures",
      "detail": "Enabling stories activates save_screenshot() even when the legacy screenshots directory is unset. Capture, directory creation, and copying are unprotected, so their exceptions enter selenium_test's failure/retry handling. Catching finalization errors does not protect these collection operations.",
      "failure_scenario": "With stories enabled and GALAXY_TEST_SCREENSHOTS_DIRECTORY unset, an otherwise passing test calls screenshot('home'). If capture raises or the story directory becomes unwritable, the test fails or retries. With stories disabled, the same screenshot call returns without capturing and the test passes. Reproduced with save_screenshot raising OSError.",
      "confidence": "certain"
    },
    {
      "severity": "P2",
      "category": "correctness",
      "file": "lib/galaxy/selenium/stories/story.py",
      "line": 178,
      "title": "Unescaped captions and filenames produce broken screenshot references",
      "detail": "The image Markdown interpolates the caption and basename verbatim. An unmatched closing bracket in a plain-text caption terminates the alt-text syntax, while URL-significant filename characters such as '#' are interpreted as fragments rather than filename characters.",
      "failure_scenario": "screenshot('home', 'Click ] to close') produces ![Click ] to close](000_home.png), which to_html() renders as literal text with no image. Separately, screenshot('home#details', 'Details') produces src=\"000_home#details.png\", which requests 000_home rather than the saved 000_home#details.png.",
      "confidence": "certain"
    },
    {
      "severity": "P2",
      "category": "reuse",
      "file": "lib/galaxy/selenium/context.py",
      "line": 55,
      "title": "Standalone contexts collect screenshots that their stories cannot include",
      "detail": "Story-aware path selection exists only in TestWithSeleniumMixin._screenshot_path(), alongside a duplicate screenshot implementation. The shared context records screenshots into its assigned story, but GalaxySeleniumContextImpl still saves them as label.png in the working directory. Story rendering and archiving look for that basename inside output_directory, so this reusable API loses its images.",
      "failure_scenario": "Assign Story('Standalone', '', '/tmp/run') to a GalaxySeleniumContextImpl while its working directory differs from /tmp/run, then call screenshot('home') and finalize(). home.png is saved outside the story directory; the HTML references a missing image and the zip contains only story.md and story.html. Reproduced using the actual context and finalizer.",
      "confidence": "certain"
    }
  ]
}
```

</details>
