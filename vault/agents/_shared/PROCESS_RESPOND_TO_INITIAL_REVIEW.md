Act on the actions John checked for a PR record's latest review round, follow-up to [PROCESS_INITIAL_REVIEW.md](PROCESS_INITIAL_REVIEW.md). RF is `~/projects/repositories/galaxy-brain/review-factory/bin/review-factory`. Nothing unchecked; if nothing is checked, ask John. A round without `REVIEW_DIRECTORY/review_<N>_findings.yml` started on Markdown files and responds as in the last section.

The checked actions are the `actions` in `review_<N>_findings.yml`. Run `RF check --record REVIEW_DIRECTORY` first; if it prints any `⛔` line, stop and report it to John. Warnings go to John and don't block.

- **Pull request** — run `RF compose pr --record REVIEW_DIRECTORY --title` and `RF compose pr --record REVIEW_DIRECTORY`, and open a PR from the review branch on John's fork against the PR's head branch with that title and body. Then run `RF compose comment --record REVIEW_DIRECTORY --pr-url <url>` for the comment.
- **Approve, Approve and merge, Comment, Review comment, Request changes** — otherwise run `RF compose comment --record REVIEW_DIRECTORY`. Post its stdout unmodified as the checked kind of response: `gh pr review --approve|--comment|--request-changes --body-file -`, or `gh pr comment --body-file -` for Comment. If a compose command exits non-zero, post nothing and report its errors to John.
- **Approve and merge** — approve with the response, then merge the PR last, after any Push. If the merge is blocked (failing CI, conflicts, missing approvals), report back rather than working around it.
- **Issue (refactor)** — open the follow-up refactor issue from `followup_refactor_issue.md` on PROJECT's upstream repository, with no @-mentions. The response already carries its text.
- **Issue (galaxy-brain)** — open an issue on jmchilton/galaxy-brain from `learning_galaxy_followup_issue.md`. Don't link it from the response.
- **Push** — push the review branch onto the PR's head branch. Fast-forward only; never force-push. `RF check` refuses one that wouldn't fast-forward; if the push is still refused, report back rather than working around it.

Afterwards, update the record's `index.md` status and PROJECT's `MY_REVIEWS.md` entry to show what was delivered, and set the delivered actions back to false. The posted text is on GitHub, so nothing records it in the vault.

## Rounds on Markdown

Act on the checked boxes in `initial_response_action.md`. Open any PR or issue before posting the response so it can link them. Stop and ask John before acting if:

- `verified_findings_checklist.md` has an unchecked finding. Trim leaves every box checked, so it hasn't run; ask for [PROCESS_TRIM_FINDINGS.md](PROCESS_TRIM_FINDINGS.md) first.
- `initial_review_response.md` still holds the `(space for John's free style comments` placeholder.

The actions are as above, except:

- **Approve, Approve and merge, Comment, Review comment, Request changes** — post `initial_review_response.md` as that kind of PR response, with its Human Review placeholder replaced by `human_review.md` (or dropped when there's none). If more than one is checked, ask John which.
- **Pull request** — the PR message is in `REVIEW_DIRECTORY/initial_pr_description.md`; stop if it isn't there. Link the PR from the response.
- **Issue (refactor)** — link the issue from the response.

Afterwards, update `index.md` and `MY_REVIEWS.md` as above, and check off the completed boxes.
