Planemo's governance already lets committers merge PRs at their discretion, but does not explicitly address their own PRs. Clarify that any committer can self-merge without another committer's approval or a fixed waiting period, after checking lint, relevant tests and CI results, and resolving outstanding review concerns. Link the policy from the contributor guide.

Review remains expected for broad or potentially disruptive changes and where additional expertise would help. Requested reviews and objections must be resolved before merging. Contributions from people without commit access still need a committer to review and merge them.

The matching administrative change is to retain PRs on `master` while reducing required approvals from one to zero. This PR does not change repository settings. Current governance has delegated merge discretion since 2015, so this clarifies that policy and proposes relaxing its configured approval requirement.

Validation: `make lint`, warning-free Docutils parsing of both edited files, and `git diff --check` passed. Application tests were not run for this documentation-only change. Fork CI is queued.
