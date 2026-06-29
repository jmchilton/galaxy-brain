# Loom Plan: Render Galaxy Notebooks Server-Side in Orbit (iframe embed)

> **Status:** In progress — Galaxy Phases 1.1–1.5 done, green, and **committed**
> (`80c9cc1f65` on `notebook_iframe`, 23 files). Loom **Phase 2 brain-side + Phase
> 3 (transport, 3.3/3.4 partition, 3.1/3.2 toggle/embed view, 3.6 refresh)** done &
> green and now **committed** on `notebook_iframe` in the Loom worktree (two
> commits: `4381a4e` brain/shared, `ce34e99` Orbit shell — **not pushed**). Covers:
> embed-URL helper + `NotebookEmbed`/`EmbedToken` contracts + `ui-bridge` emission,
> `mintEmbedToken` + `embed-token-manager` refresh loop + `embed-token-bridge`,
> brain↔main token channel (swallowed widget key — closes the 2.3 wiring
> interlock), locked-down `persist:galaxy-embed` partition, and the Markdown↔Galaxy
> `<webview>` toggle (vehicle: webview, not iframe — §3.5 postMessage superseded by
> native events, Divergence 4). Full suite 990 green. **Live-verified end-to-end
> 2026-06-22 — the full path works and all 3 E2E bugs (incl. the critical one) are
> now FIXED & live-verified** (see §0.0; Loom-side, uncommitted at time of writing).
> (Still open: external-link open / 401→reload — see §0.0 tail.)
> **Date:** 2026-06-20
> (Phase 2 brain-side + Phase 3 transport/partition/UI/refresh, committed: 2026-06-22)
> **Goal:** Let Orbit's notebook display pane show the notebook *as rendered by
> the Galaxy server* (in an `<iframe>`), so Galaxy visualizations, dataset
> displays, and charts render fully and pixel-match Galaxy — instead of (or
> alongside) Orbit's local markdown render.
> **Sub-design:** [LOOM_1B_EMBED_AUTH_DESIGN.md](LOOM_1B_EMBED_AUTH_DESIGN.md)
> (the scoped embed-token auth path).

---

## 0.0 ⚠️ Live E2E results (2026-06-22) — READ FIRST

> **✅ UPDATE 2026-06-22 (later same day): all 3 bugs below are FIXED and
> live-verified.** All fixes landed Loom-side (the Bug-1 Orbit-side option (a) —
> no Galaxy changes). 990 root tests green, root + app typecheck clean, lint 0
> errors. Re-ran the full live E2E against the same Galaxy+Orbit: **Bug 1** —
> in-`<webview>` `fetch('/api/pages/{id}')` now **200** (was 403) and
> `document.cookie` is **empty**, page renders its real content (no access-denied);
> **Bug 2** — token minted **once**, steady over 12 s (no re-mint loop);
> **Bug 3** — after an Orbit restart with **no `/sync push`**, the token minted from
> the inherited bound notebook, the toggle was available, and the `<webview>` was
> live with the correct embed src. Per-bug "✅ FIXED" notes inline below. 11-file
> diff in the Loom worktree (7 source + 4 test). The diagnostic write-up is kept as
> the record of *why*.

First end-to-end run against a **real running Galaxy + Orbit** (not unit tests).
Outcome: the entire pipeline works — `/sync push --history <id>` creates the page,
binds the notebook, emits `NotebookEmbed`, mints the embed token (held by main,
never sent to renderer), the Markdown↔Galaxy toggle enables, the `<webview>` loads
the embed URL, and Galaxy's Vue app boots inside it. **Header injection is confirmed
working** (instrumented `onBeforeSendHeaders`: `injected=true` on `/api/pages`). The
page just fails the final server authorization. Three bugs found (all now fixed):

### 🔴 BUG 1 (CRITICAL, blocks the whole feature) — embed token defeated by an ambient `galaxysession` cookie
The webview's `/published/page` document load makes Galaxy set an **anonymous
`galaxysession` cookie** in the `persist:galaxy-embed` partition. Every later
`/api/pages/{id}` request then carries *both* that cookie **and** the correctly
injected `x-galaxy-embed-token` — and **Galaxy resolves the cookie session first**,
so the embed token is ignored → `403 "Page is not accessible to the current user"`
(`err_code 403002`). Isolated to one variable (same token, same server):

| request | result |
|---|---|
| embed header **only** (cookie-less, e.g. curl) | **200** ✅ |
| embed header **+ anonymous `galaxysession` cookie** (the webview) | **403** ❌ |

Note `get_api_user` (Galaxy `api/__init__.py`) *does* check `request.state.embed_user`
before the api-key path — but a **cookie session is resolved ahead of that**, so the
header-vs-api-key precedence is not the relevant one; cookie-vs-embed-token is.

**Fix options** (probably want both; (a) alone unblocks today):
- **(a) Orbit-side, cleanest — make the embed partition stateless.** Strip the
  `Cookie` request header (and/or block `Set-Cookie`) on Galaxy-origin requests in
  `embed-partition.ts` / `embed-partition-session.ts` so the locked-down webview
  never carries an ambient Galaxy session. The partition already strips frame
  headers; this is the natural sibling. Matches the "no ambient session, per-page
  token only" intent. Add to the pure module + a unit test.
- **(b) Galaxy-side** — a valid embed token should take precedence over (or suppress)
  the cookie session on `embed_allowed` routes.

> **✅ FIXED (option a).** Added a pure `stripHeader(headers, name)` helper to
> `embed-partition.ts` (generic over `string` request / `string[]` response
> values). In `embed-partition-session.ts`, `onBeforeSendHeaders` now strips
> `Cookie` on Galaxy-origin requests (alongside injecting the token), and
> `onHeadersReceived` strips `Set-Cookie` — so the partition is stateless and
> Galaxy authenticates by the token alone. Live proof: in-`<webview>`
> `fetch('/api/pages/{id}')` → **200**, `document.cookie` → empty. Option (b) was
> NOT done (no Galaxy change needed). 4 unit tests added.

### 🟠 BUG 2 — `EmbedTokenManager` re-mints ~1×/second (runaway refresh loop)
Galaxy returns `expires_at` as **naive UTC with no `Z`/offset**
(`2026-06-22T07:19:26.134849`). JS `new Date()` parses a tz-less ISO string as
**local** time (here UTC+2) → computed expiry is ~2 h in the *past* → refresh delay
floors to `MIN_REFRESH_DELAY_MS` (1 s) → mints forever, one new server-side
`page_embed_token` row per second (no cleanup → table bloat; also churns the UI).
**Fix:** parse Galaxy's timestamp as UTC (append `Z` / treat as UTC) in the brain's
`refreshDelayMs`/`shouldRefreshToken` (`galaxy-embed.ts`). Galaxy could also emit an
offset-aware ISO timestamp. Add a unit test with a tz-less input.

> **✅ FIXED (brain-side).** New `parseExpiryMs` in `galaxy-embed.ts` appends `Z`
> to a tz-less ISO datetime (detected by the absence of a trailing `Z`/offset) so
> it parses as UTC; both `shouldRefreshToken` and `refreshDelayMs` use it. Galaxy
> still emits the naive stamp (option to fix server-side left open, not needed).
> Live proof: 1 mint, steady over 12 s. 2 unit tests added (incl. the exact
> microsecond, tz-less shape Galaxy emits).

### 🟠 BUG 3 — embed view unavailable after session resume (`--continue`)
`NotebookEmbed`/token emission is gated on `onNotebookChange` + a live `latestCtx`,
and the notebook watcher uses `ignoreInitial: true`. So when Orbit relaunches and the
brain resumes the pi session (`--continue`), an already-bound notebook never re-emits
→ Galaxy toggle shows **"unavailable"** until a *fresh* bind in a *fresh* session.
**Fix:** emit `NotebookEmbed` (+ mint) on startup/restore for an already-bound
notebook, not only on change.

> **✅ FIXED (brain-side).** Both bridges (`ui-bridge.ts`, `embed-token-bridge.ts`)
> now also capture ctx on `session_start` and replay the current notebook via a new
> `readCurrentNotebook()` in `state.ts` — robust to handler ordering, deduped by the
> existing `last`/`setPage`-no-op so a later change doesn't double-fire. Also added
> `isGalaxyEffectivelyConnected()` to `state.ts` (env creds `GALAXY_URL`+
> `GALAXY_API_KEY` — what the API client actually resolves — OR the in-session
> flag) as the mint gate, since the raw `isGalaxyConnected` flag is false on an
> env-creds resume until a Galaxy tool runs; `context.ts`'s two duplicated
> connection predicates were refactored onto the same helper. Live proof: Orbit
> restart with no `/sync push` → token minted, toggle available, `<webview>` live.
> 3 unit tests added.

### How to reproduce the live env (for the next agent)
- **Galaxy** (client already built into `static/dist`, persists): from the Galaxy
  worktree —
  `GALAXY_SKIP_CLIENT_BUILD=1 GALAXY_CONFIG_OVERRIDE_CONDA_AUTO_INIT=false
  GALAXY_CONFIG_OVERRIDE_MASTER_API_KEY=e2e_master_key
  GALAXY_CONFIG_OVERRIDE_DATABASE_CONNECTION="sqlite:////tmp/galaxy_embed_e2e.sqlite"
  GALAXY_CONFIG_OVERRIDE_EMBED_ALLOWED_ORIGINS="*" ./run.sh`
- **User + key** (master key is admin): `POST /api/users?key=e2e_master_key`
  `{email,password,username}` → `POST /api/users/{id}/api_key?key=e2e_master_key`.
- **Orbit:** `cd app && GALAXY_URL=http://localhost:8080 GALAXY_API_KEY=<key>
  npm start -- --remote-debugging-port=9222` (env path needs no `~/.loom` profile;
  brain still needs *an* LLM provider just to boot — any configured provider works,
  inference isn't used for `/sync`/embed).
- **Drive:** Playwright over CDP (`chromium.connectOverCDP('http://localhost:9222')`,
  renderer page is `http://localhost:5199/`; chat input `#input` + `#send-btn`;
  toggle `#nb-mode-galaxy`). Send `/sync push --history <historyId>`, wait for the
  toggle to lose `seg-btn-unavailable`, click it; the webview is a separate CDP page
  target at `/published/page?...&embed=true`.
- **Gotcha:** must be a **fresh pi session** or emission won't fire (Bug 3) — clear
  `~/.pi/agent/sessions/--Users-<you>-.loom-analyses--/` before launch.
- **One-variable proof of Bug 1:** mint a token via the admin API, then
  `curl /api/pages/{id} -H 'x-galaxy-embed-token: <t>'` → 200; repeat with
  `-b <cookiejar>` after `curl -c <cookiejar> /published/page?...` → 403.

---

## 0. Worktrees (read first)

There are **two** worktrees both named `notebook_iframe`, both in scope. Galaxy
mods land in the Galaxy one; Loom/Orbit mods land in the Loom one (the default
cwd for this work):

| Repo | Path | Branch |
|------|------|--------|
| **Loom** (brain + Orbit shell) | `/Users/jxc755/projects/worktrees/loom/branch/notebook_iframe` | `notebook_iframe` |
| **Galaxy** (server + Vue client) | `/Users/jxc755/projects/worktrees/galaxy/branch/notebook_iframe` | `notebook_iframe` (off `dev`) |

This plan modifies **both** repos. Galaxy `dev` already contains the Pages /
Galaxy-Notebooks feature (`page.history_id`, `history_tools.py`, `/api/pages`,
`PageView.vue`, `HistoryPageView.vue`), so no rebasing onto `history_pages` is
needed.

---

## 0.5 Implementation status & divergences (live)

**Done & green (Galaxy worktree):**
- **Phase 1.3 — 1a (embed token mint):** `PageEmbedToken` model (15-min TTL,
  CASCADE FKs) + migration `f0e1d2c3b4a5` (off head `28885b317f78`),
  `PageEmbedToken` response schema, ownership-gated `create_embed_token` service +
  `POST /api/pages/{id}/embed_token`. 2 API tests pass.
- **Phase 1.3 — 1b core auth path (page slice):** embed-token auth via a per-route
  **boolean** `embed_allowed=True` decorator (see Divergence 1 + the model-pivot
  note below). `managers/pages.py` (`resolve_embed_token` only — `EmbedScope`/
  `embed_scope` were dropped), `api/__init__.py` (`x-galaxy-embed-token` scheme,
  one shared `embed_token_dependency`, `_handle_galaxy_kwd` handling, `get_api_user`
  reads `request.state.embed_user`), page show route marked. Tests pass incl. the
  **Q5 proof** (embed token → `/api/users/{id}/api_key` denied).

- **Phase 1.3 — 1b dataset slice:** FastAPI `/api/datasets/{id}/display` GET/HEAD
  marked `embed_allowed=True`; the page's dataset element
  (`Markdown/Sections/Elements/HistoryDatasetDisplay.vue`) repointed off the legacy
  controller route to it (Divergence 2, resolved).
- **Phase 1.3 — 1b collection slice:** marked `GET /api/dataset_collections/{hdca_id}`
  `embed_allowed=True`. Client (`CollectionDisplay.vue`) already used this FastAPI
  route — no repoint. **17 embed API tests pass** (own page/dataset/collection/viz
  read → 200; cross-user denials → 403; plugin-enumeration denial; HEAD; mint-
  escalation denial; Q5 → 403; invalid token → 401). (Viz slice detailed below.)

**Model pivot (per-resource scope DROPPED).** The token now recovers the **full
owning user**, not a restricted scope. `embed_allowed=True` admits the *route*;
Galaxy's own ACLs (`get_accessible`, history ownership) decide *which* resources.
Read-only by virtue of marking only GET/HEAD routes. **Load-bearing invariant:
never mark a listing/enumeration route** (esp. the plugin `?history_id=` branch).
Rationale: ids are not a security boundary, so an id-membership check was redundant
+ brittle; accepted residual — a hijacked token reads the marked routes as the
owning user. Cross-user denial comes from native ACLs; note **datasets are public
by default**, so denial tests privatize the other user's dataset. Full detail in
[LOOM_1B_EMBED_AUTH_DESIGN.md](LOOM_1B_EMBED_AUTH_DESIGN.md) "Model pivot".

- **Phase 1.3 — 1b visualization slice (DONE):** **(P1)** plugin metadata
  (`/api/plugins/{id}`, no `history_id`) is anonymous-readable, so the embed frame's
  fetch works via anonymous fallback with **zero server change** — and the route's
  `?history_id=` enumeration branch is closed by construction (unmarked → anonymous
  → `get_owned` refused), honoring the "never mark an enumeration route" invariant
  trivially. **(P2)** empirical capture of the real plugins
  (`~/projects/repositories/galaxy-visualizations`): the dominant fetch
  `/api/datasets/{id}/display` was already marked; **now also marked**
  `/api/datasets/{id}` (metadata show, ~9 plugins) and
  `/api/datasets/{id}/metadata_file` (igv) — both single-resource reads. The
  `/api/histories/{id}/contents` enumeration (igv, jupyterlite) is **left unmarked**
  per the invariant (those plugins lose history-browsing in embed mode; expected).
  **17 embed API tests pass.** Detail in
  [LOOM_1B_EMBED_AUTH_DESIGN.md](LOOM_1B_EMBED_AUTH_DESIGN.md) "Visualization slice".

- **Phase 1.3 — review hardening (subagent):** model confirmed sound. Token RNG
  hardened MT19937→CSPRNG (`secrets.token_hex(16)`, parity with API keys); model
  docstring corrected to full-user; +2 tests (HEAD, mint-escalation denial).
  Follow-ups **now closed:** migration `f0e1d2c3b4a5` `git add`ed (staged);
  **expired-token unit test** (`test/unit/app/managers/test_PageManager.py`, 4
  cases incl. expired→None, via `PageManager.resolve_embed_token` with a past
  `expiration_time` — no HTTP/time-mock needed); **allow-list snapshot test**
  (`test/unit/webapps/api/test_embed_allowed_routes.py` — builds the real app via
  `include_all_package_routers`, pins the exact 7 `(method, path)` embed-allowed
  routes so marking any new/enumeration route trips the test). All green. See
  [LOOM_1B_EMBED_AUTH_DESIGN.md](LOOM_1B_EMBED_AUTH_DESIGN.md) "Review hardening".

**Done & green (Phase 1.1 + 1.4):**
- **Phase 1.4 — `embed_url` on `PageDetails`:** new optional `embed_url` schema field
  (`schema.py`); `PagesService._page_to_details` populates it via a new `_embed_url`
  helper → `{request.url_path}/published/page?id={encoded_id}&embed=true` (uses
  `request.url_path` so a deployment prefix is honored; `trans.security.encode_id`
  for the id — `rval["id"]` is still the *raw* int at serialization time). None
  outside a request context. **1 API test** (`test_history_page_details_embed_url`).
- **Phase 1.1 — frame-ancestors CSP:** new `embed_allowed_origins` config key
  (`config_schema.yml` + regenerated sample/rst/type-stubs via `make config-rebuild`
  equivalent). `XFrameOptionsMiddleware` (`fast_app.py`) generalized: non-embed →
  `X-Frame-Options` (unchanged); embed (`/published/*?embed=true`) → omits
  `X-Frame-Options` and, when `embed_allowed_origins` is set, emits
  `Content-Security-Policy: frame-ancestors <origins>`. Middleware now added when
  *either* knob is set (was: only if `x_frame_options`). Deliberately **not**
  reusing `allowed_origin_hostnames` (CORS, a different mechanism). **3 unit tests**
  (`test/unit/webapps/test_xframe_embed_csp.py`: non-embed sets XFO/no-CSP; embed
  emits frame-ancestors/no-XFO; embed w/o configured origins emits neither).

**Done & green (Phase 1.2 + 1.5):**
- **Phase 1.2 — embed surface verified (no code change):** `PageView.vue`
  `isChromeFree = embed || displayOnly` renders the chrome-free block (no
  masthead/ActivityBar/FlexPanel — those live in the app shell, absent on this
  route). The back-button/toolbar is gated on `props.displayOnly`, so `embed=true`
  (without `displayOnly`) renders **no** stray toolbar. Confirmed by reading; reuse
  `/published/page?id=X&embed=true` as planned, no route change.
- **Phase 1.5 — postMessage embed bridge:** new composable
  `client/src/composables/embedBridge.ts` (`useEmbedBridge`) wired into
  `PageView.vue` (when `isChromeFree`); posts to `window.parent`:
  `galaxy-embed:ready|height|title|navigate`. Height via `ResizeObserver` on the
  `#center` container; link clicks inside the embed are intercepted
  (`shouldInterceptLink`: skips `#…`/`javascript:`) and routed to the parent as
  `navigate` rather than navigating the iframe. **Origin-restricted, never `*`:**
  `resolveEmbedTargetOrigin` prefers `?embed_origin=` (new `embedOrigin` prop +
  router mapping) then `location.ancestorOrigins[0]` (Chromium/Electron); returns
  null → sends nothing. **17 Vitest tests** (`embedBridge.test.ts`); vue-tsc +
  eslint clean. (The brain/Orbit, Phase 2/3, will append `&embed_origin=<origin>`
  and listen for these messages.)

**Done & green (Phase 2 foundation — Loom worktree, committed `4381a4e`):**
The shell-neutral, pure pieces of Phase 2 that unit-test without Orbit. **32
tests pass** (`tests/galaxy-embed.test.ts` 14 + 2 new in
`tests/galaxy-pages-api.test.ts`); root `tsc --noEmit` + prettier + eslint clean.
- **Phase 2.1 — embed-URL helper:** new pure module
  `extensions/loom/galaxy-embed.ts`. `getEmbedUrl(binding, opts)` builds the
  **absolute** `{galaxy_server_url}/published/page?id=…&embed=true[&rev=…][&embed_origin=…]`.
  **Key decision:** Galaxy's `PageDetails.embed_url` (Phase 1.4) is *path-relative*
  (honors a deploy prefix but carries no host), so the brain — which holds
  `galaxy_server_url` in the binding — constructs the absolute URL itself rather
  than consuming the API field. `embed_url` added to the `GalaxyPage` client type
  for completeness but not depended on.
- **Phase 2.2 — `NotebookEmbed` shell contract:** `LoomWidgetKey.NotebookEmbed`
  (`"notebook-embed"`), `NotebookEmbedPayload` interface, and
  `encode/decodeNotebookEmbed` in `shared/loom-shell-contract.{js,d.ts}`. Payload:
  `{ bound, pageId, historyId, galaxyUrl, embedUrl, lastSyncedRevision }`.
  `buildNotebookEmbed(binding|null, opts)` projects it; **null binding → unbound
  payload** (all-null, `bound:false`) so a shell renders the fallback without
  special-casing a missing widget. **Token deliberately excluded** from the
  payload — it reaches the shell's privileged process out of band, never the
  renderer (§3.3).
  **Divergence 3 (naming):** the plan's §2.1 field list named a `synced` boolean;
  **dropped** as redundant with `lastSyncedRevision != null` and ambiguous (true
  local-vs-server sync can't be known without a diff). Revisit if `synced` was
  meant to carry distinct meaning.
- **Phase 2.3 — token mint + refresh timing (the pure half):**
  `mintEmbedToken(pageId)` in `galaxy-pages-api.ts` → `POST /api/pages/{id}/embed_token`
  returning `GalaxyEmbedToken {token, expires_at}` (matches Galaxy schema
  `PageEmbedToken`). Refresh-timing math `shouldRefreshToken` / `refreshDelayMs`
  (+ `DEFAULT_REFRESH_SKEW_MS = 60s`) lives in `galaxy-embed.ts`, split from the
  network call so it tests without a clock/server; unparseable expiry → refresh-now.

**Done & green (Phase 2 emission wiring — Loom worktree, committed `4381a4e`):**
- **2.2 emission wiring:** `ui-bridge.ts` now derives the binding from notebook
  content (`findGalaxyPageBlocks(content)[0] ?? null`) and emits
  `LoomWidgetKey.NotebookEmbed` via `buildNotebookEmbed`, alongside the existing
  Notebook markdown widget. Routed through the existing `onNotebookChange`
  watcher, so connect / change / `/sync` all funnel through it (connect via
  `initSessionArtifacts`'s `notifyNotebookChange`; `/sync` via the binding
  upsert re-firing the watcher). Emitted **before** the Notebook pane's hidden
  gate (separate panes) and **deduped** on the encoded payload so prose-only
  edits don't re-push the embed. Shell-neutral: no `embed_origin` baked in (the
  shell appends its own origin), token never in the payload. Stale-ctx guard
  refactored to a shared `isStaleCtxError` helper (#271). Tests:
  `tests/ui-bridge-embed.test.ts` (6: unbound/bound projection, no-embed_origin,
  rev-bump re-emit, prose-only dedup, hidden-pane still emits) + updated
  `ui-bridge-stale-ctx` call-count assertion.
- **2.4 cache-bust:** rides with the above — `buildNotebookEmbed` bakes
  `lastSyncedRevision` into `&rev=`, and a rev bump in the binding re-emits the
  widget (covered by the rev-bump test). Orbit-side cache-bust is Phase 3.

**Done & green (Phase 2.3 token lifecycle — Loom worktree, committed `4381a4e`):**
- **2.3 stateful refresh loop:** `extensions/loom/embed-token-manager.ts` —
  `createEmbedTokenManager({ sink, mint?, retryDelayMs?, onError? })` →
  `{ setPage(pageId|null), current(), dispose() }`. Mints on bind, schedules a
  refresh at `refreshDelayMs(expires_at, now)` (floored to 1s so a clock-skewed
  already-expired token can't hot-loop), retries after a failed mint, and on a
  page switch / unbind / dispose cancels the timer, aborts the in-flight mint,
  and drops stale results (AbortController + active-page guard). Each (re)mint is
  pushed to an injected `sink` — the **out-of-band channel to Orbit main**. The
  transport itself is the Phase 3 interlock, so the manager is **transport-
  agnostic and unwired** today (no import from `ui-bridge`/`session-lifecycle`
  yet — wiring it now would fire real `mintEmbedToken` calls with no consumer).
  Tests: `tests/embed-token-manager.test.ts` (9, vitest fake timers: mint-on-bind,
  refresh-before-expiry, same-page no-op, unbind cancel, page-switch abandon,
  stale-in-flight drop, retry-then-succeed, dispose, expired-token floor).

**Done & green (Phase 3 token transport — brain↔main; brain in `4381a4e`, main interception in `ce34e99`):**
This closes the 2.3 wiring interlock. **Transport decision:** the brain delivers
the secret as a **swallowed widget key** — no Pi-protocol change; the brain stays
shell-neutral; the Loom CLI shell just ignores the key.
- **Shared contract:** `LoomWidgetKey.EmbedToken` (`"embed-token"`) +
  `EmbedTokenWidgetPayload {pageId, token, expiresAt}` +
  `encode/decodeEmbedToken` in `shared/loom-shell-contract.{js,d.ts}`. The js doc
  spells out that this key — unlike every other widget — is intercepted by the
  privileged process and **never reaches the renderer**.
- **2.3 wiring (brain):** `extensions/loom/embed-token-bridge.ts`
  `setupEmbedTokenBridge(pi, {mint?})` owns an `EmbedTokenManager`, subscribes to
  `onNotebookChange`, and calls `setPage(binding && isGalaxyConnected() ? pageId
  : null)` — mints only while **bound AND connected**. The `sink` emits the token
  via `ctx.ui.setWidget(EmbedToken, …)` with the same #271 stale-ctx guard. Wired
  in `index.ts` next to `setupUIBridge`. Kept separate from `ui-bridge.ts` (that
  module owns user-facing widgets; a secret shouldn't ride the display path).
- **Interception (Orbit main):** `app/src/main/embed-token-store.ts` (electron-
  free, so the root suite can import it) — `parseEmbedTokenWidget` /
  `isEmbedTokenWidget` + `EmbedTokenStore` (get/set/clear/onChange). `agent.ts
  handleLine` intercepts `extension_ui_request` setWidget on the EmbedToken key:
  stores it on `AgentManager.embedTokens` and **returns without forwarding** —
  swallowing even a malformed payload so a token-keyed message can't leak. Mirrors
  the existing MCP-bootstrap-notify swallow.
- Tests (12): `tests/embed-token-store.test.ts` (parse/ignore-other-keys/ignore-
  non-setWidget/malformed-still-swallowed; store set/clear/notify/unsubscribe) +
  `tests/embed-token-bridge.test.ts` (mint+emit when bound&connected, no-mint
  disconnected, no-mint unbound, re-point on binding change).

**Done & green (Phase 3.3/3.4 partition + header injection — Loom worktree, committed `ce34e99`):**
- **Trust boundary (pure, electron-free):** `app/src/main/embed-partition.ts` —
  `sameGalaxyOrigin(url, serverUrl)` (origin-pinned, http(s) only; mirrors
  `galaxy-status.ts resolveGalaxyHistoryOpenUrl`), `shouldBlockNavigation` (fail-
  closed: off-origin / unknown-server / unparseable http(s) nav blocked; about:/
  blob:/data: left alone), `stripFrameHeaders` (drop XFO + CSP incl. report-only),
  `EMBED_TOKEN_HEADER = "X-Galaxy-Embed-Token"`, `GALAXY_EMBED_PARTITION`.
- **Wiring (electron):** `app/src/main/embed-partition-session.ts`
  `configureGalaxyEmbedPartition({getToken, getServerUrl}, sess?)` registers
  onBeforeSendHeaders (inject token for Galaxy origin only; **delete** the header
  otherwise so a stale token can't ride off-origin), onHeadersReceived (strip
  frame headers on Galaxy-origin responses), onBeforeRequest (block off-origin
  main/sub-frame nav). Token + server URL read **live** via getters so a refresh /
  reconnect is picked up without re-registering.
- **main.ts:** calls it right after `new AgentManager`, `getToken` =
  `agentManager.embedTokens.get()?.token`, `getServerUrl` =
  `resolveGalaxyServerUrl(loadConfig(), process.env)`.
- **CSP:** `frame-src blob: https:` in `index.html` (host is dynamic; static meta
  CSP can't pin it — real containment is the partition + onBeforeRequest origin
  allowlist). Hardening follow-up: per-host CSP injected at window-create.
- Tests (13): `tests/embed-partition.test.ts` — sameGalaxyOrigin (match/prefix/
  host+port+scheme mismatch/non-http/unknown-server), shouldBlockNavigation
  (allow same-origin, block off-origin/unknown/unparseable, allow about/blob/
  data), stripFrameHeaders, header-name-is-not-an-api-key.

**Done & green (Phase 3.1/3.2 toggle + embed view — Loom worktree, committed `ce34e99`):**
**Embed vehicle decision: `<webview>` (not `<iframe>`)** — a plain iframe can't
target a custom Electron partition, and the whole lockdown lives on
`persist:galaxy-embed`. So `webviewTag: true` is enabled in `main.ts`
`webPreferences`, and the Galaxy view is a `<webview partition="persist:galaxy-
embed">`.
- **View model (pure, node-testable):** `app/src/renderer/artifacts/notebook-
  view-model.ts` — `NotebookViewMode`, `NOTEBOOK_VIEW_MODE_KEY`,
  `parseStoredViewMode` (default markdown), `canUseGalaxyView`,
  `resolveNotebookView(mode, {payload, connected})` → markdown | galaxy(embedUrl)
  | fallback(disconnected|unbound). Tests: `tests/notebook-view-model.test.ts` (8).
- **DOM (`artifact-panel.ts`):** restructured `#notebook-view` into a fixed
  Markdown/Galaxy segmented toolbar + a scrolling content box. Markdown is cached
  and rendered as before; Galaxy mode lazily creates the webview (full-bleed,
  `did-fail-load` → error fallback w/ Retry, src-swap on embedUrl change = basic
  cache-bust). Mode persists in localStorage; Galaxy is always selectable and
  degrades to a guiding fallback. Public API preserved (setNotebookMarkdown,
  reRenderNotebook, clearNotebook, clear, …) + new `setNotebookEmbed(payload)` /
  `setGalaxyConnected(connected)`.
- **`app.ts`:** decodes the `NotebookEmbed` widget → `artifacts.setNotebookEmbed`;
  `refreshGalaxyStatus` → `artifacts.setGalaxyConnected`.
- **CSP:** already `frame-src blob: https:` (covers the webview). `index.html`
  markup + `styles.css` (seg-control, content box, full-bleed webview).
- **Partition source-of-truth:** renderer imports `GALAXY_EMBED_PARTITION` from
  the (electron-free) `embed-partition.ts` so main + renderer can't drift.
- ⚠️ **Not yet live-verified** — typecheck + unit green, but no running-app check
  that the webview actually authenticates + paints. That's the next real step.

**Done & green (Phase 3.6 refresh-on-sync — Loom worktree, committed `ce34e99`):**
- `notebook-view-model.ts` `shouldReloadEmbed(prev, next)` — reload the webview
  only when `embedUrl` changes to a new non-null value (the URL bakes in
  `&rev=<lastSyncedRevision>`, so a `/sync push` that advances the revision
  reloads to the fresh server render; a no-op re-emit doesn't thrash mid-scroll).
  `artifact-panel.setNotebookEmbed` repaints Galaxy mode only on an availability
  flip or `shouldReloadEmbed`; the webview `src` swap is the reload mechanism.
  Tests: +4 in `tests/notebook-view-model.test.ts` (rev bump, no-op same URL,
  first-bind, new-payload-without-URL).

**Phase 3.5 postMessage — SUPERSEDED by the webview vehicle (see Divergence 4):**
- Galaxy's `embedBridge.ts` no-ops when `win.parent === win`, which is the case
  inside a `<webview>` (its own top frame) — so the `galaxy-embed:*` posts never
  fire. The webview replaces most of it with **native events**: `height` is moot
  (the webview fills a fixed pane), `title`/`ready` come from
  `page-title-updated`/`dom-ready`, navigation containment is the partition's
  `onBeforeRequest` block. **Still open:** routing an off-origin link click to an
  external open (needs a scoped main handler — Orbit intentionally has no generic
  `openExternal`; `openGalaxyHistory` is the only precedent) and `401→reload`
  (rely on pre-expiry refresh for now). Both want **live verification** first.

**Not yet done (Phase 3 remainder):**
- **Live end-to-end check (the real gap):** run Orbit against a real bound private
  page — confirm the webview authenticates (token injected), paints the page +
  nested viz/dataset frames, and reloads on `/sync push`. Nothing brain/renderer
  is live-verified yet.
- **External-link open + 401→reload** (see 3.5 above).
- **Follow-up:** the brain doesn't yet emit a *clear* on unbind, so main can hold
  a still-valid token briefly after unbinding (page-scoped, short-TTL, unused
  while not embedding). Add an explicit clear signal if it matters. Also: a pure
  connect (no notebook write) won't mint until the next notebook change.

### Divergence 1 — enforcement strategy: central gate → per-route decorator
The plan originally recommended a **central default-deny gate** (§3 Option A
framing). During design we chose, and implemented, a **per-route boolean
`embed_allowed=True` decorator** instead — it reuses Galaxy's existing
`FrameworkRouter._handle_galaxy_kwd` machinery (same as `require_admin`/`public`),
is **default-deny by construction** (the embed token only authenticates on opted-in
routes; elsewhere it is ignored → 401). No `security_check` surgery. (The decorator
originally carried a per-resource scope tuple; that was later dropped in favor of
full-user recovery — see the model-pivot note above.) Rationale, spike results
(FastAPI dep ordering; `request.state` works / `ContextVar` does not), and the full
comparison live in
[LOOM_1B_EMBED_AUTH_DESIGN.md](LOOM_1B_EMBED_AUTH_DESIGN.md).

### Divergence 2 — legacy dataset-display route — RESOLVED → (a) repoint client
The page's dataset element fetched dataset content from the **legacy**
`/datasets/{id}/display/` controller route (`controllers/dataset.py`), **not** a
FastAPI `/api/...` route, so `embed_allowed` could not decorate it. Subagent
research resolved it to **(a) repoint the client** — no backend porting:

- **Component path corrected.** The embed element is
  `client/src/components/Markdown/Sections/Elements/HistoryDatasetDisplay.vue`
  (the `<BEmbed type="iframe">` at line 69, pdf/html gate at line 66, `displayUrl`
  at line 174). The earlier `components/Dataset/HistoryDatasetDisplay.vue` path
  does **not** exist; `components/Dataset/{DatasetDisplay,DatasetView}.vue` is the
  separate standalone viewer.
- **Both routes are functionally equivalent** — legacy `/datasets/{id}/display/`
  and FastAPI `/api/datasets/{id}/display` both call the identical
  `datatype.display_data(...)`; all preview / content-type / `to_ext` /
  sanitization / `x-content-*` behavior is in `display_data`, not the wrapper. The
  API route is a strict superset (range support, `HEAD`). **Nothing to port.**
- **Implemented:** `displayUrl` repointed to `api/datasets/${id}/display?preview=True`
  (one line); the FastAPI `display` GET/HEAD route marked `embed_allowed=True`.

Rejected (b) (legacy controller can't take the decorator; a second auth surface)
and (c) (enumeration done). **Visualization-frame routes are a separate,
not-yet-analyzed slice** — Vitessce already uses `/api/datasets/{id}/display`, but
the general viz path is its own sub-decision. Detail in
[LOOM_1B_EMBED_AUTH_DESIGN.md](LOOM_1B_EMBED_AUTH_DESIGN.md).

### Divergence 4 — embed vehicle: `<iframe>` → `<webview>`, and postMessage → native events
The plan said "iframe," but a plain `<iframe>` can't target a custom Electron
partition — and the whole token-injection / frame-strip / nav-block lockdown lives
on `persist:galaxy-embed`. So the Galaxy view is an Electron **`<webview
partition="persist:galaxy-embed">`** (`webviewTag: true`). Consequence for §3.5:
Galaxy's `embedBridge.ts` guards `if (win.parent === win) return`, which is **true
inside a webview** (it's its own top frame), so the `galaxy-embed:*` posts never
fire there. The webview therefore uses **native events** instead — `height` is
unnecessary (it fills a fixed pane), `title`/`ready` ← `page-title-updated` /
`dom-ready`, navigation containment ← the partition's `onBeforeRequest`. The
postMessage bridge stays valid for a future **iframe-based web shell**; it's just
not Orbit's path. Open items: off-origin-link→external-open (needs a scoped main
handler) and 401→reload; both pending live verification.

### Other discovery
- Galaxy bootstrap on this machine needs `GALAXY_PYTHON=3.12` (system `python3` is
  3.9.6; Galaxy requires ≥3.10). The `.venv` is now built in the Galaxy worktree.

---

## 1. Current state (verified against the code)

### 1.1 Loom already syncs `notebook.md` → a Galaxy Page

The sync layer exists today in `extensions/loom/`:

- **Binding** (`galaxy-page-binding.ts`): a fenced `loom-galaxy-page` YAML block
  inside `notebook.md` records the association. Keys: `page_id`, `page_slug`,
  `galaxy_server_url`, `history_id`, `last_synced_revision`, `bound_at`.
- **Sync** (`galaxy-pages-sync.ts`): `push` (local-wins), `pull` (remote-wins),
  `link`, `resume`. Atomic via `withNotebookLock()`.
- **API** (`galaxy-pages-api.ts`): `POST/PUT/GET /api/pages`, revisions; auth via
  `x-api-key` header from `GALAXY_API_KEY` (env / `~/.loom/config.json` profile).
  Always `content_format: "markdown"`.
- **Markdown adapter** (`galaxy-markdown-adapter.ts`): round-trips
  `loom-invocation` blocks ↔ Galaxy `galaxy` directives + hidden carriers.
- **Command** (`sync-command.ts`): `/sync status|push|pull|link|resume`.

The bound page is a **history-attached notebook** (`history_id` set), i.e.
**private**, not a published page. **No view/embed URL is persisted today.**

### 1.2 Orbit renders the notebook locally as markdown

- Notebook tab → `app/src/renderer/artifacts/artifact-panel.ts`
  (`setNotebookMarkdown()` → `marked@18` + DOMPurify into `#notebook-view`).
- Content arrives via the brain's `setWidget` UI request with
  `widgetKey: "Notebook"` (`shared/loom-shell-contract.js`), handled in
  `app/src/renderer/app.ts` (`onUiRequest`).
- **Limitation:** local markdown rendering cannot run Galaxy visualizations,
  dataset previews, or charts — those are Galaxy Vue components / dataset-display
  iframes. The local pane will never match Galaxy. That is the gap this plan
  closes.
- Galaxy server URL is already reachable from the renderer via
  `window.orbit.getGalaxyStatus()` → `{ connected, url }`. The API key lives
  only in the **main** process (`resolveGalaxyApiKey`, `buildSecretEnv`).

### 1.3 Galaxy's embeddable render surface

- **Chrome-free route:** `/published/page?id=<id>&embed=true` → `PageView.vue`.
  `isChromeFree = embed || displayOnly` strips ActivityBar + FlexPanel + masthead.
- **X-Frame-Options:** default `SAMEORIGIN`
  (`config_schema.yml` → `XFrameOptionsMiddleware` in `fast_app.py:155`). It is
  skipped **only** when `_is_embed_request()` is true, i.e.
  `path.startswith("/published/") and "embed=true" in query_string`
  (`webapp.py:280`). The `/histories/:h/pages/:p?displayOnly=true` route does
  **not** get the bypass and renders **inside the full masthead** — so it is the
  wrong surface to embed.
- **No `frame-ancestors` CSP exists anywhere** — Galaxy only uses
  `X-Frame-Options`.
- **Auth:** `PageView` calls `/api/pages/{id}`; access control is enforced there
  (`managers/base.py`: owner / importable / shared-with / admin). `embed=true`
  only strips chrome + the X-Frame header — it does **not** make a private page
  public. So a **private** page rendered at `/published/page?id=X&embed=true`
  works **iff the API calls carry credentials** (session cookie or `X-API-Key`).
- Dataset/viz embedding inside the page: `HistoryDatasetDisplay.vue` uses
  `<BEmbed type="iframe" :src="displayUrl">`; `VisualizationWrapper.vue` →
  `VisualizationFrame.vue`. These are **same-origin** nested frames to the Galaxy
  host.

---

## 2. The core problem

To show the *real* Galaxy render of a **private, history-attached** notebook in
Orbit's pane, three things must be true simultaneously:

1. **Chrome-free** — render only the notebook body (no masthead/sidebars).
   → satisfied by `/published/page?id=X&embed=true` (`PageView`, `isChromeFree`).
2. **Frame-embeddable** — no `X-Frame-Options: SAMEORIGIN` block.
   → satisfied for `/published/*?embed=true` (the only bypass).
3. **Authenticated without an interactive Galaxy login** — the embedded SPA's
   `/api/pages/{id}` (and nested dataset/viz) calls must authenticate as the
   user. Orbit has an **API key**, not a browser session.
   → **this is the hard part and the reason to modify Galaxy.**

There is no interactive Galaxy login inside Orbit, and a cross-origin iframe
shares no cookies with anything. So we must get credentials to the embedded SPA.

---

## 3. Design options for auth (the decision that shapes everything)

### Option A — Publish the page (make it public), embed `/published/page?embed=true`
- **Pros:** zero auth work; works today.
- **Cons:** **unacceptable default** — exposes private research data publicly.
  Rejected as the primary path. (Could be a future "share read-only link"
  feature, but not for the in-app pane.)

### Option B — Electron injects the **full API key** per-partition — REJECTED (unsafe)
Inject `X-API-Key: <full key>` on every Galaxy-origin request in the iframe
partition. **Security research (Q5) rules this out:** Galaxy's dataset-display
and visualization iframes render **same-origin with no `sandbox` attribute**
(`HistoryDatasetDisplay.vue:65`, `VisualizationFrame.vue:99`). Any JS running
there — visualizations always run JS; HTML datasets do when `sanitize_all_html`
is off or the producing tool is allowlisted — can call
`GET /api/users/me/api_key` (the injected header attaches automatically) and
**exfiltrate the user's full, permanent API key** (`api/users.py:244`). The
injected key also grants ambient authority for destructive calls. The key being
header-only (JS-invisible) does **not** help, because exfiltration goes through
Galaxy's own api-key endpoint, not header reads. **Do not inject the full key.**

### Option C — Galaxy short-lived, page-scoped **embed token** (the credential)
Add `POST /api/pages/{id}/embed_token` → a short-TTL (mins), read-only token
bound to `(user, page_id)`. Auth path resolves it to a **capability scope** that
allows reading exactly that page and the datasets/visualizations it references —
and **explicitly rejects** user/account/api-key endpoints. Reuse the
`PasswordResetToken` DB-backed pattern (Q7) for the `EmbedToken` model, but note
the *model* is the easy part — Galaxy has **no scoped-credential concept**, so the
real work is the scoped auth path threading through datasets/viz/legacy-controller
authz (§4 1.3: **~75–175 LOC**, not 40). This fills a genuine gap and is portable
to **any** shell (web, browser, hosted), not just Electron.

### Recommendation — **Option C credential, injected via the Electron partition (C+B-mechanism)**
Use **Option C's scoped token** as the credential, delivered via **Option B's
injection mechanism**:
- Orbit's iframe partition injects the **embed token** (not the API key) on
  Galaxy-origin requests. Network-layer injection automatically authenticates the
  **nested same-origin dataset/viz frames** — the part that URL-only token
  passing can't easily reach.
- Because the credential is page-scoped / read-only / minutes-TTL and its auth
  path refuses account endpoints, an exfiltrated token is near-worthless (one
  page, expires fast). This neutralizes the Q5 attack while keeping the
  nested-frame ergonomics.
- The token is **portable**: the **web shell** (which can't inject headers) passes
  it another way (URL/cookie bootstrap), so the capability isn't Electron-locked.
- Galaxy also gains a configurable **`frame-ancestors` CSP / embed-origins**
  allowlist (it has none today) so embedding is a *supported server contract*
  restricting which origins may frame it.

This is the answer to "modify Galaxy when it makes sense": the scoped token +
CSP are the Galaxy changes that make embedding correct, least-privilege, and
shell-portable; the Electron partition is just the delivery mechanism.

> **Open sub-decision (nested-frame auth):** three ways to get the credential to
> the nested same-origin dataset/viz frames — (i) **inject the token at the
> Electron network layer** for all Galaxy-origin requests (recommended; simplest,
> covers nested frames automatically); (ii) **exchange the embed token for a
> short-lived scoped session cookie** on first load (auto-covers nested frames in
> *any* browser incl. the web shell, but requires Galaxy to support a scoped/
> read-only session — a new concept); (iii) **token in every embed URL**
> (requires rewriting all dataset/viz display URLs in the export pipeline —
> messy). See §9 Q-A.

---

## 4. Implementation plan

### Phase 1 — Galaxy: a first-class, embeddable notebook surface
*(worktree: `…/galaxy/branch/notebook_iframe`)*

**1.1 Configurable embed origins + `frame-ancestors` CSP.**
- New config key `embed_allowed_origins` in `config_schema.yml`. **Do NOT reuse
  `allowed_origin_hostnames`** — that is the **CORS** `Access-Control-Allow-Origin`
  knob, a different browser mechanism than `frame-ancestors` (framing). Conflating
  them couples unrelated policies.
- In `XFrameOptionsMiddleware` (`fast_app.py`): for embed requests, instead of
  only *omitting* `X-Frame-Options`, **emit**
  `Content-Security-Policy: frame-ancestors <embed_allowed_origins>` so embedding
  is restricted to Loom/Orbit/dev origins rather than wide-open. Keep
  `X-Frame-Options` omission for legacy-browser embedding.
- Galaxy is currently CSP-free for frames; this is additive and low-risk.

**1.2 Extend `_is_embed_request` (or add a notebook embed route).**
- Today only `/published/*?embed=true` bypasses the frame header. Decide:
  - **(preferred)** keep using `/published/page?id=X&embed=true` for notebooks
    too (it already renders chrome-free via `PageView`), so **no route change**;
    or
  - add explicit embed support to the history route if product wants
    `/histories/:h/pages/:p?embed=true` to be chrome-free + frame-allowed.
- Recommendation: **reuse `/published/page?id=X&embed=true`**. It is already the
  one true chrome-free, frame-bypassed surface and works for private pages once
  authenticated. Avoid touching `HistoryPageView` chrome.
- **Verify before building:** does `PageView.vue` suppress the `displayOnly`
  back-button/toolbar (`PageView.vue:104`) when `embed=true`? Under `embed`
  (without `displayOnly`) it should, but confirm — a stray back button inside the
  Orbit pane is wrong. We pass `embed=true` and NOT `displayOnly`, so the toolbar
  branch (gated on `props.displayOnly`) shouldn't render; verify.
- The embed shows the **bound** page (the `page_id` in `loom-galaxy-page`). A
  history may have multiple notebooks; Orbit embeds the bound one, not "the
  history's notebook."

**1.3 Embed token + scoped-read auth path (Option C). ← the hard part.**
This is the security-critical, "modify Galaxy when it makes sense" centerpiece and
the v1 critical path. **Scope estimate: not "~40 LOC."** Galaxy has *no scoped/
capability credential concept* today — `get_api_user` (`api/__init__.py:163-188`)
always resolves to a **full** `User`, and nested-resource authz is enforced in
**3+ heterogeneous places**: datasets via RBAC `can_access_dataset`
(`model/security.py:492`, `managers/datasets.py:119`), the legacy dataset
controller's own path (`controllers/dataset.py`), and visualizations via
`security_check` (`managers/base.py:116`). A genuine page-scoped capability must
thread through all of them. Realistic: **~75–175 LOC across several files +
migration + tests.**

- `POST /api/pages/{id}/embed_token` → `{ token, expires_at }`. Auth: normal
  (API key / session); authorizes caller as page owner/sharer; mints a short-TTL
  (5–15 min) token. Reuse the `PasswordResetToken` DB pattern (Q7): new
  `EmbedToken(token, page_id, user_id, expiration_time)` model + migration.
- **Route-level allow-list — IMPLEMENTED via per-route decorator (Divergence 1):**
  instead of a central gate or per-manager checks, a route opts in with the boolean
  `embed_allowed=True`. The attached shared dependency validates the token and
  stashes the recovered **full owning user** on `request.state.embed_user` for
  `get_api_user`. Default-deny is automatic: unmarked routes never attach it. Done
  for page + dataset (display/show/metadata_file) + collection routes; viz needs no
  extra route (plugin metadata reads anonymously). Full design + spike:
  [LOOM_1B_EMBED_AUTH_DESIGN.md](LOOM_1B_EMBED_AUTH_DESIGN.md).
- **The shortcut, deliberately taken (model pivot).** "resolve embed token →
  page-owner `User`" was originally flagged forbidden (grants account-level access).
  We **adopted it anyway**, because the containment is the **route allow-list +
  GET/HEAD-only marking**, not a per-resource scope: the Q5 api-key sink stays
  closed because `/api/users/*` is simply never marked → token ignored there → 401.
  Ids are not a security boundary, so the dropped scope check bought little; accepted
  residual is that a hijacked short-TTL token reads the marked routes as the owner.
  **Load-bearing invariant: never mark a listing/enumeration route.** See the
  model-pivot note in §0.5.
- **CSRF/ambient authority:** because v1 injects the token as a request *header*
  (not a cookie), there is no ambient-authority/CSRF surface in Orbit. Preserve
  this property; the cookie-exchange path (Q-A-ii) reintroduces CSRF and must add
  protection when built.
- **Design for future web-shell delivery (decision 3):** keep the `EmbedToken`
  model + auth-path resolution independent of *how* the token arrives, so a later
  token→scoped-session-cookie exchange (Q-A-ii) drops in without reworking either.
  v1 delivers the token via the Electron partition only.

**1.4 `embed_url` on the page schema (convenience).**
- Add `embed_url` to `PageDetails` (Pydantic schema + `_page_to_details`) so
  Loom/Orbit don't hand-construct URLs. Value:
  `{base}/published/page?id={encoded_id}&embed=true`.

**1.5 postMessage embed protocol (client — the strongest UX win).**
- In `PageView.vue` (when `isChromeFree`), add a small embed bridge that
  `window.parent.postMessage(...)`-es:
  - `{type: "galaxy-embed:ready", pageId}` on mount,
  - `{type: "galaxy-embed:height", px}` on content resize (ResizeObserver), so
    Orbit can size the iframe / avoid double scrollbars,
  - `{type: "galaxy-embed:title", title}`,
  - `{type: "galaxy-embed:navigate", href}` — **intercept link clicks** in embed
    mode so clicking a dataset/history link doesn't navigate the *whole Galaxy
    app inside the tiny pane*; instead notify the parent (Orbit opens it in a
    real window/tab).
- Target-origin–restrict all postMessages to the configured embedder origin(s).

**1.6 Tests (red→green).**
- API: `embed_token` mint + validate + expiry + scope-rejection (can't read a
  *different* page). Schema test for `embed_url`.
- Middleware: `frame-ancestors`/X-Frame behavior for embed vs non-embed paths.
- Selenium/Playwright: load `/published/page?id=X&embed=true`, assert chrome-free
  + postMessage `ready`/`height` fire.

### Phase 2 — Loom brain: expose the embed URL + keep server in sync
*(worktree: `…/loom/branch/notebook_iframe`)*

**2.1 Derive/persist the embed URL. — DONE (helper, committed `4381a4e`).**
- Add a helper (in `galaxy-page-binding.ts` or `galaxy-pages-api.ts`):
  `getEmbedUrl(binding)` → prefer API `embed_url`; else construct
  `{galaxy_server_url}/published/page?id={page_id}&embed=true`.
- Surface binding state to shells: `{ pageId, historyId, galaxyUrl, embedUrl,
  lastSyncedRevision, synced }`.
- **As built:** `getEmbedUrl` lives in a new pure module `extensions/loom/galaxy-embed.ts`
  and *constructs* the absolute URL (the API `embed_url` is path-relative, so
  "prefer API" doesn't apply — see §0.5 Phase 2 foundation). `buildNotebookEmbed`
  produces the shell payload; `synced` was dropped (Divergence 3).

**2.2 New shell-contract payload (keep brain shell-neutral). — DONE.**
- In `shared/loom-shell-contract.js`, add a `NotebookEmbed` widget key (or extend
  the `Notebook` widget) carrying the binding/embed state above. Brain emits it
  on connect, on `/sync`, and when the `loom-galaxy-page` block changes (the
  existing chokidar notebook watcher in `state.ts` already re-fires the UI
  bridge; extend `ui-bridge.ts` to include embed state).
- **No URL/HTML logic in the shell** beyond rendering the iframe — the brain owns
  the contract (per `CLAUDE.md`: shells stay thin).
- **Status:** the *contract* (widget key + payload + encode/decode) **and** the
  *emission wiring* (`ui-bridge.ts` deriving the binding from `notebook.md` and
  emitting on connect/change/sync, deduped, before the hidden gate) are DONE &
  green.

**2.3 Mint the embed token (when Option C lands). — PARTIAL.**
- Brain calls `POST /api/pages/{id}/embed_token` (it already holds the API key),
  attaches the token to the embed URL it hands the shell, and refreshes it before
  expiry. Keeps Orbit from ever needing the API key for the iframe under Option C.
- **Status:** `mintEmbedToken` client + refresh-timing math (`shouldRefreshToken`/
  `refreshDelayMs`) **and** the stateful refresh *loop* (`embed-token-manager.ts`:
  mint-on-bind, refresh-before-expiry, retry, cancel/abort/stale-drop) are DONE &
  green. The remaining piece is *wiring* — calling `setPage` from the brain and
  providing the real `sink` (push-token-to-main) — held until Phase 3 defines
  main's consumption.

**2.4 Sync freshness.**
- The iframe shows **server** state, so a stale server = stale view. Options:
  - cheapest: after `/sync push`, brain emits `NotebookEmbed` with the new
    `lastSyncedRevision`; Orbit cache-busts the iframe (`&rev=<id>`).
  - optional QoL: a "push-and-view" affordance / opt-in push-on-save so the
    embedded view tracks local edits. (Auto-push is a policy choice — leave
    opt-in; `/sync push` is local-wins and silently clobbers server edits.)

**2.5 Tests. — DONE for foundation + emission wiring + token lifecycle (47 green).**
- Unit: `getEmbedUrl` construction (encoded id, trailing-slash handling, missing
  binding → null). Contract encode/decode for `NotebookEmbed`. Token refresh
  logic (mock API).
- **As built:** `tests/galaxy-embed.test.ts` (14: URL construction incl.
  trailing-slash + deploy-prefix, `buildNotebookEmbed` incl. null→unbound,
  contract round-trip, refresh-timing incl. unparseable/custom-skew) + 2
  `mintEmbedToken` cases in `tests/galaxy-pages-api.test.ts` +
  `tests/ui-bridge-embed.test.ts` (6: emission wiring) +
  `tests/embed-token-manager.test.ts` (9: token lifecycle, fake timers).

### Phase 3 — Orbit shell: the iframe view + toggle
*(worktree: `…/loom/branch/notebook_iframe/app`)*

> **Token transport + partition/injection (3.3/3.4) — DONE & green.** Brain→main
> embed-token channel via a swallowed `EmbedToken` widget key (decision: no Pi-
> protocol change): `embed-token-bridge.ts` (brain) → `embed-token-store.ts` +
> `agent.ts handleLine` (main, intercept + hold, never forward). Locked-down
> `persist:galaxy-embed` partition: `embed-partition.ts` (pure trust boundary) +
> `embed-partition-session.ts` (webRequest hooks) + `main.ts` wiring + CSP. See
> the two §0.5 "Phase 3" done blocks. **Remaining:** the renderer toggle/iframe
> (3.1/3.2) + postMessage (3.5/3.6) — first end-to-end exercise of the partition.

**3.1 View-mode toggle in the Notebook tab. — DONE (see §0.5).**
- Add a segmented control in the notebook pane header: **"Markdown"** (current
  local render — fast, offline, always available) vs **"Galaxy"** (server
  iframe — full fidelity).
- Persist `localStorage["orbit.notebookViewMode"]` (mirror
  `orbit.artifactCollapsed`). Default **Markdown**; switch to **Galaxy** only
  when bound + connected.

**3.2 Render the iframe. — DONE as `<webview>` (see §0.5; iframe can't take a partition).**
- In `artifact-panel.ts`, when mode = Galaxy and a `NotebookEmbed` payload exists,
  create an `<iframe>` into `#notebook-view` with `src = embedUrl` and a
  dedicated `partition` (e.g. `persist:galaxy-embed`).
- Fallback states: not bound → "Run `/sync push` to view in Galaxy"; not
  connected → "Connect to Galaxy"; load error → show error + retry, keep Markdown
  available.

**3.3 Locked-down session partition + scoped-token injection. — DONE (see §0.5).**
> ⚠️ Inject the **scoped embed token**, NOT the API key. Injecting the full key
> is the rejected Option B (§3, §6) — an exfiltrated key is total account
> compromise; an exfiltrated embed token is one page, read-only, minutes.
- In main (`app/src/main/`), configure `session.fromPartition("persist:galaxy-embed")`:
  - `onBeforeSendHeaders`: if `details.url` host === Galaxy host (from
    `resolveGalaxyServerUrl`), append the **embed token** (e.g.
    `X-Galaxy-Embed-Token: <token>`). **Only** that host; never for
    `localhost`/dev/other. The brain mints/refreshes the token (§2.3); main
    holds the current token, never the API key, in this partition.
  - `onHeadersReceived`: for that host, drop `X-Frame-Options` /
    `content-security-policy` frame directives (defensive; Galaxy already omits
    them for `embed=true`).
  - `webRequest.onBeforeRequest`: **block navigations** away from the Galaxy host
    inside the iframe (defense-in-depth against a hijacked frame).
- The renderer never sees the token.

**3.4 CSP + webPreferences. — DONE (CSP `frame-src blob: https:` + `webviewTag: true`; see §0.5).**
- `app/src/renderer/index.html` CSP currently `frame-src blob:`. Add the Galaxy
  origin: `frame-src blob: https://<galaxy-host>` — ideally **dynamically** from
  config rather than wildcard `https:`. (CSP is static HTML; simplest is to allow
  `https:` for `frame-src` and rely on the partition + `onBeforeRequest`
  host-allowlist to constrain. Decide: wildcard-`https` frame-src vs. injected
  per-host CSP at window-create.)
- Keep `contextIsolation: true`, `nodeIntegration: false`. The iframe is remote
  web content — ensure it cannot reach `window.orbit`/preload (it can't:
  cross-origin iframe, isolated world).

**3.5 postMessage handling. — SUPERSEDED by the webview vehicle (see Divergence 4 + §0.5).**
- Renderer listens for `galaxy-embed:*` (origin-checked against the Galaxy host):
  - `height` → size the iframe (avoid nested scrollbars);
  - `navigate` → `window.orbit` → open in external window (reuse
    `openExternalUrlWindow`);
  - `ready`/`title` → loading state / tab label.

**3.6 Refresh on sync + token lifecycle. — DONE (reload-on-rev; 401→reload pending; see §0.5).**
- On `NotebookEmbed` with a new `lastSyncedRevision`, reload the iframe with a
  cache-busting `&rev=`.
- **Long-open panes vs short token TTL:** a 5–15 min token expires while a pane
  stays open for hours. The injected header (3.3) is read from the brain's
  *current* token, so the brain must refresh the token before expiry (§2.3) and
  push it to main. Already-loaded SPA requests that 401 on expiry should trigger
  an iframe reload (which re-issues requests with the refreshed header). Define:
  brain refresh cadence < TTL, and an Orbit `onHeadersReceived` 401 → reload hook.

**3.7 Tests.**
- Renderer unit: toggle persistence; fallback states; iframe `src` = embedUrl;
  postMessage `navigate` routes to external-open; `height` resizes.
- Main unit: header-injection predicate (injects for Galaxy host only; never for
  others); X-Frame strip scoped to partition.

---

## 5. End-state data flow

```
notebook.md  --/sync push-->  Galaxy Page (private, history-attached, new revision)
     |                               |
 loom-galaxy-page block         /api/pages/{id}  (embed-expanded `content`)
     |                               ^
 brain getEmbedUrl()                 | scoped embed TOKEN injected by Orbit
     |  + mints embed token          |   partition (X-Galaxy-Embed-Token header;
     |  NotebookEmbed widget         |   covers nested dataset/viz frames too)
     v  (shared contract)            |   — NEVER the full API key (§3 Option B)
Orbit Notebook pane [Galaxy mode]    |
     |  <iframe src=                 |
     |   /published/page?id=<encoded>&embed=true[&rev]>
     +------------------ renders PageView (chrome-free) --------------------+
                         live dataset displays + visualizations + charts
                         postMessage: ready / height / title / navigate
```

Markdown mode keeps the existing local `marked`+DOMPurify render for offline /
fast / unsynced cases.

---

## 6. Security considerations

- **No full API key in the embed surface (Q5, decisive).** Galaxy's dataset
  (`HistoryDatasetDisplay.vue:65`) and visualization (`VisualizationFrame.vue:99`)
  iframes are **same-origin with no `sandbox` attribute**. JS running there (viz
  always; HTML datasets when `sanitize_all_html` is off or the tool is
  allowlisted) can `GET /api/users/me/api_key` (`api/users.py:244`) and exfiltrate
  the user's permanent key if it is the injected credential. **Therefore inject
  only the scoped embed token**, never the API key.
- **Embed-token scope must exclude account endpoints.** "Read-only" is not enough
  on its own — reading `/api/users/me/api_key` is a GET. The embed-token auth path
  must authorize *only* the target page + its referenced datasets/visualizations
  and **reject** user/account/api-key endpoints. Short TTL (mins) + page scope
  caps blast radius if a token leaks.
- **Partition lock-down:** dedicated Electron partition for the notebook iframe
  only; inject the token for the Galaxy host *only* (`onBeforeSendHeaders` host
  check); block in-iframe navigation off the Galaxy host (`onBeforeRequest`
  allowlist); cross-origin iframe already can't reach `window.orbit`/preload.
- **Dataset sandboxing posture:** default `sanitize_all_html: true` serves
  uploaded HTML as `text/plain`, but visualizations run JS regardless — do not
  rely on sanitization alone; the scoped-token model is what actually contains
  this. Consider adding a `sandbox` attribute to dataset-display iframes upstream
  in Galaxy as defense-in-depth.
- **frame-ancestors allowlist:** restrict embedding to known Loom/Orbit/dev
  origins via `embed_allowed_origins`; don't ship a wildcard.
- **postMessage:** strict `targetOrigin` on both sides (Galaxy → embedder origin;
  Orbit → Galaxy host). Never `*`.
- **Navigation containment:** block in-iframe navigation off the Galaxy host;
  route link clicks to the parent (postMessage `navigate`).
- **Privacy default:** never auto-publish to enable embedding. Private stays
  private; auth solves embedding, not publishing.

---

## 7. Testing strategy (red→green throughout)

1. **Galaxy API/middleware** (pytest): embed-token mint/validate/expiry; **scope
   tests that matter** — token reads its page (200), a *different* page (403),
   the page's referenced dataset/viz (200), an *unreferenced* dataset (403), and
   **`GET /api/users/me/api_key` (403)** — the last proves the Q5 hole is closed;
   `frame-ancestors` emitted only for embed paths; `embed_url` in schema.
2. **Galaxy client** (Vitest + Playwright): `PageView` chrome-free under
   `embed=true` (and **no back-button/toolbar**); postMessage
   `ready`/`height`/`navigate`; link interception.
3. **Loom brain** (Vitest): `getEmbedUrl` (encoded id, no double-encode);
   `NotebookEmbed` contract; token mint/refresh-before-expiry; `/sync push` emits
   fresh revision.
4. **Orbit** (Vitest + Electron integration): toggle persistence; fallback to
   Markdown when unbound/disconnected; **token** injection scoped to Galaxy host
   (never the key, never other hosts); X-Frame strip in partition; iframe refresh
   on new revision; 401 → reload.
5. **End-to-end (automate, don't just eyeball):** bind a private notebook with a
   Galaxy viz directive → `/sync push` → Galaxy mode → **Playwright assertion that
   the viz iframe/canvas actually paints** (not merely that `/api/pages` 200s) and
   the masthead is absent. Fidelity is the feature's whole purpose, so assert it.

Per repo conventions: run root tests + `app` typecheck after brain/shell changes;
for Galaxy, prefer one suite at a time (the `/galaxy-backend-tests` and
`/galaxy-playwright` skills).

---

## 8. Suggested sequencing

1. **Galaxy embed token (Phase 1.3) + auth-path scoping:** the credential. On the
   critical path — nothing safe ships without it. Land model + migration + mint
   endpoint + scoped read auth + tests first.
2. **Reuse `/published/page?embed=true` (Phase 1.2) + Orbit shell (3.1–3.4):**
   toggle + locked-down partition injecting the **token** + CSP `frame-src`. First
   working full-fidelity view.
3. **postMessage UX (Phase 1.5) + Orbit 3.5–3.6:** height auto-resize, link
   interception, refresh-on-sync — makes the pane pleasant.
4. **Brain contract (Phase 2):** move embed-URL/token ownership into the brain;
   `NotebookEmbed` widget; token refresh.
5. **frame-ancestors CSP + `embed_url` schema (Phase 1.1 + 1.4)** and, if in
   scope, **scoped-session-cookie delivery (Q-A-ii)** to unblock the **web shell**
   and plain-browser embedding.

Steps 1 + 5 are the "modify Galaxy when it makes sense" core.

---

## 9. Questions

### Resolved by research
- **Q2 (embed route) — RESOLVED.** Reuse `/published/page?id=X&embed=true`. It
  renders a private history-attached notebook fine once requests authenticate as
  the owner; route needs only `id`; uses embed-expanded `content`; viz resolve by
  baked-in dataset ids (no current-history context). No new route needed.
- **Q5 (full-key safety) — RESOLVED: unsafe.** Full API-key injection is rejected
  (see §3 Option B, §6). Use the scoped embed token instead.
- **Q7 (token feasibility) — RESOLVED, with a scope caveat.** Reuse the
  `PasswordResetToken` DB-backed pattern for the `EmbedToken` model + mint endpoint
  + migration. **But** the scoped-read auth path (authorizing the page's referenced
  datasets/viz, not just the page row, while refusing account endpoints) threads
  through 3+ authz mechanisms — realistically **~75–175 LOC**, not 40. The
  "resolve token → owner User" shortcut is forbidden (re-creates Q5). (See §4 1.3.)

### New decision surfaced
- **Q-A (nested-frame auth delivery):** (i) inject the token at the Electron
  network layer, (ii) exchange token → short-lived **scoped session cookie**
  (covers any browser/web-shell but needs Galaxy scoped sessions — new concept),
  or (iii) token in every embed URL (messy URL rewriting). **Decision: build (i)
  for Orbit v1, but design the `EmbedToken`/auth-path so (ii) is addable without
  rework** (per the web-shell decision below). See §3.

### Decisions (settled 2026-06-20)
1. **Auth: token-first v1.** Ship the **scoped embed token + Electron injection**
   together. The Galaxy token work is accepted on the critical path; no full-key
   shortcut ships ahead of it.
2. **Refresh: build both, default manual.** Ship manual "push-and-view" (run
   `/sync push` → Orbit reloads the iframe). Add **opt-in push-on-save** as a
   preference (off by default, since `/sync push` is local-wins/clobbers).
3. **Web shell: design for it, build Orbit-only now.** Choose the token design so
   the token→scoped-session-cookie exchange (Q-A-ii) can be added later without
   reworking the model or auth path. Don't build the cookie path in v1.
4. **Offline UX: fall back to local Markdown.** Markdown (local marked+DOMPurify)
   stays the **default** view and the always-available fallback; the Galaxy iframe
   mode is offered only when the notebook is bound **and** Galaxy is connected.

### Still open (minor / defer)
- **CSP `frame-src` in Orbit:** wildcard `https:` + partition host-allowlist
  (simple) vs. inject the exact Galaxy host into CSP at window creation (tighter).
  Lean simple; revisit during Orbit implementation.
