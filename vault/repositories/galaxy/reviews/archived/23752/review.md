# galaxy#23752 - [26.1] Keep each user's newest session in galaxy-delete-sessions

- PR: https://github.com/galaxyproject/galaxy/pull/23752
- Author: mvdbeek
- Base: `release_26.1`
- Head reviewed: `3f23f32e43a09d01adaf69dbe833236c5c0e40cb`
- Date: 2026-09-27
- Size: 4 files, +109/-9, 3 commits

## Summary

`galaxy-delete-sessions` used to delete every `galaxy_session` older than the cutoff. That included the row `User.current_galaxy_session` returns, which holds the login cookie, the history reopened on the next login (`_associate_user_history` in `lib/galaxy/webapps/base/webapp.py:817`) and the last-login time in the admin grid (`controllers/admin.py:65`). The PR does three things:

1. The DELETE now leaves out each user's newest session (`row_number() OVER (PARTITION BY user_id ORDER BY update_time DESC NULLS LAST, id DESC) = 1`, with `user_id IS NOT NULL`).
2. The default cutoff changes from `today.replace(month=today.month - 1)` to `today - timedelta(days=30)`. The old version raised `ValueError` in January and on dates like Mar 29–31 and May 31.
3. The ORM `session_partition` ranking behind `User.current_galaxy_session` gets the same `NULLS LAST` and `id DESC` tie-break, so the script and the ORM agree on which session is "current".

This is an alternative to the `last_login` column in #23748 (targets dev, still open). It is small, correct and well scoped. CI is fully green.

## Findings

### Blocker

None.

### Major

None.

### Minor

**1. Check how Postgres plans `NOT IN` on a large table.** SQLite handles it well: `EXPLAIN QUERY PLAN` shows the ranked list built once as a `LIST SUBQUERY` with an automatic index. Postgres never turns `NOT IN (subquery)` into an anti-join. It can only use a *hashed* SubPlan, and only when the planner thinks the keep-set (one id per user) fits in `work_mem × hash_mem_multiplier` (8MB by default on PG15+). Otherwise it falls back to a plain SubPlan. That scans the materialized list for every candidate row, and every row that ends up deleted scans the whole list, so the cost is O(sessions × users). The planner's row estimate for `rn = 1` on a window output is a default-selectivity guess, so which plan it picks on a usegalaxy.org-sized table is hard to predict. This script exists for exactly those instances. The ask is an `EXPLAIN` against a large DB. If it shows a plain `SubPlan`, this form means the same thing, uses the existing `ix_galaxy_session_user_id` and needs no window:

```sql
DELETE FROM galaxy_session
WHERE update_time < :update_time
AND (
    user_id IS NULL
    OR EXISTS (
        SELECT 1 FROM galaxy_session newer
        WHERE newer.user_id = galaxy_session.user_id
        AND (
            newer.update_time > galaxy_session.update_time
            OR (newer.update_time = galaxy_session.update_time AND newer.id > galaxy_session.id)
        )
    )
)
```

Why it is equivalent: a candidate row always has a non-NULL `update_time`, because it passed `< :update_time`. A row is ranked first unless some other session of the same user sorts ahead of it under `update_time DESC NULLS LAST, id DESC`. A NULL-time session never sorts ahead, and the comparisons above are false for NULL, so NULL-time sessions are skipped the same way. I checked this locally on SQLite: I swapped this statement in for `DELETE_STMT` using a scratch pytest plugin (no PR files changed), and the PR's test still gave 3 passed. This is not a blocker: the old one-statement DELETE had no batching either (compare `HistoryTablePruner`), and it's an admin-run script.

**2. The Postgres-only NULL fix isn't tested in the unit run.** The PR says so, and says the author checked it by hand on PG 15. SQLite already sorts NULL last in DESC order, so the `null_time_user` case passes with or without `nulls_last()`. That leaves the last commit with no regression guard in CI. `test/unit/data/model/db/conftest.py` lets a module override `db_url`, and `GALAXY_TEST_CONNECT_POSTGRES_URI` already exists in `test/unit/data/model/conftest.py`. A module-level `db_url` fixture that uses that URI when it is set (skipping otherwise) would keep the case alive for anyone running with PG. This is optional, and only worth doing if some CI job sets that variable.

### Nit

- The ranking is written twice: once as raw SQL in the script and once as the ORM `session_partition`, with a comment saying they must match. The test guards against drift, because it asserts `current_galaxy_session` is unchanged for all four users, including the tie and NULL cases. The sibling scripts all use `text()` SQL, so keeping raw SQL fits local convention. No change needed.
- Rows with a NULL `update_time` are never deleted (`NULL < :t` is unknown). This was already true, and it's fine. It is mentioned only because the new doc sentence lists which rows are kept.
- The doc line being touched already has the typos "annonymous" and "determinded". They're cheap to fix in the same edit.
- `NULLS LAST` needs SQLite 3.30 or later (2019). That's fine for any supported deploy.

### Checked, no issue

- **Anonymous sessions**: `user_id IS NOT NULL` in the ranking means anonymous sessions are never protected, so old ones are deleted and recent ones kept (tested).
- **`NOT IN` NULL trap**: the subquery projects `id`, which is a primary key and never NULL, so `NOT IN` can't silently match nothing.
- **Kept that shouldn't be**: a user whose newest session is recent keeps only that one. All their old sessions are removed (`active_stale`, tested).
- **Deleted that shouldn't be**: under ties, the higher `id` is kept by both rankings (tested). A NULL-time session never outranks a dated one on either backend after the model change.
- **FK fallout**: `galaxy_session_to_history` cascades, and `job`, `history_audit` etc. use `SET NULL`. This is unchanged by the PR.
- **Why `lib/galaxy/model/__init__.py` changes**: without it, on Postgres `current_galaxy_session` returns a NULL-time session ahead of a dated one, and ties are broken arbitrarily. The script would then keep a different row from the one login and the admin grid use. The change only affects ordering when there are NULLs or ties. No index is lost, because `update_time` isn't indexed on `galaxy_session` either way.
- **January fix**: `timedelta` subtraction never raises, so all month, day and leap-year edges are covered. The switch from "one calendar month" to "30 days" matches the "at least a month old" wording in the doc. Both the January case and the Mar 31 case are tested.
- **Imports**: at module top in both the script and the test.

## Tests

- `test_run_keeps_each_users_current_session` covers the inactive user, the active user, a tie, a NULL `update_time` and anonymous stale/recent sessions. It also asserts `current_galaxy_session` is unchanged for every user, which ties the SQL and ORM rankings together. It is a real DB test rather than a trivial unit test.
- `test_default_max_update_time` is parametrized over Jan 15 and Mar 31. Both cases raised under the old code.
- The NULL-ordering case is only meaningful on Postgres (see minor 2).
- Local run on SQLite 3.50.4 (using the pr/18467 venv, Python 3.14): `PYTHONPATH=lib ~/projects/worktrees/galaxy/pr/18467/.venv/bin/pytest test/unit/data/model/db/test_delete_galaxy_sessions.py` gave **3 passed** (warnings were only the sqlite datetime-adapter deprecation).
- CI: all checks green, including the database-index checks on PG 9.6–18.

## Backport fit

This is a good fit for `release_26.1`. It fixes a user-visible, data-losing behavior (running the documented cleanup logged users out and dropped their open history) and a crash that occurs every January. The diff is limited to one admin script, one ORM ordering clause and docs. The ORM change affects login and the admin grid only when there are NULLs or ties.

## Suggested verdict

Approve. Minor 1 is worth a one-line reply (was `EXPLAIN` checked on a large DB?), but it shouldn't block the merge.

## Draft GitHub review

```markdown
*Posted by Claude (AI assistant) on behalf of @jmchilton — not authored by them personally.*

Looks good. The SQL and ORM rankings now agree, including on ties and NULL `update_time`. The test asserting that `current_galaxy_session` is unchanged across the run is a nice way to tie the two together. The 30-day cutoff fixes the January `ValueError` along with the other month-end dates (Mar 29–31, May 31, …). This seems like the right scope for 26.1.

Two small things, neither blocking:

1. **Postgres plan for `NOT IN` on big tables.** PG can't turn `NOT IN (subquery)` into an anti-join. It uses a hashed SubPlan only when the planner thinks the keep-set (one id per user) fits in `work_mem`. Otherwise it falls back to a per-row scan of the list, which is O(sessions × users). Its estimate for `rn = 1` on a window output is a guess, so it would be worth running `EXPLAIN` against a large instance. If it shows a plain `SubPlan`, this is equivalent (candidate rows always have a non-NULL `update_time`, and NULL-time rows never sort ahead), uses the `user_id` index and has no window:

   ```sql
   DELETE FROM galaxy_session
   WHERE update_time < :update_time
   AND (
       user_id IS NULL
       OR EXISTS (
           SELECT 1 FROM galaxy_session newer
           WHERE newer.user_id = galaxy_session.user_id
           AND (
               newer.update_time > galaxy_session.update_time
               OR (newer.update_time = galaxy_session.update_time AND newer.id > galaxy_session.id)
           )
       )
   )
   ```

2. **NULL-ordering case on SQLite.** As you noted, the NULL case passes on SQLite with or without `nulls_last()`, so CI doesn't guard the last commit. If any job sets `GALAXY_TEST_CONNECT_POSTGRES_URI`, a module-level `db_url` override that uses it when present would keep the case covered. Optional.

Tiny nit: the doc line you touched has the existing typos "annonymous" and "determinded".
```
