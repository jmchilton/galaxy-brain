Run via Claude Opus 5.5 at low effort.

No refactoring of the base branch was performed.

The only candidate was a pass-through `get_accessible_converted` (no access check) routing the three callers ahead of the fix. Rejected: the helper is ~10 lines and its only purpose is the check, so a pure-delegation commit adds churn without making the fix commit meaningfully smaller. The test GET helper commit (`559503cd03c`) is already test-only and lands after the "Baseline tests" commit; history left as is.
