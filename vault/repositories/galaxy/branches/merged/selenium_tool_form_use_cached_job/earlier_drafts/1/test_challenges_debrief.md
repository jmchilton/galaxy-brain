# Test challenges debrief

No unit/API tests on the branch; the one E2E test (`test_run_reuses_equivalent_job`) is the right layer and stays. Strengthened it and fixed a Selenium flake it exposed.

- Strengthened: assert the first cat1 job has `copied_from_job_id is None`, so the check proves the switch (not some ambient caching) caused the copy.
- Flake found: Selenium failed ~2 of 9 runs. Diagnostic showed the rerun's `input1` was hid 2: the form's late default pick overrode the explicit `reuse_input.txt` choice, so "No equivalent jobs found". Fixed in polish step (wait for default, assert pick).
- Red-without-change: test-only branch; earlier debrief showed red on Playwright with the switch call removed.
- Helpers: uses `dataset_populator` and existing `tool_form_*` helpers; no repeated raw HTTP.
