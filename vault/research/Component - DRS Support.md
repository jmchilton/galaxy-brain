---
type: research
subtype: component
tags: [research/component, galaxy/lib, galaxy/api, galaxy/security]
component: "DRS Support"
galaxy_areas: [files, api, security]
status: draft
created: 2026-07-13
revised: 2026-08-08
revision: 2
ai_generated: true
summary: "Client and server for GA4GH DRS URIs — file-source plugin, identifiers.org compact-identifier resolution, OIDC bearer token attachment"
sources: ["/Users/jxc755/projects/repositories/galaxy-brain/.ingest-dossiers/Component-DRS-Support.md"]
related_notes:
  - "[[Component - Data Fetch]]"
  - "[[PR 21335 - GA4GH WES API]]"
  - "[[Component - CORS Handling]]"
  - "[[Component - API Tests]]"
  - "[[Component - Private Object Stores]]"
related_prs:
  - 22484
  - 20410
---

# DRS Support

GA4GH **Data Repository Service (DRS)** support in Galaxy — resolving and downloading `drs://` URIs as a file source, plus an experimental DRS server exposing Galaxy datasets.

**Verification anchor**: Galaxy `origin/dev` at SHA `de395f9236c12b008dea7e816bd8b05062b565c3`. Every `path:line` below was read at this SHA.

**Scope**: primary focus is Galaxy as a DRS *consumer/client* (`drs://` URI → download during data import). Galaxy also ships an experimental DRS *server* (`lib/galaxy/webapps/galaxy/api/drs.py`), covered briefly as an adjacent facet. Out of scope: GA4GH WES ([[PR 21335 - GA4GH WES API]]) and TRS ([[Component - Tool Shed Search and Indexing]]), which share only the `build_service_info` plumbing.

**Recent activity** (both merged at this SHA):
- PR #20410 "Add DRS compact identifier support" (merge `e384c6f`, 2026-01-28) — compact-identifier resolution + S3 access methods, all in `util.py`.
- PR #22484 "Allow attaching OIDC access token to DRS requests" (merge `f63ada6`, 2026-05-21, from AustralianBioCommons) — OIDC bearer-token attachment with expiry tracking.

---

## Table of Contents

1. [Architecture & Data Flow](#architecture--data-flow)
2. [The DRS File-Source Plugin](#the-drs-file-source-plugin)
3. [The DRS Client](#the-drs-client)
4. [Compact-Identifier Resolution (PR #20410)](#compact-identifier-resolution-pr-20410)
5. [OIDC Access-Token Attachment (PR #22484)](#oidc-access-token-attachment-pr-22484)
6. [Config Surface](#config-surface)
7. [Tests](#tests)
8. [Adjacent — Galaxy as a DRS Server](#adjacent--galaxy-as-a-drs-server)
9. [Known Issues & Limitations](#known-issues--limitations)

---

## Architecture & Data Flow

DRS is implemented as a **Galaxy file source**, not a bespoke subsystem. A `drs://` URI is dispatched to a file source by URL-scoring, then the DRS plugin delegates to a standalone DRS client that resolves the URI to a concrete download URL and streams it through `stream_url_to_file` (which re-enters the file-source machinery for the resolved http(s)/s3 URL). See [[Component - Data Fetch]] for the surrounding import pipeline.

```
drs://... URI
  → ConfiguredFileSources.get_file_source_path(uri)      lib/galaxy/files/__init__.py:199
      → find_best_match: max score_url_match() > 0        lib/galaxy/files/__init__.py:189
  → DRSFilesSource._realize_to(source_path, native_path)  lib/galaxy/files/sources/drs.py:55
      → fetch_drs_to_file(...)                             lib/galaxy/files/sources/util.py:319
          → [compact id] resolve_compact_identifier_to_url via identifiers.org   util.py:284
             [or legacy]  https://<netloc>/ga4gh/drs/v1/objects/<object_id>       util.py:353
          → retry_and_get(get_url) (handles 202 + Retry-After)                    util.py:72
          → for each access_method: _get_access_info() → (url, headers)           util.py:88
             → if s3://  : _download_s3_file() via s3fs                           util.py:112
             → else      : stream_url_to_file() (re-enters file sources)          util.py fetch loop
```

The DRS plugin is **read-only** (`writable=False`, `drs.py:45`; `_write_from` raises `NotImplementedError`, `drs.py:70`).

---

## The DRS File-Source Plugin

`lib/galaxy/files/sources/drs.py`:

- `class DRSFilesSource(BaseFilesSource[...])` — `plugin_type = "drs"` (`drs.py:33`), `plugin_kind = PluginKind.drs` (`drs.py:34`; enum member `lib/galaxy/files/sources/__init__.py:62`).
- Two config classes: `DRSFileSourceTemplateConfiguration` (`drs.py:19`, templatable) and `DRSFileSourceConfiguration` (`drs.py:26`, resolved). Fields:
  - `url_regex: str = r"^drs://"` (`drs.py:21,27`) — **not templated** (needed at init before any RuntimeContext exists, comment `drs.py:20`). Compiled in `__init__` (`drs.py:49`); an assert enforces it is set (`drs.py:48`).
  - `force_http: bool = False` (`drs.py:22,28`) — forces `http` scheme for legacy resolution.
  - `http_headers: dict[str,str] = {}` (`drs.py:23,29`) — headers merged into outbound requests; template-expandable in the template config.
- `__init__` applies defaults `id="_drs"`, `label="DRS file"`, `doc="DRS file handler"`, `writable=False` (`drs.py:41-47`).
- `score_url_match(url)` (`drs.py:75`): returns match length (`match.span()[1]`) if `url_regex` matches, else `0`. A longer/more-specific `url_regex` (e.g. `^drs://mydrssite.org/`) out-scores the generic `^drs://` stock source — this is how a site-specific DRS source is preferred over the stock one.
- `_realize_to` (`drs.py:55`): pulls `user_context` from the runtime context, copies `config.http_headers` into a local dict, and calls `fetch_drs_to_file(..., headers=headers or None, force_http=config.force_http)`. `_allowlist` (`drs.py:52`) returns `self._file_sources_config.fetch_url_allowlist`.

**Dispatch/registration** (`lib/galaxy/files/__init__.py`):
- `find_best_match` scores every source and returns the highest positive scorer (`files/__init__.py:189-197`).
- `get_file_source_path(uri)` requires `"://"` in the URI, raising `RequestParameterInvalidException` if no handler matches (`files/__init__.py:199-208`).
- **Stock plugins**: with `load_stock_plugins=True`, one stock instance per plugin type is auto-created (`id=f"stock_{plugin_type}"`, `files/__init__.py:151-158`), i.e. a `stock_drs` source with the default `^drs://` regex. `fetch_drs_to_file` itself falls back to `ConfiguredFileSources.from_dict(None, load_stock_plugins=True)` when no user context is present.

---

## The DRS Client

`lib/galaxy/files/sources/util.py` (**not** `lib/galaxy/util/`) holds all DRS protocol logic.

- **`fetch_drs_to_file(drs_uri, target_path, user_context, force_http=False, retry_options=None, headers=None, fetch_url_allowlist=None)`** (`util.py:319`) — the single entry point:
  1. Require `drs://` scheme (`util.py:330`).
  2. If the remainder contains `:`, try `resolve_compact_identifier_to_url` first (`util.py:284`); on `ValueError`, fall back to legacy only if a `/` is present, else re-raise (`util.py:340-350`).
  3. Legacy fallback: split `netloc/object_id`, build `{http|https}://{netloc}/ga4gh/drs/v1/objects/{object_id}` (`https` unless `force_http`) (`util.py:352-360`).
  4. `retry_and_get(get_url, ...)` → parse JSON → require non-empty `access_methods` (`util.py:361-367`).
  5. Iterate access methods; `_get_access_info` yields `(access_url, access_headers)`. `type == "https"` sets `http_headers` + `fetch_url_allowlist`; `type == "s3"` sets `fetch_url_allowlist` (`util.py:369-390`). `s3://` URLs → `_download_s3_file` directly; else `stream_url_to_file(...)`. First success `break`s (`util.py:392-410`).
  6. If nothing downloaded, raise `_not_implemented(...)` listing unhandled access-method types (`util.py:412-414`).
- **`retry_and_get(get_url, retry_options, headers=None)`** (`util.py:72`): GET with `DEFAULT_SOCKET_TIMEOUT`; on HTTP `202` honours `Retry-After` (required, else `ValueError`), sleeps, decrements `retry_times` (default 5, `RetryOptions` `util.py:67`), recurses; raises after timeout.
- **`_get_access_info(obj_url, access_method, headers)`** (`util.py:88`): prefers `access_id` (GETs `{obj_url}/access/{access_id}` for signed/authenticated URLs) over inline `access_url`; parses `"Key: value"` header strings into a dict. Raises `ValueError` if neither present.
- **`_download_s3_file(s3_url, target_path, headers)`** (`util.py:112`): signed URLs (contain `X-Amz-Algorithm`/`Signature`) stream via `requests`; raw `s3://` URLs try `s3fs.S3FileSystem` anonymous → authenticated → requester_pays. Imports `s3fs` lazily; raises `ImportError` if absent.
- **`_not_implemented(drs_uri, desc)`** (`util.py:32`): builds a `NotImplementedError` with remediation text; special-cased guidance for S3 access methods.

---

## Compact-Identifier Resolution (PR #20410)

Added entirely in `util.py`. A compact identifier is `drs://<prefix>:<accession>` (e.g. `drs://sparc.drs:package/uuid`, `drs://dg.ANV0:...`), resolved via the **identifiers.org registry API** (n2t.net is *not* used — only identifiers.org is implemented).

- **`parse_compact_identifier(drs_uri)`** (`util.py:260`): strips `drs://`, splits on first `:` into `(prefix, accession)`; validates prefix chars `[a-z0-9._]` and both parts non-empty (`util.py:271-281`).
- **`class CompactIdentifierResolver`** (`util.py:171`): a **process-wide singleton** (`__new__` caches `_instance`, `util.py:175-179`) with a `_cache` dict and default 24h TTL (`cache_ttl=86400`, `util.py:184`). `_reset_singleton` exists for tests (`util.py:194`).
  - `_query_identifiers_org(prefix)` (`util.py:202`): GET `https://registry.api.identifiers.org/restApi/namespaces/search/findByPrefix?prefix=...`, follow `_links.resources`, pick the `official` resource's `urlPattern` (else first with a `urlPattern`) (`util.py:203-243`). Network/JSON errors are logged and yield `None`.
  - `resolve_prefix(prefix)` (`util.py:245`): cache-first, else query + cache.
- **`resolve_compact_identifier_to_url(drs_uri, resolver=None)`** (`util.py:284`): resolves prefix → `urlPattern`, substitutes URL-encoded accession into `{$id}`, returns the URL. Enforces `http(s)://` result and rejects CR/LF injection (`util.py:308-316`). Contains **provider-specific workarounds** for double-prefix duplication: SPARC (`sparc.drs` + `package/...` + `/package/{$id}`) strips the `package/` prefix (`util.py:298-303`); comment references GTEx-on-AnVIL (`dg.ANV0`) and ga4gh/data-repository-service-schemas issue #340.

Legacy (host-based) URIs `drs://<host>/<object_id>` remain supported via the fallback path in `fetch_drs_to_file`.

---

## OIDC Access-Token Attachment (PR #22484)

Attaches the logged-in user's OIDC access token as a `Bearer` Authorization header on outbound DRS/file-source requests, with expiry tracking. Touches auth, files, jobs, exceptions. Related to the header-handling concerns in [[Component - CORS Handling]].

**Two attachment mechanisms** (both usable from a `drs` source's `http_headers`):

1. **Template expansion** — reference the token directly: `Authorization: "Bearer ${user.oidc_access_tokens['oidc']}"` (see `test/unit/files/drs_oidc_file_sources_conf.yml`). Backed by the new user-context property.
2. **Declarative provider** — set `oidc_auth_provider: <provider-key>` on the source; the base class auto-injects `Authorization: Bearer <token>` and records the token's expiry.

**User context** (`lib/galaxy/files/__init__.py`):
- New protocol props `oidc_access_tokens -> dict[str,str] | None` (`files/__init__.py:362`) and `oidc_access_token_expirations -> dict[str,datetime]` (`files/__init__.py:365`).
- `ProvidesFileSourcesUserContext.oidc_access_tokens` (`files/__init__.py:437`): walks `user.social_auth`, collecting `extra_data["access_token"]` keyed by provider; `None` for anonymous.
- `oidc_access_token_expirations` (`files/__init__.py:453`) imports `compute_token_expiry_for_provider` and maps provider→expiry.
- `oidc_access_tokens` added to `dict_collection_visible_keys` (`files/__init__.py:327`) so it serialises for job-side user contexts; `DictFileSourcesUserContext` reads both from kwargs (`files/__init__.py:515,519`).

**Files-source properties** (`lib/galaxy/files/models.py`): `FilesSourceProperties` gains `oidc_auth_provider: Optional[str]` and `auth_expires_at: Optional[str]` (ISO-UTC token expiry, set at serialisation time).

**Base file source** (`lib/galaxy/files/sources/__init__.py`):
- `__init__` parses `config.auth_expires_at` into `self._auth_expires_at` (`sources/__init__.py:367`).
- `_check_credentials_fresh()` (`sources/__init__.py:371`): raises `FileSourceCredentialExpired` if now > expiry. Called before `list`, `write_from`, `realize_to` (`sources/__init__.py:520,578,599`).
- `_compute_auth_expires_at(user_context)` (`sources/__init__.py:377`): looks up `oidc_access_token_expirations[oidc_auth_provider]`.
- `_inject_oidc_bearer_token(http_headers, user_context)` (`sources/__init__.py:386`): copies headers and `setdefault`s `Authorization: Bearer <token>` — **explicitly configured Authorization headers win**. Returns `None` if no provider/context/token.
- Wired into `to_dict(for_serialization=...)` (`sources/__init__.py:433-438`) and `_get_runtime_context` (`sources/__init__.py:479-483`).

**DRS plugin change**: `drs.py:_realize_to` now copies `config.http_headers` into a local dict and passes `headers=headers or None` (`drs.py:60,66`) — the only functional change PR #22484 made to `drs.py` (3 lines).

**Auth manager / token refresh**:
- `locate_token_expiration(extra_data)` moved to module scope (`lib/galaxy/authnz/psa_authnz.py:60`; old `_try_to_locate_refresh_token_expiration` delegates to it, `psa_authnz.py:316`). Reads `expires`/`expires_in`, or nested `refresh_token` dict.
- `MinimalJobWrapper._refresh_oidc_tokens_for_job(trans)` (`lib/galaxy/jobs/__init__.py:1081`): calls `authnz_manager.refresh_expiring_oidc_tokens(trans, user)` when building `job_io` (`jobs/__init__.py:1092`), so a job's file-source requests use freshly-refreshed tokens. `refresh_expiring_oidc_tokens` at `lib/galaxy/authnz/managers.py:349`.

**Exception**: `FileSourceCredentialExpired(MessageException)` — `status_code=401`, err_code `FILE_SOURCE_CREDENTIAL_EXPIRED` (`lib/galaxy/exceptions/__init__.py:177`; code `401002` in `error_codes.json`).

**New helper module `lib/galaxy/tools/data_fetch_utils.py`**:
- `compute_token_expiry_for_provider(user, provider)` (`data_fetch_utils.py:33`): `auth_time + expires` as a UTC datetime.
- `iter_fetch_urls(value)` (`data_fetch_utils.py:11`): recursively yields `url` values where `src == "url"`.
- `fetch_uses_authorization_header(request, file_sources, user_context)` (`data_fetch_utils.py:22`): checks whether any fetch URL's file source serialises an `Authorization` header.

> **Flag — apparent dead/forward-looking code**: at `de395f9`, `fetch_uses_authorization_header` has **no caller** in `lib/` (only `compute_token_expiry_for_provider` is imported, at `files/__init__.py:454` + a unit test). `iter_fetch_urls` is used only by `fetch_uses_authorization_header`. Likely staged for a follow-up. PR #22484's edit to `lib/galaxy/tools/data_fetch.py` was cosmetic (reformatted the `do_fetch(...)` call, `data_fetch.py:52-56`).

---

## Config Surface

`lib/galaxy/config/sample/file_sources_conf.yml.sample` (lines 238-252) ships two DRS examples:
- A **custom** source (`type: drs`, `id: drscustom`) with `url_regex: "^drs://mydrssite.org/"` and a Cheetah-templated Basic-auth `http_headers.Authorization` from `user.preferences`. Doc warns you should also define a stock source or only this server's downloads are allowed.
- A **stock** source (`type: drs`, `id: drsstock`) — doc: define this generic DRS source or "stock drs download capability will be disabled" when any other DRS source is configured.

Per-source options: `url_regex`, `force_http`, `http_headers`, plus (PR #22484) `oidc_auth_provider` / `auth_expires_at`. `fetch_url_allowlist` comes from the global files config (consumed via `DRSFilesSource._allowlist`, `drs.py:52`).

Server-side GA4GH config (for the DRS server): `ga4gh_service_id` / `ga4gh_service_environment` / service-info fields in `config_schema.yml:3273,3299,3308-3316` (sample `galaxy.yml.sample:2445-2477`).

---

## Tests

DRS-consumer tests (see [[Component - API Tests]] for the harness):
- `test/unit/files/test_drs.py` — file-source realization + OIDC: `test_provides_file_sources_user_context_oidc_access_tokens` (+ `_anonymous`), `test_drs_http_headers_template_expansion`, `test_drs_oidc_token_wrong_provider_raises`, `test_drs_oidc_token_no_tokens_raises`, `test_file_source_drs_http`, `test_file_source_drs_s3`, `test_file_source_drs_attach_oidc_token`. Uses `responses` to mock DRS/HTTP. Confs: `drs_file_sources_conf.yml`, `drs_oidc_file_sources_conf.yml`.
- `test/unit/files/test_drs_compact_identifiers.py` — parse/resolve/cache: `test_parse_valid_compact_identifier`, `test_parse_invalid_prefix_format`, `test_identifiers_org_resolution`, `test_cache_behavior`, `test_full_resolution`, `test_resolution_with_special_chars`, `test_invalid_resolved_url`, `test_fetch_compact_identifier_drs`.
- `test/integration/test_drs_compact_identifiers.py` — `TestDRSCompactIdentifiersIntegration`: `test_fetch_compact_identifier_drs_file`, `test_compact_identifier_error_handling`, `test_meta_resolver_failure_handling`.
- `test/unit/app/tools/test_data_fetch_utils.py` — imports `compute_token_expiry_for_provider`.
- `test/unit/webapps/galaxy/services/test_tools_service.py` — added by PR #22484 (+78 lines) around fetch/auth-header service behaviour.

DRS-server tests: `lib/galaxy_test/api/test_drs.py` — `class TestDrsApi(ApiTestCase)`: `test_service_info`, `test_404_on_private_datasets`, `test_public_data_access`, `test_public_data_access_util_code`, `test_exception_handling_schema`.

---

## Adjacent — Galaxy as a DRS Server

`lib/galaxy/webapps/galaxy/api/drs.py` exposes Galaxy datasets over GA4GH DRS v1.2.0 (module docstring: "Implement a DRS server for Galaxy dataset objects (experimental)"):
- `GET /ga4gh/drs/v1/service-info` → `build_service_info(... artifact="drs" ...)` (shared with WES, from `services/ga4gh.py`).
- `GET|POST /ga4gh/drs/v1/objects/{object_id}` → `DatasetsService.get_drs_object(...)` returning a `DrsObject` (schema `lib/galaxy/schema/drs/`).
- `GET|POST /ga4gh/drs/v1/objects/{object_id}/access/{access_id}` → always raises `ObjectNotFound` ("Access IDs are not implemented for this DRS server").
- `GET /api/drs_download/{object_id}` → streams the dataset via `FileResponse`.

All routes are `public=True`; private datasets 404. This server is independent of the client path above and shares `build_service_info` with [[PR 21335 - GA4GH WES API]].

---

## Known Issues & Limitations

- Only `https` and `s3` DRS access methods are implemented; anything else raises `_not_implemented` (`util.py:412`).
- Compact-identifier resolution depends on live identifiers.org registry availability; failures are logged and surface as `ValueError`. Only identifiers.org (no n2t.net).
- `CompactIdentifierResolver` is a **process-global singleton** with a 24h in-memory cache — no cross-process/persistent cache; stale URL patterns persist up to TTL.
- Requester-Pays S3 buckets (e.g. SPARC) are explicitly **not** supported by Galaxy's S3 file source.
- `fetch_uses_authorization_header` / `iter_fetch_urls` appear unused at this SHA — apparent forward-looking code.
- DRS server is explicitly "experimental" and does not implement access IDs.
