Common directions for every review profile. The coordinator supplies the PR, its worktree, and REVIEW_DIRECTORY, the PR's record under `vault/repositories/PROJECT/reviews/`.

Review against a stated reviewed commit. Label each actionable finding P1 (must fix before merge), P2 (should fix), or P3 (minor or nit). Write the report to the file the profile names in REVIEW_DIRECTORY and return only a short, non-sensitive summary.

Security findings and sensitive evidence instead follow [SECURITY_REPORTS.md](../SECURITY_REPORTS.md): write them directly to John's home directory, never into the repository. For mixed reviews, keep only ordinary findings in the normal record. Report private security-report locations only to the coordinator.
