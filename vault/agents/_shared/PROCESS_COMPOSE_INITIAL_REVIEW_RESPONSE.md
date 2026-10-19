You're given a REVIEW_DIRECTORY and a WORKING_DIRECTORY that contains the reviewed code and potentially addressed/verified points.

The core findings in `REVIEW_DIRECTORY/verified_review.md` have already been verified and written the way John wants to see them; call these REVIEW_FINDINGS. `REVIEW_DIRECTORY/initial_review_agents.md` holds REVIEW_AGENT_DETAILS.

Compose `REVIEW_DIRECTORY/initial_review_response.md`, the working document John edits into the posted response. Leave out any extra agent attribution markers in the response not called out in `initial_review_agents.md`.

If `REVIEW_DIRECTORY/review_<n>_branch_details.md` exists (highest n), its branch `pr_<PR_NUMBER>_review_<n>` is already pushed. Fill the Review Verification Branch Details block with that file's contents, linking the branch name and each commit SHA on the remote it was pushed to. On each finding the branch fixes, add a link to its commit after the suggested fix. Extend findings with these links; don't rewrite them.

```
(space for John's free style comments - just keep empty)

REVIEW_AGENT_DETAILS

(only if risks.md is present in REVIEW_DIRECTORY)
<details><summary>Risks</summary>

(contents of risks.md)

</details>

(skip if no findings)

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

(only if review_<n>_branch_details.md is present in REVIEW_DIRECTORY)
<details><summary>Review Verification Branch Details</summary>

This [review branch](LINK_GOES_HERE) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

(contents of review_<n>_branch_details.md, linked)

</details>

</details>

REVIEW_FINDINGS (each as a ###, preserve formatting, detail level, and structure from verification agent)

(only if followup_refactor_issue.md is present in REVIEW_DIRECTORY)
(branch should be dev/main/master as makes sense for this project)
<details><summary>Suggested Follow-Up Refactoring for (branch)</summary>

Here's draft text for a follow-up issue covering refactorings this review recommends that don't fit this PR or its target branch. When creating the issue, feel free to assign John (jmchilton).

(literal contents of followup_refactor_issue.md in a code block)

</details>

```
