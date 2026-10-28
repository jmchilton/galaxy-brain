# Debrief

- Re-checked on `origin/dev` and `origin/release_26.2` (fetched 2026-10-28): bug still present. Merged #24312 (`custom_build_from_fasta`) was E2E-only and didn't fix it.
- `users.py` `add_custom_builds` calls `get_converted_dataset(trans, "len"/"linecount")` without `history=`. The tool action falls back to `trans.get_history(create=True)`, which is None for API-key requests, so `assert history` fails. Only `NoConverterException` is caught, so it's an unhandled 500. Dev and 26.2 have the same code.
- Raw notes said a broad `except Exception` wraps it as "Failed to convert dataset." on 26.2. That's wrong: #24310 merged forward, so the narrow `except` is on both.
- Duplicate search: none. Closest is #24309, listed as related.
- Review round (subagent): fixed the version claim. Also fixed a safety hole in the proposed fix: the dataset is only checked with `get_accessible`, so using `dataset.history` blindly would put jobs into another user's shared history. The fix now uses the FASTA's history only when the requester owns it, and otherwise the current or most recent history. Dropped "user owns" from the repro.
- Unresolved: red test not run live (it was run in an earlier session on `custom_build_from_fasta`, per raw.md). Fallback when the user has no history at all (create one?). `services/datasets.py:984,1063` may have the same omission; not verified.
