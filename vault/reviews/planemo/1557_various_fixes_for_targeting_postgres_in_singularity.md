# planemo #1557 — Various fixes for targeting postgres in singularity

`galaxyproject/planemo#1557`, mvdbeek, +128/-138 across 11 files, branch `postgres_singularity_fix` → `master`.
Rebased 2026-08-20 from merge-base `28411491` (2025-10-16) onto current master (281 commits ahead),
then fixed findings 1-4 in two commits on top. **Not pushed** — the branch lives on mvdbeek's fork.

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

## Still open for mvdbeek

- **Finding 5** (docker container cleanup after dropping `stop_postgres_docker()` from the tests) and
  **finding 6** (`GALAXY_CONFIG_OVERRIDE_DATABASE_CONNECTION` no longer exported) are unresolved — both
  are questions about intent, not defects to patch.
- **The serve path still cannot see the profile's database location.** `_database_connection`
  (`planemo/galaxy/config.py:1273-1282`) builds a fresh source via `create_database_source(**kwds)` with no
  profile context, so a singularity profile serves against a new `mkdtemp` rather than the `<profile>/postgres`
  that `profile_create` populated — and the stored `database_connection` string, whose socket path points into
  the profile, gets overwritten by the context manager. Persisting the resolved location into
  `planemo_profile_options.json` would let it flow back through the existing `postgres_storage_location`
  kwds option, but whether the stored connection or a fresh source should win is a design call.
- **`create_database` was dropped from the `DatabaseSource` ABC** (`planemo/database/interface.py`) while
  `_create_profile_local` and `cmd_database_create.py` still call it. The method left the contract but not
  the call sites; it should either go back on the interface or off the callers.

## Follow-ups

- [x] Fix or revert the sqlite branch in `_create_profile_local` (finding 1)
- [x] Pass `profile_directory` at the call sites (finding 2)
- [x] Remove the now-unused `DATABASE_LOCATION_TEMPLATE` import (finding 3)
- [x] Delete the dead `database_connection + ...` statement (finding 4)
- [x] Add a sqlite profile test
- [ ] Confirm docker container cleanup after dropping `stop_postgres_docker()` from tests (finding 5)
- [ ] Confirm the `GALAXY_CONFIG_OVERRIDE_DATABASE_CONNECTION` drop is intended (finding 6)
- [ ] Decide how the serve path resolves a profile's database location
- [ ] Restore `create_database` to the ABC or drop it from the callers
- [ ] Decide whether to push the rebase + fixes to mvdbeek's fork
