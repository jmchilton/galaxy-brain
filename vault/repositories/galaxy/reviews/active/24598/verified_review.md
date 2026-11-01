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

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at medium effort and [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>
