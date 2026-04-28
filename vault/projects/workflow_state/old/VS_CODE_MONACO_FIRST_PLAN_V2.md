# VS Code → gxwf-ui Monaco Integration Plan (V2)

**Date:** 2026-04-13
**Predecessor:** `VS_CODE_MONACO_FIRST_PASS_PLAN.md` (V1) — first-pass plan plus spike journal. This V2 keeps only the forward-looking work; Phase 0 is collapsed to a "verified setup" note.
**Goal:** Embed the Galaxy Workflows VS Code extension's editing experience inside a tab of the gxwf-ui Vue app using `@codingame/monaco-vscode-api`. Users get Monaco + hover + completion + diagnostics for a single workflow file, backed by the same LSP servers that power desktop VS Code.

---

## Locked Decisions

| Question | Decision |
|---|---|
| Editor library | `@codingame/monaco-vscode-api` v30.0.1 (mode 1 — embed, not workbench) |
| Extension host worker | Yes — enabled |
| Scope | Single-file editor, one tab |
| Language selection | By file extension (`.ga` → native, `.gxwf.yml`/`.gxwf.yaml` → format2, `-test(s).y(a)ml` → tests) |
| Operations panel | Standalone (gxwf-client driven). LSP diagnostics are a bonus, not a replacement. |
| Extension delivery | `folder:` (dev live checkout), `vsix:` (unpacked-vsix dir served over HTTP — CI / preview / prod). Selected via `VITE_GXWF_EXT_SOURCE`. **No runtime `openvsx:` loader in the browser** — production servers unpack the extension at startup into `/ext/galaxy-workflows/` and point `vsix:` at that URL (2026-04-15 simplification, see Phase 2 / Phase 8). |
| CSS audit | Required phase, not optional |
| Keybinding tests | Required phase, not optional |
| Editor chrome | Pure custom Vue toolbar (Phase 5.5). `views-service-override` / `attachPart(EDITOR_PART)` rejected for v1 — monotonic upgrade path if native VS Code breadcrumbs / editor-title actions become necessary. |

---

## Architecture

```
┌─────────────────── gxwf-ui (Vue 3 SPA) ────────────────────┐
│   /files/:path → FileView.vue                              │
│                                                            │
│   ┌─────────────────────────┐  ┌───────────────────────┐   │
│   │ EditorTab               │  │ OperationPanel        │   │
│   │   Monaco editor DOM     │  │ (unchanged, gxwf-     │   │
│   │   (monaco-vscode-api)   │  │  client over HTTP)    │   │
│   └───────────┬─────────────┘  └───────────────────────┘   │
│               │ in-process LSP (postMessage)               │
│               ▼                                            │
│   ┌───────────────────────────────────────────────────┐    │
│   │ Extension Host Worker (monaco-vscode-api)         │    │
│   │  loads galaxy-workflows-vscode browser bundle     │    │
│   │  spawns ls-native + ls-format2 web workers        │    │
│   │      ↓                                            │    │
│   │  ToolRegistryService → ToolInfoService            │    │
│   │      → IndexedDBCacheStorage                      │    │
│   │      → fetcher: ToolShed (direct) or proxy        │    │
│   └───────────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────────────┘
```

LSP traffic stays in-browser. `OperationPanel` continues to hit gxwf-web over HTTP.

---

## Phase 0 — Verified (Spike Done)

Spike at `~/projects/repositories/monaco-spike` proves the load path. Key findings codified below; they constrain all subsequent phases.

**What works in the spike:**
- Manifest registration via `registerExtension(manifest, ExtensionHostKind.LocalWebWorker, { path })`.
- Both LSP web workers boot (`Galaxy Workflows (galaxyworkflow) server is ready.` / `(gxformat2,gxwftests)`).
- LSP hover round-trip returns Format2-schema content for `class:` in a gxformat2 buffer.
- TextMate grammars + language configs load via `registerFileUrl`.

**Constraints carried into Phase 1+ (all the V1 spike pain, distilled):**

1. **Pin every `@codingame/monaco-vscode-*` to the same exact version.** No carets — a version skew between the API package and any service override breaks silently.
2. **`monaco-editor` and `vscode` must be aliases**, not real deps:
   - `monaco-editor` → `npm:@codingame/monaco-vscode-editor-api@<v>`
   - `vscode` → `npm:@codingame/monaco-vscode-extension-api@<v>`
   Installing real `monaco-editor` brings a second Monaco runtime into the bundle and breaks everything.
3. **Service-override gotchas at v30:** the package `quickaccess-service-override` (not `quickinput-service-override` — does not exist); `language-detection-worker-service-override` does not exist either. Keybindings option is `shouldUseGlobalKeybindings` (not `…GlobalStorage`). Configuration takes no args; call `initUserConfiguration(jsonString)` BEFORE `initialize(...)`. Extensions takes `{ enableWorkerExtensionHost: true, iframeAlternateDomain? }`.
4. **`MonacoEnvironment` must expose `getWorker`, `getWorkerUrl`, AND `getWorkerOptions`**:
   - Labels to handle in `getWorker`: `editorWorkerService`, `TextMateWorker`, `extensionHost*` (three aliases).
   - **TextMate ships its own worker bundle** — `@codingame/monaco-vscode-textmate-service-override/worker`. Using the editor worker for the `TextMateWorker` label fails with `Missing method $init on worker thread channel default`. Audit each new override for a sibling `worker` / `workers/*` export.
   - Labels to handle in `getWorkerUrl`: `webWorkerExtensionHostIframe` (path to the iframe HTML — see #6) and `extensionHost*` (worker URL).
   - `getWorkerOptions(label)` must return `{ type: "module" }` for `extensionHost*` labels. The iframe HTML branches on this and uses `await import(url)` instead of `importScripts(url)`, allowing Vite's ESM `?worker&url` output to work as-is.
5. **`registerFileUrl(path, url)` semantics:**
   - `path` is **relative** to the extension location (no leading `/<extensionPath>/`).
   - `url` **must be absolute, with origin** (e.g. `${self.location.origin}/@fs/...`). monaco-vscode-api's `registerExtensionFileUrl` runs `URI.parse(url)`; scheme-less paths default to `file:`, and the extension-host worker's `_loadCommonJSModule` then calls `fetch("file:///...")` which the browser refuses from an `http://` origin. Surface error is a bare "Failed to fetch" with no URL.
   - For the extension's main entry, `_loadCommonJSModule` does `ensureSuffix(path, ".js")` itself — register the `.js` form once.
6. **Iframe HTML can't be deep-imported.** The override package's `exports` map only matches `*.js`/`*.css`/`*.d.ts`. Solution: copy `@codingame/monaco-vscode-extensions-service-override/vscode/src/vs/workbench/services/extensions/worker/webWorkerExtensionHostIframe.html` into `public/monaco/` at install time (postinstall script, or a Vite plugin if we want to be fancier).
7. **Extension-host worker entry cannot use dynamic `import()`** for the monaco-vscode-api worker main — Vite's worker bundling can't follow it. Use a static `import` of the package path `@codingame/monaco-vscode-api/vscode/vs/workbench/api/worker/extensionHostWorkerMain` (note: NO `src/` prefix — the package's `./vscode/*` export rule adds it).
8. **Vite config:** `optimizeDeps.exclude` ALL `@codingame/monaco-vscode-*` packages (the optimizer strands sibling assets); drop `optimizeDeps.esbuildOptions` (deprecated under Vite 8 / Rolldown) — rely on `build.target` for output target; **do not** pass `optimizeDeps.rolldownOptions: { target }`, Rolldown rejects it ("Invalid key: Expected never but received 'target'"); `server.fs.allow` must include the extension worktree root for `folder:` delivery.
9. **Standing diagnostic worth keeping:** custom extension-host worker entry that wraps `self.fetch` with a getter/setter to log the URL on failure. Without it, future asset-registration mistakes surface as a bare "Failed to fetch" with no URL. Reference impl: `monaco-spike/src/editor/extensionHostWorker.ts`.
10. **Phase 0.5.8 was a misdiagnosis** (now retired). monaco-vscode-api's `patchWorker` (`extensionHostWorker.js:54`) already intercepts `new Worker(extension-file://...)` from inside extension code — no upstream extension change is required for that.

**Already landed upstream in galaxy-workflows-vscode (`wf_tool_state` branch):**
- `0.5.1` Node-builtin purge (now via `galaxy-tool-util-ts#52` core split, no local shims).
- `0.5.2` Storage injection in `ToolRegistryServiceImpl` via `TYPES.CacheStorageFactory`. Browser entries bind `() => new IndexedDBCacheStorage()`; node entries bind `(dir) => new FilesystemCacheStorage(getCacheDir(dir))`.
- `0.5.4` Explicit `import "reflect-metadata"` first line of both browser entries.
- `0.5.5` `build:watch` target already present.
- LSP lib bumps (commit `5040bd5`, 2026-04-13): `vscode-languageclient`/`-server` 8→9, `vscode-json-languageservice` 5.3→5.7, `vscode-uri` 3.0→3.1, `reflect-metadata` 0.1→0.2, `@types/vscode` + `engines.vscode` 1.81→1.96. The `@types/vscode 1.96` alignment matches `@codingame/monaco-vscode-api@30.0.1`'s baseline, removing a latent API-skew risk. `inversify` intentionally held at 6.0.2 (v7+ drops `emitDecoratorMetadata` — non-trivial and not blocking).
- Test rewrites for the new `@galaxy-tool-util/core` API (379/379 server, 43/43 client, 18/18 E2E post-bump).
- Spike re-verified 2026-04-14 against `wf_tool_state`: zero console errors, both LSP servers ready, Format2 hover live, diagnostics populate markers.

**Not addressed; defer until needed:**
- `0.5.3` separate browser-only `.vsix` packaging — current dual build is sufficient.
- `0.5.6` browser-mode configuration surface (`galaxyWorkflows.cacheDbName`, `…toolCacheProxy.url`) — small follow-up once Phase 2 actually wires the settings.

---

## Phase 1 — gxwf-ui Dependencies + Editor Shell

**Status (2026-04-14):** 1.1–1.6, 1.8–1.10 landed on branch `vs_code_integration` of galaxy-tool-util. 1.7 partially done — the `MonacoEditor.vue` component ships, but the call-site swap in `FileView.vue` is deferred until Phase 2 (so the production build can load the extension via `vsix:`, not just dev-only `folder:`). `make check` green across the monorepo. Phase 1 smoke test is deferred to post-Phase 2 — see revised "Tests (Phase 1)" block below.

**1.1 — Install deps.** Pin all `@codingame/*` to the same exact version (currently 30.0.1):

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

Anti-goal: do NOT pull `@codingame/monaco-vscode-workbench` or layout-related overrides. Those trigger the full-screen workbench shell we rejected.

**1.2 — Install postinstall iframe-HTML copy.** ✅ `packages/gxwf-ui/scripts/copy-monaco-iframe.mjs` runs as `postinstall`. Resolves the override via `require.resolve("@codingame/monaco-vscode-extensions-service-override")` and walks to the sibling `vscode/src/...` path (the package's exports map forbids deep `package.json` resolution). Copies to `public/monaco/webWorkerExtensionHostIframe.html`.

**1.3 — Vite config (`packages/gxwf-ui/vite.config.ts`).** ✅ Per Phase 0 constraint #8:
- `optimizeDeps.exclude`: every installed `@codingame/monaco-vscode-*` package.
- No `optimizeDeps.esbuildOptions` / `rolldownOptions` — set output target via `build.target: "esnext"` only.
- `server.fs.allow`: parses `VITE_GXWF_EXT_SOURCE` at config time; folder path is added to allow-list when spec starts with `folder:`.
- `worker.format: "es"` so Vite emits ESM workers (required by iframe `await import(url)` path).

**1.4 — `MonacoEnvironment` setup.** ✅ `packages/gxwf-ui/src/editor/monacoEnvironment.ts` — side-effect module. Imported once at the top of `MonacoEditor.vue` before any other monaco/vscode touch. Handles labels `editorWorkerService`, `TextMateWorker`, `extensionHost{,Worker,WorkerMain}`, and `webWorkerExtensionHostIframe`.

**1.5 — Extension-host worker entry.** ✅ `packages/gxwf-ui/src/editor/extensionHostWorker.ts`. Keeps the `self.fetch` getter/setter wrapper as a standing diagnostic (Phase 0 constraint #9). Static import of `@codingame/monaco-vscode-api/vscode/vs/workbench/api/worker/extensionHostWorkerMain` (no `src/` prefix).

**1.6 — Service init.** ✅ `packages/gxwf-ui/src/editor/services.ts`. Singleton `initMonacoServices(cfg)` with `servicesReady: Promise<void> | null`. `MonacoUserConfig` type surfaces `toolShedUrl`, `toolCacheProxyUrl`, `cacheDbName`, `validationProfile` for Phase 2.4 to populate — currently called with defaults. Config JSON assembled via `initUserConfiguration(...)` BEFORE `initialize(...)` per Phase 0 constraint #3.

**1.7 — `MonacoEditor.vue` component.** 🟡 Component lands at `packages/gxwf-ui/src/components/MonacoEditor.vue`; **call-site swap deferred to post-Phase 2**. Contract:

```vue
<script setup lang="ts">
defineProps<{
  content: string;
  fileName: string;       // resolves language by extension
  readonly?: boolean;
  theme?: string;
}>();
const emit = defineEmits<{
  "update:content": [value: string];
  ready: [];
  error: [err: Error];
}>();
</script>
```

Implementation notes (as landed): side-effect imports `monacoEnvironment` first; `onMounted` awaits `initMonacoServices` → `loadGalaxyWorkflowsExtension` → creates model via `upsertMemoryFile` + `resolveLanguageId`. Watchers sync `content` / `readonly` / `theme` into the live editor. An `applyingProp` guard prevents `update:content` echo on external updates. Emits `ready` when editor is live, `error` on boot failure (for hosting views to fall back to `EditorShell`).

`EditorShell.vue` stays as the default at call sites for now (textarea fallback if Monaco fails to load, and a working UI while `folder:`-only loader can't power the production build); the swap happens once Phase 2 ships `vsix:` + the fixture is bundled into gxwf-web. Delete `EditorShell.vue` when Phase 7 ships.

**1.7b — Folder-mode extension loader (interim).** ✅ `packages/gxwf-ui/src/editor/loadExtension.ts` — reads `VITE_GXWF_EXT_SOURCE=folder:/abs/path`, registers the extension via `${self.location.origin}/@fs/...` URLs, awaits `whenReady()`. **Phase 2 replaces this module** with the general `extensionSource.ts` resolver supporting `folder:` / `vsix:` (the original `openvsx:` runtime loader was dropped 2026-04-15 — see Phase 2).

**1.8 — Lifecycle.** ✅ Mount creates model + editor + content-change subscription; `onBeforeUnmount` disposes all three and nulls the refs. Verify with `monaco.editor.getEditors().length` before/after.

**1.9 — Language detection.** ✅ `packages/gxwf-ui/src/editor/languageId.ts`. `resolveLanguageId(fileName)` returns `gxwftests` / `gxformat2` / `galaxyworkflow` / `plaintext`. Suffix precedence matters: `-test(s).y(a)ml` must be tested before `.gxwf.ya?ml` (a test file could conceivably end `-tests.gxwf.yml`). The loaded extension contributes the three IDs — do not call `monaco.languages.register()` from gxwf-ui.

**1.10 — FileSystemProvider for single-file workspace.** ✅ `packages/gxwf-ui/src/editor/fileSystem.ts` — lazily constructs a `RegisteredFileSystemProvider` (from `files-service-override`) under scheme `gxwf-ui` on first use; `upsertMemoryFile(fileName, content)` calls `provider.registerFile(new RegisteredMemoryFile(uri, content))` and returns the URI. Re-registration overwrites silently (no manual disposable tracking yet — fine for single-file scope).

**Tests (Phase 1) — restructured 2026-04-14:**

The originally-proposed Phase-1 smoke (programmatic hover on `class:` → assert `Format2 Schema`) has been **deferred until after Phase 2 + the `FileView.vue` call-site swap**. Rationale: the existing gxwf-e2e harness (`packages/gxwf-e2e/src/harness.ts`) does a production `pnpm --filter gxwf-ui build` in `globalSetup` and serves the static dist via gxwf-web. The Phase-1 folder-only loader relies on Vite's `/@fs/` dev middleware, which doesn't exist in a production build. Writing a Phase-1-only smoke would require a parallel `playwright.monaco.config.ts` with its own `webServer` spawning `vite dev` and a dev-only `/monaco-smoke` route — throwaway infrastructure that gets deleted the moment Phase 2 lands.

- **Unit tests:** skipped by user preference. `resolveLanguageId` is small and covered by the eventual E2E.
- **Component tests:** skipped for now — component only boots inside the services/extension stack, and vitest-in-jsdom can't run the extension-host worker.
- **Manual Phase 1 smoke (acceptance for moving on):** `pnpm dev:with-ext` against `galaxy-workflows-vscode` at the pinned commit (see Phase 3.1), visit a dev-only preview that mounts `<MonacoEditor :fileName="'sample.gxwf.yml'" ... />`, eyeball hover on `class:`.
- **Automated smoke lands post-Phase 2 + 1.7-swap** as a normal `gxwf-e2e` spec (`packages/gxwf-e2e/tests/monaco-hover.spec.ts`) consuming the standard `startHarness()`:
  - **Fixture delivery:** `.vsix` checked into (or staged into) `packages/gxwf-e2e/fixtures/galaxy-workflows.vsix` at a pinned commit. Copied into `packages/gxwf-ui/public/ext/` at build time by a small build step so gxwf-web serves it as a static asset. CI reproduces the `.vsix` from `EXT_COMMIT.md` (Phase 9A).
  - **Build-time wiring:** `VITE_GXWF_EXT_SOURCE=vsix:/ext/galaxy-workflows.vsix` set during the e2e `gxwf-ui build` (global-setup adjusts env). Production build does no `/@fs/` lookups.
  - **Test shape:** navigate to `/files/<format2-workflow-path>` after 1.7 swap replaces `EditorShell` in `FileView.vue`; wait for the `MonacoEditor` `ready` emit (expose via a `data-monaco-ready="true"` attribute when live); use `page.evaluate` to reach the global handle (to be added: `(window as any).__gxwfMonaco = { monaco, editor, model }` behind an `import.meta.env.DEV || VITE_GXWF_EXPOSE_MONACO` flag — enable the flag in the e2e build); position the cursor on `class:` via `editor.setPosition(...)`, invoke `editor.trigger("test", "editor.action.showHover", {})`, then assert the hover widget DOM (`div.monaco-hover`) contains `Format2 Schema` within a 5s timeout.
  - **Skip conditions:** if the fixture `.vsix` is missing (local dev without the fixture checked in), `test.skip()` with a clear message pointing at the CI workflow that produces it.
  - **Cache side-effect:** this same test exercises Phase 4.1 (IndexedDB cache populated on first hover) — add an assertion on `indexedDB.databases()` containing `galaxy-tool-cache-v1`.

---

## Phase 2 — Extension Source Indirection

**Status (2026-04-15):** 2.1–2.4 landed; simplified on 2026-04-15 to drop the `openvsx:` runtime browser loader and the in-browser `.vsix` unzip in response to the blob-URL cross-context fetch blocker (see `VS_CODE_MONACO_FIRST_E2E_DEBRIEF_1.md`). Both `folder:` and `vsix:` now resolve to a base URL and share one loader; unzip moved to the Node-side staging script. `openvsx:` is no longer a runtime concern — production servers unpack the extension at startup into the same `/ext/galaxy-workflows/` layout and point `vsix:` at it.

**2.1 — Resolver module** ✅ `packages/gxwf-ui/src/editor/extensionSource.ts`. Current shape:

```ts
export type ExtensionSource =
  | { kind: "folder"; path: string }   // dev — Vite /@fs against a live checkout
  | { kind: "vsix"; url: string };     // URL prefix of an unpacked-vsix directory

export function parseExtensionSource(spec: string | undefined): ExtensionSource;
export function loadExtensionSource(src: ExtensionSource): Promise<RegisterLocalExtensionResult>;
export function loadGalaxyWorkflowsExtension(): Promise<RegisterLocalExtensionResult>;
```

Spec format: `folder:/abs/path` | `vsix:/ext/galaxy-workflows` (relative to origin) or `vsix:https://host/path/to/dir` (absolute). Both forms point at a **directory of files reachable over HTTP**.

**2.2 — Wire `import.meta.env.VITE_GXWF_EXT_SOURCE`.** ✅ Default is `vsix:/ext/galaxy-workflows`, which resolves against the same origin gxwf-web serves from. A no-config Monaco build (`VITE_GXWF_MONACO=1`) requires that `public/ext/galaxy-workflows/` exists — staged by `scripts/stage-extension.mjs` from a contributor-supplied fixture, or by the production server at startup. No fixture → `stage-extension.mjs` no-ops and the Phase 1.7 error path falls back to `EditorShell`.

**2.3 — One loader, two shapes.** ✅ Both sources converge on a single `loadFromBase(baseUrl)` that fetches `package.json`, walks `contributes` + `browser` via `collectManifestFiles`, and registers each discovered file as `${baseUrl}/${rel}`. `folder:` sets `baseUrl = ${origin}/@fs${absPath}`; `vsix:` passes the URL through (prefixing origin if relative). The original in-browser `unzipSync` / blob-URL path was removed — unzip now happens once in `scripts/stage-extension.mjs` on prebuild/predev, writing files into `public/ext/galaxy-workflows/`. Server-side openvsx download at deploy time produces the same layout.

**2.4 — Settings plumbing.** ✅ `buildMonacoUserConfigFromEnv()` in `services.ts` reads four env vars and feeds `initUserConfiguration(...)` before `initialize(...)`:

| Variable | Configuration key |
|---|---|
| `VITE_GXWF_TOOLSHED_URL` | `galaxyWorkflows.toolShed.url` |
| `VITE_GXWF_TOOL_CACHE_PROXY_URL` | `galaxyWorkflows.toolCacheProxy.url` |
| `VITE_GXWF_CACHE_DB_NAME` | `galaxyWorkflows.cacheDbName` |
| `VITE_GXWF_VALIDATION_PROFILE` | `galaxyWorkflows.validation.profile` |

Not yet test-covered — E2E assertion that values reach `workspace.getConfiguration()` deferred to Phase 4+ integration work.

---

## Phase 3 — Dev Loop

**Status (2026-04-14):** 3.1–3.4 landed. Pinned `wf_tool_state` @ `5040bd5` in `packages/gxwf-ui/EXT_COMMIT.md`. `pnpm dev:with-ext` shipped as a Node driver (`scripts/dev-with-ext.mjs`) that validates `GXWF_EXT_PATH` and spawns `concurrently`. Watch-mode reload option (b) chosen (manual refresh, documented). README at `packages/gxwf-ui/README.md` covers clone, bump procedure, dev loop, local `.vsix` packaging, runtime env-var settings. Manual `dev:with-ext` smoke against the local extension checkout still TBD.

**3.1 — `EXT_COMMIT.md`** in `packages/gxwf-ui/`:

```
EXTENSION_REPO=https://github.com/davelopez/galaxy-workflows-vscode
EXTENSION_BRANCH=wf_tool_state   # or successor
EXTENSION_COMMIT=<sha>           # pinned
```

All dev environments, CI, contributor docs reference this. Bumps are deliberate, reviewed PRs.

**3.2 — `pnpm dev:with-ext` script** in `packages/gxwf-ui/package.json`. ✅ Shipped as a Node driver at `packages/gxwf-ui/scripts/dev-with-ext.mjs` (cleaner error reporting than an inline shell string). The driver:

- validates `GXWF_EXT_PATH` is set, expands `~`, checks the path contains a `galaxy-workflows` manifest with a `build:watch` script;
- invokes `pnpm exec concurrently -n ext,ui -c blue,green "pnpm -C <abs> run build:watch" "VITE_GXWF_EXT_SOURCE=folder:<abs> pnpm dev"`.

Plan-drift note: the spec in this document originally said `folder:$GXWF_EXT_PATH/client/dist`; that was incorrect — the extension root is the repo root (manifest, `workflow-languages/`, `server/` all live there), and the new `collectManifestFiles` walk resolves paths like `client/dist/web/extension.js` relative to it.

**3.3 — Watch-mode reload.** Vite HMR doesn't reload the extension host worker. Either: (a) tiny dev-only WS listener on the extension output dir that triggers `location.reload()`, or (b) document that devs hit refresh after extension rebuilds. Pick (b) for v1, revisit if it's painful.

**3.4 — README** additions in `packages/gxwf-ui/README.md`: clone procedure, `EXT_COMMIT.md` bump procedure, `pnpm dev:with-ext` usage, how to package a `.vsix` locally and switch to `vsix:` mode.

---

## Phase 4 — Tool Cache Wiring

**Status (2026-04-14):** 4.2 + 4.3 landed on `vs_code_integration`. Cache-DB-name settings plumbed in Phase 2.4; CORS fallback (`VITE_GXWF_TOOL_CACHE_PROXY_URL`) documented in `packages/gxwf-ui/README.md` under a new "Tool cache (browser mode)" section. 4.1 verification + 4.4 cache panel deferred.

The extension's browser inversify binding is already in place (`TYPES.CacheStorageFactory` → `() => new IndexedDBCacheStorage()`). Phase 4 just exercises the path end-to-end.

**4.1 — Verify cache populates on first hover.** ⏸ Deferred to the post-Phase-2 + 1.7-swap E2E (Phase 1 "Tests" block §171–184 already lists the IndexedDB assertion as a piggy-backed check on the hover smoke). No standalone automation — it would need the same FileView swap and `.vsix` fixture.

**4.2 — Per-origin DB name.** ✅ `galaxyWorkflows.cacheDbName` is surfaced via Phase 2.4's `VITE_GXWF_CACHE_DB_NAME` build-time env var. Default `galaxy-tool-cache-v1` stays.

**4.3 — Fetcher / CORS fallback.** ✅ README now documents direct-ToolShed fetch + the `VITE_GXWF_TOOL_CACHE_PROXY_URL` workaround when CORS blocks browser-origin GETs. The same section points at gxwf-web's `--csp-connect-src` flag so a proxy origin doesn't get rejected by CSP. Live CORS verification against `https://toolshed.g2.bx.psu.edu` still pending (requires running stack).

**4.4 — Dev-only cache panel.** ⏸ Optional per original plan; skipped for now. Revisit if Phases 5–7 debugging makes it painful.

**4.5 — Pre-warm:** out of scope for v1. Tracked as 9C.

---

## Phase 4.5 — CSP Headers on gxwf-web

**Status (2026-04-14):** Landed on `vs_code_integration`. CSP emitted on every static response from `serveStatic()` in `packages/gxwf-web/src/router.ts` via `buildCspHeader(extraConnectSrc)`. `CreateAppOptions.extraConnectSrc: string[]` and a repeatable `--csp-connect-src <origin>` CLI flag thread per-deployment tool-cache-proxy / ToolShed-mirror origins into `connect-src`. Test coverage in `packages/gxwf-web/test/static.test.ts`. No CSP-violation smoke yet — slotted to land with the Phase 1 hover smoke once `FileView` swaps to `MonacoEditor`.

Baseline header shape (as implemented):

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'wasm-unsafe-eval';
  worker-src 'self' blob:;
  frame-src 'self' blob:;        # extension host iframe spawned via createObjectURL
  connect-src 'self' https://toolshed.g2.bx.psu.edu <extraConnectSrc…>;
  style-src 'self' 'unsafe-inline';
  font-src 'self' data:;
  img-src 'self' data:;
```

`unsafe-inline` for styles required by monaco-vscode-api's inline theme injection (audit nonce-based later). `wasm-unsafe-eval` needed by some textmate engines. `connect-src` does not include `blob:`/`data:` — since the 2026-04-15 Phase 2 simplification, extension files are fetched over plain HTTP and no cross-context blob URL is produced. `open-vsx.org` is no longer allow-listed because the browser never hits it; production servers fetch it Node-side at startup.

Header is sent unconditionally on static responses (HTML, JS, CSS, assets). Confining to `text/html` only provides no benefit — subresource loads happen in the browsing context of the document whose CSP already applies — and keeps the middleware simple.

**Open items on 4.5:**
- Smoke test: load Monaco tab against gxwf-web with CSP enabled, fail if console reports any CSP violation. Land alongside the Phase 1 hover smoke.
- Decide whether to auto-derive `extraConnectSrc` from configured `sources[].url` (tool-cache-proxy wiring) — currently flag-only.

---

## Phase 5 — CSS Audit

**Status (2026-04-16):** 5.1, 5.2, 5.3, 5.4 done modulo a light-theme follow-up. Decisions and tooling consolidated in commits `e85f650` (regression + inventory specs), `092ce9c` (architecture/dev docs), and a follow-up commit on `vs_code_integration` that lands `src/editor/theme.ts` + the font probe.

**5.1 — Inventory conflicts.** ✅ `packages/gxwf-e2e/tests/_inventory-monaco-css.spec.ts` is the standing inventory tool (`GXWF_E2E_INVENTORY=1` to run). Latest report at `packages/gxwf-e2e/.inventory/REPORT.md`: zero computed-style drift on Dashboard probes (body, h1, refresh-button, list-frame, directory-path) before vs. after Monaco mount; +4 PrimeVue lazy-load sheets and 7 `data-vscode="true"` Monaco sheets, all `.monaco-*` / `.codicon-*` scoped. Screenshots confirm Dashboard / WorkflowView are unchanged after Monaco loads.

**5.2 — Scope monaco-vscode-api styles to the editor container.** ✅ **Decision (2026-04-15): no scoping wrapper required today.** The inventory shows monaco-vscode-api's injected stylesheets are already prefix-scoped at source (no `*`, `html`, `body`, `:root`, or bare element selectors leak from `data-vscode` sheets). Wrapping in shadow DOM or `@layer monaco` would be overhead with no benefit at the current `monaco-vscode-api@30.0.1` + pinned-extension state.

The shadow-DOM / `@layer` paths remain documented as the response if a future bump regresses this — `packages/gxwf-e2e/tests/monaco-css-scoping.spec.ts` is the standing regression guard (runs in normal CI, fails the build if any newly-added non-PrimeVue stylesheet introduces a globally-reaching selector). Failure message walks the responder through the fix without needing this plan as reference. Phase 9D ("shadow DOM finalization if Phase 5 went the layer route") is now N/A unless the regression guard fires.

**5.3 — Theme.** ✅ Superseded by the holistic theme overhaul (see `THEME_OVERHAUL_PLAN.md`, landed 2026-04-16). Brand identity is now owned by two first-class VS Code color themes — `gxwf-dark` and `gxwf-light` — contributed through a synthetic extension (`packages/gxwf-ui/src/editor/themesExtension.ts`). The decorative `workbench.colorCustomizations` layering and the `MonacoEditor.vue` `theme` prop are gone.

Implementation note: monaco-vscode-api does **not** support standalone `monaco.editor.defineTheme` (throws `defineTheme is not a function` from the workbench theme service shim). Themes must be contributed via an extension manifest's `contributes.themes` entry, and selected via the `workbench.colorTheme` user-config setting. `services.ts` seeds that setting from the `dark` class on `<html>` at boot; `themeSync.ts` observes the class and pushes `updateUserConfiguration(...)` when the user flips the app's dark-mode toggle.

**5.4 — Fonts.** ✅ Verified by extension to `monaco-css-scoping.spec.ts`: probes `.monaco-editor` and `.monaco-editor .view-lines` computed `font-family` after Monaco mounts, asserts neither resolves to a family containing `Atkinson Hyperlegible` (the body brand font, which would destroy column alignment if it leaked in). Premise is also asserted (body still uses Atkinson Hyperlegible) — if the brand font ever moves, the test self-flags rather than silently passing.

The pinned `galaxy-workflows-vscode` extension contributes no fonts (CSS contributions are only TextMate grammars and language configs — no `@font-face` and no `font-family` rules in the staged `public/ext/galaxy-workflows/` directory). Standing guard catches any future regression on either side.

---

## Phase 5.5 — Editor Toolbar

**Status (2026-04-16):** Landed on `vs_code_integration`. Details in `VS_CODE_MONACO_FIRST_PLAN_V2_PHASE_5_5.md`.

Pure custom Vue toolbar above the Monaco host inside `FileView.vue`. Surfaces Save (delegates to `FileView.onSave` — same handler ⌘S will hit in Phase 6.2), Undo/Redo (polled from `model.canUndo()` / `canRedo()` on `onDidChangeContent`), Format Document (hidden when no formatter provider is registered), Find, Command Palette, and a Problems badge bound to `useEditorMarkers` (LSP diagnostics; click runs `editor.action.marker.next`; danger-colored on errors).

`MonacoEditor.vue` now exposes `{ editor, model, ready }` via `defineExpose`; `FileView.vue` forwards those into `<EditorToolbar>` and renders it only when `monacoEnabled && !monacoFailed && editor`. The `EditorShell` textarea fallback path is untouched.

Tests: unit tests for `useEditorMarkers` in `packages/gxwf-ui/test/composables/useEditorMarkers.test.ts` (5 cases — count, URI scoping, model re-subscription, `jumpToNext`, dispose). E2E in `packages/gxwf-e2e/tests/monaco-toolbar.spec.ts` covering Problems badge on a broken format2 fixture, palette, find, undo, and a save-triggered `PUT /api/contents` — gated by the `GXWF_E2E_MONACO=1` `.vsix` fixture.

Deferred: Problems popover (list-view of markers) — tracked as 9J below; re-visit if the count-only badge feels insufficient.

## Phase 6 — Keybindings

**Status (2026-04-20):** Landed on `vs_code_integration` across commits `b9600b3` (core) and `3e4c06e` (e2e expansion + palette-button fix + lifecycle fix). `make check` + `make test` + Monaco e2e suite green (16 unit + 9 e2e).

**6.1 — Audit `contributes.keybindings`.** ✅ Extension at pinned commit contributes zero keybindings (only commands, languages, grammars, menus). No upstream PRs needed.

**6.2 — Ctrl+S / Cmd+S.** ✅ `packages/gxwf-ui/src/editor/saveCommand.ts` stacks a handler on `workbench.action.files.save` via `CommandsRegistry`. Registration lives in `MonacoEditor.vue`'s `onMounted`, before the ready marker flips — so tests (and fast humans) never race past it. `MonacoEditor` takes an `onSave` prop; `FileView` passes `() => onSave()`, so toolbar button + keybinding share one code path.

**6.3 — Preserve browser shortcuts.** ✅ Trivially satisfied given 6.1 — nothing in the extension binds Ctrl+T/W/Shift+I/F5, and the workbench's defaults don't reach browser-reserved shortcuts. Left as a review rule in the README (see 6.5).

**6.4 — Tests.** Converted from the originally-planned vitest `keybindings.test.ts` to e2e (user call: "swap those planned unit tests out for more E2E tests"). Lives in `packages/gxwf-e2e/tests/`:
- `monaco-toolbar.spec.ts` — toolbar save button + `workbench.action.files.save` via ICommandService both produce `PUT /api/contents`.
- `monaco-keybindings.spec.ts` — F1 opens command palette, palette lists Galaxy Workflows commands (filter by category), Ctrl+Space opens the suggest widget.
- Unit side: `packages/gxwf-ui/test/editor/saveCommand.test.ts` (5 cases) — stack shadowing, dispose-restores, async tolerance.

**6.5 — Document the contract.** ✅ `packages/gxwf-ui/README.md` §"Keybinding contract for the embedded extension": any future `contributes.keybindings` must declare `when: editorFocus`/`editorTextFocus`.

### Side effects / bugs surfaced during Phase 6

- **Toolbar Command Palette button was a no-op pre-merge.** `editor.action.quickCommand` is not an editor-level action under monaco-vscode-api; the palette is `workbench.action.showCommands` on the workbench. Fixed via new `src/editor/commandPalette.ts` (ICommandService.executeCommand). E2E revealed this — unit tests didn't exercise the button end-to-end.
- **Raw `Meta+S` via Playwright keyboard is flaky** under chromium-headless (the browser shell can intercept). Our 6.4 save test exercises the ICommandService path, which is the same code the keybinding dispatcher reaches once a keypress resolves. Good enough for regression coverage; revisit if a dispatcher-side regression slips through.
- **`page.keyboard.type` vs. Monaco's hidden textarea is timing-sensitive** in this embed — the extension-host worker's key dispatch can swallow individual keys. E2E tests that need to dirty the buffer now use `editor.executeEdits(...)` instead of keyboard typing.

---

## Phase 7 — v1 Feature Surface

**Ships day one:** syntax highlighting, hover, completion, diagnostics (LSP markers), find/replace, format document (if extension registers it), command palette scoped to editor.

**Explicitly NOT v1:** multi-file/workspace, file explorer, source control, custom views/webviews, task running, debug.

`OperationPanel` continues displaying full validate/lint/clean/roundtrip reports via gxwf-client. Some overlap with LSP diagnostics is accepted.

---

## Phase 8 — Server-side Open VSX Unpack

Once `wf_tool_state` (or successor) merges and publishes to Open VSX:

1. Update `EXT_COMMIT.md` to point at the merged commit.
2. Add a server-side step (in `gxwf-web` startup, or a deploy-time hook) that downloads the pinned `.vsix` from Open VSX and unpacks it into the served `/ext/galaxy-workflows/` directory. Reuses the same logic shape as `scripts/stage-extension.mjs` — pull + unzip, write to a served directory.
3. Keep `VITE_GXWF_EXT_SOURCE` default at `vsix:/ext/galaxy-workflows`. Prod builds unchanged from preview builds at the browser layer.
4. Pin the Open VSX version at the server layer (env var or config). Bumps are deliberate PRs that update `EXT_COMMIT.md` and the server pin together.
5. CI check: the pinned Open VSX version still resolves at deploy time.

The browser never talks to open-vsx.org. No runtime `openvsx:` loader, no open-vsx.org entry in CSP.

---

## Phase 9 — Later Iterations (Loose)

- **9A — Preview pipeline.** CI builds extension at pinned commit, runs gxwf-ui suite against `.vsix`, publishes preview deploy + `.vsix` artifact.
- **9B — Tighter LSP ↔ OperationPanel integration.** Possibly: panel subscribes to LSP diagnostic stream, dedupes against gxwf-client output.
- **9C — Pre-warm cache from bundled JSON of top-N tools.**
- **9D — Shadow DOM finalization** if Phase 5 went the layer route.
- **9E — Extension-side commands via `commands.executeCommand(...)`** instead of gxwf-web round-trips.
- **9F — Multi-file** (defer; revisit if gxwf-ui grows multi-file editing).
- **9G — Read-only embed mode** for IWC listings / docs.
- **9H — Running list of small upstream PRs** as Phase 1+ surface them.
- **9I — Light-mode Monaco theme.** ✅ Done 2026-04-16 via `THEME_OVERHAUL_PLAN.md`. `gxwf-dark` / `gxwf-light` themes contributed through a synthetic extension; active theme tracks the dark-mode toggle through the workbench configuration service.
- **9J — Problems popover.** List-view of markers (file, line, message) driven by `monaco.editor.getModelMarkers()`. Deferred from Phase 5.5; revisit if the count-only badge feels insufficient once diagnostics traffic picks up.

---

## Test Strategy

| Phase | Type                                                                                   | Where                                                                                                          |
| ----- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 1     | Manual `pnpm dev:with-ext` eyeball smoke only — automated smoke deferred               | —                                                                                                              |
| 1+2   | LSP hover smoke (post-1.7-swap, via `vsix:` fixture); doubles as Phase 4.1 cache check | `packages/gxwf-e2e/tests/monaco-hover.spec.ts`                                                                 |
| 2     | Unit — source spec parser, loader dispatch                                             | `packages/gxwf-ui/test/editor/`                                                                                |
| 3     | Manual — dev loop smoke                                                                | README                                                                                                         |
| 4     | Integration — hover hits IndexedDB                                                     | same                                                                                                           |
| 4.5   | CSP smoke — no console violations                                                      | same                                                                                                           |
| 5     | Visual regression — Playwright screenshots                                             | `packages/gxwf-ui/test/visual/`                                                                                |
| 5.5   | Unit — `useEditorMarkers`; E2E — problems badge, palette, find, undo, save PUT         | `packages/gxwf-ui/test/composables/useEditorMarkers.test.ts`, `packages/gxwf-e2e/tests/monaco-toolbar.spec.ts` |
| 6     | Unit — saveCommand register/dispose/stack; E2E — workbench save routes to onSave, F1 palette, palette lists GW commands, Ctrl+Space suggest | `packages/gxwf-ui/test/editor/saveCommand.test.ts`, `packages/gxwf-e2e/tests/monaco-toolbar.spec.ts`, `packages/gxwf-e2e/tests/monaco-keybindings.spec.ts` |
| 7     | E2E — feature smoke per bullet                                                         | same                                                                                                           |
| 8     | CI — Open VSX resolution check                                                         | `.github/workflows/`                                                                                           |

Red-to-green per phase: failing test expressing the acceptance, then implementation.

---

## Dependencies Added

| Package | Phase | Notes |
|---|---|---|
| `@codingame/monaco-vscode-*` (12 packages) | 1 | Pinned exact, same version |
| `monaco-editor` (alias) + `vscode` (alias) | 1 | Aliases, not real packages |
| `reflect-metadata` | 1 | For inversify in extension host |
| `fflate` | 2 | `.vsix` unpack — **devDependency** since 2026-04-15; used only by `scripts/stage-extension.mjs` at build time, not shipped in the browser bundle |
| `concurrently` | 3 | dev script |
| `Playwright` | 5, 6 | If not already present |

No new prod deps on the galaxy-tool-util side. `IndexedDBCacheStorage` already in `@galaxy-tool-util/core`.

---

## Migration & Compatibility

- gxwf-ui without Monaco: feature flag `galaxyWorkflows.ui.monacoEditor.enabled`, default off until Phase 8 ships. Textarea `EditorShell` fallback.
- Desktop VS Code: unaffected.
- gxwf-web (backend): unaffected. No API changes.

---

## Risks (Live)

| Risk | Mitigation |
|---|---|
| Bundle size blows past tolerance | Audit overrides; lazy-load editor tab so dashboard isn't penalized. |
| CSS bleed breaks PrimeVue | Phase 5 shadow-DOM preferred path. CSS-layer fallback. |
| Ctrl+S / keybinding collisions ship unnoticed | Phase 6.4 tests are the gate. Don't ship without them green. |
| Open VSX publishing of target extension stalls | Phase 8 deferred; `vsix:` mode (fixture-driven, or contributor-supplied server-side unpack from any source) is production-viable indefinitely. |
| IndexedDB quota pressure on low-end devices | Cache-size inspection UI (4.4) + "clear cache" button. |
| `@codingame/monaco-vscode-api` major version drift | Pin exact (no caret); `pnpm up` is a deliberate PR. Lock in `EXT_COMMIT.md` or sibling. |
| `@galaxy-tool-util/schema` pulls Effect into LS bundle (size) | Measure in Phase 1. If >2 MB/worker, evaluate Effect tree-shaking or lazy grammar loading. |
| ToolShed CORS blocks browser fetch | Document `galaxyWorkflows.toolCacheProxy.url` fallback; surface in Phase 4.3. |

---

## Open Questions

1. Ctrl+S target — editor command dispatch or gxwf-ui save handler? *(Lean: gxwf-ui save handler.)*
2. Where does `EXT_COMMIT` live — gxwf-ui `README.md`, top-level constants file, or renovate-style metadata?
3. Custom theme authoring — who owns the visual design pass?
4. Open VSX version pinning (server-side, per Phase 8) — exact, caret, or `latest`? *(Lean: exact, deliberate bumps.)*
5. Pre-warm cache bundle — yes/no for v1, or defer to 9C? *(Lean: defer.)*
6. Visual regression infra — add Playwright, or reuse existing tooling?
7. Iframe-HTML delivery — postinstall script vs. dedicated Vite plugin? *(Either works; pick simpler.)*
