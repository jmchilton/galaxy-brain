# VS Code E2E Tests — Tool Cache Infrastructure Plan (V2)

**Date:** 2026-04-12
**Branch:** `wf_tool_state`
**Supersedes:** `VS_CODE_E2E_TEST_CACHE_PLAN.md`
**Related:** `VS_CODE_E2E_GAPS.md`, `VS_CODE_ARCHITECTURE.md`

---

## Changes from V1

- **Q1 resolved**: `onDidChangeConfiguration` → `server.onConfigurationChanged()` → `toolRegistryService.configure()` creates a fresh `ToolInfoService`. Mid-session cache-dir swap works; no reload needed. (`server-common/src/server.ts:160-166`, `toolRegistry.ts:33-40`, `configService.ts:113-120`)
- **Q2 resolved**: server-common has no build output. Child script lives in **`server/gx-workflow-ls-native/scripts/populateTestCache.ts`**, bundled via new tsup entry (reuses `noExternal: [/.*/]` — embeds `@galaxy-tool-util/core`).
- **Q3 resolved (user)**: Shared cache across tests and across runs. One populated cache for all non-empty-cache tests, unless a test is specifically exercising cache behavior.
- **Q4 resolved (user + research)**: Use a real IWC workflow — `short-read-quality-control-and-trimming.ga` (fastp + MultiQC, 7 steps). Keep `test_ts_smoke` (`wc_gnu`) as the tiny synthetic for the cache-miss test.
- **Q5 resolved (user)**: 30s populate timeout is fine.

---

## Background

Default `galaxyWorkflows.toolCache.directory` = `~/.galaxy/tool_info_cache` (same as `galaxy-tool-util` CLI). Every E2E test implicitly reads whatever cache exists on the host.

Latent fragilities today:

- `test_ts_smoke` asserts "not in the local cache" for `wc_gnu` — flips if someone ever ran `galaxy-tool-cache add wc_gnu`.
- Native clean test compares to a checked-in fixture; tool-aware cleaning (on cache hit) produces different output. Currently green only because fixture tools aren't cached on CI.

---

## Goal

Three hermetic test flavors:

| Flavor | Cache state | Purpose |
|---|---|---|
| **Empty-cache** | Controlled empty dir | Uncached-tool diagnostics, cache-miss fallbacks, no-resolver cleaning |
| **Pre-populated (shared)** | Seeded once per `npm test` run with the standard tool set | Completions, hover, precise validation, tool-aware clean output |
| **Skip-if-offline** | Subset of pre-populated that needs a ToolShed fetch | Suite skips cleanly on network failure |

Shared-cache strategy (per user direction): one populated cache directory shared across all non-empty-cache tests and reused across runs when possible.

---

## Shared cache directory

Location: `client/tests/e2e/.cache/tool_info_cache/` (gitignored).

- Resolved once per `npm test` run in a top-level `before` hook.
- If the directory already exists and contains entries for all required tools → reuse as-is (fast local iteration).
- If empty or missing tools → invoke `populateTestCache` to fill in what's missing.
- On populate failure (offline, ToolShed down): if cache is partially populated, skip only the tests whose required tools are missing; if completely empty, skip the whole populated-cache suite.
- Env var `GXWF_E2E_CACHE_CLEAN=1` wipes the dir before the run (for debugging stale-cache issues).

Rationale for reuse over per-test-run hermeticity: populating from ToolShed is slow and network-dependent; cache entries are content-addressed by `tool_id` + `tool_version`, so stale-cache bugs are vanishingly unlikely in practice. User preference is stability.

---

## New helpers: `client/tests/e2e/suite/cacheHelpers.ts`

```ts
import * as path from "path";
import * as fs from "fs";
import { spawn } from "child_process";
import * as os from "os";
import * as crypto from "crypto";
import { updateSettings, sleep } from "./helpers";

const SHARED_CACHE_DIR = path.resolve(__dirname, "../../.cache/tool_info_cache");

// Standard tool set populated once per run for the "populated cache" suite.
// Extend as new populated-cache tests are added.
export const STANDARD_TOOL_SET: Array<{ toolId: string; toolVersion?: string }> = [
  { toolId: "wc_gnu" },
  // fastp + MultiQC for the IWC workflow fixture
  { toolId: "toolshed.g2.bx.psu.edu/repos/iuc/fastp/fastp" },
  { toolId: "toolshed.g2.bx.psu.edu/repos/iuc/multiqc/multiqc" },
];

export async function makeTempCacheDir(): Promise<string> {
  const dir = path.join(os.tmpdir(), `gxwf-e2e-cache-${crypto.randomBytes(6).toString("hex")}`);
  await fs.promises.mkdir(dir, { recursive: true });
  return dir;
}

// Point the extension at a specific cache dir.
// ToolRegistryService.configure() re-runs on didChangeConfiguration — verified.
export async function useCacheDir(dir: string): Promise<void> {
  await updateSettings("toolCache.directory", dir);
  await sleep(500); // let the server finish reconfigure + revalidate
}

export async function useEmptyCache(): Promise<string> {
  const dir = await makeTempCacheDir();
  await useCacheDir(dir);
  return dir;
}

// Suite-level: returns the shared cache dir, populating it if needed.
// Called from a top-level `before()` hook. On failure returns
// { ok: false } and the caller skips the suite.
export async function ensureSharedCache(
  tools: Array<{ toolId: string; toolVersion?: string }> = STANDARD_TOOL_SET
): Promise<{ ok: true; cacheDir: string } | { ok: false; reason: string }> {
  if (process.env.GXWF_E2E_CACHE_CLEAN === "1") {
    await fs.promises.rm(SHARED_CACHE_DIR, { recursive: true, force: true });
  }
  await fs.promises.mkdir(SHARED_CACHE_DIR, { recursive: true });

  const missing = tools.filter((t) => !isToolInCache(SHARED_CACHE_DIR, t));
  if (missing.length === 0) return { ok: true, cacheDir: SHARED_CACHE_DIR };

  try {
    await runPopulateScript({ cacheDir: SHARED_CACHE_DIR, tools: missing, timeoutMs: 30_000 });
    return { ok: true, cacheDir: SHARED_CACHE_DIR };
  } catch (e) {
    return { ok: false, reason: String(e) };
  }
}

// Best-effort check: does the cache dir contain an entry matching toolId?
// Structure is defined by @galaxy-tool-util/core; the exact layout should
// be confirmed during implementation (likely tool_id-based filename).
function isToolInCache(dir: string, tool: { toolId: string }): boolean { /* ... */ }

function runPopulateScript(args: { cacheDir: string; tools: unknown; timeoutMs: number }): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = path.resolve(__dirname, "../../../../server/gx-workflow-ls-native/dist/populateTestCache.js");
    const child = spawn(process.execPath, [script, JSON.stringify(args)], { stdio: "inherit" });
    const timer = setTimeout(() => { child.kill(); reject(new Error("populate timeout")); }, args.timeoutMs);
    child.on("exit", (code) => { clearTimeout(timer); code === 0 ? resolve() : reject(new Error(`exit ${code}`)); });
  });
}
```

---

## Child script: `server/gx-workflow-ls-native/scripts/populateTestCache.ts`

Lives in the native server package — it already has tsup + `noExternal: [/.*/]` bundling, and `@galaxy-tool-util/core` is transitively available via `@gxwf/server-common`.

```ts
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

### tsup config change — `server/gx-workflow-ls-native/tsup.config.ts`

Add a second entry alongside the existing server bundle:

```ts
// new entry
{
  ...baseEsbuildOptions,
  entry: { populateTestCache: "scripts/populateTestCache.ts" },
  platform: "node",
  format: ["cjs"],
  noExternal: [/.*/],
  outDir: "dist",
}
```

Build invocation: existing `npm run compile` at the server level picks it up. Output: `server/gx-workflow-ls-native/dist/populateTestCache.js`.

---

## `resetSettings()` additions

```ts
export async function resetSettings(): Promise<void> {
  const cfg = vscode.workspace.getConfiguration("galaxyWorkflows");
  await cfg.update("validation.profile", undefined, true);
  await cfg.update("toolCache.directory", undefined, true);
  return sleep(500);
}
```

---

## New / modified tests

### 1. `test_ts_smoke` — hermetic empty cache

```ts
suite("Tool State Validation (empty cache)", () => {
  test("uncached tool emits info diagnostic", async () => {
    await useEmptyCache();
    const docUri = getDocUri(path.join("yaml", "tool-state", "test_ts_smoke.gxwf.yml"));
    await activateAndOpenInEditor(docUri);
    await waitForDiagnostics(docUri);
    // ... existing assertion
  });
});
```

### 2. Cached counterpart — shared populated cache

```ts
suite("Tool State Validation (populated cache)", function () {
  let cacheDir: string;
  before(async function () {
    const result = await ensureSharedCache([{ toolId: "wc_gnu" }]);
    if (!result.ok) this.skip();
    cacheDir = result.cacheDir;
  });
  beforeEach(() => useCacheDir(cacheDir));

  test("cached tool produces no uncached-diagnostic", async () => {
    const docUri = getDocUri(path.join("yaml", "tool-state", "test_ts_smoke.gxwf.yml"));
    await activateAndOpenInEditor(docUri);
    await waitForDiagnostics(docUri);
    const diags = vscode.languages.getDiagnostics(docUri);
    assert.ok(!diags.find((d) => d.message.includes("not in the local cache")));
  });
});
```

### 3. Native clean — hermetic no-resolver path

```ts
test("Clean workflow command removes non-essential properties (no tool cache)", async () => {
  await useEmptyCache();
  // ... rest unchanged
});
```

### 4. IWC workflow fixture — tool-aware clean + completions

Fixture: copy `workflows/read-preprocessing/short-read-qc-trimming/short-read-quality-control-and-trimming.ga` from `/Users/jxc755/projects/repositories/iwc` into `client/tests/e2e/fixtures/json/clean/` as `iwc_fastp_multiqc_dirty.ga`. Generate paired `iwc_fastp_multiqc_clean_tool_aware.ga` once (checked in) via the extension against the populated cache.

Why this workflow (from IWC research):
- 7 steps — manageable fixture
- fastp + MultiQC — stable, popular tools
- Real parameter diversity (adapter seqs, quality thresholds, min length) exercises completions
- Has the cruft (uuids, positions, labels) that makes clean tests meaningful

```ts
suite("IWC clean (populated cache)", function () {
  let cacheDir: string;
  before(async function () {
    const result = await ensureSharedCache(); // STANDARD_TOOL_SET includes fastp, multiqc
    if (!result.ok) this.skip();
    cacheDir = result.cacheDir;
  });
  beforeEach(() => useCacheDir(cacheDir));

  test("tool-aware clean on IWC fastp/multiqc workflow", async () => {
    const dirtyUri = getDocUri("json/clean/iwc_fastp_multiqc_dirty.ga");
    const expected = readFixture("json/clean/iwc_fastp_multiqc_clean_tool_aware.ga");
    // ... invoke clean command, compare
  });

  // Follow-up tests (T5 completions, hover) reuse the same cache + fixture.
});
```

### 5. Synthetic completions test (if needed)

If the IWC workflow doesn't exercise a conditional/select shape we care about, add a second tiny fixture using `wc_gnu` or similar. Defer until T5 planning reveals a gap.

---

## Test organization

```
suite("Empty cache", () => { beforeEach(useEmptyCache); ... });
suite("Populated cache", function () {
  let cacheDir;
  before(async function() {
    const r = await ensureSharedCache();
    if (!r.ok) this.skip();
    cacheDir = r.cacheDir;
  });
  beforeEach(() => useCacheDir(cacheDir));
  ...
});
```

Top-level `afterEach(resetSettings)` already exists; extend to include `toolCache.directory` as shown above.

---

## Implementation order

1. Add tsup entry + `populateTestCache.ts`; verify `dist/populateTestCache.js` runs standalone with a hand-crafted JSON arg and populates a temp dir.
2. Add `cacheHelpers.ts` + extend `resetSettings`.
3. Wire `useEmptyCache()` into `test_ts_smoke` and native clean — confirms empty-cache hermeticity (red/green around manually pre-populated host cache).
4. Copy IWC workflow into fixtures; generate paired cleaned fixture; add populated-cache suite for it.
5. Add cached-counterpart test for `test_ts_smoke`.
6. Document `GXWF_E2E_CACHE_CLEAN=1` in the E2E README.

---

## Relationship to env-var parity

Unchanged from V1. Orthogonal: if `settings.cacheDir` equals the hardcoded default `~/.galaxy/tool_info_cache`, pass `undefined` to `ToolInfoService` so CLI's `GALAXY_TOOL_CACHE_DIR` / `GALAXY_TOOLSHED_URL` resolution kicks in. Separate small PR.

---

## Unresolved questions (V2)

1. Exact on-disk layout of `@galaxy-tool-util/core`'s tool info cache — needed for `isToolInCache()`. Confirm during impl; if filename isn't stable/predictable, fall back to always invoking populate (it's a no-op for already-cached tools).
2. Does `@galaxy-tool-util/core`'s `ToolInfoService.getToolInfo()` treat a cache hit as idempotent (no network)? Assumed yes; verify so reuse is actually fast.
3. IWC workflow licensing — checked-in copy needs attribution in a fixture README. Confirm IWC license permits redistribution inside this repo (likely MIT/Apache, but verify).
4. Should the paired `_clean_tool_aware.ga` fixture be regenerated via a `npm run` script, or hand-maintained? Auto-regen risks papering over regressions; hand-maintained risks drift. Recommend hand-maintained with a regen script documented for intentional updates.
