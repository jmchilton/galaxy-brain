# Normal review — Tool Shed nightly (`7d8dad4d980`)

No blockers. Acted on both should-fix findings and two nits in `f18cff94279`:
- **Release branches:** back to `3.10` + `3.14` in both `unit.yaml` and `toolshed.yaml`. The full matrix would have made each release PR run 10 Tool Shed jobs (about 270 runner-minutes vs 108).
- **Path filters:** `_report_scheduled_result.yaml` added to both callers' `paths`. Without it, a PR that changes only the reporter runs no workflow, merges green, and then every Unit and Toolshed run fails at startup.
- **Labels:** the Tool Shed issue now also gets `area/testing`.
- **Docs:** the `debugging_tests.md` paragraph is rewritten to name both reusable workflows and their callers.

Not acted on:
- **Sharing the matrix expression across files.** It would need a matrix job on every PR's critical path; `vars.*` aren't versioned per branch. Keep the duplication (2 files × 7 lines) and revisit if a third suite adopts the split.
- **A one-line nightly note in `lib/tool_shed/test/README.md`.** Optional; skipped, since there is no Tool Shed CI documentation to extend.

## Details

- `toolshed.yaml` matches `unit.yaml` line for line; only suite data differs.
- Python setup, `common_startup.sh --dev-wheels`, node/pnpm/Playwright and the per-job Postgres all already work on 3.10 and 3.14.
- Artifact names include both matrix axes, so they're unique across all 10 nightly jobs.
- The 01:00 cron avoids the 00:00 unit nightly and the Tuesday 00:00 cluster.
- Dropping 3.10 doesn't speed up Tool Shed PRs (3.10 and 3.14 both take about 27 min). It saves about 54 runner-minutes per PR run.
- The issue title is unique, so it can't collide with the unit or Selenium issue.
