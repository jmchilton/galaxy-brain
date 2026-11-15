---
upstream_base_branch: master
parent_branch: coexecution_stage_out_failures
related_records:
  - pulsar/branches/coexecution_stage_out_failures
---
# Compress coexecution launch messages too long for one argument; send pulsar-finish only the job id

- [Open PR](https://github.com/galaxyproject/pulsar/compare/coexecution_stage_out_failures...jmchilton:pulsar:coexecution_compact_launch?expand=1)
- [View on GitHub](https://github.com/jmchilton/pulsar/tree/coexecution_compact_launch)

## Status

Implemented at `9036ff3` (two commits on `coexecution_stage_out_failures` `20b6460`) during stage 6 of the [GA4GH WES and TES project](../../../../../projects/ga4gh_wes_tes/index.md) (item H5), for the [WES on tesp-api project](../../../../../projects/wes_tesp_api/index.md); proven at the TES level on tesp-api `4bc9b5d` and Funnel 0.12.3 with the real client and staging images, and through Galaxy v26.1.2 (polling worktree `8b3166c80fb`, demo port `f826997` as client): tesp-api's stock client fails 110 inputs (exit 126) and the fixed client runs 109, 110 and 600; Funnel likewise for 109 and 110 (`runs/stage6/argv/` and `runs/stage6/argv/galaxy/` in `~/projects/repositories/galaxy-wes-tes`, demo commit `c070155`).

No PR.

Fork CI for `9036ff3` not checked yet.

## Notes

- Problem: the launch message is one container argument, and Linux refuses arguments of 131 072 bytes or more. In the demo a `collapse_dataset`-style Galaxy job with 109 inputs can't start on tesp-api (exit 126), Funnel (`SYSTEM_ERROR`, fake exit code 0) or TESK (annotation limit, computed); stock Galaxy then leaves the job `queued`. Formula and numbers: demo `docs/pulsar-tes-runner.md#argument-size-ceiling`.
- `ea7bc6e`: messages longer than 131 071 bytes go as `--base64_zlib`, URL-safe base64 of zlib-compressed JSON (about a tenth: hyphy's 49 264 bytes become 4 948). Messages that fit stay plain `--base64`, so older staging images keep working for every job that worked; they reject `--base64_zlib` with an argparse error (exit 2). Too large even compressed raises at launch. Limit in the demo goes from 108 to 1 244 inputs.
- URL-safe base64 is required, not cosmetic: tesp-api stores executor arguments as `List[Path]` and collapses `//`, which standard base64 of compressed data contains (measured: decode error).
- `9036ff3`: `pulsar-finish` gets `{"job_id": ...}` only. Every image since 0.15.0 reads nothing else (the launch config is persisted in the job directory), so this is compatible; it halves the task JSON, which TESK's 256 KiB annotation limit counts.
- Applies to every coexecution client (TES, Kubernetes, GCP and AWS Batch share `CoexecutionLaunchMixin`). `MessageCLIJobClient`'s `nohup pulsar-submit --base64` path is unchanged.
- Demo port for Galaxy v26.1.2 (which pins pulsar-galaxy-lib 0.15.15 and can't import the 0.16 client): branch `coexecution_compact_launch_0.15.15` `f826997` on tag 0.15.15, pushed to jmchilton, demo-only. The demo uses it as a `--target` overlay (`var/s6-argv/pulsar-overlay`, `GALAXY_EXTRA_PYTHONPATH`), and the image `wes-tes/pulsar-pod-staging:0.16.1.dev0-9036ff3` (`scripts/argv/prepare.sh`).
- No Galaxy change needed: Galaxy only picks up a new pulsar-galaxy-lib.

## Review materials

- [Implementation](implementation_debrief.md)
