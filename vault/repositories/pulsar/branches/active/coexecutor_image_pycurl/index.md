---
upstream_base_branch: master
related_records:
  - pulsar/branches/coexecutor_image_modern_base
  - pulsar/branches/coexecution_client_fixes
  - pulsar/branches/coexecution_stage_failures
  - pulsar/branches/coexecution_stage_out_failures
---
# Install pycurl in the coexecutor staging image again

- [View on GitHub](https://github.com/jmchilton/pulsar/tree/coexecutor_image_pycurl)

## Status

Folded into [`coexecutor_image_modern_base`](../coexecutor_image_modern_base/index.md) as `c4ae861` in the 2026-11-14 restack; this branch is superseded. Suggested action: abandon it (the fork branch still points at the pre-restack `4ccfb64`).

No PR.

## Notes

- Fixes P1 1 of the [`coexecutor_image_modern_base` review](../coexecutor_image_modern_base/review.md). It logically belongs in [`coexecutor_image_modern_base`](../coexecutor_image_modern_base/index.md) (`a87897c`) and should be folded into it when the stack is next rebased; it sits at the top only because the pushed children couldn't be rebased.
- Doesn't cherry-pick onto master alone: it edits the Dockerfile that `a87897c` rewrote.
- Image: `wes-tes/pulsar-pod-staging:0.16.1.dev0-4ccfb64`, id `sha256:dd2377f2f74277a2d974517e4df67eeec7390372b81eb947ba174fa92b37e7a3`, built 2026-11-14 16:58 UTC, local only. Python 3.12.16, pulsar-app 0.16.1.dev0, pycurl 7.49.0 (libcurl 8.23.0), kombu 5.7.0, galaxy-tool-util 26.1.2, pydantic-tes 0.4.0. The demo's `versions.env` still names `0.16.1.dev0-07051ab`.

## Review materials

- [Implementation](implementation_debrief.md)
- [Transport and memory check](transport_check_output.md), from [transport_check.sh](transport_check.sh)
