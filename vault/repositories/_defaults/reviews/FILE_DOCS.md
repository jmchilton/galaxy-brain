# Review File Docs

Default conventions for files in `repositories/<repo>/reviews/<status>/<pr_number>/`. A repository's own `reviews/FILE_DOCS.md` replaces any section with the same pattern. Records may also hold other research, reproduction scripts, evidence, and notes.

## index.md

Ongoing debrief of the review, without frontmatter. Makes the latest review, reviewed commit, and whether it was delivered easy to find, and links findings, research, and draft comments near the top. When archived, records the GitHub state and why tracking ended.

## review.md

The review: findings against a stated reviewed commit.

## review-*.md

A dated review round (`review-YYYY-MM-DD.md`) for a PR reviewed more than once. Earlier rounds keep their reviewed commits so they aren't mistaken for current blockers.

## draft-review.md

Unposted review text for John to post. Superseded by later rounds and PR discussion; not evidence of a current blocker on its own.

## screenshots/

Local captures supporting the review. Ignored by git; describe useful captures in the notes.
