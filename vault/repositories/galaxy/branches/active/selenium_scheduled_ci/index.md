# selenium_scheduled_ci

Status: `ready`. Base: `dev`. [PR #24014](https://github.com/galaxyproject/galaxy/pull/24014) (open).

Runs Selenium CI weekly or on demand and tracks dev failures in a GitHub issue.

[Implementation](implementation_debrief.md) · [Polish](polish_debrief.md) · [PR description](pr_description.md) · [Titles](pr_titles.md) · [Tracking history](tracking_history.md)

John edited the description and chose the title "Run Selenium tests weekly and track failures in an issue". At his request, the PR was opened out of draft on 2026-10-09 at `85b37d45dbe`, while fork CI on that tip was still queued; the previous tip `e43796a64cf` was green.

Shipped as weekly (Tuesday), with no one assigned and only `dev` covered.

2026-10-09: the zizmor code-scanning bot flagged `selenium.yaml:20` (`self-repository`). `353228bbfee` switches `uses: ./.github/workflows/build_client.yaml` to `$/...`, and zizmor 1.30.1 now reports no findings for the file. The same change for the other workflows is [zizmor_self_repository](../zizmor_self_repository/index.md).

After merge, dispatch it once on `dev` as a smoke test.
