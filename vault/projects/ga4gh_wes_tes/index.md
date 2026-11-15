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
revision: 2
ai_generated: true
summary: "Running real IWC workflows through Galaxy's GA4GH WES API with Pulsar and TES backends, and what these APIs cost compared to Galaxy's own APIs."
related_projects:
  - "[[wes_tesp_api]]"
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
7. Synthesis: what's possible, and the downsides compared to Galaxy APIs. [`WES_TES_VS_GALAXY_APIS.md`](WES_TES_VS_GALAXY_APIS.md)

Each stage's outcome is recorded in [`STAGE_LOG.md`](STAGE_LOG.md).
