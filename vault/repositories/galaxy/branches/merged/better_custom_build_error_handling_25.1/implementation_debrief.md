# Implementation debrief

Custom build PUT (`len|type=fasta`) loaded the HDA by raw decoded id (`sa_session.get` + `assert`). Now it uses `HDAManager.get_accessible`, injected on `FastAPIUsers` as in `plugins.py`/`tools.py`. An inaccessible dataset returns 403 before any conversion starts.

- Base `release_25.1`, per John.
- Red-to-green: `lib/galaxy_test/api/test_users.py::TestUsersApi::test_custom_build_from_inaccessible_dataset`. The default user makes a private FASTA; a second user tries to build from it and gets 403, and no build is stored. Red on base: 500 "Failed to convert dataset." (conversion was attempted). Green after the fix.
- black / isort / ruff clean; mypy reports nothing in `users.py`.
- Ran with the `issue_24264_library_metadata_file_name_25.1` venv.
- Fast branch per John: codex, thermo, and the rest of hardening were skipped.
- Not covered: there's no API test of the owner happy path, since API test datatypes can't convert fasta → len. The Selenium `test_custom_builds.py` covers that.
