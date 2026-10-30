# `set_user_disk_usage.py`'s `quotacheck` ignores its parameter and reads a global `user`

- Area: scripts/set_user_disk_usage.py
- Found while: [[Component - User Disk Usage Accounting]]
- Galaxy SHA: 65e6daff
- Severity: low

## Problem

`quotacheck(sa_session, users, engine, object_store)` (`scripts/set_user_disk_usage.py:48-68`) never uses `users` or `engine`. The body refreshes and recalculates `user`, which only resolves because the `__main__` block binds a module-level `user` (the `for i, user in enumerate(...)` loop, or the single-user lookup) before each call. Calling `quotacheck` from anywhere else raises `NameError`, and a rename of the loop variable would silently break the script.

`--dry-run` also only reports the default quota source: it prints `calculate_disk_usage_default_source()` (`lib/galaxy/model/__init__.py:1203-1231`) and never computes the labelled `user_quota_source_usage` rows that a real run rewrites.

## Evidence / repro

Code read only.

## Suggested fix

Rename the parameter to `user`, drop `engine`, and have `--dry-run` report each labelled source too, for example by running `calculate_user_disk_usage_statements` in a rolled-back transaction.
