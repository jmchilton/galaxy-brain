# Thermo-nuclear code quality review (round 2, after re-scope)

Verdict: approve. There are no structural regressions and I changed no code, so head stays at `8f0ad8b2b6e` (4 commits on `origin/release_26.2`). This is a small, test-only branch with one Vue id. The review found nothing that deletes complexity without trading away behavior or coverage. There's one naming question for John (below).

Not acted on:
- **Possible naming outlier, `tags_add_from_button`.** The existing generic helper is `tagging_add` (navigates_galaxy.py:1981), and area helpers use `<area>_*`, so `tags_*` is a new prefix. Rename to `tagging_add_from_button`? I didn't rename: it's John's call, and every `history_panel_add_tags` caller in 4 test files would need reruns under both backends.
- **Three tag-entry paths now coexist:** `tagging_add` (raw selectors, no sleep between tags), the hand-rolled toggle click in `workflow_index_add_tag`, and `tags_add_from_button`. The branch extracted the existing `history_panel_add_tags` loop; it didn't invent a new one. The `UX_RENDER` sleep between tags is a real difference: StatelessTags emits `[...value, newTag]`, so the parent has to take each tag before the next. Consolidating would touch workflow tests, which is out of scope.
- **Auto-detect test's alert-text `_wait_on`.** The tidy move would be to give `_click_and_assert_success_alert` an expected message, so the special case disappears. I declined: it would tie the other three callers to UI copy for no behavior gain. The comment there already explains why (the save's alert is still showing).
- **`history_panel_wait_for_hid_ok(1)` after Auto-detect.** It isn't the real sync point. But removing it could flake the reopen-and-edit step, and it gains nothing structurally. Two earlier rounds already declined this.
- **Literal `hid=1` vs `hda["hid"]` in the tagging test.** Cosmetic, and it's deterministic under `@managed_history`. Already declined.
- **File size.** `navigates_galaxy.py` was already 3.4k lines and gains about 10. The test files are about 200 lines. No threshold is crossed.
- **Vitest removal.** Checked: `DatasetAttributes.test.ts` has no diff against base. That was deliberate (fixup `d23d3501308` → `8f0ad8b2b6e`), and test_challenges_debrief.md records why. The re-scope debrief and review still describe the vitest as present, which is stale. I didn't restore it.

<details>

Scope: `origin/release_26.2..8f0ad8b2b6e`, covering 6 files and +88/-16 lines.

- **Code judo:** nothing to take. Both helper extractions (`tags_add_from_button`, `_click_and_assert_success_alert`) delete duplication: 4 call sites for the alert check, and 2 tag editors. Neither is a pass-through wrapper. `history_panel_item_add_tags` is a 2-line composition of existing canonical helpers (`history_panel_ensure_showing_item_details` plus the shared loop).
- **Spaghetti:** no new conditionals in shared code. The only shared-code change is the parameterized loop.
- **Boundaries:** every selector is in `navigation.yml`. `content_item.tag_area_*` mirrors the existing `history_panel.tag_area_*` and `collection_view.tag_area_*` keys, and is added to schema.ts. `metadata_input(name)` is parameterized. The Vue id matches the Datatypes tab's `#dataset-attributes-autodetect-datatype`. That's one attribute, following the 26.2 precedent.
- **Type/contract:** `int(comment_lines_metadata()) == 3` reflects a real backend quirk (form saves store text metadata as a string), and has a comment. Not a fallback.
- **Orchestration:** state setup and checks use populators. The UI drives only the behavior under test.
- No security concerns.

No code changed, so I didn't rerun E2E. polish_e2e_tests_debrief.md records both tests passing under Playwright and Selenium at `8f0ad8b2b6e`.

</details>
