# Normal review debrief — `cgroup-oom-kills-408`

Reviewed `3c23696`; verdict "no bugs, mergeable after the P2 and a few P3s". Acted on the P2 by listing per-job manager options once (`PER_JOB_MANAGER_OPTIONS`) and moving `cvmfsexec` onto the same loop/helper (`f2e32da`), tightened the two return-code tests to also require empty job stderr and documented which managers the option suits plus the coexecution gap (`8490345`), and took the cheap nits (None-tolerant resolver, dropped restating comments, kwargs in the MQ test, the endpoint comment no longer lists option names).

Not acted on:

- `docs/compatibility.rst` entry — the existing `master-features-unavailable` entry is framed as "Galaxy 26.2 features need 0.16"; the Galaxy half targets dev, so the right line depends on release targeting. Left for John.
- `setup_params: Dict[str, str]` annotations — they already lie for `cvmfsexec` dicts; widening them touches every manager signature, out of scope.
- Route signature still names each option explicitly — `PulsarController` builds args from the function signature, so a loop isn't possible there; a comment points at the shared list.
- Startup warning for enabling on `queued_python` — documented instead; a warning would need manager-type knowledge in `BaseManager`.

<details><summary>Full review</summary>

Run via claude-opus-5-5.

# Review: `cgroup-oom-kills-408` (head `3c23696`, base `origin/master` merge-base `f2fde10`)

## Verdict

Mergeable once one P2 is resolved and some P3s are addressed. No bugs found. The mirror of Galaxy's probe is faithful: the `.sh` file is byte-identical and the `job_script()` handling matches line for line. The probe is correct POSIX sh. The option reaches every job-script-rendering manager on both transports. Back-compat holds in both directions. The main concern is the one the review focus weights most: this is the second per-job manager override copied by hand through five layers, with no shared abstraction.

## What was verified

- `diff` of the two `CGROUP_OOM_KILLS_STATEMENT.sh` files is empty. The `job_script()` hunk (`cgroup_mount`/`proc_cgroup` pops, `check_cgroup_oom_kills` pop, two `OPTIONAL_TEMPLATE_PARAMS` slots) matches Galaxy's. The template slots sit in the same place: after `$instrument_pre_commands`, wrapped around `$command`. The tests are the same apart from imports, `metadata_directory`, and Galaxy asserting through `oom_kill_job_messages`.
- `shellcheck -s sh` is clean. I ran a rendered script under `/bin/dash` with a fake v2 cgroup and the exit status was preserved (5). It printed `galaxy: Detected 3 oom-kill event(s) ...`. With no cgroup it was silent and exited 0. `$$` in `proc_cgroup` survives both `safe_substitute` passes because substitution values are not re-expanded. The awk `$1`/`$3`/`$)` tokens are not valid Template identifiers, so they are left alone.
- Packaging: `MANIFEST.in` already includes `pulsar/managers/util/job_script/*.sh` with `include_package_data=True`. The new `setup.py` `package_data` line is redundant but matches the existing `CLUSTER_SLOTS_STATEMENT.sh` entry. The import-time `resource_string` will not break installs.
- Transports: REST goes through `routes.submit`. `LocalPulsarInterface` (embedded Pulsar) also goes through `build_func_args` → `routes.submit`. AMQP (`bind_amqp`), relay (`bind_relay`) and `pulsar-submit` (coexecution/k8s/TES/GCP) all hand the whole message to `manager_endpoint_util.submit_job`. On the client side, `MessageJobClient`, `MessageCLIJobClient`, `RelayJobClient` and coexecution all build their message through `_build_setup_message`.
- Managers: every job-script renderer reaches `_job_template_env`: `queued_python`/`unqueued` via `_prepare_run` → `_setup_job_file`, `queued_drmaa`/`queued_external_drmaa`/`queued_drmaa_xsede` via `base_drmaa`, `queued_condor`, and `queued_cli`. Putting the option in `_job_template_env` is the better placement. As a result, `queued_cli` honors this option. It does not honor `cvmfsexec`, which lives only in `_setup_job_file`. That gap is in untouched code and out of scope. Windows `unqueued` renders no job script, so the option is ignored there, which is fine for a Linux-only probe.
- Back-compat:
  - New client with an old server: the REST route builds kwargs from `getfullargspec(func).args`, so the unknown query param is dropped. MQ uses `.get`. The job runs unprobed (silently, see P3 4).
  - New server with an old client: the key is absent, so the manager default applies.
  - Wire values: Galaxy YAML/XML string or bool values pass through `json_dumps`/`loads` and then `asbool`.
  - Bad values: an unparseable string makes `asbool` raise `ValueError` at script render. That fails the launch loudly, which is acceptable for garbage input.
- The `setup_params` merge happens after the `if setup_params or force_setup` decision, as cvmfsexec's does, and a test covers it (`manager_endpoint_util_test.py:265`).
- Branch tests pass: 58 passed across client, endpoint, manager, job-script, wsgi and cvmfsexec tests.
- No security issues found. `cgroup_mount`/`proc_cgroup` are `job_script` kwargs only and are not reachable from `setup_params`. The per-job value is collapsed to a bool before rendering.

## Should fix

### P2 1: second hand-copied per-job manager override; extract the pattern instead of accreting

Locations:
- `pulsar/client/client.py:62-63,162-163,341-342`
- `pulsar/web/routes.py:65-66,75,86`
- `pulsar/manager_endpoint_util.py:116-117,152-158`
- `pulsar/managers/base/__init__.py:118-120`
- `pulsar/managers/base/directory.py:251-257`

`cvmfsexec` set the pattern: a client attribute, two client launch branches, a route arg plus `loads` plus a dict entry, an endpoint `.get` plus a post-decision merge, a `BaseManager` default, and a `DirectoryBaseManager._<name>(setup_params)` resolver. This branch copies every one of those steps a second time. The resolvers differ in name, typing and None handling (`_cvmfsexec_config(setup_params)` accepts `None`, `_check_cgroup_oom_kills(setup_params: Dict[str, Any])` does not), and nothing ties the copies together. Adding a third option (pulsar#492 territory) means touching all five places again, and missing one fails silently. For example, forgetting the route arg means REST drops the option while MQ honors it.

Suggested fix (keep both existing wire keys for back-compat):
- One tuple, e.g. `PER_JOB_MANAGER_OPTIONS = ("cvmfsexec", "check_cgroup_oom_kills")`, defined somewhere both client and server import (e.g. `pulsar/client/util.py` or a small `pulsar/client/manager_options.py`).
- Client: populate `self.manager_options = {k: destination_params[k] for k in PER_JOB_MANAGER_OPTIONS if destination_params.get(k) is not None}` once. Have both launch paths loop over it (`json_dumps` per value on REST).
- `submit_job`: `setup_params = {**setup_params, **{k: job_config[k] for k in PER_JOB_MANAGER_OPTIONS if job_config.get(k) is not None}}` after the setup decision.
- Route: the explicit named args stay, because `build_func_args` only forwards signature args. Alternatively, add a `**`-style generic param later.
- Manager: one `_per_job_option(setup_params, name, default, parse)` helper that both `_cvmfsexec_config` and `_check_cgroup_oom_kills` call.

This is a modest refactor. If the user would rather not widen the branch, a follow-up refactor issue is a reasonable alternative, but this branch is the natural point because it is the second instance.

## Minor

### P3 1: `test_job_keeps_return_code` and the wsgi `returncode == 4` assertion pass whether or not the probe preserves `$?`

`test/manager_cgroup_oom_kills_test.py:38-45`, `test/wsgi_app_test.py:96-97`. `DirectoryBaseManager._expand_command_line` appends `; return_code=$?; echo $return_code > <rc_path>;` to the command, so the return-code file is written inside `$command`, before `_galaxy_report_oom_kills` runs. That function's `$?` is `echo`'s status, and `manager.return_code()` reads the file. Removing `return $_galaxy_job_rc` from the probe would leave both assertions green. What they actually check is that the setup statement does not abort the script before the command runs.

The job-script-level test (`job_script_oom_kills_test.py:52-65`, raw `sh -c 'exit 3'` then the script's own exit status) is the one that covers return-code preservation. Suggested fix: rename the manager test to describe what it checks (e.g. `test_enabled_probe_does_not_break_job`). For a stricter check, assert that `job_stderr_contents(job_id)` is empty, since the host has no matching cgroup, so the probe stays silent and does not leak awk/test errors into job stderr. The wsgi test's real assertion is the `command.sh` contents check; the returncode line can stay as a smoke check.

### P3 2: option is silently inert for coexecution (k8s/TES/GCP) tool containers

`pulsar/client/coexecution.py:18-25`, `pulsar/managers/unqueued.py` (`CoexecutionManager`). The per-job override does reach the pod's `submit_job` and is rendered into `command.sh`. However, the tool container runs `sh $path` with stderr going to the container log, not `metadata/job_stderr`, and `CoexecutionManager` never opens job stdout/stderr. The `galaxy: Detected ...` line therefore never reaches Galaxy's `job_stderr` scan. Ironically the probe itself would work there, because with a private cgroupns `/proc/$$/cgroup` reads `0::/` and the container's own `memory.events`. The failure scenario: an admin sets `check_cgroup_oom_kills: true` on a k8s Pulsar destination and believes OOM kills are caught. Suggested fix: one line in `app.yml.sample` and/or the Galaxy sample stating that coexecution destinations don't report. Fixing it (redirecting the tool container's stderr into `metadata/job_stderr`) belongs in a separate change.

### P3 3: `app.yml.sample` placement makes the shared-cgroup caveat easy to miss for the sample's own manager type

`app.yml.sample:34-42`. The block is appended directly after cvmfsexec's mountrepo paragraph with no separator, so it reads as part of the cvmfsexec note. It also sits under a sample manager of `type: queued_python`. For `queued_python`/`unqueued`, jobs run in the Pulsar service's own cgroup (e.g. its systemd unit), so enabling the option there is always wrong: concurrent jobs' kills, or a kill of a Pulsar helper, get blamed on every running job. Suggested fix: add a blank `#` line before the block, and name the manager types it applies to ("DRM managers such as `queued_drmaa`/`queued_cli`/`queued_condor` with per-job cgroups; not `queued_python`"). Optionally log a warning in `BaseManager.__init__` when it is enabled on an unqueued manager.

### P3 4: `docs/compatibility.rst` not updated for the silently-dropped per-job key

`docs/compatibility.rst:479-484`. The `master-features-unavailable` entry exists to track exactly this case: per-job `cvmfsexec` against an old server "is silently dropped". A per-job `check_cgroup_oom_kills` against a 0.16.0 or older server behaves the same way. The debrief defers this until a Galaxy release is known. The Pulsar-side fact ("needs a 0.16.1+ server; older servers ignore it") is already known, so it can be added now. The Galaxy version can be filled in later.

## Nits

- `pulsar/managers/base/directory.py:251`: `_check_cgroup_oom_kills(self, setup_params: Dict[str, Any])` is non-Optional, while its sibling `_cvmfsexec_config` accepts `None`. The function also relies on its caller having already done `setup_params or {}`. Separately, every `setup_params: Optional[Dict[str, str]]` annotation in the managers is now wrong, because the dict carries bools (and cvmfsexec's dicts). `Dict[str, Any]` would be accurate. P2 1's helper would fix the first point.
- `pulsar/managers/base/__init__.py:118-119` and `directory.py:252-253`: the comments restate the code ("may be overridden per job ..."). They mirror cvmfsexec's comments, so they are consistent, but per the user's comment rules they could go. The client comment at `client.py:62` ("delivered like cvmfsexec") is the useful one.
- `test/client_test.py:205`: the MQ test calls the private `_build_setup_message` with seven positional `None`/`[]`/`{}` args. Keyword args would survive a signature reorder. Either way it is acceptable for a unit test.
- `pulsar/manager_endpoint_util.py:152`: the comment line now exceeds the surrounding width and names both options. It will need editing again on the next option, which P2 1 would avoid.

</details>
