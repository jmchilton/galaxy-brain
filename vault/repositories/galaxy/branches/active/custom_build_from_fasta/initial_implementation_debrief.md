# Initial implementation debrief — custom_build_from_fasta

Base `release_26.2` (`e2649e52818`). Cherry-picked "Test adding a custom build from a history FASTA dataset" (`2782db29ee2` on `galaxy_ui_driver`) as `4d59114a0b1`. One context-only conflict in `navigation.yml`: the `activity_bar` block belongs to another `galaxy_ui_driver` commit and was dropped.

Built in the `galaxy_ui_driver` worktree (long-lived E2E worktree, switched branch; driver-launched Galaxy, so framework datatypes and no port clash with the other session's 8080/5173).

## Red → green

- Playwright (headless): 3/3 in `test_custom_builds.py` pass.
- Selenium: 3/3 pass (upstream notes had Playwright only).
- Red: `sample_datatypes_conf.xml` hunk reverted → `test_build_add_from_fasta` times out waiting for the build row (conversion fails, build never listed).
- `lib/galaxy_test/api/test_datatypes.py`: 10 passed with the new datatypes.

## Notes

- Test does `wait_for_history()` then re-navigates, working around the queued "FASTA build not listed until reload" issue. `wait_for_history` uses history state, which covers the hidden `len`/`linecount` datasets.
- Existing helpers (`add_custom_build`, `delete_custom_build`, `get_custom_builds`) still use raw selectors alongside the new components — candidate for hardening.
- Pre-existing Pydantic serializer warning: text builds store `count` as `'0'` (string) vs `CustomBuildModel`.
