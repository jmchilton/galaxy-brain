# MQ / AMQP compatibility (Galaxy client lib <-> pulsar-app server)

Scope: `PulsarMQJobRunner` -> `MessageQueueClientManager` / `MessageJobClient` (kombu) <-> `pulsar/messaging/bind_amqp.py`. Range 0.15.6 .. `origin/master` (aa6e4b6). Research done read-only via `git show`/`git diff`.

## Contract surface (same 0.15.6 -> master unless noted)

- **Exchange**: `pulsar`, type `direct` (`pulsar/client/amqp_exchange.py` `DEFAULT_EXCHANGE_NAME/TYPE`). Declared durable on every publish (`declare=[exchange]`).
- **Queue / routing key**: `<prefix>_<name>`, prefix = `amqp_key_prefix` or `pulsar_` (`_default_` manager) or `pulsar_<manager>_` (`__key_prefix`). Queue name == routing key. Unchanged.
- **Queues**:
  - Client -> server: `setup` (launch), `kill`, `status` (status request). Server consumes all three (`bind_amqp.py` `start_*_consumer`), plus `status_update_ack` if `amqp_acknowledge`.
  - Server -> client: `status_update`; client consumes it plus `<name>_ack` queues when acks enabled.
- **Setup payload** (`BaseRemoteConfiguredJobClient._build_setup_message`): `command_line, job_id, submit_params, dependencies_description, env, remote_staging{..., client_outputs, action_mapper, ssh_key}, dynamic_file_sources, token_endpoint, setup_params`. Server reads by `.get()` (`manager_endpoint_util.submit_job`), so unknown keys are ignored and missing keys default.
- **Kill**: `{"job_id"}`. **Status request**: `{"request": "status", "job_id", "force_noack": True}`.
- **status_update payload**: `manager_endpoint_util.full_status`: running = `{complete:"false", status, job_id}`; terminal = `job_id, complete, status, returncode, stdout, stderr, job_stdout, job_stderr, *_directory, *_contents, system_properties, pulsar_version, realized_dynamic_file_sources`. Status vocabulary (`pulsar/managers/status.py`) unchanged; master only adds a `Literal` type.
- **Galaxy consumer**: `PulsarJobRunner.__async_update` reads only `job_id` and `status`; `finish_job` reads the cached terminal dict via `client.full_status()`. MQ runner sets `poll = False`, so **Galaxy never calls `MessageJobClient.get_status()`** (`check_watched_item` returns before `check_watched_item_state` when `use_mq`; true in 24.0 .. dev).
- **Ack protocol** (opt-in, `amqp_acknowledge` on both sides): keys `acknowledge_uuid`, `acknowledge_queue`, `acknowledge_submit_queue`, `acknowledge_uuid_response`, `force_noack`; republish after `amqp_ack_republish_time`. Byte-identical 0.15.6 -> master.
- **Heartbeat / publish options**: broker-side per connection, not a peer contract. Kombu < 5.2 drops `timeout` (unchanged).

## Changes 0.15.6 -> master touching the contract

| sha | first tag | side | change | effect on mixed versions |
|---|---|---|---|---|
| 7410c9e | 0.15.7 | server | don't finish pre/post-process if cancelled mid-stage | server-internal; no wire change |
| 2e28241 | 0.15.13 | client+server | `ClientOutputs.dataset_collector_descriptions`, sent inside `remote_staging.client_outputs`; server `dynamic_match` uses it | **new client -> old server: break** (see below) |
| 37e0ad5 | 0.15.15 | server | `submit_job` ignores duplicate `setup` for a job already terminal/active (`_is_duplicate_setup`) | helps all clients; also makes a misrouted status request harmless |
| de95b65 | 0.15.15 | server | status updates go through on-disk outbox when `persistence_directory` set (`messaging/outbox.py`) | at-least-once: duplicate `status_update` possible after a crash. Galaxy `_update_job_state_for_status` doesn't dedupe in any release; same risk as the existing ack republish. Low risk |
| 0463d37 then 91945e2 | both 0.15.15 | both | `amqp_durable` knob; queues/exchange `durable=` explicit; `delivery_mode=2` when durable | default stays durable (0.15.15 factory `params.get("amqp_durable", True)`), same as kombu default in 0.15.6, so declarations match. **Config hazard**: `amqp_durable: false` on one side vs any older/durable peer -> RabbitMQ 406 PRECONDITION_FAILED on redeclare of `pulsar` exchange/queues (not in `recoverable_exceptions`, so the consumer thread dies). Opt-out only |
| f8a66a6 | 0.15.15 | both | producer pool `acquire(block=True)` | local |
| 59b7bef, e8f347a, 9ca39bb... | 0.15.12+ | both | relay transport (`bind_relay.py`, `RelayClientManager`) chosen when connection string is http(s) | MQ path untouched |
| 6eb8dae | master | server | terminal `stdout`/`stderr` capped at 64 KiB (`MAXIMUM_STATUS_STREAM_SIZE`) | old clients get truncated tool stdout/stderr; schema unchanged. Graceful |
| 7b4e451, 6de4dbb, 31942e7, c7e7786 | master | server | live stdout (`send_stdout_update`, default off): POSTs chunks to Galaxy job-files endpoint; terminal status then sends `stdout=None`/`stderr=None` | Galaxy >= 24.2 (galaxy#16975, 8c30a87c5bd) appends `tool_stdout`/`tool_stderr` and falls back to the file on `None`. **Galaxy 24.0/24.1 lack #16975**: endpoint overwrites per chunk, `finish_job` takes `None` as-is, so stdout/stderr is lost or truncated. Only when the server opts in |
| 5ec0bc6 | master | client+server | setup message key `cvmfsexec` -> merged into `setup_params` | old server ignores it (feature unavailable). Old client never sends it |
| 81be9db, db8d370 | master | client+server | server substitutes `__PULSAR_JOB_DIRECTORY__` in the command line; client `container` path type rewrite (Galaxy dev `container_path_rewrite`) | dev client + `path_types: container` rule -> old server leaves the literal token -> broken container path. Opt-in feature, **breaks** when used against an old server |
| aefd720, 1f5be1f | master | server | `__PULSAR_JOBS_DIRECTORY__` no longer substituted; server raises if it's still in the command line | **old client -> master server: break** for destinations configured `jobs_directory: __PULSAR_JOBS_DIRECTORY__` (shipped in 0.15.15 `docs/files/job_conf_sample_mq_rsync.yml:18`). Fails loudly at submit. Fix on the Galaxy side: set the real path |
| 1da955a, 4a923f3 | master | both | `amqp_heartbeat` configurable (0 disables) | default 580 as before; local |
| 879747f, 087a9fd, 53787d9, c9067e7 | master | server | recover jobs interrupted in postprocessing; FAILED treated as terminal; monitor deferred until after recovery | may re-emit a terminal `status_update` after restart (same duplicate story as outbox). Vocabulary unchanged |

### Latent client bug (not reached by Galaxy)
- `MessageJobClient.get_status()` publishes to `setup`, not `status` (0.15.6 `client.py:426`, still on master); fix is galaxyproject/pulsar#532 (`1bb0efe`). On server < 0.15.15 a stray request would go through `submit_job` with `command_line=None` and re-run `preprocess_and_launch`, or fail via `handle_failure_before_launch`. On >= 0.15.15, `_is_duplicate_setup` ignores it. **The Galaxy MQ runner never calls `get_status()`**, so this doesn't affect the matrix. The #532 fix targets `status`, which every server since 0.15.6 consumes, so the fixed client works with all servers.

### dataset_collector_descriptions details (new client -> old server)
- Galaxy 3a3d872460c (in `release_26.0`, `release_26.1`, dev; **not 25.1**) gates on `pulsar_version >= 0.15.13.dev0` from `remote_job_config`. When the gate passes it **drops** `tool.output_discover_patterns` from `dynamic_outputs` and sends descriptions instead.
- Under MQ, `remote_job_config` comes from `LocalSetupHandler` -> `build_job_config`, which reports the **client lib's** `pulsar_version` (`pulsar/client/setup_handler.py:4,111`), not the server's. So Galaxy 26.0+ (lib >= 0.15.14) always takes the new path.
- Server <= 0.15.12 `ClientOutputs.from_dict` (`managers/staging/post.py:34`) has no such field, so `dynamic_match` only sees `DEFAULT_DYNAMIC_COLLECTION_PATTERN` (`primary_.*|galaxy.json|...`) plus galaxy.json. Result: `<discover_datasets>` outputs with custom patterns or directories **aren't staged back**, and the job finishes with missing discovered outputs. `primary_*` and galaxy.json still work.
- Applies when Galaxy collects outputs (the non-extended-remote-metadata branch of `__client_outputs`), the usual MQ setup.

## Per-pair verdicts

### Old client -> new server
| Galaxy (client) | -> 0.15.15 server | -> master/0.16 server |
|---|---|---|
| 24.0/24.1 (0.15.6) | expected-compatible | expected-compatible by default. **likely-broken** if the destination uses `__PULSAR_JOBS_DIRECTORY__` (aefd720). **feature-degraded/lossy** if the server enables `send_stdout_update` (no #16975: stdout lost). stdout capped at 64 KiB |
| 24.2 (0.15.7) | expected-compatible | expected-compatible. `__PULSAR_JOBS_DIRECTORY__` caveat; 64 KiB cap; live stdout works |
| 25.0 (0.15.9) | expected-compatible | same as 24.2 |
| 25.1/26.0 (0.15.14) | expected-compatible | same as 24.2 |
| 26.1 (0.15.15) | expected-compatible | same as 24.2 |

### New client -> old server
| Galaxy (client) | -> 0.15.6 .. 0.15.12 | -> 0.15.13 / 0.15.14 |
|---|---|---|
| 26.0 (0.15.14), 26.1 (0.15.15) | **likely-broken** for tools with custom `discover_datasets` (3a3d872460c + client-version gate); otherwise compatible | expected-compatible |
| dev/26.2 (master) | likely-broken as above. `cvmfsexec` ignored, `container`-path rewrites leave literal `__PULSAR_JOB_DIRECTORY__` (feature-degraded/broken when configured) | expected-compatible. cvmfsexec / container rewrite unavailable (break only if configured) |
| 24.x / 25.0 / 25.1 | expected-compatible both ways (MQ wire core unchanged since 0.15.6) | expected-compatible |

## Suggested follow-ups
- Galaxy: gate `dataset_collector_descriptions` on the **server** `pulsar_version`. It's only known after the first status message, so for MQ consider always sending both patterns and descriptions; a server >= 0.15.13 could prefer the descriptions.
- Pulsar: release note for the `__PULSAR_JOBS_DIRECTORY__` removal, and update the 0.15.x sample `job_conf_sample_mq_rsync.yml`.
- Pulsar: note in docs that `amqp_durable` must match on both sides.
- Land #532 (no compat risk).
