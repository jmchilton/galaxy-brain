- `kind/bug`
- `area/jobs`
- `area/tool-framework`
- `area/testing/api`

The labeler would add `area/database` (from `lib/galaxy/model/**`, a comment-only change there), `area/tool-framework` and `area/testing` + `area/testing/api`; keep `area/testing/api` only. `area/jobs` isn't labeler-applied (`managers/jobs.py` is outside `lib/galaxy/jobs/**`) but the job cache is central.
