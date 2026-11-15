---
upstream_base_branch: master
pr: 583
parent_branch: coexecution_stage_out_failures
related_records:
  - pulsar/branches/coexecution_stage_out_failures
---
# Compress coexecution launch messages too long for one argument; send pulsar-finish only the job id

- [PR #583](https://github.com/galaxyproject/pulsar/pull/583)
- [View on GitHub](https://github.com/jmchilton/pulsar/tree/coexecution_compact_launch)

## Status

Hardened 2026-11-15 at `869d63d` (restacked onto `coexecution_stage_out_failures` `24006de`): Codex review (no findings) and thermo-nuclear review (message options mutually exclusive, both messages through `job_message_arguments`, launch tests use the real script parsers).

Draft PR [#583](https://github.com/galaxyproject/pulsar/pull/583) opened 2026-11-15, stacked on #582.

CI for `869d63d` (2026-11-15, settled): unrelated only. Everything else green; unrelated (on base): `Framework tests / Test (3.10, master, directory)` fails with `ImportError: cannot import name 'build_client_manager' from 'pulsar.client'`, as on every recent master run; not rerun.

## Notes

- Commits (2026-11-15): `c778e40` (compression; was `ea7bc6e`), `7c57747` (job-id-only finish; was `9036ff3`), `8209081`, `e4caffb`, `869d63d` (thermo). The SHAs below are pre-restack.
- Release order: the default image `0.15.0.2` rejects `--base64_zlib` (exit 2), so jobs over the limit need a staging image built from this branch.
- Problem: the launch message is one container argument, and Linux refuses arguments of 131 072 bytes or more. In the demo a `collapse_dataset`-style Galaxy job with 109 inputs can't start on tesp-api (exit 126), Funnel (`SYSTEM_ERROR`, fake exit code 0) or TESK (annotation limit, computed); stock Galaxy then leaves the job `queued`. Formula and numbers: demo `docs/pulsar-tes-runner.md#argument-size-ceiling`.
- `ea7bc6e`: messages longer than 131 071 bytes go as `--base64_zlib`, URL-safe base64 of zlib-compressed JSON (about a tenth: hyphy's 49 264 bytes become 4 948). Messages that fit stay plain `--base64`, so older staging images keep working for every job that worked; they reject `--base64_zlib` with an argparse error (exit 2). Too large even compressed raises at launch. Limit in the demo goes from 108 to 1 244 inputs.
- URL-safe base64 is required, not cosmetic: tesp-api stores executor arguments as `List[Path]` and collapses `//`, which standard base64 of compressed data contains (measured: decode error).
- `9036ff3`: `pulsar-finish` gets `{"job_id": ...}` only. Every image since 0.15.0 reads nothing else (the launch config is persisted in the job directory), so this is compatible; it halves the task JSON, which TESK's 256 KiB annotation limit counts.
- Applies to every coexecution client (TES, Kubernetes, GCP and AWS Batch share `CoexecutionLaunchMixin`). `MessageCLIJobClient`'s `nohup pulsar-submit --base64` path is unchanged.
- Demo port for Galaxy v26.1.2 (which pins pulsar-galaxy-lib 0.15.15 and can't import the 0.16 client): branch `coexecution_compact_launch_0.15.15` `f826997` on tag 0.15.15, pushed to jmchilton, demo-only. The demo uses it as a `--target` overlay (`var/s6-argv/pulsar-overlay`, `GALAXY_EXTRA_PYTHONPATH`), and the image `wes-tes/pulsar-pod-staging:0.16.1.dev0-9036ff3` (`scripts/argv/prepare.sh`).
- No Galaxy change needed: Galaxy only picks up a new pulsar-galaxy-lib.

## Review materials

- [Implementation](implementation_debrief.md)
- [Codex review](codex_review.md)
- [Thermo-nuclear review](thermo_nuclear_review.md)
- [PR description](pr_description.md)
