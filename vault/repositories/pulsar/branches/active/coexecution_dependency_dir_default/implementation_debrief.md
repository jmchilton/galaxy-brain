# Implementation debrief — `coexecution_dependency_dir_default`

Run via claude-opus-5-5 (nested subagent of the ga4gh_wes_tes stage 3 agent). Parent `coexecution_stage_failures` `37a1e6d`; head `e90a555`.

## Problem

`PulsarApp.__setup_dependency_manager` (`pulsar/core.py`) passes `default_tool_dependency_dir="dependencies"`, relative to the working directory. TES and Kubernetes start `pulsar-submit` and `pulsar-finish` in `/`. galaxy-tool-util 26.1.2's Conda resolver creates that directory while the app starts (`ensure_installed`), even with auto-init off. On a read-only root (Funnel's default) app startup raises `OSError: [Errno 30] Read-only file system: '/dependencies'`, before anything is staged or published; the Galaxy job stays queued. Stage 2 worked around it in the image with `ENV PULSAR_CONFIG_TOOL_DEPENDENCY_DIR=/pulsar_dependencies`.

## Fix

- `c0b4e40`: `CoexecutionConfigBuilder` in `pulsar/scripts/submit_util.py` (used by both scripts) does `conf.setdefault("tool_dependency_dir", "none")` after the normal load, which galaxy-tool-util turns into a `NullDependencyManager`. Why `none` and not a directory: containerized jobs bring their own tools, and for containerless jobs the client already sends `dependency_resolution` with `default_base_path: /pulsar_dependencies` (`Client.get_pulsar_app_config`), which `build_dependency_manager` applies over `tool_dependency_dir`. Explicit app config and `PULSAR_CONFIG_TOOL_DEPENDENCY_DIR` (applied inside the normal load) still win. `pulsar serve` and other apps keep the old default.
- `e90a555`: drops the image's `ENV PULSAR_CONFIG_TOOL_DEPENDENCY_DIR`, keeps `mkdir -p /pulsar_dependencies` (the containerless base path) with a corrected comment.

## Testing

| Test | Before (`37a1e6d` `submit_util.py`) | After |
| --- | --- | --- |
| `test_sequential_coexecution_writes_nothing_to_working_directory` (submit, tool, finish with cwd in a temp dir) | fails: the cwd contains `dependencies` | passes |
| `test_coexecution_tool_dependency_dir_default` (4 cases: default, app config, env, app config over env) | n/a (new class) | passes |

Command: `.venv/bin/python -m pytest test/submit_util_test.py`. `make lint` passes. The stray empty `dependencies/` in Pulsar worktree roots (gitignored) is this bug, created by earlier test runs.

Docker ([output](../coexecution_stage_failures/docker_verification/output.md)): the `4ccfb64` image's `Env` has no `PULSAR_CONFIG_TOOL_DEPENDENCY_DIR` and runs submit, tool and finish under `--read-only` (scenario D). Scenario F runs `env -u PULSAR_CONFIG_TOOL_DEPENDENCY_DIR pulsar-submit` read-only: the `07051ab` image exits 1 with `OSError: [Errno 30] Read-only file system: '/dependencies'`; the `4ccfb64` image exits 0 and publishes `running`.

## Open

- Containerless jobs on a read-only root are not covered: Conda `auto_install` writes into `/pulsar_dependencies/conda`. Not tested.
