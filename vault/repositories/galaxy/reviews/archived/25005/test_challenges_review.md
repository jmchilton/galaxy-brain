# Test challenges review — galaxy#25005

Profile gx_test_challenger, Claude Opus 5.5, effort low, reviewed commit 2b11cda0d36d236a4562eb8ef7be2cfeb77add03. Details: [test_challenges_debrief.md](test_challenges_debrief.md). Tests not run (no .venv).

Overall: tests are well layered and behavioral; no tests to drop or rewrite.

### P2 1 — `fail()` path untested
`MinimalJobWrapper.fail()` now routes through `_move_working_directory_output` and swallows `OutputCollectionSecurityError`, but no test drives a failing job whose named output links outside the job dir. Add a tool option (e.g. `named_outside_fail`: link then `exit 1`) to `output_symlink_containment.xml` and a test in the outputs_to_working_directory base asserting the sentinel isn't in any output.

### P3 1 — directory-strategy metadata test weaker than extended sibling
`test_directory_metadata_rejects_output_symlink_outside_job_directory` only asserts metadata failure; also assert the dataset file doesn't contain the sentinel, as the extended test does.

### P3 2 — glob `from_work_dir` not covered end to end (optional)
Python-side glob escaping in `_ensure_outputs_in_job_directory` is only exercised with a literal path. An integration variant with a `*` from_work_dir pointing at an outside link would cover it.
