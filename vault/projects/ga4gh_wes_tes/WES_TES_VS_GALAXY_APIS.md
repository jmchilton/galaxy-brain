# GA4GH WES and TES against Galaxy's own APIs

Stage 7 of the [GA4GH WES and TES project](index.md), written 2026-11-15. It pulls together stages 1 to 6 and the stage 7 experiments, and answers three questions for Galaxy and Pulsar developers:

1. What can GA4GH WES and TES do around Galaxy and Pulsar today, on released code?
2. What do the branches built in this investigation add?
3. What do these APIs cost compared with Galaxy's own: the workflow invocation API, the jobs API, and Pulsar's REST and AMQP runners?

It tests John's prior view: WES on Galaxy has little point, Galaxy's APIs work better and do more, and since only Galaxy runs Galaxy workflows, interop is small.

Paths written `demo:` are in the demo repository `~/projects/repositories/galaxy-wes-tes` (local git only). Galaxy line numbers are at tag `v26.1.2` (`391641a4e12`) unless stated. Records are under `vault/repositories/{galaxy,pulsar}/branches/active/` in galaxy-brain. Other documents: [`RESEARCH.md`](RESEARCH.md) (stage 1), [`PULSAR_TES_IMPROVEMENTS.md`](PULSAR_TES_IMPROVEMENTS.md) (stage 3, "PTI n"), [`TESP_API_PLAN.md`](TESP_API_PLAN.md) (stage 4), [`STAGE_LOG.md`](STAGE_LOG.md), and the [WES on tesp-api project](../wes_tesp_api/index.md) with its [`BUGS_AND_ENHANCEMENTS.md`](../wes_tesp_api/BUGS_AND_ENHANCEMENTS.md) ("B&E n") and [`DESIGN_B.md`](../wes_tesp_api/DESIGN_B.md).

## Executive summary

**Bottom line.** Keep Galaxy's WES endpoint, make it honest with a handful of small fixes, and don't build on it: for anything Galaxy's own clients do, the invocation API is faster, does more and reports failures truthfully. TES is not a better way for Galaxy to run its own jobs (Pulsar REST or AMQP is), and tesp-api adds nothing for Galaxy. TES matters only as Galaxy's way onto compute it doesn't run, and for that the TES-native design B, not today's Pulsar-in-the-task design A, is the shape to build when a real deployment asks. Whatever happens to WES and TES, land the Pulsar staging-image stack and publish a current image: Galaxy's default image silently loses discovered outputs today on every coexecution runner.

Key numbers, all from runs in the demo repository:

- **Same workflow, same Galaxy and runner:** 44–57 s end to end and 9 HTTP calls through the native API; 290–322 s and 21 calls through WES, 240 s of it waiting on DRS `Retry-After`. Even then the WES client made 5 native calls per run, in every one of 56 passing runs, because WES gives collection outputs no elements or DRS URIs.
- **State:** WES reported `COMPLETE` for runs with failed jobs, paused jobs, silently lost outputs, and 4 of 12 jobs run.
- **Third-party WES clients:** none of four (GA4GH `wes-client`, Sapporo, Dockstore CLI, ELIXIR Cloud components) submits to Galaxy unmodified; all four complete a run with small workarounds. 455 WES 1.1.0 schema violations in 38 of 67 responses, mostly `null` optional fields, which crashed two clients. CORS is off by default.
- **Capability matrix:** WES is missing 12 of 36 capabilities outright and partial on 15 more. Apart from a standard schema and a public service-info, the native API has everything WES has.
- **Per-job overhead for a 3–8 s tool:** local Docker 11–17 s `queued` → `ok`; design B on Funnel 14–18 s; design A on Funnel or tesp-api 26–28 s (two staging executors, 16–19 s); TESK 62–67 s.
- **Design A limits:** 108 inputs per job (1,244 with our Pulsar branch); broker password and job key in task arguments; jobs hang forever on a dead task without our Galaxy branch.
- **Non-Galaxy TES consumers:** five of six ran a fastp → MultiQC pipeline on Funnel, which passes TES conformance 1.0 and 1.1 (187/187). On patched tesp-api only Nextflow (S3 work dir, no glob outputs) and Snakemake ran; Cromwell, Sprocket and py-tes didn't; upstream tesp-api failed Nextflow at stage-in.
- **Cancel leak:** John's open Pulsar PR #554 stops the container 2–3 s after a WES cancel on direct Pulsar, against 115 s without it.

John's prior view holds for WES, with one adjustment: the cost of making generic WES launchers work is small and mostly on Galaxy's side, so keeping the endpoint honest is cheap and worth it for federation and funder reasons. For TES the view needs nuance: no gain for Galaxy's own jobs, but a real, unrealized upside as access to other people's compute.

## What the evidence is

- **About 60 end-to-end WES runs** of two real IWC workflows, `short-read-qc-trimming` (fastp + MultiQC, `list:paired` input, 2 tool jobs) and `hyphy-preprocessing` (39-element URL list, 12 jobs, a discovered collection, map-over). 64 runs have a `verification.txt`; 56 say PASS against the IWC test assertions. The others are deliberate failure tests (lost discovered outputs, a broken first design B attempt, setup probes).
- **Five job backends behind Galaxy:** Funnel v0.12.3, TESK (chart 0.3.0 on kind), tesp-api (upstream `3d470f76`, the mirelaminkova fork `c3a9f237`, and our 17-patch series), Pulsar REST directly with no TES server, and, in stage 7, Galaxy's local runner with Docker.
- **Two Galaxy TES runners:** the stock `PulsarTesJobRunner` (design A) and the `TesJobRunner` prototype (design B).
- **A repeatable acceptance harness**, `make acceptance` (`demo:scripts/acceptance.sh`), with seven scenarios: iwc-qc, iwc-hyphy, cancel, dies-early, tes-restart, unreachable and leftovers. Results are in `demo:runs/acceptance/*/result.json`.
- **Stage 7 experiments:** third-party WES clients against Galaxy, non-Galaxy TES consumers against our TES backends, approach 1 (WES on Galaxy's local runner) and the native-API baseline. Evidence in `demo:runs/stage7/` (demo commits `9af0a78`, `8136ca5`, `1ee816e`).

Every run used Galaxy v26.1.2 (stock, or with our fixes ported), Python 3.12, pulsar-galaxy-lib 0.15.15, pydantic-tes 0.4.0, RabbitMQ 4.3.7, IWC `c07557fb`. Full pins: the demo `README.md` and `versions.env`.

## The approaches at a glance

| | 1. WES on normal runners | 2. Design A on Funnel / TESK | 3. Design A on tesp-api | 4. Design B (prototype) | 5. Pulsar REST, native API |
| --- | --- | --- | --- | --- | --- |
| Works on released code | Yes (v26.0.2+), with the WES caveats | Yes, stock v26.1.2, job conf only; silent data loss with the default image, hangs on dead tasks | Yes for jobs; cancel, cleanup, restarts broken upstream | No: Galaxy branch on v26.1.2 | Yes |
| With our branches | 5 WES bugs fixed | Reliable: polling, staging fixes, 1,244-input ceiling; `make acceptance` passes | Reliable with 17 tesp-api patches; acceptance passes | All acceptance scenarios pass on Funnel and TESK | Cancel leak fixed by Pulsar PR #554 |
| Extra services | Celery (DRS) | RabbitMQ reachable from tasks, TES server, staging image | + MongoDB, outer Pulsar with Docker socket | TES server | Pulsar server (+ broker for AMQP) |
| Containers per job | 1 | 3 (TESK: 3 pods + taskmaster) | 3 + cleanup job | 1 (+ filer pods on TESK) | 1 |
| `queued` → `ok`, fastp / MultiQC | 11–14 / 14–17 s (local Docker) | 27.6 / 28.5 s Funnel; 63 / 67 s TESK | 26.2 / 27.9 s | 14.0 / 18.1 s Funnel; 18.8 / 19.6 s tesp-api | 42 (cold) / 24 s |
| Credentials at the worker | none | broker password + job key in task arguments | same, plus an unauthenticated outer Pulsar | per-file signed tokens | Pulsar token |
| Who else can use the backend | n/a | Funnel: 5 of 6 consumers tested; TESK untested here | Nextflow (S3, no globs), Snakemake | same servers | nobody (Pulsar API is Galaxy-specific) |
| Upstream CI | WES API tests | none | none | none | yes |

## Approach 1: Galaxy WES with Galaxy's normal job runners

**What it is.** A WES client posts a Galaxy workflow (`gx_workflow_ga` or `gx_workflow_format2`) plus `workflow_params` to `POST /ga4gh/wes/v1/runs`. Galaxy turns it into an ordinary workflow invocation; jobs run on whatever runner the job conf picks. WES is a translation layer over the invocation API, nothing more (`services/wes.py` calls `WorkflowsService.invoke_workflow`, RESEARCH 1.2).

**What works, on released Galaxy (v26.0.2 or later):**

- Submit by attachment, `http(s)`/`base64://`/`drs://` URL, or `gxworkflow://<id>[?instance=true]` for a workflow already in Galaxy.
- Inputs as existing datasets (`{"src": "hda", "id": ...}`), and, untested upstream but proven here, URL and CWL-style `File`/`Collection` inputs. Galaxy materializes them before scheduling, without a job. An IWC test's `job:` block works as `workflow_params` almost unchanged (stage 2; `demo:runs/*/request.json`).
- Status, run log, task list (one task per job, mapped jobs as `<step>.<n>`), cancel (it reaches the job runner and TES: Funnel task CANCELED 4 s after the WES cancel, stage 2).
- Outputs keyed by workflow output label, with DRS URIs for datasets.

**What doesn't**, all reproduced in the demo (`demo:docs/troubleshooting.md`, PTI 5, 10–16, 22–25):

- A run is `COMPLETE` when every job reached a terminal state, including `error` and `paused`. Seen three times: fastp `error` with MultiQC `paused` (`demo:runs/setup/wes-probes/probe-I-*`), a uid mismatch failing fastp on direct Pulsar (`demo:runs/tesp-probes/direct-pulsar/01-uid-mismatch/`), and a tool that silently lost its discovered outputs (`demo:runs/gaps/discovered-outputs/`, `COMPLETE`, verification FAIL).
- Collection outputs come back as `{"src": "hdca", "id"}` only: no elements, no DRS URI. So every QC run needed 5 calls to Galaxy's own API and every hyphy run 6, in all 56 passing runs (`demo:runs/**/galaxy-native-calls.json`).
- DRS: the URI names `drs.<host>`, which doesn't resolve; each object answers `202` with `Retry-After: 60` on first access even with a Celery worker (and forever without one); objects are served only for public datasets, even to their owner (`demo:docs/wes-client.md`, "Other DRS facts"). The demo works only because new datasets are public on its Galaxy.
- Request bugs: `use_cached_job` as a JSON boolean gives 500; run-scoped reads give 500 without credentials; cancel turns a `COMPLETE` run into `CANCELED`; a rejected submission leaves a workflow and a history behind; omitted optional parameters come back as `{"__class__": "NoReplacement"}`; integers aren't validated (`"abc"` accepted); `auth_instructions_url` is `"TODO"`.
- Nothing to set up with: users, API keys, tool installs (the demo uses ephemeris 0.10.11), data libraries are native-only. A workflow whose tools aren't installed fails at invocation.
- Subworkflow jobs are not listed as tasks. Tasks carry no job state, so a client can't tell queued from running.

**Setup cost.** None on the server: the WES routes are always on and have no config switch (`fast_app.py` registers every router). Only Celery is needed, and only for DRS downloads. The client side is where the cost is: the demo's client, `demo:scripts/wes_client.py`, is a few hundred lines because of collections and DRS.

**Moving parts.** Galaxy, its database, the job runner, Celery for DRS. WES adds no process.

**Security posture.** Same credentials as the native API (`x-api-key`, session, or OIDC bearer when configured). Owner-only visibility; admins can't see other users' runs through WES. The 500-on-anonymous bug is a crash, not a leak. Because the routes can't be turned off, every Galaxy since 26.0 exposes them.

**Performance.** Measured in stage 7 on Galaxy's local runner with Docker (`demo:config/galaxy/job_conf_local_docker.yml.in`, `demo:runs/stage7/native-vs-wes/`): fastp 11–14 s and MultiQC 14–17 s from `queued` to `ok` (the containers themselves ran 3 s and 6 s). The workflow reached COMPLETE 48 s after submit. The WES client then took another 240 s to get the outputs, four sequential DRS `Retry-After: 60` waits, for 290–322 s end to end. Fetching all DRS objects once up front (`--prime-drs`) cut that to 110 s. The native API on the same Galaxy and runner took 44–57 s end to end (approach 5).

**Failure modes.** A client that trusts `COMPLETE` accepts failed runs. A client that follows DRS waits 60 s per output object, one after another: in the QC runs the workflow finished in 60–90 s and the client spent another 240 s in DRS waits (timeline of every run with `status-history.json` and `http-log.json`). A Galaxy without Celery never serves a DRS object at all.

## Approach 2 (design A): Galaxy WES → Galaxy → Pulsar TES runner → Funnel or TESK

**What it is.** Galaxy's stock `PulsarTesJobRunner` sends each tool job to a TES server as a task with three executors that share one TES volume: `pulsar-submit` in Galaxy's staging image (stages inputs from Galaxy's job files API and publishes `running` to RabbitMQ), the tool's biocontainer, and `pulsar-finish` (posts outputs back and publishes the final status). Galaxy learns the job state only from AMQP messages; stock Galaxy never asks TES.

**What works.**

- Stock Galaxy v26.1.2, job conf changes only, runs both IWC workflows on Funnel (`demo:runs/2026-11-14-9da1c5702ebec70c/`, `demo:runs/gaps/iwc-hyphy/`) and TESK (`demo:runs/2026-11-14-46d0cd030901e24d/`, `demo:runs/gaps/iwc-hyphy-tesk/`). fastp outputs are byte-identical across every run and backend.
- Concurrency (4 tasks, 3 simultaneous WES runs), cancel mid-run (WES `CANCELED` within 2 s, TES task cancelled, no containers left), stage-in failure (job fails in 6–8 s with the error in stderr). Evidence in `demo:runs/gaps/`.
- `make acceptance TES=funnel` passes 6 scenarios with tes-restart skipped (`demo:runs/acceptance/20261115T022857Z-funnel/`), on the demo's fixes branch.

**What needed fixing to get there, or still does:**

- Galaxy's default staging image `galaxy/pulsar-pod-staging:0.15.0.2` (built 2023-02-08) silently drops `discover_datasets` outputs: job `ok`, empty collection (`demo:runs/gaps/discovered-outputs/`). No current image is published, and the coexecutor Dockerfile couldn't build current Pulsar (PTI 2, 4). This affects every Galaxy 26.x coexecution deployment, Kubernetes and GCP Batch included, not just TES.
- Stock Galaxy leaves a job `queued` forever when the task dies before Pulsar reports (bad image, pull failure, `Argument list too long`), and loops forever cancelling a TESK task that already ended (PTI 1, 30). Fixed on `tes_task_state_polling`.
- Staging failures exit 0, outputs written as directories give green jobs, `running` is never published, stage-out errors are lost (PTI 3, 6, 7, 8, 31). Fixed on the Pulsar stack.
- A job with 109 or more inputs can't start: the base64 launch message is one executor argument, capped at 131,071 bytes by Linux (B&E 9, `demo:runs/stage6/argv/`). Fixed to 1,244 inputs on `coexecution_compact_launch`.
- Every job runs with `GALAXY_SLOTS=1` whatever `cpu_cores` says (B&E 42; confirmed by design B's byte-identical fastp at 1 core).

**Setup cost.** A RabbitMQ broker that Galaxy and every task container can reach; Galaxy and the broker bound where task containers see them (the demo binds `172.17.0.1`); a staging image built locally (`demo:scripts/build-staging-image.sh`); a TES server with auth. `make up TES=funnel` takes 64 s on the demo host; TESK 2 min 50 s from no cluster, about 1.5 GB more memory and 3 GB of disk (`demo:docs/tesk.md`).

**Moving parts per job:** 3 containers on Funnel; on TESK a taskmaster pod plus one pod per executor and a PVC. Per deployment: Galaxy, Celery, RabbitMQ, the TES server (Funnel's server and worker, or Kubernetes plus tesk-api), the staging image.

**Security posture.** Weak on any TES server someone else can read:

- The broker URL with its password and the job's `job_key` are base64 in the arguments of executors 0 and 2 (PTI 17, B&E 11). Funnel writes full `docker run` lines into task system logs; TESK keeps the task JSON in Kubernetes annotations. Anyone who can read tasks can publish fake job states to Galaxy's broker. Stage 3 had to redact a committed evidence file and rotate the password because of this (demo commit `80d7ea9`).
- Pulsar's TES client supports only `none` or `basic` auth, and `basic_auth` without `authorization: basic` silently sends nothing (PTI 18). TESK accepts only OIDC bearer tokens or nothing, so the demo ran TESK with no auth at all.
- The design needs task containers to reach Galaxy's job files API and the broker. On a remote or multi-node cluster both must be routable from the workers.

**Performance.** Measured from `tes-evidence.json` across all runs (median, Galaxy job `queued` → `ok`):

| Backend | fastp | MultiQC | fastp tool time | Staging executors per job |
| --- | --- | --- | --- | --- |
| Funnel (n=5) | 27.6 s | 28.5 s | 4.0 s | 15.6–18.7 s |
| tesp-api (n=18) | 26.2 s | 27.9 s | 3.0 s | 17.0–19.0 s |
| TESK (n=4) | 63.2 s | 67.2 s | 7.5 s | 25.5–27.0 s |

For these short tools the two staging executors cost 4 to 6 times the tool's own run time. TESK adds about 17 s per Pulsar job for pod start-up, paid three times per task. The fixed costs don't grow with tool run time, so they matter less for long jobs; they do grow with input count (about 877 bytes of launch-message JSON per input, task JSON 17.5 KB for fastp).

**Failure modes.** Lost AMQP messages (no polling without the branch), dead tasks hanging jobs (stock), silent data loss with the default image, broker or Galaxy unreachable from workers, the argv ceiling, Funnel 0.12.3 orphaning containers across its own restarts (B&E 49), TESK failing slowly and silently on a missing image (240 s, no reason), TESK's PVCs held for a day.

## Approach 3: Galaxy → tesp-api (stock and our hardened series)

**What it is.** Design A with tesp-api as the TES server. tesp-api (CESNET) has no executor of its own: it turns each TES task into a shell script of `docker run` lines and submits it to an outer Pulsar REST server, which starts the containers through the host's Docker socket. So every Galaxy job involves two Pulsars: the outer one as a shell runner, the inner one in the staging image doing Galaxy's staging. They don't talk to each other.

**Stock (upstream `3d470f76`, release 0.2.0; fork `c3a9f237`).** Stock Galaxy's runner passes both IWC workflows with job conf changes only, outputs byte-identical to Funnel, timing the same (`demo:runs/2026-11-14-1ac1a4b1c225b8aa/`, `demo:runs/tesp-probes/galaxy/`). The operational layer is broken (TESP_API_PLAN 2.1, 2.2):

- cancel never stops the container (upstream only marks CANCELED; the fork cancels the Pulsar job, whose SIGKILL kills the `docker run` client, not the container);
- every executor container and `vol-<id>-*` volume is left behind (67 containers and 23 volumes cleaned up after stage 4);
- upstream stores no executor logs; the fork stores the in-task Pulsar log, including Galaxy `job_key`s;
- a tesp-api restart strands running tasks;
- upstream fails any task after about 27 minutes (4 s × 400 polls) and leaves its container running;
- upstream's `poetry.lock` doesn't import; AMQP mode fails every task; no credentials gives 500;
- the whole job script travels in a URL query string (a 100 KB script for the 39-input hyphy job).

**Hardened (17 patches on the fork, `demo:patches/tesp-api/`, built reproducibly as `TESP_REF=patched`, commit `c5ca66a2`).** Fixes cancel (containers gone 1.1–1.4 s after the WES cancel, through a `setsid` watchdog that survives Pulsar's SIGKILL), cleanup after every task, restart recovery, the job script as a file, log redaction, 401, one log per executor, single erase. Unit tests 694 → 873. With Pulsar `queued_manager_monitor_kwarg` (concurrency) and `clean_job_directory_retry` (a cancel/DELETE race that left job directories in 13 of 40 cancels), and the Galaxy polling branches, `make acceptance TES=tesp` passes iwc-qc, cancel, dies-early, unreachable and leftovers (`demo:runs/acceptance/20261115T045850Z-tesp/`), and stage 5's acceptance passed all nine plan items (`demo:runs/tesp-acceptance/2026-11-15/`). None of it is upstream; the series applies to the fork, not to CESNET upstream (only the 401 patch does; the fork is about 4,600 lines ahead).

**Setup cost.** Everything in approach 2, plus MongoDB, the outer Pulsar with a Docker socket (root-equivalent on the host), a built tesp-api (upstream's own Dockerfile resolves dependencies fresh, so builds aren't reproducible), and the patch series. Singularity can't run Galaxy's local staging image (B&E 23).

**Moving parts per job:** an outer Pulsar job, 3 task containers, a cleanup job, a watchdog. Per deployment: Galaxy, Celery, RabbitMQ, tesp-api, MongoDB, outer Pulsar, Docker socket, staging image.

**Security posture.** Approach 2's credential exposure, plus: tesp-api can't send Pulsar's `private_token`, so the outer Pulsar runs unauthenticated (B&E 22); the outer Pulsar holds the host's Docker socket; upstream compose runs privileged; one static basic-auth user, every task visible to every user. The patches redact `job_key`, URL passwords and long base64 from stored logs, but the task document itself still holds the base64 launch message.

**Performance.** Same as Funnel for design A (table above); 120-byte `command_line` instead of up to 100 KB after patch 0003. CESNET, tesp-api's authors, wrote that they won't deploy it on a production Galaxy (TESP_API_PLAN 2.5).

**What tesp-api adds for Galaxy: nothing measurable.** The same Pulsar image tesp-api drives ran the QC workflow straight from Galaxy's `PulsarRESTJobRunner`, with identical outputs and no TES server, no broker link from tasks and no staging image (`demo:runs/tesp-probes/direct-pulsar/02-iwc-qc-pass/`). Its only possible value is one TES endpoint that other TES clients share, which is tested below in [Interop reality](#interop-reality).

## Approach 4 (design B): TES-native staging, prototype

**What it is.** A new Galaxy runner, `galaxy.jobs.runners.tes:TesJobRunner` (branch `tes_native_staging_v26.1.2`, `5e889591314`), that sends each job as a plain, spec-following TES task: one executor (the tool's container running Galaxy's unchanged job script through a small wrapper), TES `inputs` and `outputs` as HTTP URLs on Galaxy's job files API, and polling for state. No Pulsar, no broker and no staging image in the task. Galaxy keeps its own absolute paths inside the task, as the Kubernetes runner does. Details: [`DESIGN_B.md`](../wes_tesp_api/DESIGN_B.md).

**What works.** `make acceptance TES_MODE=native` passes iwc-qc, iwc-hyphy (the discovered collection through TES DIRECTORY outputs), cancel, dies-early and leftovers on Funnel (`demo:runs/acceptance/20261115T043559Z-funnel-native/`) and TESK (`20261115T041415Z-tesk-native` plus cancel rerun `20261115T043156Z-tesk-native`), and everything but discovered outputs on tesp-api (no DIRECTORY outputs there). At one core, fastp outputs are byte-identical to design A.

**What it needed.** +912/−49 in stage 5 (runner, raw-body `PUT` on the job files API because Funnel and TESK upload with PUT), +721/−67 in stage 6 (signed per-file `job_token` URLs instead of the job key, a directory `PUT` route, cancel and recovery). No Pulsar or TES-server change.

**What it lacks.** It is on v26.1.2 and needs a port to `dev`'s `JobFilesManager`. Recovery after a Galaxy restart is unit-tested only. No resubmission, limits or walltime mapping. Object-store inputs go through Galaxy. Uploads all of `working/`. TESK holds PVC storage for a day by default. Funnel writes task URLs, and so tokens, into its system logs.

**Setup cost.** A TES server Galaxy can reach and whose workers can reach Galaxy's job files API over HTTP. That's all.

**Moving parts per job:** 1 container on Funnel; on TESK, filer pods plus the executor pod; on tesp-api, an outer Pulsar job with curl helper containers.

**Security posture.** One HMAC-signed token per file and direction, valid until the job ends or a TTL (default 7 days). No broker password and no job key in the task: stored Funnel tasks of the native run hold 0 `job_key` and 324 `job_token=` occurrences. Workers need outbound HTTP to Galaxy only.

**Performance** (median `queued` → `ok`, from `tes-evidence.json`): Funnel fastp 14.0 s, MultiQC 18.1 s (design A: 27.6 / 28.5 s); tesp-api 18.8 / 19.6 s (26.2 / 27.9 s); TESK 62.0 / 67.5 s (63.2 / 67.2 s). Task JSON 10.6 KB for fastp against 17.5 KB, with no argument ceiling. `cpu_cores` becomes `GALAXY_SLOTS`.

## Approach 5: the baselines, Galaxy → Pulsar directly and the Galaxy API instead of WES

**Galaxy → Pulsar REST directly** (`PulsarRESTJobRunner`, `make up TES=pulsar`, design D). Galaxy pushes inputs to Pulsar and pulls outputs; one container per job; no broker, no staging image, no TES server. It passed the QC workflow with outputs byte-identical to every TES run after one config fix (`docker_set_user: root`, because the containerized Pulsar creates job directories as root) (`demo:runs/tesp-probes/direct-pulsar/02-iwc-qc-pass/`). fastp took 42 s `queued` → `ok` on a cold container-resolution cache (PTI 27 adds 25–32 s after each Galaxy start) and MultiQC 24 s. It shares one bug with tesp-api: cancel kills the job script with SIGKILL and the container runs on (`03-wes-cancel/`, B&E 14). Stage 7 found the fix already exists: with John's open Pulsar PR [#554](https://github.com/galaxyproject/pulsar/pull/554) (`term-first-cancellation`, `d87e08f`: TERM, up to 5 s grace, then KILL) the container was gone 2.9 s and 2.2 s after the WES cancel, against 115 s (the end of its `sleep 120`) twice on the default source. Docker events show signal 15, then 9 (`demo:runs/stage7/pulsar-cancel/`). Pulsar over AMQP (`PulsarMQJobRunner`) wasn't run in this investigation. It is the usual production path for remote Pulsar sites, and needs a broker but no inbound route to Pulsar; its capabilities are in the job execution matrix below, from code.

**The Galaxy API instead of WES.** Stage 7 ran the same IWC workflow, inputs and runner (local Docker) through WES and through Galaxy's own API (`demo:runs/stage7/native-vs-wes/native_client.py`: import the workflow, invoke it with the same URL/CWL-style inputs WES passes through, poll, download). Both clients polled every 3 s; all 9 runs passed the IWC assertions, with identical fastp JSON.

| Path | Submit → jobs terminal | Terminal → outputs on disk | End to end | HTTP calls, polls excluded |
| --- | --- | --- | --- | --- |
| WES (`wes_client.py`) | 48 s | 240 s (4 × DRS `Retry-After: 60`) | 290–322 s | 21, of which 5 native and 12 DRS |
| WES with DRS primed up front | 48 s | 60 s | 110 s | 22 |
| Native API | 43–52 s | 0.3 s | 44–57 s | 9 |
| WES, job cache hit (`use_cached_job: "true"`, input = earlier collection) | 7 s | 240 s | 248 s | 21 |
| Native, job cache hit | 4 s | 0.4 s | 5 s | 9 |

With the IWC tests' URL inputs neither API got a cache hit: every run downloads the URLs into new datasets, and the job cache matches neither by URL nor by hash. With 13 more calls (2.4 s) the native client also got what WES doesn't offer at all: per-step job states, collection elements, the invocation report, RO-Crate (22 KB) and BioCompute (13.5 KB) exports, job metrics, and the job list with destinations.

So for the same work the native API needed 9 calls and under a minute; WES needed 21 calls, including 5 to the native API anyway, and five minutes, four of them waiting on DRS. The workflow itself took the same time either way, because WES is the invocation API underneath.

## Capability matrix: WES against Galaxy's invocation API

Every cell comes from code at `v26.1.2` (`391641a4e12`) or a demo run. `origin/dev` (`e7a3f2254c0`) has no behavior change in the WES files since v26.1.2, only typing and a test-helper move. Abbreviations: `svc` = `lib/galaxy/webapps/galaxy/services/wes.py`, `wf` = `lib/galaxy/webapps/galaxy/api/workflows.py`, `swf` = `lib/galaxy/schema/workflows.py`, `sinv` = `lib/galaxy/schema/invocation.py`, `rr` = `lib/galaxy/workflow/run_request.py`, `mjobs` = `lib/galaxy/managers/jobs.py`. "FIX" = `wes_api_fixes_26_0`, "EE" = `wes_run_state_executor_error_26_0`. Mark: ✅ works, ⚠️ partial or buggy, ❌ missing.

| Capability | WES | Native invocation API | Evidence | Fix branches |
| --- | --- | --- | --- | --- |
| Inline workflow | ✅ one multipart request (workflow + inputs + new history). Every submit imports a new visible StoredWorkflow | ✅ two calls: `POST /api/workflows`, then invoke | svc:157-222, 515-527; wf:315-317; `demo:runs/*/request.json` | FIX: a rejected submit leaves nothing behind |
| Workflow from URL | ✅ `http(s)`, `base64://`, `drs://` | ✅ `archive_source` URL, `file://` for admins | svc:198-210; wf:241-262 | |
| Stored workflow, version pin | ✅ `gxworkflow://<id>[?instance=true]` | ✅ `workflow_id` + `version`/`instance` | svc:482-497; swf:120-129 | |
| TRS import (Dockstore, WorkflowHub) | ❌ raw descriptor URL only; TRS JSON fails type detection | ✅ `archive_source=trs_tool` | wf:251-259 | |
| Workflow languages | ⚠️ `gx_workflow_ga`, `gx_workflow_format2` only | same | svc:225-252, 501-508 | |
| Inputs: hda, hdca, ldda, ld | ✅ by label | ✅ by label, step index, uuid or id | rr:123-145, 439-461 | |
| Inputs: `src: dce` | ❌ 400 "Unknown workflow input source" (RESEARCH 1.3 was wrong) | ❌ same code | rr:439-485 | |
| URL and CWL-style File/Collection inputs | ✅ live, nested `list:paired` | ✅ same code | rr:462-479; `demo:runs/2026-11-14-*/request.json` | |
| Deferred data | ✅ code, not run | ✅ same | rr:469, 478 | |
| DRS URIs as inputs | unverified | unverified | | |
| Upload a local file as input | ❌ the attachment isn't staged | ✅ `/api/tools/fetch` | | |
| Step/tool parameters, replacement and resource params | ❌ only `inputs` passed | ✅ | svc:540-558; swf:190, 211-212 | |
| `require_exact_tool_versions`, batch, `on_complete`, `effective_outputs` | ❌ | ✅ | swf:135-173, 213, 229 | |
| Target history | ✅ `history_id` (owned) or new by name | ✅ plus batch naming | svc:277-337; rr:273-317 | |
| Object store | ⚠️ `preferred_object_store_id` only | ✅ plus intermediate and outputs stores | svc:555-556; swf:235-237 | |
| Job caching | ⚠️ string `"true"` only; a JSON boolean gives 500 although service-info implies a boolean | ✅ boolean | svc:557-558; `demo:runs/setup/wes-probes/probe-C-*` | FIX |
| Parameter validation | ⚠️ `"abc"` accepted for an integer, run COMPLETE | same shared path (inferred) | `demo:runs/setup/wes-probes` probe D | |
| Dataset outputs | ⚠️ id + `drs://drs.<host>/…`, unresolvable host, public datasets only, 60 s 202 per object | ✅ `/api/datasets/{id}/display` | svc:1094-1140; `demo:docs/wes-client.md` | |
| Collection outputs | ❌ `{src: hdca, id}` only: no elements, no DRS | ✅ elements, zip download | svc:1142-1150; 5–6 native calls in every run | |
| Parameter outputs | ⚠️ omitted optionals show as `{"__class__": "NoReplacement"}` | ⚠️ same | sinv:649 | FIX (WES only) |
| Task / job list | ⚠️ top-level steps, mapped jobs as `N.k`, `exit_code`, relative stdout/stderr URLs; no state, `cmd`, `system_logs` | ✅ `step_jobs_summary`, steps with jobs and states | svc:687-744, 824-872; wf:1726, 1785 | |
| Per-job state | ❌ a paused job looks like one not yet run | ✅ | svc:858-866 | |
| stdout/stderr | ⚠️ need the API key; empty for a failed fastp whose reason was only in `job_messages` | ✅ `full=true` with `job_messages` | mjobs:1568-1582 | |
| Subworkflow jobs | ❌ the subworkflow step is a no-job row | ✅ nested invocations | svc:711-744; sinv:405 | |
| Job metrics | ❌ | ✅ job and invocation metrics | wf:1820 | |
| Run state fidelity | ⚠️ COMPLETE with failed or paused jobs, with lost discovered outputs, and with 4 of 12 jobs run (design B on tesp-api) | ✅ same states, plus `/api/invocations/{id}/completion` with a job state summary in one call | svc:72-81; wf:1829; `demo:runs/gaps/discovered-outputs/`; `demo:runs/acceptance/20261115T044628Z-tesp-native/` | EE (API test only, not run live) |
| Error detail | ⚠️ EXECUTOR_ERROR only for scheduling failures; Galaxy's `{err_msg, err_code}` instead of WES `ErrorResponse` | ✅ typed invocation messages (job_failed, output_not_found…) | sinv:83-242 | |
| Provenance | ❌ `request` and `run_log` always null | ✅ report JSON/PDF, RO-Crate, BioCompute, `/request`, job parameters | svc:1159-1175; wf:1448-1640 | |
| Rerun, rerun with changes, resume paused | ❌ resubmit only | ✅ `/request` + edit + invoke, `build_for_rerun`, `resume` | | |
| Listing and filtering | ⚠️ owner's runs, keyset `page_size` ≤ 100, no filters; `next_page_token` null instead of `""` | ✅ filter by workflow, history, job, user; sort; `total_matches` | svc:576-625; wf:1355-1400 | |
| Cancel | ⚠️ works and reaches TES (Funnel task cancelled ~4 s later); a COMPLETE run becomes CANCELED | ✅ same call, plus per-job cancel | svc:665-685 | FIX |
| Auth | ⚠️ API key, cookie, OIDC bearer; run-scoped reads 500 when anonymous | ✅ same credentials | svc:472, 599 | FIX (403) |
| Visibility | ⚠️ owner only; admins can't see others' runs | ✅ shared histories, admin listing | svc:603, 1072 | |
| Setup (tools, users, keys, libraries) | ❌ | ✅ | PTI 25 | |
| Discovery | ✅ public service-info, but `auth_instructions_url` "TODO", zero state counts, `file`/`s3`/`gs` advertised without being configured | ⚠️ `/api/version`, `/api/configuration` | svc:354-440 | |
| Spec version | ⚠️ advertises 1.0.0, models generated from `develop` (1.1-era fields) | n/a | `lib/galaxy/schema/wes/gen.sh` | |

**What WES does that the native API doesn't:** a spec-defined schema and paths, so generic WES code works for submit, status, list, cancel and tasks with zero native calls (true in every demo run); a public service-info for discovery; workflow + inputs + new history in one request; a flat task list with stable `N`/`N.k` ids; a cheap `/status`. Everything else, the native API does as well or better. The native API does strictly more on every row except these standardization rows.

### Job execution paths

| | Local/Docker | Pulsar REST | Pulsar AMQP | Pulsar TES (design A), stock | Design A + branches | Design B prototype |
| --- | --- | --- | --- | --- | --- | --- |
| Job state | process wait | Galaxy polls Pulsar | push via broker | push from the in-task Pulsar only; TES never asked (`runners/pulsar.py:1188-1192`) | push + TES poll every 60 s | TES poll every 10 s |
| Dead job detected | yes | yes (lost/failed) | no | no: `queued` forever through two restarts (`demo:runs/gaps/tes-dies-early/`) | yes, 36–46 s; unreachable server after 3600 s | yes; unreachable retried forever |
| Cancel stops the tool | yes (`docker kill` trap) | no: container ran 116 s more (`direct-pulsar/03-wes-cancel/`); with Pulsar PR #554 gone in 2–3 s (`demo:runs/stage7/pulsar-cancel/`) | not run | yes on Funnel; loops forever on an ended TESK task | yes; ended task counts as done; retried 24 h | yes on Funnel, TESK, patched tesp-api |
| Resubmit, walltime | full | via `fail_job` only | same | same, no TES walltime | same | resubmit; no walltime |
| `GALAXY_SLOTS` | `local_slots` | DRM | DRM | always 1 | always 1 | from `cpu_cores` |
| Discovered outputs | yes | yes | yes if Pulsar ≥ 0.15.13 | lost with the default image | yes with the branch image | Funnel and TESK yes; tesp-api no |
| `remote_metadata` | yes | yes (CI) | yes (CI) | default off, unverified | same | no; 6–7 s local per job |
| Restart recovery | running jobs errored | requeued and polled | durable queue; ack-before-finish window can hang a job | message redelivered; dead task stays stuck | polling resumes | re-polls (unit tests only) |
| Credentials at the worker | none | Pulsar token | broker creds in server config | broker password + job key in task arguments | same (compact launch drops one copy) | per-file signed tokens |
| Network | none | Galaxy → Pulsar | both → broker; Pulsar → Galaxy | Galaxy → TES, broker; tasks → Galaxy, broker | same | Galaxy → TES; tasks → Galaxy HTTP |
| Extra services | Docker | Pulsar | Pulsar, broker | TES, broker, staging image `0.15.0.2` | TES, broker, self-built image | TES |
| Upstream CI | yes | yes | yes | none (Galaxy TES tests skipped, Pulsar's tox excludes TES) | fork unit tests | local unit and integration tests |

Two corrections from this pass to earlier documents: v26.1.2 pins pulsar-galaxy-lib 0.15.15, not 0.16.0; and the per-job input ceiling is 108 on every backend (PTI 32's TESK-specific framing is stale).

## Interop reality

### Who can call Galaxy WES

Stage 7 pointed four third-party WES clients at stock Galaxy v26.1.2 with the IWC QC workflow and a trivial format2 workflow (`demo:runs/stage7/wes-clients/README.md`, demo commit `9af0a78`). **None submits a Galaxy run unmodified.** Each one ran both workflows and a cancel once a small client-side workaround was added.

| Client | Unmodified | What fails | Smallest fix | With a workaround |
| --- | --- | --- | --- | --- |
| GA4GH `wes-client` (pip `wes-service` 5.0) | service-info and list | refuses the file before sending (`Unsupported workflow type: .ga. Must be .py, .cwl, or .wdl.`); `run()` sends no auth (`# headers=self.auth` is commented out); with the key forced in, 400 `Requested workflow type 'CWL' does not match detected type …`; crashes on `run_log: null` | client: auth, a workflow-type option, a null guard. Galaxy: fill `run_log` | a 3-point monkeypatch: both workflows COMPLETE, cancel works |
| Sapporo | sapporo-service 2.4.2 ships no client; sapporo-web 1.2.2 stops at service registration | CORS preflight 404; sapporo-web sends no credentials at all | Galaxy: `allowed_origin_hostnames`. Client: a header field | through a proxy that adds the key and answers CORS: both workflows and cancel; the UI shows empty parameters, fake times, null task logs |
| Dockstore CLI 1.18.0 | list, status, logs, cancel (key injected) | service-info: its WES 1.0 model can't parse Galaxy's 1.1-era fields; launch sends `workflow_type=gxformat2` → 400; auth only as `Authorization` (an API key as Bearer → 403); `--inline-workflow` attachments: Galaxy keeps only the last | Galaxy: accept `gxformat2`/`GALAXY` as "detect the type". Client: extra headers, WES 1.1 model | through a proxy that adds the key and rewrites the type, a TRS launch of `github.com/iwc-workflows/short-read-qc-trimming/main:v0.7` ran COMPLETE, with Galaxy fetching the workflow from Dockstore itself |
| ELIXIR Cloud `@elixir-cloud/wes` 2.0.0-alpha.50 (browser components) | nothing loads | CORS; run detail crashes on `request: null`; shows `HTTP 403` instead of Galaxy's `err_msg` | Galaxy: `allowed_origin_hostnames`, fill `request`. Component: optional chaining | with the package's documented provider hook adding `x-api-key`: list, pagination, submit, cancel; detail needs a shim for `request`. With CORS enabled on Galaxy it loaded with 0 console errors |
| proWES (ELIXIR gateway) | not run | hard-coded target WES, CWL-only validator, attachments not forwarded, bearer-only auth, 5 containers | source changes | |

Findings that apply to every client:

- **Auth.** Galaxy takes `x-api-key` or `?key=`. Only `wes-client` can send a custom header (`WES_API_AUTH`), and its `run()` drops it; Dockstore sends only `Authorization`, sapporo-web nothing, and the ELIXIR components need a subclass. `?key=` breaks because the clients append paths to the base URL. `Authorization: Bearer <api key>` is refused; Bearer works only with OIDC tokens on a Galaxy with an OIDC provider, which is what ELIXIR clients would send in a federation.
- **CORS** is off by default (preflights 404). `allowed_origin_hostnames` fixes it for every WES, DRS and `/api` route, verified live; but an anonymous `GET /runs/{id}` is still an unhandled 500 without CORS headers, which a browser reports as a CORS error.
- **Spec conformance.** Against the WES 1.1.0 OpenAPI schema (tag `226f43b1fec9`, openapi-core 0.23.1), 455 violations in 38 of 67 responses: almost all optional fields sent as `null` (`request`, `run_log`, `cmd`, `system_logs`, `tes_uri`, `next_page_token`, service-info URLs and dates), plus undeclared 400s and `text/plain` 500s. Softer: error bodies are Galaxy's `{err_msg, err_code}`; a missing key gives 403 where the spec says 401; times have no timezone; `supported_wes_versions` says 1.0.0 while 1.1 task endpoints are served. Schemathesis found the same problems. The null fields are exactly what crashed `wes-client` and the ELIXIR component.
- **Workflow type.** Galaxy accepts only its own names. Every client sends something else (`CWL` by default, `gxformat2` from Dockstore).

Who can therefore call Galaxy WES today: our own client, jmchilton's `gxy-wes` demos, and any WES client someone patches. With about six small Galaxy changes (fill or omit null fields, a type alias, CORS documented, 401 instead of 500/403, a Bearer path for API keys or OIDC) the Dockstore CLI and the ELIXIR components would plausibly work unmodified. Even then, every client can run only Galaxy workflows, on a Galaxy that already has the tools installed, and no other WES server runs those workflows (RESEARCH 5.1). The Dockstore result is the most interesting one: a registry entry for an IWC workflow ran on Galaxy through a generic launcher, which is the "headless TRS launch" case mvdbeek mentioned in the PR discussion.

### Who can use our TES backends

Until stage 7, every TES task in this investigation came from Galaxy's Pulsar TES runner or from hand-made probes. Stage 7 ran six non-Galaxy TES consumers and the GA4GH TES conformance suite against Funnel v0.12.3, the patched tesp-api (`c5ca66a2`) and, for some, upstream tesp-api (`3d470f76`). Workload: a hello-world, then a two-step fastp → MultiQC pipeline on the same biocontainers and IWC reads as the Galaxy runs. Evidence: `demo:runs/stage7/tes-consumers/README.md` (demo commit `8136ca5`). TESK wasn't run, because its demo scripts share a cluster name and ports with the full stack another stage 7 agent was using at the time.

| Consumer | Funnel v0.12.3 | tesp-api patched | tesp-api upstream |
| --- | --- | --- | --- |
| Nextflow 26.10.6 + nf-ga4gh 1.5.0, host work dir | ✅ work dir inside `LocalStorage.AllowedDirs`. QC 19.7 s (fastp task 4.9 s, MultiQC 6.8 s) | ❌ 422: host paths aren't accepted as TES URLs | not run (same model) |
| Nextflow, S3 work dir (SeaweedFS) | ✅ with config (`GenericS3`, default `AmazonS3` disabled). QC 23.4 s; glob outputs work | ⚠️ with server-side S3 config (a fork feature). QC 41.0 s (15.3 s per task). Any glob output gets 400 | ❌ stage-in runs `curl s3://…`: "Protocol s3 not supported" |
| Snakemake 9.27.1 + executor-plugin-tes 0.1.3, S3 storage | ⚠️ works with an image holding Snakemake, the S3 plugin and every tool. QC 71.5 s | ⚠️ same. QC 91.3 s | hello works |
| Cromwell 92, shared filesystem | ⚠️ needs an auth-injecting proxy: Cromwell can send only a bearer token, not basic auth. QC 61.6 s | ❌ 401 without the proxy, 422 with it (host paths) | not run |
| Sprocket v0.33.0, S3 | ✅ QC 12.3 s | ❌ last page's `next_page_token` is the string `"None"`, which 400s when sent back; tag filter ignored | not run |
| py-tes 1.1.4 (generic SDK), http in/out | ✅ all probes: argv intact, redirects followed, glob and directory outputs, PUT uploads. 12.1 s | ❌ `UnmarshalError` on every `get_task` (non-spec `author` field). With a workaround: `http://a//b` becomes `http:/a/b`, a redirect saved as an empty input, globs 400, outputs multipart POST only | ❌ same, plus empty stdout, flattened directories |
| GA4GH conformance (`openapi-test-runner` `bc3eb911`) | 1.0.0: 119 pass; 1.1.0: 187/187 | 1.0.0: 119 pass; 1.1.0: 159 pass, 4 fail (`ignore_error`, tag filter, optional output type, `backend_parameters`) | not run |

Root causes on tesp-api, with source lines in the evidence README: input URLs must be s3, ftp or http(s), so a bare path or `file://` is rejected (`tesp_api/repository/model/task.py:45`, outputs `:74`), and stage-in runs in a curl container that couldn't read a host path anyway; wildcard outputs refused (B&E 41); `command: List[Path]` rewrites arguments (B&E 21, `task.py:109`); `curl -f -o` without `-L` (B&E 40); http outputs only as multipart POST, which fits Galaxy's job files API and nothing generic; the `"None"` page token. Each tesp-api task also costs 9–15 s of overhead against Funnel's 1–2 s.

Two caveats on the consumers' side. Snakemake's TES plugin sends no TES inputs or outputs at all (it pip-installs its S3 plugin inside the task and stages itself), and it crashes with `KeyError: 'GITHUB_WORKSPACE'` on any failed task, on every server. Cromwell's TES backend has no basic auth, so it can't talk to the basic-auth Funnel or tesp-api the demo runs without a proxy.

**What this means.** TES interop is real on Funnel: five consumers ran the pipeline, and it passes both conformance suites. On tesp-api it is narrow: outside Galaxy, its realistic users are Nextflow pipelines without glob outputs (most nf-core modules use globs) given an S3 store, and Snakemake, which only uses TES as a container launcher. tesp-api's clean TES 1.0 conformance result says little: the suite doesn't exercise storage URLs, globs, tag-filtered paging or extra response fields, which is where consumers broke. Stage 1 predicted "Nextflow and Snakemake won't work on tesp-api"; that was too pessimistic for the patched fork (its S3 presigning works) and right for upstream.

The design A tasks Galaxy itself sends ignore TES storage entirely (no TES inputs or outputs, Pulsar moves files over HTTP), so a TES server being good for Galaxy says nothing about it being good for anyone else, and the reverse. Design B is the first Galaxy runner that uses TES storage the way other consumers do; it worked on Funnel and TESK, and on tesp-api only for fixed FILE outputs.

## Downsides of these APIs against Galaxy's own

### WES against the invocation API

| Downside | Measured |
| --- | --- |
| It doesn't replace the native API | 5 native calls per QC run and 6 per hyphy run, in every one of the 56 passing runs. All setup (user, API key, tool install) is native-only. |
| Time to outputs | 290–322 s end to end against 44–57 s native, same Galaxy and runner; 240 s of the WES time is DRS `Retry-After` waits. With a job cache hit: 248 s against 5 s. |
| Calls | 21 non-poll calls against 9 for the same outputs. |
| State you can't trust | `COMPLETE` in at least four kinds of failed run: failed + paused jobs, a uid failure, silently lost discovered outputs, and 4 of 12 jobs run. The native API shows job states in one `/completion` call. |
| Missing capabilities | 12 of the 36 matrix rows are ❌ for WES and 15 more ⚠️; native is ❌ on one row, which WES shares (`src: dce` inputs). The ❌ rows include collection elements, per-job state, subworkflow jobs, provenance, reruns, reports, metrics, step parameters and setup. WES exposes 4 of the invocation API's options (`history_id`/`history_name`, one object store, `use_cached_job`). |
| Spec drift | 455 schema violations in 38 of 67 responses against WES 1.1.0; four real clients broken by them. |
| Bugs found in normal use | 9 WES/DRS bugs in about 60 runs (PTI 10–16, 22, 24); 5 fixed on a branch, none upstream. No upstream test covers URL inputs, `use_cached_job`, anonymous reads or DRS resolution. |
| DRS dependency | Without Celery, DRS never serves an object. With private-by-default datasets, DRS refuses even the owner. |
| No interop on the workflow side | Only Galaxy workflow types run, and no other WES server runs them (RESEARCH 5.1). |

### TES against Pulsar REST and AMQP

| Downside | Measured |
| --- | --- |
| Per-job overhead | Design A: two staging executors cost 15.6–19 s per job, 4–6 × the tool's own 3–8 s, for 26–28 s `queued` → `ok` against 11–17 s on the local runner and 13–18 s for design B. TESK: 62–67 s per short job. |
| Moving parts | Design A on Funnel: Galaxy, Celery, RabbitMQ reachable from tasks, Funnel, a self-built staging image; 3 containers per job. On tesp-api add MongoDB, an outer Pulsar with the Docker socket, a cleanup job and a watchdog: two Pulsars per job. Pulsar REST: one Pulsar, one container per job. |
| Credentials | Design A puts the broker password and the job key in task arguments, readable by anyone who can read tasks; TESK ran with no auth at all, because Pulsar can't send the OIDC tokens it requires. |
| Size ceiling | 108 inputs per job (`MAX_ARG_STRLEN`), 1,244 with the compact-launch branch. Pulsar REST and AMQP have no such limit. |
| Silent data loss | Galaxy's default staging image drops discovered outputs: job `ok`, run `COMPLETE`. |
| Hangs | Stock Galaxy leaves a job `queued` forever if a task dies before Pulsar reports, and loops forever cancelling an ended TESK task. |
| Lost Galaxy features | `GALAXY_SLOTS=1` always under design A; no walltime or resubmission on limits; Singularity can't use the local staging image; design B has no remote metadata (6–7 s per job locally) and returns only the core metrics plugin's files. |
| Maintenance | No CI anywhere runs a TES path (Galaxy's TES tests are skipped, Pulsar's tox excludes TES). It took 50 tracked items, 9 Pulsar branches, 3 Galaxy branches and 17 tesp-api patches to make design A reliable on three servers. |
| tesp-api in particular | Adds nothing for Galaxy over `PulsarRESTJobRunner` (same Pulsar, same outputs, fewer parts), and 9–15 s of overhead per task for other consumers. Its upstream is quiet since 2026-02; its authors don't run it in production. |

### Where the standard APIs do win

Give these their due:

- **Portability of client code.** Submit, status, list, cancel and tasks needed zero native calls. A portal or gateway that already speaks WES gets those for free once the small Galaxy fixes land, and four real clients got to a COMPLETE run with small workarounds.
- **One request.** WES imports an inline workflow, materializes URL inputs and starts the run in one multipart POST. Native needs two calls.
- **Discovery.** A public service-info lets registries and portals find Galaxy as a workflow engine next to Cromwell, Toil and Sapporo.
- **TES gives Galaxy access to compute it doesn't run.** Design A works unchanged on Funnel, TESK and tesp-api, and design B works on Funnel and TESK with spec-following tasks and per-file credentials. That is the one place where a GA4GH API lets Galaxy do something its own APIs can't: use a TES service run by someone else, without installing Pulsar there.
- **Funnel is a good TES server.** Five non-Galaxy consumers ran on it and it passes both conformance suites, so a site running Funnel for Galaxy gets a TES endpoint other tools can really use.

## When WES or TES is still worth supporting

**WES**, if any of these is true:

- A funder, federation or project requires a GA4GH WES endpoint (ELIXIR, NIH cloud platforms, GA4GH Driver Projects). Galaxy already has one; keeping it honest costs a few small fixes, and switching it off would cost more goodwill than maintaining it.
- A WES-speaking portal or gateway wants to list Galaxy beside other engines: the ELIXIR Cloud components, proWES, Dockstore's launcher. Stage 7 showed these get to a COMPLETE run with small changes, but only for Galaxy workflows on a Galaxy that has the tools installed.
- Headless launch of registry workflows (Dockstore or WorkflowHub TRS → Galaxy WES), the case mvdbeek raised in the PR discussion for BRC. The Dockstore CLI run is a proof of concept.

None of these needs more than the "keep it honest" fixes. None of them is a reason for Galaxy developers or Galaxy's own clients (the UI, planemo, BioBlend, gxy-wes demos) to use WES: the native API is faster, does more and tells the truth about failures.

**TES**, if any of these is true:

- Galaxy needs to run jobs on compute it doesn't control, offered only as TES: an ELIXIR node's TESK (stage 1 found a planned ELIXIR Node NL TESP deployment with LS Login, upstream tesp-api issues #61–#63), a Funnel at a partner institute (the ELIXIR On-Cloud registry listed one at BIH), or a cloud provider's TES. This is the real upside of the whole investigation. It needs design B, or design A with the credentials fixed, plus OIDC bearer auth in Pulsar's or Galaxy's TES client, because those services authenticate with LS Login tokens.
- A site wants one compute endpoint shared by Galaxy and Nextflow/Cromwell/Sprocket users. Then run Funnel (or TESK), not tesp-api.
- Not: a Galaxy-only site with its own cluster. Pulsar REST or AMQP, or Galaxy's native Kubernetes and batch runners, do the same with fewer parts.

## Recommendations

**Maintain and land**, because they fix real bugs whatever happens to WES and TES:

1. Publish a current staging image and change Galaxy's default (D9), after landing the six-branch Pulsar coexecution stack. Galaxy's default image loses discovered outputs today on every coexecution runner, Kubernetes and GCP Batch included.
2. Pulsar `queued_manager_monitor_kwarg` and `clean_job_directory_retry`: `queued_python` ignores `num_concurrent_jobs` for every Pulsar user, and `clean()` races any cancelled job.
3. Pulsar PR #554, now with evidence that it fixes the container leak on cancel for Docker-socket Pulsar deployments (D5).
4. Galaxy `tes_task_state_polling` and `tes_task_state_polling_unreachable`: without them a dead TES task hangs its job forever. Plus `coexecution_compact_launch` (108 → 1,244 inputs).
5. Galaxy `wes_api_fixes_26_0` (five bugs, on `release_26.0`), the narrowed WES state rule (D3), and the job files API 404 backport (D7).
6. The cheap WES "honesty" fixes listed under D14, which would let real third-party clients work: fill or omit null fields, list collection elements with DRS URIs, accept `gxformat2`/`GALAXY`, fix DRS.

**Decide later, only with a concrete user:** design B (D2). It is the right shape for running on someone else's TES: no broker, no staging image, per-file credentials, faster on Funnel, and it uses TES storage the way other consumers do. Build it properly (port to `dev`, OIDC auth, live recovery test, object stores) when a real TES deployment wants Galaxy jobs. Until then the prototype branch is a reference.

**Stop investing in:**

- tesp-api for Galaxy. Don't recommend it to Galaxy deployers (D8); don't push the patch series anywhere unless someone asks (D1).
- WES features beyond the honesty fixes: CWL/WDL support, TRS inside WES, a WES-specific UI, more engine parameters. Galaxy users and tools should use the native API.
- The DRS 60 s wait as a design: fix it as part of the honesty fixes or document that DRS isn't for bulk output retrieval.
- Running design A against shared TES services before its credentials problem is solved. Its current form is fine on a TES server the Galaxy admin controls, not on one others can read.

**Keep, cheaply:** the demo repository and `make acceptance`, as the only TES regression test that exists. A CI job running one Funnel scenario would protect most of what was fixed here.

**Testing John's view.** It holds for WES, with one adjustment. WES on Galaxy adds no capability, is slower to use, and reports failed runs as successful; only Galaxy runs Galaxy workflows, so WES-level interop is limited to launching Galaxy workflows from generic tools, and stage 7 showed that even that needs client patches today. The adjustment is that the integration cost for those generic launchers turned out to be small and mostly on Galaxy's side, so keeping the endpoint honest is cheap and worth it for federation and funder reasons. On TES the view needs more nuance: TES isn't a better way for Galaxy to run its own jobs (Pulsar is), and tesp-api adds nothing, but TES is the one GA4GH API that lets Galaxy reach compute it doesn't own. That is a real upside, it just isn't realized by design A as it ships.

## Index: branches, records and decisions waiting on John

Hardened 2026-11-15 (after stage 7): the Pulsar branches are open as draft PRs on `galaxyproject/pulsar`; the Galaxy branches are hardened on the `jmchilton` fork with no PRs, and the dev-targeted ones were retargeted to `release_26.2`. tesp-api changes are patch files in `demo:patches/tesp-api/`. "Rec." is this document's recommendation (see [Recommendations](#recommendations)); branch records hold the current state.

### Galaxy (`vault/repositories/galaxy/branches/active/`)

| Branch | Base | Head | Queue section | What | Rec. |
| --- | --- | --- | --- | --- | --- |
| [`tes_task_state_polling`](../../repositories/galaxy/branches/active/tes_task_state_polling/index.md) | `release_26.2` | `54d2aa613df` | `branches_implemented_needs_ci` | Pulsar TES runner polls TES and fails jobs whose task ended without a Pulsar status; ignores late statuses for finished jobs; cancelling an ended task is a no-op; watches keyed by TES server and task id (PTI 1, 30) | Upstream |
| [`tes_task_state_polling_unreachable`](../../repositories/galaxy/branches/active/tes_task_state_polling_unreachable/index.md) | `tes_task_state_polling` | `766334a203e` | `branches_need_decision` | `tes_unreachable_timeout` and cancel retries (B&E 12, 13); the SYSTEM_ERROR job info moved to the parent | Decide: timeout policy and PR split |
| [`wes_api_fixes_26_0`](../../repositories/galaxy/branches/active/wes_api_fixes_26_0/index.md) | `release_26.0` | `67305c6d0a1` | `branches_implemented_needs_ci` | WES request bugs (PTI 10–13, 22), plus null outputs in the native invocation API, `next_page_token: ""`, encoded ids, `auth_instructions_url`; original scope kept as `wes_api_fixes_26_0_alt_original_scope` | Upstream |
| [`wes_run_state_executor_error_26_0`](../../repositories/galaxy/branches/active/wes_run_state_executor_error_26_0/index.md) | `wes_api_fixes_26_0` | `ec656e83ae7` | `branches_need_decision` | EXECUTOR_ERROR for completed runs with failed or paused jobs (PTI 5); scope evaluation prefers it to D3's output rule | Decide (D3) |
| [`tes_native_staging`](../../repositories/galaxy/branches/active/tes_native_staging/index.md) | `tes_task_state_polling` | `88d6414a6dc` | `branches_need_decision` | Design B ported to `release_26.2` and hardened; scope evaluation says park, moving only the MINIMAL-view poll commit into the parent | Decide (D2) |
| [`tes_native_staging_v26.1.2`](../../repositories/galaxy/branches/active/tes_native_staging_v26.1.2/index.md) | `tes_task_polling_v26.1.2` | `5e889591314` | `branches_reference` | Original design B prototype, superseded by `tes_native_staging` | Reference |
| `tes_task_polling_v26.1.2`, `wes_api_fixes_v26.1.2`, `wes_tes_demo_fixes_v26.1.2` | tag `v26.1.2` | `1f7cae33d5f`, `2aad3a3e80c`, `b317bc12545` | no record (demo only) | Ports the demo runs on | Keep for the demo; never PR |

### Pulsar (`vault/repositories/pulsar/branches/active/`): one stacked set of draft PRs plus two standalone ones

| Branch | Stacked on | Head | PR | What | Rec. |
| --- | --- | --- | --- | --- | --- |
| [`coexecutor_image_modern_base`](../../repositories/pulsar/branches/active/coexecutor_image_modern_base/index.md) | `master` | `acde50a` | [#577](https://github.com/galaxyproject/pulsar/pull/577) | Staging image builds current Pulsar on python:3.12-slim (PTI 4); pycurl folded in | Upstream, then publish an image (D9) |
| [`coexecution_publish_running`](../../repositories/pulsar/branches/active/coexecution_publish_running/index.md) | #577 | `1a741aa` | [#578](https://github.com/galaxyproject/pulsar/pull/578) | `pulsar-submit --no-wait` publishes `running` (PTI 7) | Upstream |
| [`coexecution_stage_failures`](../../repositories/pulsar/branches/active/coexecution_stage_failures/index.md) | #578 | `1302eea` | [#579](https://github.com/galaxyproject/pulsar/pull/579) | Staging failures exit non-zero with the error (PTI 3) | Upstream |
| [`coexecution_dependency_dir_default`](../../repositories/pulsar/branches/active/coexecution_dependency_dir_default/index.md) | #579 | `e770845` | [#580](https://github.com/galaxyproject/pulsar/pull/580) | No tool dependency dir by default, starts on a read-only root (PTI 9) | Upstream |
| [`coexecution_client_fixes`](../../repositories/pulsar/branches/active/coexecution_client_fixes/index.md) | #580 | `77651c5` | [#581](https://github.com/galaxyproject/pulsar/pull/581) | Default image tag that exists; TES `QUEUED` maps to queued (PTI 26) | Upstream |
| [`coexecution_stage_out_failures`](../../repositories/pulsar/branches/active/coexecution_stage_out_failures/index.md) | #581 | `24006de` | [#582](https://github.com/galaxyproject/pulsar/pull/582) | Stage-out errors reach Galaxy; directory outputs fail; terminal status survives shutdown (PTI 6, 8, 31) | Upstream |
| [`coexecution_compact_launch`](../../repositories/pulsar/branches/active/coexecution_compact_launch/index.md) | #582 | `869d63d` | [#583](https://github.com/galaxyproject/pulsar/pull/583) | zlib launch message over one argument: 108 → 1,244 inputs (B&E 9) | Upstream (D10 a) |
| [`queued_manager_monitor_kwarg`](../../repositories/pulsar/branches/active/queued_manager_monitor_kwarg/index.md) | `master` | `b476ccd` | [#575](https://github.com/galaxyproject/pulsar/pull/575) | `queued_python` honours `num_concurrent_jobs` (`montior` typo since 0.15.0) (B&E 15) | Upstream, regardless of TES |
| [`clean_job_directory_retry`](../../repositories/pulsar/branches/active/clean_job_directory_retry/index.md) | `master` | `1c8d911` | [#576](https://github.com/galaxyproject/pulsar/pull/576) | `clean()` retries a directory a just-killed job is still changing (B&E 50) | Upstream, regardless of TES |
| [`coexecutor_image_pycurl`](../../repositories/pulsar/branches/active/coexecutor_image_pycurl/index.md) | `master` | `4ccfb64` | none | Superseded, in `branches_need_decision` | Abandon (D4) |

CI on all nine Pulsar PRs: green except `Framework tests / Test (3.10, master, directory)`, which also fails on `master` (unrelated).

### tesp-api and the demo

- tesp-api: local branch `galaxy-wes-tes` (`d72420fd3ffe`, 17 commits on mirelaminkova `main` `c3a9f237`), exported as `demo:patches/tesp-api/0001`–`0017`, deterministic build `c5ca66a2`. Pushed nowhere.
- Demo repository: `~/projects/repositories/galaxy-wes-tes`, local git, `main` at `1ee816e` (stage 7). No remote, by the brief.

### Decisions waiting on John

From [`BUGS_AND_ENHANCEMENTS.md`, "Needs John's decision"](../wes_tesp_api/BUGS_AND_ENHANCEMENTS.md#needs-johns-decision), plus what this stage adds:

| # | Decision | Recommendation here |
| --- | --- | --- |
| D1 | Where the tesp-api patches go: mirelaminkova fork, CESNET upstream, or nowhere | Nowhere active. Offer them to the fork only if someone asks for tesp-api support (see D8). |
| D2 | Design A, design B, or both | Land A's fixes now (they also fix Kubernetes and GCP Batch coexecution). Build B only if Galaxy wants to run on other people's TES (see [When WES or TES is worth it](#when-wes-or-tes-is-still-worth-supporting)). |
| D3 | WES state for completed runs with failed or paused jobs | EXECUTOR_ERROR when a workflow output is in `error` or `paused`, on `dev`. |
| D4 | Abandon `coexecutor_image_pycurl` | Abandon. |
| D5 | Pulsar kill semantics for socket-started containers | Land the open Pulsar PR #554: stage 7 showed it stops the container 2–3 s after a WES cancel on direct Pulsar (2 of 2, against 115 s without it). Not tested behind tesp-api, where the patched watchdog already covers it. PR #555 (job-script EXIT trap) wasn't tested. |
| D6 | tesp-api's `List[Path]` argument model | Only matters if D1 is the fork. |
| D7 | Backport the job files API 404 for a missing input to 26.x | Backport: it turns an empty input into an error on every Pulsar and TES path. |
| D8 | Recommend tesp-api to Galaxy deployers at all | No for Galaxy-only sites; for shared-TES sites, Funnel or TESK serve other TES clients far better (see [Interop reality](#interop-reality)). Keep the patch series as documentation only. |
| D9 | Publish a current staging image and change Galaxy's default | Yes, first. The single most valuable outcome: the default image loses data today. |
| D10 | How the launch message reaches the task under design A | Compression now (`coexecution_compact_launch`); fetch-by-key only if A stays the main path. |
| D11 | `tes_unreachable_timeout` semantics | Keep the current rule with the cancel retry. |
| D12 | Executor label for single-log TES servers | Low stakes; keep the simple message. |
| D13 | Pulsar's 403-on-upload rule | Keep (harmless to Galaxy's state) unless a Galaxy 409 is wanted anyway. |
| D14 (new) | What to do with Galaxy's WES API itself | Keep it, fix it cheaply, stop there: land `wes_api_fixes_26_0` and D3; fill `request` and `run_log`, omit null optional fields, list collection elements with DRS URIs, accept `gxformat2`/`GALAXY` as "detect the type", fix DRS (resolvable host, no 60 s wait, owners can read private datasets). Those are the changes that would let the four third-party clients tested in stage 7 work unmodified. No CWL, TRS-in-WES or engine work. Point developers at the native API in the WES docs. |
| D15 (new) | Whether to document or advertise Galaxy's TES runners | Document the Pulsar TES runner as experimental until polling is merged, a current staging image is published and some CI runs a TES path. Don't advertise TES as a Galaxy deployment option before then. |
