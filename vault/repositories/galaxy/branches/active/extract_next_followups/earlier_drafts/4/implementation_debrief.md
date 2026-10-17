# extract_next_followups: implementation debrief (John's scope decisions applied, 2026-10-17)

**STATUS: READY.** John resolved the parked scope decision, and every item is done:
- retarget to `release_26.2`
- E5 API naming
- E6 and E7
- drop the redundant E2E test

E8 was explained to John, not implemented.

The head is `0a2f2198beb` on `jmchilton/extract_next_followups`: 71 commits on `release_26.2` `a11275030bf`, 37 files, +2962/-1339. The previous debrief (parked BLOCKED) is in [earlier_drafts/3](earlier_drafts/3/implementation_debrief.md). The original scope is still `extract_next_followups_alt_original_scope`, which stays based on dev ([alt](alts/original_scope.md)).

## What changed

1. **Retarget to `release_26.2`.** #22860 first ships in 26.2.
   - I rebased commit by commit, keeping the "Baseline tests" commits first. There were two mechanical conflicts:
     - `GCard.test.ts`: kept both sides.
     - `navigation.yml`: kept 26.2's keys and added the branch's `report_section` and `report_section_with_text`.
   - The branch diff was byte-identical before and after.
   - The review confirmed nothing depends on dev-only code.
2. **E5, API names fixed before 26.2.0.**
   - `/api/pages/{id}/workflow_extraction_summary` is now `/api/pages/{id}/extraction_summary`, matching the histories route that shipped in 26.1.
   - The unused `report_title` payload field is gone; the report title is the workflow name.
   - `schema.ts` is regenerated.
   - **This must merge before 26.2.0 ships, or it becomes a breaking API change.**
3. **E6, invocation sections render in PDF.** The `invocation_inputs()`/`invocation_outputs()` expansion now emits `history_dataset_id=`/`history_dataset_collection_id=` directives, not label references.
   - The label only titles the section and is collapsed onto one line. Labels with quotes are no longer dropped.
   - Two upstream unit tests were re-pinned from labels to ids (`test_inputs_section_expansion`, `test_outputs_section_expansion`), plus the branch's two E3 tests.
   - Each id directive is access-checked by the export walk.
4. **E7, the hid-based extract treats copies as one input.** This path is used by bioblend's `extract_workflow_from_history` and `/api/histories/{id}/extract_workflow`.
   - It is now reproduced, no longer just inferred: sending the copy's hid left the tool input unconnected.
   - `extract_steps` keys inputs, tool inputs and outputs by original content, like the by-ids path.
   - `group_hid_inputs_by_original` groups copies before validation and extraction. Copies with different names get a 400.
   - Now-dead `WorkflowSummary` hid bookkeeping was removed.
   - Review follow-ups:
     - Implicitly converted inputs connect again on both paths (`_unconverted`). On the by-ids path this was an existing bug on 26.2.
     - Copies sent under one name are no longer rejected.
     - A collection copied in from another history now extracts by hid; before, it got a 400.
5. **Dropped `test_extract_button_visible_in_notebook_editor`.** Every notebook extraction E2E test already waits on that button.

## Process

- **Normal review and Codex** ([review debrief](subagents/changes_review.md)): both found the same two E7 bugs, the converted inputs and the one-name copies. Both were fixed red-to-green. I also added the by-ids twin and a collection-copy test.
- **Test challenge, third pass** ([debrief](test_challenges_debrief.md)): nothing dropped or weakened.
  - `test_hid_extract_connects_implicitly_converted_input` already passes on 26.2, so it moved into a third "Baseline tests" commit. It fails on the intermediate E7 commit `1ed661b6539` and passes again on the next one; that is left as real history.
  - Shared test helpers were added.
- **Screenshots** ([debrief](screenshot_debrief.md)): obtained, 11 shots. One test-only commit `0a2f2198beb` waits for output previews, settles the toast selector and captures the report-lock tooltip. It noted that a locked star looks the same as an active star (only the tooltip differs), a possible visual-cue follow-up.
- I didn't rerun Codex, thermo-nuclear, refactor baseline or scope evaluation for these commits. Their earlier-pass debriefs still describe the rest of the branch.

## Decisions John may still want to weigh

- **E8 (not done):** build synthesized boundary rows from the local copy. Explained separately in the conversation.
- **Codex F2:** zero-input producers from another history stay boundaries, as recommended.
- **Behavior changes to mention in the PR:**
  - New 400s: names not parallel to ids/hids, and copies of one original sent with different names.
  - On the hid path, copies sent together now become one input instead of several.
  - In PDF export, a viewer who can see the invocation but not one of its datasets gets an error block for that section. Before, they got a raw directive.
- **Rare edge:** in a history with duplicate hids, `get_hda_by_hid` picks the lowest-id visible dataset.
- The branch is about 70% server fixes plus some client/E2E polish, all now aimed at 26.2. If reviewers want it split, Option 4 in [scope_evaluation](scope_evaluation.md) still applies.

## Validation (API/unit at `098d7d23860`, E2E at `0a2f2198beb`)

All API runs used the tool conf and `GALAXY_TEST_REQUIRE_ALL_NEEDED_TOOLS=1`.

| Suite | Result |
|---|---|
| `test_workflow_extraction.py` | 120 passed, 1 skipped (existing upstream skip for copied-collection mapping) |
| `test_pages_history_attached.py` | 57 passed |
| Extraction/markdown unit tests | 281 passed, 1 skipped |
| Branch vitest + vue-tsc | 113 passed at the retarget; vue-tsc clean (after rebuilding a stale local `api-client` dist) |
| mypy | Only the unrelated `notification.py:862` error |
| Playwright E2E, headless on 26.2 | `test_notebook_workflow_extraction.py` 6 passed; `test_workflow_extraction.py` 13 passed; no skips |

**Remaining:** fork CI on the new base. Locally, only the 3 tests touched by the screenshot commit ran under Selenium (they pass).
