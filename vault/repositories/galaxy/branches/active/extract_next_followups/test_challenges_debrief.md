# extract_next_followups: test challenges debrief (third pass, release_26.2 retarget + E5–E7)

**Top line:** One E7 test passes on `release_26.2`, so it is now a "Baseline tests" commit. That test is `test_hid_extract_connects_implicitly_converted_input`. E7 itself broke it and the last E7 commit fixed it. The other new E5–E7 tests fail without the branch, each at a behaviour assertion. Nothing dropped or weakened. The rest is helper cleanup:
- Shared mixin helpers for the Grep1 conversion setup and the "one input wired into one tool" check.
- Populator download instead of a raw `GET`.
- `_extraction_summary_raw` for the renamed pages route.
- E6 export asserts moved so a red run fails on content, not on a mock call count.

Commits (history rewritten; new head `098d7d23860` force-pushed to `jmchilton/extract_next_followups` with `--force-with-lease`, was `a6353d0f60a`):
- `f15d2833aad` **Baseline tests: hid extraction connects an implicitly converted input**: third commit, after the two existing baselines.
- `098d7d23860` **Share Grep1-conversion and single-input wiring helpers in extraction tests**: on top.

## Reorder

The reorder was non-interactive: detach at `300efd8f850`, add the baseline commit, then cherry-pick the remaining 66 commits.
- `503cc26ed25` (shares `connection_step_id`) was amended to rename the call in the baseline test.
- `7c23df61fa9` conflicted next to the baseline test. Both tests were kept, in their final order.
- The last E7 commit no longer adds the test. It now leaves it where the baseline commit put it.
- `git diff a6353d0f60a <replayed head>` is only that 15-line move. Every changed line appears once removed and once added.

Intermediate state: on the E7 "wire by original" commit (`6a54…` before, now `1ed661b6539`), the new baseline test fails. The next commit fixes it. That is the real history of the regression, so I left it.

## Baselines on release_26.2

I ran them in a temporary detached worktree at `f15d2833aad`, which is `origin/release_26.2` `a11275030bf` plus the 3 baseline commits. The worktree is now removed.
All 4 baseline tests passed, in two runs of `test_workflow_extraction.py`:
- `test_hid_extract_connects_implicitly_converted_input` and `test_failed_report_rewrite_creates_no_workflow`: 2 passed.
- `test_403_for_other_users_private_page` and `test_403_for_published_page_without_history_access`: 2 passed.

## Per-test decisions (tests since `fbee880b3af`)

Red check: I set `extract.py` and `services/workflows.py` back to `d4fd85a119c` (pre-E7) and set `markdown_util.py` back to `fbee880b3af` (pre-E6). I ran the HEAD tests and restored the files. The E7 tests were also run against `release_26.2` itself, with the same result.

| Test | Without the change | Decision |
|---|---|---|
| `test_hid_extract_connects_whichever_copy_is_sent` | copy hid: `input1` unconnected | keep; one assert via `_source_step_id` |
| `test_hid_extract_connects_tool_output_with_an_in_history_copy` | `{1: None, 2: 0}` ≠ chain | keep; simplified to one dict assert |
| `test_hid_extract_connects_implicitly_converted_input` | **passes on 26.2 and pre-E7** | moved to a Baseline tests commit; uses helpers |
| `test_hid_extract_collection_copied_from_another_history` | 400 "hid 4 does not appear to be a collection" | keep |
| `test_hid_extract_copies_sent_with_one_name_make_one_input` | 400 "names must be unique" | keep; populator download, shared assert |
| `test_hid_extract_copies_with_different_names_rejected` | 200 vs 400 | keep |
| `test_extract_by_ids_connects_implicitly_converted_input` | Grep1 `input` unconnected (bug already on 26.2) | keep; uses helpers |
| `test_invocation_sections_render_contents` (export unit) | raw directives; failed in `_expect_get_hda` mock-count exit | asserts moved inside the `with`, so red now fails at the content assert; the call-once check still runs when green |
| `test_inputs_section_expansion_keeps_labels_in_headings` (unit) | `validate_galaxy_markdown` rejects `input="my "reads""` | keep |
| `test_outputs_section_expansion_skips_unlabeled_and_empty_outputs` (unit) | emits `#### Output Dataset: empty` | keep |
| `test_inputs/outputs_section_expansion` (dev tests, asserts updated) | label-form directive | keep; updated for the id form |
| pages `extraction_summary` route (E5) | n/a, rename only | `_extraction_summary_raw(page_id)` now owns the URL (3 call sites) |

I tried strengthening the E6 skip test with a section count and reverted it. The example invocation already renders `output_label` twice: that is fixture behaviour, not a bug.

## Helpers (in `_ExtractionHelpersMixin`)

- **`_run_grep1_on_converted_input(history_id)`**: uses the existing `DatasetPopulator.new_dataset_from_test_data`. It replaces the open-file upload that was copied into both conversion tests.
- **`_source_step_id(step, input_name)`**: the wired step id, or `None`. An unconnected input now fails at an assert rather than with a `KeyError`.
- **`_assert_single_input_single_tool(workflow, input_name="input1", expected_tool_id=None)`**: moved up from the by-ids class. It gained `input_name`, returns the input step, and is now used by 3 more tests. This is a dev helper; its asserts are unchanged or stronger.
- **`test_hid_extract_copies_sent_with_one_name_make_one_input`**: now uses `workflow_populator.download_workflow`. The raw `GET workflows/{id}/download` left in `_extract_and_download_workflow` is dev code and untouched.

## Whole branch: still lean?

- Earlier calls still hold. No `SimpleNamespace`, `MagicMock`, `monkeypatch` or `patch(` added. The markdown expansion tests stay unit tests, since only PDF/basic export reaches them.
- E5–E7 overlap is small. The hid and by-ids conversion twins cover two code paths. The two E6 `test_workflow_markdown` tests cover heading collapse and skips, which the export test doesn't.
- `b477f995b42` (`test_copies_from_a_history_no_longer_shared_extract_by_local_ids`) came after pass 3 and is fine. Its one `disable_link_access` `PUT` is used once, so no helper.
- **E2E:**
  - None needed for E5–E7. E5 is a route rename, and the notebook E2E tests already fetch the page summary through it.
  - E6 only affects basic/PDF export.
  - E7 is API-only: bioblend and the history extract endpoint. The form sends one hid per card.
- **Dropped E2E `test_extract_button_visible_in_notebook_editor` (`95344d96109`, now `f3387881660`):** it exists on `release_26.2`. Reason: every notebook extraction test waits on that button through `notebook_click_extract_workflow`. `plan.md` (Cleanup phase) lists the drop, but `scope_evaluation.md` still says "waiting on John's sign-off". **Sign-off for this commit isn't recorded in the branch directory; the coordinator should confirm it.**

## Runs

All API runs use `GALAXY_TEST_TOOL_CONF` and `GALAXY_TEST_REQUIRE_ALL_NEEDED_TOOLS=1`, one file at a time.
- **Red, E7 subset on pre-E7 lib:** 6 failed (all at asserts), 1 passed (the baseline). Same on `release_26.2` (run before the helper refactor); rerun on pre-E7 lib after the refactor: same 6 fail at asserts.
- **Red, E6 unit tests on pre-E6 `markdown_util.py`:** all 5 E6-touched tests fail at asserts.
- **`test_workflow_extraction.py`, whole file:** 120 passed, 1 skipped (pre-existing upstream "Mapping connection for copied collections not yet implemented in history import/export").
- **`test_pages_history_attached.py`, whole file:** 57 passed.
- **Unit tests:** `test_markdown_export.py` and `test_workflow_markdown.py`: 53 passed. Wider set (`test_workflow_extraction_summary`, `test/unit/workflows/`, `test_markdown_validate`, `test_markdown_export`): 281 passed, 1 skipped.
- **Linters:** black, isort, ruff and flake8 are clean on the changed files. mypy (from `lib/`) shows only the known `notification.py` error.
