---
type: project
title: "GA4GH WES and TES with Galaxy and Pulsar"
tags:
  - project
  - galaxy/api
  - galaxy/workflows
status: draft
created: 2026-11-14
revised: 2026-11-15
revision: 3
ai_generated: true
summary: "Running real IWC workflows through Galaxy's GA4GH WES API with Pulsar and TES backends, and what these APIs cost compared to Galaxy's own APIs."
related_projects:
  - "[[wes_tesp_api]]"
related_notes:
  - "[[PR 21335 - GA4GH WES API]]"
---

# GA4GH WES and TES with Galaxy and Pulsar

An agent-run investigation of whether Galaxy's WES API, Pulsar's TES client, and the community tesp-api (TES implemented on Pulsar) can run a real IWC workflow end to end, what breaks, and whether the standard APIs are worth it compared to Galaxy's own.

## Stages

1. Research: Galaxy WES, Pulsar's TES client, tesp-api. [`RESEARCH.md`](RESEARCH.md)
2. Working demo: Galaxy WES → Galaxy → Pulsar TES runner → a TES server, with a real IWC workflow. Demo repository at `~/projects/repositories/galaxy-wes-tes`.
3. Review and refine the demo, add a second TES backend, list bugs and features. [`PULSAR_TES_IMPROVEMENTS.md`](PULSAR_TES_IMPROVEMENTS.md)
4. Plan Galaxy WES → tesp-api. [`TESP_API_PLAN.md`](TESP_API_PLAN.md)
5. Implement and debug that plan.
6. Document and harden the tesp-api line in its own project, with bugs and enhancements: [[wes_tesp_api]].
7. Synthesis: what's possible, and the downsides compared to Galaxy APIs, with experiments on third-party WES clients, non-Galaxy TES consumers and the native API. [`WES_TES_VS_GALAXY_APIS.md`](WES_TES_VS_GALAXY_APIS.md)

Each stage's outcome is recorded in [`STAGE_LOG.md`](STAGE_LOG.md).

## Outcome

- **WES:** keep Galaxy's endpoint and make it honest with small fixes, but don't build on it. On the same Galaxy and runner, the native API returned outputs in 44–57 s with 9 calls; WES took 290–322 s and 21 calls, including 5 native ones, and reported failed runs as `COMPLETE`. None of four third-party WES clients submits to Galaxy unmodified, though all four finish a run with small workarounds.
- **TES:** no gain for Galaxy's own jobs, which Pulsar runs with fewer parts, and tesp-api adds nothing for Galaxy. TES matters as access to compute Galaxy doesn't run. Funnel served five of six non-Galaxy consumers tested; tesp-api served two. The TES-native design B prototype is the shape to build if a real TES deployment asks.
- **Land regardless:** the Pulsar staging-image stack plus a published image (Galaxy's default image silently drops discovered outputs), the Pulsar concurrency and cleanup fixes, Pulsar PR #554 (stops the container on cancel), and the Galaxy TES polling and WES fix branches. Nothing from this project has a pull request yet; the branch and decision index is at the end of the synthesis.
