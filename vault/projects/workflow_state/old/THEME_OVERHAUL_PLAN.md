# Monaco Theme Overhaul — Holistic Dark + Light

**Date**: 2026-04-16
**Status (2026-04-20)**: Landed on `vs_code_integration` in commit `0186fb4`. Phases A–G all complete: `gxwf-dark` / `gxwf-light` JSONs, synthetic theme extension, boot-time + reactive theme selection, themes.test.ts (8 cases), monaco-css-scoping.spec.ts theme assertions (default dark/light, live toggle, token colors). `make check` + `make test` green. Phase F3 folded into `docs/architecture/gxwf-ui.md` (no separate `gxwf-ui-monaco.md` pitfalls doc).
**Branch**: `vs_code_integration` of `galaxy-tool-util`
**Supersedes**: the in-flight uncommitted approach in `packages/gxwf-ui/src/editor/theme.ts` (chrome customizations layered on `vs-dark`) and Phase 9I in `VS_CODE_MONACO_FIRST_PLAN_V2.md`.
**Driver**: ship Monaco editor branding via the **same channel VS Code itself uses** — full color themes contributed via an extension manifest — not via decorative `workbench.colorCustomizations`. Adds true light-mode support that tracks the app's dark-mode toggle.

---

## Background — what changed our mind

Initial attempt (uncommitted) called `monaco.editor.defineTheme(...)` and threw at runtime: `defineTheme is not a function`. That API is **bypassed** by `getThemeServiceOverride()` from monaco-vscode-api — themes route through the workbench theme service. Pivoted to `workbench.colorCustomizations` + `editor.tokenColorCustomizations`, which works but is decorative: it patches a base theme rather than owning one.

Web research + source inspection of `monaco-vscode-api` 30.0.1 confirmed the supported integration surface:

1. **Theme registration** — extension manifest `contributes.themes` → JSON theme files. Same shape `@codingame/monaco-vscode-theme-defaults-default-extension` (Light+/Dark+) and per-theme packages (Solarized Light, Tomorrow Night Blue, etc.) use.
2. **Theme selection** — `workbench.colorTheme` user-config setting (initial via `initUserConfiguration`, runtime via `updateUserConfiguration`).
3. **Decorative overrides** — `workbench.colorCustomizations` + `editor.tokenColorCustomizations` (current uncommitted approach).

Holistic approach uses **#1 + #2** as primary and discards #3 — full first-class themes, switched at runtime from the dark-mode toggle.

### Authoritative source citations

- `node_modules/.pnpm/@codingame+monaco-vscode-api@30.0.1/.../README.md` — README documents `import "@codingame/monaco-vscode-theme-defaults-default-extension"` as the canonical theme-loading pattern under the workbench theme service.
- `node_modules/.pnpm/@codingame+monaco-vscode-api@30.0.1/.../@codingame/monaco-vscode-api/extensions.d.ts` — exports `registerExtension(manifest, ExtensionHostKind.LocalWebWorker, params)` returning `RegisterLocalExtensionResult` with `registerFileUrl(path, url)`. We already use this for `galaxy-workflows-vscode`; adding a synthetic theme extension is the same pattern.
- `node_modules/.pnpm/@codingame+monaco-vscode-api@30.0.1/.../vscode/src/vs/workbench/services/themes/common/colorThemeData.js:636-648` — `fromExtensionTheme` reads `theme.path` (JSON or tmTheme), uses `theme.uiTheme` (`"vs-dark"`/`"vs"`/`"hc-black"`/`"hc-light"`) as the base, and computes `settingsId = theme.id || theme.label`. **`workbench.colorTheme` is matched against `settingsId`, so providing `id` gives us a stable selector independent of the user-facing label.**
- `node_modules/.pnpm/@codingame+monaco-vscode-theme-service-override@30.0.1/.../index.d.ts` — only exports `getServiceOverride()` + the `IThemeExtensionPoint` shape. Confirms there is no standalone "register a theme" API to call directly; everything goes through the extension contribution pipeline.

### Decisions baked into this plan (from prior round)

- **Q1**: Standalone JSON themes (no `include`). Predictable, no dependency on a base theme being bundled.
- **Q2**: Drop `MonacoEditor.vue`'s `theme` prop. Source of truth is the app's dark-mode state. No escape hatch.
- **Q3**: Pure JSON. No `workbench.colorCustomizations` overlay. The JSON owns every color.
- **Q4** (claimed): Read dark state at runtime from `document.documentElement.classList.contains("dark")` (the truth). `localStorage["gxwf-dark"]` is read **only** at App boot to seed the class — it stays a private detail of `App.vue` and we don't depend on its key here. This decouples Monaco from the persistence mechanism.
- **Q5** (researched): `workbench.colorTheme` is matched against `settingsId`, which is `theme.id || theme.label`. Provide both: `id: "gxwf-dark"` / `id: "gxwf-light"` for stable selection in code; `label: "Galaxy Workflows Dark"` / `"Galaxy Workflows Light"` for any picker UI. Code always references the `id`.
- **Q6** (researched): Light-mode palette sampled from `packages/gxwf-ui/src/styles/galaxy.css` `--gx-*` tokens (which mirror IWC's `DESIGN_IWC.md` palette). Concrete mappings in §3 below. Hex values pinned at theme-author time — JSON themes can't reference CSS variables, so this is a one-shot translation that we re-do only if the brand palette evolves.

---

## 1. Architecture

### File layout (new)

```
packages/gxwf-ui/src/editor/
  themes/
    gxwf-dark.json          # full VS Code color theme — type: "dark"
    gxwf-light.json         # full VS Code color theme — type: "light"
  themesExtension.ts        # registers synthetic "gxwf-themes" extension
  themeSync.ts              # wires dark-class → workbench.colorTheme
  services.ts               # initUserConfiguration sets initial colorTheme
  extensionSource.ts        # (unchanged)
  monacoEnvironment.ts      # (unchanged)
```

### Removed

- `packages/gxwf-ui/src/editor/theme.ts` — chrome + token customizations. Pure-JSON wins; this file is deleted.
- `MonacoEditor.vue` `theme` prop + `withDefaults` default. Removed.
- `services.ts` import of `gxwfThemeCustomizations` and the spread into `buildUserConfigJson`. Removed.

### Wiring

```
App boot
  └─ App.vue script: read localStorage["gxwf-dark"], add/remove `dark` class on <html>
                     (unchanged — already does this)

services.ts initMonacoServices()
  ├─ buildUserConfigJson(cfg)
  │   ├─ "workbench.colorTheme": initialColorThemeFromDom()    ← reads <html class="dark">
  │   ├─ "galaxyWorkflows.validation.profile": ...
  │   └─ "galaxyWorkflows.toolShed.url": ...
  ├─ await initUserConfiguration(json)
  ├─ await initialize({ ...overrides })
  ├─ await loadGxwfThemesExtension()                            ← registers gxwf-dark + gxwf-light
  │   └─ result.whenReady() resolves only after JSONs loadable
  └─ installThemeSync()                                         ← MutationObserver, idempotent
        └─ on <html>.classList["dark"] flip:
             updateUserConfiguration({ "workbench.colorTheme": "gxwf-dark"|"gxwf-light" })

MonacoEditor.vue mount
  └─ no theme prop — workbench picks the theme from user config
```

### Why register themes after `initialize`

`initialize` brings up the workbench theme service. Calling `registerExtension` before that service exists doesn't crash (it queues), but reading `whenReady()` and getting deterministic readiness ordering is cleaner if we register **after** services init. Same ordering is already used for `loadGalaxyWorkflowsExtension()`.

### Why register themes before the first editor mount

`monaco.editor.create` will pick the active theme from user config. If our themes haven't been contributed yet, the workbench resolves the configured `workbench.colorTheme` to a missing theme and falls back to a built-in default. To avoid a "flash of vs-dark" between editor mount and theme resolution, we **await both** `loadGxwfThemesExtension()` and `loadGalaxyWorkflowsExtension()` inside `MonacoEditor.vue`'s `onMounted` before calling `monaco.editor.create`. (Same pattern as today's extension load.)

---

## 2. Theme JSON format

VS Code color themes are JSON with this shape:

```jsonc
{
  "$schema": "vscode://schemas/color-theme",
  "name": "Galaxy Workflows Dark",
  "type": "dark",                          // or "light"
  "colors": {                              // ~150 named keys defined here
    "editor.background": "#2c3143",
    "editor.foreground": "#e6e6e7",
    "editorCursor.foreground": "#d0bd2a",
    // ... etc.
  },
  "tokenColors": [                          // TextMate scope rules
    {
      "name": "YAML key",
      "scope": ["entity.name.tag.yaml"],
      "settings": { "foreground": "#d0bd2a", "fontStyle": "bold" }
    },
    // ...
  ],
  "semanticTokenColors": { },               // optional; future
  "semanticHighlighting": true              // optional; future
}
```

### Key surface — chrome (`colors`)

Minimum set we should explicitly define (others fall back to VS Code defaults for the `type`). Grouped by area:

**Editor surface**
- `editor.background`, `editor.foreground`
- `editor.lineHighlightBackground`, `editor.lineHighlightBorder`
- `editor.selectionBackground`, `editor.inactiveSelectionBackground`
- `editor.selectionHighlightBackground`
- `editor.findMatchBackground`, `editor.findMatchHighlightBackground`
- `editorWhitespace.foreground`
- `editorIndentGuide.background1`, `editorIndentGuide.activeBackground1`
- `editorRuler.foreground`

**Cursor / line numbers**
- `editorCursor.foreground`
- `editorLineNumber.foreground`, `editorLineNumber.activeForeground`

**Brackets / matches**
- `editorBracketMatch.background`, `editorBracketMatch.border`
- `editorBracketHighlight.foreground1` … `foreground6` (6 levels for rainbow brackets)

**Diagnostics (LSP wire-up)**
- `editorError.foreground`, `editorError.background`, `editorError.border`
- `editorWarning.foreground`, `editorWarning.background`, `editorWarning.border`
- `editorInfo.foreground`, `editorInfo.background`, `editorInfo.border`
- `editorHint.foreground`

**Widgets — hover, suggest, completion**
- `editorWidget.background`, `editorWidget.foreground`, `editorWidget.border`
- `editorHoverWidget.background`, `editorHoverWidget.foreground`, `editorHoverWidget.border`
- `editorSuggestWidget.background`, `editorSuggestWidget.foreground`, `editorSuggestWidget.border`
- `editorSuggestWidget.selectedBackground`, `editorSuggestWidget.selectedForeground`
- `editorSuggestWidget.highlightForeground`, `editorSuggestWidget.focusHighlightForeground`

**Scrollbar / minimap**
- `scrollbarSlider.background`, `scrollbarSlider.hoverBackground`, `scrollbarSlider.activeBackground`
- (minimap is disabled in our editor options — skip its keys)

**Focus / global chrome**
- `focusBorder`, `foreground`, `descriptionForeground`, `errorForeground`
- `contrastBorder`

### Key surface — TextMate (`tokenColors`)

Workflow files are YAML and JSON. Minimum scope coverage:

**YAML scopes** (full list from `extensions/yaml/syntaxes/yaml.tmLanguage.json` shipped with VS Code)
- `entity.name.tag.yaml` — keys → **gold, bold**
- `string.quoted.single.yaml`, `string.quoted.double.yaml`, `string.unquoted.plain.out.yaml` → string color
- `constant.numeric.yaml` → number color
- `constant.language.boolean.yaml`, `constant.language.null.yaml` → constant color
- `comment.line.number-sign.yaml` → comment color
- `entity.other.attribute-name.alias.yaml`, `keyword.control.flow.alias.yaml` → anchor/alias color
- `punctuation.definition.directive.yaml`, `entity.name.directive.yaml` → directive color

**JSON scopes**
- `support.type.property-name.json` — keys → **gold, bold**
- `string.quoted.double.json` → string color
- `constant.numeric.json` → number color
- `constant.language.json` → boolean/null
- `comment.block.json`, `comment.line.json` → (Galaxy `*.json5`/`*.jsonc` if any)

**General fallbacks** (inherited by both)
- `comment` → muted grey, italic
- `string` → softer accent
- `keyword`, `keyword.control`, `storage.type` → secondary accent
- `variable`, `variable.parameter` → primary text
- `support.function`, `entity.name.function` → secondary accent
- `invalid` → red (matches `editorError.foreground`)

This gives us a complete scheme without leaning on any base theme leaking through.

---

## 3. Concrete palette mappings

Both themes share the same brand identity: **Hokey Pokey gold** for accents, **Ebony Clay navy** for dark surfaces, **Chicago grey** for light surfaces. The dark-only / light-only choices come from `packages/gxwf-ui/src/styles/galaxy.css` and `packages/gxwf-ui/src/theme.ts` (PrimeVue preset).

### Source palette tokens (from `galaxy.css`)

| Token | Hex |
|-------|-----|
| `--gx-gold` | `#d0bd2a` |
| `--gx-gold-300` | `#e1d36b` |
| `--gx-gold-600` | `#a19321` |
| `--gx-gold-700` | `#736817` |
| `--gx-navy-dark` | `#1a1f2e` |
| `--gx-navy` | `#2c3143` |
| `--gx-navy-800` | `#3c435c` |
| `--gx-navy-700` | `#4c5574` |
| `--gx-grey-50` | `#f5f5f6` |
| `--gx-grey-100` | `#e6e6e7` |
| `--gx-grey-200` | `#d0d0d1` |
| `--gx-grey-300` | `#afafb1` |
| `--gx-grey-400` | `#878789` |
| `--gx-grey-500` | `#6c6c6e` |
| `--gx-grey-600` | `#58585a` |
| `--gx-grey-700` | `#4f4e50` |
| `--gx-blue-700` | `#387dba` |
| `--gx-blue-800` | `#2e689a` |

### `gxwf-dark.json` — chrome key mappings

| VS Code key | Value | Source token |
|-------------|-------|--------------|
| `editor.background` | `#2c3143` | `--gx-navy` |
| `editor.foreground` | `#e6e6e7` | `--gx-grey-100` |
| `editor.lineHighlightBackground` | `#3c435c` | `--gx-navy-800` |
| `editor.selectionBackground` | `#d0bd2a44` | `--gx-gold` @ ~27% alpha |
| `editor.inactiveSelectionBackground` | `#d0bd2a22` | `--gx-gold` @ ~13% alpha |
| `editorCursor.foreground` | `#d0bd2a` | `--gx-gold` |
| `editorLineNumber.foreground` | `#6c6c6e` | `--gx-grey-500` |
| `editorLineNumber.activeForeground` | `#d0bd2a` | `--gx-gold` |
| `editorIndentGuide.background1` | `#4c5574` | `--gx-navy-700` |
| `editorIndentGuide.activeBackground1` | `#d0bd2a` | `--gx-gold` |
| `editorWhitespace.foreground` | `#4c5574` | `--gx-navy-700` |
| `editorBracketMatch.background` | `#d0bd2a33` | `--gx-gold` @ alpha |
| `editorBracketMatch.border` | `#d0bd2a` | `--gx-gold` |
| `editorWidget.background` | `#1a1f2e` | `--gx-navy-dark` |
| `editorWidget.border` | `#4c5574` | `--gx-navy-700` |
| `editorHoverWidget.background` | `#1a1f2e` | `--gx-navy-dark` |
| `editorHoverWidget.border` | `#d0bd2a` | `--gx-gold` |
| `editorSuggestWidget.background` | `#1a1f2e` | `--gx-navy-dark` |
| `editorSuggestWidget.foreground` | `#e6e6e7` | `--gx-grey-100` |
| `editorSuggestWidget.selectedBackground` | `#4c5574` | `--gx-navy-700` |
| `editorSuggestWidget.highlightForeground` | `#d0bd2a` | `--gx-gold` |
| `editorError.foreground` | `#cd3131` | (red, VS Code convention) |
| `editorWarning.foreground` | `#d0bd2a` | `--gx-gold` (gold doubles as warning) |
| `editorInfo.foreground` | `#387dba` | `--gx-blue-700` |
| `focusBorder` | `#d0bd2a` | `--gx-gold` |
| `scrollbarSlider.background` | `#3c435c99` | `--gx-navy-800` @ alpha |
| `scrollbarSlider.hoverBackground` | `#4c5574cc` | `--gx-navy-700` @ alpha |
| `scrollbarSlider.activeBackground` | `#d0bd2a` | `--gx-gold` |
| `foreground` | `#e6e6e7` | `--gx-grey-100` |
| `errorForeground` | `#cd3131` | red |

### `gxwf-light.json` — chrome key mappings

Light surface, gold accents, navy text. Selection alpha needs to be slightly stronger (gold on cream is lower-contrast than gold on navy).

| VS Code key | Value | Source token |
|-------------|-------|--------------|
| `editor.background` | `#f5f5f6` | `--gx-grey-50` |
| `editor.foreground` | `#2c3143` | `--gx-navy` |
| `editor.lineHighlightBackground` | `#e6e6e7` | `--gx-grey-100` |
| `editor.selectionBackground` | `#d0bd2a55` | `--gx-gold` @ ~33% alpha |
| `editor.inactiveSelectionBackground` | `#d0bd2a33` | `--gx-gold` @ ~20% alpha |
| `editorCursor.foreground` | `#736817` | `--gx-gold-700` (deeper for light bg) |
| `editorLineNumber.foreground` | `#878789` | `--gx-grey-400` |
| `editorLineNumber.activeForeground` | `#736817` | `--gx-gold-700` |
| `editorIndentGuide.background1` | `#d0d0d1` | `--gx-grey-200` |
| `editorIndentGuide.activeBackground1` | `#a19321` | `--gx-gold-600` |
| `editorWhitespace.foreground` | `#d0d0d1` | `--gx-grey-200` |
| `editorBracketMatch.background` | `#d0bd2a44` | `--gx-gold` @ alpha |
| `editorBracketMatch.border` | `#a19321` | `--gx-gold-600` |
| `editorWidget.background` | `#ffffff` | white |
| `editorWidget.border` | `#d0d0d1` | `--gx-grey-200` |
| `editorHoverWidget.background` | `#ffffff` | white |
| `editorHoverWidget.border` | `#a19321` | `--gx-gold-600` |
| `editorSuggestWidget.background` | `#ffffff` | white |
| `editorSuggestWidget.foreground` | `#2c3143` | `--gx-navy` |
| `editorSuggestWidget.selectedBackground` | `#e6e6e7` | `--gx-grey-100` |
| `editorSuggestWidget.highlightForeground` | `#736817` | `--gx-gold-700` |
| `editorError.foreground` | `#cd3131` | red |
| `editorWarning.foreground` | `#a19321` | `--gx-gold-600` |
| `editorInfo.foreground` | `#2e689a` | `--gx-blue-800` |
| `focusBorder` | `#a19321` | `--gx-gold-600` |
| `scrollbarSlider.background` | `#d0d0d199` | `--gx-grey-200` @ alpha |
| `scrollbarSlider.hoverBackground` | `#afafb1cc` | `--gx-grey-300` @ alpha |
| `scrollbarSlider.activeBackground` | `#a19321` | `--gx-gold-600` |
| `foreground` | `#2c3143` | `--gx-navy` |
| `errorForeground` | `#cd3131` | red |

### `tokenColors` for both themes

Same scope rules; different absolute hex values.

| Scope group | Dark color | Light color | Style |
|-------------|------------|-------------|-------|
| `entity.name.tag.yaml`, `support.type.property-name.json` (keys) | `#d0bd2a` | `#736817` | bold |
| `string.*` | `#e1d36b` | `#a19321` | normal |
| `constant.numeric.*` | `#387dba` | `#2e689a` | normal |
| `constant.language.*` (true/false/null) | `#387dba` | `#2e689a` | normal |
| `comment` | `#6c6c6e` | `#878789` | italic |
| `entity.other.attribute-name.alias.yaml` (anchors) | `#e1d36b` | `#a19321` | normal |
| `keyword.control.flow.alias.yaml` (refs) | `#e1d36b` | `#a19321` | normal |
| `entity.name.directive.yaml` | `#878789` | `#878789` | normal |
| `invalid` | `#cd3131` | `#cd3131` | normal |

---

## 4. Implementation phases

Each phase has its own changeset entry candidate, and each test step is **red-first** — write the test, run it, watch it fail in the expected way, then implement until it passes.

### Phase A — Author theme JSONs (no behavior change yet)

A1. Create `packages/gxwf-ui/src/editor/themes/gxwf-dark.json` per §3.
A2. Create `packages/gxwf-ui/src/editor/themes/gxwf-light.json` per §3.
A3. Add a vitest snapshot test (or simple structural assertion) at `packages/gxwf-ui/test/themes.test.ts` that:
   - Loads both JSONs.
   - Asserts `type` is `"dark"` / `"light"` respectively.
   - Asserts every key in §3 chrome table exists (catches typos in key names — VS Code silently ignores unknown keys, so this is our only line of defense).
   - Asserts `tokenColors` contains entries for the YAML key + JSON key scopes with the expected gold foreground.
A4. Run the test — should pass on first try since JSONs are authored to match. (No "red" phase here; this is a structural sanity test, not a behavior test.)

### Phase B — Synthetic theme extension (still no UI change)

B1. Create `packages/gxwf-ui/src/editor/themesExtension.ts`:
   ```ts
   import {
     registerExtension,
     ExtensionHostKind,
     type IExtensionManifest,
     type RegisterLocalExtensionResult,
   } from "@codingame/monaco-vscode-api/extensions";
   import gxwfDarkUrl from "./themes/gxwf-dark.json?url";
   import gxwfLightUrl from "./themes/gxwf-light.json?url";

   const EXTENSION_PATH = "/gxwf-themes";
   let loaded: Promise<RegisterLocalExtensionResult> | null = null;

   const manifest: IExtensionManifest = {
     name: "gxwf-themes",
     publisher: "galaxyproject",
     version: "0.0.0",
     engines: { vscode: "*" },
     contributes: {
       themes: [
         { id: "gxwf-dark",  label: "Galaxy Workflows Dark",  uiTheme: "vs-dark", path: "./themes/gxwf-dark.json" },
         { id: "gxwf-light", label: "Galaxy Workflows Light", uiTheme: "vs",      path: "./themes/gxwf-light.json" },
       ],
     },
   };

   export function loadGxwfThemesExtension(): Promise<RegisterLocalExtensionResult> {
     if (loaded) return loaded;
     loaded = (async () => {
       const result = registerExtension(manifest, ExtensionHostKind.LocalWebWorker, {
         path: EXTENSION_PATH,
       });
       result.registerFileUrl("themes/gxwf-dark.json", gxwfDarkUrl);
       result.registerFileUrl("themes/gxwf-light.json", gxwfLightUrl);
       await result.whenReady();
       return result;
     })();
     return loaded;
   }
   ```
B2. Wire into `services.ts` — call `await loadGxwfThemesExtension()` after `await initialize(...)` resolves. (Decision: keep the call inside `initMonacoServices`, not inside `MonacoEditor.vue`, to mirror how `initialize` itself is process-singleton.)
B3. Vite asset handling — `?url` imports from JSON files should "just work" with Vite's asset graph; the JSON is fingerprinted, copied to the build output, and the `?url` returns the runtime URL. Verify by running `pnpm --filter gxwf-ui build` and inspecting `dist/` for the hashed JSON.
B4. **Fallback if `?url` doesn't resolve**: copy themes into `packages/gxwf-ui/public/gxwf-themes/` at build time (vite-plugin-static-copy) and use absolute URLs `/gxwf-themes/gxwf-dark.json`. Decide based on B3 outcome.

### Phase C — Initial theme selection from boot state

C1. Add helper in `services.ts`:
   ```ts
   function initialColorThemeId(): string {
     // Boot before App.vue script runs is possible (services init can race); fall
     // back to dark if class isn't present yet but localStorage indicates dark.
     if (typeof document !== "undefined" && document.documentElement.classList.contains("dark")) {
       return "gxwf-dark";
     }
     try {
       if (typeof localStorage !== "undefined" && localStorage.getItem("gxwf-dark") === "1") {
         return "gxwf-dark";
       }
     } catch {
       // localStorage unavailable in some test envs; ignore.
     }
     return "gxwf-light";
   }
   ```
   Note: the localStorage fallback is the **only** place we touch the storage key; runtime switching uses the `dark` class as truth (Q4).
C2. Add to `buildUserConfigJson`:
   ```ts
   "workbench.colorTheme": initialColorThemeId(),
   ```
C3. Delete the spread of `gxwfThemeCustomizations()` and the `import { gxwfThemeCustomizations } from "./theme"` line.
C4. Delete `packages/gxwf-ui/src/editor/theme.ts`.
C5. `MonacoEditor.vue`: remove the `theme` prop and its watcher; remove the comment block introduced for the prop.
C6. `make check` — confirm typecheck/lint clean.

### Phase D — Reactive runtime switching

D1. Create `packages/gxwf-ui/src/editor/themeSync.ts`:
   ```ts
   import { updateUserConfiguration } from "@codingame/monaco-vscode-configuration-service-override";

   let installed = false;

   function currentThemeId(): "gxwf-dark" | "gxwf-light" {
     return document.documentElement.classList.contains("dark") ? "gxwf-dark" : "gxwf-light";
   }

   export function installThemeSync(): void {
     if (installed) return;
     installed = true;
     // Push initial value (in case the dark class flipped between
     // initUserConfiguration and now — App.vue script and services init can race).
     void updateUserConfiguration(JSON.stringify({ "workbench.colorTheme": currentThemeId() }));
     const observer = new MutationObserver(() => {
       void updateUserConfiguration(JSON.stringify({ "workbench.colorTheme": currentThemeId() }));
     });
     observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
     // Note: no dispose. This is process-global by design — same lifecycle as
     // services init. Multiple MonacoEditor mount/unmount cycles share one
     // observer so we don't leak handlers per editor instance.
   }
   ```
D2. Call `installThemeSync()` from `services.ts` `initMonacoServices()` after `loadGxwfThemesExtension()` resolves.
D3. Confirm `updateUserConfiguration` is exported from the configuration-service-override package — already imported by `services.ts` consumers, but worth a grep.

### Phase E — Tests (Playwright + structural)

E1. Update `packages/gxwf-e2e/tests/monaco-css-scoping.spec.ts`:

   - **Keep** the existing scoping + font tests.
   - **Add** `test("monaco editor uses gxwf-dark theme by default in dark mode")`:
     - Set `localStorage.gxwf-dark = "1"` before navigation (via `page.addInitScript`).
     - Open a workflow file via `openFileViaUrl`.
     - `waitForMonaco`.
     - Read `getComputedStyle(document.querySelector(".monaco-editor")).backgroundColor`.
     - Assert it parses to `rgb(44, 49, 67)` (`#2c3143`).
   - **Add** `test("monaco editor switches to gxwf-light when dark mode is toggled off")`:
     - Set `localStorage.gxwf-dark = "1"`, navigate, wait for Monaco.
     - Click the dark-mode toggle button (`.dark-toggle`) in the header.
     - Wait for `data-vscode-theme-kind` attribute on `body` (or whichever element the workbench writes it to) to flip to `vs`. **Verify the actual attribute name in monaco-vscode-api source before authoring this assertion** — fallback: poll computed background.
     - Assert `.monaco-editor` background became `rgb(245, 245, 246)` (`#f5f5f6`).
   - **Add** `test("monaco renders gold-bold YAML keys in both modes")`:
     - Open a YAML workflow file.
     - For each mode (dark, then toggle to light):
       - Find a `.view-line` containing a known key (e.g. `class:`).
       - Find the `.mtk*` span within it that contains the key text.
       - Assert its computed `color` is the expected gold (`rgb(208, 189, 42)` dark / `rgb(115, 104, 23)` light) and `font-weight` is `700`.

E2. Run E2E with `MONACO_ENABLED=1`:
   ```bash
   cd packages/gxwf-e2e && MONACO_ENABLED=1 pnpm playwright test monaco-css-scoping.spec.ts
   ```
   Each new test should be authored to fail first (e.g. write the test before the corresponding wiring step in C/D), then pass after the wiring lands. Order:
   - E1 dark-default test → write before C2; should fail (still vs-dark = `#1e1e1e`); passes after C complete.
   - E1 toggle test → write before D; should fail (toggle has no effect); passes after D complete.
   - E1 token color test → write last, after all wiring; this is a regression guard, not a TDD red.

E3. Re-run the inventory script (`packages/gxwf-e2e/scripts/inventory-monaco-css.mjs` or however it's named) and update `packages/gxwf-e2e/.inventory/REPORT.md`. Confirm Dashboard probes still report "no changes" — themes are scoped to the editor surface and shouldn't leak.

E4. `packages/gxwf-ui/test/themes.test.ts` — structural test from A3, run with `pnpm --filter gxwf-ui test`.

### Phase F — Plan + docs + changeset

F1. `VS_CODE_MONACO_FIRST_PLAN_V2.md`:
   - Phase 5.3: replace the `defineTheme` blocker note + customizations description with a one-paragraph summary that points at this overhaul plan as the canonical record.
   - Phase 9I: mark **done**, point at this plan.
F2. `docs/architecture/gxwf-ui.md`:
   - Add a "Custom themes" subsection under the Monaco section: 2 paragraphs explaining the contributed-extension approach, why `monaco.editor.defineTheme` is unsupported, and how runtime switching works.
F3. `docs/development/gxwf-ui-monaco.md`:
   - Add a one-line entry under "monaco-vscode-api pitfalls" calling out that standalone `defineTheme` throws under our service-override stack.
F4. Replace `.changeset/gxwf-monaco-theme.md` with a new patch entry (or amend in place — they're not yet committed):
   ```md
   ---
   "@galaxy-tool-util/gxwf-ui": minor
   ---

   Brand the embedded Monaco editor with first-class `gxwf-dark` and `gxwf-light`
   color themes, contributed via a synthetic theme extension. The active theme
   tracks the app's dark-mode toggle in real time via the workbench
   configuration service. Replaces the prior decorative `workbench.colorCustomizations`
   approach with full VS Code theme JSON files (chrome + TextMate token rules).
   ```
   Bump level: this is a noticeable user-facing behavior change (light mode added, default theme changed) — leaning **minor** rather than patch. Final call before committing.

### Phase G — Verification before merge

G1. `make check` clean.
G2. `make test` clean (new vitest themes.test.ts passes).
G3. `MONACO_ENABLED=1 pnpm --filter @galaxy-tool-util/gxwf-e2e playwright test monaco-css-scoping.spec.ts` clean.
G4. Spot-check by hand:
   - Open the dev server, open a `.gxwf.yml` file. Default mode should be light; editor should be cream-on-navy with gold keys.
   - Click the moon. Editor should flip to navy-on-cream-text-on-navy with gold keys (within ~50ms — workbench theme service is synchronous after config update).
   - Open the suggest widget by typing in a key context; widget chrome should match the active theme's surface color (white on light, navy-deep on dark).
   - Hover over a token; hover widget should match.
   - Trigger a validation error (malformed YAML); error squiggle should be red, status in the bottom (if present) should be themed.
G5. Refresh the page. Initial theme should match whatever was last toggled (localStorage round-trip).

---

## 5. Risk register

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| `?url` import for JSON files doesn't resolve in Vite asset graph | Med | Low | Phase B3 verifies; B4 documents the `public/` fallback. |
| `result.whenReady()` resolves before themes are actually queryable | Low | Med | Verified by inspection of `colorThemeData.js` — themes register synchronously into the workbench theme registry during extension activation. If we hit this, push initial `workbench.colorTheme` set into a follow-up `updateUserConfiguration` after `whenReady()`. |
| `MutationObserver` fires before themes are loaded (race between App.vue toggling dark class on mount and our async theme registration) | Low | Low | `themeSync.installThemeSync()` is called only after `loadGxwfThemesExtension()` awaits `whenReady()`. If a toggle fires earlier, the initial `workbench.colorTheme` we set in user config catches it. |
| `data-vscode-theme-kind` attribute in E1 test isn't actually how the workbench signals theme change | Med | Low | Verify in source before writing the test; fall back to polling computed background. |
| Brand drift between `galaxy.css` `--gx-*` tokens and the JSON themes | Med over time | Med | Tokens are pinned at theme-author time; on future palette refresh, regenerate from the same source-of-truth list. Could automate with a small build script in a follow-up if drift becomes a real issue. |
| Selection alpha values look wrong on real text under different fonts/zoom | Low | Low | Tune by hand during G4. The current values (44/55 hex alpha for dark/light) are starting points based on contrast intuition. |
| Light-mode contrast for token colors (gold on cream) fails accessibility | Med | Med | The gold on cream is WCAG borderline for body text but acceptable for short YAML keys; deepened the gold to `#736817` (gold-700) for light-mode keys to compensate. Verify by hand; adjust if too washed out. |
| Existing scoping test breaks because theme contributions add stylesheets | Low | Low | Inventory regen (E3) is the check. Themes contribute via TextMate token CSS classes (`.mtk*`), which already appear in pre-overhaul inventory; new theme JSON shouldn't change the **set** of stylesheets, only their content. |

---

## 6. Open questions to answer mid-implementation

(Answered or marked "decide in the moment".)

- ~~Q1–Q5~~ resolved upfront.
- Q6-followup: After eyeballing the live light theme, do we want to deepen `editor.background` from `#f5f5f6` (grey-50) to `#e6e6e7` (grey-100) for better contrast with the surrounding app-shell which is also grey-50? Decide during G4.
- Q7: Should `editorWarning.foreground` be gold (matches our brand accent) or yellow (VS Code convention)? Plan says gold; reverify if it conflicts with how the LSP surfaces warnings vs. the cursor/active-line gold.
- Q8: Should we contribute `semanticTokenColors` for the LSP's semantic tokens, or rely on TextMate alone? Plan says TextMate-only for now; defer semantic to a follow-up if/when galaxy-workflows-vscode starts emitting semantic tokens.
- Q9: When writing E1 toggle test, what selector points at the dark-mode toggle in the app shell? `.dark-toggle` per `App.vue`. (Pre-resolved.)

---

## 7. Estimated effort

- Phase A: 30 min (author JSONs from §3 tables; structural test).
- Phase B: 30 min (themesExtension.ts; verify `?url`).
- Phase C: 15 min (services wiring, delete theme.ts, drop prop).
- Phase D: 20 min (themeSync.ts; install hook).
- Phase E: 60–90 min (3 new Playwright tests, inventory regen).
- Phase F: 20 min (plan/doc/changeset updates).
- Phase G: 30 min (manual verification + tuning).

Total: ~3.5–4 hours of focused work, in a single sitting.

---

## 8. Out of scope (future work)

- Semantic token coloring (`semanticTokenColors` in JSON, depends on LSP emitting semantic tokens).
- High-contrast theme variants (`gxwf-hc-dark`, `gxwf-hc-light` with `uiTheme: "hc-black"`/`"hc-light"`).
- System-preference auto theme (`prefers-color-scheme` driving the dark class — that's an `App.vue` concern, not Monaco's).
- A "live" theme designer that lets users tweak palette tokens at runtime.
- Cross-app theme sharing (e.g. exporting `gxwf-dark.json` for use in standalone VS Code via a `.vsix`).
