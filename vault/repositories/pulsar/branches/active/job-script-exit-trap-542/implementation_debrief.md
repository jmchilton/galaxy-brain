# Implementation debrief

Fixes [#542](https://github.com/galaxyproject/pulsar/issues/542) on `release_0.15`. The bug shipped in 0.15.16 and 0.16.0, not just on `master` as the issue assumed.

- **Root cause:** confirmed as stated in the issue. Galaxy's Docker command sets `trap _on_exit EXIT` at the top level of `$command`, which replaces the job script's `_galaxy_on_exit` trap.
- **Fix:** `job_script()` wraps the command as `(\n<command>\n)` whenever `exit_handler_setup` is non-empty. `|| exit $?` was added after the Codex review. Jobs without exit handlers render byte-identical scripts; the template is unchanged, and the `exit_handler_setup` docstring notes the subshell.
- **Tests:**
  - `test/job_script_test.py` runs a rendered script whose command is a copy of Galaxy's Docker command shape, with a stub `docker`. It asserts that `docker kill` and then the unmount both run. It is red on the base (no unmount) and green on the branch.
  - Three more tests pin existing behaviour and pass on the base too:
    - the `exit N` status;
    - the manager's return-code suffix;
    - no wrap without exit handlers.
  - A literal command is used instead of `DockerContainer` because `JobInfo`'s constructor differs between galaxy-tool-util 26.1 and Galaxy `dev`, which adds a required `output_paths`.
  - `test/manager_cvmfsexec_test.py` asserts that the subshell is present in `mountrepo` mode and absent when cvmfsexec is disabled or in namespace mode.
- **Local gate:**
  - Changed files pass ruff, isort and mypy.
  - `make lint` fails on base with 4 ruff ICN001 errors in untouched files (unpinned ruff 0.17.3).
  - Unit suite: 4 failures (`test_simple_execution` ×3, `wsgi_app_test::test_standard_requests`). They fail identically on base, so they're local macOS environment issues.
  - The `job_script` doctest is broken on base (it omits `metadata_directory`) and isn't collected by CI.
- **Behaviour notes:**
  - An `exit` inside the command now leaves only the subshell, so post-instrument commands still run.
  - `cd` and variables set by the command no longer reach post commands, which use absolute paths.
  - Signal behaviour is covered in the [review debrief](subagents/normal_review.md).
- **Follow-up:** Galaxy-side trap chaining in `DockerContainer.containerize_command` is the general fix and is not built here.
