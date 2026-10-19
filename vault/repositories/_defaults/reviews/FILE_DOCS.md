# Review File Docs

Default conventions for files in `repositories/<repo>/reviews/<status>/<pr_number>/`. A repository's own `reviews/FILE_DOCS.md` replaces any section with the same pattern. Records may also hold other research, reproduction scripts, evidence, and notes. Older records use `review.md` and `draft-review.md`.

## index.md

Keep it minimal, without frontmatter. Start with `# <PROJECT>#<pr_number> — <PR title>`, then one bullet line of links: View on GitHub, each review report, verified review, fix branch, response draft, and any later rounds.

Next comes `## Status`: at most one sentence each for the review (latest round, reviewed commit, delivered or not) and the PR (state, CI), each its own paragraph. Don't keep older status updates.

Further sections hold only explicit decisions, dependencies, and standing instructions. When archived, record the GitHub state and why tracking ended.

## verified_review.md

Findings aggregated across all review reports, and renumbered `P<priority> <n>`, with confirmed findings flagged `(implementation verified)`. Sharpened by any fix branch (`pr_<pr_number>_fix_<n>`); disproved findings are dropped with a reason. Each finding names the reviews that discovered it and, when flagged, the model and effort that verified it.

## *_review.md

A review profile's report, named by the [reviewer registry](../../../agents/_shared/reviewers/index.md). Opens with the profile, model, effort level, and reviewed commit, then findings, each labeled P1 (must fix before merge), P2 (should fix), or P3 (minor or nit).

## initial_response_draft.md

John's unposted response, written from `verified_review.md`. Opens with one sentence naming each review's profile, model, and effort level, then P1 and P2 findings only, linking fix branch commits where they help. No P3s, nits, or review-process archeology.

## initial_response_action.md

Checkbox list of what to do with `initial_response_draft.md` and any fix branch: approve, comment, review comment, request changes, open a PR from the fix branch, or push it into the PR. John checks the options.

## review-*.md

A dated review round (`review-YYYY-MM-DD.md`) for a PR reviewed more than once. Earlier rounds keep their reviewed commits so they aren't mistaken for current blockers.

## screenshots/

Local captures supporting the review. Ignored by git; describe useful captures in the notes.
