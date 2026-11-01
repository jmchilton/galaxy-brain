# Initial review: #24598 (default profile)

- Profile: [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md)
- Model: Claude Opus 5.5, medium effort (static review, no venv)
- Reviewed commit: `ec57ee1b020` (base `18296103e03`, `dev`)

## Verdict

Approve. The fix is correct and minimal: `log.exception(...)` followed by `sys.exit(1)` keeps the traceback in the configured log handler (better than letting the exception propagate, which would bypass `set_log_handler` output formatting) and gives cron/systemd a nonzero status. `sys` is already imported at module top. `SystemExit` raised inside the `with Cleanup()` block still runs `Cleanup.__exit__`, which closes the connection and returns `None`, so the exit propagates. The unreachable-DB case from #24373 is covered because `Cleanup.conn` connects lazily inside `run()`, so the error falls inside the `try`.

The new `main()` + `if __name__ == "__main__": main()` matches the sibling scripts in `scripts/cleanup_datasets/` (`cleanup_datasets.py`, `admin_cleanup_datasets.py`, `populate_uuid.py`). `galaxy.util.script.main_factory` is for action-dispatch CLIs and doesn't fit `Cleanup`'s own argparse; no other existing abstraction applies.

Side benefit: the existing integration tests (`test/integration/test_scripts_pgcleanup.py`) go through `_scripts_check_output`, which uses `subprocess.check_output`. They previously passed even if an action raised; now such a failure fails the test. That makes the integration coverage stronger, but it could also expose failures that were hidden before, so watch the Postgres integration CI job.

No bugs found.

## Findings

### P3 1: Unit test only checks the three lines it was written for

`test_pgcleanup_exit_code.py` replaces `Cleanup` with a stub whose `run()` raises, so it verifies only that `except Exception: sys.exit(1)` exists. It never runs a real failure path such as the unreachable database from the issue. It also loads the script with `exec_module`, which has a side effect: the script's top-level `sys.path.insert(1, <galaxy>/lib)` runs in the pytest process. That's harmless in Galaxy's tree but shows the test is coupled to how the script is laid out.

A test of the real scenario could run the script as a subprocess against a config whose `database_connection` points at an unreachable Postgres (for example `postgresql://galaxy@127.0.0.1:1/none`) and assert `returncode == 1`. The natural place is next to the existing `TestScriptsPgCleanupIntegration` tests, reusing `BaseScriptsIntegrationTestCase._scripts_check_output` or a `subprocess.run` sibling of it. This is optional: given how small the fix is, keeping the current test is acceptable. Flag it only if the reviewer wants to discourage stub-only script tests.

<details><summary>Sketch</summary>

```python
# test/integration/test_scripts_pgcleanup.py
def test_exits_nonzero_on_run_failure(self):
    self._skip_unless_postgres()
    config_file = self.write_config_file_with_db("postgresql://galaxy@127.0.0.1:1/none")  # helper to add
    proc = subprocess.run([sys.executable, script_path, "-c", config_file, "--sequence", "purge_deleted_histories"], ...)
    assert proc.returncode == 1
```

</details>

## Out of scope (not findings)

- `Action.remove_from_object_store` still logs and swallows per-object delete errors, so partial object-store failures still exit 0. This is pre-existing, deliberate behavior (continue-on-error) that the PR doesn't touch.
