# Operations: Galaxy WES on tesp-api

How to bring the chain up, watch it, cancel and clean up, what survives a restart, where the logs are and what they hide, the limits that bite, and how to recover from the failures seen so far. The chain and its configuration are in [ARCHITECTURE_AND_CONFIGURATION.md](ARCHITECTURE_AND_CONFIGURATION.md).

The demo repository is `/home/ubuntu/projects/repositories/galaxy-wes-tes`. `demo:docs/tesp-api.md` is the detailed operator page, and `demo:docs/troubleshooting.md` covers the other backends. Commands below run from the demo checkout unless they say otherwise. Numbers come from the stage 5 acceptance run (`demo:runs/tesp-acceptance/2026-11-15/`) unless another evidence path is given.

## Deploying

### Bring-up order

Each component needs the ones before it:

1. **RabbitMQ.** Galaxy's runner and the Celery worker connect at startup.
2. **MongoDB, then the outer Pulsar, then tesp-api.** tesp-api connects to both on its first request. Compose starts them in that order (`depends_on`).
3. **Galaxy, then the Celery worker.** Galaxy's TES runner connects to RabbitMQ when it loads. Jobs can be sent to tesp-api only once it answers.
4. **A reachability check from a container** to Galaxy and RabbitMQ at the addresses the task containers use.
5. **Users, API keys and tools.** WES can't create users or install tools. The demo uses Galaxy's own API and ephemeris for this.

In the demo:

```sh
make setup             # once: Galaxy checkout and venv, staging image build
make up TES=tesp       # 1 to 5 above; about 65 s with images built and tools installed
make status            # one line per component
make run               # the IWC short-read QC workflow through WES, then the checks
make down              # stops Galaxy, tesp-api (MongoDB volume kept), RabbitMQ
```

`make up TES=tesp` runs `scripts/preflight.sh up` (bridge address and free ports), `scripts/rabbitmq-up.sh`, `scripts/tes-up.sh` (which calls `scripts/tesp/up.sh`), `scripts/galaxy-up.sh`, `scripts/check-reachability.sh`, `scripts/galaxy-bootstrap-user.sh` and `scripts/install-tools.sh`. The first run also builds the tesp-api dependency image and the outer Pulsar image (`scripts/tesp/build-images.sh`, logs in `var/tesp-build/`). `make up` records the backend in `var/tes-backend`, and later `make run`, `make status` and `make up` reuse it.

To run on the Galaxy fixes branch (TES polling, unreachable timeout, WES fixes), point the demo at that checkout:

```sh
make down
GALAXY_ROOT_OVERRIDE=$HOME/projects/worktrees/galaxy/branch/wes_tes_demo_fixes_v26.1.2 make up TES=tesp
GALAXY_ROOT_OVERRIDE=$HOME/projects/worktrees/galaxy/branch/wes_tes_demo_fixes_v26.1.2 make run
```

### Regression run: `make acceptance`

```sh
make acceptance [TES=funnel|tesk|tesp] [TES_MODE=pulsar|native] [SCENARIOS=iwc-qc,cancel,...]
```

`scripts/acceptance.sh` brings the stack up for one backend (or reuses a running one), runs the scenarios with `scripts/acceptance/{harness,scenarios,leftovers}.py`, and writes `runs/acceptance/<UTC timestamp>-<backend>/` with one directory per scenario, `result.json`, `SUMMARY.txt` and the bring-up logs. The last line of `SUMMARY.txt` is `overall: PASS` or `overall: FAIL`, and the exit status is non-zero on FAIL. Each scenario ends PASS, FAIL or SKIP with a reason. It refuses a Galaxy checkout without the TES polling options, because `cancel`, `dies-early` and `unreachable` depend on them.

| Scenario | What PASS means |
| --- | --- |
| `iwc-qc` | IWC short-read QC through WES, every tool job `COMPLETE` on the backend, IWC assertions pass |
| `iwc-hyphy` | IWC hyphy-preprocessing, 12 tool jobs, the same proof |
| `cancel` | WES cancel while the tool runs: WES `CANCELED`, Galaxy `deleted`, TES `CANCELED`, task containers removed |
| `dies-early` | A task with a bad staging image: Galaxy `error` soon after the task's `EXECUTOR_ERROR` |
| `tes-restart` | A TES server restart during a run, and the run still passes. SKIP on Funnel, whose local backend doesn't resume tasks. |
| `unreachable` | TES server stopped past a 60 s `tes_unreachable_timeout`: the job fails and `job.info` names the server. Its follow-up hook (`scripts/tesp/acceptance/unreachable-cancel.sh` on tesp-api) checks that Galaxy cancels the orphaned task once the server is back. |
| `leftovers` | Nothing of the run's tasks left on the backend |

On Funnel with Galaxy `3585089e925` it passed in about 13 minutes (`demo:runs/acceptance/20261115T022857Z-funnel/`): `iwc-qc` 323 s, `iwc-hyphy` 244 s, `cancel` (WES `CANCELED` 1.2 s after the cancel, containers gone 3.0 s after it), `dies-early` (`error` 45.1 s after `EXECUTOR_ERROR`), `unreachable` (`error` 61.6 s after the stop), `leftovers` (nothing left of 17 tasks), `tes-restart` SKIP.

On tesp-api, from a fresh clone of the demo with `TESP_REPO` pointing nowhere (so the tesp-api fork came from GitHub) and Galaxy `8b3166c80fb` (`demo:runs/acceptance/20261115T030823Z-tesp/`, `FRESH-CLONE.txt`), five scenarios passed: `iwc-qc` 323 s, `iwc-hyphy` 184 s, `dies-early` (41.7 s), `tes-restart` (tesp-api restarted while fastp's tool ran, both tasks `COMPLETE`) and `unreachable` with its cancel-retry hook. `cancel` and `leftovers` failed on one outer Pulsar job directory left after a cancel, a Pulsar race described in [Cancel and cleanup](#from-wes-cancel-to-container-removal). On the final pins (tesp-api `c5ca66a2` with patch 0017, Galaxy `b317bc12545`), `SCENARIOS=iwc-qc,cancel,dies-early,unreachable,leftovers` passed (`demo:runs/acceptance/20261115T045850Z-tesp/`): `cancel` with WES `CANCELED` 1.2 s after the cancel and containers gone at 1.5 s, `dies-early` 41.5 s, `unreachable` (`error` 64.3 s after the stop) with the hook passing, nothing left of 5 tasks.

### Health checks

| Component | Check | Healthy answer |
| --- | --- | --- |
| RabbitMQ | `docker logs wes-tes-rabbitmq` | `Server startup complete`. `rabbitmq-up.sh` waits for it. |
| tesp-api | `curl -fsS http://127.0.0.1:18200/v1/service-info` (no credentials needed) | JSON with `name` `TESP`, version `0.2.0`, TES `1.0.0`. `up.sh` waits up to 120 s for it. |
| tesp-api auth | `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:18200/v1/tasks` | `401` on the patched tesp-api (500 on upstream and the fork) |
| Outer Pulsar | `docker logs wes-tes-tesp-pulsar` | gunicorn listening on port 8913. It isn't published, so probe it from inside: `docker exec wes-tes-tesp-pulsar curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8913/` prints an HTTP status, not a connection error (the image has curl). |
| Galaxy | `curl -fsS http://127.0.0.1:18080/api/version` | `{"version_major": "26.1", ...}` |
| Galaxy from a task container | `docker run --rm busybox:1.36.1-glibc wget -qO- http://172.17.0.1:18080/api/version` | the same JSON. `scripts/check-reachability.sh` runs this and an AMQP check. |
| WES | `curl -fsS http://127.0.0.1:18080/ga4gh/wes/v1/service-info` | WES service-info, with `ga4gh_service_id` as its `id` |
| Celery | `tail var/galaxy/celery.log` | `ready.` and no reconnect loop |

### What a real deployment would do instead

The demo scripts assume one host, loopback ports and generated credentials in `.env.local`. On a real site:

- Run tesp-api, MongoDB and the outer Pulsar under compose or systemd on the TES host, from a pushed and pinned tesp-api build (none exists yet, see [BUGS_AND_ENHANCEMENTS.md](BUGS_AND_ENHANCEMENTS.md#needs-johns-decision)). Put tesp-api behind HTTPS. Keep the outer Pulsar and MongoDB off any public network.
- Push the staging image to a registry the TES host's Docker can pull from, and name it in the job conf.
- Run RabbitMQ with durable state, reachable from the TES host's containers, ideally over TLS.
- Configure Galaxy's `galaxy_infrastructure_url` (or the runner's `galaxy_url`) and the destination's `message_queue_url` with addresses the task containers can route to.
- Bring Galaxy up last. Run the reachability check from a container on the TES host before sending real jobs.
- Prefer a polling Galaxy branch, so that a task that dies early fails its job instead of hanging it.

## Monitoring

### What to watch

| Where | Command | What it tells you |
| --- | --- | --- |
| Everything | `make status` | RabbitMQ, Galaxy, Celery, and `tesp-api: running (instance tesp, http://127.0.0.1:18200/, CONTAINER_TYPE=docker), TESP 0.2.0`, followed by `, unfinished tasks: <ids>` while tasks are `QUEUED`, `INITIALIZING` or `RUNNING` |
| Galaxy | `tail -f var/galaxy/gunicorn.log` | `Received status update: running` and `complete` per job, `executing external set_meta script`, and on a polling branch `TES task ... is <state> but Pulsar has not reported` and `Could not check TES task state, will retry` |
| Galaxy | `tail -f var/galaxy/celery.log` | DRS checksum tasks |
| tesp-api | `docker logs wes-tes-tesp-api 2>&1 \| tail -50` | DEBUG-level task events: submission, Pulsar errors, `completed successfully`, `executor error rc=N`, `canceled by the client`, `cleanup ok`, `shutdown, job left running` |
| tesp-api tasks | `source scripts/tesp/lib.sh && tesp_curl -fsS "${TESP_URL}v1/tasks?view=MINIMAL"` | Task ids and states, with basic auth from `.env.local` |
| Outer Pulsar | `docker logs wes-tes-tesp-pulsar 2>&1 \| grep -E '"(POST\|PUT\|DELETE) '` | tesp-api's requests: create, file upload, submit, cancel, delete |
| Outer Pulsar | `docker logs wes-tes-tesp-pulsar 2>&1 \| grep 'Status of job'` | Job status changes |
| Outer Pulsar | `ls var/tesp/pulsar/staging/` (root-owned) | One job directory per running task, plus `<id>-cleanup` briefly |
| Docker | `docker ps -a --filter label=tesp-api.task=<id>` | A task's containers. They run with `--rm`, so finished ones vanish. |
| Docker | `docker volume ls --filter name=vol-<id>-` | A task's shared volume, removed by the cleanup |
| RabbitMQ | `docker exec -u rabbitmq wes-tes-rabbitmq rabbitmqctl -q list_queues name messages consumers` | `pulsar_wes_tes__status_update` should have one consumer (Galaxy) and no backlog |

Galaxy learns a job's state from the in-task Pulsar, not from tesp-api, and tesp-api learns it from the outer Pulsar. The two can disagree for a while. Stock Galaxy can show a job `queued` while its task is already `EXECUTOR_ERROR` in tesp-api. TES `COMPLETE` can lag Galaxy's `ok` by a poll interval (up to 10 s in the demo).

### `run_checks.py`

`scripts/tesp/run_checks.py` checks what Galaxy can't see. `make run` runs it with `--expect-complete` after each run, and writes `tesp-checks.txt` and `tesp-checks.json` into the run directory. By hand:

```sh
python3 scripts/tesp/run_checks.py runs/<date>-<run_id> [--expect-complete] [TASK_ID ...]
```

It waits up to 120 s for every task to reach a final state, then checks:

- **per-task proof**: each task `COMPLETE` in tesp-api and its outer Pulsar job ended `complete` with return code 0.
- **leftovers**: no labelled containers, no containers on `vol-<id>-*` volumes, no such volumes, no outer Pulsar job directories, after up to 60 s.
- **secret scan**: no `job_key` value, no `.env.local` value of a setting named `*PASS*`, `*SECRET*`, `*KEY*` or `*TOKEN*`, no URL userinfo and no long mixed-case base64 in any field of `GET /v1/tasks/{id}?view=FULL` except `executors[].command`. Executor commands are counted as "not judged" (Galaxy's launch message, below).
- **request size**: the largest `command_line=` in the outer Pulsar's access log stays under 200 bytes. It FAILs if the Pulsar container was recreated after the run, because its access log went with it.

The last line is `tesp-api checks: PASS` or `FAIL`, and the exit status is 1 on a failure. Acceptance item 1 passed with 0 leftovers, a clean secret scan and a largest `command_line=` of 120 bytes.

### Acceptance checks

`scripts/tesp/acceptance-checks.sh [--cancel] [--dies-early] [--restart] [--out DIR]` runs the cancel, dies-early and restart checks on a running `TES=tesp` stack and writes `DIR/SUMMARY.txt` ending in `overall: PASS` or `overall: FAIL`. `--cancel` and `--dies-early` need a Galaxy with TES polling and the gap-test job conf. The script restarts Galaxy that way with `scripts/gaps/galaxy-restart.sh polling` if needed. `scripts/gaps/galaxy-restart.sh normal` goes back.

## Cancel and cleanup

### From WES cancel to container removal

On the patched tesp-api (the stage 5 series plus patch 0016) with Galaxy `wes_tes_demo_fixes_v26.1.2`:

1. The client sends `POST /ga4gh/wes/v1/runs/{id}/cancel`. Galaxy cancels the invocation and deletes its unfinished jobs. On the WES fixes branch, a cancel of an already terminal run leaves its state alone.
2. For each job, Galaxy's stop path calls the TES runner's kill, which sends `POST /v1/tasks/{id}:cancel` to tesp-api.
3. tesp-api sets the task `CANCELED`, answers 200 and dispatches a `cancel_task` event at once (patch 0002). A cancel of a finished or unknown task also answers 200 and changes nothing. An invalid id gets 400.
4. The event handler asks the outer Pulsar to cancel the job (`PUT /jobs/{id}/cancel`), deletes it (`DELETE /jobs/{id}`) and submits the cleanup job `<id>-cleanup`.
5. Pulsar's cancel SIGKILLs the job script's process tree. That kills the `docker run` client, not the container, which belongs to the Docker daemon.
6. The watchdog removes the container. The job script's first line started it with `setsid`, double-forked, outside the job's process tree and process group, so the SIGKILL misses it. It checks every second whether the job's shell is alive. When the shell is gone, it runs `docker rm -f` on the containers labelled `tesp-api.task=<id>` and removes the `vol-<id>-*` volumes (patch 0004).
7. The cleanup job runs the same removal as an ordinary Pulsar job, waits up to 60 s, then is deleted. It is the backstop for a Pulsar host without `setsid`. It queues behind busy Pulsar slots, which is why the watchdog exists: without it a cancelled container ran 100 s more with every slot busy (`demo:runs/tesp-stage5/tes-level/smoke-t3/cancel_load.json`).

Measured in acceptance item 4: WES `CANCELED` 1.1 s after the cancel, Galaxy job `deleted`, TES task `CANCELED`, the outer Pulsar's cancel and DELETE at 1.0 s, every task container gone at 1.4 s, no volume left, and `pulsar-finish` never ran. At the TES level, without Galaxy, the container was gone 4 s after a cancel and 3 s after a cancel with every Pulsar slot busy (`demo:runs/tesp-stage5/tes-level/final/`).

On CESNET upstream and on the fork, a cancel never stops the container. Upstream only marks the task, so `pulsar-finish` runs later, gets 403 from Galaxy (the job is gone) and publishes `complete`, which Galaxy ignores. The fork cancels the Pulsar job, which SIGKILLs only the `docker run` client. Galaxy's own `PulsarRESTJobRunner` with a socket-started container (`TES=pulsar`) has the same problem, because it is Pulsar's kill, not tesp-api's.

On the stage 5 branch, tesp-api's cancel handler and its polling loop both erased a cancelled task, so cancel, DELETE and the cleanup job went to Pulsar twice. Patch 0016 (`01bbf9bb7da4` on the development branch, in the `TESP_REF=patched` default) keeps a record per process of jobs erased successfully and skips the second erase, logging `was erased already`. Patch 0017 is described below. A failed erase is retried, and a job whose set-up request was still in flight when an erase started is erased again, because tesp-api can't know whether Pulsar took the submit before or after the DELETE. So a cancelled task now costs 1 cancel, 1 DELETE and 1 cleanup job, except a cancel that crosses the submit, which costs 2 of each on purpose (`demo:runs/stage6/tesp-reproducible/08-erase-counts.txt`). The new tests failed 8 of 17 before the patch and pass after it, and the full unit suite went from 856 to 869 passing tests (`demo:runs/stage6/tesp-erase-once/`).

The second erase had been hiding a Pulsar race. Pulsar's `PUT /jobs/{id}/cancel` signals the job and returns at once, and the thread waiting for the job then writes `return_code` and removes the pid file. tesp-api's DELETE arrives 3 to 7 ms after the cancel, while that happens, and Pulsar's `clean()` runs one `rmtree`, ignores any error and answers 200. A `return_code` written after `rmtree` listed the directory leaves the directory with only that file. A pid file removed before `rmtree` reaches it raises `FileNotFoundError` on Python 3.12 and leaves the whole directory. The fresh-clone tesp-api acceptance run hit it in 1 of 6 cancels. Two fixes exist, each sufficient alone:

- tesp-api patch 0017 (`d72420fd3ffe` on the development branch, in the `TESP_REF=patched` default since demo commit `3fa10a9`): after the DELETE and the cleanup job, `erase_job` reads the job's status, and until Pulsar reports `lost` (the directory is gone) it deletes again, up to 3 times, 1 s apart. If the directory stays, the erase isn't recorded, so the polling loop or recovery tries again. It works with any outer Pulsar.
- Pulsar `clean_job_directory_retry` (`ffbe6987cd84`, on `b476ccd`, pushed): `clean()` retries `rmtree` up to 3 times, 0.2 s apart, and logs a final failure. Select it with `TESP_PULSAR_SOURCE=https://github.com/jmchilton/pulsar.git@ffbe6987cd84b79ff08a4c6cd9d45ec2f04de408`.

Over 40 cancels of a running task per configuration (`demo:runs/stage6/tesp-erase-race/`), patches 1 to 16 with Pulsar `b476ccd` left 13 job directories (7 with `return_code` only, 6 whole). Either fix left none. With patch 0017 the race still hit 3 times, and each directory went with the second DELETE 1 s later. tesp-api's full suite has 873 passing tests at `d72420f`.

### Cleanup after every task

On the patched tesp-api every final state (`COMPLETE`, `EXECUTOR_ERROR`, `SYSTEM_ERROR`, `CANCELED`) runs the same erase step: delete the Pulsar job, run the cleanup job, wait up to 60 s for it, delete it. A failing cleanup only logs a warning (`Removing the Docker containers and volumes of task <id> failed` or `did not finish`). Containers run with `--rm`, so the cleanup mostly removes the volume. Acceptance item 6 found, after every run and in a final sweep, no labelled containers, no `vol-*` volumes, an empty outer Pulsar staging directory, and all 66 tasks in a final state.

Manual cleanup, for upstream or fork tasks or after a crash:

```sh
scripts/tesp/clean-tasks.sh [TASK_ID ...]   # exited containers and vol-<id>-* volumes of finished tasks
docker rm -f $(docker ps -q --filter label=tesp-api.task=<id>)   # a running container (patched tesp-api label)
docker exec wes-tes-tesp-pulsar curl -fsS -X DELETE http://localhost:8913/jobs/<id>   # a stale Pulsar job dir
```

Without arguments, `clean-tasks.sh` takes the ids in `var/tesp/task-ids.txt` (written by `make down`), or else the running instance's finished tasks. It leaves running containers and their volumes alone. `make clean` removes the MongoDB volume and deletes `var/tesp*/` through a throwaway container, because the outer Pulsar writes root-owned files there.

### Cancel after an unreachable timeout

On the stage 5 Galaxy (`3585089e925`), when Galaxy failed a job because tesp-api was unreachable for `tes_unreachable_timeout`, it tried to cancel the task once, while tesp-api was still down, and never retried. Acceptance item 8 stopped tesp-api for 152 s with the timeout at 60 s. The job was `error` 61.9 s after the stop. When tesp-api came back, it resumed the task, which ran to `COMPLETE`. Its `pulsar-finish` got 403 on every upload and still published `complete`, and Galaxy kept the job in `error`. Nothing was left behind, but the task ran to its end for nothing. The same happened on Funnel in the `make acceptance` run: the Funnel task stayed `RUNNING` after the outage.

Galaxy `bd710f3b8da` (on `tes_task_state_polling_unreachable`, demo ports `8b3166c80fb` and `b317bc12545` of `wes_tes_demo_fixes_v26.1.2`) retries such a cancel from the monitor thread. The first retry comes 10 s later, and the wait doubles up to 120 s. It stops when the cancel succeeds, when the task has ended, is `CANCELING` or 404, when the server answers 400, 401 or 403, or after `tes_cancel_retry_timeout` (default 86,400 s, `0` tries once). Galaxy's log shows:

- WARNING `Could not reach the TES server to cancel the task, retrying for up to N seconds`.
- INFO `Cancelled TES task on attempt N`.
- ERROR `Gave up cancelling TES task after N attempts over N seconds ...`.

The retries live in memory. A Galaxy restart drops them, and shutdown logs the tasks left uncancelled. The unit tests went from 16 failed and 44 passed to 60 passed (`demo:runs/stage6/h2a-cancel-retry/`). Live on tesp-api, the follow-up hook `scripts/tesp/acceptance/unreachable-cancel.sh` passed in both tesp-api acceptance runs: the orphaned task was `CANCELED` 37.9 s after tesp-api answered again, on Galaxy's fourth attempt, with no `pulsar-finish`. On Funnel (`demo:runs/acceptance/20261115T033208Z-funnel/`, Galaxy `8b3166c80fb`) Galaxy failed the job 62.7 s after Funnel stopped and retried the cancel 10, 30 and 70 s later. Attempt 4 succeeded, and Funnel marked the task `CANCELED` 39.4 s after it answered again. But Funnel 0.12.3's local worker runs inside the server process and doesn't stop executors of a task from before a restart, so the tool container kept running and the scenario failed. Galaxy's side works. The Funnel gap is bug list item 49.

The `complete` that `pulsar-finish` publishes after 403s comes from two rules working together. Galaxy's job files API refuses uploads for a job that is no longer running (`__authorize_job_access` in `lib/galaxy/webapps/galaxy/api/job_files.py`), and Pulsar treats a 403 on an output upload as "not failing the job" (`_collect_output` in `pulsar/client/staging/down.py`, upstream commit `8bff105`). Galaxy ignores the late message. Whether Pulsar should report it differently is open ([BUGS_AND_ENHANCEMENTS.md](BUGS_AND_ENHANCEMENTS.md)).

## Restart behavior

| What restarts | What happens | Evidence |
| --- | --- | --- |
| tesp-api (`docker restart wes-tes-tesp-api`) | Patched tesp-api (stage 5 patch 0005): each process holds leases on its tasks (`tesp_lease` in MongoDB), renewed every 45 s, expiring 180 s after the last renewal or at once on a clean stop. Another (or the restarted) process claims expired leases. A `RUNNING` task with a submitted Pulsar job resumes and ends as usual with its logs. A task never submitted becomes `SYSTEM_ERROR` ("tesp-api stopped before the task was submitted to Pulsar; the task was not run. Submit it again."). A `CANCELED` task with a lease left is erased. Upstream and fork: the task stays `RUNNING` forever and its volume and job directory remain, but Galaxy still finishes the job, because it hears from the in-task Pulsar. | Acceptance item 7: restart during fastp, the run passed, every task `COMPLETE`, nothing left. TES level: a `sleep 30` task resumed and ended `COMPLETE` 32 s later (`demo:runs/tesp-stage5/tes-level/final/restart.json`). |
| tesp-api stopped for a long time | Galaxy's polling branch fails each job after `tes_unreachable_timeout` (3600 s default). Stock Galaxy waits for the in-task Pulsar, which keeps working, because it never talks to tesp-api. The in-flight Pulsar jobs keep running in the outer Pulsar. On restart tesp-api resumes them. | Acceptance item 8 (timeout 60 s, `error` after 61.9 s, task resumed after `docker start`). With the cancel retry Galaxy cancels the task once tesp-api answers again: `CANCELED` 37.9 s after tesp-api returned, in both stage 6 tesp-api acceptance runs. |
| Outer Pulsar (`make down`, or the container recreated) | Running job scripts and their watchdogs die with the container. Task containers belong to the host's daemon and keep running (inferred). tesp-api retries Pulsar connection errors for `error_retry_seconds` (600 s). Not tested. Recreating the container also loses its access log, so `run_checks.py`'s request-size check fails for earlier runs. | not tested |
| MongoDB | The named volume `wes-tes-tesp-mongo` keeps tasks across `make down`/`make up`. A MongoDB restart under a running tesp-api was not tested. | not tested |
| RabbitMQ | The demo broker runs with `--rm` and loses queued messages on restart. A status message published while it is down is lost. Stock Galaxy then never hears the job's final status. A polling branch fails the job after the task ends plus the grace period ("TES task <id> completed, but Pulsar never reported a final job status"). Don't restart RabbitMQ while jobs run. | Funnel gap test 3 (unreachable in-task broker, task `COMPLETE`, job stuck on stock Galaxy) and the polling branch's tests. Not tested on tesp-api. |
| Galaxy | The status queue is durable, so messages published while Galaxy is down are handled when it comes back (2 s after restart in Funnel gap test 4c). A polling branch re-reads every watched task after the restart and fails jobs whose task ended unreported. | `demo:runs/gaps/tes-dies-early/polling-recovery/` (Funnel). Not tested on tesp-api. |
| The TES host's Docker daemon | Not tested. | |

Stage 6 added no restart tests for the outer Pulsar, MongoDB or Galaxy on tesp-api. `make acceptance`'s `tes-restart` scenario restarts tesp-api while fastp's tool container runs. It passed in the fresh-clone run (`demo:runs/acceptance/20261115T030823Z-tesp/`): both tasks `COMPLETE`, IWC assertions pass.

## Logs and redaction

### Where the logs are

| Component | Log | Lifetime |
| --- | --- | --- |
| Galaxy | `var/galaxy/gunicorn.log` (web, job handler, runner, access log) | Until deleted |
| Celery | `var/galaxy/celery.log` | Until deleted |
| tesp-api | `docker logs wes-tes-tesp-api` (DEBUG) | As long as the container |
| tesp-api, per task | `GET /v1/tasks/{id}?view=FULL`: one `ExecutorLog` per executor with start and end time, exit code, and the last 64 KiB of stdout and stderr. A staging failure puts the last 20 lines (at most 4 KiB) of the job's stderr in `system_logs`. | As long as the MongoDB volume |
| Outer Pulsar | `docker logs wes-tes-tesp-pulsar` (gunicorn access log and job status) | As long as the container |
| Outer Pulsar job directory | `var/tesp/pulsar/staging/<task id>/`, with `tesp_job.sh`, executor stream files and `return_code` | Until tesp-api deletes the job at the task's end |
| Task containers | none (`--rm`) | The container's run |
| RabbitMQ | `docker logs wes-tes-rabbitmq` | As long as the container |

### What tesp-api redacts

Before storing executor stdout and stderr, the patched tesp-api (patches 0006, 0007, 0015, `tesp_api/utils/redaction.py`) replaces:

- `job_key` values in URL queries, URL-encoded once or twice, and in JSON or dict form, with `job_key=REDACTED`.
- URL passwords, `scheme://user:password@host` → `scheme://REDACTED@host`, also with one slash, because the task model collapses `//` in arguments a task may echo back.
- base64 runs of 200 or more characters that mix upper case, lower case and digits, with `<N base64 characters REDACTED>`. Requiring all three keeps sequence data, hex digests and filler lines.
- secrets in presigned S3 URLs.

A log cut to its last 64 KiB loses its first line, which could hold the tail of a secret whose start was cut off.

Galaxy's polling branch redacts executor stderr and system logs (the job's known secrets) before it puts a TES failure into `job.info` and stderr.

### What is not redacted

- **Galaxy's launch message in executor arguments.** Executors 0 and 2 carry the base64 Pulsar launch message and app config: the broker URL with its password and the job's job files URLs with `job_key`. tesp-api stores them in MongoDB and returns them in the `BASIC` and `FULL` views (they return the same fields in tesp-api). They reach `tesp_job.sh` in the outer Pulsar's job directory until the job is deleted, and they are visible in `docker ps --no-trunc` and `docker inspect` of running containers. `run_checks.py` counts them as "not judged": a typical Galaxy task shows 8 `job_key` values, the RabbitMQ password twice and 2 URL userinfos inside the base64. Don't paste a `BASIC` or `FULL` view into issues or notes.
- **Galaxy's access log.** Every job files API request line in `var/galaxy/gunicorn.log` has `job_key=<value>` in its query string. A job key stops working once the job leaves `queued`/`running` (later uploads get 403), so an old log line is much less sensitive than the broker password.
- **Configuration files**: `.env.local`, `var/tesp/api.env` and `var/galaxy/job_conf.yml` (all mode 0600), and the RabbitMQ container environment in `docker inspect wes-tes-rabbitmq`.
- **Before patch 0003**, the whole job script, launch message included, travelled in the outer Pulsar's `command_line=` query string and so in its access log. The patched tesp-api uploads it as a file.

Removing the launch message from task arguments needs a Pulsar change (compression does not hide it, fetching it from Galaxy by job key would) or design B ([DESIGN_B.md](DESIGN_B.md)).

## Limits

| Limit | Value | Where set | Notes |
| --- | --- | --- | --- |
| Galaxy concurrency for `pulsar_tesp` | 2 jobs | job conf `destination_total_concurrent_jobs` | Further jobs wait in Galaxy |
| Outer Pulsar concurrency | 2 jobs | `num_concurrent_jobs` (`TESP_PULSAR_CONCURRENCY`) | Enforced only with the `queued_manager_monitor_kwarg` fix. PyPI 0.16.0 runs every job at once. |
| tesp-api concurrency | none of its own | | Every task goes to Pulsar at once |
| Container resources | `--cpus=2 --memory=4096m` per container | destination `cpu_cores`, `ram_gb` | The tool still sees `GALAXY_SLOTS=1` |
| One executor argument | under 131,072 bytes (`MAX_ARG_STRLEN`), so at most 131,068 bytes of base64, which is 98,301 bytes of launch-message JSON | Linux `execve` | Galaxy's launch message is about 877 bytes of JSON (1,169 bytes of base64) per input in the demo. A Galaxy job with 108 inputs starts and one with 109 doesn't. tesp-api: `EXECUTOR_ERROR`, exit 126, `docker: Argument list too long`. Funnel: `SYSTEM_ERROR` in about 1 s, `fork/exec /usr/bin/docker: argument list too long`. TESK: about the same limit from its 256 KiB annotation holding two copies (computed). Uploading the job script as a file doesn't help, because the `docker run` line inside it still carries the argument. With Pulsar `coexecution_compact_launch` (`9036ff3`) the limit is 1,244 inputs (1,244 pass and 1,245 fail on both backends), and a 600-input Galaxy job passed on tesp-api. |
| All executor arguments together | 2 MiB (`ARG_MAX` 2,097,152): 20 × 100 KiB worked, 21 failed | Linux `execve` | |
| tesp-api first poll and backoff | 4 s, then × 1.25 per poll | `TESP_POLL_INTERVAL` | |
| tesp-api longest poll interval | 10 s in the demo, 60 s tesp-api default | `TESP_MAX_POLL_INTERVAL` | Longer means TES `COMPLETE` lags further behind |
| Task duration cap | upstream: 4 s × 400 polls, about 27 minutes, then `SYSTEM_ERROR` while the container keeps running. Fork and patched: no cap (`pulsar.status.max_wait_seconds = 0`) | `TESP_MAX_POLLS` (upstream), `TESP_API_PULSAR__STATUS__MAX_WAIT_SECONDS` (fork) | Set a cap through `TESP_EXTRA_ENV_FILE` |
| Pulsar error retry | 600 s | `pulsar.status.error_retry_seconds` | Then the task fails |
| Pulsar request timeout | 30 s | `pulsar.client_timeout` | |
| Cleanup job wait | 60 s | tesp-api code | |
| Lease renewal and expiry | 45 s, 180 s | `tesp_api/service/task_recovery.py` | |
| Executor log kept | last 64 KiB of stdout and of stderr | tesp-api job script | |
| Galaxy TES check interval | 60 s (polling branch) | runner `tes_status_check_interval` | |
| Galaxy grace period | 120 s | runner `tes_status_grace_period` | Dies-early to `error` took 42.5 s with 15 s and 30 s |
| Galaxy unreachable timeout | 3600 s | runner `tes_unreachable_timeout` | |
| Galaxy cancel retry | up to 86,400 s, first retry after 10 s, then doubling to at most 120 s apart | runner `tes_cancel_retry_timeout` | In memory only |
| Request line to the outer Pulsar | unlimited in Pulsar 0.16's `pulsar-serve` (`limit_request_line: 0`) | | Irrelevant since patch 0003 (120 to 132 bytes). A proxy with default limits would have failed at 4 to 8 KB before it (inferred). |

The argument numbers come from `demo:runs/stage6/argv/` (TES-level runs with Galaxy's real task shape and Pulsar's own decoder, write-up in `demo:docs/pulsar-tes-runner.md#argument-size-ceiling`). The size of one job's message is JSON = F + N × (e + c): a fixed part F, and per input a staged-file entry e (which grows with the dataset path) and the tool's command text c. The hyphy job's 39-input message shrinks from 49,264 to 4,948 bytes compressed (9.96×).

At the Galaxy level (`demo:runs/stage6/argv/galaxy/tesp-2026-11-15T0339Z/` and `funnel-2026-11-15T0353Z/`, Galaxy `8b3166c80fb`, one job with N inputs), Galaxy's history calibrated to 876 JSON bytes per input plus 2,764 fixed, and the boundary moves by about one input between histories because dataset ids gain a digit:

| Backend | Client and staging image | Inputs | Result |
| --- | --- | --- | --- |
| tesp-api | stock, `20b6460` | 109 | `ok` (a 131,000-byte argument) |
| tesp-api | stock, `20b6460` | 110 | `error` 52 s later from the polling branch, exit 126, `docker: Argument list too long` |
| tesp-api | compact launch, `9036ff3` | 109, 110, 600 | `ok`, compressed arguments of 12.8, 12.9 and 65 KB. Task JSON at 110 inputs: 15 KB instead of 266 KB. |
| tesp-api | compact launch client, old image `20b6460` | 110 | `error`, exit 2, `unrecognized arguments: --base64_zlib` |
| tesp-api | compact launch client, old image `20b6460` | 20 | `ok` (the job-id-only `pulsar-finish` works on the old image) |
| Funnel | stock, `20b6460` | 108 | `ok` |
| Funnel | stock, `20b6460` | 109, 110 | `error` 46 to 49 s later, "SYSTEM_ERROR … exited with code 0" (`8b3166c80fb` lacks the SYSTEM_ERROR job info fix) |
| Funnel | compact launch, `9036ff3` | 109, 110 | `ok` |

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `make up TES=tesp` stops with `tesp-api: patches/tesp-api/*.patch on c3a9f2376df7 give tree …, but config/tesp/tesp.env pins TESP_PATCHED_TREE=…` | The patch series changed without updating the pin | If on purpose, set `TESP_PATCHED_TREE` and `TESP_PATCHED_COMMIT` to the values reported. The result is left in `vendor/tesp-api-patched.new`. |
| `make up TES=tesp` stops with `patches/tesp-api/*.patch do not apply` | `TESP_PATCH_BASE` or a patch file was changed | Restore the committed series, or rebase it onto the new base |
| `make up TES=tesp` stops with `fatal: Needed a single revision` | An explicit `TESP_REF=<commit>` (such as the old `4bc9b5d`) that the clone lacks | Use the default `TESP_REF=patched`, which needs only the fork |
| `wes-tes-tesp-api` exits at start with a `TypeVarTuple … unexpected keyword 'default'` error | Dependency image built from upstream's `poetry.lock` | `FORCE=1 scripts/tesp/build-images.sh` with the default `TESP_DEPS_REF=e2ce6ef…` |
| Galaxy job stays `queued`, WES run `RUNNING`, task `EXECUTOR_ERROR`, executor 0 stderr `pull access denied` or `Unable to find image` | The staging image is missing or mistyped. `pulsar-submit` never ran, nothing reached RabbitMQ, and stock Galaxy doesn't poll TES. | Fix `pulsar_container_image` (`make setup` builds it). Run a polling Galaxy branch so such jobs fail (acceptance item 5: `error` 42.5 s after the task's `EXECUTOR_ERROR`). Clear a stuck job by cancelling its WES run. |
| Galaxy job stays `queued`, task never leaves `RUNNING` or ends without Pulsar status, `check-reachability.sh` fails | Task containers can't reach Galaxy or RabbitMQ at `172.17.0.1` (firewall, wrong `DOCKER_HOST_IP`, Galaxy not bound on the bridge) | Fix the binds or firewall (accept 18080 and 18672 from `172.17.0.0/16`), rerun `scripts/check-reachability.sh` |
| Task `EXECUTOR_ERROR`, exit 126, `/usr/local/bin/docker: Argument list too long` | Galaxy's base64 launch message passed 131,071 bytes (about 109 or more inputs in the demo, depending on path lengths) | Use Pulsar `coexecution_compact_launch` (image `0.16.1.dev0-9036ff3` plus the client port in Galaxy's venv), which raises the limit to 1,244 inputs. Otherwise split the job's inputs or use design B. |
| Tool container keeps running after a cancel | Upstream or fork tesp-api (no watchdog), or a Pulsar image without `setsid` | Run the patched tesp-api (`TESP_REF=patched`) with the outer Pulsar from `config/tesp/pulsar-rest.Dockerfile`. Remove by hand with `docker rm -f $(docker ps -q --filter label=tesp-api.task=<id>)`. |
| Exited containers or `vol-<id>-pulsar_staging` volumes pile up, or the `leftovers` check fails | Upstream and fork run containers without `--rm` and never remove volumes. On the patched tesp-api, a failed cleanup job (see tesp-api's log). | `scripts/tesp/clean-tasks.sh [TASK_ID…]` |
| After a cancel, `var/tesp/pulsar/staging/<task id>/` is left, holding only `return_code` or the whole job, and the `leftovers` check fails | Pulsar's `clean()` raced the killed job's last writes and ignored the `rmtree` error. Patches 1 to 16 send only one DELETE. | tesp-api patch 0017 (the `TESP_REF=patched` default since `3fa10a9`), or the outer Pulsar from `clean_job_directory_retry` `ffbe6987cd84`. Remove a left directory with `docker exec wes-tes-tesp-pulsar curl -fsS -X DELETE http://localhost:8913/jobs/<id>`. |
| Task stuck `RUNNING` after a tesp-api restart, `run_checks.py` says `tesp-api stopped following it` | Upstream and fork don't resume. On the patched tesp-api the lease hasn't expired yet (up to 180 s after a crash). | Wait, or run the stage 5 branch. On other refs clean up with `clean-tasks.sh` and delete the Pulsar job. |
| More tasks run at once than `TESP_PULSAR_CONCURRENCY` | Outer Pulsar from PyPI 0.16.0 (`montior` typo) | Default `TESP_PULSAR_SOURCE` (`b476ccd`), then `make down && make up TES=tesp` |
| HTTP 500 from tesp-api without credentials | Upstream or fork | Stage 5 branch (patch 0008). Galaxy always sends credentials. |
| Every tesp-api call from Galaxy gets 401 | `basic_auth` set without `authorization: basic` on the destination, so pydantic-tes sends no header | Add `authorization: basic` |
| TES calls go to the wrong path and 404 | `tes_url` with a path but no trailing slash (pydantic-tes `urljoin`) | End `tes_url` with `/` |
| Galaxy logs `Could not check TES task state, will retry` every interval long after tesp-api stopped | `tes_task_state_polling` without the unreachable timeout retries forever | `tes_task_state_polling_unreachable` (in `wes_tes_demo_fixes_v26.1.2` since `3585089e925`), or start tesp-api again |
| `run_checks.py`: `command_line= … FAIL (no submit request …)` | The outer Pulsar container was recreated after the run and its access log is gone | Run the checks before restarting the stack (`make run` does) |
| A `TESP_EXTRA_ENV_FILE` setting has no effect | `compose.yaml` sets it under `environment:`, which wins over `env_file`, or the ref doesn't know the setting (upstream ignores `max_poll_interval`, fork and stage 5 ignore `max_polls`) | Use the demo setting where one exists. Check `var/tesp/api.env` and `docker inspect wes-tes-tesp-api`. |
| `rm -rf var/tesp` fails with `Permission denied` | The outer Pulsar runs as root and writes job directories there | `make clean`, or `TESP_INSTANCE=<name> VOLUMES=1 scripts/tesp/down.sh` for a probe instance first |
| Every task `SYSTEM_ERROR` 1 s after creation | `TESP_PULSAR_AMQP_URL` set: tesp-api's AMQP mode fails with a `TypeError` on every ref | Leave it empty (REST mode) |
| `TESP_CONTAINER_TYPE=singularity`: task `EXECUTOR_ERROR` in 8 s, exit 255, Galaxy job `queued` | Apptainer pulls every image from a registry, and the staging image is local only | Use `docker`, or push the staging image to a registry (not built) |
| Job `ok` but a discovered collection is empty or a discovered dataset missing | Galaxy's default staging image `0.15.0.2` | Use the current staging image (`0.16.1.dev0-20b6460`) |
| Job `queued` → `ok` with no `running` in between | A staging image without `coexecution_publish_running` | Current staging image |
| DRS object answers 202 forever | No Celery worker | Start the worker. With it, the first request per object still gets one 60 s `Retry-After`. |
| Celery worker reconnects in a loop | RabbitMQ 4.3 refuses Celery's transient remote-control queue | `worker_enable_remote_control: false` and `--without-mingle --without-gossip` |
| First jobs after a Galaxy start sit `queued` 25 to 32 s | The `mulled` resolver lists the whole biocontainers namespace while its cache is cold | Wait. Later jobs take 1 to 2 s. |
| Late `pulsar-finish` 403s in a task's log after Galaxy failed or cancelled the job | The task kept running after Galaxy gave up (upstream cancel, or a cancel sent while tesp-api was down) | Harmless: Galaxy keeps the job's state. Remove the containers if they are still running. |

Diagnosis commands, in the order worth trying:

```sh
make status
tail -n 200 var/galaxy/gunicorn.log | grep -E 'status update|TES task|Could not check'
source scripts/tesp/lib.sh && tesp_curl -fsS "${TESP_URL}v1/tasks/<id>?view=MINIMAL"
docker logs wes-tes-tesp-api 2>&1 | grep <task id> | tail
docker logs wes-tes-tesp-pulsar 2>&1 | grep <task id> | tail
docker ps -a --filter label=tesp-api.task=<task id>
scripts/check-reachability.sh
python3 scripts/tesp/run_checks.py runs/<run dir>
```
