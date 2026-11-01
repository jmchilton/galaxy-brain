Look good - thanks for the contribution. -John

## Human Review

John (the human) has reviewed all commits and diffs using [John's Galaxy Brain Differential Review](https://galaxy-brain.jmchilton.net/factory/differential-review/) at sha1 ec57ee1b02005a0d9da4a5c7467ca9d39444f994.

<details><summary>Automated Review Details</summary>

Reviewed with [John's Galaxy Brain Review Factory](https://galaxy-brain.jmchilton.net/factory/galaxy-reviews/).

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via Claude Opus 5.5 at medium effort.
- Review profile [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) was run via Claude Opus 5.5 at medium effort.
- Review profile [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) was run via Claude Opus 5.5 at low effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via Claude Opus 5.5 at medium effort.

</details>

<details><summary>Risks</summary>

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door). The one admin-visible effect is that `pgcleanup.py` runs which previously exited 0 after logging a run-sequence exception now exit 1.

<details><summary>Risk Details</summary>

- Cron jobs, systemd timers, Ansible tasks or wrapper scripts that run `pgcleanup.py` now see a failure (and may send mail or alert) where they used to see success. This is the point of the fix, but admins whose cleanup has been failing silently will start getting alerts after upgrading.
- Partial runs keep the same behavior. Actions run in order, each commits its own transaction, and the first exception stops the sequence. Earlier actions stay committed and later ones never run. Only the exit code changes, so callers can't tell "nothing ran" apart from "some actions committed".
- `sys.exit(1)` is raised inside the `with Cleanup()` block, so `__exit__` still closes the DB connection and the log file. Cleanup on the error path is unchanged.
- Failures outside `app.run()` (bad config, connection errors in `Cleanup()`/`__enter__`) already raised and exited nonzero. This PR does not change them.

</details>

<details><summary>Risk Review Advice</summary>

Decide whether this belongs in release notes as an admin-facing change ("pgcleanup now exits 1 on action failure"), since wrappers that relied on the old always-0 exit will now report errors. Rollback is a one-line revert.

</details>

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/galaxy/tree/pr_24598_review_0) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>


Branch [`pr_24598_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24598_review_0) on John's fork, based on PR head `ec57ee1b020`, replaces the PR's stub-based unit test with a mock-free subprocess test. The test runs the real `pgcleanup.py` against a sqlite `database_connection`, which makes `Cleanup.conn` raise inside `run()`, and asserts exit code 1 plus the logged run-sequence exception. It fails at its own assertion (`assert 0 == 1`) against the base script and passes at the PR head. The script change is untouched.

- [`e278e8edcea`](https://github.com/jmchilton/galaxy/commit/e278e8edcea) Test pgcleanup exit code via real run-sequence failure — rewrites `test/unit/scripts/test_pgcleanup_exit_code.py` as one subprocess test; no mocks or importlib loading. (P2 1)

</details>

</details>

### P2 1: Exit-code test stubs out all of `Cleanup`, so it never exercises a real failure (implementation verified)

`test_main_exits_nonzero_when_run_raises` loads `pgcleanup.py` with `importlib` and monkeypatches the module's `Cleanup` with a stub whose `run()` raises, so it only checks that `main()` contains `except Exception: sys.exit(1)`. Against the base script it fails with `AttributeError` (no `main`), not at its own assertion. Loading the script in-process also runs its top-level `sys.path` insert inside pytest.

<details><summary>Evidence</summary>

A real failure costs nothing to trigger: `Cleanup.conn` asserts a PostgreSQL dialect inside `run()`, so a sqlite `database_connection` makes the run sequence raise with no database or Galaxy server. The base script logs `AssertionError: This script can only be used with PostgreSQL.` and exits 0. The PR script exits 1.

</details>

Replace the stub test with a mock-free subprocess run of the script against a sqlite config, asserting `returncode == 1`. Review branch commit `e278e8edcea` does this. It passes at the PR head and fails at `assert 0 == 1` against the base `pgcleanup.py`. The `main()` extraction can stay; it matches sibling scripts in `scripts/cleanup_datasets/`.

<details><summary>Details</summary>

```python
SCRIPT = os.path.join(galaxy_directory(), "scripts", "cleanup_datasets", "pgcleanup.py")


def test_exits_nonzero_when_run_sequence_fails(tmp_path):
    # a non-PostgreSQL database makes Cleanup.conn raise inside run()
    config = tmp_path / "galaxy.yml"
    config.write_text(f"galaxy:\n  database_connection: sqlite:///{tmp_path}/galaxy.sqlite\n")
    result = subprocess.run(
        [sys.executable, SCRIPT, "-c", str(config), "--sequence", "purge_deleted_histories", "-l", str(tmp_path)],
        capture_output=True,
        text=True,
    )
    assert result.returncode == 1, result.stderr
    assert "Caught exception in run sequence" in result.stderr
```

</details>

Fixed on the review branch in [`e278e8edcea`](https://github.com/jmchilton/galaxy/commit/e278e8edcea).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at medium effort and [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>
