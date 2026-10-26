Act on the checked boxes in the PR record's `initial_response_action.md`, follow-up to [PROCESS_INITIAL_REVIEW.md](PROCESS_INITIAL_REVIEW.md). Nothing unchecked; if nothing is checked, ask John. Open any PR or issue before posting the response so it can link them.

- **Approve, Approve and merge, Comment, Review comment, Request changes** — post `initial_review_response.md` as that kind of PR response. If more than one is checked, ask John which.
- **Approve and merge** — approve with the response, then merge the PR last, after any Push. If the merge is blocked (failing CI, conflicts, missing approvals), report back rather than working around it.
- **Pull request** — If indicated, open a PR from the review branch on John's fork against the PR's head branch, so the author can merge the fixes. Link it from the response when both are checked. The PR message should be in `REVIEW_DIRECTORY/initial_pr_description.md` - stop responding to review if this file isn't present but the open Pull Request action is selected.
- **Issue (refactor)** — open the follow-up refactor issue from `followup_refactor_issue.md` on PROJECT's upstream repository, with no @-mentions. Link it from the response when both are checked.
- **Issue (galaxy-brain)** — open an issue on jmchilton/galaxy-brain from `learning_galaxy_followup_issue.md`. Don't link it from the response.
- **Push** — push the review branch onto the PR's head branch. Fast-forward only; never force-push. If the push is refused, report back rather than working around it.

Afterwards, update the record's `index.md` status and the agent's `PULL_REQUESTS.md` entry to show what was delivered, and check off the completed boxes.
