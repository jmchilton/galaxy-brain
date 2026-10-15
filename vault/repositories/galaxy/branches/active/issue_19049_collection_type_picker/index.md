# issue_19049_collection_type_picker

Status: `branches_ready_for_final_review`. Base: `dev`. Draft [PR #24055](https://github.com/galaxyproject/galaxy/pull/24055), head `f169ab950dc212003a8f12a3830f5771d5c8d2db`.

Adds a select-or-text field for workflow collection types and Tool Shed targets.

[Implementation](implementation_debrief.md) · [Polish](polish_debrief.md) · [PR description](pr_description.md) · [Titles](pr_titles.md) · [Tracking history](tracking_history.md) · [Registry sync breakdown](registry_sync_breakdown.md)

## TICK — 2026-10-12

All 60 upstream checks settled; client and browser checks passed. The only two failures are package-test collection importing removed `pulsar.client.build_client_manager`, outside this client/selector change. [Package run](https://github.com/galaxyproject/galaxy/actions/runs/38179027765). This is greenish and mergeable. Reclassified to draft-ready; preserve John’s draft request before final read-through and the recorded UX/scope questions. The published human-read item is checked, but the record does not say those remaining decisions are resolved; no undraft inferred.

Requested failed-job reruns for the recorded unrelated failures: [run 38179027765](https://github.com/galaxyproject/galaxy/actions/runs/38179027765). All requests were accepted; this does not claim a passing rerun or recover an evicted client cache/artifact.

## GOOD_MORNING — 2026-10-13

Requested failed-job reruns for diagnosed unrelated failures: [run 38179027765](https://github.com/galaxyproject/galaxy/actions/runs/38179027765). All requests accepted; reruns are pending, not passing coverage.


## Marius review fixes — 2026-10-13

John authorized reviewing PRs Marius opened against his branches and merging those that hold up. [Fork #87](https://github.com/jmchilton/galaxy/pull/87) passed independent review of all eight commits at `216bc728e6c931665589d11d00b0d1a340c8efbb` against this branch’s `d37a9e903038064bbc1ed9eb2830ef013150a48d`. **370 relevant tests pass**; selector ranking and sample-sheet compatibility were checked against actual code. Full typecheck has the same three unchanged errors at both head and exact base; changed-file lint has no errors. Remaining fork CI failures are diagnosed unrelated in the [review](../../../reviews/archived/fork-87/review.md). No local live-browser validation.

Merged the pinned head using a merge commit, preserving all eight original commits/authors. Live merge and upstream PR head: `79454e885e4d2f38db552f019d4fcea21d4f01e9`. Clean local worktree fast-forwarded to match. New upstream CI is pending; prior results do not attest this merge head. Move to ci_wait and retain John’s draft/final-read-through instructions. This action does not approve taking #24055 out of draft or merging it upstream. [Remaining review TODOs](../../../../../agents/gx_branches/REVIEW_WORK_2026_10_13.md).

## Marius follow-up pass — 2026-10-13

All seven items in [Marius's review](https://github.com/galaxyproject/galaxy/pull/24055#pullrequestreview-5500931990) landed via #87; no inline or issue comments exist beyond the review body. Remaining gap: no test drove `workflow_editor_set_collection_type` with a bare `list` or `paired` (item 2's bug). Added `test_collection_input_bare_collection_types` at `18cb3407412`, which saves `paired` then `list`. **Red:** with the helper reverted to a bare-type search, `paired` selects `List of Paired Datasets (list:paired)` and the wait fails. **Green:** with #87's `(<type>)` search it passes. Under Playwright, headless, against a local server with Vite, the new test and the three existing collection-type editor tests (nested `list:list` via help modal, custom `list:list:list` / Any round trip, `sample_sheet:paired`) all pass. Each asserts the exact saved `collection_type`. Selenium backend not run locally. Lint clean. Added the test to local `pr_description.md`; the live PR body is not updated. Upstream CI restarted on the new head. Draft and final-read-through instructions unchanged.

## TICK — 2026-10-14

Current head 18cb34074127 is mergeable but Playwright run 38439282446 fails test_collection_workbook_template_is_typed waiting for [data-which-builder="list:paired"]. This intersects collection type/workbook behavior and has not been diagnosed as unrelated. Moved to author_work; preserve draft/final-read-through instructions. No implementation fix inferred.

## Requested rebase and repair — 2026-10-14

[Rebase/repair evidence](ci_repair_2026-10-14.md). Pushed `f169ab950dc212003a8f12a3830f5771d5c8d2db` to the jmchilton fork after successful targeted validation. Status: `branches_ready_for_final_review`; new-head CI pending. Workbook selector repaired; new regression requires fresh human read. Preserve the explicit draft hold.
