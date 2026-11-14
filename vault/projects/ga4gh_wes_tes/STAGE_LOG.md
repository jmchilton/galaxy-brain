# Stage log

One section per stage, appended by the stage's agent. Newest last.

## Stage 1: research (2026-11-14)

Output: [`RESEARCH.md`](RESEARCH.md). The research was split across five nested subagents (Opus, effort high): Galaxy WES, the Pulsar TES runner, tesp-api, TES servers plus interop, and IWC candidates. The coordinator rechecked the load-bearing claims against source.

What was done:

- Read Galaxy at `65e6daff233` (dev, 2026-10-30) and compared it with `origin/dev` `a6ed8bfdf9d` after a `git fetch` (the checkout state was not changed). Read Pulsar at `08dedcb9` (`0.16.0-69`).
- Cloned `~/projects/repositories/tesp-api` (upstream `3d470f76`, release 0.2.0; fork remote `mirelaminkova` at `c3a9f237`), `~/projects/repositories/cesnet-usegalaxy` (`1b87ceb6`), and `~/projects/repositories/iwc` (shallow, `c07557fb`).
- Pulled `galaxy/pulsar-pod-staging:0.15.0.2` and inspected it; the image is still on the machine. Ran `docker manifest inspect` on candidate tool images and on the Funnel, TESK and tesp-api images. Ran Galaxy's mulled resolver read-only. No services were started, and no containers are left running.

Main findings:

- Galaxy WES has been in releases since v26.0.0. Use v26.0.2 or later: before that, a finished run reported `UNKNOWN` instead of `COMPLETE`.
  - The submit body must be multipart or urlencoded form data.
  - It accepts only Galaxy workflow types.
  - The code accepts URL and CWL-style `File`/`Collection` inputs in `workflow_params`, but no test covers them.
  - A run whose jobs failed still reports `COMPLETE`.
  - The vault note [[PR 21335 - GA4GH WES API]] is out of date on several points.
- The Pulsar TES runner needs an AMQP broker that both Galaxy and the task containers can reach, and it never polls TES.
  - Neither Galaxy CI nor Pulsar CI runs TES.
  - The default staging image dates from 2023 (Pulsar 0.15.0.dev1). With Galaxy's pulsar-galaxy-lib 0.16.0 it silently drops `discover_datasets` outputs (`docs/compatibility.rst`).
  - Pulsar's own default image tag (`0.15.0.0`) doesn't exist.
- tesp-api runs Galaxy's stock `PulsarTesJobRunner` tasks through an outer Pulsar REST server. It is development-grade and quiet upstream since 2026-02, with an active third-party fork. Its AMQP mode, S3/FTP outputs and cancel don't work as documented. A task can't run longer than about 27 minutes by default.
- Funnel v0.12.3 (host binary) is the TES server for the demo. TESK needs Kubernetes, which isn't installed here.
- No non-Galaxy WES server runs Galaxy workflows. `wes-client` and probably the Dockstore CLI can't drive Galaxy WES.
- Demo workflow: IWC `short-read-qc-trimming` (fastp + MultiQC, `list:paired` input, about 44 MB of Zenodo data). Both containers are confirmed, and it avoids the discovered-outputs bug.

Not verified (left for stage 2): everything in RESEARCH.md marked inferred, in particular WES URL inputs, the Funnel config, the networking from task containers back to Galaxy and RabbitMQ, and tesp-api's handling of long launch messages.

Security: the subagents wrote private notes outside the repository, as the brief requires. Nothing sensitive is in RESEARCH.md.

## Stage 2: working demo (2026-11-14)

Output: the demo repository `~/projects/repositories/galaxy-wes-tes` (local git, `main` at `c7b72cc`). Start with its `README.md`; `docs/` has one page per component plus `troubleshooting.md` and `evidence.md`. Nested subagents (Opus, effort high) did Galaxy setup, the TES side (RabbitMQ, Funnel, staging image), the WES client, the Pulsar running-status fix and the docs. The coordinator did the integration, ran the evidence runs and checked the results against Galaxy's database and Funnel.

What works:

- Chain: WES client → Galaxy v26.1.2 WES → invocation → `PulsarTesJobRunner` → RabbitMQ 4.3.7 → Funnel v0.12.3 → Pulsar staging image plus biocontainers.
- Workflow: IWC `short-read-qc-trimming` (fastp + MultiQC), using IWC's own Zenodo test data.
- It passed three times: runs `b2563e46ebf0c519`, `46e59ec8766b06a0` and `67193f7b00dd0f8d` under `runs/2026-11-14-*`. Runs 2 and 3 came after `make down && make up && make run`.
- Every tool job went to TES. `tes-evidence.txt` in each run ties each WES task to its Galaxy job row (`job_runner_name`/`destination_id` `pulsar_tes`, `job_runner_external_id` = the Funnel task id) and to a COMPLETE Funnel task named `pulsar-<job id>`. Each such task has three executors that exited 0: `pulsar-submit`, the biocontainer, `pulsar-finish`.
- Outputs were checked against the IWC tests' assertions with galaxy-tool-util 26.1.2. The fastp outputs are byte-identical across the three runs.
- Submit, status, tasks and cancel used only WES. Outputs came through DRS.
- Galaxy-native calls during the run: 5 (2 collection listings, 3 element `drs_id` lookups), because WES gives collections no elements and no DRS URIs.
- Setup used only native APIs: user and API key, Tool Shed install via ephemeris 0.10.11, liveness. WES has no equivalent for these.
- The IWC tests' `job:` block works unchanged as `workflow_params`: CWL-style `Collection`/`File` URL inputs are dereferenced by Galaxy with no job. This answers RESEARCH 1.3.
- WES cancel reaches TES: the MultiQC Funnel task was CANCELED 4 s after `POST /runs/{id}/cancel`.

Fixes and workarounds:

- Pulsar branch `coexecutor_image_modern_base` (`1138cd0`, pushed to jmchilton): rebuilds `docker/coexecutor` on `python:3.12-slim`, because the old Dockerfile can't build current Pulsar. Also sets `PULSAR_CONFIG_TOOL_DEPENDENCY_DIR` so the image starts on a read-only root.
- Pulsar branch `coexecution_publish_running` (`07051ab`, child of the above, pushed): `pulsar-submit --no-wait` now publishes `running`. Before it, Galaxy showed TES jobs as queued → ok, the same symptom as tesp-api #46. Run 1 shows the old behavior, runs 2 and 3 the fixed one.
- Records: [`coexecutor_image_modern_base`](../../repositories/pulsar/branches/active/coexecutor_image_modern_base/index.md), [`coexecution_publish_running`](../../repositories/pulsar/branches/active/coexecution_publish_running/index.md), both in `branches_implemented_needs_ci` (fork CI: pulsar green, Framework tests still running).
- Staging image: `wes-tes/pulsar-pod-staging:0.16.1.dev0-07051ab` (local only), built by `scripts/build-staging-image.sh`.
- Galaxy needed no code change. Config-level choices:
  - `dependency_resolution: none`, because v26.1.2 lacks `19f8286868d`.
  - Templated job conf so credentials stay out of git.
  - A Celery worker, because DRS returns 202 forever without one.
  - Celery with `worker_enable_remote_control: false` and `--without-mingle --without-gossip`, because RabbitMQ 4.3 refuses transient non-exclusive queues.
- Funnel: basic auth, because it listens on all interfaces. `--read-only` is dropped from the run template, and containers are capped at 2 CPUs / 4 GB. Concurrency is limited in Galaxy, because Funnel's local backend has no scheduler.

Versions: Galaxy `v26.1.2` `391641a4` (worktree `~/projects/worktrees/galaxy/branch/wes_tes_v26_1_2`, local branch, not pushed), Python 3.12.16, pulsar-galaxy-lib 0.15.15, pydantic-tes 0.4.0, kombu 5.6.2. Funnel v0.12.3 `738ab75a`, tarball sha256 `60ab4f8d…`. RabbitMQ `4.3.7-management@sha256:8e913a77…`. fastp `iuc/fastp@4990e6f1348f` → `quay.io/biocontainers/fastp:1.4.0--h43da1c4_0`, MultiQC `iuc/multiqc@94b6bea727ae` → `mulled-v2-8374e50c…:783e4c36…-0`. IWC `c07557fb`. Full table in the repository README.

Doesn't work or wasn't tested:

- Galaxy WES issues seen (reproductions in the repository's `docs/troubleshooting.md`):
  - `use_cached_job` as a JSON boolean gives a 500.
  - Run-scoped endpoints give a 500 instead of 401/403 without a key.
  - Failed submissions leave a workflow and history behind.
  - Cancel turns a COMPLETE run into CANCELED.
  - COMPLETE is reported with failed or paused jobs.
  - Integer inputs aren't validated (`"abc"` is accepted).
  - Omitted optional params come back as `{"__class__": "NoReplacement"}`.
  - DRS URIs name an unresolvable `drs.<host>`, need one 60 s Retry-After per object even with Celery, and refuse private datasets even to their owner.
  - service-info `auth_instructions_url` is `"TODO"`.
- Untested:
  - concurrent TES jobs;
  - a tool with discovered outputs through the new image;
  - containerless (Conda) jobs;
  - biocontainers under Funnel's `--read-only`;
  - Galaxy's behavior when stage-in fails under `07051ab`.
- A TES task that dies before Pulsar publishes leaves the Galaxy job queued forever, because Galaxy doesn't poll TES.

Services: stopped at the end of the stage (`make down`; `scripts/status.sh` shows all stopped). `make up && make run` brings everything back and reruns the demo in about 7 minutes (1 for `make up`, about 6 for `make run`, of which 4 are DRS Retry-After waits); images and the Galaxy venv are kept.

Security: private notes exist outside the repositories, as the brief requires. Nothing sensitive is in the demo repository or the vault.
