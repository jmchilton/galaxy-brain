# WF_VIZ_3 — Client-side Edge Annotations in gxwf-ui as Peer to the Server Endpoint

Goal: stand up a **browser-side** edge-annotation path in `gxwf-ui` that mirrors the server-side `POST /workflows/{path}/edge-annotations` shipped in WF_VIZ_2 Phase 3, sharing as much code as possible. UI callers can flip between the two without API drift; a deployment without `gxwf-web` (static build, embedded viewer) still lights up map/reduce annotations. Both paths must converge on a single source of truth for the resolve-tools-to-annotations pipeline so neither rots.

Repos:
- TS: `~/projects/worktrees/galaxy-tool-util/branch/connections`

Predecessors: WF_VIZ_2 Phase 3 (server-side `resolveEdgeAnnotationsWithCache` + `useEdgeAnnotations` + `operateEdgeAnnotations` route — all shipped on `connections`).

---

## Motivating problem

The server-side path works, but it pins map/reduce visualization to the presence of a running `gxwf-web`. Three realistic deployments don't have that:

1. **Static gxwf-ui builds** (e.g. behind a CDN, or the eventual `gxwf-ui` embed mode) — there is no Node process to run `resolveEdgeAnnotationsWithCache`.
2. **Editor / IDE integrations** that embed the workflow renderer next to a YAML buffer with no web server.
3. **Offline / air-gapped previews** of a single `.gxwf.yml`.

`@galaxy-tool-util/core` already exports `IndexedDBCacheStorage`, `ToolCache`, `ToolInfoService`, `fetchFromToolShed`, and `fetchFromGalaxy` — all browser-safe. The pipeline from "workflow JSON → preloaded `GetToolInfo` → `validateConnectionGraph` → `buildEdgeAnnotations`" is itself browser-safe; only the helpers that *drive* that pipeline (`buildGetToolInfo`, `collectToolRefs`, `loadCachedTool`) live in `@galaxy-tool-util/cli` today. The lift is mechanical; the hard questions are tool-cache wiring, async-to-sync bridging in the browser, and how the two paths converge long-term.

---

## Strategy: lift the orchestrator, share it, hybridize the endpoint

Three moves, in order:

1. **Lift `collectToolRefs` + a parameterized `buildGetToolInfo` out of `@galaxy-tool-util/cli`** into a package both UI and CLI can import. Target package: `@galaxy-tool-util/connection-validation` — it already declares `GetToolInfo` and is browser-safe; no new package boundary.
2. **Add a browser-side composable** `useClientEdgeAnnotations()` shaped identically to `useEdgeAnnotations()`, backed by `IndexedDBCacheStorage` + `ToolInfoService`.
3. **Choose recommendation (5)(c): hybrid endpoint** — server-side stays a first-class peer and on first call returns an `EdgeAnnotation` map *plus* the tool specs the browser used, which the UI then writes into IndexedDB. Subsequent loads (same workflow or others sharing tools) can use the warm browser cache without re-hitting the server. When `gxwf-web` is absent we fall back to direct ToolShed/Galaxy fetches via `ToolInfoService`. End state: one orchestrator, two transports, one client cache — both transports remain supported indefinitely; deployments choose based on their constraints (server-side benefits: centralized cache, no per-client ToolShed fanout, works in locked-down CSP; client-side benefits: works without a backend, offline-friendly, embed-mode compatible).

Why this carve-up:
- Lifting `buildGetToolInfo` without copy-pasting prevents the inevitable drift between CLI and UI on subworkflow walking, version negotiation, and the empty-version fallback.
- A hybrid endpoint piggybacks on the work `gxwf-web` is already doing — no second cold-start when the user hits a deployment with both available — while still letting the UI work without it.
- IndexedDB-backed `ToolCache` is already a supported configuration; we just have not exercised it in `gxwf-ui`.

---

## Phase 1 — lift the orchestrator into `@galaxy-tool-util/connection-validation`

### 1.1 Move `collectToolRefs` and the lookup-Map-over-`GetToolInfo` shape

`packages/connection-validation/src/build-get-tool-info.ts` (new):

```ts
import type { ParsedTool } from "@galaxy-tool-util/schema";
import type { GetToolInfo } from "./get-tool-info.js";

export interface ToolRef {
  toolId: string;
  toolVersion: string | null;
}

/** Walk a workflow dict (steps + nested subworkflows + nested `run`) and dedupe tool refs. */
export function collectToolRefs(data: Record<string, unknown>): ToolRef[]; // verbatim from cli

export type AsyncToolFetcher = (
  toolId: string,
  toolVersion: string | null,
) => Promise<ParsedTool | null>;

/**
 * Preload every tool referenced by `data` via `fetcher` and return a sync
 * `GetToolInfo` backed by the resulting Map. Misses are logged, not thrown —
 * the validator runs against whatever resolved.
 */
export async function buildGetToolInfo(
  data: Record<string, unknown>,
  fetcher: AsyncToolFetcher,
  opts?: { onMiss?: (ref: ToolRef, reason: unknown) => void },
): Promise<GetToolInfo>;
```

Key shape change vs. CLI: takes an **`AsyncToolFetcher` callback**, not a `ToolCache`. CLI passes `(id, v) => loadCachedTool(...)` mapped to a nullable `ParsedTool`; browser passes `(id, v) => toolInfoService.getToolInfo(id, v)`. Both call sites stay one-liners.

Re-export from `packages/connection-validation/src/index.ts`:

```ts
export { collectToolRefs, buildGetToolInfo } from "./build-get-tool-info.js";
export type { ToolRef, AsyncToolFetcher } from "./build-get-tool-info.js";
```

`lookupKey` and `firstByToolId` (currently file-private in `cli/connection-validation.ts`) move with the helper — they're the version-negotiation contract and must not diverge.

### 1.2 Rewire the CLI to be a thin wrapper

`packages/cli/src/commands/connection-validation.ts` collapses to:

```ts
import { buildGetToolInfo as _build, collectToolRefs } from "@galaxy-tool-util/connection-validation";
import { isResolveError, loadCachedTool } from "./resolve-tool.js";

export { collectToolRefs };

export async function buildGetToolInfo(data, cache: ToolCache): Promise<GetToolInfo> {
  return _build(data, async (id, v) => {
    const r = await loadCachedTool(cache, id, v);
    return isResolveError(r) ? null : r.tool;
  });
}
```

`loadCachedTool`'s Galaxy-local fallback (`resolve-tool.ts`) **stays CLI-only**. Reading it: it just calls `cache.resolveToolCoordinates` + `cache.loadCached`. There is no Galaxy-local-fallback-specific logic in there — it's a pure cache lookup. The "Galaxy-local fallback" is a property of how the **CLI's `ToolCache`** is populated (via `makeNodeToolCache` reading the on-disk cache that `galaxy-tool-cache` filled from a Galaxy instance), not of `loadCachedTool` itself. Conclusion: nothing extra to lift; `loadCachedTool` stays put as a CLI implementation detail and the lifted helper takes a fetcher that doesn't care where the tool came from.

`packages/cli/src/commands/annotate-connections.ts` is unchanged externally; internally it now goes through the lifted helper.

### 1.3 Parity test: lifted helper produces identical annotations

`packages/cli/test/annotate-connections.parity.test.ts` (new): for the existing fixture set under `packages/cli/test/fixtures/connection-validation/`, assert that the new code path produces a `Map<string, EdgeAnnotation>` byte-equal to a pre-recorded golden generated from the *current* CLI code. Lock once, then it's a regression alarm.

### 1.4 Changeset

Patch `connection-validation` (new export, no breaking change), patch `cli` (refactor only).

---

## Phase 2 — browser tool-cache wiring in `gxwf-ui`

### 2.1 Singleton `ToolInfoService` in a new composable

`packages/gxwf-ui/src/composables/useToolInfoService.ts` (new), modeled on `useApi.ts`:

```ts
import {
  IndexedDBCacheStorage,
  ToolInfoService,
  type ToolSource,
} from "@galaxy-tool-util/core";

let _service: ToolInfoService | null = null;

export function useToolInfoService(): ToolInfoService {
  if (_service) return _service;
  const storage = new IndexedDBCacheStorage({ dbName: "gxwf-ui:tool-cache" });
  const sources: ToolSource[] = [
    { type: "toolshed", url: import.meta.env.VITE_TOOLSHED_URL ?? "https://toolshed.g2.bx.psu.edu" },
  ];
  // Optional: a tool-cache-proxy source (gxwf-web's existing /tools route, if reachable)
  const proxy = import.meta.env.VITE_TOOL_CACHE_PROXY_URL;
  if (proxy) sources.unshift({ type: "galaxy", url: proxy });
  _service = new ToolInfoService({ storage, sources });
  return _service;
}
```

Key decisions:
- **Singleton across composable invocations.** The `ToolCache` inside `ToolInfoService` carries a `memoryCache: Map<string, ParsedTool>` that's free hits across pages once primed.
- **`IndexedDBCacheStorage` dbName scoped to the app**, not shared with other tools, so we can wipe without collateral.
- **Source order is configurable** — the gxwf-web tool-cache-proxy source comes first when running co-resident with a server (lower latency, no CORS), ToolShed second for static deploys.
- **Reuse `ToolInfoService.refetch(toolId, version?, {force?})`** (added in PR #81) for the misses "Retry" path in Phase 4.2 — idempotent populate + force-refetch in one call. No bespoke retry loop needed.

### 2.2 Cache invalidation / TTL — what the existing `ToolCache` does and doesn't do

Read of `packages/core/src/cache/tool-cache.ts`: **no TTL**. `cacheKey` is `sha256(toolshedUrl + trsToolId + version)`, so the cache is *content-addressed by version*. Tools are immutable per version on ToolShed, so the only invalidation surface that matters is "I have stale `latest` resolution" — which is handled inside `ToolInfoService.resolveLatestVersion` (always re-fetched on a request that doesn't pin a version). Plan: **don't add a TTL**. Document this. Add a `clearCache()` button in a settings drawer (Phase 5) for users who want to re-pull after editing a tool locally — `ToolCache.clearCache(prefix?)` returns the count of removed entries (PR #81), so the drawer can show "cleared N entries" without a separate stat call.

### 2.3 `extraConnectSrc` audit

Default `CSP_CONNECT_SRC_BASE = ["https://toolshed.g2.bx.psu.edu"]` already covers the default ToolShed. Document that any deployer overriding the default ToolShed via `VITE_TOOLSHED_URL` **must** also append it to `extraConnectSrc`. Add a runtime warning in `useToolInfoService` if `import.meta.env.VITE_TOOLSHED_URL` is set but doesn't match the page's CSP — best-effort detection via a fetch that catches the CSP-blocked rejection and reports clearly.

---

## Phase 3 — `useClientEdgeAnnotations()` composable

### 3.1 Shape parity with `useEdgeAnnotations`

`packages/gxwf-ui/src/composables/useClientEdgeAnnotations.ts` (new):

```ts
import { ref } from "vue";
import {
  buildEdgeAnnotations,
  buildGetToolInfo,
  buildWorkflowGraph,
  collectToolRefs,
  validateConnectionGraph,
  type EdgeAnnotation,
} from "@galaxy-tool-util/connection-validation";
import { useToolInfoService } from "./useToolInfoService";
import { useContents } from "./useContents";

export function useClientEdgeAnnotations() {
  const annotations = ref<Map<string, EdgeAnnotation> | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const misses = ref<Array<{ toolId: string; toolVersion: string | null; reason: string }>>([]);
  const progress = ref<{ resolved: number; total: number } | null>(null);

  async function build(path: string): Promise<void> { /* see 3.2 */ }
  function clear(): void { /* mirror server-side */ }
  return { annotations, loading, error, misses, progress, build, clear };
}
```

Same `{ annotations, loading, error, build, clear }` quartet as `useEdgeAnnotations` so callers can swap with a one-line import change. New surface (`misses`, `progress`) is additive and ignored by the existing toolbar.

### 3.2 The async-to-sync bridge in detail

The flow inside `build(path)`:

1. `useContents().getWorkflow(path)` → `data: Record<string, unknown>`. (The same fetch the server-side path triggers, just routed through the SPA's existing workflow loader.)
2. `const refs = collectToolRefs(data)`. Set `progress.value = { resolved: 0, total: refs.length }`.
3. Resolve **in parallel** with bounded concurrency (default 6 — we are hitting one ToolShed, courtesy of TS rate limits):

```ts
const service = useToolInfoService();
await pMap(refs, async (ref) => {
  try {
    const tool = await service.getToolInfo(ref.toolId, ref.toolVersion);
    if (tool === null) misses.value.push({ ...ref, reason: "not_found" });
  } catch (e) {
    misses.value.push({ ...ref, reason: errorMessage(e) });
  } finally {
    progress.value = { resolved: progress.value!.resolved + 1, total: refs.length };
  }
}, { concurrency: 6 });
```

Note: this means we can't reuse the lifted `buildGetToolInfo` *as-is* for the parallel-with-progress case — `buildGetToolInfo` does serial preload, by design (CLI ergonomics). Two options:
   - (a) Add an opt-in `concurrency` knob to the lifted helper.
   - (b) Inline the loop in the composable; lifted helper stays simple.
   - **Pick (a).** Add `opts.concurrency?: number` (default 1, so CLI behavior unchanged) and `opts.onProgress?: (resolved, total) => void`. Both helpers benefit; future CLI parallelization is free.

4. After preload, the lifted helper's returned `GetToolInfo` is sync. Run:
   ```ts
   const graph = buildWorkflowGraph(data, getToolInfo);
   const [report] = validateConnectionGraph(graph);
   annotations.value = buildEdgeAnnotations(report);
   ```

5. **Failed-tool handling.** Annotation map is populated for whatever resolved. The toolbar (Phase 4) shows a "n tools couldn't be resolved" pill that opens a dialog listing `misses.value`. Map/reduce annotations on edges *into* unresolved tools simply don't appear — same fidelity loss as if the validator never had specs, no thrown error. This matches the CLI's existing behavior.

### 3.3 Tests

`packages/gxwf-ui/test/composables/useClientEdgeAnnotations.test.ts`:
- Mock `useContents` with a fixture workflow (one tool→tool collection edge).
- Mock `IndexedDBCacheStorage` with the existing `MemoryCacheStorage` test double from `packages/core/test`.
- Stub `globalThis.fetch` to return a known ToolShed TRS payload.
- Assert `annotations.value` has the expected `EdgeAnnotation` for the collection edge, `misses.value` is empty, `progress.value.resolved === total`.

A second test injects a fetch rejection for one of two tools and asserts `misses.value` has one entry and the surviving tool's edges are still annotated.

---

## Phase 4 — UI wiring + UX (auto-detect, swap, fallback)

### 4.1 The dispatch composable

`packages/gxwf-ui/src/composables/useEdgeAnnotationsAuto.ts` (new): one composable the renderers call, decides at runtime which transport to use.

```ts
export function useEdgeAnnotationsAuto() {
  const mode = ref<"server" | "client" | null>(null);
  const server = useEdgeAnnotations();
  const client = useClientEdgeAnnotations();
  // ...delegates `annotations`, `loading`, `error` to the active backend
}
```

Decision logic in `build(path)`:
1. If `import.meta.env.VITE_EDGE_ANNOTATIONS_MODE` is `"server" | "client"`, honor it. (Build-time pin for static deploys.)
2. Else: probe `GET /healthz` (1.5s timeout). On 200 with `features` containing `"edge-annotations"`, use server. Anything else (network error, non-200, missing feature) → client. Cache the decision in `sessionStorage` (`gxwf-ui:annotations-mode`) so we don't probe per-build. (`/healthz` is shipped pre-Phase-1 — see commit on `connections`.)
3. On server failure post-decision (5xx, network, CORS), fall back to client and stick.

This is the only consumer-facing change — `WorkflowDiagram.vue` swaps `useEdgeAnnotations` → `useEdgeAnnotationsAuto`.

### 4.2 Cold-start UX

A workflow with 30 tool refs, no warm cache, has 30 ToolShed fetches at concurrency 6. Realistic: 5–15s on a good connection. Plan:
- Toolbar pill: spinner + "Resolving tools (n/m)…" while `progress.value.resolved < total`.
- After build, if `misses.value.length > 0`, replace the spinner with a warning chevron that opens a dialog listing missed tools and a "Retry" button. Retry calls `service.refetch(toolId, version, { force: true })` per missed entry (idempotent + force-evict, from PR #81), then rebuilds annotations — no bespoke retry loop in the composable.
- Cache hits are instantaneous (`memoryCache` lookup) — second open of the same workflow shows annotations without a visible loading state.

### 4.3 Hybrid response (the convergence move)

Extend the server-side route once to return an additional `tool_specs` map. `packages/gxwf-web/src/workflows.ts::operateEdgeAnnotations`:

```ts
return Response.json({
  annotations: Object.fromEntries(annotations),
  tool_specs: Object.fromEntries(
    refs.map(([k, t]) => [k, { tool_id: t.id, tool_version: t.version, parsed: t }])
  ),
});
```

`useEdgeAnnotations` (server side) on receipt: `await service.cache.saveTool(...)` for each entry the browser doesn't already have, populating the IndexedDB cache as a side effect. The next user action that touches the same tools — even one that loses the server route — runs through `useClientEdgeAnnotations` with a fully warm cache. This is the convergence: **the server primes the client cache for free**, so the two transports compose rather than compete. Server-side remains the right choice for deployments that want centralized cache control, want to avoid per-client ToolShed traffic, or run under CSP that forbids third-party connections.

Backwards-compat: response shape becomes `{ annotations, tool_specs }`. Existing `useEdgeAnnotations` consumes `annotations` and ignores `tool_specs` if it isn't present (older `gxwf-web` builds keep working with newer UI).

### 4.4 Tests

- Vitest for `useEdgeAnnotationsAuto`: server reachable → uses server; server probe fails → uses client; cached `sessionStorage` decision honored without re-probe.
- Vitest for hybrid-cache write-through: mock `useEdgeAnnotations` server response with `tool_specs`, assert `IndexedDBCacheStorage.save` called for each spec.
- Manual: load IWC's `Cheminformatics/protein_ligand_complex_assessment.ga` with no `gxwf-web` running; verify map/reduce annotations show up after the cold-start; reload, verify they appear immediately.

---

## Phase 5 — convergence cleanup

- Both `useEdgeAnnotations` (server-only) and `useClientEdgeAnnotations` (client-only) stay on the public surface as named peers — `useEdgeAnnotationsAuto` is the default for `WorkflowDiagram` but callers that want to pin a transport (tests, embed hosts, deployments with strong opinions) keep that option. No deprecation planned.
- File a follow-up to add a tiny `gxwf-ui` settings drawer for: ToolShed URL override, transport override (server / client / auto), "clear tool cache" button (calls `service.cache.clearCache()` — returns count for "cleared N entries" toast), and current cache stats.
- **Component reuse with the existing `/cache` tab (PR #81).** `gxwf-ui` already ships `ToolCacheTable.vue`, `ToolCacheStats.vue`, `ToolCacheRawDialog.vue`, and `useToolCache` for debugging the *server* cache via `/api/tool-cache/*`. The client-side IndexedDB cache exposed by `useToolInfoService` has the same shape (entries with `tool_id` / `tool_version` / `toolshedUrl` / size / decode-probe) — wrap it in a `useClientToolCache` adapter that mirrors `useToolCache`'s reactive surface and the existing components render unchanged. End state: one `/cache` view with a transport selector (server | client | both), one set of components.
- Document the IndexedDB schema and the hybrid `tool_specs` payload in `docs/packages/gxwf-ui.md` (new section) and `docs/packages/gxwf-web.md`.
- Open question for later: should the hybrid `tool_specs` payload be opt-in via a query param (`?include_specs=true`) so server callers without browser caches don't pay the bytes? Probably yes; defer until we measure payload size on a 30-tool workflow.

---

## Suggested commit slices

**Phase 1** (lift)
1. `connection-validation: lift collectToolRefs + buildGetToolInfo from cli`
2. `cli: thin-wrap lifted buildGetToolInfo, drop in-package copy`
3. `tests: cli parity — lifted helper produces identical annotations on fixture set`
4. `connection-validation: optional concurrency + onProgress in buildGetToolInfo`
5. `changeset: connection-validation minor (new exports), cli patch (refactor)`

**Phase 2** (browser cache)
1. `gxwf-ui: useToolInfoService singleton — IndexedDB + ToolShed source`
2. `gxwf-ui: VITE_TOOLSHED_URL + VITE_TOOL_CACHE_PROXY_URL plumbing`
3. `docs: extraConnectSrc requirement when overriding default ToolShed`

**Phase 3** (composable)
1. `gxwf-ui: useClientEdgeAnnotations — shape-parity with useEdgeAnnotations`
2. `gxwf-ui: progress + misses surface`
3. `tests: vitest for useClientEdgeAnnotations (mocked storage + fetch)`

**Phase 4** (wiring + hybrid)
1. `gxwf-ui: useEdgeAnnotationsAuto dispatcher + sessionStorage decision cache`
2. `gxwf-web: hybrid response — annotations + tool_specs`
3. `gxwf-ui: write-through tool_specs into IndexedDB on server response`
4. `gxwf-ui: WorkflowDiagram switches to useEdgeAnnotationsAuto`
5. `gxwf-ui: cold-start progress UI + miss dialog`
6. `tests: hybrid write-through, auto-dispatch, manual IWC pass`
7. `docs/changeset: client-side annotations`

**Phase 5** (cleanup)
1. `gxwf-ui: settings drawer — clear cache + stats`
2. `docs: client annotations + IndexedDB schema`

---

## Test strategy summary

- Phase 1 cross-checks the lifted helper against pre-recorded CLI goldens — the only way to be sure no orchestration detail leaked.
- Phase 3 uses the existing `MemoryCacheStorage` test double + a stubbed `globalThis.fetch` to exercise the full preload-then-validate flow without a real ToolShed.
- Phase 4 adds vitest for transport-selection logic (deterministic, no real HTTP) plus a manual IWC pass that's the only realistic cold-start coverage we have.
- Throughout: existing CLI declarative + connection-validation suites must stay green — Phase 1's parity test is the watchdog.

---

## Risks / things to verify

1. **Cold-start latency on big IWC workflows.** Subworkflows nest deep; a workflow with 60 tool refs at concurrency 6 over a slow ToolShed is a 30s wait. Mitigation: progress UI, sessionStorage hit on second visit, hybrid-response prewarm. Verify on `Cheminformatics/protein_ligand_complex_assessment.ga` and on ENCODE workflows.
2. **CSP gotcha when deployers override `VITE_TOOLSHED_URL`.** Default `CSP_CONNECT_SRC_BASE` only allows `toolshed.g2.bx.psu.edu`; an override without an `extraConnectSrc` bump silently breaks all fetches. Plan: runtime warning in `useToolInfoService` plus deployer docs. Consider a startup probe that fails loud.
3. **ToolShed rate limits.** TRS endpoints don't publish hard limits, but bursts of 60 fetches at concurrency 6 across many users could trip implicit Cloudflare rules. Mitigation: keep concurrency conservative (6 default, configurable), retry-with-jitter on 429 already present in `fetchFromToolShed`? Verify; if not, add it.
4. **Version negotiation when `tool_version` is unspecified.** `ToolInfoService.resolveLatestVersion` resolves `null`-version refs by hitting TRS for the version list. This is a **per-build TRS hit** even on warm caches, since the latest can change. Acceptable; document. Consider a 5-minute in-memory TTL on the version-list result.
5. **Private / Galaxy-local tools.** TRS doesn't serve them. `ToolInfoService` falls back through configured sources but if there's no Galaxy source configured, those tools land in `misses.value`. The annotations for their edges silently degrade to no-annotation — same as CLI. UX surface: miss dialog explains. Verify behavior on a workflow with a custom local tool.
6. **ToolShed misses on stale subworkflow tool_versions.** A subworkflow may pin a tool_version no longer published. TRS returns 404; the tool ends up in misses. Plan: misses dialog flags the version explicitly, suggests "try without pinning version" — the lifted `firstByToolId` fallback already handles unversioned lookups in the resolved Map.
7. **IndexedDB unavailable / quota.** Private-mode browsers and some embeddings disable IDB. `IndexedDBCacheStorage` should fall back to in-memory only — verify; if it throws, wrap with a `MemoryCacheStorage` fallback in `useToolInfoService`. Quota errors on big caches: a stats + clear surface is enough for now.
8. **Hybrid-response payload size.** `tool_specs` for 60 tools is ~1–3MB JSON. Acceptable on local-dev but worth gating behind a query flag for any future shared deployment. Out of scope for this plan; tracked in Phase 5 follow-up.
9. **Subworkflow walking parity.** `collectToolRefs` walks `step.subworkflow` and `step.run`. The CLI parity test (1.3) is what catches drift; if a workflow shape exists where the walker disagrees with the validator's own traversal, both paths break together — desired.

---

## Resolved up-front

- Lifted helper lives in `@galaxy-tool-util/connection-validation`, not a new package — that package already declares `GetToolInfo` and is browser-safe.
- `loadCachedTool` stays CLI-only; it is a pure cache-key lookup over a ToolCache the CLI happens to populate from disk. No "Galaxy-local fallback" logic worth lifting.
- Lifted `buildGetToolInfo` takes an `AsyncToolFetcher` callback, not a `ToolCache`. Both call sites stay one-liners.
- No TTL on the content-addressed `ToolCache`; cache invalidation is a user-facing button, not a timer.
- Convergence direction: hybrid (server returns specs, browser caches them). Both transports remain first-class and supported; neither is deprecated. Server-side is the right pick for deployments that want central cache control or run under CSP that forbids ToolShed; client-side is the right pick for static / embed / offline. Auto picks per environment.
- Concurrency = 6 default, configurable via env. Empirically defensible against TS, conservative enough for shared deploys.
- Auto-dispatch decision cached in `sessionStorage`, not `localStorage` — survives navigation, dies on tab close, doesn't strand users on a bad decision.

## Unresolved questions

- Concurrency 6 — tune against IWC after Phase 3 lands; don't pre-optimize.
- Does `IndexedDBCacheStorage` survive private-browsing / quota failures gracefully? Verify before Phase 4.
- TTL on `resolveLatestVersion` — 5min in-memory worth the complexity? Defer until measured.
- `tool_specs` payload gating (`?include_specs=true`) — do now or as Phase 5 follow-up? Lean follow-up.
- Settings drawer scope — Phase 5 or piggyback on the WF_VIZ_2 toolbar already shipped?
- Should the lifted helper's `onProgress` callback also fire on cache hits (instant resolution)? Probably yes — UI wants to count them.
- Wipe IndexedDB on `gxwf-ui` major version bump? Or migrate? Defer until first breaking schema change.
- Embed mode (future): does `useToolInfoService` need to accept an injected service so the host page owns the cache? Likely yes; keep the singleton seam.
