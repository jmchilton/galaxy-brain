# Review File Docs

Default conventions for files in `repositories/<repo>/reviews/<status>/<pr_number>/`. A repository's own `reviews/FILE_DOCS.md` replaces any section with the same pattern. Records may also hold other research, reproduction scripts, evidence, and notes. Older records use `review.md` and `draft-review.md`.

## index.md

Keep it minimal, without frontmatter. Start with `# <PROJECT>#<pr_number> — <PR title>`, then one bullet line of links: View on GitHub, each review report, response draft, and any later rounds.

Next comes `## Status`: at most one sentence each for the review (latest round, reviewed commit, delivered or not) and the PR (state, CI), each its own paragraph. Don't keep older status updates.

Further sections hold only explicit decisions, dependencies, and standing instructions. When archived, record the GitHub state and why tracking ended.

## *_review.md

A review profile's report, named by the [reviewer registry](../../../agents/_shared/reviewers/index.md): findings against a stated reviewed commit, each labeled P1 (must fix before merge), P2 (should fix), or P3 (minor or nit).

## initial_response_draft.md

John's unposted response, aggregating P1 and P2 findings across all review reports. Opens with one sentence naming each review's profile, model, and effort level. No P3s or nits.

## review-*.md

A dated review round (`review-YYYY-MM-DD.md`) for a PR reviewed more than once. Earlier rounds keep their reviewed commits so they aren't mistaken for current blockers.

## screenshots/

Local captures supporting the review. Ignored by git; describe useful captures in the notes.
