# selenium_stories_core — scope evaluation

**Recommendation: keep the scope as implemented. No expansion or contraction.** The branch is the smallest reviewable unit of the #21199 core: the markdown move into `galaxy.util`, the `galaxy.selenium.stories` model and run lifecycle, the `selenium_test` and context wiring, and one in-tree consumer (`test_run_apply_rules_tutorial`, fully captioned). Every scope item the reviewers raised either belongs to an already-planned follow-up or isn't worth its cost. Those items are `write_screenshot_directory_file`, label-only headings on the other `gtn_screenshot` tests, sections, data/upload narration, the tutorial generator, the packaging move, and capture failures failing the test. Sections stay D2, data/upload narration stays F, and the rule-builder tutorial generator stays G, each as a separate follow-up that lands with its own consumer. Three pre-hand-off gates remain, and none of them changes scope:
1. Rebase onto dev. A read-only `merge-tree` against `origin/dev` `df3932ed4ba` shows a content conflict in `lib/galaxy/selenium/context.py`, where dev changed `GalaxySeleniumContextImpl.__init__`, and an add/add conflict in `test/unit/selenium/test_context.py`.
2. Re-run `test_run_apply_rules_tutorial` live with `GALAXY_TEST_STORIES_DIRECTORY` set, on the post-rebase SHA. Screenshot routing moved into the base context (`d510f54c644`, `7af9f3564c1`) after the last live pass.
3. Refresh the PR description from `old/pr_description.md`. It still says an unwritable stories directory fails the test (fixed in `f2314c5047e`), and its Risk Review Advice points at the removed `TestWithSeleniumMixin.screenshot` / `_screenshot_path` routing.

Branch diff: `4fe00d9e7ab..73fa384ba65`, 19 files, +1219/−103. About 520 of those lines are implementation and wiring, and the rest are tests. Rescue plan: `vault/projects/playwright/TEST_STORIES_RESCUE.md`.

---

## 1. As implemented (recommended)

The markdown HTML/PDF conversion moves to `galaxy.util.markdown_convert`, with the extra `galaxy-util[markdown-convert]` = Markdown. A `stories/` package adds `Story`/`NoopStory`, the run directory, `latest`, and the zip and PDF output. `screenshot(label, caption=None)` and `document()` go on the base context. `selenium_test` writes a story on success, skip and final failure, and resets it on retry. `test_run_apply_rules_tutorial` captions all 15 screenshots.

| Pros | Cons |
|---|---|
| • Ships its own consumer, following the rescue's "every PR ships its first consumer" rule. The 383 existing `screenshot()` calls get stories for free.<br>• Off by default. CI doesn't set the variable, so output is unchanged apart from error-directory names.<br>• The markdown move has a real reason here: `galaxy-selenium` can't import `galaxy-app`.<br>• Already cut from 622 to 230 lines of `story.py` by deferring sections. Codex, the test challenge and the thermo-nuclear pass found nothing that argues for resizing. | • Conflicts with current dev in `context.py` and `test_context.py`, so it needs a rebase before the PR.<br>• The live E2E is stale. It last ran before the lifecycle move, the captions, and the routing and dataclass refactors.<br>• `story.pdf` was checked only in a scratch weasyprint 70 install, never in a live test run.<br>• The other 7 `gtn_screenshot` tests produce stories with label headings.<br>• With stories on, a screenshot capture failure fails or retries the test. |

<details><summary>Details</summary>

- The cons are about validation and documentation. None of them says the unit is the wrong size. The conflict is small: dev reordered `timeout_multiplier` and switched to `ConfiguredDriver.from_dict` in `GalaxySeleniumContextImpl.__init__`, next to the branch's `story` class attribute and imports. Dev also added its own `test_context.py`, so the branch's tests need merging into it.
- `old/pr_description.md` already presents this as the core only, with sections, data/upload narration and the generator as follow-ups. Keep that framing.

</details>

## 2. Expand: route `write_screenshot_directory_file` into the story

Make the one `.txt` artifact also land in the story. It's the `rules_example_4_8_text` rule source written by `test_uploads.py::test_rules_example_4_accessions`. It could become a fenced `document()` block, or the reference's `document_file(path, caption)`.

| Pros | Cons |
|---|---|
| • Stories would capture everything the screenshots directory does.<br>• Small: about 10 lines plus one test. | • Not a regression. With stories on and the screenshots directory unset, the text went nowhere before this branch either.<br>• The only caller is in `test_uploads.py`, which is F's file (upload narration and examples). Changing it here collides with F.<br>• `document_file` was #21199 API with no consumer in D. Adding it now would recreate the "API with no caller" problem the rescue plan rejected for `highlight_element`. |

<details><summary>Details</summary>

Defer this to F. F will rewrite the `test_uploads.py` GTN tests' narration anyway, and `document_file` gets its consumer there. Note it in the PR description's "not part of this" line so a reviewer doesn't raise it as a gap.

</details>

## 3. Expand: caption the other `gtn_screenshot` tests

Add captions and `document()` narration to the six `test_uploads.py::test_rules_example_*` tests and `test_tutorial_mode.py::test_activate_tutorial_mode`.

| Pros | Cons |
|---|---|
| • Every GTN-marked test would produce a readable story immediately. | • Six of the seven are in `test_uploads.py`. That's exactly F's scope, which brings data/upload narration, so it would duplicate or conflict with F.<br>• Grows the diff with test-text churn that has nothing to do with the core mechanism.<br>• Label headings are a fine default. The caption defaults to the label by design. |

<details><summary>Details</summary>

`test_activate_tutorial_mode` is the only one outside F's file. It's a single screenshot, so captioning it alone adds little. Leave all seven for F.

</details>

## 4. Expand: fold in D2 (sections), F (data/upload narration) or G (rule-builder tutorial generator)

Port more of #21199's final state into this PR:
- **D2:** sections, filtering, `SectionProxy`, the `cli.py` story flags and `navigates_galaxy_mixin.py`.
- **F:** `stories/data/` examples and narration.
- **G:** `generate_rule_builder_tutorial.py`.

| Pros | Cons |
|---|---|
| • One PR instead of four.<br>• The generator would show the "beyond tests" story use case. | • Sections have no consumer until F or G. Their 570-line test file covers only sections.<br>• Dev's #23602 `RuleImportContext` already replaced most of the reference's 955-line `upload.py`. F shrinks to narration and examples and needs re-deriving, not porting.<br>• G is manual-only, so it has no CI-verifiable consumer.<br>• The rescue plan settled this on 2026-09-30: D is "the smallest honest unit", and the rest land with their own consumers. |

## 5. Contract: split the markdown move back out (the old PR C)

Land the move into `galaxy.util.markdown_convert` and the `markdown-convert` extra as their own PR, before stories.

| Pros | Cons |
|---|---|
| • A reviewer could weigh the packaging change in isolation. | • Already tried and rejected (`TEST_STORIES_RESCUE.md`, "C was wrong about this and is folded into D"). Nothing on dev behaves differently after the move, so its PR has no answer to "why?".<br>• The search for another consumer came up empty: tool help is client-side, and Tool Shed READMEs don't take `.md`. |

## 6. Contract or adjust: soften the `markdown_util` one-way door with a re-export

Keep the move, and re-export `to_html`/`to_pdf_raw`/`weasyprint_available` from `galaxy.managers.markdown_util`, or document that they're gone.

| Pros | Cons |
|---|---|
| • Code outside this repo importing the old path keeps working. | • The door is smaller than the old PR description says:<br>&nbsp;&nbsp;– None of the three were ever in `markdown_util.__all__`.<br>&nbsp;&nbsp;– `to_pdf_raw` and `weasyprint_available` are still imported into `markdown_util` for `generate_branded_pdf`, so they still resolve at runtime.<br>&nbsp;&nbsp;– Only `to_html` actually disappears from that path.<br>• No in-repo importer is left on dev at `df3932ed4ba`.<br>• A shim adds a second home for the same functions. |

<details><summary>Details</summary>

This isn't a scope change. Correct the Risks section of the refreshed PR description: say only `to_html` leaves the `markdown_util` namespace, and none of the three were declared public. The Markdown hard dependency of `galaxy-selenium` is the real one-way door. It's pure Python, and weasyprint stays optional, which keeps #9651 intact. Keep it.

</details>

## 7. Contract: leave `dump_test_information` untouched

Don't share `run_directory`/`link_latest` with the error dumper. Keep its old name format and its `try_symlink`.

| Pros | Cons |
|---|---|
| • "No output changes unless `GALAXY_TEST_STORIES_DIRECTORY` is set" would hold with no exceptions. Error-directory names in CI artifacts wouldn't change shape. | • Keeps two near-identical run-directory/`latest` implementations. That's a reuse regression for no behavioural gain.<br>• Keeps the old bugs: the `%Y%m%d%H%M%s` format appended epoch seconds, and a same-second name collision crashed the dump. |

<details><summary>Details</summary>

Keep the sharing. The name-format change is already disclosed under Risks. Nothing in the repo parses those names, and `latest` doesn't change.

</details>

## 8. Contract: make story capture purely observational, or limit stories to `gtn_screenshot` tests

Either swallow capture and copy errors in story mode, or enable stories only for tests marked `gtn_screenshot` (8 tests) instead of every `@selenium_test`.

| Pros | Cons |
|---|---|
| • Turning stories on couldn't turn a passing test red.<br>• The marker variant cuts story-mode capture from 383 call sites to 8 tests, which also makes story runs faster. | • Swallowing errors hides real driver problems. `GALAXY_TEST_SCREENSHOTS_DIRECTORY` already fails the test on capture errors. Both Codex and the thermo-nuclear review kept this deliberately.<br>• The marker variant gives up the main argument for the feature: every existing test becomes a story, and "debug a failing run from its story" works for every test.<br>• The variable is opt-in and CI doesn't set it, so the exposure is limited to people who asked for stories. |

<details><summary>Details</summary>

Keep the current behaviour. State it plainly in the PR description, because none of the old text mentions it. Suggested wording: "Like `GALAXY_TEST_SCREENSHOTS_DIRECTORY`, turning stories on makes every `screenshot()` call capture. A capture error fails the test the same way it does today with screenshots on."

</details>

## Reviewer-raised items, and where each lands

| Item | Source | Disposition |
|---|---|---|
| `write_screenshot_directory_file` never reaches the story | thermo-nuclear review | Defer to F (§2). |
| Other `gtn_screenshot` tests get label headings | old PR description, polish | Defer to F (§3). |
| Story sections, data/upload narration, tutorial generator | #21199 rescue plan | Separate PRs D2, F and G (§4). |
| Markdown move into `galaxy.util` (one-way doors) | old PR description | Keep. Correct the risk text (§5, §6). |
| Stories make capture failures fail the test | Codex, thermo-nuclear review | Keep. Disclose in the PR description (§8). |
| Live E2E not re-run since the recent commits | test challenge, polish, initial debrief | Gate, not scope. Run after the rebase. |
| Error-directory name change with stories off | old PR description | Keep. Already disclosed (§7). |
| Unwritable stories directory errors the test | polish, Codex | Already fixed (`f2314c5047e`). Update the PR description. |
| Standalone or Jupyter context copies `<label>.png` into the working directory when a story is assigned | Codex fix note | Keep. No in-tree code assigns a story there. Not a scope question. |
