# planemo #1678 — Use Gravity multiprocessing for modern Galaxy

`galaxyproject/planemo#1678`, mvdbeek, +691/-45 across 6 files, branch `gravity-subprocess` → `master`.
Head `d504f1d9`. Python CI run 2594 (attempt 2) green.

> **Update 2026-08-21** — mvdbeek pushed five commits addressing the feedback; head is now
> `346faf9b`. See [Round 2](#round-2--mvdbeeks-response-346faf9b) at the bottom, and
> [Round 3](#round-3--follow-up-branch-jmchilton1678-review-followups) for the follow-up branch.
> The findings below are preserved as originally written.

## What it does

For Galaxy >= 25.0.1, planemo writes `gravity: {process_manager: multiprocessing}` into the
generated `galaxy.yml` and stops using Supervisor. Daemonized serves no longer call
`run.sh --daemon`; instead planemo spawns `python -m planemo.galaxy.daemon_monitor <fd> <command>`
with `start_new_session=True`, which runs `run.sh` in the foreground inside a dedicated process
group. A pipe between planemo and the monitor is the liveness channel: a `b"D"` byte means
"detach and let Galaxy outlive planemo", EOF means "planemo died, kill the group". Teardown
signals the whole process group instead of shelling out to `galaxyctl shutdown`. Readiness polling
(`ephemeris_sleep.sleep`) now takes the startup `Popen` and bails the moment it exits.
Galaxy < 25.0.1 keeps the Supervisor + `galaxyctl` path unchanged.

The premise checks out. Gravity's `MultiprocessingProcessManager` (`gravity/process_manager/multiprocessing.py`)
implements `start()` as one `multiprocessing.Process` per service and leaves `stop()`,
`shutdown()`, and `terminate()` as literal no-ops — so `galaxyctl shutdown` genuinely cannot stop
a multiprocessing-managed Galaxy, and owning the process group is the right answer. Galaxy's
`run.sh` with no `--daemon` falls into the `galaxyctl update --force; run_server="galaxy"` branch
of `scripts/common_startup_functions.sh:197-204`, which is exactly the foreground entry point this
needs.

## Blocking

**1. The monitor cannot escalate past SIGTERM — `planemo/galaxy/daemon_monitor.py:29`**

```python
os.killpg(os.getpgrp(), signal.SIGTERM)
```

The monitor is in the group it signals, so it dies from its own SIGTERM. There is no surviving
process to escalate to SIGKILL, and no wait-and-verify. If gunicorn or a celery worker ignores or
hangs on SIGTERM, the group is orphaned with no parent left to clean it up. This is precisely the
scenario the PR description claims to fix ("terminate and reap the entire process group on
shutdown ... including from SIGKILL"). `kill_process_group` in `planemo/io.py:250` does escalate;
the monitor's own path does not, and the monitor's path is the one that runs when planemo is
SIGKILLed. `test_sigkill_of_planemo_cleans_multiprocessing_process_group`
(`tests/test_gravity_multiprocessing.py:410`) passes only because `MODERN_RUN_SH` installs a
well-behaved SIGTERM handler.

Fix: `signal.signal(signal.SIGTERM, signal.SIG_IGN)` in the monitor before `killpg`, then poll
`os.killpg(pgid, 0)` for a grace period, `killpg(pgid, SIGKILL)`, then exit. That also lets the
monitor reap the child instead of leaving it to init.

**2. `service_log_contents` silently goes empty for modern Galaxy — `planemo/galaxy/config.py:1220-1223`,
consumed at `planemo/engine/galaxy.py:40-50`**

`LocalGalaxyConfig.service_log_contents` tails `$GRAVITY_STATE_DIR/log`. Under the multiprocessing
manager nothing writes there: `ProcessExecutor.exec` (`gravity/process_manager/__init__.py:340-342`)
ends in a bare `os.execvpe` with no output redirection, so every service inherits the foreground
process's stdout/stderr — which `start_daemon` has pointed at `config.log_file`. `tail_log_directory`
on a missing directory returns `{}`, so `log_service_logs_on_failure` becomes a no-op for exactly
the Galaxy versions this PR targets. Its docstring explains why it exists ("uploads run in Celery -
so a test that dies staging its inputs otherwise leaves no trace at all"), so this is a real
diagnostic regression on paper.

In practice the celery output is not lost — it is now interleaved into `config.log_contents`, which
planemo already streams. But that should be deliberate and stated, not accidental. Either make
`service_log_contents` return `{}` explicitly for `use_multiprocessing` with a comment, or have it
fall back to the merged log. As written, a future reader will assume the feature still works.

## Reuse concerns

**3. `run_galaxy_command` is bypassed rather than extended — `planemo/galaxy/serve.py:29-36`**

```python
if daemon and getattr(config, "use_multiprocessing", False):
    ctx.vlog(f"{action} with command [{command}]")
    startup_process = config.start_daemon(command)
```

`run_galaxy_command` (`planemo/galaxy/run.py:97-109`) is the single existing place that logs the
command and dumps the environment before launching Galaxy. The new path reimplements a thinner
version of the logging and skips the env dump entirely, and demotes "Starting Galaxy with command"
from `info()` (always shown) to `ctx.vlog()` (verbose only). That is a visible regression for
anyone reading `planemo serve` output. Prefer giving `run_galaxy_command` a launch strategy —
`run_galaxy_command(ctx, cmd, env, action, launcher=config.start_daemon)` — so there stays one
place that logs and launches.

**4. `kill_process_group` duplicates `kill_posix` — `planemo/io.py:250-280` vs `planemo/io.py:227-248`**

Both implement the same SIGTERM → wait → SIGKILL escalation over a process group. The one real
difference is documented in the new function's comment: it uses `process.pid` as the pgid so it
still works after the leader is reaped, where `kill_posix` calls `os.getpgid(pid)`. That is a
parameter, not a new function — `kill_posix(pid, pgid=None)` would cover both and leave one
escalation loop. Note also that `kill_posix` catches `OSError` broadly while the new function
catches only `ProcessLookupError`, so a `PermissionError` now propagates out of teardown.

**5. `use_multiprocessing` is duck-typed — `planemo/galaxy/serve.py:31`**

`getattr(config, "use_multiprocessing", False)` papers over the fact that the attribute only exists
on `LocalGalaxyConfig`. Declare `use_multiprocessing = False` as a class attribute on
`BaseGalaxyConfig` (`planemo/galaxy/config.py:877`) and drop the `getattr`; it is part of the config
interface now, and `serve.py` already calls `config.start_daemon` / `config.detach_daemon`
unguarded a few lines later.

**6. Version detection is re-exec'd on every call — `planemo/galaxy/config.py:632-641`**

`get_galaxy_version` runs `spec.loader.exec_module` each time, under the same module name
`__galaxy_version`. It is now called at least three times per serve: twice inside
`write_galaxy_config` (via `get_galaxy_major_version` at :549 and `gravity_supports_multiprocessing`
at :557), once in `LocalGalaxyConfig.__init__` (:1201), plus `get_refgenie_config`. A
`functools.lru_cache` on `get_galaxy_version` is the obvious fix and makes the two independent
`gravity_supports_multiprocessing(galaxy_root)` call sites provably consistent.

**7. Duplicated error construction — `planemo/galaxy/serve.py:41-44` and `:86-89`**

The same three-line "Galaxy process exited with code N during startup. Galaxy log: [...]" message is
built twice. Extract it.

## Correctness / smaller

**8. `kill()` branches on `use_multiprocessing` twice — `planemo/galaxy/config.py:1234-1254`**

The `if use_multiprocessing / elif GRAVITY_STATE_DIR` block is followed by a second
`if not use_multiprocessing / else` block, with the supervisor `elif` sandwiched between them. In
the `use_multiprocessing and _daemon_process is None` case, `kill_pid_file` runs (which already
unlinks the pid file) and then the trailing `else` unlinks it again. Harmless but hard to read —
split into `_kill_multiprocessing()` / `_kill_supervisor()` and dispatch once.

**9. `env.pop("SUPERVISORD_SOCKET", None)` is inert — `planemo/galaxy/config.py:559`**

`env` is freshly built by `_build_env_for_galaxy` on every run, and `config.py:562` is the only
place in the tree that ever sets `SUPERVISORD_SOCKET`. The only caller that makes the pop do
anything is the new test, which seeds `{"SUPERVISORD_SOCKET": "old-socket"}` itself
(`tests/test_gravity_multiprocessing.py:71`). It also would not shield against an externally
exported value, since `start_daemon` does `os.environ.copy()` then `.update(self.env)`. Drop it, or
keep it with a comment saying what it is defending against.

**10. Unexplained broadening of the readiness-poll exception — `planemo/galaxy/ephemeris_sleep.py:90`**

`except (requests.exceptions.ConnectionError, requests.exceptions.Timeout)` became
`except requests.exceptions.RequestException`. That now swallows `MissingSchema`, `InvalidURL`,
`SSLError`, `TooManyRedirects`, and `ChunkedEncodingError` as "Galaxy not up yet", so a genuinely
misconfigured URL burns the full 900 s `galaxy_startup_timeout` instead of failing fast. Nothing in
the PR description motivates it and it is orthogonal to the multiprocessing change. Also worth
noting this file is a vendored fork of `ephemeris/sleep.py`; each edit widens the drift.

**11. Signal-killed startup reports a nonsense exit code — `planemo/galaxy/daemon_monitor.py:33`**

`return child.returncode` is negative when the child died from a signal, and `sys.exit(-15)` exits
with status 241. `_check_startup_command` then prints "Galaxy process exited with code 241".
Map it: `return 128 - rc if rc < 0 else rc`.

**12. `--server-name` is inert for gravity-era Galaxy — `planemo/galaxy/config.py:1306-1310`**

`parse_common_args` funnels unrecognized args into `paster_args`
(`scripts/common_startup_functions.sh:66-69`), which `common_startup_functions.sh` never
consumes. So `--server-name main` does nothing for any Galaxy on the gravity path. Pre-existing
behavior on the non-daemon branch, but this PR makes it the primary daemon path, so it now reads as
if it is load-bearing. `self.server_name` still matters on planemo's side (it derives `log_file` and
`pid_file`) — a comment saying so would help.

**13. The gate keys on the Galaxy version, not on the installed gravity — `planemo/galaxy/config.py:617-619`**

`MINIMUM_MULTIPROCESSING_GALAXY_VERSION = 25.0.1` is a proxy for "gravity >= 1.1.0". It breaks when
the venv is not the one Galaxy's `common_startup.sh` would build: `--skip_venv`, or a
`GALAXY_VIRTUAL_ENV` pointed at an externally managed env with an older gravity pinned. In that
case `process_manager: multiprocessing` lands in `galaxy.yml` and gravity rejects the enum value at
startup — loud, at least, which is better than the alternative. Worth a sentence in the code about
why the version string is the signal.

Interesting artifact: `_make_galaxy_root` creates `lib/galaxy/dependencies/`
(`tests/test_gravity_multiprocessing.py:27-28`) but nothing reads it. That looks like scaffolding
left over from an earlier iteration that parsed `pinned-requirements.txt` — which would have been
the direct check. If that was tried and rejected, the reason is worth capturing.

## Tests

`tests/test_gravity_multiprocessing.py` is a genuinely good addition and the strongest part of the
PR. It drives real processes, real pipes, and a real `SIGKILL` of a subprocess-hosted planemo
(`:410`) rather than mocking the code under test; the only monkeypatching is of `galaxy_config` (to
inject a pre-built config) and `DEFAULT_SLEEP_WAIT` (to speed polling). The startup-failure test
asserts a wall-clock bound (`:341`, `< 5s`) rather than just the message, which is the right way to
prove the "stop polling when startup exits" behavior. The diff is pure addition — no existing test
was deleted, skipped, or had assertions relaxed. All imports are at module top level in every
touched file.

Gaps:

- `io.kill_process_group` has no direct test. Its escalation loop (`planemo/io.py:256-278`) has
  nontrivial `for/while/else` control flow and is only exercised via the happy path where the child
  handles SIGTERM. A test with a SIGTERM-ignoring child would cover the SIGKILL branch — and would
  currently expose finding 1 if pointed at the monitor.
- The `planemo serve --daemon --pid_file` teardown route is untested end to end. `tests/test_cmd_serve.py:52`
  kills the daemon via `kill_pid_file(pid_file)` on the symlink, which now resolves to the *monitor*
  PID rather than a gunicorn PID. `test_multiprocessing_daemon_uses_foreground_process_and_cleans_group`
  asserts the symlink exists and points at `config._daemon_process.pid` (`:272`) but never exercises
  killing through it.
- `sleep(startup_process=...)` is covered only for the "process exited" branch. The `_wait_for_retry`
  timeout branch and the overall-timeout-with-live-process branch are untested.
- Nit: `serve_module = importlib.import_module("planemo.galaxy.serve")` (`:22`) and the four inline
  `importlib.import_module("planemo.galaxy.ephemeris_sleep")` calls (`:258`, `:303`, `:328`, `:354`).
  A plain `from planemo.galaxy import serve as serve_module, ephemeris_sleep` works identically with
  `monkeypatch.setattr` and matches the rest of the suite.

Real gravity integration is not unit-tested — `MODERN_RUN_SH` is a stand-in HTTP server, not gravity.
That is the right scope split given the CI matrix already runs Galaxy 23.1 / 25.0 / dev jobs.

## Verdict

The design is sound and the reasoning about why `galaxyctl shutdown` cannot work under the
multiprocessing manager is correct. Findings 1 and 2 should land before merge; 3-7 are the
accretion-vs-abstraction concerns and are worth pushing on since this code will be the default path
for every modern Galaxy planemo serves.

## Round 2 — mvdbeek's response (`346faf9b`)

Five commits on top of `d504f1d9`, +187/-61 across 8 files. All 14 CI checks green.

### Scorecard

| # | Finding | Status |
|---|---------|--------|
| 1 | Monitor cannot escalate past SIGTERM | **Fixed**, with a real regression test |
| 2 | `service_log_contents` silently empty | **Fixed**, made explicit + tested |
| 3 | `run_galaxy_command` bypassed | **Fixed** by extracting `log_galaxy_command` |
| 4 | `kill_process_group` duplicates `kill_posix` | Resolved by deletion — duplication moved, not removed |
| 5 | `use_multiprocessing` duck-typed | Not addressed |
| 6 | Version re-exec'd every call | **Fixed**, but by threading a parameter through 6 signatures |
| 7 | Duplicated error construction | Not addressed |
| 8 | `kill()` branches twice | Not addressed |
| 9 | `env.pop("SUPERVISORD_SOCKET")` inert | Not addressed |
| 10 | `RequestException` broadening | **Fixed** — reverted, with a test |
| 11 | Signal-killed startup reports 241 | Not addressed |
| 12–13 | Doc nits (`--server-name`, version gate) | Not addressed |

### The blocking two are genuinely fixed

**Finding 1** — `7f82d80e`. The child now gets `start_new_session=True`, so Galaxy owns a process
group the monitor is *not* in. The monitor installs SIGTERM/SIGINT handlers that only set a flag,
and `_terminate_process_group` does TERM → probe (0.5 s) → KILL → `child.wait()`, reaping the
leader. `test_monitor_escalates_for_sigterm_ignoring_process_group` drives a `run.sh` whose whole
tree ignores SIGTERM. Verified locally: red against the old monitor
(`AssertionError: Process 49812 did not exit`), green against the new one. 15/15 pass.

A side benefit worth noting, because it closes a gap flagged under Tests: `planemo serve --daemon
--pid_file` → `kill_pid_file` SIGTERMs the *monitor*. Previously that killed the monitor and left
Galaxy orphaned. Now the flag is checked each loop iteration — including in the post-DETACH poll —
so the documented teardown route actually tears Galaxy down. Still not covered end to end by a test.

**Finding 2** — `49d7ba2c`. `service_log_contents` returns `{}` for `use_multiprocessing` with a
comment explaining why, and `MODERN_RUN_SH` now prints from its child so the test can assert the
output lands in `config.log_contents`. Exactly the "make it deliberate" ask.

### New concerns introduced by the fix

**A. `kill()` can raise out of teardown — `planemo/galaxy/config.py:1249-1254`**

```python
try:
    self._daemon_process.wait(timeout=2)
except subprocess.TimeoutExpired:
    self._daemon_process.send_signal(signal.SIGTERM)
    self._daemon_process.wait(timeout=2)
```

The second `wait` is unguarded, so a wedged monitor makes `kill()` raise `TimeoutExpired` from a
cleanup path — masking whatever exception was already in flight. Worse, the SIGTERM cannot unwedge
it: if the monitor is inside `_terminate_process_group`, it is blocked in `child.wait()`, and the
handler only sets a flag that is never re-checked there (PEP 475 restarts the `waitpid`). Either
guard the second wait and escalate to `SIGKILL`, or drop the SIGTERM and just guard.

**B. `TERMINATION_TIMEOUT = 0.5` is short — `planemo/galaxy/daemon_monitor.py:11`**

The deleted `kill_process_group` allowed ~1 s at each stage; this halves it. Real gunicorn plus
celery workers will not finish a graceful shutdown in 0.5 s, so SIGKILL becomes the *normal*
teardown path rather than the escalation. That interacts directly with finding 2's resolution:
`main.log` is now the only diagnostic channel, and hard-killing services mid-flush risks truncating
the very log the contract was just narrowed onto. A few seconds would cost nothing here.

**C. Nothing can reap Galaxy if the monitor dies**

Monitor and Galaxy are now in separate sessions, and the pid file still records only the monitor.
Previously the shared group gave planemo a way to nuke both. This is an inherent trade of the fix
and the monitor is a small stdlib loop, so probably fine — but the belt-and-braces is gone.

**D. Test placed in the shared helpers module — `tests/test_utils.py:63`**

`test_sleep_fails_immediately_for_invalid_url` lands in the module every other test module imports
for helpers, wedged between constant definitions and `class MarkGenerator`. It runs (the filename
matches), but it belongs in a test module for `ephemeris_sleep`.

### On findings 4 and 6, the abstraction concern didn't really land

**4** — `kill_process_group` is gone from `planemo/io.py`, but its escalation loop reappears as
`_terminate_process_group` in `daemon_monitor.py`. That is still the same TERM → probe → KILL logic
as `kill_posix`, now in a third file. Keeping the monitor stdlib-only is a defensible reason not to
import `planemo.io` — but then that reason is worth a comment, because the next reader sees three
copies and no explanation.

**6** — the fix threads `galaxy_version` through `local_galaxy_config`, `write_galaxy_config`,
`gravity_supports_multiprocessing`, `get_galaxy_major_version`, `get_refgenie_config`,
`_handle_refgenie_config`, and `LocalGalaxyConfig.__init__`, each with a
`galaxy_version or get_galaxy_version(galaxy_root)` fallback and two mutually-exclusive optional
parameters that nothing enforces. A `functools.lru_cache` on `get_galaxy_version` was one line and
zero new signature surface. This is the accretion pattern the review was aimed at, applied while
fixing a finding about it.

## Verdict — round 2

Mergeable. Both blocking findings are properly fixed, the escalation fix carries a regression test
that genuinely fails without it, the `RequestException` broadening is reverted with a test, and CI
is green across all 14 checks. Nothing outstanding rises to a blocker.

Worth a pre-merge tweak: (A) guard the second `wait` and (B) raise `TERMINATION_TIMEOUT`. Both are
one-liners and (B) protects the diagnostic contract that (2) just narrowed.

## Round 3 — follow-up branch (`jmchilton:1678-review-followups`)

Four commits on top of `346faf9b`, addressing round-2 A and B plus findings 4 and 6.

**`d495f263` — one process-group termination helper.** Finding 4's justification for the
duplicate loop was that the monitor should stay stdlib-only. It doesn't hold: `python -m
planemo.galaxy.daemon_monitor` makes runpy import the `planemo.galaxy` package, whose
`__init__.py` does `from .config import galaxy_config`. Measured — 1625 modules including click
and requests, against 78 for a bare interpreter. So the loop moved into `planemo.io` once and both
callers use it.

Two behaviour changes fall out. `kill_posix` now waits on the whole group rather than only the
leader, which is what its own gunicorn comment was worried about, and returns as soon as the group
is gone instead of always sleeping a flat second. And `terminate_process_group` grew a `reap`
callback: **an unreaped leader lingers as a zombie that still answers signal 0**, so without it the
group never looks empty, the grace period is always spent in full, and SIGKILL is always sent to a
group that already complied. That was latent in `346faf9b` — its SIGTERM never actually got
credited. Verified red: drop `reap` and even a willing process returns `False`.

**`ac3e8214` — 0.5 s → 10 s, overridable via `PLANEMO_TERMINATION_TIMEOUT`.** Read from the
environment per call rather than captured at import, so the monitor subprocess honours it without
it being threaded through argv. Raising it costs nothing when Galaxy behaves, precisely because of
the reap fix — the timeout became an upper bound rather than a delay. Only the post-SIGKILL wait is
capped separately, since SIGKILL can't be caught.

**`fea3cc2d` — teardown never raises.** `_shut_down_daemon_monitor` escalates through the shared
helper and warns instead of raising. It also stops waiting for a monitor nobody asked to stop:
closing the control pipe is what requests teardown, and a detached daemon has no pipe left.
Measured, the monitor exits 0.43 s after EOF — the 20 s was entirely the detached path waiting out
a grace period it was never told to observe. The two daemon tests now finish in ~2 s, faster than
on `346faf9b`.

**`d9c440ec` — `lru_cache` on `get_galaxy_version`.** All seven signatures go back to taking
`galaxy_root` alone. Keyed on the checkout path; `_install_galaxy` clears it. Tests pin that one
configuration build reads the module exactly once, and that two roots don't share an answer.

Verification: 44 passed in `test_io.py` + `test_gravity_multiprocessing.py` + `test_galaxy_config.py`;
506 tests still collect; flake8/isort clean; mypy clean in all three touched files. The 3
`test_galaxy_config.py` failures are `RuntimeError: Failed to install Galaxy` and reproduce
identically on `346faf9b` — macOS can't build a Galaxy venv here.

Not addressed on this branch: findings 5, 7, 8, 9, 11, 12, 13, and round-2 D.

## Follow-ups

- [x] Monitor escalates SIGTERM → SIGKILL and survives its own group signal (finding 1) — `7f82d80e`
- [x] Decide and document what `service_log_contents` means under multiprocessing (finding 2) — `49d7ba2c`
- [x] Fold the daemon launch into `run_galaxy_command` rather than around it (finding 3) — `b850174d`, via extraction
- [x] Justify or revert the `RequestException` broadening in `ephemeris_sleep` (finding 10) — `5dc10841`, reverted
- [x] Guard the second `wait(timeout=2)` in `kill()` and escalate to SIGKILL (round 2, A) — `fea3cc2d`
- [x] Raise `TERMINATION_TIMEOUT` above 0.5 s (round 2, B) — `ac3e8214`
- [x] Collapse the third copy of the TERM/KILL escalation (finding 4) — `d495f263`
- [x] Replace the `galaxy_version` parameter threading with `lru_cache` (finding 6) — `d9c440ec`
- [ ] Move `test_sleep_fails_immediately_for_invalid_url` out of the shared helpers module (round 2, D)
- [ ] Declare `use_multiprocessing` on `BaseGalaxyConfig` and drop the `getattr` (finding 5)
- [ ] Extract the duplicated startup-failure message in `serve.py` (finding 7)
- [ ] Split `kill()` into `_kill_multiprocessing` / `_kill_supervisor` (finding 8)
- [ ] Map the monitor's signal-death return code so it does not report 241 (finding 11)
