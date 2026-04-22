# VS Code → Monaco E2E Test Plan

**Date:** 2026-04-14
**Companion to:** `VS_CODE_MONACO_FIRST_PLAN_V2.md`
**Scope:** extend `packages/gxwf-e2e/` to cover the Monaco integration work shipped across Phases 1–4.5 + the Phase 1.7 opt-in landing (commit `c29ba5f`).

The prereq block from earlier drafts is gone — Phase 1.7 is now live on `vs_code_integration`. What remains is fixture plumbing, specs, and harness tweaks.

---

## Status (2026-04-15)

**Landed and green (10 tests, ~10s):**
- Harness fixture detection + skip guard (F1/F2/F3).
- `packages/gxwf-e2e/src/monaco.ts` helpers + `locators.ts` `Monaco` block + `waitForLspReady` (H1/H2/H3/H4).
- `monacoHarnessSuite(name, body)` + `getModelMarkers` / `waitForMarkers` + `blockExtensionLoad` helpers added post-review; specs collapsed to their bodies.
- `monaco-boot.spec.ts` — boot + CSP + nav-away-and-back.
- `monaco-hover.spec.ts` — LSP hover on `class:` in format2.
- `monaco-fallback.spec.ts` — warn banner + EditorShell + save round-trip. Uses route-intercept of `/ext/galaxy-workflows/package.json` instead of the plan's rebuild-with-bad-env approach — same failure signal, no second build.
- `monaco-language-detection.spec.ts` — table-driven `.ga`, `.gxwf.yml`, `-tests.yml`, `-tests.gxwf.yml` (precedence edge).
- `monaco-diagnostics.spec.ts` — broken-format2 fixture → ≥1 error marker via `waitForMarkers`.

**Gotchas uncovered in shakedown (keep for the next agent):**

1. **`.vsix` must be rebuilt against the pinned upstream commit.** The original 0.5.0 fixture bundled an older `@galaxy-tool-util/core` whose universal entry pulled in `fs`/`os`/`path`/`crypto`, causing `require is not defined` in the extension host worker and a silent LSP failure. Rebuild from the companion `galaxy-workflows-vscode` worktree at the sha in `EXT_COMMIT.md`:
   ```
   cd <galaxy-workflows-vscode worktree>
   npm run compile
   npx @vscode/vsce package --no-dependencies --out <dest>.vsix
   cp <dest>.vsix packages/gxwf-ui/fixtures/galaxy-workflows.vsix
   ```
   Verify the web bundle has no Node-builtin requires before packaging:
   ```
   grep -cE 'require\("(fs|os|path|crypto|fs/promises)"\)' \
     server/*/dist/web/*.js
   ```
   Expected: all zeros.

2. **`VITE_GXWF_EXT_SOURCE` default wins.** Earlier global-setup override (`vsix:/ext/galaxy-workflows.vsix`) had a stray `.vsix` suffix and broke loading. The default spec (`vsix:/ext/galaxy-workflows`) matches `stage-extension.mjs` output — don't override unless the staged layout changes.

3. **LSP startup is async.** `waitForMonaco` completes before the extension's LSP client finishes handshaking, so `editor.action.showHover` returns empty on the first pass. Specs that exercise LSP providers (hover, diagnostics, completion) must `await waitForLspReady(page)` — arm it *before* navigation so the "server is ready" console event isn't missed.

## How to run

```bash
# From the repo root, with fixture already staged:
pnpm --filter @galaxy-tool-util/gxwf-e2e exec playwright test \
  tests/monaco-boot.spec.ts tests/monaco-hover.spec.ts

# Skip the ui build on iteration (reuses dist/):
GXWF_E2E_SKIP_UI_BUILD=1 pnpm --filter @galaxy-tool-util/gxwf-e2e \
  exec playwright test tests/monaco-hover.spec.ts
```

Without `packages/gxwf-ui/fixtures/galaxy-workflows.vsix`, Monaco specs self-skip; default suite stays green.

---

## What already landed (prereqs, done)

| Item | Location |
|---|---|
| Opt-in build flag `VITE_GXWF_MONACO=1` | `packages/gxwf-ui/src/views/FileView.vue` |
| `defineAsyncComponent` gated Monaco import | `FileView.vue` |
| Visible warn banner on ext-load error, EditorShell fallback | `FileView.vue` |
| `window.__gxwfMonaco = { monaco, editor, model }` handle | `packages/gxwf-ui/src/components/MonacoEditor.vue` |
| `data-monaco-ready="true"` attribute on host div | same |
| Handle/attribute gated by `DEV || VITE_GXWF_EXPOSE_MONACO=1` | same |
| `scripts/stage-extension.mjs` — copies `fixtures/galaxy-workflows.vsix` → `public/ext/` on prebuild/predev, rmSync-if-stale | `packages/gxwf-ui/scripts/` |
| `.env.local.example` with the activation recipe | `packages/gxwf-ui/.env.local.example` |
| `fixtures/` + `public/ext/` gitignored | `packages/gxwf-ui/.gitignore` |

Default builds are Monaco-free (849 KB) and byte-equivalent to pre-1.7 behavior.

---

## Fixture plumbing (the only real prereq left)

**F1 — Build-once recipe documented.** `.env.local.example` points at the steps; restate in `packages/gxwf-e2e/README.md` so contributors running specs don't bounce between docs:

```
1. Clone galaxy-workflows-vscode at the sha in packages/gxwf-ui/EXT_COMMIT.md.
2. `pnpm install && pnpm build`.
3. `npx @vscode/vsce package --no-dependencies` → galaxy-workflows-<ver>.vsix.
4. Copy to packages/gxwf-ui/fixtures/galaxy-workflows.vsix.
```

Not committed; not CI-built (user called that out explicitly). Fixture presence is the opt-in signal for the whole E2E-Monaco suite.

**F2 — Harness env plumbing.** `packages/gxwf-e2e/src/global-setup.ts` currently runs an unconditional `pnpm --filter @galaxy-tool-util/gxwf-ui build`. Change:

- At setup time, check `packages/gxwf-ui/fixtures/galaxy-workflows.vsix`. If absent, proceed with the existing default build — Monaco specs will self-skip (F3).
- If present, set three env vars in the child build's environment:
  ```
  VITE_GXWF_MONACO=1
  VITE_GXWF_EXT_SOURCE=vsix:/ext/galaxy-workflows
  VITE_GXWF_EXPOSE_MONACO=1
  ```
  `scripts/stage-extension.mjs` runs as `prebuild`/`predev` and **unzips** the `.vsix` into `public/ext/galaxy-workflows/` (post-2026-04-15 simplification — no in-browser unzip, no blob URLs). No extra copy logic needed in the harness.
- Also build `@galaxy-tool-util/gxwf-web` from setup (debrief §"harness improvements" #1) — current harness builds only `gxwf-ui`, but `router.ts` CSP edits require a `gxwf-web` rebuild to take effect and that's been a footgun.
- Expose a setup-time boolean (`process.env.GXWF_E2E_MONACO = "1"` or a tiny JSON file under `packages/gxwf-e2e/.monaco-enabled`) so specs can cheaply read it at import time without reading the filesystem every test.

**F3 — Conditional skip in every Monaco spec.**

```ts
import { test } from "@playwright/test";
const MONACO = process.env.GXWF_E2E_MONACO === "1";
test.skip(!MONACO, "Set up packages/gxwf-ui/fixtures/galaxy-workflows.vsix — see packages/gxwf-e2e/README.md");
```

Drop that at the top of each `monaco-*.spec.ts`. Default CI / fresh-clone runs stay green by skipping.

---

## Harness additions

**H1 — `packages/gxwf-e2e/src/monaco.ts`** (landed) — shared helpers, reused across all Monaco specs:

```ts
export async function waitForMonaco(page: Page, timeout = 15_000): Promise<void>;
export async function waitForLspReady(page: Page, timeout = 20_000): Promise<void>;
export async function getMonacoValue(page: Page): Promise<string>;
export async function typeInMonaco(page: Page, text: string): Promise<void>;
export async function triggerHoverAt(page: Page, line: number, column: number): Promise<void>;
export function collectCspViolations(page: Page): { violations: string[]; assertClean(): void };
export async function openFileViaUrl(page: Page, baseUrl: string, relPath: string): Promise<void>;
```

Thin wrappers over `page.locator('[data-monaco-ready="true"]').waitFor(...)`, `page.evaluate(() => window.__gxwfMonaco.editor.getValue())`, and `page.waitForEvent("console", ...)` for the LSP ready log.

**H2 — `packages/gxwf-e2e/src/locators.ts`** — add:

```ts
export const Monaco = {
  readyHost: "[data-monaco-ready='true']",
  hoverWidget: "div.monaco-hover",
  suggestWidget: ".suggest-widget",
  quickInput: ".quick-input-widget",
  failureBanner: "text=/Monaco editor failed to load/",
} as const;
```

**H3 — CSP-violation collector.** Small helper (optionally in `monaco.ts`) that attaches `page.on("pageerror")` + a console filter for `Content Security Policy`. Called from `beforeEach` in the boot spec; asserts empty in `afterEach`. Covers Phase 4.5's open item (§295 of the main plan).

**H4 — `window.__gxwfMonaco` type shim.** Add a `.d.ts` under `packages/gxwf-e2e/src/` so specs can `page.evaluate` with types. Keep it there (not in gxwf-ui src) to avoid leaking test-only types into the shipping bundle.

---

## Specs (under `packages/gxwf-e2e/tests/`)

Each file starts with the F3 skip guard. Landing order matches increasing complexity.

**1. `monaco-boot.spec.ts`** — Phases 1, 2, 4.5. **LANDED / GREEN.**
- Navigate to `/files/<format2 fixture>.gxwf.yml`, click the file.
- `waitForMonaco` (≤15s).
- Assert `getEditors().length === 1`; model language is `gxformat2`.
- No CSP violations captured during the flow.
- Navigate away → back → editor count returns to 1; no orphan disposables.

**2. `monaco-fallback.spec.ts`** — Phase 1.7 error path. **LANDED / GREEN.**
- Implementation route: `page.route("**/ext/galaxy-workflows/package.json", r => r.fulfill({status: 404}))` at the start of each test. Same failure signal as a bad `VITE_GXWF_EXT_SOURCE` build, no rebuild needed.
- Requires `MONACO_ENABLED` — the warn banner + `monacoFailed` path only exist when the build was done with `VITE_GXWF_MONACO=1`. Without Monaco, FileView renders the textarea directly and there's nothing to fall back from. Earlier draft of this plan claimed the test could run unconditionally; that was wrong.
- Asserts: warn banner visible, `.editor-textarea` visible, `data-monaco-ready` absent, textarea edits reach Save → PUT /contents/... round-trip succeeds.

**3. `monaco-hover.spec.ts`** — Phases 1, 2, 4 (originally §178–184 of V2 plan). **LANDED / GREEN.**
- Boot, `await waitForLspReady(page)` (armed before navigation), position on `class:` in a format2 buffer.
- Trigger `editor.action.showHover`; assert `div.monaco-hover` visible with non-empty text.
- TODO (follow-up): assert `indexedDB.databases()` includes `galaxy-tool-cache-v1` (Phase 4.1 piggyback) — not yet covered.

**4. `monaco-language-detection.spec.ts`** — Phase 1.9. **LANDED / GREEN.**
- Fixtures landed under `packages/gxwf-e2e/fixtures/workspace-seed/synthetic/`: `simple-native.ga`, `simple-format2.gxwf.yml` (preexisting), `simple-tests.yml`, `simple-tests.gxwf.yml` (precedence edge — resolves to `gxformat2` because `TEST_SUFFIX_RE` requires a literal `-tests.(yml|yaml)` at end-of-string).
- Table-driven; asserts `getModel().getLanguageId()`.

**5. `monaco-diagnostics.spec.ts`** — Phase 7 LSP smoke. **LANDED / GREEN.**
- `broken-format2.gxwf.yml` fixture (bad class + wrong types).
- Uses `waitForMarkers(page, { severity: "error" })` after LSP-ready; asserts ≥1 marker.

**6. `monaco-edit-sync.spec.ts`** — Phase 1.7 data-flow contract.
- Load file, focus `.monaco-editor textarea`, `page.keyboard.type`.
- Assert Vue parent state via `window.__gxwfMonaco.model.getValue()` and via clicking Save → verify gxwf-web `PUT /contents/...` received the typed bytes.
- External update: call `model.setValue(...)` from `page.evaluate`; verify no `update:content` echo (expose a counter on `window.__gxwfMonaco.emitCount` behind the expose flag).

**7. `monaco-keybindings.spec.ts`** — Phase 6.4 (moved here from the vitest-in-jsdom slot in V2 §322).
- Editor focused + `Control+Space` → `.suggest-widget` visible.
- Editor focused + `Control+S` → gxwf-ui save fires (assert network call, not extension save).
- Editor blurred (click OperationPanel) + `Control+Space` → no `.suggest-widget`.
- `Control+Shift+P` with editor focus → `.quick-input-widget` visible.
- Router nav via keyboard → `getEditors().length === 0`; no console errors.

---

## Unit tests (non-E2E; complementary)

Not blocking, but cheap and cover what E2E can't assert quickly:

- `packages/gxwf-ui/test/editor/extensionSource.test.ts` — `parseExtensionSource` parser cases (folder/vsix/openvsx, @latest default).
- `packages/gxwf-ui/test/editor/languageId.test.ts` — suffix precedence (the `-tests.gxwf.yml` edge case specifically).

---

## Landing order

1. ~~F1 + F2 + F3 (harness fixture detection + skip guard)~~ — **done.**
2. ~~`monaco-boot.spec.ts`~~ — **done.** ~~`monaco-fallback.spec.ts`~~ — **done.**
3. ~~`monaco-hover.spec.ts`~~ — **done.** ~~`monaco-diagnostics.spec.ts`~~ — **done.**
4. ~~`monaco-language-detection.spec.ts`~~ — **done.**
5. `monaco-edit-sync.spec.ts` — adds the emit-counter to the expose handle.
6. `monaco-keybindings.spec.ts` — gates Phase 8 shipping per V2 §417; depends on V2 Phase 6.2 Ctrl+S impl.

Each step committable independently; none blocks the others after step 1.

---

## Test Strategy table (supersedes V2 §370)

| Phase | Coverage | Spec |
|---|---|---|
| 1, 2, 4.5 | Boot + CSP | `monaco-boot.spec.ts` |
| 1.7 | Fallback banner + EditorShell swap | `monaco-fallback.spec.ts` |
| 1, 2, 4 | LSP hover + IndexedDB populated | `monaco-hover.spec.ts` |
| 1.9 | Language-by-extension precedence | `monaco-language-detection.spec.ts` |
| 7 | LSP diagnostics surface as markers | `monaco-diagnostics.spec.ts` |
| 1.7 | v-model sync, no echo, save path | `monaco-edit-sync.spec.ts` |
| 6 | Keybinding scoping | `monaco-keybindings.spec.ts` |
| 2.1 | Source parser | `packages/gxwf-ui/test/editor/extensionSource.test.ts` |
| 1.9 | Language resolver | `packages/gxwf-ui/test/editor/languageId.test.ts` |

---

## Open questions

1. ~~`monaco-fallback.spec.ts` — second Playwright project for the bad-source build?~~ **Resolved 2026-04-15**: the Phase 2 simplification (HTTP-only extension loading) means a missing `/ext/galaxy-workflows/` directory cleanly produces the fallback path. A per-test env override suffices; no second Playwright project.
2. Emit-counter on `window.__gxwfMonaco` — add eagerly in Phase 1.7 follow-up commit, or wait until spec #6 needs it? Lean: wait; keep the handle surface minimal until a test justifies each field.
3. `GXWF_E2E_MONACO` env signal vs. a filesystem marker (`.monaco-enabled`) — env is simpler if Playwright passes it through; confirm at implementation time.
4. Seed fixtures for language-detection — author synthetic YAML or copy from existing IWC fixtures? Lean: synthetic; keeps the spec deterministic and tiny.

---

## Non-goals for this plan

- CI orchestration of the `.vsix` build pipeline. User said no CI; manual contributor-built fixture is the supported path.
- Onboarding the extension to Open VSX (Phase 8 of V2).
- Visual regression / screenshot testing — rejected 2026-04-15 as disproportionate overhead (flake risk, baseline OS pinning, per-branch regen) for coverage the other specs already provide behaviorally.
- Shadow-DOM scoping of Monaco styles (Phase 5 of V2).
