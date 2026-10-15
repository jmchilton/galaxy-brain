Revives the core of 🔀 #21199: browser tests and `gx-dump-tour` runs write their screenshots up as Markdown, HTML and PDF stories.

Galaxy's browser tests call `self.screenshot()` about 400 times, and 8 tests carry the `gtn_screenshot` marker because they exist to produce Galaxy Training Network screenshots. All of it lands in one flat directory of loose PNGs, with no order and no text. `gx-dump-tour` has the same problem: it writes `0.png`, `1.png`, … and leaves the tour's text behind. With this branch, set `GALAXY_TEST_STORIES_DIRECTORY` and each `@selenium_test` writes a story, and every `gx-dump-tour` run writes one. Here's `gx-dump-tour config/plugins/tours/core.history.yaml`:

![story.html written by gx-dump-tour for the History tour](screenshots/story_html_core_history.png)

Each tour step becomes a screenshot with its target highlighted, captioned with the step title and followed by the step text. A test works the same way: its docstring is the introduction, each screenshot's caption is a heading, and `self.document()` adds narration between screenshots. Here's `test_run_apply_rules_tutorial`:

![story.html written by test_run_apply_rules_tutorial](screenshots/story_html_apply_rules_tutorial.png)

```
$GALAXY_TEST_STORIES_DIRECTORY/
├── TestLoggedInToolForm_test_run_apply_rules_tutorial_<timestamp>_<id>/
│   ├── story.md
│   ├── story.html
│   ├── story.pdf        # when weasyprint can load
│   ├── 000_rules_apply_rules_example_4_1_input_paste.png
│   └── ...              # numbered in the order they were taken
├── TestLoggedInToolForm_test_run_apply_rules_tutorial_<timestamp>_<id>.zip
└── latest -> TestLoggedInToolForm_test_run_apply_rules_tutorial_<timestamp>_<id>
```

***This is test and developer tooling. Server behavior and the tours users see don't change; server modules only change where they import from.*** Tour loading and markdown conversion move below `galaxy-app` only so that `galaxy-selenium`, which can't import `galaxy-app`, can load a tour and render a story itself.

***A story complements the error directory and Playwright traces; it doesn't replace them.*** Those record a failure for debugging. A story is an ordered, captioned document of a whole run, meant to be read, from either backend. #23851 just gave tours highlighted targets. This turns that into one command that shows a whole tour, and gives `gtn_screenshot` tests a captioned draft instead of loose PNGs.

***No test output changes unless `GALAXY_TEST_STORIES_DIRECTORY` is set, and CI doesn't set it.*** The one exception is failure error-directory names (see Risks). Without the variable the story is a null object, and the tour callback returns before any highlighting runs. `GALAXY_TEST_SCREENSHOTS_DIRECTORY` keeps working as before.

***Writing a story never changes a test's result.*** A story that can't be written is logged, and the test's real exception is never replaced. Turning stories on does make every `screenshot()` call capture, so a capture error fails the test, just as it does today with `GALAXY_TEST_SCREENSHOTS_DIRECTORY` set.

***This is the core only.*** Besides the tour tests, the only test that changes is `test_run_apply_rules_tutorial`, which gets full captions so stories have a consumer in the tree. The other 7 `gtn_screenshot` tests produce stories with headings taken from their labels until someone captions them. Story sections, data/upload narration and the rule-builder tutorial generator from #21199 aren't part of this.

<details><summary>What changes in the test API</summary>

- `screenshot(label, caption=None)`. The caption defaults to the label. With stories on, the image goes into the story directory as `NNN_<label>.png`. If `GALAXY_TEST_SCREENSHOTS_DIRECTORY` is also set, it gets a copy rather than a second capture, because the page has moved on.
- `document(markdown)` adds narration between screenshots. It does nothing when stories are off.
- `selenium_test` writes the story on success, on skip and on final failure. A failed run ends with a "Test Failed" note that quotes the exception and names the run's error directory, when one was written. On retry the story is reset, so screenshots from the discarded attempt stay out of the document and the zip.
- `test_run_apply_rules_tutorial` captions all 15 screenshots and narrates two steps. Its `_tool_apply_with_source` helper now takes `(label, caption)` pairs.

</details>

<details><summary>Tours</summary>

- `StoryTourCallback` (`galaxy/selenium/stories/tours.py`) adds each step to the context's story: a highlighted screenshot, then the step's text. The stock tour tests' callback subclasses it, so with stories on they narrate the four stock tours.
- `gx-dump-tour` is built on the same callback. Each run gets its own story directory under `-o` (default `tour_dumps`), plus a `latest` link. When a walk fails or is interrupted, the steps it reached are still written, with a "Tour Failed" marker. The command prints where that partial story went and re-raises the error. If the story itself can't be written, the command fails. This also fixes two bugs: the old `%s` epoch timestamp, and the unformatted "exists" error.
- `cli.DriverWrapper` is now a `GalaxySeleniumContext`, so it shares `screenshot()`, `document()` and URL building with the test framework. It drops its own copies.
- `load_tour_steps`, `load_tour_from_path` and `get_tour_id_from_path` move from `galaxy.tours._impl` to `galaxy.navigation.tours`. The tours registry, `validate.py` and `run_tour` now share one loader, so `run_tour` sees normalized steps (`intro` → `content`, with `title_default` applied).
- Selenium's `highlight_element` skips an element that has gone stale instead of raising, which matches how Playwright treats a detached handle. A live `test_core_history` run with stories on hit this under Selenium at "Dataset information", where the history item re-renders after upload.

</details>

<details><summary>Packaging</summary>

- `to_html`, `to_pdf_raw` and `weasyprint_available` move from `galaxy.managers.markdown_util` into a new `galaxy.util.markdown_convert`, along with `markdown_export_base.css`. The CSS is a pure rename, and its `MANIFEST.in` entry moves from galaxy-app to galaxy-util. `galaxy-selenium` can't import `galaxy-app`.
  - It's a new module rather than `galaxy.util.markdown`, because `galaxy.datatypes` imports that module on the metadata path, and a top-level `import markdown` there would load Markdown on every `set_metadata`.
  - The new extra `galaxy-util[markdown-convert] = ["Markdown"]` is now required by `galaxy-selenium`. weasyprint stays optional (cairo/Pango, #9651), and a story without it is written without `story.pdf`.
- `galaxy-test-selenium` gets its own package test suite (`test/unit/test_selenium/`, linked from `packages/test_selenium/tests`), which holds the `selenium_test` decorator tests.
- That suite surfaced a separate bug. Since #23525, `galaxy_test.base.api` imports `galaxy.celery` at module level, so it, and everything that imports it, fails to import from the published packages, because galaxy-test-base doesn't depend on galaxy-app. The import now happens inside the `celery_parameters` fixture. This piece can be split into its own PR if preferred.
- `dump_test_information` now shares the run-directory and `latest` helpers with stories.

</details>

## Risks

The one-way doors are small and in packaging and the CLI. `galaxy-selenium` gains a hard Markdown dependency. `to_html` leaves `galaxy.managers.markdown_util`. `gx-dump-tour`'s output layout changes.

<details><summary>Risk Details</summary>

- `to_html` leaves the `galaxy.managers.markdown_util` namespace with no re-export. `to_pdf_raw` and `weasyprint_available` are still imported there, and none of the three was in `__all__`. Nothing in this repository imports `to_html` from the old path.
- Installing `galaxy-selenium` now pulls in Markdown, which is pure Python. weasyprint stays optional.
- `gx-dump-tour -o` now names the parent of per-run directories, not the output directory itself. The default is now `tour_dumps`, and PNGs have numbered names such as `000_step_0.png`.
- `cli.DriverWrapper.target_url` is gone in favor of the context's `url` and `target_url_from_selenium`.
- Error-directory names change shape, from `<test><YYYYmmddHHMM><epoch>` to `<test><YYYYmmddHHMMSS>_<id>`. They're created by `tempfile.mkdtemp`, so their mode is 0700. The `latest` symlink is unchanged.
- `screenshot()` gains an optional `caption`. Overrides with the old signature still work unless a caller passes a caption.
- With stories on, the tour tests highlight each step's target while they walk the tour.

</details>

<details><summary>Risk Review Advice</summary>

Check the `selenium_test` wrapper in `lib/galaxy_test/selenium/framework.py`. `write_story` should run on success, on skip and on final failure, and `story.reset()` should run only on retry. Then check `GalaxySeleniumContext.screenshot` in `lib/galaxy/selenium/context.py`, which decides where an image goes when one directory, both or neither is set. For the CLI, read `dump_tour()` in `lib/galaxy/selenium/scripts/dump_tour.py`, which writes the partial story on failure and lets a story write error fail the command on success.

</details>

## Context

Builds on 🔀 #23851, which added tour target highlighting and the E2E tour abstractions this narrates. Part of the rescue of the closed draft 🔀 #21199. This is its core, re-derived against current `dev` rather than rebased. Story sections, story data/upload narration and the rule-builder tutorial generator are separate follow-ups, each landing with its own consumer.

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Kept the core as one unit, with deferred pieces landing alongside their own consumers.</summary>

- Weighed caption/narration for the other `gtn_screenshot` tests, folding in sections, upload narration or the tutorial generator, splitting the markdown move back out, a `markdown_util` re-export, leaving `dump_test_information` alone, and making capture purely observational. Each was deferred or rejected.
- The markdown move stays because it has no "why" on its own. Capture errors still fail the test, matching `GALAXY_TEST_SCREENSHOTS_DIRECTORY`, and that behavior is disclosed above.
- Tour narration was added after the evaluation, at the author's direction, so stories reach below the test framework.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>Found no structural regression. It fixed one leaky boundary, for a net −51 lines.</summary>

- The context used to number screenshots by reaching into the story's counter. Now the story allocates its own numbered paths, and the counter is private.
- Story elements became frozen dataclasses instead of tagged tuples.
- The context's story defaults to a shared, stateless `NoopStory`, replacing a lazy property and setter.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Dropped three tautological tests, strengthened others, and added browserless tests of the decorator glue.</summary>

- Dropped tests that only exercised a property setter or constant properties.
- Unique run directories are now tested with time frozen, and red-checked. weasyprint fakes became a small dataclass.
- Added `selenium_test` glue and screenshot-routing tests that run without a browser. They now make up the galaxy-test-selenium package suite.

</details>

### ✅ Second Frontier Model Review

<details><summary>Four findings: three fixed red-to-green, one kept on purpose.</summary>

- An unusable stories directory now disables the story instead of erroring the test.
- Alt text is escaped and image file names are URL-quoted.
- Story screenshot routing moved into the base context instead of being duplicated in the test mixin.
- Kept: capture errors still fail the test with stories on, as they do with the screenshots directory.

</details>

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? The test result is unchanged. A failed test's story ends with its exception and error directory. A failed tour's story is partial and says where it stopped. Story write failures and unusable directories are logged, and missing weasyprint skips only `story.pdf`.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. They write real stories through the real `selenium_test`, `run_tour` and `dump_tour`, and check the markdown, HTML, zip contents, retry discards, `latest`, and that the original exception survives. Only the browser is stubbed.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).
- [x] Instructions for manual testing are as follows:

<details><summary>Tests and manual runs</summary>

- `test/unit/selenium/test_story.py` covers the story model and run lifecycle. `test_tours.py` covers the tour loader and `StoryTourCallback`, and `test_dump_tour.py` covers per-run directories, `latest`, partial stories on failure or Ctrl-C, and write failures. `test_has_driver.py` covers stale highlights, and `test_context.py` covers `DriverWrapper` as a context.
- `test/unit/test_selenium/test_selenium_test_decorator.py` covers the `selenium_test` glue, the failure note and screenshot routing.
- `test/unit/util/test_markdown_convert.py` covers `to_pdf_raw(directory=)`, cleanup, and missing weasyprint.
- Manual tour runs, against a running Galaxy:

  ```sh
  gx-dump-tour config/plugins/tours/core.history.yaml --backend playwright --selenium-headless --galaxy_url http://localhost:8080
  open tour_dumps/latest/story.html
  ```

- Manual test runs:

  ```sh
  GALAXY_TEST_STORIES_DIRECTORY=/tmp/stories pytest lib/galaxy_test/selenium/test_tool_form.py::TestLoggedInToolForm::test_run_apply_rules_tutorial
  open /tmp/stories/latest/story.html
  ```

- The screenshots above come from these runs under Playwright: `core.history` wrote 19 steps, and the tutorial test passed with 15. With weasyprint installed, the same stories rendered `story.pdf`, with one captioned screenshot per page.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
