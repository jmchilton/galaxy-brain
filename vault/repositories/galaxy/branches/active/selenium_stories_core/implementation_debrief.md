# selenium_stories_core — implementation debrief (recovery 2026-10-09)

**STATUS: READY.** Scope stays as implemented. The fork has `233a2dc31e8`, rebased onto dev `df3932ed4ba`. John force-pushed it over `73fa384ba65`, the pre-rebase stack.

## What the recovery did
The branch predated the after-plan process. It ran each step in turn, and each one has its own debrief:
- [Initial implementation](initial_implementation_debrief.md): reconstructed from git history and the old polish debrief.
- [Test challenge](test_challenges_debrief.md):
  - Dropped 3 tautological tests and replaced the `SimpleNamespace` fakes with dataclasses.
  - Re-added `test_selenium_test_decorator.py`, which covers the `selenium_test` story glue (success, skip, final failure, retry discard, stories off) on the real mixin with no browser.
- [Codex review](codex_review.md): 3 of 4 findings fixed.
  - An unusable stories directory now falls back to `NoopStory` instead of erroring the test.
  - Image alt text and src are escaped.
  - Story screenshot routing moved to the base `GalaxySeleniumContext`, so standalone and Jupyter contexts work.
  - Kept as is: with stories on, a failed screenshot capture still fails the test. `GALAXY_TEST_SCREENSHOTS_DIRECTORY` already behaves that way.
- [Thermo-nuclear review](thermo_nuclear_review.md): 5 refactors, +68/−119.
  - The story now allocates its own numbered paths, so the public counter is gone.
  - Elements are frozen dataclasses.
  - The context defaults to a stateless `NoopStory`.
  - `to_pdf_raw` cleans up with `ExitStack`. This was verified against real weasyprint 70.
- [Scope evaluation](scope_evaluation.md): keep the scope. Sections (D2), data/upload narration (F) and the tutorial generator (G) remain separate follow-ups.
- Screenshots: skipped. The branch changes no client or UI code.

## Rebase onto dev (`df3932ed4ba`)
- `context.py`: dev added a `galaxy_timeout_handler` import and the `ConfiguredDriver.from_dict` construction. Both are kept alongside the stories import.
- `test_context.py`: dev and the branch each added the file (add/add). I merged it so it keeps dev's two init tests plus the branch's two screenshot-routing tests.

## Verification on `233a2dc31e8`
- Branch tests pass: `test_story`, `test_selenium_test_decorator`, `test_context`, `test_keys`, `test_markdown_convert`, `test_markdown_to_html` and `test_markdown_export` (148 passed).
- ruff and black are clean. mypy, run from `lib/`, shows only the 23 known errors in unrelated files.
- My full `test/unit/selenium` run hung in `test_has_driver.py`. Those are pre-existing browser-launch tests the branch doesn't touch, and this machine was busy with another Galaxy at the time. Subagents ran that suite pre-rebase with 582 passed and 1 skipped.
- **Not run:** `test_run_apply_rules_tutorial` live with `GALAXY_TEST_STORIES_DIRECTORY` set, because port 8080 was busy. Screenshot routing has moved since the last live pass, so run it on the post-rebase SHA.

## For the branch agent
- John's approval of `6f1f67e0cd2` had already lapsed with the 2026-10-07 rebase, and this recovery adds 10 more commits.
- Rewrite the PR description from [old/pr_description.md](old/pr_description.md):
  - An unwritable directory no longer fails the test.
  - Point Risk Review Advice at `GalaxySeleniumContext.screenshot` and `StoryBase.screenshot_path`.
  - Disclose that capture failures fail the test with stories on.
  - Narrow the packaging risk. Only `to_html` leaves the `markdown_util` import path, and none of the three functions were in `__all__` (see the scope evaluation).
- Open question: `write_screenshot_directory_file` (only `rules_example_4_8_text` uses it) never reaches the story. That is deferred to F.
