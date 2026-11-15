Fix two coexecution client bugs: the default staging image tag doesn't exist, and a polling TES client reports queued tasks as failed.

> **Stacked on 🔀 #580** (on #579, #578 and #577). This PR's own commits are the last four: `310d729`, `6792aa0`, `fb304ef` and `77651c5`. They touch only `pulsar/client/` and client tests, and they apply to `master` cleanly on their own. Review them in any order.

| | `master` | this branch |
| --- | --- | --- |
| Default `PULSAR_CONTAINER_IMAGE` | `galaxy/pulsar-pod-staging:0.15.0.0`, never pushed to Docker Hub | `0.15.0.2`, the newest published tag |
| TES task `QUEUED` seen by `TesPollingCoexecutionJobClient` | `{"status": "failed", "complete": "true"}` | `{"status": "queued", "complete": "false"}` |
| `TesPollingCoexecutionJobClient` / `TesMessageCoexecutionJobClient` docstrings | swapped ("polling … depends on amqp") | correct |

<details><summary>What changed</summary>

- **Default image (`310d729`, `fb304ef`).** A coexecution destination that doesn't set `pulsar_container_image` now gets a tag that can be pulled. `0.15.0.2` is still old: it predates `dataset_collector_descriptions`, so it isn't a fix for newer Galaxy releases (see `docs/compatibility.rst`). It's the newest published tag, and a newer one needs an image release, which #577 makes possible. The test builds a client without `pulsar_container_image` and checks the image it uses against `KNOWN_PULSAR_CONTAINER_VERSIONS`.
- **TES `QUEUED` (`6792aa0`, `77651c5`).** `tes_state_to_pulsar_status` maps `QUEUED` to `queued`. `tes.py` had a second map, `tes_state_is_complete`, which had to agree with the first and also lacked `QUEUED`. It is removed: `raw_check_complete` now applies `manager_status.is_job_done` to the mapped status, as the Kubernetes polling client does. The result is unchanged for every other TES state. The test drives `raw_check_complete` with a stub TES client returning a `QUEUED` task and fails on `master` (`failed` / `true`).

</details>

## Risks

Risks are minimal: a default tag and a state mapping, both easy to revert (a two-way door).

<details><summary>Risk Details</summary>

- Deployments that relied on the default image now pull `0.15.0.2` instead of failing to pull `0.15.0.0`.
- `tes_state_is_complete` is removed from `pulsar.client.tes`. Nothing in Pulsar or Galaxy imports it.
- Stock Galaxy runs TES over AMQP (`TesMessageCoexecutionJobClient`), so the polling change affects only callers that use the polling client.

</details>

## Context

Part of a set of fixes found while running Galaxy jobs on GA4GH TES servers (Funnel, TESK) through Pulsar coexecution. Sibling problems not fixed here: the GCP Batch polling maps send `SCHEDULED` to `complete` and have no `SUCCEEDED`, and the TES polling client has no `full_status`.

## Agentic Checks

### ✅ Second Frontier Model Review

<details><summary>One Codex finding refuted. Triage replaced a trivial test and removed a duplicated TES state map.</summary>

- Codex: when a destination omits `pulsar_container_image`, `LocalSetupHandler` reports the client's version, not the default image's. Refuted as a reachable failure: Galaxy always sets `pulsar_container_image` for coexecution destinations, and the old default wasn't a known tag either.
- Triage: the image test compared two constants. It now checks the image a real client uses.
- Triage: `tes_state_is_complete` duplicated `tes_state_to_pulsar_status`. Completion is now derived from the mapped status, and the `QUEUED` test runs through `raw_check_complete`.

[Full report](https://galaxy-brain.jmchilton.net/repositories/pulsar/branches/coexecution_client_fixes/codex_review/). Run via gpt-6.1-sol at high effort.

</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01S9mD3nK1ghSGVVYtkV411H
