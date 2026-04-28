# VS Code → gxwf-ui Monaco Integration Plan

**Date:** 2026-04-12
**Predecessor:** `VS_CODE_WEB_INTEGRATION_PLAN.md` (inverted direction — that plan pushed the web app into VS Code; this one pulls the IDE into the web app).
**Goal:** Embed the Galaxy Workflows VS Code extension's editing experience inside a tab of the gxwf-ui Vue app using `@codingame/monaco-vscode-api`. Users get Monaco + hover + completion + diagnostics for a single workflow file, backed by the same LSP servers that power desktop VS Code.

---

## Design Decisions (Locked)

| Question | Decision |
|---|---|
| Editor library | `@codingame/monaco-vscode-api` (mode 1 — embed, not workbench) |
| Extension host worker | **Yes** — enabled |
| Scope | Single-file editor, one tab |
| Language selection | By file extension (`.ga` → native, `.gxwf.yml`/`.gxwf.yaml` → format2) |
| Operations panel | Keep standalone (gxwf-client driven). LSP diagnostics are a bonus, not a replacement. |
| LS package delivery | Option D: load galaxy-workflows-vscode as a `.vsix` into the extension host worker |
| Dev delivery indirection | `VITE_GXWF_EXT_SOURCE` env var — one of `folder:` / `vsix:` / `openvsx:` |
| CSS audit | Required phase, not optional |
| Keybinding tests | Required phase, not optional |

---

## Upstream Projects

| Project | Path | Role |
|---|---|---|
| galaxy-tool-util (this repo) | `/Users/jxc755/projects/worktrees/galaxy-tool-util/branch/vs_code_integration` | gxwf-ui host, `IndexedDBCacheStorage`, gxwf-client |
| galaxy-workflows-vscode | `/Users/jxc755/projects/worktrees/galaxy-workflows-vscode/branch/wf_tool_state` | VS Code extension producing the `.vsix` we embed |
| Open VSX listing | `davelopez/galaxy-workflows` | Stable prod source after feature branch merges |

---

## Architecture

```
┌─────────────────── gxwf-ui (Vue 3 SPA) ────────────────────┐
│                                                            │
│   Router tab:  /files/:path  →  FileView.vue               │
│                                                            │
│   ┌─────────────────────────┐  ┌───────────────────────┐   │
│   │  EditorTab (new)        │  │ OperationPanel        │   │
│   │  ┌────────────────────┐ │  │ (unchanged, uses      │   │
│   │  │ Monaco editor DOM  │ │  │  gxwf-client)         │   │
│   │  │ (monaco-vscode-api)│ │  │                       │   │
│   │  └────────────────────┘ │  │ Validate / Lint /     │   │
│   │                         │  │ Clean / Convert       │   │
│   └───────────┬─────────────┘  └───────────────────────┘   │
│               │                                            │
│               │ LSP messages (in-process postMessage)      │
│               ▼                                            │
│   ┌───────────────────────────────────────────────────┐    │
│   │ Extension Host Worker (monaco-vscode-api)         │    │
│   │   • loads galaxy-workflows-vscode .vsix           │    │
│   │   • client/src/browser/extension.ts activates     │    │
│   │   • spawns two LSP web workers                    │    │
│   │                                                   │    │
│   │   ┌──────────────┐   ┌──────────────────────┐     │    │
│   │   │ ls-native WW │   │ ls-format2 WW        │     │    │
│   │   │  (hover,     │   │  (hover, complete,   │     │    │
│   │   │   complete,  │   │   validate)          │     │    │
│   │   │   validate)  │   │                      │     │    │
│   │   └──────┬───────┘   └──────────┬───────────┘     │    │
│   │          │                      │                 │    │
│   │          └──────┬───────────────┘                 │    │
│   │                 ▼                                 │    │
│   │   ToolRegistryService                             │    │
│   │     → ToolInfoService                             │    │
│   │        → IndexedDBCacheStorage (this repo)        │    │
│   │        → fetcher: ToolShed (direct) or proxy      │    │
│   └───────────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────────────┘
```

LSP traffic stays inside the browser. No server round-trips for editor features. `OperationPanel` continues to call gxwf-web over HTTP (unchanged).

---

## Phase 0: De-Risk Spike (Half-Day)

Phase 0 is expected to *surface* upstream blockers in galaxy-workflows-vscode (Node-builtin imports, inversify browser binding gaps). Those fixes land in Phase 0.5 before Phase 1 begins. Do not install Phase 1 deps until the spike plus upstream cleanup are green.


Before committing to the rest of the plan, prove the load path. Nothing here is plan-shaped code — it's a throwaway verification.

**0.1** — ✅ **Done (2026-04-12).** Built the extension's browser bundles on the `web_fixes` branch of galaxy-workflows-vscode. Both `dist/web/nativeServer.js` (2.85 MB) and `dist/web/gxFormat2Server.js` (2.66 MB) compile cleanly, and after the 0.5.1–0.5.4 changes below the browser bundles contain **zero** `require("os"|"fs"|"path"|"crypto"|"fs/promises"|"node:*")` calls. Verified with `grep -oE 'require\("(os|fs|path|crypto|fs/promises|node:[a-z/]+)"\)'`.

**Update (2026-04-13):** After `galaxy-tool-util-ts#52` merged (core split into browser-safe root + `/node` subpath with a `browser` export condition), the shim scaffolding introduced in the first pass was entirely unwound — see 0.5.1 update below. Browser bundles are now clean by virtue of the upstream export map, not local plugins.

**0.2** — ✅ **Done (2026-04-13).** Scratch app at `~/projects/repositories/monaco-spike` (Vite 8 + Vue 3 + TS). All `@codingame/monaco-vscode-*` packages installed at `30.0.1` with `--save-exact`. Deps aliased: `monaco-editor` → `@codingame/monaco-vscode-editor-api@30.0.1`, `vscode` → `@codingame/monaco-vscode-extension-api@30.0.1`. Service overrides wired: extensions (with `enableWorkerExtensionHost: true`), languages, textmate, theme, configuration (with `initUserConfiguration` before `initialize`), files, keybindings, notifications, quickaccess. Monaco editor mounts cleanly into a `<div>` with a `gxformat2` model.

**0.3** — ✅ **Done (2026-04-13, second pass).** `registerExtension(manifest, ExtensionHostKind.LocalWebWorker, { path: "/galaxy-workflows" })` accepted the manifest. `registerFileUrl(relPath, fsUrl)` wired up the browser entry, both LSP workers, the 2 language-configuration JSONs, and the 2 TextMate grammars, served via Vite's `/@fs/<absolute>` route with `server.fs.allow` extended to the extension worktree. Both LSP web workers boot end-to-end; hover at `class:` in a gxformat2 buffer returns Format2-schema content (`The 'outputs' field is required.` / `class - Must be 'GalaxyWorkflow'.`), confirming LSP round-trip. Two spike-side fixes were needed beyond the original wiring: (a) `MonacoEnvironment.getWorker` must dispatch the `TextMateWorker` label to the textmate override's own worker bundle (`@codingame/monaco-vscode-textmate-service-override/worker`), not the editor worker — the wrong bundle yields `Missing method $init on worker thread channel default`; (b) URLs passed to `registerFileUrl` must be absolute (with origin) — root-relative `/@fs/...` paths get `URI.parse`d by `registerExtensionFileUrl` (`extensions.js:32`) to scheme `file:`, and the extension-host worker's `_loadCommonJSModule` then fails on a `file://` URL with bare "Failed to fetch". Diagnosed via a custom worker entry that wraps `self.fetch` with a logger (kept in the spike at `src/editor/extensionHostWorker.ts`).

**0.4** — ✅ **Done (2026-04-13).** Findings captured at `~/projects/repositories/monaco-spike/FINDINGS.md`. Concrete drift from the plan:

1. **Package list drift.** `@codingame/monaco-vscode-quickinput-service-override` does **not** exist at v30 — the correct name is `@codingame/monaco-vscode-quickaccess-service-override`. `@codingame/monaco-vscode-language-detection-worker-service-override` does **not** exist either (drop from Phase 1.1). `monaco-editor` should be installed as an alias (`npm:@codingame/monaco-vscode-editor-api`), not as a direct dep — the two Monacos cannot coexist.
2. **Service-override options.** Keybindings override's prop is `shouldUseGlobalKeybindings`, not `shouldUseGlobalStorage`. Configuration override takes no args; call `initUserConfiguration(jsonBlob)` **before** `initialize(...)`. Extensions override accepts `{ enableWorkerExtensionHost, iframeAlternateDomain }`.
3. **`registerExtension` semantics.** `path` becomes the URI path of the extension-file URI (`extension-file://<publisher>.<name>/<path>`). `registerFileUrl(filePath, url)` **joins** `filePath` onto that location — file paths must be RELATIVE (no leading `/<path>/`).
4. **`MonacoEnvironment` needs BOTH `getWorker` and `getWorkerUrl`.** Known labels: `editorWorkerService`, `TextMateWorker` (background tokenizer), `extensionHostWorkerMain` / `extensionHost` / `extensionHostWorker` (main thread spawn + iframe URL), `webWorkerExtensionHostIframe` (URL pointing at the override package's iframe HTML).
5. **Iframe HTML can't be deep-imported.** The override package's `exports` only matches `*.js`/`*.css`/`*.d.ts`, so `import ... from ".../webWorkerExtensionHostIframe.html?url"` is rejected. Workaround: copy the file into a `public/` folder (or a tiny Vite plugin). Needs a dedicated step in Phase 1.
6. **Extension-host worker format — resolved in-spike.** The iframe HTML's `createWorker` already branches on `workerOptions.type`: a `'module'` value makes the blob use `await import(url)` instead of `importScripts(url)`. `MonacoEnvironment.getWorkerOptions(moduleId, label) → { type: "module" }` for the `extensionHost*` labels lets Vite's ESM `?worker&url` output work as-is. Verified in spike: extension host boots, `activate()` runs. See Phase 0.5.7.
7. **Vite configuration.** `optimizeDeps.exclude` all `@codingame/monaco-vscode-*` packages — the dep optimizer moves JS to `/.vite/deps/` but leaves sibling asset files behind, so `new URL('./x', import.meta.url)` 404s. `optimizeDeps.esbuildOptions` prints a Vite 8 deprecation warning (still functional in 8.0.x); use `optimizeDeps.rolldownOptions` for new code. `server.fs.allow` needs the extension worktree root for `folder:` delivery to work during dev.
8. **CSP.** Add `frame-src 'self' blob:` to the Phase 4.5 header set — the extension host iframe is spawned via a blob URL.
9. **Tool-cache wiring (Phase 4) is not yet exercised.** The `IndexedDBCacheStorage` code path cannot be verified until item 6 is fixed and `activate()` can actually reach the language-client initialization.

**Exit criteria — MET (2026-04-13, second pass):** prototype loads the extension manifest + assets, boots the extension host worker, completes `activate()`, both LSP web workers spawn (`Galaxy Workflows (galaxyworkflow) server is ready.` / `Galaxy Workflows (gxformat2,gxwftests) server is ready.`), and an LSP hover at `class:` returns Format2-schema content. Phase 1 unblocked.

---

## Phase 0.5: Upstream Browser-Readiness PRs (galaxy-workflows-vscode)

Items discovered during Phase 0 that must land upstream before gxwf-ui work proceeds.

**0.5.1 — Purge Node builtins from LS runtime.** ✅ **Done (2026-04-12), redone simpler (2026-04-13).**

First pass (2026-04-12):
- In-repo: only `server/packages/server-common/src/providers/toolRegistry.ts` imported `node:os` for `~` expansion. Replaced with a `process.env.HOME` guard.
- Transitive via `@galaxy-tool-util/core@0.2.0` (file: tarball from `vs_code_integration`): `FilesystemCacheStorage` and `DEFAULT_CACHE_DIR` pulled in `node:os`/`path`/`fs`/`fs/promises` at top-level.
- Worked around with local shims in `server/browser-shims/{os,path,fs,fs-promises}.js`, a custom esbuild resolve-plugin, and `removeNodeProtocol: false` on the browser tsup entries. `crypto` went away once `cacheKey` moved to Web Crypto upstream.

Second pass (2026-04-13) after `galaxy-tool-util-ts#52` merged:
- Upstream split core: universal root entry is browser-safe; `FilesystemCacheStorage`/`DEFAULT_CACHE_DIR`/`getCacheDir`/`makeNodeToolInfoService` moved to `@galaxy-tool-util/core/node`. `package.json` exports gained a `"browser"` condition.
- Repointed the server-common dep to a `file:../../../../../../galaxy-tool-util/branch/vs_code_integration/packages/core` symlink — live edits propagate, no `npm pack` cycle.
- Deleted `server/browser-shims/` (4 files) and the esbuild shim plugin + node-builtin aliases + `removeNodeProtocol: false` + `process`/`buffer` aliases from both `tsup.config.ts` files. Browser entries now just set `platform: "browser"` and put `"browser"` ahead of `"import"` in esbuild conditions.
- Dropped the `expandHome` / `process.env.HOME` hack from `toolRegistry.ts`; `configure()` now takes `{ toolShedUrl, storage }` (no `cacheDir`).
- Post-fix audit: `grep -oE 'require\("(os|fs|path|crypto|fs/promises|node:[a-z/]+)"\)' dist/web/*.js` still empty for both bundles, this time without any local scaffolding.

**0.5.2 — Storage injection in `ToolRegistryServiceImpl`.** ✅ **Done (2026-04-12), refactored (2026-04-13).**

After the `#52` bump `ToolCache.storage` is required (no filesystem default). Final shape:
- `TYPES.CacheStorage` replaced with `TYPES.CacheStorageFactory` — a `(cacheDir?: string) => CacheStorage` factory. Always bound (no `@optional`).
- Browser entries bind `() => new IndexedDBCacheStorage()`. Node entries bind `(dir) => new FilesystemCacheStorage(getCacheDir(dir))` imported from `@galaxy-tool-util/core/node`.
- `GalaxyWorkflowLanguageServerImpl.initialize()` / `onConfigurationChanged()` resolve storage via `this.cacheStorageFactory(settings.toolCache.directory)` and hand it to `configure()`.
- `configure({ toolShedUrl, storage })` — `cacheDir` dropped entirely.

**Dependency shift.** `server/packages/server-common/package.json` dep switched from the `.tgz` file-url to `file:../../../../../../galaxy-tool-util/branch/vs_code_integration/packages/core` (directory symlink — live edits, no repack). Publishing a real version bump to npm/Open VSX is still the eventual follow-up.

**0.5.3 — Browser-only extension bundle variant.** Not addressed in this pass. The existing dual build (`client/src/extension.ts` + `client/src/browser/extension.ts`) already covers desktop vs. browser activation; decision on packaging a separate `.vsix` can wait until Phase 2 actually needs it.

**0.5.4 — reflect-metadata + inversify in browser worker.** ✅ **Done (2026-04-12).** Added explicit `import "reflect-metadata"` as the first line of both browser entries (`server/gx-workflow-ls-native/src/browser/server.ts`, `server/gx-workflow-ls-format2/src/browser/server.ts`). It was previously only transitive via `@gxwf/server-common/src/languageTypes`; the explicit import removes the accidental reliance on import ordering.

**0.5.5 — `build:watch` target.** ✅ **Already present.** `server/package.json` ships `watch-native-server`, `watch-format2-server`, and `watch` (concurrent).

**0.5.6 — Browser-mode configuration surface.** Not addressed in this pass. `IndexedDBCacheStorage` currently uses its built-in `galaxy-tool-cache-v1` default; exposing `galaxyWorkflows.cacheDbName` / `galaxyWorkflows.toolCacheProxy.url` is a small follow-up once Phase 2 wiring exercises the settings surface end-to-end.

**0.5.7 — ESM extension-host worker via `getWorkerOptions`.** ✅ **Resolved (2026-04-13).** The iframe HTML (`webWorkerExtensionHostIframe.html:105`) already branches on `workerOptions.type`: `(workerOptions?.type === 'module') ? await import('${workerUrl}') : importScripts('${workerUrl}')`. `MonacoEnvironment.getWorkerOptions(_moduleId, label)` flows through `StandaloneWebWorkerService.getWorkerOptions` into the iframe postMessage payload. **Fix:** return `{ type: "module" }` from `getWorkerOptions` for the `extensionHost*` labels. No IIFE side-build, no HTML fork, extension-host worker stays isolated. Confirmed in the spike: after this change the extension host boots and `activate()` runs (next error is an unrelated `extension-file://` → `new Worker(...)` URL issue inside the extension's own code, see Phase 0.5.8).

Companion fix (still applies): `public/monaco/webWorkerExtensionHostIframe.html` needs to be populated from the override package at install time — postinstall script is the simpler of the two options considered, drops in a Vite plugin later if we want one.

**0.5.8 — DISSOLVED (2026-04-13).** Originally framed as: extension's `new Worker(serverUri.toString())` at `client/src/browser/extension.ts:31` fails because browsers can't spawn workers from `extension-file://` URIs, requiring an upstream fix to convert to HTTP first. **This is incorrect.** monaco-vscode-api's extension-host worker already patches `self.Worker` (`extensionHostWorker.js:54`, `patchWorker(asBrowserUri, getAllStaticBrowserUris)`) — `new Worker(extension-file://...)` inside extension code is intercepted, the URI is resolved to its registered browser URL via `FileAccess.asBrowserUri`, and a blob bootstrap calls `importScripts(<resolvedUrl>)`. The "Failed to fetch" originally attributed to this code path was actually the *previous* fetch — `_loadCommonJSModule` loading the extension's own browser entry — failing because spike-side `registerFileUrl` calls were storing scheme-less paths that `URI.parse` defaulted to `file:` (see Phase 0.3 update). Once registrations were rewritten as absolute `http://` URLs, both LSP workers spawn cleanly with no extension-side change. **No upstream PR is required for this item.**

Exit criteria: extension loads via Phase 0 spike with LSP workers functional and tool hover sourced from IndexedDB. Upstream PRs merged or at least tagged on a dev branch referenced by `EXT_COMMIT.md`.

**Test regressions from this pass (2026-04-12).** 7 of 377 server tests fail in `packages/server-common/tests/unit/toolRegistry.test.ts`. All failures are API-drift from the `@galaxy-tool-util/core` bump (cache-key input format changed; `ToolCache.hasCached` is now async; populateCache failure path changed). The tests pre-date the core rewrite and were written against the 0.2.0-npm cache layout.

**Resolved (2026-04-13).** Rewrote `toolRegistry.test.ts` against the new API:
- Promoted `ToolRegistryService.hasCached` / `listCached` to async and replaced `cacheSize` getter with `getCacheSize(): Promise<number>` (real `ToolCache.hasCached` is async; index key computation uses Web Crypto).
- Patched all call sites: `toolStateValidation.ts`, `nativeToolStateValidationService.ts`, `toolCacheService.ts` (including `scheduleResolution`, now async w/ `Promise.all`-based filter). `server.ts` caller uses `void`.
- Updated all integration + unit mocks across format2 and native (10 test files).
- New tests seed via `FilesystemCacheStorage` + `ToolInfoService.addTool` to stay aligned with upstream's key derivation (no hand-rolled SHA-256 input strings).

**Test status (2026-04-13).** Server 379/379, client jest 43/43, E2E 12/12 (`npm run test:e2e` — 12 mocha specs across ga + gxformat2, incl. tool-aware clean, conversions, tool-state validation empty/populated caches).

---

## Phase 1: gxwf-ui Dependencies + Editor Shell

**1.1** — Add deps to `packages/gxwf-ui/package.json`. **Final list post-Phase-0 (2026-04-13):**

```
pnpm add -F @galaxy-tool-util/gxwf-ui --save-exact \
  monaco-editor@npm:@codingame/monaco-vscode-editor-api@30.0.1 \
  vscode@npm:@codingame/monaco-vscode-extension-api@30.0.1 \
  @codingame/monaco-vscode-api@30.0.1 \
  @codingame/monaco-vscode-editor-api@30.0.1 \
  @codingame/monaco-vscode-extensions-service-override@30.0.1 \
  @codingame/monaco-vscode-languages-service-override@30.0.1 \
  @codingame/monaco-vscode-keybindings-service-override@30.0.1 \
  @codingame/monaco-vscode-notifications-service-override@30.0.1 \
  @codingame/monaco-vscode-quickaccess-service-override@30.0.1 \
  @codingame/monaco-vscode-configuration-service-override@30.0.1 \
  @codingame/monaco-vscode-files-service-override@30.0.1 \
  @codingame/monaco-vscode-textmate-service-override@30.0.1 \
  @codingame/monaco-vscode-theme-service-override@30.0.1 \
  reflect-metadata
```

Corrections vs. previous draft: `quickaccess` replaces `quickinput` (which does not exist at v30); `language-detection-worker-service-override` dropped (no such package); `monaco-editor` and `vscode` are **aliases** to `@codingame/monaco-vscode-editor-api` and `@codingame/monaco-vscode-extension-api` respectively — installing real `monaco-editor` breaks everything by bringing in a second Monaco runtime. All `@codingame/*` packages pinned to the same exact version.

**Also required (not strictly "service overrides"):**
- `vscode` aliased to `@codingame/monaco-vscode-extension-api` (or equivalent package) so the loaded extension can `import * as vscode`.
- `reflect-metadata` (for inversify in the extension host if not transitively pulled).

**Explicit anti-goal:** do NOT pull `@codingame/monaco-vscode-workbench` or the views/layout service overrides unless Phase 7 expands scope. Those trigger the full-screen workbench shell we rejected.

**FileSystemProvider for single-file workspace.** The extension activation expects a workspace. Register a minimal virtual `FileSystemProvider` backed by the single in-editor buffer under a scheme like `gxwf-ui:///current-file.ga`. This is also where `files-service-override` hooks in — not just as a dep, but as the seam for our FS provider. Covered here, not in Phase 2.

**Initial configuration bootstrap.** `configuration-service-override` requires an initial JSON blob. Assemble one from gxwf-ui's reactive settings at mount time — anything the extension reads via `workspace.getConfiguration("galaxyWorkflows")` comes from there.

**1.2** — Configure Vite worker handling (revised post-Phase-0, 2026-04-13):

- `optimizeDeps.exclude` **all** `@codingame/monaco-vscode-*` packages — the optimizer moves JS into `/.vite/deps/` but strands sibling assets, so `new URL('./x', import.meta.url)` inside those packages 404s. (Tried `include` first; it made things worse.)
- `optimizeDeps.rolldownOptions` instead of `esbuildOptions` — Vite 8 deprecates the latter.
- `server.fs.allow` must include the extension build-output root for the `folder:` delivery mode.
- `MonacoEnvironment` must expose **both** `getWorker(_, label)` and `getWorkerUrl(_, label)`. Handled labels: `editorWorkerService`, `TextMateWorker`, `extensionHost*`, `webWorkerExtensionHostIframe`. See the spike's `src/main.ts` for the reference implementation.
- The extension-host worker URL cannot be Vite's ESM `?worker&url` output — see Phase 0.5.7 for the classic-bundle requirement.
- Copy `@codingame/monaco-vscode-extensions-service-override/vscode/src/vs/workbench/services/extensions/worker/webWorkerExtensionHostIframe.html` into `public/monaco/` at install time. The package's `exports` map blocks `?url` deep imports.
- **`registerFileUrl` calls must pass absolute URLs (with origin).** monaco-vscode-api's `registerExtensionFileUrl` runs `URI.parse(url)` on whatever you pass; scheme-less paths like `/@fs/...` default to scheme `file:`, and the extension-host worker's `_loadCommonJSModule` then calls `fetch("file:///...")` which the browser refuses from an `http://` origin. Helper: prefix `self.location.origin` before calling `registerFileUrl`. The failure surface is a bare "Failed to fetch" with no URL, so wrap the worker entry in a fetch-logging shim (see spike's `src/editor/extensionHostWorker.ts`).
- **`MonacoEnvironment.getWorker` needs a dedicated case for each service override that ships its own worker bundle.** TextMate is one (`@codingame/monaco-vscode-textmate-service-override/worker`); using the editor worker for the `TextMateWorker` label yields `Missing method $init on worker thread channel default`. Audit each override added in Phase 1.1 for a sibling `worker` / `workers/*` export and add cases as needed.

**1.3** — Create `packages/gxwf-ui/src/components/MonacoEditor.vue`. Replace `EditorShell.vue`'s textarea with this new component at call sites. Contract:

```vue
<script setup lang="ts">
defineProps<{
  content: string;
  fileName: string;       // used to resolve language by extension
  readonly?: boolean;
}>();
const emit = defineEmits<{
  "update:content": [value: string];
}>();
</script>
```

`EditorShell.vue` stays as a thin wrapper for now — keeps the existing diagnostics-list fallback path alive until the LSP wiring lands. Delete once LSP is in.

**1.4** — Lifecycle: mount on tab activate, dispose model + editor on unmount. Use a singleton `getMonacoServices()` initializer — VS Code services are global and should init exactly once per page load. Guard with `let servicesReady: Promise<void> | null = null`.

**1.5** — Language detection: extension → language-id map. Three languages ship in the extension (`package.json` contributes): `galaxyworkflow` (`.ga`), `gxformat2` (`.gxwf.yml`/`.gxwf.yaml`), and `gxwftests` (`-test(s).yml`/`-test(s).yaml`). Map all three; missing the third silently mis-identifies workflow-test YAML. The loaded extension registers the languages — do not hardcode Monaco `registerLanguage()` calls here; let the extension own that.

**Test targets for this phase:**
- Unit: language resolver (`resolveLanguageId(fileName)` → language id).
- Component: MonacoEditor mounts, emits `update:content` on edit, unmounts without leaks (check `monaco.editor.getEditors().length` before/after).

---

## Phase 2: Extension Source Indirection

**2.1** — Create `packages/gxwf-ui/src/editor/extensionSource.ts` exporting one resolver:

```ts
export type ExtensionSource =
  | { kind: "folder"; path: string }       // dev
  | { kind: "vsix"; url: string }          // CI / preview
  | { kind: "openvsx"; id: string; version?: string }; // prod

export function parseExtensionSource(spec: string): ExtensionSource;
export async function loadExtensionSource(src: ExtensionSource): Promise<RegisteredExtension>;
```

`spec` format: `folder:/abs/or/relative/path` | `vsix:/public/ext/foo.vsix` | `openvsx:davelopez/galaxy-workflows@0.x`.

**2.2** — Read `import.meta.env.VITE_GXWF_EXT_SOURCE` in `App.vue` (or editor mount point). Default to `openvsx:davelopez/galaxy-workflows@latest` so a no-config build still works post-merge. In dev we expect the env var to be set.

**2.3** — Single "virtual-FS register" loader, three fetch strategies. monaco-vscode-api's extensions service does not natively read dev-server directories as extensions — the idiomatic path is `registerExtension({ manifest, location })` plus a virtual FileSystemProvider (or in-memory file map) exposing the bundle files. All three sources end at the same `registerExtension()` call.

- `folder:` — fetch `package.json` and every file it references via HTTP from the Vite dev server. Requires a per-extension `packageBundle.json` sidecar listing the exact files to fetch (the LS bundles + worker entries + grammar files + icons). Produce this sidecar in the VS Code extension's `build:watch` target (Phase 0.5.5). Add the worktree path to `server.fs.allow` in `vite.config.ts` so the dev server will serve it.
- `vsix:` — fetch the `.vsix` (a ZIP), unpack in browser memory with `fflate`, feed files into the same `registerExtension()` path.
- `openvsx:` — GET `https://open-vsx.org/api/{publisher}/{name}/{version}/file/{publisher}.{name}-{version}.vsix`, then same unpack flow as `vsix:`.

Implementation: one `buildInMemoryFS(files: Map<string, Uint8Array>)` helper; the three strategies differ only in how they populate `files`.

**2.4** — Wire gxwf-ui settings plumbing so the loaded extension sees:
- `galaxyWorkflows.toolCacheProxy.url` (if gxwf-ui is configured to use a proxy)
- A custom setting (new, added in VS Code repo) pointing the extension at IndexedDB storage by name.

Configuration is surfaced through the configuration-service-override. The extension reads it via `workspace.getConfiguration()` the same way it does on desktop.

---

## Phase 3: Pinning + Dev Scripts

**3.1** — Create `packages/gxwf-ui/EXT_COMMIT.md` (or a top-level repo constant file, TBD) declaring:

```
EXTENSION_REPO=https://github.com/davelopez/galaxy-workflows-vscode
EXTENSION_BRANCH=wf_tool_state   # or successor once merged
EXTENSION_COMMIT=<sha>           # pinned
```

All dev environments, CI, and contributor docs reference this file. Bumps are deliberate, reviewed commits. Prevents "works on my machine" drift while the feature branch moves.

**3.2** — Add `pnpm dev:with-ext` script in `packages/gxwf-ui/package.json`:

```json
"dev:with-ext": "concurrently -n ext,ui -c blue,green \"pnpm -C $GXWF_EXT_PATH build:watch\" \"VITE_GXWF_EXT_SOURCE=folder:$GXWF_EXT_PATH/client/dist pnpm dev\""
```

Requires `GXWF_EXT_PATH` env var. Script fails loudly if unset.

**3.3** — The VS Code extension repo must expose a `build:watch` target producing the browser bundle on change. If it doesn't exist, add it upstream (separate PR on that repo). The `tsup.config.ts` there already does dual builds — add a `--watch` invocation.

**3.4** — Vite HMR will not reload the extension host worker automatically. Add a small file watcher to the MonacoEditor component's mount path (dev-only) that listens for changes under the extension output dir via Vite's dev server WS and triggers a page reload. Alternative: document that dev users hit refresh after extension rebuilds — acceptable for now.

**3.5** — Developer README additions in `packages/gxwf-ui/README.md`:

- How to clone the extension repo as a sibling worktree.
- `EXT_COMMIT.md` bump procedure.
- `pnpm dev:with-ext` usage.
- How to package a `.vsix` locally and switch to `vsix:` mode for end-to-end verification.

---

## Phase 4: Tool Cache Wiring

Fold the existing `IndexedDBCacheStorage` (commit `ac820d3`) into the extension host runtime so `ToolRegistryService` → `ToolInfoService` → `IndexedDBCacheStorage` operates entirely in-browser.

**4.1** — Prerequisite landed in Phase 0.5.2 (`ToolRegistryServiceImpl` accepts `CacheStorage` via inversify factory). Here we wire it:

- `gx-workflow-ls-*/src/browser/server.ts` binds `TYPES.CacheStorageFactory` to `() => new IndexedDBCacheStorage(dbName)` in the browser inversify container.
- `gx-workflow-ls-*/src/node/server.ts` binds to `(dir) => new FilesystemCacheStorage(getCacheDir(dir))` (current default behavior preserved).
- `ToolRegistryServiceImpl` is unchanged beyond Phase 0.5.2 — it no longer knows about FS vs IDB, just receives a `CacheStorage` from the factory.

`IndexedDBCacheStorage`'s constructor takes only `dbName` (defaults to `galaxy-tool-cache-v1`). If a user wants cache isolation per origin/workflow, surface a `galaxyWorkflows.cacheDbName` setting (added in Phase 0.5.6) and pass it through the factory.

**4.2** — The DB name needs to be deterministic per origin. Default `"galaxy-tool-cache-v1"` (as shipped) is fine — one cache per browser, shared across workflows.

**4.3** — Fetcher configuration: the LSP server in browser mode calls ToolShed directly (`fetchFromToolShed` uses `fetch`). ToolShed CORS behavior needs verification — it may or may not allow browser-origin `GET`. If it blocks, users configure a `tool-cache-proxy` URL and the extension routes fetches through it. Add a `galaxyWorkflows.toolCacheProxy.url` read in the browser entry.

**4.4** — Pre-seeding: optional future enhancement. A "pre-warm cache" action could fetch top-N tools from a bundled dataset and `saveAll()` them on first run. Not v1.

**4.5** — Cache inspection: add a dev-only panel in gxwf-ui that lists IndexedDB contents (`cache.list()`) with size / age columns. Helpful for debugging during Phase 0–6.

**Tests:**
- Integration: load a workflow with a known tool, verify Monaco shows hover info sourced from IndexedDB, verify cache populated in DevTools > Application > IndexedDB.
- Eviction: none needed — browser handles quota pressure.

---

## Phase 4.5: CSP Headers on gxwf-web

`gxwf-web` serves the built UI in production. The extension host worker, LSP web workers, and language-detection worker require permissive `worker-src` and `script-src`. Update gxwf-web's response headers (or static-serving middleware) to include:

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'wasm-unsafe-eval';
  worker-src 'self' blob:;
  frame-src 'self' blob:;
  connect-src 'self' https://open-vsx.org https://toolshed.g2.bx.psu.edu <configured proxies>;
  style-src 'self' 'unsafe-inline';
  font-src 'self' data:;
  img-src 'self' data:;
```

`frame-src 'self' blob:` added post-Phase-0 (2026-04-13): the extensions service spawns its extension-host iframe by `URL.createObjectURL(...)` on the sandbox HTML. Without `frame-src` the iframe is blocked.

`unsafe-inline` for styles is currently required by monaco-vscode-api's inline theme injection. Audit whether nonce-based CSP is feasible later. `wasm-unsafe-eval` is needed by some textmate grammar engines.

Tests: add a smoke test that loads the Monaco tab against a gxwf-web instance with CSP enabled and checks the browser console for CSP violations. Fail the test if any fire.

---

## Phase 5: CSS Audit Pass

`monaco-vscode-api` ships styles that assume VS Code's theme variable namespace on a global scope and that Monaco's container is the primary layout. PrimeVue and the gx-gold styling must coexist.

**5.1** — Inventory conflicts by diff-comparing gxwf-ui rendering before/after Monaco load. Capture screenshots of Dashboard, WorkflowView, FileView — confirm no color shifts, no font substitutions, no button-radius changes.

**5.2** — Scope monaco-vscode-api styles to the editor container. Options ranked:

- **Preferred:** mount the editor in a shadow DOM container. Isolates styles entirely. Monaco mostly supports shadow-DOM hosts; confirm during Phase 0.
- **Fallback:** wrap the editor in a CSS layer (`@layer monaco`) with higher specificity, and explicitly reset PrimeVue variables at the Monaco root. More fragile.
- **Last resort:** run a postcss pass that rewrites monaco-vscode-api selectors to be scoped to `.monaco-host`. Brittle, avoid.

**5.3** — Theme integration: monaco-vscode-api's theme service supports loading a `.json` theme. Pick a dark theme that matches gxwf-ui's gold/dark identity (there's brand identity work in commits `d1af987` / `eb6f518`). Author a minimal custom theme in `packages/gxwf-ui/src/editor/theme.ts` — semantic tokens from gx palette.

**5.4** — Font handling: gxwf-ui uses Atkinson Hyperlegible for body text. Keep Monaco on a monospace default (`"Menlo, Consolas, monospace"`) — do not pull body font into the editor. Verify the loaded extension doesn't try to register fonts.

**5.5** — Validation: visual regression run. Recommend Playwright screenshot tests against Dashboard, WorkflowView, FileView (editor closed), FileView (editor open). Added to `make test` pipeline.

---

## Phase 6: Keybindings

The keybindings-service-override installs a global keybinding registry. This can collide with gxwf-ui's router shortcuts, browser shortcuts, or host app Ctrl+S semantics.

**6.1** — Scope keybindings to the editor element via VS Code's `when` context clauses. The editor has an implicit focus context (`editorFocus`, `editorTextFocus`). Audit the loaded extension's `package.json contributes.keybindings` — each should have a `when` that restricts to editor focus.

**6.2** — Block Ctrl+S (Cmd+S) from reaching the extension's default save handler. gxwf-ui already has its own save flow through OperationPanel and gxwf-client. Either:
- Override the `workbench.action.files.save` command binding to call into gxwf-ui's save, OR
- Remove the save keybinding entirely and document that saving happens via the OperationPanel button.

Preference: override and route to gxwf-ui save. Users expect Ctrl+S to work.

**6.3** — Browser shortcuts to preserve: Ctrl+T (new tab), Ctrl+W (close tab), Ctrl+Shift+I (devtools), F5 (reload), Ctrl+F (in-editor find is fine — monaco-vscode-api provides native find widget, but browser Ctrl+F outside the editor should also work).

**6.4** — Keybinding tests. Create `packages/gxwf-ui/test/editor/keybindings.test.ts`. Use Playwright component testing or Vitest + `@vue/test-utils` with a real DOM. Scenarios:

- Editor focused, type `Ctrl+Space` → completion popup appears.
- Editor focused, type `Ctrl+S` → gxwf-ui save handler fires (spy), extension save does not fire.
- Editor blurred (focus on OperationPanel), type `Ctrl+Space` → NO completion popup.
- Navigate router link via keyboard → router updates, editor unmounts cleanly.
- `Ctrl+Shift+P` → command palette opens as overlay inside editor region, not a full-screen takeover.

**6.5** — Document the keybinding contract in `packages/gxwf-ui/README.md`. Any future extension contribution that adds a keybinding must declare a `when` clause scoped to editor focus. Enforce in review.

---

## Phase 7: Feature Surface (v1)

What the editor delivers on day one:

- Syntax highlighting (via extension-provided TextMate grammar).
- Hover (tool parameter descriptions from `IndexedDBCacheStorage`).
- Completion (tool parameters, workflow step references).
- Diagnostics (structural + tool state, streamed as LSP diagnostics into Monaco markers).
- Find / replace (Monaco default).
- Format document (if extension registers it).
- Command palette, scoped to editor region.

Explicitly NOT in v1:

- Multi-file / workspace (single file only).
- File explorer (gxwf-ui has its own file list).
- Source control / git integration.
- Custom VS Code views or webviews from the extension.
- Task running / debug.

Validation: the existing `OperationPanel` continues to display full validate / lint / clean / roundtrip reports driven by gxwf-client. LSP diagnostics and operation reports will show some overlap — that's accepted. Users who rely on the operation reports are not disrupted; users who prefer inline editor feedback get it too.

---

## Phase 8: Ship Path — Switching to Open VSX

Once galaxy-workflows-vscode's `wf_tool_state` branch (or its successor) merges and publishes a release to Open VSX:

**8.1** — Update `EXT_COMMIT.md` to point at the merged commit.
**8.2** — Change the default `VITE_GXWF_EXT_SOURCE` to `openvsx:davelopez/galaxy-workflows@<version>`.
**8.3** — Remove the `folder:` fallback from prod builds (dev keeps it).
**8.4** — Pin the Open VSX version in gxwf-ui's build. Bumping the version is a deliberate PR.
**8.5** — Add a CI check that verifies the pinned Open VSX version is still resolvable (guards against the extension being unpublished).

---

## Phase 9: Later Iterations (Intentionally Loose)

Items we expect to tackle after v1 ships, shaped roughly. Details will sharpen with experience.

**9A — Preview publishing pipeline.** CI job that builds the VS Code extension at the pinned commit, runs gxwf-ui's full test suite against it as a `.vsix`, and publishes both a gxwf-ui preview deploy and a GitHub Releases `.vsix` artifact. Lets reviewers try both together without local setup.

**9B — Tighter LSP ↔ OperationPanel integration.** Currently diagnostics come from two paths (LSP in editor, gxwf-client in panel). Consider: panel shows a "sourced from editor" badge on diagnostics that also exist in LSP output, or the panel subscribes to LSP diagnostic streams when available. TBD based on what feels right in use.

**9C — Pre-warm cache from bundle.** Ship a JSON dump of top-N tools with the gxwf-ui build, `saveAll()` on first mount. Cuts first-workflow latency.

**9D — Shadow DOM finalization.** If Phase 5's shadow-DOM approach worked in the Phase 0 spike, great. If not, revisit once we know which monaco-vscode-api features we actually ship.

**9E — Desktop VS Code extension reuse for editor commands.** Right now gxwf-ui's `OperationPanel` and the extension's commands are independent implementations of clean / convert / validate. Long-term: the panel can dispatch to the loaded extension's commands via `commands.executeCommand(...)` instead of calling gxwf-web. Consolidates logic, but only makes sense once extension-side commands are feature-complete.

**9F — Multi-file / Contents API integration.** If gxwf-ui grows multi-file editing, revisit: does the extension host get a workspace with multiple Monaco models, or do we stay one-editor-per-tab and open separate tabs? Defer.

**9G — Read-only embed mode.** A gxwf-ui route that renders a workflow read-only with LSP hover-only for documentation / demos / IWC listings. Small delta from the editable version.

**9H — Upstream contributions as they shake out.** Each phase will likely spawn small PRs against galaxy-workflows-vscode (browser bundle hardening, Node-builtin elimination, configuration surface additions, extension repackaging script). Track them in a running list rather than pre-specifying.

---

## Test Strategy Summary

| Phase | Test Type | Where |
|---|---|---|
| 1 | Unit — language resolution, component mount | `packages/gxwf-ui/test/editor/` |
| 2 | Unit — source spec parser, loader dispatch | same |
| 3 | Manual — dev loop smoke | documented in README |
| 4 | Integration — hover uses IndexedDB cache | same |
| 5 | Visual regression — Playwright screenshots | `packages/gxwf-ui/test/visual/` |
| 6 | E2E — keybinding scopes | `packages/gxwf-ui/test/editor/keybindings.test.ts` |
| 7 | E2E — feature smoke per bullet | same |
| 8 | CI — Open VSX resolution check | `.github/workflows/` |

Red-to-green for every phase: write a failing test expressing the phase's acceptance, land implementation that flips it green.

---

## Dependency Summary

| New dep | Package | Phase |
|---|---|---|
| monaco-editor | gxwf-ui | 1 |
| @codingame/monaco-vscode-api + service overrides | gxwf-ui | 1 |
| fflate (or similar) for `.vsix` unpack | gxwf-ui | 2 |
| concurrently (dev) | gxwf-ui | 3 |
| Playwright (if not already present) | gxwf-ui (dev) | 5, 6 |

No new production deps on the galaxy-tool-util side beyond gxwf-ui. `IndexedDBCacheStorage` is already shipped in `@galaxy-tool-util/core`.

Upstream changes required on galaxy-workflows-vscode:
- Browser entry for each LS wires `IndexedDBCacheStorage` (Phase 4.1).
- `build:watch` target (Phase 3.3).
- New configuration keys for tool cache proxy URL if not already present (Phase 2.6 / 4.3).
- Possible Node-builtin cleanup surfaced by Phase 0 spike.

---

## Migration & Compatibility

- gxwf-ui users without Monaco: gated behind a feature flag / config setting for the first few releases (`galaxyWorkflows.ui.monacoEditor.enabled`). Default off until Phase 8 ships. Keeps fallback to textarea `EditorShell` available if Monaco load fails.
- Desktop VS Code users: unaffected. This plan doesn't touch the desktop extension's behavior.
- gxwf-web (backend) users: unaffected. No API changes.

---

## Risks

| Risk | Mitigation |
|---|---|
| Phase 0 reveals monaco-vscode-api can't load the extension cleanly | Resolved (2026-04-13): full Phase 0 spike loads manifest, grammars, configs, both LSP web workers, and returns LSP hover content for gxformat2. Two minor spike-side wiring fixes were needed (TextMate worker dispatch, absolute-URL `registerFileUrl` calls) — neither requires upstream changes. Option-A fallback (npm + monaco-languageclient) shelved unless gxwf-ui Phase 1 surfaces something new. |
| Bundle size blows past tolerance | Audit service overrides and drop any not strictly needed (theme, quickinput, language-detection are likely candidates for removal). Lazy-load the editor tab so the dashboard isn't penalized. |
| Extension host extension has Node-only activation code | Gate behind `isBrowser` check upstream. Small PRs to the VS Code repo. |
| CSS bleed breaks PrimeVue | Shadow DOM (Phase 5.2 preferred path). If shadow DOM fails, scope via CSS layers — messier but workable. |
| Ctrl+S / other keybinding collisions ship unnoticed | Phase 6.4 tests are the gate; do not ship without them passing. |
| Open VSX publishing of the target extension stalls | Phase 8 is deferred until it ships. Phase 3's `.vsix:` delivery mode is production-viable indefinitely if needed. |
| IndexedDB quota pressure on low-end devices | Add cache-size inspection UI (Phase 4.5) and a "clear tool cache" button. |
| `node:os` / `node:fs` / `node:path` imports in `server-common` (concrete: `toolRegistry.ts:1` imports `node:os`) block browser bundling | Resolved: upstream `galaxy-tool-util-ts#52` split core into browser-safe root + `/node` subpath; local shims + esbuild plugin removed (Phase 0.5.1 second pass, 2026-04-13). |
| Inversify `@injectable()` needs `reflect-metadata` in browser worker | Phase 0.5.4 confirms `import "reflect-metadata"` is first line of each LS browser entry. |
| monaco-vscode-api + monaco-editor version drift breaks everything silently | Pin exact versions (no `^`); `pnpm up` is a deliberate, reviewed PR. Lock versions in `EXT_COMMIT.md` or a sibling file. |
| `@galaxy-tool-util/schema` pulls Effect into LS worker bundle (size) | Measure in Phase 0. If >2 MB per worker, evaluate Effect tree-shaking or lazy grammar loading. |

---

## Open Questions

1. Ctrl+S target — editor command dispatch or gxwf-ui save handler?
2. Where does `EXT_COMMIT` live — gxwf-ui `README.md`, a top-level constants file, or renovate-style metadata?
3. Who owns the custom theme authoring? Visual design pass needed.
4. Version pinning granularity on Open VSX — exact version, caret range, or `latest`?
5. Pre-warm cache bundle — yes/no for v1, or defer to 9C?
6. Visual regression infra — add Playwright, or reuse existing tooling?
7. Single universal `.vsix` (desktop + browser) vs. separate `galaxy-workflows-browser.vsix` — decide in Phase 0.5.3.
8. Inversify browser container wiring — upstream in galaxy-workflows-vscode, or a small gxwf-ui-side shim? Preference is upstream so desktop/web share binding config.
9. `packageBundle.json` manifest format for `folder:` loader — define shape in Phase 0.5.5.
10. ~~Classic-worker strategy for the extension host — A/B/C in Phase 0.5.7?~~ Resolved: Option D (`getWorkerOptions` → `{ type: "module" }`) confirmed in spike.
11. Iframe-HTML delivery — postinstall copy script vs. dedicated Vite plugin? Either works; picking the simpler of the two.
12. ~~Where does the `extension-file://` → HTTP rewrite belong for extension-spawned LSP workers (Phase 0.5.8)?~~ Resolved: nowhere — monaco-vscode-api's `patchWorker` already handles this. See 0.5.8 dissolution note.
13. ~~Service-override set likely needs `environment` / `host` / `log` / `storage` additions before activation completes~~ Resolved: the spike's set (extensions, languages, textmate, theme, configuration, files, keybindings, notifications, quickaccess) is sufficient to reach a working LSP. Add more only as concrete needs emerge.

Previously listed, now answered in the plan body:
- Shadow DOM vs. CSS layers → Phase 5.2 prefers shadow DOM; confirmed in Phase 0.3.
- CORS for ToolShed fetches → Phase 4.3 falls back to `tool-cache-proxy` if blocked.
- CSP headers → promoted to Phase 4.5 (explicit action, no longer open).
- Settings namespace rename → dropped as low-value; keep VS Code-native naming.
- `ToolInfoService` storage injection API → already shipped in `ac820d3` (`opts.storage`), no new API needed.
