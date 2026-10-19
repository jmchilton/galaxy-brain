Act on the checked boxes in the PR record's `initial_response_action.md`, follow-up to [PROCESS_INITIAL_REVIEW.md](PROCESS_INITIAL_REVIEW.md). Nothing unchecked; if nothing is checked, ask John. Open any PR or issue before posting the response so it can link them.

- **Approve, Comment, Review comment, Request changes** — post `initial_review_response.md` as that kind of PR response. If more than one is checked, ask John which. Never add @-mentions.
- **Pull request** — open a PR from the fix branch on John's fork against the PR's head branch, so the author can merge the fixes. Link it from the response when both are checked.
- **Issue (refactor)** — open the follow-up refactor issue from `verified_review.md`'s Suggested Follow-Up Refactorings on PROJECT's upstream repository, led by the Claude attribution marker, with no @-mentions. Link it from the response when both are checked.
- **Issue (galaxy-brain)** — open an issue on jmchilton/galaxy-brain from `learning_galaxy_followup_issue.md`. Don't link it from the response.
- **Push** — push the fix branch onto the PR's head branch. Fast-forward only; never force-push. If the push is refused, report back rather than working around it.

Afterwards, update the record's `index.md` status and the agent's `PULL_REQUESTS.md` entry to show what was delivered, and check off the completed boxes.
