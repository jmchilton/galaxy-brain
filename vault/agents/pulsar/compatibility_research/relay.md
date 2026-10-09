# Relay modality: Galaxy <-> Pulsar wire compatibility

Scope: Galaxy `PulsarRunner` with `relay_url` (client `RelayClientManager` / `RelayJobClient` in `pulsar/client/**`) <-> Pulsar server `pulsar/messaging/bind_relay.py`, via the HTTP `pulsar-relay` service. Read-only research, 2026-10-04. Pulsar `origin/master` = aa6e4b6.

No `pulsar-relay` (server) clone under `~/projects/repositories/`. The relay client library `pulsar-relay-client` 0.2.2 was read from `~/projects/repositories/galaxy/.venv/.../site-packages/pulsar_relay_client/`.

## When relay landed

- **Pulsar**: first in **0.15.12** (59b7bef, 54dc8a2, e8f347a). Topic prefix arrived in **0.15.13** (8f77192); retry/resume came in the same release (b79e48a). So 0.15.6 / 0.15.7 / 0.15.9 have no relay code at all.
- **Galaxy**: runner support came in 1e59709edc1 (2025-10-15, "Pulsar relay implementation"). That commit is in `release_26.0`, `release_26.1` and `dev`, and **not** in `release_25.1`.
  - Galaxy 25.1 pins lib 0.15.14, which has `RelayClientManager`. But `RunnerParams` raises on unknown keys (`ParamsWithSpecs._param_unknown_error`), so `relay_url` is rejected. Relay is unusable on 25.1, so **n/a**.
- So relay rows exist only for **Galaxy 26.0 (lib 0.15.14), 26.1 (lib 0.15.15), 26.2 (planned 0.16 = master)**. Galaxy 24.0 to 25.1 are **n/a**.

## The contract (stable since 0.15.13)

- **Topics** (`__make_topic_name` server-side; `RelayClientManager._make_topic_name` client-side). The pattern is `[prefix_]base[_manager]`, and `_default_` gets no suffix. Bases are `job_setup`, `job_status_request`, `job_kill` (Galaxy publishes these, Pulsar consumes) and `job_status_update` (Pulsar publishes, Galaxy consumes).
  - The naming has not changed between 0.15.13 and master.
  - 0.15.12 has no prefix support (inline f-strings). This only matters if someone sets `relay_topic_prefix` against a 0.15.12 server, and no Galaxy pin is 0.15.12.
  - Prefix and manager name must match on both sides, by operator config. Nothing negotiates them (Galaxy `relay_topic_prefix` runner param <-> Pulsar `relay_topic_prefix` app conf).
- **Payloads**:
  - setup = the same `launch_params` dict that AMQP/REST use (`_build_setup_message`)
  - status request = `{"job_id"}`
  - kill = `{"job_id"}`
  - status update = `manager_endpoint_util.full_status(...)`, the same dict AMQP uses
  - `RelayJobClient` is byte-identical between 0.15.14 and master.
- **Relay HTTP API, legacy path** (the only path any released Galaxy can use):
  - `POST /auth/login` (form username/password, returns JWT `access_token` + `expires_in`)
  - `POST /api/v1/messages` (`{topic,payload,ttl?,metadata?}`)
  - `POST /messages/poll` (`{topics,timeout<=60,since:{topic:message_id}}`, returns `{messages:[{topic,message_id,payload}]}`)
  - The embedded transport in 0.15.14 and `pulsar-relay-client` 0.2.2 use identical endpoints and bodies. 0.2.2 also adds an `Idempotency-Key` header on publish (the server dedupes on it; an older relay would just ignore it).
- **Newer relay endpoints**, used only by `pulsar-relay-client`:
  - `/auth/token/refresh` (single-use rotating refresh tokens)
  - `/auth/device/code` and `/auth/device/token` (RFC 8628 device flow, `pulsar-config --login`)
  - `/auth/me`
  - `/api/v1/topics` (create/verify ownership)
  - `/api/v1/topics/{t}/messages` (capability snapshot fetch)
- **Capabilities** (`pulsar/capabilities.py`, `SCHEMA_VERSION = 1`, new in 0.15.15, 11d9daf):
  - Published once at startup to topic `[prefix_]pulsar_capabilities[_manager]`, gated by `message_queue_publish_capabilities` (default True). Failures are swallowed.
  - The module docstring says a schema bump is wire-breaking, so only additive optional fields are allowed. `capabilities.py` has had only cosmetic changes between 0.15.15 and master.
  - **No Galaxy release or `dev` consumes it.** The only consumer is on unmerged branches `mvdbeek/pulsar-byoc-capabilities` and `pulsar-byoc` (`compute_resources` manager, `test_pulsar_capabilities_cache.py`). For the matrix, capabilities are dormant: they don't affect any pair today.
- **Auth/config in Galaxy**: only `relay_url`, `relay_username`, `relay_password` and `relay_topic_prefix` are in `PARAMETER_SPECIFICATION`, in 26.0, 26.1 and dev alike.
  - Lib 0.15.15 also accepts `relay_cursor_path`, `relay_handler_id`, `relay_credentials_file` and `relay_refresh_token`, but Galaxy's spec rejects them. Galaxy is therefore always username/password with an in-memory cursor.

## Contract changes since relay landed

| sha | tag | side | change | verdict |
|---|---|---|---|---|
| 8f77192 | 0.15.13 | both | optional `relay_topic_prefix` | graceful (default `''` = old names) |
| b79e48a | 0.15.13 | both | retry/backoff, `since` resume | graceful |
| de95b65 | 0.15.15 | server | at-least-once status outbox (may re-send status updates) | graceful; Galaxy status handling is idempotent like AMQP's |
| af6cb21 | 0.15.15 | both | persisted long-poll cursor (opt-in path) | graceful; Galaxy can't enable it (unknown runner param) |
| b4b6f97, 095dd0d | 0.15.15 | server/relay | OIDC device-flow credentials file, BYOC registration | additive; needs a newer relay server; password path kept |
| 9ca39bb, d569235 | 0.15.15 | both | moves the embedded transport to the external `pulsar-relay-client>=0.2.1; python>=3.10`, lazily imported | wire-identical; adds a dependency axis; relay unusable on Py<3.10 servers |
| 9ca39bb | 0.15.15 | server config | `message_queue_username` no longer defaults to `'admin'`; need a username+password or a credentials file | operator config break on server upgrade, not a wire break |
| 11d9daf | 0.15.15 | server->relay | capabilities snapshot topic | additive, unconsumed |
| 0e651f9 | 0.15.15 | client | `get_relay_access_token()` | additive (for BYOC Galaxy) |
| dab54bc | 0.15.15 | server | `relay_long_poll_timeout` | local only |
| c26e15f, 27a7854 | master | pulsar-config <-> Galaxy BYOC API | binds to the manager name Galaxy mints; no `sub` fallback | only affects unmerged Galaxy BYOC, so outside the matrix |
| 5ec0bc6 | master | client->server | setup payload gains `cvmfsexec` | graceful: old servers ignore an unknown key (`submit_job` reads by name) |

Changes that cross modalities and also ride relay are not relay-specific: `__PULSAR_JOBS_DIRECTORY__` removal (aefd720), 64 KiB stdout/stderr cap, `stdout=None` when live output delivered, `failed` made terminal. See the AMQP and status-payload research. Galaxy dev's runner already handles `pulsar_status == "failed"`.

## Per-pair verdicts (client = Galaxy's embedded lib, server = pulsar-app)

- **Galaxy 24.0 / 24.1 / 24.2 / 25.0 / 25.1, any server**: **n/a**. There's no relay runner param (and no relay code at all before 0.15.12).
- **Galaxy 26.0 (0.15.14) <-> server 0.15.12**: **expected-compatible** with an empty prefix. Prefix unsupported, so **likely-broken** if a prefix is set (topic mismatch, jobs silently never picked up).
- **Galaxy 26.0 (0.15.14) <-> server 0.15.13 / 0.15.14**: **expected-compatible**.
- **Galaxy 26.0 (0.15.14) <-> server 0.15.15 / master**: **expected-compatible** on the wire. The server needs an explicit `message_queue_username`. Its capability snapshot goes unread. The outbox may duplicate status updates (harmless).
- **Galaxy 26.1 (0.15.15) <-> server 0.15.12 to 0.15.14**: **expected-compatible**. Same legacy endpoints and payloads. Galaxy pulls `pulsar-relay-client` transitively (it's not in 26.1's `pinned-requirements.txt`, so the version floats `>=0.2.1` at install time).
- **Galaxy 26.1 <-> server 0.15.15 / master**: **expected-compatible**.
- **Galaxy 26.2 (0.16/master) <-> server 0.15.12 to 0.15.15**: **expected-compatible**. A new `cvmfsexec` setup key is ignored by old servers, so a per-job cvmfsexec override is **feature-degraded**.
- **Galaxy 26.2 <-> server master**: **expected-compatible**.
- **Old client -> new server** in general: safe. The server only added an unconsumed topic and outbox re-delivery.
- **New client -> old server** in general: safe. The client-side additions are opt-in or ignored keys.
- No relay pair is likely-broken unless config mismatches: prefix on 0.15.12, or a server upgrade to 0.15.15 relying on the `'admin'` default username.

## Third version axis: yes, two of them

1. **`pulsar-relay` server version.** The legacy endpoints are all any released Galaxy uses. Device-flow credentials, refresh-token rotation, topic ownership, `Idempotency-Key` dedupe and capability fetch (the future Galaxy BYOC) need a newer relay. Unverified, since there's no relay clone; the matrix should state a minimum relay version for BYOC/capabilities features.
2. **`pulsar-relay-client` version** (0.15.15+ on both sides). It's floored at `>=0.2.1`, and Galaxy dev pins 0.2.2 (836298d499e). It's unpinned in Galaxy 26.1, and needs Python >= 3.10 (Galaxy 26.1 already requires that; for Pulsar servers on 3.8/3.9, relay silently becomes unavailable on 0.15.15+).

Recommendation: the matrix needs a relay column only for Galaxy >= 26.0. Add a footnote naming the minimum `pulsar-relay` server and `pulsar-relay-client` versions. Mark all earlier Galaxy rows "n/a".

## Unverified

- Relay server endpoint and version history: no clone.
- Whether `/messages/poll` without `since` replays retained messages. This decides whether Galaxy 26.x, which can't persist a cursor, loses status updates published while it was down.
