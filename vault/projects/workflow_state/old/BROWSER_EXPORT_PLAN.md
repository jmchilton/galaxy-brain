# `@galaxy-tool-util/core` Browser Export Plan

**Date:** 2026-04-12
**Target repo:** `galaxy-tool-util-ts` (worktree: `/Users/jxc755/projects/worktrees/galaxy-tool-util/branch/gxwf-web`)
**Target package:** `packages/core`
**Motivation:** Drop the four-file Node-builtin shim pile and esbuild resolve plugin currently in `galaxy-workflows-vscode/server/{browser-shims,gx-workflow-ls-*/tsup.config.ts}`. Root cause is upstream: `@galaxy-tool-util/core` re-exports Node-only code at its top-level entry, so every downstream bundler that targets the browser has to paper over it.

---

## The actual problem

`packages/core/src/index.ts` re-exports **everything** from one module:

| Symbol | Defined in | Pulls in at top level |
|---|---|---|
| `FilesystemCacheStorage` | `cache/storage/filesystem.ts` | `node:fs`, `node:fs/promises`, `node:path` |
| `ToolCache`, `getCacheDir`, `DEFAULT_CACHE_DIR` | `cache/tool-cache.ts` | `node:path`, `node:os` (top-level `join(homedir(), ...)` expression — runs at module evaluation) |
| `loadWorkflowToolConfig` | `config.ts` | `node:fs/promises` |
| `IndexedDBCacheStorage` | `cache/storage/indexeddb.ts` | (browser-safe) |
| `ParsedTool`, `cacheKey`, `fetchFromToolShed`, `ToolInfoService`, schemas | various | (browser-safe — `cacheKey` already uses Web Crypto) |

Because `cache/index.ts` re-exports `FilesystemCacheStorage` and `tool-cache.ts` statically imports it (to use as default), a browser consumer importing `IndexedDBCacheStorage` from the package root still evaluates the filesystem module and the `homedir()` call. esbuild with `platform: "browser"` then either errors or externalizes `node:*`, which fails at runtime.

## Design decisions (locked)

| Question | Decision |
|---|---|
| Entry shape | Subpath exports: `@galaxy-tool-util/core/browser` and `@galaxy-tool-util/core/node`. Root `"."` stays as a **universal** entry containing only symbols that are safe in both envs. |
| Default behavior of `"."` | Universal — no FS, no Node builtins. Callers that want `FilesystemCacheStorage` / `loadWorkflowToolConfig` / `getCacheDir` import from `/node`. |
| `"browser"` condition | Yes — in `exports["."]`, add `"browser"` pointing at `./dist/index.browser.js` **as an alias of the universal entry**. Keeps the path cheap; main benefit is guarding against accidental future creep of Node code into the universal entry. |
| `sideEffects` | Set `"sideEffects": false` on core's `package.json` (verify — `CacheIndex`, schemas are pure). Enables tree-shaking for bundlers that still import everything. |
| Breaking change? | Yes, narrow. `FilesystemCacheStorage`, `getCacheDir`, `DEFAULT_CACHE_DIR`, `CACHE_DIR_ENV_VAR`, `loadWorkflowToolConfig` move to `/node`. All current consumers (`cli`, `gxwf-web`, `tool-cache-proxy`) update one import line each. Ship as a minor bump with a changeset — pre-1.0 so breaking subpath is acceptable. |
| `ToolCache` default storage | Remove the implicit `new FilesystemCacheStorage(...)` fallback from the `ToolCache` constructor. `storage` becomes a required option. This severs the static edge that pulls filesystem into the browser entry. Node callers get a `makeNodeToolCache(opts)` helper in `/node` that constructs the default. |

---

## Target file layout

```
packages/core/src/
  index.ts                    ← universal entry (renamed from current)
  node.ts                     ← NEW: Node-only entry
  cache/
    index.ts                  ← universal re-exports (no FilesystemCacheStorage)
    node.ts                   ← NEW: FilesystemCacheStorage, getCacheDir, DEFAULT_CACHE_DIR, makeNodeToolCache
    tool-cache.ts             ← storage now REQUIRED in constructor; no FilesystemCacheStorage import here
    tool-cache-defaults.ts    ← NEW: DEFAULT_TOOLSHED_URL, TOOLSHED_URL_ENV_VAR (no node: imports)
    cache-index.ts            ← unchanged (pure)
    cache-key.ts              ← unchanged (Web Crypto)
    tool-id.ts                ← unchanged (pure)
    storage/
      interface.ts            ← unchanged
      filesystem.ts           ← unchanged, imported ONLY from cache/node.ts
      indexeddb.ts            ← unchanged
  config.ts                   ← universal: schemas + toolInfoOptionsFromConfig only
  config-node.ts              ← NEW: loadWorkflowToolConfig (uses node:fs/promises)
  models/…                    ← unchanged (pure)
  client/…                    ← unchanged (uses global fetch, browser-safe)
  tool-info.ts                ← unchanged (pure)
```

### `package.json` exports

```jsonc
{
  "type": "module",
  "sideEffects": false,
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "browser": "./dist/index.js",
      "import": "./dist/index.js"
    },
    "./node": {
      "types": "./dist/node.d.ts",
      "import": "./dist/node.js"
    },
    "./package.json": "./package.json"
  },
  "files": ["dist", "README.md", "LICENSE"]
}
```

Node subpath has no `"browser"` key — bundlers targeting the browser will fail fast if someone accidentally imports `/node`, which is the desired signal.

---

## Phases

### Phase 1 — Carve universal vs Node surfaces (no behavior change)

1.1 Create `packages/core/src/cache/tool-cache-defaults.ts` with `DEFAULT_TOOLSHED_URL` and `TOOLSHED_URL_ENV_VAR`. Re-export from `tool-cache.ts` and `cache/index.ts` transitionally.
1.2 Remove `import { FilesystemCacheStorage }` from `tool-cache.ts`. Change `ToolCache`'s constructor: `storage` becomes required. Delete the `cacheDir`/`getCacheDir` fallback branch. Bump a TODO marker.
1.3 Remove `DEFAULT_CACHE_DIR = join(homedir(), ...)` from `tool-cache.ts`; move to `cache/node.ts` as a lazy getter (`function defaultCacheDir() { return join(homedir(), ".galaxy", "tool_info_cache"); }`) plus the constant form (fine if only evaluated in Node entry).
1.4 Create `packages/core/src/cache/node.ts` exporting: `FilesystemCacheStorage`, `getCacheDir`, `DEFAULT_CACHE_DIR`, `CACHE_DIR_ENV_VAR`, `makeNodeToolCache(opts?)`.
1.5 Move `loadWorkflowToolConfig` into a new `src/config-node.ts`. Universal `config.ts` keeps `WorkflowToolConfig`, `ToolSourceConfig`, `ToolCacheConfig`, `toolInfoOptionsFromConfig`.
1.6 Create `packages/core/src/node.ts` that re-exports the Node-only surface (cache/node + config-node).
1.7 Rewrite `packages/core/src/index.ts` to export only the universal surface. Explicitly **omit**: `FilesystemCacheStorage`, `getCacheDir`, `DEFAULT_CACHE_DIR`, `CACHE_DIR_ENV_VAR`, `loadWorkflowToolConfig`.
1.8 Update `package.json` with the `exports` map above and `"sideEffects": false`.
1.9 Update `tsconfig.json`: `include` still `["src"]`; keep `"types": ["node"]` (Node subpath needs it; universal entry happens to reference no node types). Consider splitting to `tsconfig.base.json` + `tsconfig.node.json` / `tsconfig.browser.json` later — **not** this phase.

**Exit:** `pnpm -F @galaxy-tool-util/core build` produces `dist/index.js`, `dist/node.js`, matching `.d.ts`. `pnpm -F @galaxy-tool-util/core test` green.

### Phase 2 — Update in-repo consumers

2.1 `packages/cli/**` — imports `FilesystemCacheStorage`, `ToolCache` with default FS, and uses `makeNodeToolCache`. Change to `import { ... } from "@galaxy-tool-util/core/node"`. Keep type-only imports (`import type { ParsedTool, ToolCache }`) on root.
2.2 `packages/gxwf-web/**` — same treatment for server-side code (`bin/gxwf-web.ts`, `app.ts`). `loadWorkflowToolConfig` moves to `/node` import.
2.3 `packages/tool-cache-proxy/**` — same.
2.4 `packages/core/test/**` — imports FS storage from `/node` or direct source path. Keep tests co-located with the code they test.
2.5 Run `pnpm -r build && pnpm -r test && pnpm lint` to confirm.

### Phase 3 — Browser-safety verification

This is where best-practice tooling earns its keep.

3.1 **`publint`** (lints `package.json` — catches missing types, wrong conditions ordering, `main` vs `exports` drift).
   ```
   pnpm add -D -w publint
   pnpm -F @galaxy-tool-util/core exec publint
   ```
   Add to CI and to `packages/core/package.json` as a `lint:pkg` script.

3.2 **`@arethetypeswrong/cli`** (verifies types resolve correctly under every module/condition combination — `node10`, `node16`, `bundler`, `browser`).
   ```
   pnpm add -D -w @arethetypeswrong/cli
   pnpm -F @galaxy-tool-util/core exec attw --pack .
   ```
   Fails the build if `/node` subpath types don't resolve or if `"browser"` condition is broken. Add to CI as `check:types`.

3.3 **Browser-import smoke test (custom).** Add `packages/core/scripts/verify-browser-entry.mjs`:
   ```js
   // Bundle dist/index.js with esbuild platform:"browser" and assert no node: imports survive.
   import { build } from "esbuild";
   const result = await build({
     entryPoints: ["dist/index.js"],
     bundle: true, format: "esm", platform: "browser",
     write: false, metafile: true, logLevel: "silent",
   });
   const nodeRefs = Object.keys(result.metafile.inputs)
     .filter((k) => /^node:|(^|\/)node_modules\/(fs|path|os|crypto|url)(\/|$)/.test(k));
   if (nodeRefs.length) { console.error("Node builtins leaked:", nodeRefs); process.exit(1); }
   ```
   Wire as `pnpm -F @galaxy-tool-util/core check:browser`. Runs in < 1 s. This is the single most valuable test — it will catch any future regression the moment a top-level `node:*` import sneaks back in.

3.4 **Vitest browser mode (optional, higher ROI later).** Vitest 4.1 supports `test.browser` with Playwright. Add `packages/core/vitest.browser.config.ts`:
   ```ts
   import { defineProject } from "vitest/config";
   export default defineProject({
     test: {
       include: ["test/**/*.browser.test.ts"],
       browser: { enabled: true, provider: "playwright", instances: [{ browser: "chromium" }] },
     },
   });
   ```
   Move/fork `cache.test.ts` into a `cache.browser.test.ts` that exercises `IndexedDBCacheStorage` against real IndexedDB (via `fake-indexeddb` **not** needed — real browser). Script: `test:browser`. Not required for the first cut; schedule as a follow-up if IndexedDB bugs appear in the gxwf-ui Monaco integration.

3.5 **ESLint guard — ban `node:*` in universal sources.** Add to `eslint.config.js`:
   ```js
   {
     files: ["packages/core/src/**/*.ts"],
     ignores: [
       "packages/core/src/node.ts",
       "packages/core/src/config-node.ts",
       "packages/core/src/cache/node.ts",
       "packages/core/src/cache/storage/filesystem.ts",
     ],
     rules: {
       "no-restricted-imports": ["error", {
         patterns: [{ group: ["node:*", "fs", "fs/promises", "os", "path", "child_process"],
                      message: "Universal core entry must stay browser-safe. Put Node code under src/**/node.ts or src/cache/node.ts." }],
       }],
     },
   },
   ```
   Cheap, static, and catches mistakes at the source file rather than at bundle time.

3.6 **`knip` (optional).** Once the dust settles, run `knip` to detect unused exports from the new split — easy to miss a dead re-export after refactoring. Don't block on it.

### Phase 4 — Downstream: remove shims in `galaxy-workflows-vscode`

4.1 Bump `server/packages/server-common`'s dep on `@galaxy-tool-util/core` (currently a local `file:` tarball) to the new version.
4.2 Change browser-side imports in `server-common/src/providers/toolRegistry.ts` (and wherever else appropriate) from `@galaxy-tool-util/core` → `@galaxy-tool-util/core` (universal) plus any Node-only usages explicitly from `@galaxy-tool-util/core/node`. In practice the server-common browser code only uses `IndexedDBCacheStorage`, `ToolCache` (with injected storage), `ToolInfoService`, `cacheKey`, types — all universal.
4.3 Node-side entries that **do** want `FilesystemCacheStorage` (only if any remain) import from `/node`. Today the VS Code extension's Node server also uses `FilesystemCacheStorage` as a default — flip to `/node` import there.
4.4 Delete `server/browser-shims/`.
4.5 In both `server/gx-workflow-ls-*/tsup.config.ts`:
   - Remove `NODE_BUILTIN_SHIMS`, `nodeBuiltinShimPlugin`, `browserEsbuildOptions` alias entries for `os`/`fs`/`path`/`fs/promises`/`node:*`.
   - Keep `process: process/browser` and `buffer: buffer/` aliases — those serve `yaml`'s CJS globals, unrelated to this work.
   - Remove the `removeNodeProtocol: false` override.
4.6 Rebuild both servers and re-run the `grep -oE 'require\("(os|fs|path|crypto|fs/promises|node:[a-z/]+)"\)' dist/web/*.js` audit. Expect empty.
4.7 Update `VS_CODE_MONACO_FIRST_PASS_PLAN.md` phase 0.5.1 note to reflect the upstream fix and drop the shim-pile paragraph.

### Phase 5 — Release + docs

5.1 Changeset: `@galaxy-tool-util/core` minor bump. Changelog entry lists moved symbols.
5.2 `packages/core/README.md` — short "Usage" section distinguishing browser vs Node imports, with a one-line example for each.
5.3 `docs/` — update any architecture notes that assume a single entry.
5.4 Publish to npm. Downstream (`galaxy-workflows-vscode`) picks up via a real version pin instead of the `file:` tarball dance.

---

## Best practices checklist (what every browser-safe library should ship with)

| Practice | Tool | In plan? |
|---|---|---|
| Subpath exports separating Node vs browser | `package.json` `exports` map | ✅ Phase 1 |
| `"browser"` condition | `package.json` `exports` | ✅ Phase 1 |
| `"sideEffects": false` for tree-shaking | `package.json` | ✅ Phase 1 |
| Validate exports map | `publint` | ✅ Phase 3.1 |
| Validate types resolve under all conditions | `@arethetypeswrong/cli` | ✅ Phase 3.2 |
| Runtime check: bundle browser entry, detect leaks | esbuild metafile script | ✅ Phase 3.3 |
| Unit tests against real browser APIs | Vitest browser mode + Playwright | Planned (3.4, optional) |
| Lint-level guard against `node:*` in universal sources | ESLint `no-restricted-imports` | ✅ Phase 3.5 |
| Detect dead exports post-refactor | `knip` | Planned (3.6, optional) |
| Avoid top-level side-effects that touch Node | manual review + ESLint; made enforceable by the ban on `node:*` imports | ✅ |
| `@types/node` as devDep only | already the case | — |

### Testing subsets specific to the browser entry

- `pnpm -F @galaxy-tool-util/core check:browser` — the esbuild-metafile smoke test, ~1 s.
- `pnpm -F @galaxy-tool-util/core exec attw --pack .` — types resolution matrix, ~3 s.
- `pnpm -F @galaxy-tool-util/core test:browser` (once 3.4 lands) — real IndexedDB behavior, ~10 s.
- Existing `pnpm -F @galaxy-tool-util/core test` still runs under Node and covers the universal + Node surfaces.

All three belong in CI; the first two are cheap enough to run on every commit.

---

## Rollout order

1. Land Phases 1–3 in `galaxy-tool-util-ts` on a branch. Open PR.
2. Once merged and published (or via a changeset-tagged prerelease), update `galaxy-workflows-vscode` to consume the new version and execute Phase 4.
3. Delete `server/browser-shims/` and the resolve plugin in a single commit titled `revert: browser shims — upstream fix landed in @galaxy-tool-util/core@x.y.z`. Link the upstream PR in the commit body.

---

## Unresolved questions

- Should `"."` include a `"browser"` condition at all, given the universal entry is already browser-safe? Pro: defense in depth. Con: one more thing to keep correct. **Lean yes.**
- Version bump semantics — since pre-1.0, is this 0.3.0 or 0.2.1? Argue 0.3.0 (breaking moves).
- Do any current consumers construct `ToolCache` with no `storage` argument (relying on the FS default)? If yes, the `storage`-required change breaks them. Sweep: `grep -rn "new ToolCache(" packages/ | grep -v storage` before shipping.
- Bundle size of the universal entry — track before/after with `esbuild --analyze`. Expect a meaningful drop now that `FilesystemCacheStorage` + `loadWorkflowToolConfig` aren't pulled into browser bundles.
- Keep `cache/index.ts` as a universal re-export, or collapse into `src/index.ts` entirely? Minor stylistic choice.
