# issue_3899_pulsar_container_deps — implementation debrief

Fixes galaxyproject/galaxy#3899 ("Interaction between dependencies and Docker is problematic", jmchilton, 2017).

Commits on `jmchilton/issue_3899_pulsar_container_deps` (base `origin/dev` `4fe00d9e7ab`):
- `c4caa0e21e3` Skip Pulsar dependency resolution for containerized jobs
- `0dfe8850b55` Address review: drop stale comment, log container downgrade, tighten tests

## Status of the issue on dev

- Main job path already fixed: `command_factory.build_command` skipped dep commands for containers since 2014, but in 2017 `JobWrapper.prepare` resolved deps eagerly anyway. `6b3af3b2ffa` (mvdbeek, 2019) made `dependency_shell_commands` a lazy property, so local/cluster/k8s/etc runners no longer resolve for containerized jobs.
- Still broken on dev: Pulsar runner.
  - Default `dependency_resolution: remote` -> Galaxy always sent `DependenciesDescription`, even with a Galaxy-resolved container. Pulsar `_expand_command_line` prepends dep commands unconditionally -> resolution (possibly conda auto_install) on Pulsar host, outside the container.
  - `remote_container_handling` + `dependency_resolution: local` -> `build_command(container=None)` -> Galaxy resolved deps locally for a job Pulsar runs in a container.

## Change

- `requires_dependency_resolution(container)` in `lib/galaxy/tool_util/deps/container_classes.py` — the existing `not container or container.resolve_dependencies` rule, now shared by `command_factory` and the Pulsar runner.
- `PulsarJobRunner.__dependency_resolution(client, container)` returns `"none"` (with `log.debug`) when the effective container (`remote_container or container`) doesn't opt in. Drives both `remote_command_params["dependency_resolution"]` and the `DependenciesDescription`.
- Local container lookup moved earlier in `__prepare_job` (reviewer confirmed no ordering dependency); `__prepare_job` now returns the dependencies description (6-tuple).
- No Pulsar-side change needed; Pulsar's coexecution client already uses the same rule (`container is None and dependencies_description is not None`).

## Behavior change (call out in PR)

Pulsar destinations whose resolved container lacks `resolve_dependencies: true` no longer send a dependencies description. Sites relying on Pulsar-side conda for containerized jobs must opt in on the container description.

## Tests

- `test/unit/app/jobs/test_pulsar_runner.py`: parametrized `test_dependency_resolution_skipped_for_containers` (red before fix), plus unknown-value rejection with a container.
- Ran pulsar runner, command_factory, runner finishing-state, tool_deps unit suites — green. ruff/black/isort/pre-commit clean; mypy clean on touched files.
- No integration test: Pulsar container integration tests all call `disable_dependency_resolution`, so they can't observe this. Fork CI not run.

## Review suggestions not acted on

- Extract a module-level `effective_dependency_resolution(destination_params, container)` to avoid name-mangled test access and test wiring — skipped; small PR, the `remote_container or container` wiring is a one-liner; `__prepare_job`-level test would need heavy mocking.
- NamedTuple for `__prepare_job` return — skipped; reviewer judged 6-tuple acceptable unless it grows again.

## Follow-up (pre-existing, separate)

- Galaxy-resolved container with `resolve_dependencies: true` + Pulsar `dependency_resolution: remote`: Pulsar prepends dep commands before the whole `docker run ...` command line, so deps resolve on the host and aren't active inside the container (local path puts them inside the containerized script, `command_factory.py` externalize block). Behavior unchanged by this branch.
- `__SET_METADATA__` dependency paths left alone: tool declares no requirements and runs outside the tool container.
