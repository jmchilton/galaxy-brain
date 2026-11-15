# Screenshot debrief

Screenshots successfully obtained.

Recorded by the branch's own E2E tests (`test_tool_help_markdown_relative_images`, `test_tool_help_rst_relative_images`, which now call `self.screenshot(...)`) during the [E2E polish](polish_e2e_tests_debrief.md) run at `5ac56b5994a`. That tree is identical to the current head `349c6fd7abc` (the baseline refactor only reordered commits), so they weren't re-recorded.

| File | Shows |
| --- | --- |
| `screenshots/selenium_tool_form_help_markdown_relative_images.png` | Markdown help, 4 images: relative to the tool, bare name from `static/images/`, beside the tool, SVG (Selenium, Chrome) |
| `screenshots/selenium_tool_form_help_rst_relative_images.png` | RST help, 3 images: bare name, `static/images/` path, `$PATH_TO_IMAGES/` prefix (Selenium, Chrome) |
| `screenshots/playwright_tool_form_help_markdown_relative_images.png` | Same as the Markdown one, Playwright |
| `screenshots/playwright_tool_form_help_rst_relative_images.png` | Same as the RST one, Playwright |

The fixture images are plain 32x32 squares; the SVG was a transparent 1x1 until the E2E polish made it visible.
