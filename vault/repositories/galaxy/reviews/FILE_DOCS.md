# Galaxy Review File Docs

Galaxy conventions for files in `repositories/galaxy/reviews/<status>/<pr_number>/`. Sections here replace the [default Review File Docs](../../_defaults/reviews/FILE_DOCS.md) with the same pattern; other files fall through to them. Older records use `review.md` and `draft-review.md`.

## index.md

Keep it minimal, like branch indexes. Start with `# #<pr_number> — <PR title>`, then one bullet line of links: View on GitHub, initial review, response draft, and any later rounds.

Next comes `## Status`: at most one sentence each for the review (latest round, reviewed commit, delivered or not) and the PR (state, CI), each its own paragraph. Don't keep older status updates.

Further sections hold only explicit decisions, dependencies, and standing instructions.

## initial_review.md

The first review: findings against a stated reviewed commit, each labeled P1 (must fix before merge), P2 (should fix), or P3 (minor or nit).

## initial_response_draft.md

John's unposted response to `initial_review.md`. Opens with one sentence naming the model and effort level that performed the review, then the P1 and P2 findings only. No P3s or nits.
