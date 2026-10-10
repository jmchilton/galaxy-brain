# selenium_stories_core — thermo-nuclear review

Ran `_shared/prompts/thermo-nuclear-code-quality-review` over `4fe00d9e7ab..d510f54c644` on 2026-10-09, weighted by `REVIEW_FOCUS.md`. Worktree `~/projects/worktrees/galaxy/branch/selenium_stories_core`, local branch `selenium_stories_core_polish`. Not pushed.

The branch had no structural regression, no file pushed past 1k lines and no ad-hoc branching in shared code. The main problem was a leaky boundary: the context reached into the story's state to number screenshots. That leak forced a counter property and setter onto the ABC, the null object, a lazy property, and a rename of `_screenshot_path`. Fixing it let most of that go. Net effect of this pass: 6 files, +68/−119.

## Changed (5 commits)
- **`7af9f3564c1`: the story allocates its numbered screenshot paths.**
  - Before, `GalaxySeleniumContext._screenshot_path` built `story.output_directory/NNN_label` and incremented `story.screenshot_counter` itself. That's why the counter property and setter sat on `StoryBase`, `Story` and `NoopStory`.
  - Now `StoryBase.screenshot_path(label, extension)` returns the next numbered path, or `None` from `NoopStory`. The counter is private to `Story`.
  - So `_screenshot_path` goes back to its original abstract name and meaning, and `_screenshots_directory_path` is gone. `framework.py` and `GalaxySeleniumContextImpl` no longer differ from dev in this area.
  - The `screenshot()` return contract hasn't changed: the story path when collecting, the usual path otherwise, `None` when neither.
  - The test of the counter setter now goes through the API: allocate twice, reset, and the next path is `000_`.
- **`94df274fbde`: story elements are dataclasses.**
  - `(Literal, str, TypedDict(total=False))` tuples, which needed a `.get("caption", "")` fallback, became the frozen `Screenshot(path, caption)` and `Documentation(markdown)`.
  - `ElementType`, `ElementMetadata` and `StoryElement` are no longer exported. They were new on this branch and had no users.
- **`efd94bd5763`: the context's story defaults to a shared stateless `NoopStory`.**
  - Once the counter left it, `NoopStory` holds no state. A class attribute `story: StoryBase = NoopStory()` replaces the lazy property, the setter and the `_story: StoryBase | None` optional.
  - `setup_selenium` still assigns a fresh `NoopStory`, as a guard against instance reuse. `73fa384ba65` rewords its comment to say so, because the old reason ("setup may screenshot before then") is now covered by the class default.
- **`cc9eb161a68`: `to_pdf_raw` cleanup uses context managers.**
  - An `ExitStack` with `TemporaryDirectory` and a self-deleting `NamedTemporaryFile` replaces the `directory_is_temp` flag, the `index = None` sentinel and the branching `finally`.
  - The one-use public `markdown_available()` is inlined.
  - This is the only change on the app's production PDF export path. It was checked against real weasyprint 70, installed into a scratch target with `DYLD_FALLBACK_LIBRARY_PATH=/opt/homebrew/lib`:
    - `to_pdf_raw` with no directory returns a PDF.
    - A two-screenshot story embeds both images and leaves no intermediate HTML.
    - `test_markdown_convert.py`, `test_story.py` and `test_markdown_export.py` pass with real weasyprint (69 tests).

## Declined
- **`enabled` and `output_directory` stay on `StoryBase`.**
  - Removing them would get rid of `NoopStory.output_directory == ""`.
  - It would cost an `isinstance(story, Story)` dispatch in `write_story` and about 8 narrowing asserts in tests, which read `case.story.output_directory`.
  - The `""` is only ever read behind `enabled`. Trading a guarded sentinel for type dispatch on a null object isn't a clear improvement.
- **`framework.py` is over 1k lines.** It was 1715 lines at the merge base, and the branch adds about 20 lines of glue. That isn't a crossing caused by this branch.
- **`run_directory` and `link_latest` live in `galaxy.selenium.stories.runs`, and the error dumper imports them from there.** They're generic run-artifact helpers. If a third consumer appears, they could move to a `galaxy.selenium` level module. With two consumers, moving them now is churn.
- **The `HTML_TEMPLATE` inline CSS sits beside `markdown_export_base.css`.** They do different jobs: on-screen page chrome against print styling for weasyprint. Sharing them would couple the two outputs.
- **`Story._generate_pdf` checks `weasyprint_available()` before `to_pdf_raw`, which checks again.** It's kept deliberately: a missing weasyprint is logged at info level, and a real render failure at warning level. Catching `ImportError` instead would use exceptions for control flow.
- **Story screenshot capture failures fail the test.** Codex already raised this and it was kept on purpose: it matches `GALAXY_TEST_SCREENSHOTS_DIRECTORY`, and swallowing the error would hide driver problems.
- **`FakeWeasyprint` is duplicated in two test files.** The standalone galaxy-selenium suite can't import `test/unit/util`, as the test challenges debrief explains.
- **`NavigatesGalaxy.screenshot(label) -> None` and `cli.py` keep the label-only signature**, as instructed.

## For John / PR description
- **Scope question:** `write_screenshot_directory_file` writes `.txt` artifacts only to `GALAXY_TEST_SCREENSHOTS_DIRECTORY`, and never into the story. Its one caller is `test_uploads.py` (`rules_example_4_8_text`, the rule source). With stories on and the screenshots directory unset, that text goes nowhere, as it did before. Should stories capture it too?
- **The "Risk Review Advice" in `old/pr_description.md` is stale.** It points reviewers at `TestWithSeleniumMixin.screenshot` / `_screenshot_path`. Routing now lives in `GalaxySeleniumContext.screenshot`, plus `StoryBase.screenshot_path`.

## Results
- Suite (`test/unit/selenium` except the driver factory, plus the markdown convert, to_html and export tests): **582 passed, 1 skipped**, the same as the baseline.
- mypy from `lib/` on `galaxy/selenium`, `galaxy/util/markdown_convert.py`, `galaxy/managers/markdown_util.py`, `galaxy_test/selenium/{framework,jupyter_context}.py` and the four branch test files: no errors in those files. 23 pre-existing errors are in unrelated modules.
- Pre-commit (black, ruff, flake8, prettier) passed on each commit.

<details><summary>Full review</summary>

**Scope:** `lib/galaxy/selenium/{context,jupyter_context}.py`, `lib/galaxy/selenium/stories/*`, `lib/galaxy/util/markdown_convert.py`, `lib/galaxy/managers/{markdown_util,configuration,notification}.py`, `lib/galaxy_test/selenium/{framework,test_tool_form}.py`, `packages/{selenium,util}/pyproject.toml`, and the four test files.

### 1. Boundary leak: the context drives the story's internals (structural, fixed)
`GalaxySeleniumContext._screenshot_path` built the numbered path from `story.output_directory` and did `self.story.screenshot_counter += 1`.
- That made the counter part of the public `StoryBase` contract: an abstract property plus setter, implemented twice, including on a null object that never uses it.
- It's also why the branch renamed the abstract `_screenshot_path` to `_screenshots_directory_path` and put a story-aware concrete `_screenshot_path` above it. Every subclass, and `write_screenshot_directory_file`, had to follow the rename.

The code judo is that the story owns path allocation. `screenshot_path(label, ext) -> str | None` returns `None` from the null object. The counter becomes private, the rename disappears, and `screenshot()` reads as "story path or usual path, copy to the usual path when both exist".

### 2. Ad-hoc element shape (type contract, fixed)
`StoryElement = tuple[Literal[...], str, TypedDict(total=False)]` overloads `str` to mean either a path or markdown. It then reads the caption with `.get("caption", "")`, a silent fallback for a key that is always set. Two dataclasses make the invariant explicit and remove the fallback and the tag comparison. Three branch-new exports go with them.

### 3. Lazy optional story property (unnecessary indirection, fixed)
`_story: StoryBase | None` plus a lazy property and setter existed only to create a per-instance null object. That was needed only because the null object carried a counter. Once it's stateless, a class-level default does the same job.

### 4. Hand-rolled cleanup in `to_pdf_raw` (legibility, fixed)
A `directory_is_temp` flag, an `index = None` sentinel, and a `finally` with two branches (rmtree versus unlink-if-exists) reimplemented what `TemporaryDirectory` and `NamedTemporaryFile` already do. `markdown_available()` was a public one-use wrapper with no other callers.

### 5. Null object carries an empty-string directory (boundary, declined)
`NoopStory.output_directory == ""` is a sentinel. It's safe only because `write_story` checks `enabled` first. The alternative, an `isinstance` in `write_story` with the ABC reduced to the collection interface, moves the smell rather than removing it, and costs test narrowing. See Declined.

### 6. File size
- `framework.py`: 1715 lines at base, about +20 from the branch. This was already past the limit and isn't attributable to the branch.
- `story.py` is about 230 lines and `context.py` about 105. Both are fine.

### 7. Layering and packaging
- Moving `to_html`/`to_pdf_raw`/`weasyprint_available` into `galaxy.util.markdown_convert` is the right home: `galaxy-selenium` can't depend on `galaxy-app`.
- The `markdown-convert` extra keeps Markdown optional for galaxy-util and keeps weasyprint out, which matches `conditional-requirements.txt`.
- The `markdown_util` imports were updated in place. There's no re-export shim, and the PR description records that as a risk.

### 8. Glue in `selenium_test`
- The `try/except/else` loop puts `write_story` at three exits: success, skip, and final failure. `reset` runs only on retry.
- It's direct, and `test_selenium_test_decorator.py` covers it. Lifting it into a helper would need the error dumper injected, as the test challenges debrief says.
- No change.

### 9. Tests
- No tests were weakened. The only edit replaced setting and reading the counter with an API-level check that numbering restarts after `reset`, and added `NoopStory.screenshot_path is None`.

</details>
