# Review File Docs

Default conventions for files in `repositories/<repo>/reviews/<status>/<pr_number>/`. A repository's own `reviews/FILE_DOCS.md` replaces any section with the same pattern. Records may also hold other research, reproduction scripts, evidence, and notes. Older records use `review.md`, `draft-review.md`, and `initial_response_draft.md`.

## index.md

Keep it minimal, without frontmatter. Start with `# <PROJECT>#<pr_number> — <PR title>`, then one bullet line of links: View on GitHub, each review report, the findings YAML, John's notes, review branch, and any later rounds.

Next comes `## Status`: at most one sentence each for the review (latest round, reviewed commit, delivered or not) and the PR (state, CI), each its own paragraph. Don't keep older status updates.

Further sections hold only explicit decisions, dependencies, and standing instructions. When archived, record the GitHub state and why tracking ended.

## review_*_findings.yml

A review round's findings, `review_<N>_findings.yml` for round N, written by the verifier per [PROCESS_INITIAL_REVIEW.md](../../../agents/_shared/PROCESS_INITIAL_REVIEW.md): each finding with an `include` toggle, filtered ones as `F` items with their reason, the review branch's revisions and commits, the review agents, and the `actions` John checks. John toggles `include` and the actions on the record's landing page; `review-factory compose` turns it, with John's notes, into the posted response and the review-branch PR body. Ids are never renumbered, so gaps show dropped findings.

## johns_review_*_comment_note.md

John's words at the top of round N's comment or review, `johns_review_<N>_comment_note.md`. Created empty by the coordinator; compose refuses while it's empty.

## johns_review_*_pr_note.md

John's words at the top of the review-branch PR's body, `johns_review_<N>_pr_note.md`. Created empty when there's a review branch; needed only when Pull request is checked.

## verified_review.md

Rounds on Markdown only, before findings YAML. Findings aggregated across all review reports, and numbered `P<priority> <n>`, with confirmed findings flagged `(implementation verified)`. Ids are never renumbered, so gaps show trimmed findings. Sharpened by any review branch (`pr_<pr_number>_round_<N>_rev_<m>`, or `pr_<pr_number>_review_<n>` in older rounds); filtered findings go to `filtered_findings.md`. Each finding names the reviews that discovered it and, when flagged, the model and effort that verified it.

## *_review.md

A review profile's report, named by the [shared reviewer registry](../../../agents/_shared/reviewers/index.md) or the reviewing agent's own `reviewers/index.md`. Opens with the profile, model, effort level, and reviewed commit, then findings, each labeled P1 (must fix before merge), P2 (should fix), or P3 (minor or nit).

## *_branch_details.md

Rounds on Markdown only; the findings YAML lists the branch now. What the review branch does: one readable paragraph, then its commits with one sentence each and the finding each fixes. `round_<N>_rev_<m>_branch_details.md` describes `pr_<pr_number>_round_<N>_rev_<m>`, where N is the review round and m the trim revision; older rounds use `review_<n>_branch_details.md` for `pr_<pr_number>_review_<n>`.

## risks.md

The risk assessment profile's one-way/two-way door assessment, with no heading, pasted into the response's Risks block.

## initial_review_agents.md

Rounds on Markdown only. The coordinator's collapsible list of review profiles, models, and efforts, placed at the top of the response.

## filtered_findings.md

Rounds on Markdown only. Findings the verifier kept out of `verified_review.md`, or John trimmed, each with a one-line reason, for John alone. Only present when something was filtered.

## test_challenges_debrief.md

The test challenger's raw debrief and test plan, condensed into `test_challenges_review.md`.

## thermo_followup_refactor_issue.md

Draft follow-up issue for refactorings thermo_review judged too large for a release-branch bug fix.

## initial_review_response.md

Rounds on Markdown only. John's working response, composed from `initial_review_agents.md` and `verified_review.md`; John edits it before it's posted.

## initial_response_action.md

Rounds on Markdown only. Checkbox list of what to do with `initial_review_response.md` and any review branch: approve, approve and merge, comment, review comment, request changes, open a PR from the review branch, push it into the PR, or open the follow-up refactor or galaxy-brain issue. John checks the options.

## verified_findings_checklist.md

Rounds on Markdown only. One checked box per finding in `verified_review.md`, each with a one-line summary, then a free-text Other Actions section. John unchecks findings to drop, optionally writing why after the summary, and writes requests under Other Actions; [PROCESS_TRIM_FINDINGS.md](../../../agents/_shared/PROCESS_TRIM_FINDINGS.md) then rebuilds the review branch as its next revision. Respond refuses while a box is unchecked.

## review-*.md

A dated review round (`review-YYYY-MM-DD.md`) for a PR reviewed more than once. Earlier rounds keep their reviewed commits so they aren't mistaken for current blockers.

## screenshots/

Local captures supporting the review. Ignored by git; describe useful captures in the notes.

## human_review.md

One sentence saying John reviewed all commits and/or diffs of the latest differential review snapshot, naming its head SHA. Written and deleted only by the review plugins as John checks items off; agents never create or edit it. Quoted under "Human Review" when the response is posted.

## differential-review/**

Differential review data for the PR. `snapshots/*.json` are immutable, gitignored snapshots of the PR head at each review round, written only by the `differential-review` CLI ([PROCESS_DIFFERENTIAL_REVIEW_SNAPSHOT](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_DIFFERENTIAL_REVIEW_SNAPSHOT.md)). `review-state.json` holds John's optional check-offs and is written only by the review plugins; agents never create, edit or delete it.

`annotations/threads/*.json` hold John's source-anchored comments and resolution. `annotations/replies/*.json` hold individual human or agent responses, optionally linked to a revision snapshot. Both are tracked. Agents append responses through the CLI following [PROCESS_DIFFERENTIAL_REVIEW_COMMENTS](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_DIFFERENTIAL_REVIEW_COMMENTS.md), and leave thread resolution to John.
