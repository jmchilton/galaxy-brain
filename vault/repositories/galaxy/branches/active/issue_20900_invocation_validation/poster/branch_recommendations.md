# Branch recommendations

## Plan

1. **Re-run the dev-vs-branch matrix at the current head** (highest value). The only dev-side evidence is the test challenge's run at `4b4c7d39b9a`, which predates 5 of today's tests:
   - `test_run_with_dataset_url_for_collection_input_creates_no_history`
   - `test_run_with_invalid_sample_sheet_uri_input_creates_no_history`
   - `test_run_with_incompatible_collection_type` [paired→list, list→paired]
   - `test_run_with_untyped_collection_input_accepts_any_collection_type`

   Run every branch test against dev's sources, as `test_challenges_debrief.md` did. For each, record the dev status, whether dev created an invocation, whether it left a history, and the branch status and message, as one table in the record. Save the full `err_msg` bodies too, because the assertions only check substrings. This fills the poster's board, replaces its "unmeasured" cells, and gives a future PR description its central table.
2. **Reproduce the issue end to end on dev and capture it.** The poster's "launch, then scrub" story is the issue's own claim, from a Sentry event outsiders can't open. Every wrong-type test uses `steps: []`, so on dev the 200 is never followed by a failure. Two captures would let the poster show a real trace instead of paraphrasing:
   - Connect a `text` workflow parameter to a tool and invoke with an integer (via the API or `planemo run`). Record the 200, the invocation's state over time and the scheduling failure message.
   - Run the batch `["UPPER", "lower"]` request with `new_history_name` on dev. Record the leftover history: its exact name (the poster can't invent dev's `on …` suffix), its empty contents, and a history-list screenshot.
3. **Settle the PR shape (decision 6) before polishing the poster, and record which checks go in which PR.** `scope_evaluation.md` offers splits A, B and C. If the branch ships as one PR, the poster sells it as is. If it splits, each board row needs a PR label, and the "two countdowns" image belongs to the restructure PR (B.5 or C.2). Consider making the collection-type pair (`2aab3a22916` + `bcbd2de187c`) its own PR: it touches workflow storage and the client, and it changes behavior for stored workflows (see 5).
4. **Find who hit it.** The record's only evidence is the #20900 Sentry comment (planemo run, text ← integer) and the #7781 comment asking for backend validation at submission. A `gh` search of galaxy and planemo issues turned up no other reports. John can count similar Sentry events (for example, workflow parameter type errors at scheduling over 90 days), and the Galaxy Help forum or Matrix might have reports of empty "History from … workflow" histories after failed runs. One real number or link would give the masthead a "who" and the PR a stronger problem section.
5. **Quantify decision 2's compatibility risk.** Workflows already saved with an implicit `list` stay `list`, and the API now enforces that type, as the run form already did. Scan IWC (and any other public workflow corpus) for collection inputs with no declared type: gxformat2 `type: collection` with no `collection_type`, or `.ga` files with no `collection_type` key. Record how many there are. Then the poster's "Still GO" panel and the PR can say who this could affect, with a number.
6. **Write down where "nothing created" stops.** The gate covers validation. Failures after it, such as dereferencing a URL input in phase 2 or a `queue_invoke` error (decision 4), can still leave a history. Add one sentence to the record, and later the PR, listing which failures stay after the gate. Then the poster's boundary note quotes the record instead of the planner.
7. **Fix SHA and count drift in the record.**
   - `implementation_debrief.md`'s header gives the head as `9f2d892ad17`, and "What the branch does" lists `7848553da11` and `9f2d892ad17`. The current commits are `f4d51ef252a` and `cf54435a4ef`, and the 2 new commits are missing from that list.
   - `scope_evaluation.md` gives the size as 5 commits, about 330 / 190 production lines and about 313 test lines. At `bcbd2de187c` it's 7 commits and 12 files: production +336 / −201, tests +390 / −4.
   - Unit counts read 290 / 296 / 297 / 298 across the notes.
   - The baseline count reads 9 in `rebase_reconciliation.md` and 7 in the test challenge.
   - The standing record lists 9 children; 8 merged and one was abandoned. Say "8 merged" consistently.
   - `index.md` still carries the TICK and GOOD_MORNING sections of 2026-10-11 to 2026-10-13, listing reds that are fixed. Per `REPOSITORY_BRANCHES.md`, drop or fold them so no one reads them as current.
8. **Re-measure the cost at the head, and keep the harness.** The populate and query table was measured at `456acb2f1d8`, one run on sqlite, with a throwaway harness that was deleted. `bcbd2de187c` adds a `HistoryQuery` per collection input. Check the harness into the record as a script or patch, then re-run it at the post-rebase head. The poster's cost chip then carries a current SHA, and decision 4 gets a reproducible number.
9. **Carry dev's quota change through the rebase.** The conflict with today's `origin/dev` in `run_request.py` comes from `766931f5588` ("Charge copies of another user's datasets"). That commit adds `history.charge_added_datasets(copied_hdas)` where inputs are copied into the history. On the branch, that code moved into `_add_data_input_to_history`, and the call must move with it. Then run fork CI (decision 5). The poster's SHA has to be updated after this.
10. **Future PR description order.** Lead with the two-countdown image and the dev-vs-branch table (from 1). Then give one paragraph on the restructure. Put the code walk, the `WORKFLOW_PARAMETER_VALUE_TYPE_CHECKS` table, the collection-type default fix and the cost numbers in `<details>`. Name the two dev tests whose input declarations changed (`test_metadata_copied_to_copied_outputs`, `test_run_workflow_from_url_with_implicit_conversion_on_collection`) near the top, with the reason, since reviewers will notice dev tests being edited. List the 8 merged extractions as the program's history.

## Implementation

1. **Make every rejection test assert the same "nothing created" contract, and split the looping test.**
   - Five board rows can only say "400 · no invocation", because their tests use an existing `history_id`: parameter type, dataset for collection, collection type, deleted input, and restrictions, which asserts neither. None of them checks that nothing was copied into that history.
   - Fix: give each test a `new_history_name` (or assert the existing history's contents are unchanged), plus `workflow_invocations == []` in `test_run_with_parameter_input_not_in_restrictions`.
   - Also parametrize `test_run_with_deleted_inputs` over its 3 cases. On dev it stops at the first case, so dev's outcome for the purged HDA and the deleted HDCA was never observed.
   - The board would then show one uniform "no history · no invocation" column, and each deleted-input case would get its own dev cell.
2. **Pin the moved batch check with a test.**
   - On dev, `"Must specify 'batch' to use batch parameters."` is raised in the service after `build_workflow_run_configs` (`services/workflows.py`:373–374 at `7e16f446410`). By then, a multi-value request without `batch: true` that asks for a new history has already committed a history per entry.
   - The branch moves the check before anything is created (`run_request.py`:544–545), but no test covers it.
   - A `…_batch_values_without_batch_flag_creates_no_history` test, run on dev's sources too, would add a board row with a likely "history left" on dev. The record should note the move.
3. **Fill the three non-measured dev cells when re-running the matrix (plan item 1).**
   - The † sample-sheet cell is from code reading only.
   - The URL-for-collection and collection-type cells are unmeasured.
   - Add the untyped-collection test, which the poster shows as "dev · not run".
   - Record each dev response's full `err_msg` as well. The board had to truncate two branch messages, and it shows no dev messages because the record has none.
4. **Re-run `test_landing.py` at the head and record it.** The "23 passed" in the implementation debrief predates `2aab3a22916` and `bcbd2de187c`. The landing row's branch cells are soft at head until this is re-run. One line in the debrief fixes it.
5. **State the "nothing created" boundary and the status-code range in the record.**
   - The footer's boundary note is derived from code (URL dereferencing at `run_request.py`:397/400 runs after the commit at 616; `queue_invoke` runs after that). The record should say it in one sentence (plan item 6).
   - The record should also say that rejections are 4xx, not only 400 (unknown landing 404, unclaimed 409). The poster's "A No-Go is a 400" is a simplification, and a PR description shouldn't copy it.
6. **Capture the untyped-collection fix as a before/after.**
   - The poster dropped the `2aab3a22916` inset for space.
   - Upload gxformat2 `input1: collection` on dev and on the branch, then show the stored `collection_type` (`list` vs `null`) and the run form's accepted collections for each. A screenshot pair or a 4-line export diff would do.
   - That would explain in one image why the collection-type check couldn't land before this commit, and help reviewers judge decision 2's compatibility risk.
7. **Give the record a short, real history-name example.** The debris slip can only show `invalid batch entry history …`, because neither the uuid nor dev's ` on …` suffix was captured. Saving the leftover history's actual name and the history-list row when reproducing on dev (plan item 2) lets the slip show a real artifact.

## Review 1

Re-ranking: plan items 1 (re-run the dev-vs-branch matrix at head) and 2 (reproduce the #20900 failure end to end) are still the two most valuable. For item 2, also record the Sentry event's exception title and the frame it fails in. The #20900 comment names the input (text ← integer via planemo run) but not where it fails, so the poster can only say "the error surfaces later".

1. **Record why the second step-state populate can't fail.** The branch populates step state in `build_workflow_run_configs` (RR:601–605) and again in `queue_invoke` (SVC:384, `populate_state` defaults to true). The second populate runs after ignition. It sees the same `param_map`, so it should behave the same, but the record only discusses its cost (PCD), not that it can't raise.
   - One sentence in the record, or a test that makes the second populate fail-free by construction, would let the poster and PR say "step state is checked before ignition" without a footnote.
   - The cleaner fix is decision 4's `populate_state=False` once commits become flushes.
2. **Count dev's leftover histories for a failed batch.** On dev, `_get_target_history` commits a history at the top of every batch iteration (RR:436 at `7e16f446410`), so entry 2's history exists before entry 2 fails. `test_invalid_batch_entry_creates_no_history` only checks that "any history with the prefix" exists.
   - Record the count (likely 2 for `["UPPER","lower"]`) when re-running the matrix.
   - The debris slip could then say "2 histories left" with a source, instead of implying one.
3. **Fix the perf record's internal contradictions before quoting it again.**
   - `performance_challenges_debrief.md` says "about +N_steps per request, independent of batch size", but its own table shows +50 for a single new-history request (121 → 171) and +26 for a batch of 25 (1825 → 1851).
   - It calls the harness both a "50-step `cat1` chain" and a "52-step" workflow.
   - Fold this into plan item 8's re-measure. Then the cost chip can carry one consistent "+N per request" sentence.
4. **Assert the message on every rejection test that lacks one.** `test_invalid_run_request_creates_no_history` and the landing tests assert status only.
   - The landing errors come from the landing manager, so a substring like "not found" or "already claimed" would pin the user-facing text.
   - The poster's landing row could then show branch messages like the other rows. Today it shows none, so it reads as weaker evidence than the rest.
5. **In a future PR description, list the full call order once, as the poster's rails do,** including the moved batch-flag check (RR:544) that the poster leaves out. Reviewers comparing the PR with dev's `invoke_workflow` will look for where `"Must specify 'batch'"` went, since it left the service.
