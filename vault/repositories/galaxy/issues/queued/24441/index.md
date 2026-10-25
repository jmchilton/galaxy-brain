# #24441 Tool Shed upload API `dry_run`

https://github.com/galaxyproject/galaxy/issues/24441. Filed 2026-10-24, assigned jmchilton.

- [issue_draft.md](issue_draft.md): original agent draft with the full plan and tests
- [proposal.md](proposal.md): the posted text
- [debrief.md](debrief.md): research and review

Source: the review of planemo#1752 (`vault/repositories/planemo/reviews/active/1752/`). Planemo consumption gets its own planemo issue.

Next: red unit tests for the `upload_tar` dry-run bugs (alerts, clone leak), then split `set_repository_metadata` into compute and persist.
