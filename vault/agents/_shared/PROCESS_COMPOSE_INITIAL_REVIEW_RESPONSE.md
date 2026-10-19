You're given a REVIEW_DIRECTORY and a WORKING_DIRECTORY that contains the reviewed code and potentially addressed/verified points.

The core findings in `REVIEW_DIRECTORY/verified_review.md` have already been verified and written the way John wants to see them; call these REVIEW_FINDINGS. `REVIEW_DIRECTORY/initial_review_agents.md` holds REVIEW_AGENT_DETAILS.

Compose `REVIEW_DIRECTORY/initial_review_response.md`, the working document John edits into the posted response. Leave out the Claude attribution marker ("posted by Claude on John's behalf"); [PROCESS_RESPOND_TO_INITIAL_REVIEW.md](PROCESS_RESPOND_TO_INITIAL_REVIEW.md) adds it when Claude posts.


```
(space for John's free style comments - just keep empty)

REVIEW_AGENT_DETAILS

## Automated Review Findings (skip if no findings)

### About

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

REVIEW_FINDINGS (each as a ###, preserve formatting, detail level, and structure from verification agent)

Suggested Follow-Up Refactorings block from verified_review.md, if present
```
