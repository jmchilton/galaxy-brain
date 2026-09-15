# PR 451 — Allow a user mapping script for ExternalDrmaaQueueManager

**Repo:** galaxyproject/pulsar · **PR:** [#451](https://github.com/galaxyproject/pulsar/pull/451) (bernt-matthias, opened 2026-05-05) · **State:** OPEN, MERGEABLE (merge commit `78cb485` pushed 2026-09-14) · **Commit:** `78cb485` (2 commits) · **Files:** `docs/job_managers.rst` (+7), `pulsar/managers/queued_external_drmaa.py` (+10) · **Reviewed:** 2026-09-14

## Conclusion

**Request changes.** The feature is legitimate and wanted — martincarrere reports the identical
need — and the shape is roughly right: argv list, `shell=False`, mapping applied before anything
consumes the username. But as written it has a **fail-open path that hands job submission to the
wrong identity**, it feeds unvalidated script stdout into a code path that has always assumed a
Galaxy-validated username, its error log line can only ever print `None`, there is no timeout, and
the docs never tell the operator to send an email — which is the entire point of the PR. Fixes are
~10 lines plus validation; this is not a rework.

The conflict was **not** a design conflict — master has since been reformatted with black and
fully type-annotated. Resolved and pushed as merge commit `78cb485`; the PR is now `MERGEABLE`.
See "Merge resolution" at the end — one of the two conflicts was a silent-deletion trap.

## The change

```python
if self.user_mapping_script:
    try:
        mapped_user = subprocess.check_output([self.user_mapping_script, user], text=True).strip()
        log.info("Mapped user %s to %s" % (user, mapped_user))
        user = mapped_user
    except subprocess.CalledProcessError as e:
        log.error(f"Could not map user {user}: {e.stderr}")
        raise Exception("User mapping script failed")
```

inserted in `launch()` between the `if not user:` guard and `self.__change_ownership(job_id, user)`
(master `pulsar/managers/queued_external_drmaa.py:76-77`).

---

## 1. Security

### 1a. Empty output ⇒ the `-u` argument disappears (blocking)

`mapped_user` is `.strip()`ed and assigned unconditionally. A mapping script that exits `0` and
prints nothing — LDAP returns no match but the script forgets to signal it; a `grep` that finds
nothing in a pipeline without `pipefail`; a script that writes the answer to stderr by mistake —
yields `user = ""`. The pre-mapping `if not user:` guard at `:76` fires *before* the mapping and is
never re-run.

`user = ""` then flows into `sudo_popen` (`pulsar/managers/util/sudo.py:19-23`):

```python
user = kwargs.get("user", None)
full_command = [SUDO_PATH, SUDO_PRESERVE_ENVIRONMENT_ARG]
if user:
    full_command.extend([SUDO_USER_ARG, user])
```

`""` is falsy, so `-u` is silently dropped. Verified by simulating the arg construction:

```
user=''    -> /usr/bin/sudo -E scripts/drmaa_launch.bash --job_attributes jt.json
user=None  -> /usr/bin/sudo -E scripts/drmaa_launch.bash --job_attributes jt.json
user='bob' -> /usr/bin/sudo -E -u bob scripts/drmaa_launch.bash --job_attributes jt.json
```

Both outcomes are bugs, and which one you get depends on a sudoers rule Pulsar ships nowhere (there
is no sudoers sample anywhere in `docs/`):

- **Permissive runas spec** (`pulsar ALL=(ALL) NOPASSWD: .../drmaa_launch.bash`) — sudo defaults to
  root and the rule allows it. The DRMAA job is **submitted as root**. On a run-as-real-user site
  this is the worst possible failure mode: silent, and it produces a working job.
- **Runas-restricted spec** — sudo defaults to root, the rule denies it, `__sudo`'s
  `assert p.returncode == 0` fires, and the job dies with an opaque assertion. Merely bad.

The chown half fails quietly in both cases. `__change_ownership` passes `--user ""`;
`chown_working_directory.py`'s `arg_parser.add_argument("--user", required=True)` checks *presence*,
not truthiness, so `""` sails through to `chown -Rh '' '/staging/<job>'` — and the `os.system` return
is never inspected (`pulsar/scripts/chown_working_directory.py:39-40`), so ownership silently isn't
changed before launch.

**Fix:** re-assert the guard after mapping.

```python
if not mapped_user:
    raise Exception(f"User mapping script produced no output for {user}")
```

### 1b. Unvalidated script output reaches a shell-string `chown` running under sudo (blocking)

`pulsar/scripts/chown_working_directory.py:39-40`:

```python
command = "chown -Rh '{}' '{}'".format(user, job_directory)
system(command)
```

That is a shell string built by naive single-quoting, executed via `os.system`, invoked through
`self.__sudo(*cmds)` with no `user=` — i.e. under sudo's default runas. A `user` value containing a
single quote breaks out of the quoting.

This interpolation is **pre-existing**, and today it is safe *by accident of the input source*. The
only supported way to populate `submit_params["user"]` is `submit_user: $__user_name__` in Galaxy's
destination (`docs/job_managers.rst:158-160`), and Galaxy constrains usernames hard —
`VALID_PUBLICNAME_RE = re.compile(r"^[a-z0-9._\-]+$")`
(`lib/galaxy/security/validate_user_input.py:62`). Nothing shell-significant can get through.

This PR replaces that constrained source with **the stdout of an operator-supplied script, validated
nowhere**, and that is the trust-boundary widening. `chown_working_directory.py`'s implicit
assumption ("this string was checked by Galaxy") stops holding, and the PR doesn't restore it.
`.strip()` is not validation — a script emitting two lines gives `'alice\nroot'`, verified.

The right place for the check is here, in the manager, where the invariant is established:

```python
if not re.fullmatch(r"[a-z_][a-z0-9_-]*\$?", mapped_user):
    raise Exception(f"User mapping script returned invalid username for {user}")
```

(That pattern is the POSIX/`useradd` portable set; pick whatever the site needs, but pick one.)
Fixing `chown_working_directory.py` to use `shlex.quote` — or better, `shutil.chown`/`os.chown` — is
worth a separate PR either way, but this PR shouldn't depend on it landing first.

### 1c. The email as `$1` — smaller, docs-only

The email never reaches a shell on Pulsar's side: `check_output` takes an argv list, `shell=False`,
and `user` is replaced before `__change_ownership`. Good. But the mapping script receives untrusted
client-supplied input as `$1`, and Galaxy's email regex is much laxer than its username regex —
`VALID_EMAIL_RE` (`validate_user_input.py:57`) permits `'`, `` ` ``, `$`, `!`, `*`, `|`, `{}`:

```
r"^[\w.!#$%&'*+\/=?^_`{|}~-]+@[\w](?:[\w-]{0,61}[\w])?(?:\.[\w](?:[\w-]{0,61}[\w])?)*$"
```

An operator writing `ldapsearch "(mail=$1)"` unquoted, or `eval`, gets exactly what you'd expect.
The docs should say in one sentence: *this argument is attacker-controlled; quote it*.

The email-change concern martincarrere raised, and the account-activation mitigation, are orthogonal
to everything above and are correctly handled Galaxy-side.

---

## 2. Reuse of existing abstractions

**`user_email` already exists as a submit param.** `pulsar/managers/queued_drmaa_xsede.py:56` reads
`submit_params.get("user_email", "unknown@galaxyproject.org")`, and `submit_params()`
(`pulsar/client/destination.py:50`) is a generic `submit_`-prefix filter — so
`submit_user_email: $__user_email__` in the Galaxy destination already arrives as
`submit_params["user_email"]` with no Pulsar change at all. `$__user_email__` is a real expansion
(`galaxy/lib/galaxy/model/__init__.py:1277`).

That is the better design, and it's strictly safer: keep `submit_user: $__user_name__` as the
fallback identity, read the email from `user_email`, and let the mapping script refine it. The sudo
identity then can *never* be blanked by script output — 1a disappears structurally rather than by a
guard. Overloading `submit_user` with an email is what forces the fail-open.

**No reusable abstraction is left behind.** `pulsar/managers/util/sudo.py:16-18` says it out loud:

> Helper method for building and executing Popen command. This is potentially sensetive code so
> should probably be centralized.

There is a centralized helper for *sudo* invocation, and `_handle_default()` (`:131`) for resolving
configured script paths against installed `pulsar-*` binaries. There is no helper for "run a
configured external script as the Pulsar user and consume its stdout" — and this PR inlines one
rather than creating it, which means the next such hook (the `TODO` at `queued_drmaa_xsede.py:28`
literally asks for "a generalized callback framework for executing things at various points in the
job lifecycle") inlines its own again. Pure accretion.

Minor consistency gaps with the three sibling scripts:
- They all take `--flag value` (`--user`, `--job_id`, `--external_id`, `--job_attributes`); this one
  takes a bare positional.
- They all go through `_handle_default()`; this one doesn't. Defensible — there's no shipped default
  mapping script — but it also means no `pulsar-user-mapping` entry point is possible.

---

## 3. Correctness

**`e.stderr` is always `None`.** `check_output` pipes stdout only; stderr is inherited. Verified:

```
CalledProcessError.stderr = None
CalledProcessError.output = ''
```

So the script's diagnostic goes to Pulsar's stderr, unattached to any job, and the log line reads
`Could not map user a@b.c: None` — forever. Use `subprocess.run(..., capture_output=True)` and
check `returncode`, or add `stderr=PIPE` to `check_output`.

**No timeout.** The advertised use case is an LDAP lookup. `check_output` without `timeout=` blocks
the manager's launch path indefinitely if the directory server hangs. Add `timeout=` (configurable,
or a sane constant) and catch `subprocess.TimeoutExpired`.

**Only `CalledProcessError` is caught.** `FileNotFoundError` (typo'd path, `scripts/`-relative path
resolved against the wrong cwd), `PermissionError` (non-executable), and `OSError` all escape
unhandled. Failing is the right *behaviour* — fail-closed — but the operator gets a raw traceback
rather than the "user mapping script failed" message. Catch `OSError` alongside.

**`raise Exception(...)` discards the cause.** `raise Exception("User mapping script failed") from e`
at minimum; better, include the exit code and the captured stderr in the message, since that's the
only thing the Galaxy-side admin will see.

**Unset is a correct no-op.** `kwds.get('user_mapping_script', None)` → `None` → `if
self.user_mapping_script:` false → untouched behaviour. Verified; no concern.

**Mapping placement is correct.** It lands after `_build_template_attributes` /`_write_job_file`, but
the only other consumer of `submit_params` in the DRMAA path is `native_specification`
(`base_drmaa.py:134,141`) — nothing reads `submit_params["user"]`. And `self.user_map[external_id] =
user` (`:79`) stores the *mapped* name, so `_kill_external` (`:84`) sudoes as the right user. Both
correct as written.

**PII in logs.** `log.info("Submit as user %s" % user)` at `:74` now logs a user email at INFO on
every submission, and `sudo_popen` logs the full command line at INFO too. Worth a note in the docs
if not a change.

---

## 4. Python conventions

Imports are at module top — fine. But `import subprocess` is placed *after* `from json import
dumps`, and isort is enforced in CI (`tox.ini`: `format: isort --check --diff .`, whole tree).
Running the repo's own `.isort.cfg` over the patched file:

```
+import subprocess
 from getpass import getuser
 from json import dumps
 from logging import getLogger
-import subprocess
```

`profile=black` puts straight imports before from-imports regardless of
`force_alphabetical_sort_within_sections`. **This fails `tox -e format` as submitted.**

Also mixes `%`-formatting (`log.info("Mapped user %s to %s" % ...)`) and f-strings
(`log.error(f"...")`) in adjacent lines; the file and the codebase use `%`. And logging calls should
use lazy `%s` args (`log.info("Mapped user %s to %s", user, mapped_user)`) rather than pre-formatting
— pre-existing style in this file, but the new lines shouldn't extend it.

---

## 5. Tests

**None.** The only coverage of this manager anywhere is `test/integration_test.py:54`
(`test_integration_as_user`), gated behind `@skip_without_drmaa` *and* `@integration_test` — so in
practice it runs nowhere that would catch this.

The actionable move is to extract the block into a method, which is *also* the reusable-abstraction
answer from §2:

```python
def _map_user(self, user: str) -> str:
    ...
```

Four unit tests then need no DRMAA, no sudo, and no Pulsar app — just a temp shell script and a
manager instance (or a bare call to the extracted function):

1. `user_mapping_script` unset → returns input unchanged.
2. script exits 0, prints `hpcuser` → returns `hpcuser`.
3. script exits non-zero → raises, and the message carries the script's stderr (regression for §3).
4. **script exits 0, prints nothing / whitespace → raises** (regression for §1a — the important one).

A fifth for §1b if validation is added: output `bad'name` → raises.

---

## 6. Docs

The prose has the right idea but is inaccurate on the one point that matters most.

**It never tells the operator to send an email.** `docs/job_managers.rst:158-160` still says:

> Additionally, set ``submit_user`` to ``$__user_name__`` in Galaxy's Pulsar job destination.

unchanged, while the new paragraph describes the input as *"the user name that pulsr gets from the
Galaxy server"*. The PR's entire premise is that the value is an **email**, not a username. An
operator following these docs configures `$__user_name__`, feeds a Galaxy username to their LDAP
email lookup, gets nothing back, and lands in §1a. The docs must state the intended pairing —
`submit_user: $__user_email__` (or, per §2, `submit_user_email`).

Also missing, in rough priority:
- The script runs **as the Pulsar user**, not under sudo — operators will assume otherwise given
  every neighbouring option names a sudo'd script.
- The argument is untrusted client input; quote it (§1c).
- Output must be a single bare username, no trailing text, and empty output is an error — currently
  it is not (§1a).
- There is no timeout / the call is synchronous in the submission path.

Mechanical:
- `pulsr` → `pulsar`.
- *"In can a mapping is not possible a non-zero exit code be returned"* — garbled; presumably *"In
  case a mapping is not possible, a non-zero exit code should be returned"*.
- Trailing whitespace on `#user_mapping_script: ` and on `...exit code `. The `.rst` isn't linted for
  it, but `make lint-docs` is in CI.

---

## Summary of requested changes

| # | Severity | Change |
|---|---|---|
| 1a | blocking | Raise if `mapped_user` is empty after strip — otherwise `sudo` loses `-u` |
| 1b | blocking | Validate the mapped username against a strict pattern before it reaches `chown -Rh '{}'` |
| 2 | design | Read the email from `submit_params["user_email"]` (already a convention, `queued_drmaa_xsede.py:56`) instead of overloading `submit_user`; this makes 1a structurally impossible |
| 3 | should | `capture_output=True` so `e.stderr` isn't `None`; add `timeout=`; catch `OSError`; `raise ... from e` |
| 4 | should | Move `import subprocess` to the top of the stdlib block — currently fails `tox -e format` |
| 5 | should | Extract `_map_user()` and add 4 unit tests (esp. empty-output → raise) |
| 6 | should | Docs: say `$__user_email__`, warn the arg is untrusted, note the script runs as the Pulsar user; fix `pulsr` and the garbled sentence |

Separately, outside this PR: `pulsar/scripts/chown_working_directory.py:39` should stop building a
shell string (`shlex.quote`, or `shutil.chown`) and should check `os.system`'s return value.


## Independently verified (main session, 2026-09-14)

The four load-bearing claims above were re-checked directly rather than taken on trust:

**Empty stdout → wrong identity.** `subprocess.check_output(["/bin/sh","-c","exit 0"]).strip()`
returns `''`, which is falsy. `pulsar/managers/util/sudo.py:21` reads:

```python
user = kwargs.get("user", None)
full_command = [SUDO_PATH, SUDO_PRESERVE_ENVIRONMENT_ARG]
if user:
    full_command.extend([SUDO_USER_ARG, user])
```

So an empty username drops `-u` entirely and the command runs as whatever the sudoers runas spec
defaults to. The `if not user:` guard in `launch` fires *before* the mapping and is not repeated
after it. Confirmed.

**Unvalidated stdout into a shell string.** `pulsar/scripts/chown_working_directory.py:38-39`:

```python
command = "chown -Rh '{}' '{}'".format(user, job_directory)
system(command)
```

Single-quote interpolation into a shell string run under sudo. Safe today only because the sole
input is Galaxy's `$__user_name__`; this PR makes it arbitrary script output. Confirmed.

**`e.stderr` is always `None`.** `check_output` does not pipe stderr, so the script's diagnostic
goes to Pulsar's terminal and `log.error(f"... {e.stderr}")` prints `None`. Confirmed by running it.

**`user_email` already exists as a submit param** — `pulsar/managers/queued_drmaa_xsede.py:56`.
Confirmed.

## Merge resolution

Two conflicts, both from master's typing/formatting pass; neither touches the feature's design.

1. **Import block** — master added `logging`/`typing`/`galaxy.util` imports where this branch added
   `import subprocess`. Kept both, isort-ordered.
2. **`__init__`** — master reformatted the three `_handle_default` calls across multiple lines and
   annotated `reclaimed`/`user_map`. **Resolving in master's favour alone silently deletes
   `self.user_mapping_script`**, leaving a PR that merges clean and does nothing. Took master's
   block and re-added the line in its style.

`git diff origin/master..HEAD` after the merge is exactly the branch's original contribution.

Incidentally the merge fixes finding 5: `import subprocess` is now isort-clean, so `Lint (3.14,
format)` will no longer fail on placement.

Local verification on the merged branch: isort, flake8 and mypy clean; unit suite 311 passed /
4 failed, the same four `/usr/bin/cow` macOS environmental failures present on unmodified master.

### CI after the merge

**20 pass / 1 fail.** The single failure is `Run Tests (install_wheel, 3.10)`, which is the only
failing job on master's own latest run (`2b9c0bb`, current HEAD) — pre-existing, not attributable
to this branch.

Green: all five `test-unit` and all five `test-ci` jobs (3.7, 3.11-3.14), all four Lint jobs,
`MyPy (mypy, 3.14)`, `build_packages`, `Resilience Suite`, and all three `Test (3.10, …)` Galaxy
framework jobs (`dev, extended`, `dev, directory`, `master, directory`).

`Lint (3.14, format)` passing is a consequence of the merge, not of the branch: the original
`import subprocess` placement fails isort, so that check would have gone red on its own.

**Green CI says almost nothing about this change.** There is no test coverage of the mapping code
at all, so both blocking findings — the empty-stdout fail-open and the unvalidated stdout reaching
`chown_working_directory.py`'s `os.system` string — are entirely unexercised by any of the 20
passing jobs.


## Validation pushed — `86b1138` (2026-09-14)

Findings 1, 2 and 4 addressed on the branch at the user's request. No tests added (explicitly
accepted); verified by exercising `__map_user` directly.

- **Mapped name validated** against `[A-Za-z0-9._][A-Za-z0-9._-]*` via `fullmatch`. Anchoring the
  first character also rejects a name that `sudo` would read as an option (`-u`). This closes both
  the empty-stdout fail-open and the unvalidated-stdout-into-`os.system` path with one check.
- **stderr captured** (`stderr=subprocess.PIPE`), so the error line shows the script's own message
  instead of `None`.
- **Timeout** added, configurable as `user_mapping_timeout` (default 30s).
- **Extracted `__map_user`**, which also owns the unset case, so `launch` reads as one line. Double
  underscore matches the file's existing `__launch` / `__sudo` / `__change_ownership` convention.

Behaviour verified by hand:

| script behaviour | result |
|---|---|
| prints `hpcuser42` | `'hpcuser42'` |
| exits 0, prints nothing | raises — invalid username |
| prints whitespace only | raises — invalid username |
| prints `root'; rm -rf /` | raises — invalid username |
| prints `root\nevil` | raises — invalid username |
| prints `-- -u` | raises — invalid username |
| exits 2 with stderr | raises — stderr now in the log |
| hangs | raises — timed out |
| no script configured | `'alice'` unchanged |

mypy caught a real gap during this: extracting the method lost the `if self.user_mapping_script:`
narrowing, leaving `Any | None` passed to `check_output`. Fixed by moving the guard inside the
method rather than annotating around it. isort, flake8, mypy clean; unit suite 311 passed / 4 failed
(the usual `/usr/bin/cow` environmental set).

Still open from the review: **finding 3** — `user_email` already exists as a submit param
(`queued_drmaa_xsede.py:56`), so `submit_user_email: $__user_email__` would need no Pulsar change at
all. That is a design question for the author, not something to decide on their branch. The docs
also still tell operators to set `submit_user` to `$__user_name__`, which is at odds with the PR's
stated purpose of sending an email; left alone for the same reason.
