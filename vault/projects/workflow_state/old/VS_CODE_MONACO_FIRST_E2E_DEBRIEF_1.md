# VS Code → Monaco E2E: Debrief 1

**Date:** 2026-04-14
**Branch:** `vs_code_integration` (galaxy-tool-util-ts)
**Companion:** `VS_CODE_MONACO_FIRST_E2E_PLAN.md`
**Status:** Phase-1 landed + 2 Monaco specs authored; boot spec boots live, hover spec blocked on an upstream integration issue.

## Where to start next session

**Open with:** `packages/gxwf-ui/src/editor/extensionSource.ts` + the extension host iframe (`packages/gxwf-ui/public/monaco/webWorkerExtensionHostIframe.html`).

The live blocker is that the extension host (running inside the monaco-vscode-api iframe at `/monaco/webWorkerExtensionHostIframe.html`) cannot `fetch` the `blob:` URLs that the `vsix:` loader produces in the parent window. Console from the last failing run:

```
ext-host fetch threw blob:http://127.0.0.1:.../<uuid> Failed to fetch
Activating extension 'davelopez.galaxy-workflows' failed: Failed to fetch
Client Galaxy Workflows (galaxyworkflow): connection to server is erroring.
```

CSP is already permissive enough (we verified — `connect-src` allows `blob:` in both the main CSP and the iframe's meta CSP after our patches). The failure is a blob-lifetime / cross-context issue: blob URLs created via `URL.createObjectURL` in window A aren't always retrievable from a worker launched in iframe B, even same-origin. Chrome has been tightening this.

**Two candidate fixes, listed in order of preference:**

1. **Stop using `blob:` for extension files.** Change `loadFromFiles` in `extensionSource.ts` to register files via `data:` URLs (base64) for small files and a static in-memory cache for larger ones. `registerFileUrl(rel, dataUrl)` should work regardless of which context does the fetch. Trade-off: data: URLs are larger on the wire but irrelevant for an in-process extension.
2. **Stage the `.vsix` unpacked.** `scripts/stage-extension.mjs` could unzip the `.vsix` into `public/ext/galaxy-workflows/` and we register files as ordinary HTTP paths. Simplest, highest-fidelity to what the extension was built for, but requires an extra build step and a directory-listing source (already the `folder:` loader's job — just need to unify).

Either fix should let `monaco-hover.spec.ts` go green and re-enable LSP.

**Also retry first:** `monaco-boot.spec.ts` wasn't re-run after the registerFileSystemOverlay fix landed — it should now pass end-to-end. If it does, that's the evidence the CSP + init work actually unblocks boot; record that before diving into the blob issue.

## What landed

Commit on `vs_code_integration`:

| Area | File | Change |
|---|---|---|
| CSP | `packages/gxwf-web/src/router.ts` | New `buildMonacoCspHeader` for `/monaco/*` paths (inline+eval scripts allowed); main CSP `connect-src` now includes `blob:` + `data:` |
| Monaco iframe | `packages/gxwf-ui/scripts/copy-monaco-iframe.mjs` | Patches the staged iframe's meta CSP to add `blob:` to `connect-src` |
| Services | `packages/gxwf-ui/src/editor/fileSystem.ts` | `registerCustomProvider` → `registerFileSystemOverlay` (post-init-safe) |
| Routing | `packages/gxwf-ui/src/views/FileView.vue` | Reads `:path` route param, syncs URL ↔ selection |
| E2E harness | `packages/gxwf-e2e/src/global-setup.ts` | Detects `packages/gxwf-ui/fixtures/galaxy-workflows.vsix`; sets `VITE_GXWF_MONACO=1` / `VITE_GXWF_EXT_SOURCE=vsix:/ext/galaxy-workflows.vsix` / `VITE_GXWF_EXPOSE_MONACO=1` for the child build; exports `GXWF_E2E_MONACO=1` to the test process |
| E2E helpers | `packages/gxwf-e2e/src/monaco.ts`, `src/locators.ts` | `waitForMonaco`, `getMonacoValue`, `typeInMonaco`, `triggerHoverAt`, `collectCspViolations`, `openFileViaUrl`, `MONACO_ENABLED`, `SKIP_REASON`, `Monaco` locator object |
| E2E specs | `tests/monaco-boot.spec.ts`, `tests/monaco-hover.spec.ts` | Self-skip via `GXWF_E2E_MONACO`; boot spec covers Phases 1/2/4.5 (editor count, language id, CSP cleanliness, leak check); hover spec covers Phases 1/2/4 (trigger `editor.action.showHover` on `class:`) |
| Docs | `packages/gxwf-e2e/README.md` | Fixture recipe restated |

`make check` green, `gxwf-web` vitest green (88 tests), existing Playwright e2e suite green (7 tests). Monaco specs self-skip on fresh clones.

## Lessons learned

### What the plan got right

- **Opt-in by fixture presence was the right call.** Default builds stay Monaco-free; the fixture acts as the implicit gate for an otherwise-heavy integration. No CI orchestration needed, matching the constraint.
- **`window.__gxwfMonaco` handle + `data-monaco-ready` attribute** made the test surface cheap. The helper `waitForMonaco` is ~4 lines and durable.
- **`test.skip(!MONACO_ENABLED)` at import time** is noisier than a runtime guard but makes the skip reason legible in every `--list` output, which is what contributors actually read.

### What the plan underestimated

- **Phase 4.5 CSP wasn't "open"; it was "unstarted".** The V2 plan called Phase 4.5 "open item: needs CSP hardening." The E2E plan's `collectCspViolations` helper assumed the CSP was *mostly* right and we just needed a harness to catch regressions. In practice the starting CSP was strict enough to block Monaco entirely, and we discovered that only when the first spec went red. Future phases with "open item" tags should be treated as unshipped dependencies, not aspirational checks.
- **monaco-vscode-api 30.x init semantics aren't in the integration docs.** `registerCustomProvider` throws post-init, `registerFileSystemOverlay` is the safe variant, the `.d.ts` docstring for the former doesn't mention this. The Phase 1.x service wiring commit predated this behavior change (or it changed upstream without anyone noticing). There's no test in `gxwf-ui` that exercises mount → initialize → register — only unit tests of the config builder. **A vitest that mounts MonacoEditor in jsdom with mocked workers would have caught this the moment the package versions moved.**
- **FileView's route-param wiring was missing and nobody noticed** because no test or manual flow opened a nested file. The test plan assumed the tree worked as a navigation primitive; the tree only returns one-level children from `/api/contents` and `FileBrowser` doesn't lazy-load. This is a legitimate UX bug that the E2E surfaced incidentally.

### What went wrong mechanically

- **Error messages were load-bearing but misleading.** "Services are already initialized" sounded like a double-init race; the real cause was a `t8e()` guard that throws *when services ARE initialized* and is called by `registerCustomProvider` / `registerFile` as a pre-init-only check. Reading the minified bundle to locate `t8e` was the thing that unstuck me. If I'd treated the error text literally without bundle spelunking I'd have landed a useless try-catch (which I did, first pass).
- **Cascading CSP failures.** Each CSP fix revealed the next. Order of discovery:
    1. `script-src` blocked inline in `/monaco/*` iframe → added monaco-specific CSP.
    2. `connect-src` (main page) blocked `blob:` → widened main CSP.
    3. `connect-src` (iframe meta) blocked `blob:` → patched the staged HTML.
    4. Blob URL cross-context fetch failure → still open.
  Each round required a rebuild of both `gxwf-web` and `gxwf-ui`, because the harness's `global-setup` triggered a build each run *but* the `gxwf-web` package is consumed via `dist/` (not `src/`). **`pnpm --filter @galaxy-tool-util/gxwf-web build` must be run after any `router.ts` change before the next e2e run.** This wasn't obvious and cost several cycles.
- **`GXWF_E2E_SKIP_UI_BUILD=1` skips the UI rebuild but doesn't skip the web rebuild — because the web package isn't in the harness's build step at all.** Easy footgun: editing `router.ts` and forgetting to rebuild gxwf-web made the browser think the CSP fix didn't work.

### Concrete harness improvements for the next session

1. **Have `global-setup.ts` build `gxwf-web` too** (or fail loudly if `gxwf-web/dist/router.js` is older than `gxwf-web/src/router.ts`). The harness currently only builds `gxwf-ui`.
2. **Add a `monaco:probe` dev target** — a throwaway page that mounts `MonacoEditor` standalone and dumps `window.__gxwfMonaco`, loaded extensions, and recent console errors to the DOM. Useful for diagnosing integration issues without running Playwright at all.
3. **Add a vitest integration spec** (`packages/gxwf-ui/test/editor/mount.test.ts`) that mounts `MonacoEditor` in jsdom with worker/monaco-env shims and asserts the mount-to-ready path. This would have caught the `registerCustomProvider` regression before the E2E spec surfaced it.
4. **Treat `V2 §<phase>` "open item" tags as gates on E2E landing order.** Don't write a spec whose dependency is an open item; file the open item as a blocker task first.

## Unresolved questions (to flag before next session)

1. For the blob fetch fix: is the project willing to ship data: URLs (larger bundle, simpler code) or do we want the staged-vsix-extract approach (more code, closer to upstream `folder:` loader)?
2. Should `gxwf-web`'s `global-setup` now build `gxwf-web` too, or should the `@galaxy-tool-util/gxwf-web` package switch to importing `src/` directly in dev (no dist step for e2e)?
3. `monaco-fallback.spec.ts` — the user already said to skip this; debrief-worthy because the plan's §109 "second Playwright project" machinery is non-trivial and we'd want to avoid building it in parallel with the blob fix. Defer or drop.
4. Are the CSP widenings shippable as-is (blob:/data: in main connect-src) or do we want a stricter variant gated behind `VITE_GXWF_MONACO=1` at the server level? Current impl is unconditional.
