# Implementation debrief

Custom build PUT (`len|type=fasta`) wrapped any failure to start the `len`/`linecount` conversion in a 500 `ToolExecutionError("Failed to convert dataset.")`. Now `NoConverterException` maps to `RequestParameterInvalidException("Cannot create a custom build from this dataset: Conversion from 'bed' to 'len' not possible")`, following `services/datasets.py` `_get_or_create_converted`. Other exceptions are no longer wrapped, so they surface as normal unhandled 500s with a traceback.

- Base `release_26.0`: the code is identical there and on dev.
- Red-to-green: `lib/galaxy_test/api/test_users.py::TestUsersApi::test_custom_build_from_unconvertible_dataset` (bed dataset → 400 naming `bed`, build not stored). Red on base: 500 "Failed to convert dataset.". Green after the fix.
- black / isort / ruff clean; mypy reports nothing in `users.py`.
- Ran with the `issue_24273_dataset_edit_alert_26.0` worktree's venv (the dev venv's gxformat2 is too new for 26.0).
- Not covered: if only `len_to_linecount` is missing, the `fasta → len` job is already queued when the 400 is raised. Stock datatypes ship both converters.
