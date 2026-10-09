# Cross-cutting Galaxy ↔ Pulsar compatibility (all modalities)

For galaxyproject/pulsar#535. Pulsar `origin/master` = aa6e4b6; Galaxy `origin/release_*`, `origin/dev`.
Modality tags: **[REST] [MQ] [RELAY] [COEXEC]**, **[ALL]**. "PSS" = Pulsar-side staging (MQ, relay, coexec,
and REST with `remote_*` file actions).

## 0. Ground rule: which version governs?

- `pulsar/client/**` runs in **both** places. Server postprocess reuses the client collector:
  `pulsar/managers/staging/post.py:20` imports `ResultsCollector` from `pulsar.client.staging.down`.
  - Client-staged REST: Galaxy's pinned `pulsar-galaxy-lib` decides collection behavior.
  - PSS: the **server's** copy decides collection. Fixes to `staging/down.py` / `staging/__init__.py` reach
    PSS deployments only when the Pulsar server is upgraded, whatever Galaxy pins.
- `pulsar-galaxy-lib` drops `galaxy-*` deps (`setup.py:30` on 0.15.15/master). The client uses whatever
  `galaxy-tool-util`/`galaxy-util` Galaxy itself ships.
- Galaxy side pins (`lib/galaxy/dependencies/pinned-requirements.txt`): 24.0/24.1=0.15.6 (marker
  `python<3.13`), 24.2=0.15.7, 25.0=0.15.9, 25.1/26.0=0.15.14, 26.1=0.15.15. **`origin/dev` still pins
  0.15.15** (plus `pulsar-relay-client==0.2.2`). 26.2 has no 0.16 pin yet.
- HISTORY typo: `0.15.14 (2025-01-20)`. Tag 09e9183 is dated 2026-01-20.

## 1. Version exchange: what crosses the wire, and what is checked

- `pulsar_version` in the job config is built by `build_job_config` (`pulsar/client/setup_handler.py:111`).
  It is written in two places:
  - **Remote setup** (REST without `jobs_directory`): the server's `manager_endpoint_util.setup_job` calls it
    and returns the **server** version. [REST]
  - **`LocalSetupHandler`** (`jobs_directory` set; required for MQ/relay, common in coexec): Galaxy builds it
    locally, so `pulsar_version` = **Galaxy's embedded lib version**, not the server's.
    [MQ][RELAY][COEXEC][REST+jobs_directory]
- The completion status also carries the server's `pulsar_version` (`manager_endpoint_util.py:79`), and
  `/healthz` returns `{'version': ...}` (`web/routes.py:232`, 0.15.7+). Galaxy reads neither for gating.
- Galaxy reads the job-config `pulsar_version` (`lib/galaxy/jobs/runners/pulsar.py`, dev):
  - `check_job_config` (:1093) raises `UnsupportedPulsarException` below `MINIMUM_PULSAR_VERSIONS` (:85):
    `_default_` 0.7.0.dev3, `remote_metadata` 0.8.0, `remote_container_handling` 0.9.1.dev0. All are far below
    any supported peer, so the check never fires. Under LocalSetupHandler it compares Galaxy against itself.
  - `< 0.14.999` disables commands-in-new-shell (:614). Inert in practice.
  - **`dataset_collector_descriptions` gate ≥ 0.15.13.dev0** (:1021, Galaxy 3a3d872460c, in **26.0, 26.1,
    dev**). This is the one live behavioral gate, and see §2.1 for how it misfires.
  - `command_factory.py:91,212` only checks that `pulsar_version` is present (`for_pulsar`).
- `pulsar/capabilities.py` (0.15.15+): `PulsarCapabilities` with `SCHEMA_VERSION=1`, including
  `pulsar_version`. Published only to the relay (`messaging/bind_relay.py:293`, knob
  `message_queue_publish_capabilities`). **No Galaxy consumer**: grepping `origin/dev` lib for capabilities or
  pulsar_version finds nothing beyond the runner/command_factory hits above. [RELAY]
- Open PRs that change this: #523 (draft; adds `pulsar_version_source` and a `remote_pulsar_version` destination
  param; fixes #135), #529 (draft; `__instrument_pulsar_version` job metric, the only route for polling coexec
  runners), #518 (`__instrument_pulsar_transfer_*` metrics; Galaxy half galaxyproject/galaxy#23784/#23850).
- **Conclusion**: nothing enforces a minimum or maximum peer version today. The only gate keys off a value
  that is wrong in every non-remote-setup modality.

## 2. Remote job execution contract

### 2.1 Discovered outputs / `dataset_collector_descriptions`: **real break**

- Galaxy 26.0+ (`pulsar.py` ~:1035-1062): if `pulsar_version >= 0.15.13.dev0`, Galaxy sends
  `dataset_collector_descriptions` and **stops adding raw `output_discover_patterns` to `dynamic_outputs`**.
- Servers below 0.15.13 have no such key: 0.15.9 `ClientOutputs.from_dict`/`to_dict`
  (`pulsar/client/staging/__init__.py:226-249`) silently drop it. Added in 2e28241 (#432, 0.15.13).
- Galaxy **26.0/26.1 (lib 0.15.14/15) + Pulsar server < 0.15.13, PSS, non-extended metadata**: under
  LocalSetupHandler, `pulsar_version` = 0.15.14 → descriptions sent → the old server ignores them, and the
  raw patterns are gone → **`discover_datasets` outputs are never staged back. The job goes green with
  missing outputs.** [MQ][RELAY][COEXEC][REST+jobs_directory+remote actions]
  - Remote-setup REST gets the server's true version and falls back to raw patterns. [REST] safe.
  - Matrix row: Galaxy ≥26.0 needs Pulsar server ≥0.15.13 for PSS.
- Server side, the descriptions call `galaxy.tool_util...dataset_collection_description(**d)`. It accepts
  arbitrary kwargs, so extra keys from newer Galaxy are tolerated. `directory`/`recurse`/`match_relative_path`
  need galaxy-tool-util ≥21.09, but the declared floor is `>=19.9.0` (stale; see §3).

### 2.2 Command line / tool script / metadata

- Galaxy builds the command line. Pulsar wraps it in its **own** job template
  (`pulsar/managers/util/job_script/DEFAULT_JOB_FILE_TEMPLATE.sh`), not Galaxy's.
  - Pulsar 0.15.7+ (#380, 18e9c35) adds `prepare_dirs_statement`, which backs up `working/outputs/configs` to
    `*.orig` and restores them on resubmit. Galaxy never prepended PREPARE_DIRS for Pulsar
    (`create_tool_working_directory` is false). Galaxy 6d4b3451115 (25.0) moved its copy into Galaxy's job
    script. Independent of the peer. Older servers simply lack resubmit restore. [ALL]
- `remote_metadata` / `metadata_strategy`: the version coupling is **Galaxy ↔ the Galaxy install on the
  Pulsar host**, not Galaxy ↔ Pulsar.
  - Galaxy needs `system_properties.galaxy_home` (from server app.yml, or `remote_property_galaxy_home` under
    LocalSetupHandler) unless `use_metadata_binary` (`pulsar.py:1201-1211`).
  - Extended metadata needs pulsar's `galaxy_extended_metadata` extra (`galaxy-job-execution`,
    `galaxy-util[template]`, setup.py extras), or a galaxy_home of a **matching Galaxy version**.
  - Galaxy 26.1 64360a61721 serializes new tool capabilities and confinement for extended metadata. An older
    remote Galaxy/galaxy-job-execution will not enforce that confinement. Needs verification; not tested here.
    [ALL w/ remote_metadata]
- Remote tool eval (Galaxy 26.1: 3504ce16769, 4878910de64, f7914b342b3). The command picks
  `$GALAXY_LIB/galaxy/tools/remote_tool_eval.py` or `galaxy-remote-tool-eval` **on the remote**, depending on
  GALAXY_LIB from Pulsar's galaxy_home. Again a remote-Galaxy-install coupling. A remote Galaxy older than
  26.1 has neither entry point. [ALL]
- Galaxy dev 9e5e7dec12a (26.2 only) reads `job_directory`/`tools_directory` from the job config instead of
  `abspath(working/..)`. Both keys exist in `build_job_config` since before 0.15.6, so this is safe with every
  server. Galaxy ≤26.1 still re-derives them, which is what broke `__PULSAR_JOBS_DIRECTORY__`. [ALL]
- dev-only (26.2): ecd065dd34c containerized set_metadata (`packages/job_execution/Dockerfile`). New coupling
  to the image's Galaxy version. Check before 26.2.

### 2.3 Destination tokens

- `__PULSAR_JOBS_DIRECTORY__`: substituted in the command line only through 0.15.15
  (`0.15.15:pulsar/manager_endpoint_util.py:111`), and broken anyway (HISTORY). Master (e476697, #515)
  **removes it and raises** if it is still present (`manager_endpoint_util.py:139`). Any Galaxy with that token
  in its destination config + server 0.16 → job fails loudly at submit. Fix: set `jobs_directory` to the real
  path. [MQ][REST+jobs_directory][RELAY]
- `__PULSAR_JOB_DIRECTORY__`: **new on master** (81be9db). 0.15.15 only had a TODO comment
  (`manager_endpoint_util.py:113`). HISTORY's "per-job token ... is unaffected" reads as if it already existed.
  It doesn't, so suggest rewording.
  - Substituted **only when setup happens at submit** (`setup_params`/`setup` present, i.e. LocalSetupHandler)
    (`manager_endpoint_util.py:113-136`).
  - **REST with remote setup never substitutes it, even on master.** A cvmfsexec container rule then leaves the
    literal token in the image path. Possible bug; worth a test. [REST]
  - Server <0.16 + a rule using the token → literal token in the command → container image not found. [ALL]

### 2.4 File-action path types

- New `container` path type (db8d370; `action_mapper.py:86`; `ALL_PATH_TYPES` now includes it, so
  `path_types: "*any*"` matches container image paths).
  - Evaluated **client-side only** (`PathMapper.check_for_container_rewrite`, `path_mapper.py:76`). A staging
    action that matches warns and is ignored. The expanded `path_types` list serialized to an old server is an
    unknown string there, which is harmless.
  - Galaxy consumer `container_path_rewrite` is **dev-only** (fd933fae672, guarded by `getattr` in 4bb19895ff8).
    Galaxy 26.2 + lib 0.15.15 (current dev pin) → rewrite silently unavailable.
  - Upgrade gotcha for Galaxy+lib 0.16: an existing `*any*` **rewrite** rule now also rewrites container image
    paths. [ALL; Galaxy-side]
- `cvmfsexec` (#475): the client sends a `cvmfsexec` launch param (`client.py:217,394`).
  - Old REST server: `framework.py:66-72` filters kwargs by argspec → **dropped silently**.
  - Old MQ server: `job_config.get` ignores it.
  - Either way the job runs without CVMFS, with no error. [REST][MQ][RELAY]

### 2.5 Collection / staging-out behavior (server version governs under PSS)

- `dynamic_file_sources` / `galaxy.json`: the type set (`galaxy`, `legacy_galaxy`) and the
  `realized_dynamic_file_sources` status key are unchanged since 0.15.6
  (`0.15.6:pulsar/client/staging/down.py:163`). `job_directory_files` and `tool_directory_required_files` are
  sent by Galaxy 24.0 → dev (`pulsar.py` 24.0:409-444) and supported since before 0.15.6. **Stable.** [ALL]
- `from_work_dir` directories (#410, 0.15.11, `staging/down.py`), with Galaxy 9cdff7b7ae1 (25.1+). Under PSS
  a server below 0.15.11 won't collect directory outputs. [PSS]
- Working-dir collection confinement (#432, 0.15.13) applies under PSS only on servers ≥0.15.13.
- Transport errors while staging out (#505, 3e455c8; #467): `_allow_collect_failure(output_type, e)`
  (`staging/down.py:288`) now fails the job on OSError (except FileNotFoundError) and transport errors for
  `output_workdir`. Previously these jobs went green and empty. Behavior change: lib for REST, server for PSS.
  No HISTORY entry.
- **#530 (staged-out output confinement): OPEN, not merged.** Its scope is glob matches, job-dir files,
  FIFOs, curl status, and `UnsafePathError`. Behavior change: a `from_work_dir` symlink to an input now fails
  under PSS. It leaves out `galaxy.json`'s `working_directory_file_contents`. Galaxy 26.1 64360a61721
  confines tool-provided metadata **Galaxy-side**, but under PSS the Pulsar server has already uploaded
  whatever `galaxy.json` pointed at, on every server version. [PSS; security]
- Job metrics: Pulsar instruments with its **own** `galaxy-job-metrics` (`core.py:195`,
  `job_script/__init__.py:159`). `__instrument_*` files come back through `DEFAULT_DYNAMIC_COLLECTION_PATTERN`
  and Galaxy parses them with its own copy. This is an implicit format contract across two independently
  versioned galaxy-job-metrics, stable so far. #518/#529 add `pulsar_*` instrument files that Galaxy ignores
  without the matching plugin. [ALL]

### 2.6 Status payload changes (server governs)

- DRM failures now report `failed` instead of `complete` (#485, 9015ceb), and `failed` is terminal. Galaxy
  24.0 → dev all handle `failed` with `fail_job(FAILED_REMOTE_ERROR)` (`pulsar.py` 24.0:333). The user sees the
  generic "Remote job server indicated a problem" path instead of the normal finish with the exit code. [ALL
  non-coexec]
- stdout/stderr in the completion status are truncated to the first 64 KiB (#499, a2d0ea5,
  `MAXIMUM_STATUS_STREAM_SIZE`). No HISTORY entry. The tail of long tool output is lost. Open #524 keeps
  start+end. [REST][MQ][RELAY]
- Live stdout (#503, 8870858), opt-in server side (`send_stdout_update`, default False,
  `stateful.py:91,120`). It needs PSS (`live_output_target` reads `remote_staging.action_mapper.files_endpoint`)
  and POSTs chunks to Galaxy's job_files API, which **appends to tool_stdout/stderr only on Galaxy ≥24.2**
  (`api/job_files.py:136`, absent in 24.0/24.1). The final status then sends `stdout=None`, and only Galaxy
  ≥24.2 (d336cadddba) falls back to reading the file. **Galaxy 24.0/24.1 + `send_stdout_update: true` →
  overwritten or partial stdout and None streams. Don't enable it for 24.x.** [MQ][RELAY][REST+remote actions]

## 3. Shared dependency floor and Python

- Server `requirements.txt`:
  - 0.15.6/0.15.7/0.15.9: `galaxy-job-metrics>=21.9.0 galaxy-objectstore>=19.9.0 galaxy-tool-util>=19.9.0
    galaxy-util>=22.1.2`. 0.15.14 adds `requests` and `google-cloud-batch`.
  - 0.15.15/master: `galaxy-util>=23.0`, `webob>=1.8.8`, and `pulsar-relay-client>=0.2.1; python_version >=
    "3.10"`. Paste is gone (#440, Paste → gunicorn; `web` extra). Master adds a `daemon` extra
    (`setup.py:109`).
  - 0.15.15 setup.py fix: env-marker lines used to be silently dropped (`setup.py:18-25` comment). Pre-0.15.15
    setup.py ignored any marker-bearing dependency.
- **No upper bounds or pins** on any galaxy-* lib. A new Pulsar server installs whatever latest galaxy-* libs
  are on PyPI, so it is never constrained by the peer Galaxy's version. Floors are stale against actual imports:
  `dataset_collection_description` directory semantics need galaxy-tool-util 21.09+, `galaxy.util.resources`
  needs 23.0 (only declared from 0.15.15). Low practical risk: a fresh install gets the latest.
- The real cross-version coupling via galaxy libs is behavioral, not install-time: job-metrics file formats
  (§2.5) and extended-metadata `galaxy-job-execution` vs Galaxy serialization (§2.2).
- Python:
  - **No `python_requires` in any tag.** Classifiers: 0.15.6 3.6-3.11; 0.15.15/master 3.7-3.14.
  - CI: 0.15.15 tests 3.7, 3.11-3.14. **Master dropped 3.7**: tests 3.11-3.14 (+3.10), lint 3.14. The
    galaxy_framework CI is 3.10 against Galaxy `dev` and `master` only. **No CI against any Galaxy
    release_*.**
  - Galaxy floors: 24.0/24.1/24.2 py≥3.8, 25.0 ≥3.9, 25.1+ ≥3.10.
  - A 0.16-based lib backported to 24.x/25.0 lines would run on 3.8/3.9 with no CI. No obvious 3.10-only syntax
    was found in master (grep for `match`/PEP 604/`removeprefix`), but that is unverified. The relay client is
    gated to ≥3.10.

## 4. HISTORY.rst 0.15.6 → master: compatibility-relevant entries

0.15.7
- #380 Prepare dirs on the Pulsar side (resubmit restore; extra disk use) [ALL]
- #382 `/healthz` endpoint returns version [REST]
- #365 Don't pre/postprocess cancelled jobs [ALL]
- #361 `accept-encoding: identity` on HEAD [REST][PSS]
- #385 Remote directory transfer fix (lib) [REST]

0.15.8
- #398 Legacy tool files staging location (lib) [ALL]
- #395/#378 Docker/dind/apptainer images [COEXEC]

0.15.9
- #391 BasicAuth for TES [COEXEC]
- #402 Moved `get_pulsar_app_config`/`_ensure_manager_config` (embedded/coexec import paths) [COEXEC]

0.15.10
- #404 GCP Batch coexec runner [COEXEC]

0.15.11
- #410 `from_work_dir` directories (needs Galaxy 25.1+; server for PSS) [ALL]

0.15.12
- #419 relay mode [RELAY]
- #426 config parsing without pastescript [ALL server]

0.15.13
- **#432 directory-restricted dynamic collection = `dataset_collector_descriptions`; Galaxy 26.0+ depends on
  it (§2.1)** [PSS]
- #421 relay retry/resume [RELAY]
- #429 DRMAA/condor cleanup [ALL server]

0.15.14
- #435 no-op `write_from_path` [PSS]

0.15.15
- #440 Paste → gunicorn (server deployment change) [REST]
- #444 fail fast on permanent HTTP errors in staging [REST][PSS]
- #446 py3.12-3.14
- #449 force-copy input metadata when `default_file_action: none` [ALL]
- **#448 lifecycle hardening (restart, broker, Galaxy outages)** [MQ][RELAY]
- #453 drop poster, default to the requests transport (lib transport default changes) [REST][PSS]
- #454/#458/#459 relay OIDC bootstrap, capabilities, `compute_resources` rename (BYOC URL coupling with
  Galaxy's API) [RELAY]
- #461 kombu pool blocks instead of raising [MQ]
- #460 queued_cli Slurm completion [ALL server]
- #466/#470 GCP deadlock, relay waiter drain [COEXEC][RELAY]

0.15.16.dev0 (master)
- webless daemon args [server]
- **cvmfsexec** (silently ignored by old servers, §2.4) [ALL]
- **`container` path type; `*any*` now matches containers** [ALL, Galaxy-side]
- **DRM failures → `failed`** (§2.6) [ALL]
- **`__PULSAR_JOBS_DIRECTORY__` removed, now raises** (§2.3) [MQ][REST+jobs_directory][RELAY]
- Mesos removed [server]
- register-with-galaxy uses the Galaxy-minted manager name and requires it (#514/#516) [RELAY]

**Merged since 0.15.15 with no HISTORY entry (compat-relevant; should be added before 0.16):**
- #499 64 KiB status stream cap [REST][MQ][RELAY]
- #503 live stdout (needs Galaxy ≥24.2) [PSS]
- #505/#467 transport/infra errors now fail work-dir stage-out [ALL]
- #502 configurable AMQP heartbeat [MQ]
- #519 postprocess restart recovery [MQ][RELAY]
- #496 recovery startup order [ALL server]
- #485 detail for the `failed` entry
- #451 user-mapping script for `ExternalDrmaaQueueManager` [server]
- #504 env entry with name but no value now raises (a Galaxy-sent `env` that used to pass may now fail the
  job) [ALL]
- #491 TES task IDs [COEXEC]
- #493/#472 GCP sizing and custom VM image (Galaxy 218833b6b14, dev-only, passes `custom_vm_image`) [COEXEC]
- #526 curl redirects, unresumable download restart, TUS action rebuild [REST][PSS]
- #500 file-handle closing [ALL]

## Matrix-relevant takeaways

1. Galaxy ≥26.0 + PSS → Pulsar server must be ≥0.15.13, or discovered outputs are silently lost (§2.1).
2. `send_stdout_update` needs Galaxy ≥24.2 (§2.6).
3. 0.16 server rejects `__PULSAR_JOBS_DIRECTORY__` configs, any Galaxy (§2.3).
4. cvmfsexec and container rewrites need 0.16 on both sides plus Galaxy 26.2. Old servers ignore them
   silently. Also check REST remote-setup token substitution (§2.3).
5. No peer version is enforced anywhere. Fix #135/#523 before gates like (1) multiply.
6. Pulsar CI never exercises a Galaxy release branch, and master dropped py3.7 CI while Galaxy 24.x/25.0 run
   3.8/3.9.
