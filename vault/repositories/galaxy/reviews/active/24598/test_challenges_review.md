# Test challenges review — #24598

Profile: [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) · Model: Opus 5.5 · Effort: low · Reviewed commit: `ec57ee1b020`

**Verdict:** fix is correct and small; the test is a mock-of-the-whole-class unit test that only pins the `sys.exit(1)` line. Replace it with a mock-free subprocess test that triggers a real run-sequence failure (verified red on base, green on head). Details/test plan: [test_challenges_debrief.md](test_challenges_debrief.md).

Method: ran the PR test (passes) and a subprocess repro against base and head scripts using an existing Galaxy venv outside the worktree; nothing written to the worktree.

### P2 1: Exit-code test stubs out all of `Cleanup`, so it never exercises a real failure

`test_main_exits_nonzero_when_run_raises` monkeypatches the module's `Cleanup` with a `BrokenCleanup` stub and loads the script via `importlib`, so it only asserts that `main()` contains `except Exception: sys.exit(1)`. Against the base script it fails with `AttributeError` (no `main`), not at its assertion.

A real failure is free to trigger: `Cleanup.conn` asserts a PostgreSQL dialect inside `run()`, so running the script with a sqlite `database_connection` raises in the run sequence with no DB or Galaxy server. Verified: base script exits 0 after logging `AssertionError: This script can only be used with PostgreSQL.`; PR script exits 1.

Suggested fix: replace the test with a subprocess run of `scripts/cleanup_datasets/pgcleanup.py -c <tmp galaxy.yml with sqlite> --sequence purge_deleted_histories -l <tmp>` asserting `returncode == 1` (sketch in the debrief). Keep it in `test/unit/scripts/` (collected by `run_tests.sh -unit`); it mirrors `BaseScriptsIntegrationTestCase._scripts_check_output` without needing that class's Galaxy server.

### Notes (not findings)

- Positive side effect: existing `test/integration/test_scripts_pgcleanup.py` tests use `check_output`, so they now fail on run-sequence errors that previously exited 0 silently.
- No E2E/API coverage applicable.
