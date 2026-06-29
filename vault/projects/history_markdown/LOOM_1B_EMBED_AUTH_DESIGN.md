# 1b Design — Embed-Token Auth Path (Galaxy)

> **Status:** Implemented & green (page + dataset + collection + viz slices; 17
> API tests pass). Reviewed (subagent) — token RNG hardened to CSPRNG; see
> "Review hardening" below.
> **Parent:** [LOOM_PLAN.md](LOOM_PLAN.md) §4 Phase 1.3.
> **Prereq done:** 1a (PageEmbedToken model + migration `f0e1d2c3b4a5` + mint
> endpoint) — green.

## ⚠️ Model pivot — per-resource scope DROPPED → full-user + route allow-list

This doc was originally written for a **per-resource id-scope** model
(`embed_allowed=(kind, param_name)`, `EmbedScope`, in-scope/out-of-scope checks).
That model was **dropped** during implementation. The sections below are kept for
the strategy rationale (A/B/C) and Divergence 2 research, but where they describe
the scope mechanism they are **superseded** by this section.

**What changed and why.** The token already binds to a `(user, page)`. Recording
the page's referenced ids and gating each request against that set was redundant
and brittle: Galaxy ids are **not a security boundary** (exposed in URLs/responses/
logs, easy to mint or guess), so an id-membership check buys little. Accepted
decision: if someone hijacks the token they get the marked read routes as the
owning user — that residual is acceptable for short-TTL embed tokens.

**Implemented model:**
- The token resolves to the **full owning user** (`record.user`), stashed on
  `request.state.embed_user`; `get_api_user` returns it first. No scope object.
- `embed_allowed=True` is a plain **boolean** route flag. It admits the *route*;
  Galaxy's own ACLs (`get_accessible`, history ownership) decide *which resources*.
- **Read-only by virtue of marking only GET/HEAD routes.** The allow-list is the
  set of marked routes. **Load-bearing invariant: never mark a listing/enumeration
  route** (esp. the plugin `?history_id=` branch) — that would let the token's user
  enumerate beyond what the page embeds.
- The Q5 property is unchanged: `/api/users/*` is never marked → token ignored
  there → 401.
- Cross-user denial now comes from Galaxy's native ACLs, not a scope check.
  Caveat: Galaxy **datasets are public by default** (only `manage` is set, not an
  `access` restriction), so the owning user can read another user's *public*
  dataset by id — consistent with normal Galaxy behavior and the accepted residual.

---

## The three enforcement strategies

### A. Central default-deny gate (the original recommendation)
A FastAPI middleware / global dependency: when the request carries an embed
token, consult a single allow-list of `(method, path-pattern)` + do per-resource
id checks there; reject everything else.

- **Pros:** one place to read the whole policy; default-deny is explicit.
- **Cons:** the allow-list is a **second, parallel routing table** that must be
  kept in sync with the real routes by hand — classic drift/bug surface. Path-
  pattern matching in middleware re-implements routing. Not how Galaxy expresses
  per-route auth anywhere else, so it reads as foreign.

### B. Per-endpoint manager checks
Resolve the token to `user + scope`, then thread scope checks into each access
path (`security_check`, `can_access_dataset`, viz `security_check`, the legacy
dataset controller).

- **Pros:** reuses the existing access primitives directly.
- **Cons:** must touch **every** access point; **fail-open** by omission — miss
  one and the scope silently leaks. Spreads embed-specific logic across managers
  that have nothing to do with embedding. Hardest to audit ("is this complete?").

### C. Per-route `embed_allowed=True` decorator property (your proposal — recommended)
Add an `embed_allowed=True` kwarg to Galaxy's overridden verb decorators,
handled in `FrameworkRouter._handle_galaxy_kwd` — **the exact mechanism Galaxy
already uses** for `require_admin=True` and `public=True`
(`lib/galaxy/webapps/galaxy/api/__init__.py:548-571`). A route opts in; the
embed token authenticates **only** on opted-in routes.

```python
# _handle_galaxy_kwd already does this for require_admin:
require_admin = kwd.pop("require_admin", False)
if require_admin:
    kwd.setdefault("dependencies", []).append(self.admin_user_dependency)
# add, identically:
embed_allowed = kwd.pop("embed_allowed", False)
if embed_allowed:
    kwd.setdefault("dependencies", []).append(self.embed_token_dependency)
```

- **Pros:**
  - **Idiomatic** — same pattern as `require_admin`/`public`; a reviewer already
    understands it. Strong "reuse existing abstraction" fit.
  - **Default-deny by construction** (see below) — no parallel route table.
  - **Auditable** — the entire embed surface is `grep -rn "embed_allowed=True"`.
    The allow-list *is* the routes, co-located with them.
  - **Account endpoints are safe automatically** — `/api/users/*` is simply never
    marked, so an embed token is ignored there → existing auth → 401. The Q5
    property holds with zero extra code.
- **Cons / the one real risk:** wiring the embed-resolved `user + scope` so it
  reaches the handler's `trans` (see "Wiring" — dependency ordering). This is the
  part to prototype first.

### Recommendation: **C**, with the per-resource id check co-located in the embed dependency.

---

## Why C is default-deny *by construction* (the key insight)

The embed token is **not** added to the global `get_api_user` credential chain.
It is validated **only** by the `embed_token_dependency`, which is attached to a
route **only** when `embed_allowed=True`. Therefore:

- On a marked route → dependency runs → token validated → request authenticated
  as the scoped embed identity.
- On any **un**marked route → the dependency never runs → the token is just an
  unrecognized header → request is anonymous → the route's normal auth
  (`DependsOnTrans` / required-user) rejects it (401/403).

No global gate, no path-matching, no "remember to deny." Denial is the absence of
opt-in. This is strictly safer than A (which must enumerate denies correctly) and
B (which fails open on omission).

## What checks *which* resource (SUPERSEDED — no per-resource check)

> **Superseded by the pivot.** There is **no** per-resource id check. `embed_allowed=True`
> admits the route; Galaxy's existing ACLs (`get_accessible`, history ownership)
> decide which resources the recovered user may read. The original text below
> described the dropped membership check.

~~`embed_allowed=True` admits the *route*; the dependency must verify the requested
id is in `scope` (page_id / dataset_ids / collection_ids), raising 403 on miss.~~

## Fewer routes than feared (public bootstrap)

The SPA's bootstrap reads (`/api/configuration`, `/api/datatypes`, `/api/version`,
…) are already `public=True` (anonymous) — verified for configuration.py:82 and
datatypes.py. They need **no** embed credential. So the set to mark
`embed_allowed=True` is small: page show, dataset show/display, dataset-collection
show, visualization data. (Enumerate the exact list empirically — load
`/published/page?id=X&embed=true` against a page with a viz and capture the
network calls that 401 without auth.)

---

## Scope computation (SUPERSEDED — removed)

> **Superseded by the pivot.** There is no scope computation. `EmbedScope`,
> `embed_scope`, and the page-content parse (with its raw-vs-encoded id handling)
> were **removed** from `managers/pages.py`; only `resolve_embed_token` remains.
> The token recovers `record.user` directly.

## Wiring — SETTLED by spike (FastAPI 0.136.3)

Spike (`/tmp/spike2.py`) result, against the venv's actual FastAPI:
- **Route-level `dependencies=[...]` run BEFORE the endpoint's param-dependencies**
  (`get_api_user`). Order observed: `['route_dep', 'param_dep']`. ✅
- **`request.state` hand-off works**; **`ContextVar` does NOT** — FastAPI runs each
  sync dependency in its own context, so a `ContextVar.set()` in the route dep is
  invisible to the param dep. (This killed mechanism 1 from the earlier draft.)
- **Unmarked routes see default** (`embed_allowed` absent) → default-deny. ✅

**Chosen mechanism (as implemented, post-pivot):** the `embed_allowed=True` flag
attaches a single shared `embed_token_dependency` that, on a valid token, sets
`request.state.embed_user = record.user`; `get_api_user` reads
`getattr(request.state, "embed_user", None)` first and returns it. The full chain
is `get_api_user → get_user → get_trans(user=…)`, so the **full owning user** flows
into `trans.user` with no change to `get_trans`/managers.

**No per-resource check in the dependency.** Absent token → no-op; present-but-
invalid/expired → `AuthenticationFailed` (401). Resource access is left to Galaxy's
ACLs on the handler. Account endpoints stay safe because they're never marked →
the dependency never runs → the token is ignored → 401.

### Decorator shape (implemented)
```python
@router.get("/api/pages/{id}", embed_allowed=True)   # page show
@router.get("/api/datasets/{history_content_id}/display", embed_allowed=True)
@router.get("/api/dataset_collections/{hdca_id}", embed_allowed=True)
```
`_handle_galaxy_kwd` pops `embed_allowed` and appends
`Depends(embed_token_dependency)` — identical machinery to `require_admin`. One
shared dependency, no per-kind factory.

---

## Tests (red→green) — cross-user / ACL matrix (post-pivot)

Denial is now exercised **cross-user** (the token's user vs a *different* user's
private resource), not in-scope/out-of-scope, since there is no scope.

| Case | Expect | Status |
|------|--------|--------|
| embed token → its own page | 200 | ✅ pass |
| embed token → a different user's page | 403 (history ownership) | ✅ pass |
| embed token → a dataset (own/public) | 200 | ✅ pass |
| embed token → a different user's **private** dataset | 403 (dataset ACL) | ✅ pass |
| embed token → a collection (own) | 200 | ✅ pass |
| embed token → a different user's collection | 403 (history ownership) | ✅ pass |
| embed token → plugin metadata (`/api/plugins/{id}`) | 200 (anonymous fallback) | ✅ pass |
| embed token → plugin `?history_id=` enumeration | refused (not 200) | ✅ pass |
| embed token → dataset metadata (own) | 200 | ✅ pass |
| embed token → a different user's private dataset metadata | 403 | ✅ pass |
| embed token → a different user's private metadata_file | 403 | ✅ pass |
| embed token → HEAD on display | 200 | ✅ pass |
| embed token → POST mint (`pages/{id}/embed_token`) | 401/403 (can't escalate) | ✅ pass |
| **embed token → `GET /api/users/{id}/api_key`** | **401/403** (proves Q5 closed) | ✅ pass |
| embed token → any other mutation (PUT/DELETE) | 401/403 | ⏳ (covered-by-not-marked) |
| malformed/unknown token | 401 | ✅ pass |
| expired token → `resolve_embed_token` returns None | None | ✅ pass (unit) |

17 API tests pass in `test_pages_history_attached.py` (1a mint + page/dataset/
collection/viz reads + cross-user denials + plugin-enumeration denial + HEAD +
mint-escalation denial + Q5), **plus 5 unit tests**:
`test/unit/app/managers/test_PageManager.py` (4: valid / expired→None / unknown /
empty, exercising the `resolve_embed_token` expiry branch directly without HTTP or
time-mocking) and `test/unit/webapps/api/test_embed_allowed_routes.py` (1:
allow-list snapshot, below). **Key nuance:** the dataset denial
test must call `make_private(history, dataset_id)` on the other user's dataset —
Galaxy datasets are **public by default**, so without privatizing, the owning user
legitimately reads it (200) and the test would false-fail. Page and collection
denials need no privatizing — they are gated by history ownership.
The api-key-endpoint test is the headline: it passes **for free** under C
(route unmarked → token ignored), which is the whole argument for C.

---

## Open questions

- ~~**Wiring mechanism**~~ — **RESOLVED:** `request.state` (contextvar fails); see
  "Wiring — SETTLED by spike".
- ~~**Per-resource check location**~~ — **RESOLVED:** inside the shared route
  dependency (fail-closed path-param check).

### Divergence 2 — legacy dataset-display route — RESOLVED → (a) repoint client
The page's dataset element fetched from the **legacy** `/datasets/{id}/display/`
controller route (`controllers/dataset.py`), **not** a FastAPI route — so
`embed_allowed` could not decorate it. Resolved by subagent research:

- **Component-path correction.** The embed element is
  `client/src/components/Markdown/Sections/Elements/HistoryDatasetDisplay.vue`
  (the `<BEmbed type="iframe">` is line 69, gated to pdf/html at line 66, `displayUrl`
  at line 174). The doc previously said `components/Dataset/HistoryDatasetDisplay.vue`
  — that path does not exist; `components/Dataset/{DatasetDisplay,DatasetView}.vue`
  is the *standalone* viewer, a different (non-embed) consumer.
- **The two routes are functionally equivalent.** Both `/datasets/{id}/display/`
  (legacy WSGI) and `/api/datasets/{id}/display` (FastAPI) funnel into the identical
  `datatype.display_data(trans, data, preview, filename, to_ext, **kwd)` call. All
  preview/content-type/`to_ext`/sanitization/`x-content-*` behavior lives in
  `display_data`, not the route wrapper. The API route is a strict superset (adds
  HTTP range support via `GalaxyFileResponse`, a `HEAD` method). **Nothing to port.**
- **Chosen: (a)** repoint the embed element's `displayUrl` to
  `api/datasets/${id}/display?preview=True` (one line) and mark the FastAPI `display`
  GET/HEAD route `embed_allowed=True`. Reject (b)
  (legacy controller can't take the decorator; second auth surface) and (c) (done).

**Confirmation folded into implementation:** the API `display` uses
`DependsOnTrans` + `get_accessible`; under the full-user model the recovered
`trans.user` passes that for any dataset the user can access (same model as legacy
`_can_access_dataset`). (The earlier `param_name == history_content_id` concern is
moot — the boolean flag takes no param name.)

Tracked as **Divergence 2** in [LOOM_PLAN.md](LOOM_PLAN.md) §0.5.

### Visualization slice — RESOLVED & green (5 tests)
`VisualizationFrame.vue` (`client/src/components/Visualizations/VisualizationFrame.vue`)
does **not** load a server URL into the iframe `src`. Its `render()`:
1. `axios.get(/api/plugins/{name})` → the FastAPI `show` route
   (`api/plugins.py:333`, `GET /api/plugins/{id}`) for plugin metadata — **no
   `?history_id=`**.
2. injects the plugin's static JS/CSS (`pluginPath/entry`) into a blank iframe —
   static files, no API auth.
3. the **plugin JS, running inside the iframe**, fetches the dataset itself using
   `visualization_config.dataset_url` / `dataset_id` + `root`.

**(P1) Plugin metadata — RESOLVED, zero server change.** The metadata branch
(`registry.get_plugin(id).to_dict()`) is static, non-user config and is
**anonymous-readable**. The embed iframe carries the token, but the route is
**not marked** → token ignored → request falls through to anonymous → metadata
loads. The `?history_id=` enumeration branch (`plugins.py:350-364`,
`get_owned(history_id, trans.user)`) is closed by the same construction: unmarked
route → anonymous → `get_owned(history_id, None)` refused. So the **"never mark a
listing/enumeration route" invariant** holds trivially — we simply never mark
`/api/plugins/{id}`. Two regression tests pin both halves
(`test_embed_token_reads_plugin_metadata`, `…_cannot_enumerate_plugin_history`).
Note: the `?history_id=` branch is used only by `fetchPluginHistoryItems`
(`api/plugins.ts`) → `VisualizationCreate.vue`, the **standalone** viz-creation UI,
never by the embed frame.

**(P2) In-iframe data fetches — RESOLVED via empirical capture.** Real embeddable
plugins live in the external `galaxy-visualizations` repo (only `example` ships in
the Galaxy tree). Static capture of their fetch URLs (clone at
`~/projects/repositories/galaxy-visualizations`):

| Route the plugin JS fetches | Plugins (examples) | Action |
|---|---|---|
| `api/datasets/{id}/display` (± `?to_ext=json`) | pca, seqviz, aladin, nora, annotateimage, tiffviewer, unipept, katex, drawrna, aceeditor, openseadragon, hyphyvision | already marked (dataset slice) |
| `api/datasets/{id}` (metadata show) | seqviz, aladin, nora, openseadragon, aceeditor, chiraviz, jupyterlite, plotly, igv | **now marked** |
| `api/datasets/{id}/metadata_file?metadata_file=` | igv | **now marked** (GET+HEAD) |
| `api/histories/{id}/contents?…` | igv, jupyterlite | **deliberately NOT marked** (enumeration — invariant). Those plugins lose history-browsing in embed mode; expected — the embed shows the referenced dataset, not a history browser. |

Both newly-marked routes are single-resource reads keyed on a specific
`dataset_id`, gated by `get_accessible` — safe per the invariant. Marked in
`api/datasets.py`: `GET /api/datasets/{dataset_id}` (show) and
`GET|HEAD /api/datasets/{history_content_id}/metadata_file`. Tests:
`test_embed_token_reads_dataset_metadata` (200),
`…_denies_other_users_dataset_metadata` (403),
`…_denies_other_users_metadata_file` (403, access check fires before file lookup).

**Residual:** a positive metadata_file *read* test would need a datatype that
generates a metadata file (e.g. BAM/.bai); deferred — the route shares the show/
display auth model, and the cross-user denial test proves it does not leak.

## Review hardening (subagent pass)

A read-only review confirmed the model holds (correct dep ordering, default-deny,
no marked enumeration route, `data_type`/`**extra_params` on dataset `show` stay
single-resource, mint owner-gated, expiry comparison correct). Acted on:

- **Token RNG → CSPRNG (was Mersenne Twister).** `PageEmbedToken` generated via
  `unique_id()` (MT19937 + md5); changed to `secrets.token_hex(16)` — parity with
  API keys, 32 hex chars fits `String(32)`. (`PasswordResetToken` shares the old
  weakness; out of scope here.)
- **Model docstring** corrected to the full-user model (was "page-scoped … never a
  full-account credential").
- **+2 tests:** HEAD on display (200); POST mint with only the token → denied
  (can't escalate by minting). Locks the read-only-by-GET/HEAD-marking invariant.

Follow-ups from the review — **1–3 now done:**
1. ✅ **Expired-token test** — `test/unit/app/managers/test_PageManager.py`. A
   manager unit test (mock app) inserts a `PageEmbedToken` with a past
   `expiration_time` and asserts `resolve_embed_token` returns None; also covers
   valid / unknown / empty. Covers the previously-untested expiry branch without DB
   time-mocking. (Mock app omits `workflow_manager`; stubbed to None since
   `resolve_embed_token` never uses it.)
2. ✅ **Allow-list snapshot test** — `test/unit/webapps/api/test_embed_allowed_routes.py`.
   Builds the real app via `include_all_package_routers` and pins the exact 7
   `(method, path)` routes carrying `embed_token_dependency`, so any future addition
   (esp. an enumeration route) trips the test — a deliberate, reviewed change rather
   than silent. (Galaxy registers each route with/without a trailing slash; the test
   normalizes the slash to compare the 7 logical routes.)
3. ✅ **Migration tracked.** `f0e1d2c3b4a5_create_page_embed_token_table.py` is now
   `git add`ed (staged). Revision id is hand-authored, not alembic-generated —
   cosmetic.
4. **No revocation / expired-row cleanup** — acceptable v1 (matches
   `PasswordResetToken`); consider a future revoke endpoint + periodic cleanup.
5. **Collection `show` (`view=element`) exposes child dataset IDs** — within the
   full-user-read-by-ID model, but modestly widens the ID-discovery surface;
   conscious acceptance.
