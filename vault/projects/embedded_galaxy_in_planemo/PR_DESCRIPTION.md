# Draft PR description: add an embedded Galaxy engine

Proposed title: **Add an embedded Galaxy engine for package-installed Galaxy**

## Draft status and dependencies

This is an initial PR-body draft. The implementation is pushed to `jmchilton/planemo:embed_galaxy`, but no pull request has been opened yet.

- This branch is currently stacked on Planemo [#1687](https://github.com/galaxyproject/planemo/pull/1687), which makes one test timeout cover uploads, jobs, and workflow polling. Rebase this branch onto `master` after #1687 merges so its timeout commits disappear from this PR.
- Planemo [#1688](https://github.com/galaxyproject/planemo/pull/1688), the import-cycle fix, is merged.
- Galaxy [#23360](https://github.com/galaxyproject/galaxy/pull/23360), which supplies the application builder and package-installed job fixes, is merged into `release_26.1`.
- A Galaxy package release containing #23360 is still required before the final optional dependency, resolver check, documentation, and per-PR integration job can be added.

## Summary

This adds an opt-in `--engine embedded_galaxy` mode for `planemo run`, `planemo test`, and foreground `planemo serve`.

Instead of cloning or launching a Galaxy checkout, the engine loads a coherent, package-installed Galaxy into Planemo's Python process. Planemo still talks to Galaxy through its existing HTTP/BioBlend interfaces, so tool execution, workflow execution, reporting, profiles, dependency resolution, and Tool Shed installation continue to use the established Planemo paths.

The engine is deliberately opt-in and does not change the existing `galaxy`, `docker_galaxy`, `external_galaxy`, or `uvx_galaxy` engines.

## Motivation

The managed Galaxy engine provides strong isolation but pays for checkout and subprocess startup. Package-installed Galaxy can provide a substantially lighter authoring and testing loop if Planemo owns the complete in-process lifecycle and leaves no global state, worker, server, child process, or temporary configuration behind.

This work also makes YAML Galaxy tools valid `GalaxyTool` runnables, fixing the existing mismatch where discovery yielded YAML tool sources that `for_path()` later rejected.

## Implementation

- Registers `embedded_galaxy` in the engine factory and relevant CLI choices, with validation for unsupported checkout, daemon, non-loopback, and interactive-tool options.
- Extracts checkout-independent managed-Galaxy configuration shared by the existing local and embedded engines.
- Builds Galaxy lazily with `build_galaxy_web_app(..., register_shutdown_at_exit=False)` and restores Galaxy's process-global application reference on every exit path.
- Pre-binds one loopback socket and serves Galaxy's ASGI application on a dedicated uvicorn thread, avoiding the probe/close/bind race.
- Starts one in-process Celery worker with the `solo` pool and both `galaxy.internal` and `galaxy.external` queues, using in-memory transport and the RPC result backend.
- Reuses the existing Galaxy engine's HTTP execution, workflow, profile, reporting, dependency-resolution, PostgreSQL/Singularity, and Tool Shed installation paths.
- Keeps mixed tool/workflow tests inside one Galaxy construction rather than attempting multiple application lifecycles in one process.
- Captures Galaxy, Celery, and uvicorn logs in the generated configuration directory while preserving Planemo's normal and Rich verbose output behavior.
- Performs ordered, failure-tolerant teardown of uvicorn, Celery, Galaxy's fork pool, the Galaxy application, logging/environment state, and temporary configuration.
- Clears Celery's process-global termination flag after a timed-out worker shutdown so a failed worker cannot poison the next in-process invocation.
- Reports live threads and multiprocessing children when cooperative cleanup exceeds 30 seconds. This is diagnostic rather than a hard bound: Pebble currently performs unbounded internal joins after a process pool is stopped.

## Scope and limitations

Version 1 supports local tools and workflows, Tool Shed installs, profiles/PostgreSQL, and the existing Conda/container dependency resolvers.

It does not:

- become the default engine;
- embed a Galaxy source checkout;
- support daemon mode or non-loopback binding;
- run gx-it-proxy, interactive tools, Celery beat, or periodic maintenance;
- promise two independent Galaxy application constructions in one Python process; or
- expose Galaxy's application object as a public Planemo API.

## Test coverage

Fast lifecycle and configuration coverage includes:

- option validation and lazy optional-runtime imports;
- generated checkout-free Galaxy configuration;
- startup and teardown ordering;
- construction, readiness, uvicorn, partial-worker, and cleanup-action failures;
- first and second `Ctrl-C` behavior;
- process-global Galaxy and Celery state restoration;
- logging restoration, bounded failure-log replay, and `--no_cleanup` preservation;
- fork-pool, thread, child-process, socket, and temporary-directory cleanup; and
- one application construction for mixed tool/workflow inputs.

Opt-in tests against Galaxy packages built with #23360 prove:

- XML and YAML tool execution;
- the real Celery upload chain and repeated RPC result polling;
- local and Tool Shed-installed workflow execution;
- `planemo run` output download in a fresh subprocess;
- foreground `planemo serve` readiness and SIGINT cleanup; and
- no surviving Planemo-owned job process, process group, worker/server thread, multiprocessing child, global Galaxy app, or generated configuration directory.

Latest focused results:

```text
57 passed, 6 skipped
real mixed XML/YAML/upload/workflow/Tool Shed acceptance: passed
real subprocess run and foreground serve acceptance: passed
black, isort, ruff, flake8, and whitespace checks: passed
```

## Before marking ready for review

- [ ] Rebase onto `master` after Planemo #1687 merges and confirm the PR contains only the embedded-engine work.
- [ ] Use the first Galaxy release containing #23360 to add `planemo[embedded_galaxy]` with a one-series upper bound.
- [ ] Add optional-dependency containment and resolver checks.
- [ ] Add user documentation and Linux per-PR integration coverage against the released package set.
- [ ] Record comparable cold and warm startup timings for `galaxy` and `embedded_galaxy`.
- [ ] Incorporate the separate mypy cleanup and run `tox -e mypy` cleanly.
- [ ] Run the existing-engine and full Planemo regression suites after the final rebase.

## Suggested reviewer path

1. Engine registration, option validation, and YAML runnable recognition.
2. Shared managed-Galaxy configuration extraction and parity tests.
3. `planemo/galaxy/embedded.py` startup, logging, and ordered teardown.
4. Engine reuse for run/test/workflow/Tool Shed execution and the one-application test path.
5. Concrete package-installed acceptance tests and subprocess cleanup assertions.

