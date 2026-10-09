# selenium_scheduled_ci

Status: `branches_ready_for_final_review`. Base: `dev`. Tip `85b37d45dbe`.

Runs Selenium CI weekly or on demand and tracks dev failures in a GitHub issue.

[Implementation](implementation_debrief.md) · [Polish](polish_debrief.md) · [PR description](pr_description.md) · [Titles](pr_titles.md) · [Tracking history](tracking_history.md)

Decisions for John:
- Weekly (Tuesday) cadence or nightly.
- Whether to assign or ping anyone on new issues. Currently nobody.
- Whether to also cover `release_*`, which the old workflow ran on push.
- Whether to smoke-run it on the fork first.

The workflow can't run upstream until it's on `dev`.
