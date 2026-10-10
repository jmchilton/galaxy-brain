Turn the screenshots Galaxy's browser tests already take into documents - set `GALAXY_TEST_STORIES_DIRECTORY` and each `@selenium_test` writes a story.

Galaxy's Selenium/Playwright tests call `self.screenshot()` 383 times, and `pytest.ini` has a `gtn_screenshot` marker for tests that exist to produce Galaxy Training Network screenshots. Today all of that comes out as a flat directory of loose PNGs. With this branch, a run of `test_run_apply_rules_tutorial` produces:

```
$GALAXY_TEST_STORIES_DIRECTORY/
├── TestLoggedInToolForm_test_run_apply_rules_tutorial_<timestamp>_<id>/
│   ├── story.md
│   ├── story.html
│   ├── story.pdf        # when weasyprint can load
│   ├── 000_rules_apply_rules_example_4_1_input_paste.png
│   ├── 001_rules_apply_rules_example_4_2_input_rules.png
│   └── ...              # 15 screenshots, numbered in the order they were taken
├── TestLoggedInToolForm_test_run_apply_rules_tutorial_<timestamp>_<id>.zip
└── latest -> TestLoggedInToolForm_test_run_apply_rules_tutorial_<timestamp>_<id>
```

The test's docstring becomes the introduction, `document()` adds narration, and each screenshot's caption becomes a heading:

```markdown
# test_run_apply_rules_tutorial

Build a list of datasets from a pasted table, then reshape it with Apply Rules.

Each step is captured so that this test doubles as the Apply Rules tutorial.

Start from a table of URLs. The rule builder maps its columns onto a collection, and the **Apply Rules** tool then reshapes that collection without copying any data.

## The example table pasted into the rule builder

![The example table pasted into the rule builder](000_rules_apply_rules_example_4_1_input_paste.png)

## Column A mapped to the URL, column B to the list identifier
...
```

***No test output changes unless `GALAXY_TEST_STORIES_DIRECTORY` is set, and CI doesn't set it*** (apart from failure error-directory names, below). Without it the story is a null object. `GALAXY_TEST_SCREENSHOTS_DIRECTORY` keeps working as before, and with both set it still gets every screenshot (copied, not captured a second time).

***Writing a story never changes a test's result.*** If finalizing fails, the error is logged. The test isn't retried because of it, and the real test exception isn't replaced. `dump_test_information` already follows the same rule.

***weasyprint stays optional; without it a story is written without its PDF.*** `galaxy-selenium` gains only a Markdown dependency.

***This is the core only.*** No browser test besides `test_run_apply_rules_tutorial` changes. The other `gtn_screenshot` tests produce stories too, and get headings from their labels until someone adds captions. Story sections, the standalone tutorial generator and the upload narration from the closed 🔀 #21199 aren't part of it.

<details><summary>What changes in the test API</summary>

- `screenshot(label, caption=None)`. The caption defaults to the label. With stories on, the file goes into the story directory as `NNN_<label>.png`.
- `document(markdown)` adds narration between screenshots. It does nothing when stories are off.
- `test_run_apply_rules_tutorial` captions all 15 screenshots and narrates two steps, so the feature has a consumer in the tree. Its `_tool_apply_with_source` helper now takes `(label, caption)` pairs.
- On retry the story is reset, so a discarded attempt's screenshots don't reach the document or the zip. They stay on disk in the run directory. A failed run gets a "Test Failed" note appended.

</details>

<details><summary>Why the markdown conversion moves into <code>galaxy.util</code></summary>

`galaxy-selenium` depends on `galaxy-navigation` and `galaxy-util`, never on `galaxy-app`, so it can't import `galaxy.managers.markdown_util`. The first commit moves `to_html`, `to_pdf_raw` and `weasyprint_available` into a new `galaxy.util.markdown_convert`, with `markdown_export_base.css` beside it. The CSS change is a pure rename plus whitespace from the prettier pre-commit hook.

- The new module is separate from `galaxy.util.markdown` because `galaxy.datatypes` imports that module on the metadata path. A top-level `import markdown` there would load Markdown on every `set_metadata`.
- New extra `galaxy-util[markdown-convert] = ["Markdown"]`, which `galaxy-selenium` now requires. weasyprint deliberately stays out of it, because `conditional-requirements.txt` keeps it optional (cairo/Pango, #9651). A story without weasyprint is written without its PDF.
- `to_pdf_raw` gains `directory=`, so weasyprint resolves the story's relative image paths. The intermediate HTML is removed afterwards.
- `dump_test_information` now shares the run-directory and `latest` helpers with stories. Its error directories get a unique suffix, so a name collision can't crash the dump. The old `%Y%m%d%H%M%s` format appended epoch seconds; the new one uses `%S`.

</details>

## Risks

Two small one-way doors in packaging: `galaxy-selenium` gains a hard dependency on Markdown, and `to_html`/`to_pdf_raw`/`weasyprint_available` leave `galaxy.managers.markdown_util` with no re-export.

<details><summary>Risk Details</summary>

- Code outside this repository that imports those three functions from `galaxy.managers.markdown_util` breaks. Nothing in this repository still does.
- Installing `galaxy-selenium` now pulls in Markdown (pure Python). weasyprint stays optional.
- `screenshot()` gains an optional argument. Subclasses that override it with the old signature still work unless a caller passes a caption. `JupyterContextImpl` is updated. `NavigatesGalaxy.screenshot` and the `cli.py` driver wrapper keep the label-only signature; nothing calls them with a caption.
- Error-directory names change shape, from `<test><YYYYmmddHHMM><epoch>` to `<test><YYYYmmddHHMMSS>_<id>`. Anything that parses those names would need updating. The `latest` symlink is unchanged.
- The test-side wiring only runs with the variable set, and rolling it back is a revert.

</details>

<details><summary>Risk Review Advice</summary>

Look at the `selenium_test` wrapper in `lib/galaxy_test/selenium/framework.py`: when `write_story` runs on success, on skip and on final failure, and that `story.reset()` happens only on retry. Then check `TestWithSeleniumMixin.screenshot` / `_screenshot_path`, which decide where screenshots go when one or both directories are set.

</details>

## Context

Part of the rescue of the closed draft 🔀 #21199 (test stories). This is the core piece, re-derived against current `dev` rather than rebased. Story sections, story data/upload narration and the rule-builder tutorial generator are separate follow-ups, each landing with its own consumer.

## John's Checklist

- [x] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? The test result is unchanged. A failed story write is logged, a missing weasyprint skips only `story.pdf`, and a failed test's story ends with a "Test Failed" note. An unwritable stories directory fails the test before its body runs.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. They write real stories to disk and check the markdown, HTML, zip contents, retry discards and `latest` link. PDF rendering is driven through the real `to_pdf_raw` with a stub weasyprint.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).
- [x] Instructions for manual testing are as follows:

<details><summary>Tests and manual run</summary>

- `test/unit/selenium/test_story.py`: the story document model and run lifecycle (directory per run, `latest`, failure note, write failures swallowed, retry leftovers excluded from the zip).
- `test/unit/util/test_markdown_convert.py`: `to_pdf_raw(directory=)`, cleanup on success and on error, and the missing-weasyprint path.
- Manual: `GALAXY_TEST_STORIES_DIRECTORY=/tmp/stories pytest lib/galaxy_test/selenium/test_tool_form.py::TestLoggedInToolForm::test_run_apply_rules_tutorial` under Playwright, then open `/tmp/stories/latest/story.html`.
- `story.pdf` was checked with weasyprint 70 against real PNGs. Both images are embedded and captions and narration render in order. The unit tests also pass with a real weasyprint installed.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
