# Branch `pr_24738_round_0_rev_1`

Branched from `c55d04482f9`; pushed to [jmchilton/galaxy](https://github.com/jmchilton/galaxy/tree/pr_24738_round_0_rev_1), not into the PR. Trimmed from `pr_24738_round_0_rev_0` to the findings John kept.

The branch moves the quota-change announcers off the RBAC agent into `galaxy.quota`, with `DatabaseQuotaAgent` queueing inside its own mutations. It skips event-only work when live updates are off, reuses the PostgreSQL lock's owner ids on relabel, makes the unit tests' listeners removable, and adds a Playwright/Selenium test that the masthead meter updates live.

Commits:

- `f13b1b3acfa` Move the quota change announcers from the RBAC agent to galaxy.quota: session-taking functions in `galaxy.quota`, with queueing inside `set_default_quota` and `set_entity_quota_associations`. (P2 4)
- `8f56f540c7d` Skip quota event queries when live updates are off: installing the sender enables queueing through the session factory's `info`, which drops the `None` sender mode. (P3 1)
- `319a0e908da` Reuse the relabel lock's user ids for the quota event on PostgreSQL: only SQLite runs the extra owner query. (P3 2)
- `ca74e072a2e` Remove the quota update listeners the unit tests install: `send_user_quota_updates_on_commit` returns a remover, used by `test_quota.py`. (P3 3)
- `b769ef2143b` E2E test that the masthead quota meter updates live: a Playwright/Selenium integration test that assigns a quota and waits for the meter. (P2 3)

## Tests run

All commits cherry-picked cleanly from rev_0, where their tests passed (see [round_0_rev_0_branch_details.md](round_0_rev_0_branch_details.md)). On this branch:

- `test/unit/data/test_quota.py` and `test/unit/data/model/test_user_quota_updates.py`: 45 passed, 22 PostgreSQL-only skipped.
- `test/integration_selenium/test_quota_meter_sse.py`: collects; not re-run.
