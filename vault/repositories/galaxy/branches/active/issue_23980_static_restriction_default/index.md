# issue_23980_static_restriction_default

Status: `attention`. mvdbeek's 2026-10-20 review is addressed in code but not yet answered on GitHub (see [review response](review_response.md)). Base: `release_26.2`. PR: [#24140](https://github.com/galaxyproject/galaxy/pull/24140). Tip `3274a9c98da`, with CI pending.

Preselects defaults for statically restricted workflow text inputs (#23980). The run form can also submit `""` when it's the default option.

Standing decision (John, 2026-10-22): multiple text parameters are greenfield in 26.2, so they're strictly typed. #23992's `str()` coercions are removed, and a numeric default is rejected. The gxformat2 follow-up types text defaults as strings so that upload catches it too.

[Review response](review_response.md) · [Release rebase](release_26.2_rebase.md) · [PR description](pr_description.md) · [Titles](pr_titles.md) · [Polish](polish_debrief.md) · [Codex review](codex_review.md) · [Implementation](implementation_debrief.md) · [Initial implementation](initial_implementation_debrief.md) · [Scope evaluation](scope_evaluation.md) · [Screenshots](screenshot_debrief.md) · [Test challenges](test_challenges_debrief.md) · [Tracking history](tracking_history.md)

Polished 2026-10-09. On John's call, the scope widened into the client: `validateInputs` now accepts an allowed `""` select option. Red/green results are in the polish debrief. Fork CI on `db7eb057921` hasn't been assessed yet.

Overlaps with #23992 (open): one duplicate API test and a small `restrict_options` conflict. Whichever PR lands second keeps `_is_default_option`.

Fork CI on `9b44c7b0b30` (2026-10-09): only 6 workflows ran. Selenium shard 0 red is unrelated: setup `ReadTimeoutError` on the first test (`test_admin_dependencies_display`); the new `test_execution_with_text_default_value_and_static_restrictions` passed (133 passed, 1 error). Playwright, Integration Selenium, packages and lint are green. Path filters skipped the backend workflows because only a one-line Selenium test edit followed `2552f2bddd8`. On that SHA, API, Workflow framework, Integration and the unit tests are green. Its startup reds were fork "Restore client cache" eviction (unrelated).

## GOOD_MORNING — 2026-10-13

Current fork head `db7eb057921ec603bf48a3c1614cbbf90645ca2f` conflicts with `origin/dev` in 1 paths. Overlapping behavior, schema or assertion changes require deliberate reconciliation beyond the standing mechanical/small-conflict authorization. Branch left intact. `lib/galaxy/workflow/modules.py`

## Release rebase and draft PR — 2026-10-14

John requested rebasing onto 26.2 and opening a `[26.2]` draft. Opened [#24140](https://github.com/galaxyproject/galaxy/pull/24140) against `release_26.2`, titled “[26.2] Fix workflow run form ignoring defaults on text inputs with static restrictions”. Current SHA is `6c9ef2e4ae2099a6c005af62ce17b6d9367782e4`; pushed with `--force-with-lease` to the jmchilton fork.

Resolved the documented #23992 overlap by keeping `_is_default_option`, removing the superseded `default_values` block, preserving release validation tests, and dropping this branch's AST-identical duplicate API test. These conflict resolutions supersede the old final-review state; no conflict-free approval carryover is claimed. John explicitly authorized opening this draft.

Validation: workflow unit suite 193 passed, 2 skipped; focused form tests 60 passed. Whitespace and cleanup commit hooks pass. API/browser execution is pending fresh CI. Verified open/draft, correct base and SHA, with 40 upstream checks queued/in progress at initial refresh. Queue moved to `ci_wait`.

Description updated for the release base and merged #23992. The screenshot is hosted on fork branch `pr-assets-issue_23980_static_restriction_default` at `b321f9f`; the human-read checkbox already checked in the working description was preserved. No mentions added. See the release rebase debrief for details.

## API CI diagnosis — 2026-10-15

[Diagnosis and verification](numeric_default_ci_diagnosis.md) · [Local fix patch](numeric_default_fix.patch).

The linked API job has one relevant regression: numeric YAML list defaults no longer match string option values after the rebase dropped #24108's conversion. Keep the test unchanged. Restored the conversion locally: red reproduction 1 failed/2 passed; corrected value-restriction API suite 8 passed; workflow units 194 passed/1 skipped. Code correction remains uncommitted/unpushed in the branch worktree; PR remains draft at `6c9ef2e4ae2`. Queue moved to `author_work`; other red workflows were not assessed.

## Numeric default fix pushed — 2026-10-16

On John's request, committed the local fix unchanged as `a38979e45f6` and pushed it to the fork. It converts list defaults to strings only in `restrict_options`; doing it in `_is_default_option` would break numeric static `restrictions`. Re-verified locally: value-restriction API tests 8 passed; ruff, black and pre-commit are clean. Queue moved to `ci_wait`.
