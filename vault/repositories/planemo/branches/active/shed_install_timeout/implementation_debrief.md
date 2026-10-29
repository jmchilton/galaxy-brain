# Implementation debrief

Fixes [#1768](https://github.com/galaxyproject/planemo/issues/1768) on `origin/master` `cd2c1944`.

## Root cause

Planemo's admin `GalaxyInstance` has `timeout=None`. Ephemeris (0.10.11) falls back to `wait_for_install(timeout=3600)` only on a `ConnectionError` containing `504` or `Connection aborted`. A POST that never returns produces neither, so it blocks forever. A client timeout alone isn't enough: bioblend raises `requests.exceptions.ReadTimeout`. That isn't a `ConnectionError`, so it escapes ephemeris's per-repository handling and aborts the install loop without naming the repository.

Reproduced on base with an in-process fake Galaxy whose install POST never answers. The install call was still blocked after 10 s, and the process couldn't exit.

## Change

- `--shed_install_timeout` (engine options for `test`/`run`, serve options, `shed_test`) sets a per-request timeout. It defaults to the existing `DEFAULT_TOOL_INSTALL_TIMEOUT` (1 h), which moved to `workflows.py`.
- `_install_shed_repos_from_tools_info` applies it to the admin client for the duration of the install and update, then restores the previous value.
- `_TimeoutInstallRepositoryManager` overrides `install_repository_revision`. A `Timeout` becomes an `"error"` result plus an error log naming owner/name, changeset and Tool Shed. It then follows the existing `--ignore_dependency_problems` handling.
- `shed_test`'s `install_repo` and `wait_for_all_installed` use the same timeout.

## Tests

`tests/test_shed_install_timeout.py` covers three paths with a hanging fake Galaxy: raise naming the repository, ignore under `ignore_dependency_problems`, and the `shed_test` `install_repo` path. That last test hangs against the pre-review `install_repo`.

## Out of scope

Recording install failures in `tool_test_output.json`. No install failure, timeout or otherwise, reaches test output today. Follow-up candidate.
