---
upstream_base_branch: master
parent_branch: coexecutor_image_modern_base
related_records: pulsar/branches/coexecutor_image_modern_base
---
# Publish running from pulsar-submit --no-wait

- [Open PR](https://github.com/galaxyproject/pulsar/compare/coexecutor_image_modern_base...jmchilton:pulsar:coexecution_publish_running?expand=1)
- [View on GitHub](https://github.com/jmchilton/pulsar/tree/coexecution_publish_running)

## Status

Implemented at `07051ab` during stage 2 of the [GA4GH WES and TES project](../../../../../projects/ga4gh_wes_tes/index.md); verified end to end in the demo.

No PR.

Fork CI for `07051ab`: pulsar and Deploy green; Framework tests still running at hand-off.

## Notes

- Stacked on `coexecutor_image_modern_base` only so the demo builds one image; `07051ab` touches only `pulsar/scripts/submit_util.py` and a new test, so it can be cherry-picked onto master on its own.
- Fixes the symptom of tesp-api issue #46 ("Galaxy never shows RUNNING") for any TES server.
- Demo image: `wes-tes/pulsar-pod-staging:0.16.1.dev0-07051ab`. Demo note: `~/projects/repositories/galaxy-wes-tes/docs/notes/pulsar-running-status.md`.

## Review materials

- [Implementation](implementation_debrief.md)
