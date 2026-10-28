Run via Claude Opus 5.5 at low effort.

No refactoring of the base branch was performed.

Re-evaluated post-re-scope. Only candidate remains a pass-through `get_accessible_converted` (lookup without check) landed ahead of the fix to move the four call sites (`services/datasets.py` fli, `users.py`, `registry.py`) separately. Rejected: the helper's sole purpose is the check, so a delegation-only commit is churn and the fix commit wouldn't shrink meaningfully (~10 lines). `converted/{ext}` deliberately bypasses the helper, so it gains nothing either. History left as is; "Baseline tests" commit stays first.
