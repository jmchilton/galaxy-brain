# Component - Job Files API

Document Galaxy's job files API as its own component, independent of any one runner: `FastAPIJobFiles` (`lib/galaxy/webapps/galaxy/api/job_files.py`: GET/HEAD, multipart POST, the TUS hooks and resumable upload router, and on branches that add them, raw-body `PUT` and the directory `PUT`), `JobFilesManager` (`lib/galaxy/managers/job_files.py`: `readable_path`, `authorize_write`, `_authorize`, `write`), and `lib/galaxy/job_execution/ports/view.py` and `webapps/galaxy/api/job_tokens.py` as sibling runner callbacks.

Cover:

- **Authorization.** What `job_key` (`encode_id(kind="jobs_files")`) opens and for how long, the active-job-state check, the write-location rules (absolute path inside the job working directory, an output dataset's file, or under its `extra_files_path`), the re-check after long uploads, and which credentials other callbacks use. Include the signed per-file `job_token` scheme (`lib/galaxy/security/job_files_tokens.py`) where it exists: what it binds, its derivation from `id_secret`, and how it differs from the job key and from other signed-URL or token conventions in Galaxy.
- **Upload paths.** How a body reaches disk for each source (nginx, TUS, multipart, raw body), staging on the target's filesystem, tool stream append versus replace, and client-disconnect handling.
- **Consumers.** Every caller: the Pulsar runners' `remote_transfer`, coexecution and Kubernetes, and the TES-native runner (`lib/galaxy/jobs/runners/tes.py`, which fetches inputs and PUTs outputs as plain TES `inputs`/`outputs`), including the shape of each caller's URLs and how a TES server's HTTP client (Funnel, TESK, tesp-api) differs.
- **Tests.** `test/integration/test_job_files.py`, `test/unit/app/managers/test_JobFilesManager.py`, and how they run a real test server.

Leave out Pulsar's `FileActionMapper` and path rewriting (see [[Component - Pulsar Input Staging]]) and runner job lifecycle.

## Why

The job files API now has more than one kind of consumer and the "runner-only, key-authorized" description in [[Component - Pulsar Input Staging]] is one section of a Pulsar note: it doesn't describe raw-body upload, signed per-file tokens, directory writes or the TES-native caller, and the `ports` and `oidc-tokens` callbacks (see `research_issues/job-ports-tokens-auth-drift.md`) have drifted from it. Branches that touch this surface (`tes_native_staging`, `job_files_fastapi` follow-ups, #22781) each had to reconstruct it from code.

## Requested by

- vault/repositories/galaxy/branches/active/tes_native_staging/brain_research.md: needed a component-level description of the job files API's authorization, upload paths and consumers to review the raw-body PUT, directory PUT and signed-token additions.
