# PR 480 — Fix --daemon flag being silently dropped in webless mode

**Repo:** galaxyproject/pulsar · **PR:** #480 · **Author:** gkr0110 · **Head:** `f06b2c473a51e07af9ec4af290c45e11bb6b80c8` · **Base:** `master`

The bug is real and the diagnosis is correct: `scripts/pulsar`'s `webless` branch was the only launch
mode that dropped `"$@"` entirely, so `pulsar --mode webless --daemon` ran `pulsar-main` in the
foreground with no warning. The fix works — I verified it end-to-end with a stub `pulsar-main` on
`PATH`. Fork ordering is safe (the app is loaded *after* the fork, not before), the PID file records
the post-fork PID, and SIGTERM produces a clean `pulsar_app.shutdown()`. The problems are elsewhere.
First, the fix is implemented as an argument-rewriting loop in bash rather than by closing the flag-name
divergence in `pulsar-main`, which cements a split the codebase should be collapsing — and it declares
`--stop-daemon` unsupported when `pulsar/scripts/serve.py:126` already contains a generic
`_stop_daemon` that would work verbatim against a `pulsar-main` daemon. Second, the now-working
daemon sends **all of its logs to `/dev/null`** by default, contradicting the documented behavior and
the sibling gunicorn path. Third, `daemonize` is not a declared dependency, so on a stock install this
command now hard-crashes where it previously (wrongly) ran. **Verdict: request changes** — the
direction is right, the landing is not.

## The bug

Pre-PR, `scripts/pulsar` at the `webless` branch (`scripts/pulsar:139-151` on `master`):

```bash
elif [ "$MODE" == "webless" ]; then
    if hash pulsar-main 2>/dev/null; then
        echo "Starting pulsar with command [pulsar-main]"
        pulsar-main                 # "$@" never referenced
    else
        ...
        python pulsar/main.py       # same
    fi
```

Every sibling branch forwards `"$@"`: `uwsgi` (`scripts/pulsar:127`), `circusd` (`:130`),
`chaussette` (`:133`), `gunicorn` (`:136`), `paster` (`:139`). Only `webless` did not. Confirmed by
reading the base file, not the PR title.

The top-of-script option loop (`scripts/pulsar:25-58`) handles only `-h`/`-m`/`-c`/`--` and `break`s
on anything else, so `--daemon` survives in `"$@"` and reaches the mode dispatch. It was then thrown
away. No error, no warning — the process starts, looks healthy, and dies with the login shell.

The second half of the diagnosis is also correct and is the reason the one-word fix (`pulsar-main "$@"`)
is insufficient: `pulsar-main` does not share `pulsar-serve`'s flag vocabulary.

| | `pulsar-serve` (gunicorn) | `pulsar-main` (webless) |
|---|---|---|
| daemonize | `--daemon` (`pulsar/scripts/serve.py:26`) | `-d` / `--daemonize` (`pulsar/main.py:284`) |
| pid file | `--pid` (`serve.py:28`) | `--pid-file` (`main.py:286`) |
| log file | `--log-file` (`serve.py:30`) | `--daemon-log-file` (`main.py:285`) |
| stop | `--stop-daemon` (`serve.py:32`) | not implemented |
| mechanism | hand-rolled double fork (`serve.py:93`) | `daemonize.Daemonize` (`main.py:380`) |
| log default when daemonized | `pulsar.log` (`serve.py:54-55`) | none |

So `pulsar --mode webless --daemon` passing `--daemon` straight through would have made argparse exit 2.

## The fix

`scripts/pulsar:140-154` adds a loop that rewrites argv before dispatch: `--daemon` becomes
`--daemonize`, `--stop-daemon` prints a message and exits 1, everything else passes through. Then
`"${WEBLESS_ARGS[@]}"` is forwarded to both the pip and local invocations.

Verified empirically with a stub `pulsar-main` earlier on `PATH`:

```
$ bash scripts/pulsar --mode webless --daemon
Starting pulsar with command [pulsar-main --daemonize]
STUB GOT: [--daemonize] argc=1

$ bash scripts/pulsar --mode webless              # empty array, bash 3.2
STUB GOT: [] argc=0

$ bash scripts/pulsar --mode webless --stop-daemon ; echo $?
pulsar-main does not support --stop-daemon. ...
1
```

The empty-array expansion is safe here — the script sets no `set -u`, and it was exercised under
macOS system bash 3.2.57, the oldest realistic target. `bash -n scripts/pulsar` passes.
`run.sh` is a symlink to `scripts/pulsar` (`git ls-files -s` shows mode `120000`), so there is no
duplicate copy to keep in sync. `scripts/pulsar.bat` is `pulsar-serve server.ini %*` and has no mode
support at all — out of scope.

## Fork ordering, threads, and signals

**Safe.** This was the thing most worth checking and it comes out clean.

`pulsar/main.py:365-388`:

```python
daemon = Daemonize(
    app="pulsar",
    pid=pid_file,
    action=functools.partial(app_loop, args, log, config_env),
    ...
)
daemon.start()
```

The application is never touched before `daemon.start()`. `Daemonize.start()` forks, `setsid()`s,
forks is not repeated (single fork + setsid, not a double fork), closes fds, and only then calls
`self.action()` — which is the *first* point at which `app_loop` → `_app` → `load_pulsar_app` →
`pulsar.core.PulsarApp(**config)` runs. Every thread Pulsar spawns is therefore created in the
daemonized child:

- the AMQP consumer thread (`pulsar/messaging/bind_amqp.py:103-104`),
- the queued-manager workers (`pulsar/managers/queued.py:45`),
- the status outbox retry thread (`pulsar/messaging/outbox.py:88`).

None of them predate the fork, so none of them are lost to it. The `import pulsar.core` at
`main.py:132` is deliberately inside `load_pulsar_app` and therefore also post-fork. (This is a
function-level import; per the repo's own convention I'd normally flag it, but it is pre-existing,
load-bearing for exactly this ordering, and not touched by the PR.)

**Signals are preserved and shutdown is clean.** `daemonize.py` installs
`signal.signal(signal.SIGTERM, self.sigterm)` immediately before invoking the action, i.e. in the
child. `sigterm` calls `sys.exit(0)`, which raises `SystemExit` in the main thread — the main thread
is parked in `time.sleep(5)` inside `app_loop` (`main.py:140-148`), which catches it:

```python
except SystemExit:
    sleep = False
...
pulsar_app.shutdown()
```

So SIGTERM → `SystemExit` → loop exits → `pulsar_app.shutdown()` → `atexit` → `Daemonize.exit()`
removes the pid file. SIGINT is handled by the adjacent `except KeyboardInterrupt`. This is a genuine
positive and worth stating: the daemonized webless process shuts down as gracefully as the foreground
one.

## PID file and `--stop-daemon`

**PID file: correct.** `Daemonize.start()` opens the pidfile and takes an `flock` in the *parent*
(pre-fork, which is what gives you the single-instance guarantee), adds `lockfile.fileno()` to
`keep_fds` so it survives fd-closing, and then writes `lockfile.write("%s" % os.getpid())` in the
child after `setsid()`. The recorded PID is the post-fork daemon PID. The path is `os.path.abspath`'d
at construction time — in the parent, before `daemonize`'s default `os.chdir("/")` — so a relative
`--pid-file` resolves against the invoking CWD, which is what a user expects. Default is
`pulsar.pid` (`main.py:58`), matching the gunicorn path's default.

**`--stop-daemon`: no longer silently wrong, but the fix is a refusal where a reuse was available.**
Pre-PR, `pulsar --mode webless --stop-daemon` dropped the flag and *started a foreground server* —
the exact opposite of the request. Post-PR it exits 1 with an explanatory message. That is a strict
improvement, and the message's pointer to `pulsar-config --supervisor` is accurate (`pulsar/scripts/config.py:189`).

But `pulsar/scripts/serve.py:126-149` is:

```python
def _stop_daemon(pid_file):
    """Stop a daemonized pulsar-serve process."""
    ...
    os.kill(pid, signal.SIGTERM)
    ...
    os.remove(pid_file)
```

Nothing in it is gunicorn-specific. It reads a pid file, sends SIGTERM, unlinks. And per the signal
analysis above, SIGTERM against a `pulsar-main` daemon does precisely the right thing. This function
would work against a webless daemon **as written, today**. Declaring the feature unsupported in bash
while a working implementation sits one module away is the reuse miss at the center of this review.

## Reuse — does the webserver branch already do this?

Yes, and the codebase already carries two independent daemonization implementations:

1. `pulsar/scripts/serve.py:93-123` — hand-rolled double fork, `setsid`, explicit pid write,
   `dup2` of stdout/stderr onto a log file. No external dependency.
2. `pulsar/main.py:365-388` — the `daemonize` library.

They disagree on flag names, on log defaults, on `--stop-daemon` support, and on dependency
footprint. This PR does **not** add a third implementation, and deserves credit for that. What it
does instead is paper over the divergence with an argv-rewriting loop in shell, which makes the
divergence permanent and moves a piece of Pulsar's CLI contract into bash where it cannot be tested
by the Python suite.

The smaller, more durable shape — same user-visible fix, less surface:

```python
# pulsar/main.py:284
arg_parser.add_argument("-d", "--daemonize", "--daemon", default=False,
                        help=HELP_DAEMONIZE, action="store_true")
```

plus a `--stop-daemon` that delegates to `serve._stop_daemon(args.pid_file)`. The webless branch of
`scripts/pulsar` then collapses to `pulsar-main "$@"`, identical in shape to all five sibling
branches, and the whole `WEBLESS_ARGS` loop disappears. The alias also fixes anyone invoking
`pulsar-main --daemon` directly, which the bash-side fix does not.

The larger option — extracting one `pulsar/scripts/_daemon.py` used by both `serve.py` and `main.py`
— is the correct end state but is more than this PR should carry. The argparse alias is the version
that lands the same fix and leaves the codebase with one less divergence rather than one more.

## Test coverage

**None.** The PR ships zero tests. No shell-level tests exist anywhere under `test/`, and
`pulsar.main` is conspicuously absent from `test/cli_help_tests.py:MODULES` even though the file's
whole purpose is asserting every console script responds to `-h`. `test/main_util_test.py` exercises
`PulsarConfigBuilder` directly but never touches `main()` or the daemon branch.

No tests were weakened — there were none to weaken.

Realistic assertions, none of which require forking:

- Add `pulsar.main` to `test/cli_help_tests.py:MODULES`. One line, and it would have caught a
  `--daemon` alias typo immediately.
- Pure-argparse test in `test/main_util_test.py`: build the parser via
  `PulsarConfigBuilder.populate_options`, assert `parse_args(["--daemon"]).daemonize is True` and
  `parse_args(["-d"]).daemonize is True`. This is the natural home *if* the fix moves into argparse,
  which is another argument for doing so.
- Shell-level, if the bash approach is kept: put a stub `pulsar-main` that echoes its argv on `PATH`,
  run `scripts/pulsar --mode webless --daemon`, assert `--daemonize` was received. I did exactly this
  by hand while reviewing (see "The fix"), so it is demonstrably a few lines of pytest with
  `subprocess` and `tmp_path`. Also assert the `--stop-daemon` exit code is 1.

## CI result — a regression nobody predicted (added 2026-08-18)

CI ran after workflow approval. **`Resilience Suite` FAILED** (2m28s); every other job passed,
including all five `test-ci` factors, `install_wheel`, MyPy, all three lint jobs, and all three
long `Test (3.10, ...)` jobs.

Root cause, from the job log (run `30701109948`, job `95721259903`):

```
pulsar-1 | pulsar-main: error: unrecognized arguments: --port 8913
...
E       TimeoutError: Pulsar did not bind amqp consumers within 60.0s
ERROR test/resilience/scenarios/test_broker_outage.py::test_b1_outage_during_preprocessing[mode=amqp]
```

The resilience harness launches Pulsar via `test/resilience/entrypoint.sh:24`:

```sh
exec pulsar --mode webless --config_dir "$runtime" --port 8913
```

`--config_dir` is consumed by `scripts/pulsar` itself; `--port` is not, so it survives into `"$@"`.
Before this PR the webless branch ran a bare `pulsar-main` and **discarded `"$@"` entirely**, so
`--port 8913` was silently thrown away and Pulsar started. After this PR `"$@"` is forwarded, and
`pulsar-main`'s argparse rejects `--port` — the container dies at startup, no AMQP consumers ever
bind, and the scenario times out 60s later.

### CORRECTED (2026-08-19) — the first draft of this section overclaimed

The paragraphs originally here argued that the dropped `"$@"` was **load-bearing**, that callers
in the wild rely on the silent drop, and that the PR therefore requires "reconciling two argument
vocabularies that have silently diverged for years — a substantially bigger piece of work than the
diff." **That is wrong, and `docs/scripts/pulsar.rst:53-54` settles it:**

> See the documentation for the ``pulsar-main`` for the arguments that may be
> supplied to ``pulsar`` in this mode.

Forwarding `pulsar-main`'s arguments in webless mode is the **documented contract**, and has been
all along. The silent drop was the violation of it. `--port` was never a valid webless argument —
webless by definition binds no port (`scripts/pulsar`'s own `--help` says so: "In webless mode
Pulsar will not attempt to bind to a port"). So `test/resilience/entrypoint.sh` was passing a
documented-invalid flag and getting away with it only because of the bug this PR fixes.

There is no vocabulary to reconcile. `scripts/pulsar` declares no argument set of its own for
webless — it consumes `-h`, `-m/--mode`, `-c/--config` and forwards the rest, and the docs say the
rest must be `pulsar-main`'s. The PR makes code match documentation.

**The fix is one line, and it belongs in the harness, not in `scripts/pulsar` or `pulsar-main`:**
*Filed as [galaxyproject/pulsar#487](https://github.com/galaxyproject/pulsar/pull/487) on 2026-08-19,
targeting `master` rather than this PR — the bogus flag predates #480, and the removal is provably a
no-op on `master` (the webless branch there runs a bare `pulsar-main` and never references `"$@"`),
so it can land independently and de-risk this PR.*

```diff
-exec pulsar --mode webless --config_dir "$runtime" --port 8913
+exec pulsar --mode webless --config_dir "$runtime"
```

Verified locally against this branch (Docker 29.7.2, `test/resilience/docker-compose.yml`): with
`--port 8913` removed the `pulsar` container stays up and logs
`bind_manager_to_queue called for [amqp://...] and manager [_default_]` — the exact `bind_marker`
string `harness/pulsar_control.py:192` polls for. Pre-fix that line never appeared because the
process exited at argparse. `--config_dir` is unaffected: `pulsar-main` accepts it as
`-c/--config_dir` (`main.py:278`). It is also redundant with the `PULSAR_CONFIG_DIR` export on the
preceding line, but it is valid and explicit, so leave it.

Nothing reaches Pulsar over 8913 in this suite — `docker-compose.yml`'s `pulsar` service publishes
no ports at all, and readiness is docker-compose-logs plus the RabbitMQ management API
(`_amqp_setup_has_consumer`), never HTTP. The flag was inert cruft, most likely copied from the
gunicorn/chaussette invocations where a port *is* meaningful.

**What survives from the original framing:** the compatibility concern, at much reduced scale.
Anyone in the wild who copied the same documented-invalid flag into a webless invocation will get
a hard failure on upgrade instead of a silent ignore. That is the correct behaviour and matches the
docs, but it is still a behaviour change on a release boundary. It deserves a `HISTORY.rst` entry
under `0.15.16.dev0` (currently empty — this PR adds none), worded as a caveat, not just a fix.

**What does not survive:** the claim that this makes finding 3 "clearly correct." Finding 3 still
stands on its own merits — argparse is a better home for the `--daemon`→`--daemonize` alias than a
bash translation loop — but the CI failure is not evidence for it. The CI failure is evidence that
the harness had a bug that the PR usefully exposed.

Note also what CI did **not** catch: findings 1 and 2 (logs lost when daemonized; `daemonize` not a
declared dependency) did not surface, because nothing in CI ever invokes `--daemon`. `install_wheel`
passed. Those two P1s remain code-reading arguments, unverified empirically — the green
`install_wheel` job is not evidence against finding 2, since it never runs the daemon path.

## Findings

0. **P2 (CONFIRMED BY CI, fix verified locally) — the resilience harness passes a
   documented-invalid flag, and this PR stops hiding it.** `Resilience Suite` fails on this PR
   (and only that job): `test/resilience/entrypoint.sh:24` runs
   `pulsar --mode webless --config_dir "$runtime" --port 8913`, `pulsar-main` now receives
   `--port 8913`, and exits with `unrecognized arguments`. With `-x` in the CI invocation this
   blocks the entire scenario suite — the 9 tests that "passed" are `mock_galaxy/recorder_test.py`
   unit tests that never touch a container; the first scenario test errored and the rest never ran.
   Fix is one line in the harness (drop `--port 8913`), verified locally: container stays up,
   consumers bind. Split out as [#487](https://github.com/galaxyproject/pulsar/pull/487) against
   `master`, so this PR needs only a rebase once that lands. **Downgraded from P1 after review** — the original entry called this a merge
   blocker requiring argument-vocabulary reconciliation. It is neither; see the CORRECTED subsection
   above. Webless has never accepted `--port`, and forwarding `pulsar-main`'s args is the documented
   behaviour this PR restores. Ask for the one-line harness fix plus a `HISTORY.rst` note; the
   substantive objections to this PR are findings 1 and 2, not this.

1. **P1 — the daemonized webless process loses all of its logs.** `main.py:376-378`: when
   `--daemon-log-file` is not supplied, a `StreamHandler(sys.stderr)` is added and `keep_fds` stays
   empty. `daemonize` unconditionally `dup2`s `/dev/null` onto fds 0, 1, and 2 regardless of
   `keep_fds`. Worse, `app_loop` → `setup_file_logging()` (`main.py:306-316`) runs *post-fork* and
   applies `server.ini.sample`'s `[handler_console] args = (sys.stderr,)` — also `/dev/null`. So
   `pulsar --mode webless --daemon` on a default config yields a running daemon that emits nothing,
   anywhere. This directly contradicts `docs/scripts/pulsar.rst:40-42` and `docs/install.rst:179-181`
   ("When run as a daemon, Pulsar will log to the file `pulsar.log`") and diverges from the gunicorn
   path, which defaults `log_file = "pulsar.log"` (`serve.py:54-55`). The PR turns a visibly-broken
   command into an invisibly-broken one, which is arguably a worse failure mode for the operator.
   Fix: default `--daemon-log-file` to `pulsar.log` when `--daemonize` is set (`main.py`, mirroring
   `serve.py:52-55`), or inject it from the script. The former is better — it also fixes direct
   `pulsar-main -d` users. Note the existing `keep_fds` plumbing at `main.py:371-374` is correct and
   opens the file pre-fork, so a relative path resolves against the invoking CWD despite
   `daemonize`'s `chdir("/")`; only the *default* is missing.

2. **P1 — `daemonize` is not a declared dependency, so this command now hard-crashes on a stock
   install.** `daemonize` appears in neither `requirements.txt` nor
   `setup.py:106-110`'s `extras_require` (`amqp`, `web`, `galaxy_extended_metadata`). `main.py:366-367`
   raises `ImportError(REQUIRES_DAEMONIZE_MESSAGE)` as a bare traceback. Pre-PR the flag was dropped
   and the server ran (wrongly) in the foreground; post-PR the default install gets a stack trace.
   Failing loudly is the right instinct, but not as an unhandled `ImportError`. Fix: add a
   `'daemon': ['daemonize']` extra and make the message actionable
   (`pip install 'pulsar-app[daemon]'`) — the gunicorn path already models this at `serve.py:155-159`.
   The author presumably had `daemonize` installed, which is why their manual test passed.

3. **P2 — the fix belongs in `pulsar-main`'s argparse, not in bash.** Adding `--daemon` as an alias
   at `main.py:284` and implementing `--stop-daemon` via the already-generic
   `serve.py:126` `_stop_daemon` deletes the entire `WEBLESS_ARGS` loop, restores
   `pulsar-main "$@"` symmetry with all five sibling branches, fixes direct `pulsar-main` invocations
   too, and makes the behavior testable from pytest. See "Reuse" above. This is the finding I'd
   most like addressed.

4. **P2 — the daemon flag family is only half-translated.** `--daemon` is rewritten but `--pid` and
   `--log-file` (the `pulsar-serve` spellings, both documented on the same CLI surface) pass through
   untouched and will make `pulsar-main`'s argparse exit 2 with a confusing message. Either translate
   the whole family (`--pid` → `--pid-file`, `--log-file` → `--daemon-log-file`) or, better, adopt
   finding 3 and translate none of it.

5. **P2 — the "running locally" webless branch the PR edits has been dead, and stays dead.**
   `scripts/pulsar:162` reads `PROJECT_DIRECTORY=$PULSAR_SCRIPTS_DIR/..`, but `PULSAR_SCRIPTS_DIR` is
   set nowhere in the repository (verified by grep across the tree; `scripts/pulsar:162` is its only
   occurrence). Traced empirically with `bash -x`:

   ```
   + PROJECT_DIRECTORY=/..
   + cd /..
   + python pulsar/main.py --daemonize
   ```

   The process `cd`s to `/` and then fails to find `pulsar/main.py`. Pre-existing, not caused by this
   PR — but the PR modifies the two lines directly beneath it, half of its own stated fix lives in
   this branch, and it is a two-character change (`$PULSAR_SCRIPTS_DIR` → `$SCRIPTS_DIRECTORY`).
   Worth folding in while the author is here. (`SCRIPTS_DIRECTORY` at `scripts/pulsar:60` has its own
   quirk — it appends `/scripts` to `dirname "$BASH_SOURCE"`, which is only correct when invoked via
   the top-level `run.sh` symlink, not as `scripts/pulsar` directly. Flagging it, not asking for it.)

6. **P2 — no tests.** See "Test coverage". At minimum, add `pulsar.main` to
   `test/cli_help_tests.py:MODULES`; if finding 3 is adopted, the argparse assertion is a two-line
   addition to `test/main_util_test.py`.

7. **P3 — `${WEBLESS_ARGS[@]}` inside a quoted string should be `${WEBLESS_ARGS[*]}`.**
   `scripts/pulsar:158` and `:167`. Inside double quotes with surrounding literal text, `[@]`
   word-splits the message into multiple arguments to `echo`, which then rejoins them with single
   spaces — so the output is coincidentally identical and nothing breaks. Still the wrong idiom, and
   it produces a trailing space when the array is empty (`Starting pulsar with command [pulsar-main ]`,
   observed).

8. **P3 — docs not updated.** `docs/scripts/pulsar.rst:40-44` and `docs/install.rst:84-88` document
   `--daemon` / `--stop-daemon` as universal. With this PR, `--stop-daemon` is a hard error in
   webless mode and `--daemon`'s logging behavior differs from the documented `pulsar.log`. If
   finding 1 and the `_stop_daemon` reuse are both taken, the docs stay true as written and nothing
   is needed — another argument for that path.

9. **P3 — pre-existing argument-order sensitivity.** `pulsar --daemon --mode webless` breaks out of
   the option loop at `--daemon`, leaving `MODE` unset; autodetect picks gunicorn and `pulsar-serve`
   receives a stray `--mode`. Only `pulsar --mode webless --daemon` works. Not introduced here, but
   the script's own `show_help` (`scripts/pulsar:5-9`) shows `--daemon` first, which invites the
   broken ordering.

## Verdict

**Request changes.** Real bug, correct diagnosis, working fix, and the hardest thing to get right —
fork-before-app-load ordering — is right. Two P1s should block: the daemon silently discards all
logging on a default config (finding 1), and `daemonize` is undeclared so the newly-working command
tracebacks on a stock install (finding 2). Both are small.

Red CI (`Resilience Suite`) is *not* one of the blockers, despite being the only failing job. It is
a one-line harness bug this PR usefully exposed, now split out as
[#487](https://github.com/galaxyproject/pulsar/pull/487) against `master`; once that merges this PR
just needs a rebase. Still worth asking this PR for a `HISTORY.rst` entry under `0.15.16.dev0`
(currently empty) noting that webless now rejects arguments `pulsar-main` does not accept — that is
a real behaviour change on a release boundary, even though it is the documented behaviour. See
finding 0.

The change I'd push hardest for is finding 3. Moving `--daemon` into `pulsar-main`'s argparse and
reusing `serve._stop_daemon` deletes the bash translation layer entirely, makes the webless branch
look like every other branch in the file, brings the behavior under pytest, and fixes direct
`pulsar-main` users too. As written the PR resolves a real user-facing problem by encoding a CLI
contract in shell — it accretes where the codebase was already asking to be unified.

**Unverified:** everything in this review was verified by reading the source or by direct execution
(stub `pulsar-main` on `PATH`, `bash -x` tracing, reading `daemonize` 2.5.0's source). Not verified:
behavior on a real webless+AMQP deployment, and behavior under non-macOS bash 5.x (only bash 3.2.57
was exercised; nothing in the diff is version-sensitive beyond the empty-array expansion, which is
the 3.2 case and passed).
