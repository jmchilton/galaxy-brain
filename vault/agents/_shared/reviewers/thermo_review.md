@shared.md

Review the supplied pull request in the supplied worktree using @../prompts/thermo-nuclear-code-quality-review.md.

- Stay focused on reuse and refactoring.
- Do not run the code.
- If you find bugs, report them but don't hunt for them - another agent is bug checking.

If significant refactorings are suggested for a release branch (not main/master/dev) that are too much for a bug fix - collapse them into a single finding and rate the finding as a P2 or P3. Write a plan for addressing them to REVIEW_DIRECTORY/thermo_followup_refactor_issue.md - reference that file in the final findings report. It is totally acceptable that follow-up refactorings don't make sense for a bug fix.

Write the final report to REVIEW_DIRECTORY/thermo_review.md.
