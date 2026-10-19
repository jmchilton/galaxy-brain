# Galaxy Review File Docs

Galaxy conventions for files in `repositories/galaxy/reviews/<status>/<pr_number>/`. Sections here replace the [default Review File Docs](../../_defaults/reviews/FILE_DOCS.md) with the same pattern; other files fall through to them.

## index.md

Keep it minimal, like branch indexes. Start with `# #<pr_number> — <PR title>`, then one bullet line of links: View on GitHub, each review report, verified review, fix branch, response, and any later rounds.

Next comes `## Status`: at most one sentence each for the review (latest round, reviewed commit, delivered or not) and the PR (state, CI), each its own paragraph. Don't keep older status updates.

Further sections hold only explicit decisions, dependencies, and standing instructions.
