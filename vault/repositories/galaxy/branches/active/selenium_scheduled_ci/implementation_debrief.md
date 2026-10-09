# selenium_scheduled_ci: implementation debrief

Branch `selenium_scheduled_ci` (`87352225296`), stacked on `remove_selenium_ci` (#23976, `da132e0717f`). Pushed to `jmchilton`.

## Why

In #23976 review, mvdbeek suggested running the Selenium backend on a schedule and opening an issue when it fails. John agreed to bring back a cron job, as a separate PR.

## What

- `.github/workflows/selenium.yaml` is back. Triggers are `schedule` (Tue 00:00 UTC, the original cron) and `workflow_dispatch` only. The test job (3 shards plus `build_client.yaml`) is unchanged from the deleted file.
- New `report` job. Gate: `!cancelled()`, `repository_owner == galaxyproject`, `ref == refs/heads/dev`. It has job-scoped `issues: write`, and uses `actions/github-script@v9` with the same pattern as `maintenance_bot.yaml`/`labels-verifier.yaml`. On failure it opens "Scheduled Selenium tests are failing" (labels `area/testing/selenium`, `kind/bug`), or comments on the open one. A green run comments and closes it. The open issue is found by label, `creator=github-actions[bot]` and exact title.
- `writing_tests.md` CI section now describes the weekly run and the issue behaviour.

## Choices

- **Dropped the TEMP SSE/notification flags** marked "revert before merge" (#23983). The weekly run therefore uses shipping defaults, unlike Playwright and integration_selenium. Note this in the PR body.
- **Extended metadata and outputs-to-working-directory overrides moved to top-level env.** Previously they were set only on schedule, but every run is now scheduled-style.
- **Removed the `concurrency` block.** With `cancel-in-progress`, a manual dispatch would silently cancel the cron run, so that week's result would be lost. dependencies.yaml and mypy_legacy_list.yaml also have none.
- **Manual runs on dev report too.** Someone who fixes a breakage and re-runs by hand can close the issue without waiting for Tuesday. Dispatches on feature branches don't touch the issue.
- **Pre-commit prettier hook skipped** (`SKIP=prettier`). It rewrites the whole `writing_tests.md`, and Galaxy doesn't keep docs prettier-formatted.

## Verification

- actionlint is clean.
- zizmor: one low `self-repository` finding (`./.github/workflows/build_client.yaml`). playwright.yaml has the same one, so I left it for consistency.
- The report script was extracted from the YAML and run under node against a mocked `github`/`context` in five cases: fail with none open → create; fail with one open → comment; build fail with test skipped → create; pass with one open → comment + close; pass with none open → no-op.
- `issues?creator=github-actions%5Bbot%5D` filter confirmed against the real galaxyproject/galaxy API.
- Not exercised end to end. Neither `schedule` nor `workflow_dispatch` can run until the file is on the default branch, so the first real run happens after merge (dispatch from Actions on dev to smoke-test).

## Review suggestions not acted on

- **Extract the report logic into a reusable `workflow_call` workflow: not done.** It has one consumer, and every other scheduled test workflow also runs on PRs/push, so their failures are already visible. Extract it if a second consumer appears. Mention in the PR body that this was considered.
- **zizmor `self-repository` syntax: not changed**, to match playwright.yaml.

## Open questions for John

- Weekly (Tue) OK, or nightly?
- Assign anyone or ping on new issues? Currently no one is assigned.
- Open the PR against dev after #23976 merges, or now as a stacked PR?
