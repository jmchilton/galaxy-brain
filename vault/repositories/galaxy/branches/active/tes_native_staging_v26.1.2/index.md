---
upstream_base_branch: dev
related_records: galaxy/branches/tes_task_state_polling
---
# TES-native job runner prototype (design B)

- [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:tes_native_staging_v26.1.2?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/tes_native_staging_v26.1.2)

## Status

Prototype at `5e889591314`, five commits on `tes_task_polling_v26.1.2` `a1b53d59234` (not rebased onto that branch's later commits), from stages 5 and 6 of the [GA4GH WES and TES project](../../../../../projects/ga4gh_wes_tes/index.md) and the [WES on tesp-api project](../../../../../projects/wes_tesp_api/index.md).

No PR: a prototype for John to decide on, on v26.1.2, needing a port to `dev` (FastAPI `JobFilesManager`).

No fork CI looked at; locally 83 unit tests and the 9 `test/integration/test_job_files.py` tests pass, and `make acceptance TES_MODE=native` passed live on TESK and Funnel and, except the expected hyphy failure, on tesp-api (demo `313dc19`).

## What it is

- `galaxy.jobs.runners.tes:TesJobRunner`: each job becomes one plain TES task. TES inputs fetch every file the job reads from the job files API; one executor runs Galaxy's own job script in the tool's biocontainer at Galaxy's absolute paths (Kubernetes-runner style, `outputs_to_working_directory: true` required); TES outputs send the datasets, tool streams, exit code file and core metrics files back. Galaxy polls TES (reusing `tes_task.py`), then sets metadata and finishes locally. No Pulsar, broker or staging image in the task, and no Pulsar change.
- `PUT /api/jobs/{job_id}/files?path=` with a raw body (FastAPI route in the legacy job files module), for Funnel and TESK uploads. tesp-api uses the existing multipart POST.
- Every task URL carries a signed token (`job_token=<expires>.<HMAC>`) for one path and one direction, instead of the job key (`galaxy.security.job_files_tokens`).
- With `tes_directory_outputs: true`, the tool working directory and each output's extra files go back as TES `DIRECTORY` outputs through `PUT /api/jobs/{job_id}/files/{rel_path}?path=<dir>` (Funnel and TESK; not tesp-api).

## Decision for John

Whether design B is worth pursuing upstream. Evidence, sizes, timing, LOC and the production gap table: `runs/design-b/README.md` in the demo repository; stage 6 test output in `runs/stage6/h4-design-b/`. Debrief: [implementation_debrief.md](implementation_debrief.md).

## Review materials

- [Implementation](implementation_debrief.md)
