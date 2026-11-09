# Galaxy Review File Docs

Galaxy conventions for files in `repositories/galaxy/reviews/<status>/<pr_number>/`. Sections here replace the [default Review File Docs](../../_defaults/reviews/FILE_DOCS.md) with the same pattern; other files fall through to them.

## index.md

Keep it minimal, like branch indexes. Start with `# #<pr_number> — <PR title>`, then one bullet line of links: View on GitHub, each review report, the findings YAML, John's notes, review branch, and any later rounds.

Next comes `## Status`: at most one sentence each for the review (latest round, reviewed commit, delivered or not) and the PR (state, CI), each its own paragraph. Don't keep older status updates.

Further sections hold only explicit decisions, dependencies, and standing instructions.

## learning_galaxy.md

The [learning_galaxy](../../../agents/gx_reviews/reviewers/learning_galaxy.md) profile's notes on what the PR teaches about Galaxy's architecture, for John. No findings; it may only say the PR isn't architecturally interesting.

## learning_galaxy_followup_issue.md

Draft galaxy-brain issue listing research notes the PR makes stale, including post-merge updates.
