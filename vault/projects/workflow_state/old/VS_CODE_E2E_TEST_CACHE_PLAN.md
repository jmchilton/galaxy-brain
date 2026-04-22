# VS Code E2E Tests — Tool Cache Infrastructure Plan

**Date:** 2026-04-12
**Branch:** `wf_tool_state`
**Related:** `VS_CODE_E2E_GAPS.md`, `VS_CODE_ARCHITECTURE.md`

---

## Background

The extension's `galaxyWorkflows.toolCache.directory` default is `~/.galaxy/tool_info_cache` — the same default as the `galaxy-tool-util` CLI tools. This means every E2E test today implicitly uses whatever cache exists on the machine running tests. No test code references the cache explicitly, but the running extension reads it anyway.

This is a latent fragility:

- The format2 `test_ts_smoke` test asserts "not in the local cache" for `wc_gnu`. If the dev/CI has ever run `galaxy-tool-cache add wc_gnu`, this flips.
- The native clean test compares output to a checked-in fixture. Tool-aware cleaning (when cache hits) produces different output than no-resolver cleaning. Currently passes only because the tools in the fixture aren't cached on CI.

---

## Goal

Three hermetic test flavors:

| Flavor | Cache state | Purpose |
|---|---|---|
| **Empty-cache** | Controlled empty dir | Assert uncached-tool diagnostics, cache-miss fallbacks, no tool-aware cleaning |
| **Pre-populated** | Seeded with specific tool(s) via `ToolInfoService` | Assert completions, hover, precise validation, tool-aware clean output |
| **Skip-if-offline** | Populated at suite startup; skipped on network failure | Tests requiring real ToolShed fetch |

---

## New helpers: `client/tests/e2e/suite/cacheHelpers.ts`

```ts
// Per-test unique cache dir (hermetic, no cross-test contamination)
export async function makeTempCacheDir(): Promise<string> {
  const dir = path.join(os.tmpdir(), `gxwf-e2e-cache-${crypto.randomBytes(6).toString("hex")}`);
  await fs.promises.mkdir(dir, { recursive: true });
  return dir;
}

// Point the extension at a specific cache dir. Must be called *before* opening
// any workflow document — ToolRegistryService.configure() runs during server
// initialize(); mid-session setting changes may not re-invoke it (open question).
export async function useCacheDir(dir: string): Promise<void> {
  await updateSettings("toolCache.directory", dir);
  await sleep(500);
}

export async function useEmptyCache(): Promise<string> {
  const dir = await makeTempCacheDir();
  await useCacheDir(dir);
  return dir;
}

// Populate a cache by spawning a Node child process that uses
// @galaxy-tool-util/core. On network/resolution failure returns
// { ok: false, reason } so tests can skip.
//
// Child process rather than direct import: @galaxy-tool-util/core lives in
// server-common's node_modules, not client's. A small script under
// server-common/scripts/populateTestCache.ts is the cleanest bridge.
export async function populateCache(
  tools: Array<{ toolId: string; toolVersion?: string }>,
  opts?: { toolShedUrl?: string; timeoutMs?: number }
): Promise<{ ok: true; cacheDir: string } | { ok: false; reason: string }> {
  const cacheDir = await makeTempCacheDir();
  try {
    await runChildScript("populateTestCache.js", { cacheDir, tools, ...opts });
    return { ok: true, cacheDir };
  } catch (e) {
    return { ok: false, reason: String(e) };
  }
}

// Suite-level: populate once, share across tests; skip the suite on failure.
export async function populateCacheOrSkip(
  tools: Array<{ toolId: string; toolVersion?: string }>,
  ctx: Mocha.Context
): Promise<string> {
  const result = await populateCache(tools);
  if (!result.ok) {
    ctx.skip();
  }
  return (result as { ok: true; cacheDir: string }).cacheDir;
}
```

---

## Child script: `server/packages/server-common/scripts/populateTestCache.ts`

Small CLI-style Node script:

```ts
// Invoked as: node populateTestCache.js '{"cacheDir":"/tmp/x","tools":[{"toolId":"wc_gnu"}]}'
import { ToolInfoService } from "@galaxy-tool-util/core";

async function main() {
  const { cacheDir, tools, toolShedUrl } = JSON.parse(process.argv[2]);
  const svc = new ToolInfoService({ cacheDir, defaultToolshedUrl: toolShedUrl });
  for (const { toolId, toolVersion } of tools) {
    const info = await svc.getToolInfo(toolId, toolVersion ?? null);
    if (!info) throw new Error(`failed to resolve ${toolId}`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
```

Compiled alongside the servers. `runChildScript` wraps `child_process.spawn` with a default timeout (~30s) so offline CI doesn't hang — on timeout, return `not ok`, suite skips.

---

## `resetSettings()` additions

Extend existing helper to reset cache dir too, so each test starts from a known state:

```ts
export async function resetSettings(): Promise<void> {
  const cfg = vscode.workspace.getConfiguration("galaxyWorkflows");
  await cfg.update("validation.profile", undefined, true);
  await cfg.update("toolCache.directory", undefined, true);
  return sleep(500);
}
```

---

## Proposed modifications to existing tests

### 1. Make `test_ts_smoke` hermetic (format2 uncached test)

Current: passes only if dev machine doesn't have `wc_gnu` cached.

```ts
suite("Tool State Validation Tests", () => {
  test("uncached tool emits info diagnostic", async () => {
    await useEmptyCache();  // NEW: hermetic empty cache
    const docUri = getDocUri(path.join("yaml", "tool-state", "test_ts_smoke.gxwf.yml"));
    await activateAndOpenInEditor(docUri);
    await waitForDiagnostics(docUri);
    // ... same assertion as before
  });
});
```

### 2. Add a cached counterpart (new test next to the smoke test)

```ts
test("cached tool produces no uncached-diagnostic", async function () {
  const cacheDir = await populateCacheOrSkip([{ toolId: "wc_gnu" }], this);
  await useCacheDir(cacheDir);
  const docUri = getDocUri(path.join("yaml", "tool-state", "test_ts_smoke.gxwf.yml"));
  await activateAndOpenInEditor(docUri);
  await waitForDiagnostics(docUri);
  const diags = vscode.languages.getDiagnostics(docUri);
  const cacheMissDiag = diags.find((d) => d.message.includes("not in the local cache"));
  assert.ok(!cacheMissDiag, "Cached tool should not produce cache-miss diagnostic");
});
```

Minimal pair — one hermetically-guaranteed assertion for each cache state. Same fixture.

### 3. Make the native clean test hermetic

`wf_01_dirty.ga` → compares to `wf_01_clean.ga`. If tools in the fixture are cached, tool-aware cleaning may produce different output.

```ts
test("Clean workflow command removes non-essential properties (no tool cache)", async () => {
  await useEmptyCache();  // NEW: guarantee no-resolver path
  // ... rest unchanged
});
```

Optional paired test for the tool-aware path:

```ts
test("Clean workflow command uses tool-aware resolver when cached", async function () {
  const tools = extractToolsFromFixture("json/clean/wf_01_dirty.ga");
  const cacheDir = await populateCacheOrSkip(tools, this);
  await useCacheDir(cacheDir);
  // Compare against wf_01_clean_tool_aware.ga (different fixture).
});
```

Paired fixture `wf_01_clean_tool_aware.ga` generated once and checked in.

---

## Test organization

Top-level `suite("Empty cache")` and `suite("Populated cache", function() { before(() => populateCacheOrSkip(...)); })` so setup runs once per group rather than per test. Mocha's `before`/`beforeEach` fit naturally.

---

## Unresolved questions

1. Does changing `toolCache.directory` mid-session re-invoke `ToolRegistryService.configure()`? If only at `initialize()`, the setting must be set before extension activation — awkward for per-test dirs. Verify by reading `configService.ts` + how `onDidChangeConfiguration` wires to the registry.
2. Child-script build target — does `tsup` already emit the server-common scripts dir, or separate compile step needed?

User Input: Launch a subagent to research this.

3. Should `populateCache` cache *across* test runs (stable dir like `/tmp/gxwf-e2e-cache-shared/`)? Tradeoff: faster local dev vs. less hermetic. Recommend per-test-run cache + opt-in env var `GXWF_E2E_CACHE_REUSE=1` for local iteration.

User Input: Let's error on the side of stability and reuse a shared cache here - probably the same cache for all non-empty cache tools unless we have particular caching functionality we're directly testing.

4. Which tools to standardize on? `wc_gnu` already used in a fixture — small, stable. Pick 1-2 more exercising conditionals/selects for T5 (completions).

User Input: This workflow might be artificial - try to get working but maybe we also go with a complex IWC workflow for E2E tests. Launch a subagent to find a real IWC workflow to test against from /Users/jxc755/projects/repositories/iwc.

5. `populateCache` timeout — 30s reasonable? CI with slow network may need longer. Make configurable.

User Input: Lets start here - this fine.


---

## Relationship to env-var parity

Orthogonal improvement (not required for this plan): the extension passes explicit `cacheDir` to `ToolInfoService`, bypassing the CLI's `GALAXY_TOOL_CACHE_DIR` env var. If `settings.cacheDir` equals the hardcoded default `~/.galaxy/tool_info_cache`, pass `undefined` to `ToolInfoService` instead so the CLI's env-var resolution kicks in. Same for `toolShedUrl` → `GALAXY_TOOLSHED_URL`. ~5-line change in `toolRegistry.ts`. Worth a separate small PR.
