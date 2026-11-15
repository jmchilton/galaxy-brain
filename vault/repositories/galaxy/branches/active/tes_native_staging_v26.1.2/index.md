---
upstream_base_branch: dev
related_records: galaxy/branches/tes_task_state_polling
---
# TES-native job runner prototype (design B)

- [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:tes_native_staging_v26.1.2?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/tes_native_staging_v26.1.2)

## Status

Prototype at `f33e416aa22`, two commits on `tes_task_polling_v26.1.2` (`a1b53d59234`, tag `v26.1.2` plus the TES polling port), built in stage 5 of the [GA4GH WES and TES project](../../../../../projects/ga4gh_wes_tes/index.md). It ran the IWC short-read QC workflow through Galaxy WES on Funnel 0.12.3 and on tesp-api (stage 5 branch `4bc9b5d9`), with every IWC assertion passing (`runs/design-b/` in `~/projects/repositories/galaxy-wes-tes`).

No PR. It is a prototype for John to decide on: it sits on v26.1.2, and a real version would need a port to `dev` (FastAPI `JobFilesManager`, which v26.1.2 lacks).

No fork CI looked at. Locally: the new unit tests (8), the 46 polling tests and `test/integration/test_job_files.py` (7, including 2 new PUT tests) pass.

## What it is

- `galaxy.jobs.runners.tes:TesJobRunner`: each job becomes one plain TES task. TES inputs fetch every file the job reads from the job files API; one executor runs Galaxy's own job script in the tool's biocontainer at Galaxy's absolute paths (Kubernetes-runner style, `outputs_to_working_directory: true` required); TES outputs send the datasets, tool streams, exit code file and core metrics files back. Galaxy polls TES (reusing `tes_task.py`), then sets metadata and finishes locally. No Pulsar, broker or staging image in the task, and no Pulsar change.
- `PUT /api/jobs/{job_id}/files?path=&job_key=` with a raw body (FastAPI route in the legacy job files module), for Funnel and TESK uploads. tesp-api uses the existing multipart POST.

## Decision for John

Whether design B is worth pursuing upstream. Evidence, sizes, timing, LOC and the production gap table: `runs/design-b/README.md` in the demo repository. Debrief: [implementation_debrief.md](implementation_debrief.md).

## Review materials

- [Implementation](implementation_debrief.md)
