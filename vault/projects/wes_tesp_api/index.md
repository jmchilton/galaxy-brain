---
type: project
title: "Galaxy WES on tesp-api"
tags:
  - project
  - galaxy/api
  - galaxy/workflows
status: draft
created: 2026-11-15
revised: 2026-11-15
revision: 1
ai_generated: true
summary: "How to configure, run and operate Galaxy WES jobs on tesp-api through the Pulsar TES runner, what was hardened, and what is still open."
related_projects:
  - "[[ga4gh_wes_tes]]"
---

# Galaxy WES on tesp-api

This project documents one line of the [[ga4gh_wes_tes]] investigation: a GA4GH WES client submits a Galaxy workflow to Galaxy's WES API, Galaxy runs each tool job through its `PulsarTesJobRunner`, and the TES server is tesp-api, CESNET's TES implementation on top of a Pulsar REST server. The umbrella project calls this design A+C: Galaxy's stock runner and staging image (A), plus fixes to tesp-api, Pulsar and Galaxy (C). Design B, a TES-native Galaxy runner, is a prototype covered here too.

The working demo is the local repository `~/projects/repositories/galaxy-wes-tes` (`make up TES=tesp && make run`). Its `docs/tesp-api.md` is the detailed page for this backend.

## Documents

- [`ARCHITECTURE_AND_CONFIGURATION.md`](ARCHITECTURE_AND_CONFIGURATION.md): the chain, one tool job step by step, and the exact configuration of Galaxy, tesp-api, the outer Pulsar, the staging image, networking and auth.
- [`OPERATIONS.md`](OPERATIONS.md): deploying, monitoring, cancel and cleanup, restarts, logs and redaction, limits, troubleshooting.
- [`DESIGN_B.md`](DESIGN_B.md): the TES-native staging prototype, its evidence, and what productising it would take.
- [`HARDENING.md`](HARDENING.md): what stage 6 changed, with evidence.
- [`BUGS_AND_ENHANCEMENTS.md`](BUGS_AND_ENHANCEMENTS.md): a prioritised list across Galaxy, Pulsar and tesp-api, and the decisions that are John's.

## Status

Design A+C runs both IWC test workflows through WES on tesp-api with outputs byte-identical to Funnel's; cancel, cleanup, restart recovery and log redaction work on the patched tesp-api. Nothing is upstream: the tesp-api patches are a local branch exported as patch files, and the Galaxy and Pulsar fixes are branches on the `jmchilton` forks without pull requests. `make acceptance TES=tesp` in the demo passes on the final pins (tesp-api with 17 patches, Galaxy `wes_tes_demo_fixes_v26.1.2` `b317bc12545`). The design B prototype passes the same scenarios on TESK and Funnel. Stage outcomes are in the umbrella project's `STAGE_LOG.md` (stages 4 to 6).
