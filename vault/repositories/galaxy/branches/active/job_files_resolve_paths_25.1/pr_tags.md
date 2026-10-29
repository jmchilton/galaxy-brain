- `kind/bug` — malformed job files writes 500 on `release_25.1`.
- `area/API` — `lib/galaxy/webapps/galaxy/api/job_files.py` (also applied by the labeler).
- `area/jobs` — the job files API serves job runners (Pulsar staging); the ports log line is job-side too. Not auto-applied (labeler only matches `lib/galaxy/jobs/**`).

Skipped: `area/testing/integration` — tests support the fix, not the focus.
