# Component - Pulsar Input Staging

Document how a Pulsar job's files move between Galaxy and Pulsar under `remote_transfer` / `rewrite_parameters`: `PulsarComputeEnvironment` path rewrites (inputs, extra files, metadata), `ClientInput`/`ClientInputs` and Pulsar's `FileActionMapper`/`FileStager`, the job files API (`api/job_files.py`, `JobFilesManager`, `job_key`, #22781's restrictions), and, if #24484 has merged, identity-based input staging (`object_store_staging`, `JobObjectStagingManager`, `StagingUrlSigner`, `/api/jobs/{id}/staging/inputs/...`, stream vs redirect, Pulsar version gates). Cover the shared-disk assumption and what each credential authorizes. Leave out AMQP messaging, coexecution, and Pulsar's server-side managers.

## Why

#24484 adds a second staging channel next to the job files API, with its own credential model. No research note covers Pulsar staging; [[Component - Galaxy Pulsar Runner Code Sharing]] explicitly scopes it out.

## Requested by

- vault/repositories/galaxy/reviews/active/24484: learning review needed a baseline account of Pulsar input staging and the job files API.
