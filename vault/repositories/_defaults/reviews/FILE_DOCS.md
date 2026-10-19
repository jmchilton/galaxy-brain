# Review File Docs

Default conventions for files in `repositories/<repo>/reviews/<status>/<pr_number>/`. A repository's own `reviews/FILE_DOCS.md` replaces any section with the same pattern. Records may also hold other research, reproduction scripts, evidence, and notes. Older records use `review.md`, `draft-review.md`, and `initial_response_draft.md`.

## index.md

Keep it minimal, without frontmatter. Start with `# <PROJECT>#<pr_number> — <PR title>`, then one bullet line of links: View on GitHub, each review report, verified review, fix branch, response, and any later rounds.

Next comes `## Status`: at most one sentence each for the review (latest round, reviewed commit, delivered or not) and the PR (state, CI), each its own paragraph. Don't keep older status updates.

Further sections hold only explicit decisions, dependencies, and standing instructions. When archived, record the GitHub state and why tracking ended.

## verified_review.md

Findings aggregated across all review reports, and renumbered `P<priority> <n>`, with confirmed findings flagged `(implementation verified)`. Sharpened by any fix branch (`pr_<pr_number>_fix_<n>`); filtered findings go to `filtered_findings.md`. Each finding names the reviews that discovered it and, when flagged, the model and effort that verified it.

## learning_galaxy.md

The learning_galaxy profile's notes on what the PR teaches about Galaxy's architecture, for John. No findings; it may only say the PR isn't architecturally interesting.

## learning_galaxy_followup_issue.md

Draft galaxy-brain issue listing research notes the PR makes stale, including post-merge updates.

## *_review.md

A review profile's report, named by the [reviewer registry](../../../agents/_shared/reviewers/index.md). Opens with the profile, model, effort level, and reviewed commit, then findings, each labeled P1 (must fix before merge), P2 (should fix), or P3 (minor or nit).

## initial_review_agents.md

The coordinator's collapsible list of review profiles, models, and efforts, placed at the top of the response.

## filtered_findings.md

Findings the verifier kept out of `verified_review.md`, each with a one-line reason, for John alone. Only present when something was filtered.

## test_challenges_debrief.md

The test challenger's raw debrief and test plan, condensed into `test_challenges_review.md`.

## thermo_followup_refactor_issue.md

Draft follow-up issue for refactorings thermo_review judged too large for a release-branch bug fix.

## initial_review_response.md

John's working response, composed from `initial_review_agents.md` and `verified_review.md`; John edits it before it's posted.

## initial_response_action.md

Checkbox list of what to do with `initial_review_response.md` and any fix branch: approve, comment, review comment, request changes, open a PR from the fix branch, push it into the PR, or open the follow-up refactor or galaxy-brain issue. John checks the options.

## review-*.md

A dated review round (`review-YYYY-MM-DD.md`) for a PR reviewed more than once. Earlier rounds keep their reviewed commits so they aren't mistaken for current blockers.

## screenshots/

Local captures supporting the review. Ignored by git; describe useful captures in the notes.
