# Implementation debrief — `cgroup-oom-kills-408`

Run via claude-opus-5-5. Base `origin/master` `f2fde10`; head `3c23696`.

## Scope

Pulsar half of galaxy#24545 / pulsar#408 (OOM part). Galaxy owns detection: Pulsar already returns the DRM stderr as `job_stderr`, and the Galaxy branch [`issue_24545_oom_kill_detection`](../../../../galaxy/branches/active/issue_24545_oom_kill_detection/index.md) scans it. Pulsar renders its own job script, so the opt-in cgroup probe has to be mirrored here.

Not built here: #492's `runner_state` wire field (orthogonal; DRM-state classification, not exit-0 kills). The stale `failure-reasons-492` worktree was left alone.

## What changed (3 commits)

1. `pulsar/managers/util/job_script/`: `CGROUP_OOM_KILLS_STATEMENT.sh` byte-identical to Galaxy's; same two template slots and same `job_script(check_cgroup_oom_kills=…, cgroup_mount=…, proc_cgroup=…)` kwargs. The mirrors had already drifted (formatting, Pulsar-only `cvmfsexec_setup`/`exit_handler_setup` slots), so the edit is analogous, not a byte-identical module.
2. `check_cgroup_oom_kills` manager option (app.yml, `asbool`) with per-job override via `setup_params`, delivered exactly like `cvmfsexec`: client reads the Galaxy destination param → REST `submit` param / MQ launch key → `submit_job` merges into `setup_params` without triggering setup → `DirectoryBaseManager._job_template_env`. Old servers ignore the key (REST builds args from the function signature; MQ uses `.get`).
3. `app.yml.sample` documents it.

## Tests

Red first: client (REST + MQ), endpoint merge, manager default/override, job-script probe (fake v1/v2 cgroup, bash and sh, exit status kept), WSGI end-to-end (route → manager → `command.sh`, return code 4 kept).

Ran: `test/{client_test,manager_endpoint_util_test,manager_cgroup_oom_kills_test,job_script_oom_kills_test,wsgi_app_test,manager_cvmfsexec_test,manager_test,manager_drmaa_test,stateful_test,cli_test,manager_coexecution_test}.py` — 90 passed, 3 skipped. `make lint` passes.

## Checks outside the branch

- `tox -e mypy`: one error in untouched `pulsar/client/amqp_exchange.py:19`.
- `job_script` doctest fails on master already (`metadata_directory` is required in Pulsar but the doctest omits it); CI doesn't run doctests.
- `wsgi_app_test.py::test_standard_requests` needs `python` on PATH (exit 127 otherwise); passes with the venv on PATH.

## Open

- `docs/compatibility.rst` "master-features-unavailable" lists per-job `cvmfsexec` as Galaxy 26.2 vs 0.16; this option belongs to whichever Galaxy release takes the Galaxy branch (dev), so it isn't listed yet.

## Implementation snapshot

```
created …/differential-review/snapshots/20261103T132541Z-implementation-3c236964cd6a.json
  implementation @ 3c236964cd6a vs origin/master (merge-base f2fde101ccfd)
  first snapshot: 3 commits, 15 files, 26 hunks
```
