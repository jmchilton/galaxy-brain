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

## Stage 3: review, second TES backend, gap tests, fixes (2026-11-14)

Outputs: the demo repository `~/projects/repositories/galaxy-wes-tes` (local git, `main` at `7a2d41f`), and [`PULSAR_TES_IMPROVEMENTS.md`](PULSAR_TES_IMPROVEMENTS.md), a prioritised list of 32 bugs and missing features with evidence, fix sketches and status. Nested subagents (Opus, effort high) did the cold docs review, the fresh-clone bring-up, the Pulsar branch review, TESK, the gap tests and each fix; the coordinator checked their results, fixed two CI-only test failures and wrote the improvements list.

What was done:

- **Fresh eyes.** An independent agent read the docs cold (findings P1–P3). Another cloned the repository to a second path and followed only the README. It fixed what broke: absolute paths (`DEMO_ROOT` derived, settings in `local.env`, `galaxy.yml` rendered from a template, Galaxy checkout defaulting to `vendor/galaxy`), unpinned build inputs (staging image base and busybox by digest), secrets in process arguments and world-readable runtime files (`var/` 0700), and teardown (`make clean`, preflight and container-reachability checks). Two runs from the fresh clone passed, before and after `make down && make up`.
- **Security.** The cold review found a broker password in a committed "redacted" evidence file. It was redacted (demo commit `80d7ea9`) and the password rotated; the repository has no remote. Details are in private notes outside the repositories.
- **Second TES backend: TESK** (chart 0.3.0, tesk-api 1.2.0, taskmaster 0.11.0) on a single-node kind v0.33.0 cluster (node v1.37.0, kubectl v1.37.2, Helm v3.22.1, all pinned by sha256 in `config/tesk/tesk.env`). `make up TES=funnel|tesk` selects the backend; `docs/tesk.md` covers configuration, networking, storage, auth and quirks. Both IWC workflows pass on TESK with no Galaxy or Pulsar code change, only job conf.
- **Gap tests** (`docs/gap-tests.md`, evidence under `runs/gaps/`): discovered outputs, concurrency, tasks that die before Pulsar reports, stage-in and stage-out failures, WES cancel mid-run, and a second, bigger IWC workflow (`hyphy-preprocessing`: 39-element URL list input, 12 TES jobs, a discovered collection, map-over).
- **Fixes**, each with a test that fails without it, pushed to the `jmchilton` forks (no PRs):
  - Galaxy `tes_task_state_polling` (base `dev`, `e3c0cc44649`): the TES runner polls TES and fails jobs whose task ended without a Pulsar status; cancelling a task that already ended is a no-op. Demo port `tes_task_polling_v26.1.2` (`6baaaec7486`).
  - Galaxy `wes_api_fixes_26_0` (base `release_26.0`, `85f9b2b42be`): five WES bugs. Demo port `wes_api_fixes_v26.1.2` (`2aad3a3e80c`). Galaxy `wes_run_state_executor_error_26_0` (`d83962aa811`, needs decision): EXECUTOR_ERROR for completed runs with failed or paused jobs. Combined demo branch `wes_tes_demo_fixes_v26.1.2` (`9f5084721b6`).
  - Pulsar, stacked on stage 2's two branches: `coexecution_stage_failures` (`a3f8c72`), `coexecution_dependency_dir_default` (`e90a555`), `coexecution_client_fixes` (`75185ac`), `coexecutor_image_pycurl` (`4ccfb64`, the branch review's P1), `coexecution_stage_out_failures` (`3b2cde8`). Stage 2's `coexecutor_image_modern_base` (`1138cd0`) and `coexecution_publish_running` (`07051ab`) got `review.md` files.
  - Records under `vault/repositories/{galaxy,pulsar}/branches/active/`, lines in both `MY_BRANCHES.md`.

What works, with evidence (all in the demo repository):

- IWC short-read QC through WES on Funnel and on TESK with the current staging image `wes-tes/pulsar-pod-staging:0.16.1.dev0-53f91f1` (id `sha256:9314ab4d…`): `runs/2026-11-14-9da1c5702ebec70c/` (Funnel) and `runs/2026-11-14-46d0cd030901e24d/` (TESK), both PASS against the IWC assertions, every tool job on TES. Earlier TESK runs `runs/2026-11-14-a9c9898b43e9b34b/` and `runs/2026-11-14-b49705f64be28a1e/` (the latter after deleting and recreating the cluster). fastp outputs are byte-identical across all runs and both backends.
- IWC hyphy-preprocessing: PASS on Funnel (`runs/gaps/iwc-hyphy/`) and TESK (`runs/gaps/iwc-hyphy-tesk/`).
- Discovered outputs: Galaxy's default image `galaxy/pulsar-pod-staging:0.15.0.2` drops them silently (job `ok`, empty collection, missing dataset); the new image keeps them (`runs/gaps/discovered-outputs/`).
- Concurrency: 4 TES tasks at once and three simultaneous WES runs, no mixed-up statuses (`runs/gaps/concurrency/`).
- Dead tasks: stock Galaxy leaves the job `queued` forever; the polling branch fails it 36–46 s after the task ends, on Funnel and TESK (`runs/gaps/tes-dies-early*/`).
- Stage-in failure fails the job in 6–8 s with the error in its stderr; stage-out failures and outputs written as directories now fail the job with a reason (`runs/gaps/stage-in-failure/`, `runs/gaps/stage-out-failure-53f91f1/`).
- WES cancel mid-run: CANCELED within 2 s, TES task cancelled, no containers left (`runs/gaps/wes-cancel*/`). On TESK a cancel of an already-ended task looped Galaxy's stop queue forever on stock v26.1.2; fixed on the polling branch (`runs/gaps/cancel-finished-task-tesk-fixed/`).
- The WES fixes: the stage 2 probes no longer reproduce bugs 1–4 and 6 on `wes_tes_demo_fixes_v26.1.2` (`runs/gaps/wes-fixes/`).
- Timing: TESK adds about 17 s per job (one pod per executor): fastp 41 s against 23 s on Funnel; hyphy 3 min 46 s against 1 min 41 s. Memory during TESK runs: host at most 8.1 GB used, kind node 1.2–1.9 GiB.

Doesn't work or wasn't tested:

- The `1138cd0` commit message is still wrong. John's authorization to amend and force-push arrived mid-stage, but the session's permission settings blocked the amend; the real behavior was re-verified and the proposed message is in the branch record. The Pulsar stack needs one rebase before PRs (fold `coexecutor_image_pycurl` into the base, carry the CI test fix `a3f8c72` into the children, whose fork CI is red on that one test until then).
- Fork CI: Pulsar `pulsar` workflow red on the stack's middle branches for the test fixed in `a3f8c72`; `Framework tests` red on every branch including upstream (unrelated). Galaxy `tes_task_state_polling` had one flaky new test, fixed in `e3c0cc44649` (CI pending at stage end). WES branches green so far.
- Open bugs that matter most (see the improvements list): no published current staging image (Galaxy's default drops discovered outputs), credentials in TES executor arguments, no TES auth Pulsar and TESK share, collection outputs without DRS URIs, DRS 60 s waits, WES COMPLETE with failed jobs (branch awaits a decision), task JSON size against TESK's 256 KiB annotation limit.
- Untested: containerless (Conda) jobs, Funnel's `--read-only` with biocontainers, large files, more than 4 concurrent tasks, RabbitMQ or Galaxy restarts mid-job, a multi-node cluster (pods would need routable addresses for Galaxy and the broker), TESK with OIDC.

Services: everything stopped. `make status` shows RabbitMQ, Funnel, Galaxy and Celery stopped and no TESK cluster; `docker ps -a | grep wes-tes` is empty; `var/tes-backend` is `funnel`. Restart with `make up && make run` (Funnel, about 1 min plus 5–6 min) or `make up TES=tesk && make run` (recreates the kind cluster, about 3 min plus a run). Images, the Galaxy worktrees and venvs are kept; the fresh clone was removed after merging.

Security: private notes exist outside the repositories, as the brief requires. Nothing sensitive is in the demo repository or the vault.

## Coordinator: Pulsar restack (2026-11-14)

John authorized amending and force-pushing his remotes. The coordinator rebuilt the Pulsar stack by cherry-picking onto `a87897c`:

- `1138cd0`'s message was reworded: `pulsar-submit` exits 1, the task ends `EXECUTOR_ERROR`, and the Galaxy job stays queued.
- pycurl (`4ccfb64`) was folded into `coexecutor_image_modern_base`.
- The CI test fix (`a3f8c72`) now runs through the middle branches. The duplicate `3b2cde8` dropped out.
- The new tip `20b6460` has the same tree as the old `3b2cde8`.

The branches were force-pushed with `--force-with-lease`:

| Branch | Old head | New head |
| --- | --- | --- |
| base | `1138cd0` | `c4ae861` |
| publish_running | `07051ab` | `5e3de24` |
| stage_failures | `a3f8c72` | `954ab40` |
| dependency_dir_default | `e90a555` | `ef7caea` |
| client_fixes | `75185ac` | `b31602a` |
| stage_out_failures | `3b2cde8` | `20b6460` |

`coexecutor_image_pycurl` is left at `4ccfb64` on the fork and is in `branches_need_decision` as superseded. The demo repo's `versions.env` now pins `20b6460` and image `wes-tes/pulsar-pod-staging:0.16.1.dev0-20b6460`.

## Stage 4: plan Galaxy WES → tesp-api (2026-11-14)

Output: [`TESP_API_PLAN.md`](TESP_API_PLAN.md). Evidence is in the demo repository (`main` at `e3d3d0f`), under `runs/tesp-probes/`. Three nested subagents (Opus, effort high) did the work:

- TES-level probes of upstream against the fork (`tes-level/`);
- Galaxy's stock runner against tesp-api (`galaxy/`);
- design B feasibility (`design-b/`).

The coordinator built the tesp-api scaffolding, ran the direct-Pulsar comparison (`direct-pulsar/`), checked the subagents' key claims (passing run directories, checksums, the Pulsar `montior` bug in source, the evidence secret scan) and wrote the plan.

What was built:

- `make up TES=tesp`, defined in `config/tesp/` and `scripts/tesp/`. It starts tesp-api, MongoDB 7.0.25 and an outer Pulsar 0.16.0 (docker CLI 29.1.3, Apptainer 1.3.6, host Docker socket), all under unique `wes-tes-<instance>-*` names. tesp-api is published only on `127.0.0.1:18200`, with basic auth.
  - The source comes from a worktree chosen by `TESP_REF=upstream|fork|<commit>`, or from `TESP_SRC`.
  - Python dependencies come from the fork's lock fix `e2ce6ef`, because upstream's `poetry.lock` doesn't import.
- `make up TES=pulsar`, a comparison backend: Galaxy's `PulsarRESTJobRunner` talks straight to the same Pulsar image, with no TES server.
- `scripts/tesp/probes/tes_probes.py`, the TES-level probe suite.
- Evidence scripts and job conf entries for tesp-api.
- Spike branch `spike/stage4-cancel-containers` (`fbcac3f`, on fork `main`) in `~/projects/repositories/tesp-api`; its patch is in `runs/tesp-probes/galaxy/patches/`.

What works, with evidence:

- Stock Galaxy v26.1.2's `PulsarTesJobRunner` runs both IWC workflows through tesp-api with job conf changes only. This holds on upstream `3d470f76` and on the fork `c3a9f237`:
  - QC: `runs/2026-11-14-1ac1a4b1c225b8aa/` (upstream), `runs/2026-11-14-ef6f69e2f7527004/` (fork), `runs/2026-11-14-ac2c0bdd216c6336/` (fixes branch), `runs/2026-11-14-b92ab34803983a54/` (spike).
  - hyphy, 12 jobs: `runs/tesp-probes/galaxy/03-*`.
  - Outputs are byte-identical to the Funnel runs, and timing is the same as Funnel.
- The 39-input job's 100 KB job script went through Pulsar's `command_line` query parameter.
- With the spike, cancel removes the task's container within 6 s and nothing is left behind.
- Galaxy → Pulsar REST directly passes the QC workflow with identical outputs (`runs/tesp-probes/direct-pulsar/02-*`).

What doesn't work:

- **Cancel never stops the container.**
  - Upstream only marks the task CANCELED.
  - The fork cancels the Pulsar job, but Pulsar SIGKILLs the `docker run` client and the container keeps running.
  - The same happens with Galaxy → Pulsar directly.
- **Leftovers:** every executor container and `vol-<id>-*` volume is left.
- **No logs on upstream:** it reads the wrong Pulsar status key. The fork stores the in-task Pulsar log, which contains `job_key`s.
- **Restarts:** a tesp-api restart strands tasks.
- **AMQP mode** fails in 1 s.
- **Auth:** no credentials gives 500.
- **Singularity** can't use the local staging image.
- **Size limits:** one executor argument is limited to 131 071 bytes (`MAX_ARG_STRLEN`) and all arguments together to 2 MiB. So Galaxy jobs with roughly 100 or more inputs can't start on tesp-api, and probably not on Funnel either.
- **Pulsar bug:** `queued_python` ignores `num_concurrent_jobs` (`montior` typo, since 0.15.0).
- **Polling:** the Galaxy polling branch retries forever against a TES server that's gone.

Design B (TES-native staging) is feasible:

- Funnel and TESK upload outputs with a raw PUT. Galaxy accepts only multipart POST, which is what tesp-api sends.
- A fastp spike on Funnel with Galaxy-shaped URLs completed.
- Building it needs a new Galaxy route and runner (one L plus three M). It goes to John.

Recommendation for stage 5: design A+C. That means a tesp-api branch `galaxy-wes-tes` on fork `main` with:

- cancel that removes containers, and cleanup after every task;
- immediate cancel;
- the job script sent as a file;
- restart recovery;
- log redaction;
- 401 instead of 500.

Plus Pulsar `queued_manager_monitor_kwarg`, Galaxy `tes_task_state_polling_unreachable`, `docs/tesp-api.md` and an acceptance run. The fallback is the spike branch.

Services: everything stopped (`make status` all stopped, `var/tes-backend` = `funnel`, no `wes-tes-*` containers, no `vol-*` volumes). The `wes-tes-tesp-mongo` volume is kept.

To restart:

- `make up TES=tesp && make run`, with `TESP_REF=fork` for the fork or `TESP_SRC=$PWD/vendor/tesp-api-spike` for the spike;
- `make up TES=pulsar && make run` for the direct comparison;
- the probe instances, as in `runs/tesp-probes/tes-level/README.md`.

Security: private notes exist outside the repositories, as the brief requires. The evidence was scanned for `.env.local` values, broker URLs and unredacted base64; none were found.

## Stage 5: build design A+C, Galaxy WES → tesp-api (2026-11-14/15)

Output: the demo repository `~/projects/repositories/galaxy-wes-tes` (`main` at `6d8c94e` for the primary goal). Start with `docs/tesp-api.md`. Nested subagents (Opus, effort high) did the tesp-api branch, the Pulsar fix, the Galaxy branch, the demo checks, the acceptance runs and the docs. The coordinator checked their results:

- reran tesp-api's unit suite on the head (856 passed, 1 skipped);
- checked that `git am` of the exported patches onto fork `c3a9f237` gives a tree identical to the head;
- spot-checked the fail-before evidence;
- confirmed the pushes with `git ls-remote`;
- checked the acceptance evidence files.

What was built:

- **tesp-api, local branch `galaxy-wes-tes`** (`4bc9b5d927f8`, 15 commits on fork main `c3a9f237`, worktree `vendor/tesp-api-stage5`). The patches and a per-patch README are in `patches/tesp-api/`. Each change has unit tests in tesp-api's suite that fail without it (`runs/tesp-stage5/unit/`). The suite went from 694 to 856 passing tests.
  - T1: `--rm --label=tesp-api.task=<id>` on every task container, and a cleanup Pulsar job that removes containers and `vol-<id>-*` on every final state.
  - T2: cancel acts at once, through a `cancel_task` event.
  - T3: the job script is uploaded as `tesp_job.sh`, and the job is submitted with `command_line=sh <path>`.
  - T4: restart recovery, cherry-picked from fork `#52`.
  - T5: redaction of `job_key`, URL passwords and long base64 in stored logs.
  - T6: 401 without credentials.
  - T7: one ExecutorLog per executor (fork #64, #66, #67).
  - **Plan change: watchdog.** The cleanup job queued behind busy Pulsar slots, and a cancelled container ran 100 s more. A double-forked `setsid` watchdog in the job script now survives Pulsar's SIGKILL and cleans up within about 3 s. The cleanup job stays as the backstop.
  - **Plan change: base64 rule.** Redaction applies only to base64 runs that mix upper case, lower case and digits, so sequence data and hex in task output survive.
  - **Upstream.** The series does not apply to CESNET upstream `3d470f76`. Only the 401 patch does; the fork is about 4,600 lines ahead.
- **Pulsar `queued_manager_monitor_kwarg`** (`b476ccd3dfa8`, on master `08dedcb`, pushed to jmchilton). It fixes `montior`, so `queued_python` honours `num_concurrent_jobs` again; `_start_monitor` now takes `monitor` as keyword-only.
  - Test `test_num_concurrent_jobs_limits_running_jobs` fails before and passes after.
  - The demo builds the outer Pulsar from a selectable source (`TESP_PULSAR_SOURCE`, pinned deps in `config/tesp/pulsar-constraints.txt`). The default is now this branch, image `wes-tes/tesp-pulsar-rest:git-b476ccd3dfa8-docker29.1.3`.
  - Evidence: 4 tasks ran at once on PyPI 0.16.0, 2 at a time with the branch (`runs/tesp-stage5/pulsar-concurrency/`).
  - Record: `vault/repositories/pulsar/branches/active/queued_manager_monitor_kwarg/`, in `branches_implemented_needs_ci`.
- **Galaxy `tes_task_state_polling_unreachable`** (`f71ca18704d`, child of `tes_task_state_polling` `e3c0cc44649`, pushed).
  - New runner option `tes_unreachable_timeout`, default 3600 s. Connection errors, timeouts or 5xx for that long fail the job with a clear `job.info`.
  - tesp-api's single whole-task log is no longer pinned on "Executor 0 (pulsar-submit)". A Funnel or TESK staging failure at executor 0 now reads "The task exited with code N"; that was decided and is recorded in the debrief.
  - Tests: 46 pass in `test_pulsar_tes_task_checks.py`; 7 failed and 7 errored before the change.
  - Demo ports: `tes_task_polling_v26.1.2` `a1b53d59234` and `wes_tes_demo_fixes_v26.1.2` `3585089e925`.
  - Record: `vault/repositories/galaxy/branches/active/tes_task_state_polling_unreachable/`, in `branches_implemented_needs_ci`. Fork CI was green so far with jobs pending. One Converter-tests red (biocontainer pull, unrelated; the parent is green) was rerun.
- **Demo.** Commits from `93edb4c` through `6d8c94e`:
  - `scripts/tesp/run_checks.py` gives per-task proof (TES COMPLETE plus outer Pulsar return code 0), checks for leftover labelled containers, `vol-*` volumes and Pulsar job dirs, scans stored logs for secrets, and checks the longest `command_line=` (200 B limit). It is wired into `make run` and `run-gap.sh`.
  - `scripts/tesp/acceptance-checks.sh [--cancel] [--dies-early] [--restart]` and `TESP_RESTART_DURING=fastp`.
  - The outer Pulsar now writes an access log (`pulsar-serve --log-file -`). `make clean` handles tesp instances.
  - `TESP_REF=stage5` and `TESP_MAX_POLL_INTERVAL=10` are the defaults.
  - Docs: `docs/tesp-api.md`, plus README, troubleshooting, networking and evidence updates.

Acceptance: every item of plan section 5, plus the G1 live check, passed on 2026-11-15, 00:01–00:33 UTC. The evidence is in `runs/tesp-acceptance/2026-11-15/` (demo commit `1ba1a08`), and the results table is in `docs/tesp-api.md#results`. The pins were tesp-api `4bc9b5d`, outer Pulsar `b476ccd`, staging image `0.16.1.dev0-20b6460`, and Galaxy `3585089e925` (stock v26.1.2 for item 9).

1. IWC short-read QC through WES: PASS (`run ad36e27b8881ad5b`). Both jobs map to tesp-api tasks that are COMPLETE with outer Pulsar return code 0. No leftovers, a clean secret scan, and a largest `command_line=` of 120 B.
2. IWC hyphy-preprocessing: PASS. 12 jobs, 12 tasks with return code 0. The 39-input job's 100 KB script went as a file.
3. Outputs: the IWC assertions pass in all four workflow runs. fastp outputs are byte-identical to Funnel (`4778fab9…`).
4. Cancel: WES CANCELED 1.1 s after the cancel, Galaxy `deleted`, TES CANCELED, the outer Pulsar job cancelled, containers gone at 1.4 s, no volume, and `pulsar-finish` never ran.
5. Dies early: Galaxy `error` 42.5 s after the task's EXECUTOR_ERROR, with the exit code and docker's "pull access denied" in the reason.
6. Nothing left behind, after every run and in a final sweep: no labelled containers, no `vol-*` volumes, an empty staging dir, and all 66 tasks in a final state.
7. `docker restart wes-tes-tesp-api` during fastp: the run passed and every task was COMPLETE.
8. tesp-api stopped for 152 s with `tes_unreachable_timeout: 60`: the job was `error` 61.9 s after the stop, with the documented `job.info`. After the restart, tesp-api resumed the task, which ran to COMPLETE and was cleaned up.
9. Item 1 on stock Galaxy v26.1.2: PASS.

Doesn't work, or open:

- **What the acceptance runs showed:**
  - Galaxy tries the cancel of an unreachable task once and never retries it. So after G1 fails a job, the task runs on once tesp-api is back. Its `pulsar-finish` got 403 on every upload but still published `complete`; Galaxy kept the job in `error`.
  - tesp-api erases a cancelled task twice (cancel handler and poll loop). It is harmless.
  - Hyphy outputs differ byte-wise between runs on every backend (sequence choice), but the assertions pass.
- **Not done, as planned:** Singularity with local images, AMQP mode, TES 1.1 fields, HTTP input redirects, wildcard outputs, P2 (launch message compression).
- **Still in place:**
  - the ~100-input `MAX_ARG_STRLEN` ceiling;
  - credentials in executor arguments, in Galaxy's base64 launch message, which the secret scan reports as "not judged";
  - the `List[Path]` argument rewriting.

  These are for John (plan section 9).
- **The `stage5` pin is a local-only commit.** On another machine use `TESP_REF=galaxy-wes-tes` after applying the patches (`docs/tesp-api.md` P1).
- **`SUMMARY.md` not written.** The harness refused to let subagents write `runs/tesp-acceptance/2026-11-15/SUMMARY.md`, so the results table lives in `docs/tesp-api.md` and the per-item evidence directories instead.

Services: everything stopped after acceptance (`make status` all stopped, no `wes-tes-*` containers, `var/tes-backend` = `funnel`; the `wes-tes-tesp-mongo` volume is kept). To restart, run `make up TES=tesp && make run` (the stage 5 tesp-api and outer Pulsar are the defaults), `scripts/tesp/acceptance-checks.sh --cancel --dies-early --restart`, or the commands in `docs/tesp-api.md`. The Galaxy fixes worktree is detached at `3585089e925`; use it with `GALAXY_ROOT_OVERRIDE=~/projects/worktrees/galaxy/branch/wes_tes_demo_fixes_v26.1.2`.

Security: private notes exist outside the repositories, as the brief requires. Nothing sensitive is in the demo repository or the vault. Every saved acceptance file was scanned, and the `job_key` values in the Galaxy log excerpt are redacted.

### Stage 5 stretch: design B prototype (TES-native staging)

The prototype ran after the primary goal was committed. It works: IWC short-read QC passed through Galaxy WES on Funnel 0.12.3 and on tesp-api `4bc9b5d`, with no Pulsar, broker or staging image in the task. Evidence is in `runs/design-b/` and its `README.md` (demo commits `040fb43` and `3191a48`).

- **Design chosen: B2, Galaxy's own absolute paths in the task** (Kubernetes-runner style), not the stage 4 sketch's Pulsar `/job` layout.
  - `outputs_to_working_directory: true` keeps every write in the job directory, which is the task's one TES volume.
  - The runner lists the inputs itself: datasets with their metadata and extra files, job-directory files, and the tool-directory files the job's text names.
  - One executor runs Galaxy's unchanged job script in the biocontainer, through an inline wrapper. The wrapper precreates the outputs Galaxy precreated, records the exit code in a file, and exits 0.
  - Galaxy polls TES (reusing `tes_task.py`), then sets metadata locally and finishes the job.
  - No Pulsar or tesp-api change was needed. B1 would have added a Pulsar `TesNativeClient`, results collection and status synthesis, for no gain beyond path independence.
- **Galaxy branch `tes_native_staging_v26.1.2`** (`f33e416aa22`, on `tes_task_polling_v26.1.2` `a1b53d59234`, pushed to jmchilton):
  - `40c052c35d4` adds a raw-body `PUT /api/jobs/{id}/files?path=&job_key=`, for Funnel's uploads.
  - `f33e416aa22` adds `galaxy.jobs.runners.tes:TesJobRunner`.
  - Size: +912/−49, of which tests are +310 (8 unit tests, plus 2 integration tests against a real Galaxy test server).
  - Record: `vault/repositories/galaxy/branches/active/tes_native_staging_v26.1.2/`, in `branches_need_decision` as a prototype for John.
  - No Pulsar branch was needed.
- **Results.** Every task was COMPLETE with one executor, and every IWC assertion passed.
  - Funnel: `704dbb6b` (2 cores) and `bf37eedf` (1 core).
  - tesp-api: `aec259dd` (2 cores) and `8f3d143a` (1 core).
  - At 1 core, fastp outputs are byte-identical to the Funnel reference (`4778fab9…`). At 2 cores fastp's gzip bytes differ but the reads are identical, which also shows that design A runs every job at 1 slot.
  - The first Funnel attempt failed silently: fastp went `ok` with empty reports, because Galaxy copies `from_work_dir` files only into outputs that already exist. Precreating the outputs fixed it, and a unit test covers it.
- **Cost against design A:**
  - Task JSON: 10.6 KB for fastp and 9.2 KB for MultiQC, against 17.5 KB and 16.6 KB.
  - No argv ceiling.
  - Queued to ok on Funnel: fastp 13 s against 22 s, MultiQC 18 s against 27 s. On tesp-api: fastp 19–20 s against 23 s, MultiQC 20 s against 28 s.
  - Demo changes: +166/−23 in scripts and config. `make up TES=funnel|tesp TES_MODE=native` selects it.
- **Not done or open:**
  - TESK was not run.
  - Cancel and recovery after a Galaxy restart are implemented but untested.
  - The job key is in every task URL, readable in TES logs and storage. Signed per-file URLs would fix that.
  - Discovered outputs and `extra_files` would need DIRECTORY outputs plus a path-style PUT, which tesp-api can't do today.
  - The prototype is on v26.1.2 and would need a port to dev's `JobFilesManager`.
  - The v26.1.2 bug (a missing input gives 200 with an empty body) remains.

Services: stopped (`make status` all stopped, no task containers or `vol-*`; `var/tes-backend` = `funnel`, `var/tes-mode` = `pulsar`). Rerun with `make up TES=funnel TES_MODE=native && make run` (or `TES=tesp`). For byte-identical fastp, restart Galaxy with `TES_NATIVE_CPU_CORES=1`.

**For the next stage** (documenting and hardening this line in its own vault project):

1. Decide whether to propose the tesp-api patches, and to whom: the mirelaminkova fork, which they apply to, or CESNET upstream, which they don't.
2. Move the `stage5` pin off a local-only commit.
3. Get Galaxy to retry a failed cancel after an unreachable timeout.
4. Fix tesp-api erasing a cancelled task twice.
5. Choose between design A's credential and argv exposure (Pulsar compression or fetch-by-key) and design B. B needs a dev port, signed URLs, DIRECTORY outputs for discovered datasets, TESK, and cancel tests.
6. Turn the demo's checks into CI-style regression tests.
7. Settle the WES state question (`wes_run_state_executor_error_26_0`).
