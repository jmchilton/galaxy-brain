# Private security reports

Keep security findings and sensitive evidence out of galaxy-brain. This applies
to every agent, including delegated reviewers, and takes precedence over normal
instructions to write review notes, debriefs, or queue updates in the repository.

## Write directly to John's home directory

- Put security reports directly in `/Users/jxc755/`, for example
  `/Users/jxc755/security-galaxy-pr-12345-2026-10-05.md`. Use a unique filename
  containing only a project/task identifier and date, not vulnerability details.
  Do not overwrite an existing report.
- Create reports with owner-only permissions (`0600`, or an equivalent private
  creation mode). Do not first write them into a repository and move them later.
  Keep sensitive reproductions, logs, and other evidence outside repositories too.
- If writing there needs sandbox approval, request that approval. If it is not
  available, tell John privately that the report could not be saved; never fall
  back to a repository file, including an ignored file or `old/`.

## Keep repository and public outputs clean

- Do not put security findings, exploit details, credentials, sensitive logs, or
  private report paths in tracking files, review notes, plans, debriefs, commit
  messages, PR descriptions, GitHub comments, issues, or gists.
- For mixed reviews, keep ordinary findings in the normal review note and put
  the security portion only in the private report. Queue statuses may remain
  generic (such as `review in progress`); do not explain the private finding there.
- Tell John in the private conversation where the report was saved and flag any
  urgent action. Do not automatically publish or disclose it elsewhere.
- Treat suspected findings as private while investigating. Ordinary tracking of
  publicly discussed security maintenance can remain in the repo, but do not
  copy security reports or add non-public details.

## Delegation and accidental recording

- Give subagents this policy and the private output destination **before** they
  start. Their returned summary must not contain sensitive findings; it may tell
  the coordinator privately where the report is.
- If sensitive material has already been recorded in the repo, stop syncing the
  affected material and notify John privately. Do not assume deleting a file
  removes it from Git history; historical cleanup requires a separately scoped
  action. Do not sweep existing reports into routine commits.
