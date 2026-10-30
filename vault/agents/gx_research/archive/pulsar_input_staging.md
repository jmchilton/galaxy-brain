# Component - Pulsar Input Staging

Document how a Pulsar job's files move between Galaxy and Pulsar under `remote_transfer` / `rewrite_parameters`: `PulsarComputeEnvironment` path rewrites (inputs, extra files, metadata), `ClientInput`/`ClientInputs` and Pulsar's `FileActionMapper`/`FileStager`, the job files API (`api/job_files.py`, `JobFilesManager`, `job_key`, #22781's restrictions), and, if #24484 has merged, identity-based input staging (`object_store_staging`, `JobObjectStagingManager`, `StagingUrlSigner`, `/api/jobs/{id}/staging/inputs/...`, stream vs redirect, Pulsar version gates). Cover the shared-disk assumption and what each credential authorizes. Leave out AMQP messaging, coexecution, and Pulsar's server-side managers.

## Why

#24484 adds a second staging channel next to the job files API, with its own credential model. No research note covers Pulsar staging; [[Component - Galaxy Pulsar Runner Code Sharing]] explicitly scopes it out.

## Requested by

- vault/repositories/galaxy/reviews/active/24484: learning review needed a baseline account of Pulsar input staging and the job files API.

## Debrief

- Created `vault/research/Component - Pulsar Input Staging.md`, verified against Galaxy `origin/dev` @ `65e6daff` and `pulsar-galaxy-lib` 0.16.0 (Galaxy's pin, read from the PyPI wheel; no Pulsar clone exists under `~/projects/repositories/`).
- #24484 and #22781 were both still open. The note covers the `dev` baseline in full. It describes both PRs from their descriptions only, in a separate "Proposed changes (unmerged)" section, and cites none of their branch code. The "#22781's restrictions" the request mentions aren't on `dev`; the job files restrictions that are on `dev` came from #23856, #23933 and #24564, and the note attributes them to those.
- Version-gate finding relevant to #24484's Pulsar 0.15.16 redirect gate: on destinations with `jobs_directory` (all MQ ones), `remote_job_config["pulsar_version"]` is Galaxy's own client-library version, not the remote server's.
- Research issues filed: `pulsar-compute-env-pwd-home-target-dropped.md`, `pulsar-arbitrary-rewrite-missing-path-helper.md` (Pulsar), and `job-ports-tokens-auth-drift.md`.
- Out of scope, as requested: AMQP messaging, coexecution, and Pulsar's server-side managers. Server-side staging is mentioned only as the `remote_staging` payload and `preprocess` replay. Output collection is covered only briefly.
