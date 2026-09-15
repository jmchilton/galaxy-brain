Depends on #1701. Addresses #1175 and supersedes the implementation approach explored in #1185.

## Motivation

`planemo test` normally tears down its managed Galaxy as soon as testing finishes. That remains the right default for automation, but it makes an interactive debugging loop awkward: the histories and datasets that explain a failure disappear with the server.

#1185 demonstrated the value of a `test --serve` workflow, but its implementation forked after Galaxy had started threads, switched the test process to the external-Galaxy engine, bypassed temporary-directory cleanup, and needed special handling for directory runnables. The engine and process-management layers have changed substantially since then.

This follow-up is built directly on #1701 so the package-installed Galaxy case uses the same Gravity-managed lifecycle as its `serve`, `run`, and ordinary `test` paths.

## Changes

- Add `planemo test --serve` for Planemo-managed Galaxy engines.
- Keep one managed Galaxy context alive across test execution, report generation, and interactive inspection.
- Preserve embedded Galaxy tool-test histories while serving; the ordinary test path retains its existing cleanup behavior.
- Write test reports and print the summary before waiting, then show the Galaxy URL and stop cleanly on Ctrl-C.
- Expose `--host` and `--port` on `planemo test`; `--serve` uses Galaxy's standard port 9090 unless a port is supplied, while ordinary tests continue to request a free port.
- Reject `--serve` before execution for engines whose server lifecycle Planemo does not own, including cwltool, Toil, and external Galaxy.

For example:

```console
planemo test --engine installed_galaxy --serve path/to/tool.xml
```

The capability lives at the engine boundary. Checkout-backed, Dockerized, and #1701's `installed_galaxy` engines share the implementation through `LocalManagedGalaxyEngine`; the installed engine therefore continues to use Gravity exclusively for process management. There is no `fork()`, engine substitution, or second Galaxy lifecycle implementation.

## Stacking note

The branch is based directly on #1701's head commit. Because that head branch lives in a fork, GitHub requires this upstream PR to target `galaxyproject/planemo:master`; until #1701 merges, the displayed diff includes the prerequisite commit. Once #1701 merges, this PR reduces naturally to the single `test --serve` commit.

## Compatibility

This is opt-in. Without `--serve`, engine selection, temporary-port selection, history cleanup, reporting, and shutdown behavior are unchanged.

## Validation

- 41 focused command, engine, history-lifecycle, and #1701 unit tests passed.
- The broader non-Galaxy command/engine slice passed (30 passed, 22 skipped); its network-backed CWL case was also rerun successfully with network access.
- The released-package `installed_galaxy` acceptance suite passed (4 passed, 1 Tool Shed test intentionally deselected), including a new end-to-end case that verifies:
  - the report exists before Planemo waits;
  - the Gravity-managed Galaxy remains reachable;
  - the named embedded-tool test history remains visible;
  - Ctrl-C returns the test status and removes the process group and listening socket.
- Repository-wide Black, isort, Ruff, and flake8 passed.
- Mypy passed for all changed Python files.
