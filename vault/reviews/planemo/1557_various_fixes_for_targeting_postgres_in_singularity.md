# planemo #1557 — Various fixes for targeting postgres in singularity

`galaxyproject/planemo#1557`, mvdbeek, +128/-138 across 11 files, branch `postgres_singularity_fix` → `master`.
Rebased 2026-08-20 from merge-base `28411491` (2025-10-16) onto current master (281 commits ahead),
then fixed findings 1-4 in two commits on top.

**CI:** #1679 was red — 7 of 14 checks. Not rebase damage; #1557 was never green either. Five defects found
and fixed (`b03239d9`); the one behaviour change left to argue about is one token wide.

**Outcome:** #1557 was closed 2026-08-20 and superseded by **#1679** ("Various fixes for targeting postgres
in singularity (rebase)"), opened from `jmchilton/planemo:postgres_singularity_fix_rebased`. mvdbeek's fork
was never pushed to.

## Rebase

8 commits replayed, authorship preserved. Pre-rebase HEAD kept as tag `pr1557-original`
in `~/projects/worktrees/planemo/pr/1557`.

7 of 11 files had zero master churn. One conflict, in `planemo/galaxy/config.py`, on commit 6
(`ef2da1e5 Don't special case singularity postgres`). Two hunks, both semantic rather than textual:

1. Master added a separate SQLite celery broker (`amqp_internal_connection`) on the line right after
   `properties["database_connection"] = _database_connection(...)`. The PR turns `_database_connection`
   into a `@contextlib.contextmanager` and moves the assignment down into a `with` block, so master's
   plain call had to go — left in place it would have assigned a generator object. **Resolution:** dropped
   master's `database_connection` line, kept the celery broker lines.
2. Master extracted `_write_shed_config_files(...)`; the PR still had the three inline `write_file` calls
   it replaced. **Resolution:** kept master's helper. It is strictly better than what the PR carried —
   it also writes `shed_tool_data_table_config` (which the PR's inline version dropped) and ensures
   parent directories exist.

Post-rebase: `flake8` clean but for one pre-existing F401 (below), `black` and `isort` clean,
`tests/test_profile_commands.py` + `tests/test_database_commands.py` collect and pass (1 passed, 3 skipped —
the skips need docker/`PLANEMO_ENABLE_POSTGRES_TESTS`).

## Blocking

**1. `planemo profile create --database_type sqlite` raises `UnboundLocalError` — `planemo/galaxy/profiles.py:99-119`**

The commit `d0c8f41d Store postgres database in profile by default` rewrote the sqlite tail of
`_create_profile_local`:

```python
    if database_type not in ["sqlite"]:          # was ["sqlite", "postgres_singularity"]
        database_source = create_database_source(**kwds)
        database_identifier = _profile_to_database_identifier(profile_name)
        ...
    if database_type == "sqlite":
        database_source.create_database(database_identifier)      # <- both names unbound here
        database_connection = database_source.sqlalchemy_url(database_identifier)
```

`database_source` and `database_identifier` are only bound in the branch taken when the type is *not*
sqlite. Reproduced on the rebased branch:

```
UnboundLocalError: cannot access local variable 'database_source' where it is not associated with a value
  planemo/galaxy/profiles.py:118 in _create_profile_local
```

Master returns `{'database_connection': 'sqlite:////tmp/.../galaxy.sqlite?isolation_level=IMMEDIATE', ...}`
for the same input, so this is a regression introduced by the PR, not pre-existing.

The only path where those names *are* bound is the postgres→sqlite fallback (`allow_sqlite_fallback`),
and there it is worse than a crash: it calls `create_database` a second time on the postgres source that
just raised `RuntimeError`.

There is also nowhere for it to go. `create_database_source` has no sqlite branch — it is a commented-out
TODO (`planemo/database/factory.py:31-35`) and `database_type == "sqlite"` falls through to
`raise Exception("Unknown database type [sqlite].")`. So the rewrite presumes a `SqliteDatabaseSource`
that was never written. Either restore master's `DATABASE_LOCATION_TEMPLATE` path or land the
`SqliteDatabaseSource` the factory has been promising.

**2. `profile_directory` is threaded but never passed — `planemo/database/factory.py:13`**

The PR adds `profile_directory: Optional[str] = None` to `create_database_source` and forwards it to
`SingularityPostgresDatabaseSource(profile_directory=..., **kwds)`, where it selects the on-disk location
(`planemo/database/postgres_singularity.py:89-90`). No call site passes it:

```
planemo/galaxy/profiles.py:46      create_database_source(**kwds)
planemo/galaxy/profiles.py:100     create_database_source(**kwds)
planemo/galaxy/config.py:1275      create_database_source(**kwds)
planemo/commands/cmd_database_{list,create,delete}.py   create_database_source(**kwds)
```

So it is always `None` and `self.database_location` never takes the profile-scoped branch. `profiles.py:100`
is the interesting one — it sits inside `_create_profile_local`, which has `profile_directory` right there
in its signature. As it stands the commit titled "Store postgres database in profile by default" does not
store the database in the profile.

## Should be fixed before merge

**3. Unused import will fail CI lint — `planemo/galaxy/profiles.py:20`**

`DATABASE_LOCATION_TEMPLATE` lost its only use when finding 1's rewrite landed. `flake8` reports
`F401 imported but unused`. Pre-existing on the branch, not a rebase artifact. If finding 1 is fixed by
restoring master's sqlite path, the import comes back into use and this resolves itself.

**4. Dead broken statement left behind — `planemo/galaxy/profiles.py:115-116`**

```python
    elif database_type == "postgres_singularity":
        database_connection + database_source.sqlalchemy_url(database_identifier)
```

`+` where `=` was meant, on names that are unbound in that branch anyway. This is pre-existing on master,
but the PR changes the guard above it from `["sqlite", "postgres_singularity"]` to `["sqlite"]`, which makes
the `elif` unreachable. Since the PR is what renders it dead, it should delete it rather than leave a
broken statement sitting in the file.

## Worth a look

**5. Test cleanup removed along with the explicit stop — `tests/test_profile_commands.py:27`, `tests/test_database_commands.py:29`**

Both tests dropped their `try/finally: stop_postgres_docker()`, matching commit `ec423b2f Don't stop
container explicitly`. The container lifecycle now lives in `_database_connection`'s
`finally: database_source.stop()` (`planemo/galaxy/config.py:1279-1280`), which only covers the
`local_galaxy_config` path — not `profile_create`. Worth confirming the docker container is not simply
leaked between CI runs now.

**6. `database_connection` no longer reaches `env` — `planemo/galaxy/config.py:491`**

`_build_env_for_galaxy` turns each property into `GALAXY_CONFIG_OVERRIDE_<KEY>`. Master set
`properties["database_connection"]` *before* env was built; the PR sets it inside the `with`, *after*.
So `GALAXY_CONFIG_OVERRIDE_DATABASE_CONNECTION` is no longer exported. This is the PR's own pre-existing
ordering, not something the rebase introduced, and modern Galaxy should be fine — `write_galaxy_config`
resolves properties into galaxy.yml specifically so the config does not depend on those env vars. But
the legacy `<22.01` .ini branch and anything reading the override directly would notice. Worth a sentence
from the author confirming it is deliberate.

## CI on #1679 (2026-08-20)

7 of 14 checks red. Master at `72cb551a` is green on the identical 13-job matrix, so every failure
below is a regression carried by this branch. **None of it came from the rebase** — #1557's own last
CI run was already red (`lint` and `unit-quick` failed on both Python versions; the six long jobs were
cancelled behind them), so the branch has never been green. The rebase only made the rest of the matrix
run far enough to see what was underneath.

| job | result |
| --- | --- |
| lint, lint_docs, mypy (3.10 + 3.13), serveclientcmd, build_packages | pass |
| unit-quick (3.10), unit-quick (3.13) | 1 failed — `test_database_commands_docker` |
| unit-diagnostic-servebasic-gx-dev | 1 failed — `test_serve_daemon`, pytest-timeout at 360s |
| unit-nonredundant-…-nogx | 26 failed, 415 passed |
| unit-nonredundant-…-gx-dev, -gx-250, -gx-231 | failed |

All of it traces to five defects, three of them new to this note.

**7. `_database_connection` treats every non-`sqlite` database type as a request for a real database
server — `planemo/galaxy/config.py:1273-1282`. Blocking.**

Master special-cased exactly one type:

```python
def _database_connection(database_location, **kwds):
    if "database_type" in kwds and kwds["database_type"] == "postgres_singularity":
        default_connection = postgres_singularity.DEFAULT_CONNECTION_STRING
    else:
        default_connection = DATABASE_LOCATION_TEMPLATE % database_location
    return kwds.get("database_connection") or default_connection
```

The PR inverts the test to `if kwds.get("database_type") != "sqlite"`. But `--database_type` defaults to
`"auto"` (`planemo/options.py:1836-1840`), and callers that never pass it at all leave it `None` — so the
*default* path is now "build a `DatabaseSource`", not "use sqlite". `create_database_source` resolves
`auto` by probing for `psql`, which exists on the CI runners, so it hands back a
`LocalPostgresDatabaseSource` whose user is unset:

```python
self.database_user = kwds.get("postgres_database_user", None)
...
return f"postgresql://{self.database_user}@{hostname}/{identifier}"
```

Reproduced in the worktree, with `which("psql")` stubbed true:

```
database_type='auto'   -> postgresql://None@localhost/galaxy
database_type=None     -> postgresql://None@localhost/galaxy
database_type='sqlite' -> sqlite:////tmp/cfg/galaxy.sqlite?isolation_level=IMMEDIATE
```

and the matching line from the CI postgres log, repeating until the job gives up:

```
FATAL:  password authentication failed for user "None"
```

That is the `test_serve_daemon` timeout, and the bulk of the 26 `nogx` failures — every test that starts
a Galaxy without a `--profile`. Profile-based tests survive because `_create_profile_local` catches the
`RuntimeError` from `create_database` and falls back to sqlite, storing `database_type: sqlite` in the
profile.

The shape of master's design is the thing to restore: the *profile* owns database selection, and
`local_galaxy_config` just honours whatever `database_connection` the profile resolved. A source should
only be built for an explicitly-named postgres type.

**8. `--database_connection` is silently ignored — same function. Blocking.**

Master's `kwds.get("database_connection") or default_connection` is gone; nothing in the new function
reads `database_connection` at all. Reproduced:

```
user-supplied --database_connection -> postgresql://None@localhost/galaxy
```

`tests/test_galaxy_config.py::test_database_connection_override_path` exists precisely to catch this and
now fails. It also means a profile's stored connection string cannot reach a serve — the loose end already
recorded under "Still open for mvdbeek", now with a failing test attached to it.

**6 (upgraded from "worth a look" to blocking). `database_connection` never reaches `env`.**

`planemo/galaxy/config.py:491` builds `env` from `properties`; `properties["database_connection"]` is not
assigned until line 510, inside the `with`. `_build_env_for_galaxy` copies into a fresh dict, so the later
mutation cannot reach it and `GALAXY_CONFIG_OVERRIDE_DATABASE_CONNECTION` is simply absent. I guessed
modern Galaxy would not care because `write_galaxy_config` resolves properties into galaxy.yml — but
`tests/test_galaxy_config.py::test_defaults` asserts on `config.env` and fails with a bare
`KeyError: 'GALAXY_CONFIG_OVERRIDE_DATABASE_CONNECTION'`. Fix is ordering: open the context manager before
`env` is built rather than after.

**9. `database_list` / `database_create` / `database_delete` never start the container — `planemo/database/postgres_docker.py:63-80`. Blocking.**

Master started the container as a side effect of `DockerPostgresDatabaseSource.__init__`. The PR moves that
into an explicit `start()` — better design — but the three `cmd_database_*.py` commands call
`create_database_source(**kwds).<method>()` and never call `start()`. Only `_database_connection` was taught
the new lifecycle. Result:

```
Error response from daemon: No such container: planemopostgres
```

That is the `test_database_commands_docker` failure in both `unit-quick` jobs. Dropping the tests'
`try/finally: stop_postgres_docker()` (finding 5) removed the one thing that was papering over it.

**10. Docker `create_database` / `delete_database` are no-ops — `planemo/database/postgres_docker.py:66-72`. Blocking.**

```python
    def create_database(self, identifier):
        # Not needed for profile creation, database will be created when Galaxy starts.
        pass
```

The commit that added these is titled "Don't create or delete database when setting up profile with docker
postgres", but the change lands on the shared `DatabaseSource`, not on the profile code that motivated it.
`cmd_database_create.py` still prints `"Database with URL %s created."` while creating nothing, and
`test_database_commands_docker` asserts the created name shows up in `database_list` — so this test has two
independent breaks in it, and fixing finding 9 alone will not turn it green. If profile setup should skip
creation, that belongs in `_create_profile_local`, not in the source that the user-facing `database_create`
command drives.

## Reuse note

The direction is right: collapsing the `postgres_singularity` special case into the same
`DatabaseSource` lifecycle the other backends use, and making `_database_connection` a context manager so
the container's lifetime is tied to the config scope, is the correct abstraction. `postgres_singularity.py`
shrinks by ~40 lines and `interface.py` grows the methods that make the backends interchangeable. The gap
is that the unification stops short of sqlite — the factory still has no `SqliteDatabaseSource`, so
`_create_profile_local` is left half-migrated, which is exactly what finding 1 is.

## Fixes applied

Two commits on top of the rebase, in the worktree, unpushed:

**`40cdc71d Fix sqlite profile creation`** — findings 1, 3, 4.
Restores master's `DATABASE_LOCATION_TEMPLATE` path for the sqlite branch rather than inventing the
`SqliteDatabaseSource` the factory only promises, which also puts the F401 import back to work; deletes
the dead `database_connection + ...` statement; collapses `not in ["sqlite"]` to `!= "sqlite"` to match
`delete_profile`. Adds `test_profile_commands_sqlite` — written red first, reproducing the
`UnboundLocalError` through the real CLI, then green.

**`d4ff60c1 Pass profile_directory through to the database source`** — finding 2.
Passes `profile_directory` from `_create_profile_local` and `delete_profile`. Verified: the singularity
source now resolves `<profile>/postgres` instead of a throwaway `mkdtemp`. `delete_profile` is included
deliberately — create and delete have to agree on where the database lives.

Post-fix: `flake8`, `black`, `isort` all clean; profile + database command tests 2 passed, 3 skipped
(skips need `PLANEMO_ENABLE_POSTGRES_TESTS` / psql).

## Fixes applied — round 2 (CI red)

Four more commits, pushed to `jmchilton:postgres_singularity_fix_rebased` (`b03239d9`).

**`ea3c8a32 Set database_connection before the Galaxy env is built`** — finding 6.
Pure move: the `with _database_connection(...)` block now opens where master assigned the property,
above `_build_env_for_galaxy`, and the rest of `local_galaxy_config` is indented into it. No semantics
changed; `GALAXY_CONFIG_OVERRIDE_DATABASE_CONNECTION` is exported again.

**`5db1ee5a Only stand up a database server for an explicitly named backend`** — findings 7 and 8.
`_database_connection` now yields, in order: an explicit `database_connection`; a managed source for a
named postgres backend; otherwise the config directory's sqlite file. Three unit tests in
`tests/test_galaxy_config.py`, written red first — two of them fail on the pre-fix function
(`auto` → `postgresql://None@localhost/galaxy`, and the override being ignored), the third pins the
start/stop lifecycle for a named backend. The upstream `test_defaults` and
`test_database_connection_override_path` also cover 6 and 8 but need a built Galaxy, which this laptop
cannot produce (`common_startup.sh` fails against system python3) — those two are CI's to confirm.

**`884da691 Start the database server from the commands that administer it`** — finding 9.
New `started_database_source()` in `planemo/database/factory.py`: constructs and starts in one call, for
the callers that administer a database rather than run a Galaxy against one — `cmd_database_list`,
`cmd_database_create`, `cmd_database_delete`, and both profile paths. It deliberately does not stop;
the container runs with `--rm`, so shutting it down would discard what was just created. The serve path
keeps `create_database_source` and owns `stop()` itself. That split is the thing worth having: the bug
existed because "who starts this" was implicit in `__init__`, and moving it out left no name to forget.

**`b03239d9 Let postgres_docker create and delete databases again`** — findings 10 and 5.
Drops the no-op `create_database`/`delete_database`, restores `create_database` to the ABC, and puts the
`try/finally: stop_postgres_docker()` back in both docker tests.

Verified locally against real docker: `test_database_commands.py -k docker` red before
(`No such container: planemopostgres`) and green after; `test_profile_commands.py` 2 passed, 1 skipped,
with no container left behind. `flake8`, `black`, `isort` clean; `mypy` reports nothing in any touched
file. `test_database_commands` (local psql, non-docker) fails here for want of a postgres server — it
passes in CI.

### The one line

The behaviour change is isolated to `planemo/galaxy/config.py`:

```python
MANAGED_DATABASE_TYPES = ("postgres", "postgres_docker", "postgres_singularity")
```

Adding `"auto"` to that tuple restores mvdbeek's default — planemo prefers a local postgres whenever
`psql` is on PATH. Everything else in this branch is a bug fix; that one token is the policy call. It
needs more than the token to be viable, though: `create_database_source` raises when it finds none of
psql/docker/singularity, whereas `_create_profile_local` falls back to sqlite, so `auto` currently means
two different things depending on which path resolves it.

Not built: the `SqliteDatabaseSource` the factory has had a commented-out placeholder for. It looks like
the natural completion, but the two `auto` policies above are genuinely different — profiles want the
postgres probe, a one-off run wants sqlite — so a single resolver would paper over a real distinction.
Left as a follow-up rather than smuggled into a CI fix.

## Still open for mvdbeek

- **Findings 5, 6, 9 and 10 turned out to be defects rather than questions of intent** — all four are
  fixed above. Finding 7 is the only open policy call; see "The one line".
- **The serve path still cannot see the profile's database location.** `_database_connection`
  (`planemo/galaxy/config.py:1273-1282`) builds a fresh source via `create_database_source(**kwds)` with no
  profile context, so a singularity profile serves against a new `mkdtemp` rather than the `<profile>/postgres`
  that `profile_create` populated — and the stored `database_connection` string, whose socket path points into
  the profile, gets overwritten by the context manager. Persisting the resolved location into
  `planemo_profile_options.json` would let it flow back through the existing `postgres_storage_location`
  kwds option, but whether the stored connection or a fresh source should win is a design call.
- **Whether `auto` should mean postgres for a one-off run.** mvdbeek's branch says yes; this one restores
  master's no. One token, `MANAGED_DATABASE_TYPES`.

## Follow-ups

- [x] Fix or revert the sqlite branch in `_create_profile_local` (finding 1)
- [x] Pass `profile_directory` at the call sites (finding 2)
- [x] Remove the now-unused `DATABASE_LOCATION_TEMPLATE` import (finding 3)
- [x] Delete the dead `database_connection + ...` statement (finding 4)
- [x] Add a sqlite profile test
- [x] Confirm docker container cleanup after dropping `stop_postgres_docker()` from tests (finding 5) — it did leak; cleanup restored
- [x] Confirm the `GALAXY_CONFIG_OVERRIDE_DATABASE_CONNECTION` drop is intended (finding 6) — it is not; `test_defaults` fails on it
- [x] Restore sqlite as the default in `_database_connection` (finding 7) — isolated to `MANAGED_DATABASE_TYPES`
- [x] Honour `kwds["database_connection"]` again (finding 8)
- [x] Call `start()` from the `database_*` commands, or restore it to construction (finding 9) — `started_database_source()`
- [x] Move the "skip database creation" decision out of `DockerPostgresDatabaseSource` (finding 10) — reverted outright
- [ ] Decide how the serve path resolves a profile's database location
- [x] Restore `create_database` to the ABC or drop it from the callers — back on the ABC
- [x] Decide whether `auto` should prefer postgres for a one-off run (the one line) — mvdbeek: no, the psql probe is a bug
- [ ] Build the `SqliteDatabaseSource` the factory placeholder promises
- [x] Push the rebase + fixes — went to jmchilton's fork, opened as #1679; #1557 closed
- [x] File the `wait_on` dedupe — **#1680**
- [x] Address mvdbeek's three inline comments on #1679 — `8774dc1c`, pushed
- [ ] Replace the `which("psql")` probe in `factory.py` / `profiles.py` (separate PR)

## Spun out

**#1680 — Deduplicate `planemo.io.wait_on` in favor of `galaxy.util.wait.wait_on`.**
`planemo/io.py:327` is a near-verbatim copy of Galaxy's, which additionally raises a typed
`TimeoutAssertionError`, takes an injectable `sleep_` for tests, and parameterises `delta`. Only two
callers (`config.py:929`, `activity.py:1027`), both passing `timeout` explicitly, and nothing catches
the timeout — so the swap is contained.

The blocker is the dependency floor, verified against published wheels: `galaxy.util.wait` moved from
`galaxy.tool_util.verify.wait` and first ships in **galaxy-util 26.0** (missing in 24.1.2 and 25.0.1),
while `requirements.txt:10` pins `galaxy-util[template]>=24.1,<26.2`. Doing the dedupe means bumping
that floor to `>=26.0`, which is a deliberate call rather than a mechanical one.

Decided *against* rewriting the polling loop in `planemo/database/postgres_singularity.py:60-71`.
Its `for`/`else` is correct — the `else` fires only on exhaustion — and switching to `wait_on` is a wash
on line count while losing the periodic "Waiting for the postgres database to initialize." message, which
is the only sign of life during a cold `docker://postgres` pull.

## mvdbeek's review on #1679 (2026-08-22)

Approved, with three inline comments. All three are addressed in `8774dc1c` on
`postgres_singularity_fix_rebased`.

1. **`config.py:173` — "1679 is this PR, i'm not seeing any discussion."** Correct: the
   `MANAGED_DATABASE_TYPES` comment pointed at the PR that carries it, so it referred a reader to
   nothing. The paragraph is gone; two factual lines remain. The same comment adds the substantive
   point below — *"presence of psql determining anything at all is a bug we should fix"* — which
   settles the one open policy call in this review's favour but is not itself fixed here (see
   "The psql probe").

2. **`config.py:1286` — the docstring repeats the module comment; promote the kwds.** Both done.
   `_database_connection` now reads
   `(database_location: str, database_connection: Optional[str] = None, database_type: Optional[str] = None, **kwds)`
   and the docstring is one line. mypy is clean on the file — the two names were only ever pulled
   out with `kwds.get`, and the sole caller (`config.py:479`) already passes them inside `**kwds`.
   `create_database_source` gets `database_type=` back explicitly since it is no longer in `kwds`.

3. **`tests/test_galaxy_config.py:111` — hard-coded `/tmp` path.** The three unit tests never
   touched the filesystem — the location is only interpolated into `DATABASE_LOCATION_TEMPLATE`
   and compared as a string, so it would not in fact have failed on macOS. Fixed anyway, via the
   existing `TempDirectoryContext` from `tests/test_utils.py` rather than a bare module-level
   `mkdtemp()`, which would leak a directory per test session. All three pass.
   `test_database_connection_override_path` fails locally for an unrelated reason (it installs a
   real Galaxy, which this machine has no checkout for).

### The psql probe

mvdbeek's "presence of psql determining anything at all is a bug" closes finding 7: `auto` should
not have meant postgres, and `MANAGED_DATABASE_TYPES` stays as it is. But the probe he objects to
lives in two other places this PR does not touch:

- `planemo/database/factory.py:16-24` — `auto` → `postgres` if `which("psql")`, else docker, else
  singularity, else **raise**.
- `planemo/galaxy/profiles.py:89-97` — the same ladder, except the final `else` is **sqlite**, with
  a `RuntimeError` fallback to sqlite if `create_database` then fails.

`--database_type postgres` is documented as "an existing postgres server you user can access without
a password via the psql command" (`options.py:1850`). `which("psql")` proves the *client* is
installed and nothing about a reachable server, so `auto` picks postgres on any machine with the
postgres client package. The profile path degrades to sqlite when the create fails; the factory path
just fails.

Two shapes for a fix: probe for reachability (`psql --list` succeeds) instead of presence, or drop
the ladder and make `auto` mean sqlite, requiring an explicit `--database_type` for the
`database_*` commands. Either is a behaviour change to `profile_create` defaults, so it wants its
own PR rather than a rider on an approved one.
