# issue_23980_static_restriction_default

Status: `branches_ready_for_final_review`. Base: `dev`. Tip `db7eb057921`.

Preselects defaults for statically restricted workflow text inputs (#23980). The run form can also submit an allowed `""` option.

[PR description](pr_description.md) · [Titles](pr_titles.md) · [Polish](polish_debrief.md) · [Codex review](codex_review.md) · [Implementation](implementation_debrief.md) · [Initial implementation](initial_implementation_debrief.md) · [Scope evaluation](scope_evaluation.md) · [Screenshots](screenshot_debrief.md) · [Test challenges](test_challenges_debrief.md) · [Tracking history](tracking_history.md)

Polished 2026-10-09. On John's call, the scope widened into the client: `validateInputs` now accepts an allowed `""` select option. Red/green results are in the polish debrief. Fork CI on `db7eb057921` hasn't been assessed yet.

Overlaps with #23992 (open): one duplicate API test and a small `restrict_options` conflict. Whichever PR lands second keeps `_is_default_option`.

Fork CI on `9b44c7b0b30` (2026-10-09): only 6 workflows ran. Selenium shard 0 red is unrelated: setup `ReadTimeoutError` on the first test (`test_admin_dependencies_display`); the new `test_execution_with_text_default_value_and_static_restrictions` passed (133 passed, 1 error). Playwright, Integration Selenium, packages and lint are green. Path filters skipped the backend workflows because only a one-line Selenium test edit followed `2552f2bddd8`. On that SHA, API, Workflow framework, Integration and the unit tests are green. Its startup reds were fork "Restore client cache" eviction (unrelated).
