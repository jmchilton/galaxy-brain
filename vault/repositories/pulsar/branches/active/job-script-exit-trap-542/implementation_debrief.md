# Implementation debrief

Fixes [#542](https://github.com/galaxyproject/pulsar/issues/542) on `release_0.15`. The bug shipped in 0.15.16 and 0.16.0, not just on `master` as the issue assumed.

- **Root cause:** confirmed as stated in the issue. Galaxy's Docker command sets `trap _on_exit EXIT` at the top level of `$command`, which replaces the job script's `_galaxy_on_exit` trap.
- **Fix:** `job_script()` wraps the command as `(\n<command>\n)` whenever `exit_handler_setup` is non-empty. `|| exit $?` was added after the Codex review. Jobs without exit handlers render byte-identical scripts; the template is unchanged, and the `exit_handler_setup` docstring notes the subshell.
- **Tests:**
  - `test/job_script_test.py` executes a rendered script whose command sets its own EXIT trap. It asserts that both traps fire. It was red on the base (only `GALAXY` was logged) and is green on the branch.
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
