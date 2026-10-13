# tool_open_tool_shed_ids

Status: `branches_implemented`. Base: `dev`. No PR.

Lets tool panel search, the `tool_panel` selectors, and the `tools_list` card selectors find Tool Shed tools by their full GUID id. Covered by `integration_selenium` E2E tests.

Open decision for John: keep the E2E-only test change, or restore the dropped selector unit test (see implementation debrief).

[Implementation](implementation_debrief.md) · [Initial implementation](initial_implementation_debrief.md) · [Review](subagents/normal_review.md) · [Fold-in review](subagents/normal_review_tools_list.md) · [Test challenges](test_challenges_debrief.md) · [Codex](codex_review.md) · [Scope](scope_evaluation.md) · [Screenshots](screenshot_debrief.md) · [Earlier drafts](earlier_drafts/1/implementation_debrief.md)

Pulled out of [`galaxy_ui_driver`](../galaxy_ui_driver/index.md) (commit 4a, "Let tool_open find Tool Shed tools by id") per [the upstreaming plan](../../../../../projects/playwright/GALAXY_UI_DRIVER_UPSTREAM.md). Drop the commit from `galaxy_ui_driver` once this merges.


## TICK — 2026-10-11

Live fork tip is now `5daa04de0879e17b6038d009cadbd4553730a5a0`; current-SHA workflows are queued/pending without failures. Retain needs CI and the existing test-scope decision.

## TICK — 2026-10-12

Current fork SHA `5daa04de0879e17b6038d009cadbd4553730a5a0` has settled CI. [Integration Selenium](https://github.com/jmchilton/galaxy/actions/runs/38167310436), [Playwright](https://github.com/jmchilton/galaxy/actions/runs/38167310478), harness, API, Python lint and client checks pass. Its only red workflow is [package tests](https://github.com/jmchilton/galaxy/actions/runs/38167310135), which fails collecting the Pulsar runner because `pulsar.client.build_client_manager` was removed; this is unrelated to tool selector lookup. Promoted to implemented under the standing greenish-CI rule. John’s choice between E2E-only coverage and restoring a selector unit test remains for polish; no PR or polish started.

Requested failed-job reruns for the recorded unrelated failures: [run 38167310135](https://github.com/jmchilton/galaxy/actions/runs/38167310135). All requests were accepted; this does not claim a passing rerun or recover an evicted client cache/artifact.

## TICK — 2026-10-13 evening

Requested failed-job reruns for recorded unrelated failures: [run 38167310135](https://github.com/jmchilton/galaxy/actions/runs/38167310135). All requests accepted. These reruns are pending coverage, not passing results; branch classification is unchanged.
