---
upstream_base_branch: master
pr: 1780
related_records: planemo/branches/release_process_agents
---
# Push only the release tag in make release; check release packages

- [View PR #1780](https://github.com/galaxyproject/planemo/pull/1780)
- [View on GitHub](https://github.com/jmchilton/planemo/tree/release_process_polish)

## Status

Branch `release_process_polish` on `jmchilton`, base `master`; `~/projects/worktrees/planemo/branch/release_process_polish`.

PR #1780 opened 2026-11-05 at John's request.

CI pending on `776c0f3d`.

## Notes

- Fixes problems hit cutting 0.75.48: `git push --tags` pushed 12 stray local tags upstream, and because >3 tags went in one push GitHub fired no tag events, so Deploy didn't run. Stray tags were deleted and 0.75.48 re-pushed alone.
- Red/green check: scratch `make release` against a local bare upstream, old vs new Makefile.
