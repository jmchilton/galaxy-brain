---
type: research
subtype: component
tags:
  - research/component
  - galaxy/client
component: Window Manager
status: draft
created: 2026-02-11
revised: 2026-02-11
revision: 1
ai_generated: true
---

# Galaxy Window Manager System - Research Report

## Overview

Galaxy's window manager allows opening multiple views in floating windows within the SPA, using **WinBox.js v0.2.82**. The system operates as a *layer above* Vue Router — when enabled, routes with titles render in floating windows instead of navigating, so users can view multiple content streams without losing context.

**Key insight**: The window manager is an opt-in toggle. When inactive, all navigation is standard Vue Router. When active, `router.push()` calls with a `title` option get intercepted and opened in WinBox floating windows (iframes) instead.

---

## Core API: WindowManager Class

### File: `client/src/entry/analysis/window-manager.js`

#### State
- `counter`: Tracks number of open windows (used for staggering positions)
- `active`: Boolean toggle (enabled/disabled)
- `zIndexInitialized`: Ensures first window gets z-index 850 (below masthead at 900)

#### Public Methods

**`getTab()`** — Returns a masthead tab config for the toggle button:
```javascript
{
    id: "enable-window-manager",
    icon: faTh,
    tooltip: "Enable/Disable Window Manager",
    visible: true,
    onclick: () => { this.active = !this.active; }
}
```

**`add(options, layout = 10, margin = 20)`** — Creates a floating window:
```javascript
add({ title: "1: sample.fasta", url: "/datasets/123" })
```
- Appends `hide_panels=true` and `hide_masthead=true` to URL
- Positions windows in staggered grid: `x = counter * margin`, `y = (counter % layout) * margin`
- Creates `iframe-focus-overlay` div for click handling on unfocused windows
- Calls `WinBox.new({ title, url, x, y, index, onclose })`

**`beforeUnload()`** — Returns `true` if windows are open (for "leave page?" prompt)

---

## Router Push Integration

### File: `client/src/entry/analysis/router-push.js`

Monkey-patches `VueRouter.prototype.push` to intercept navigation:

```javascript
VueRouter.prototype.push = function push(location, options = {}) {
    const { title, force, preventWindowManager } = options;

    const Galaxy = getGalaxyInstance();
    if (title && !preventWindowManager && Galaxy.frame && Galaxy.frame.active) {
        Galaxy.frame.add({ title, url: location });
        return;  // Don't route — open window instead
    }

    return originalPush.call(this, location).catch(...);
};
```

### RouterPushOptions Interface

File: `client/src/components/History/Content/router-push-options.ts`

```typescript
export interface RouterPushOptions {
    title?: string;               // Window title (required to open in window)
    force?: boolean;              // Force reload via __vkey__ timestamp
    preventWindowManager?: boolean; // Bypass WM even if active
}
```

**Decision logic**: If `Galaxy.frame.active` AND `title` provided AND `preventWindowManager` not set → open window. Otherwise → normal route.

---

## App.vue Integration

### File: `client/src/entry/analysis/App.vue`

```javascript
created() {
    if (!this.embedded) {
        this.windowManager = new WindowManager();
        window.onbeforeunload = () => {
            if (this.confirmation || this.windowManager.beforeUnload()) {
                return "Are you sure you want to leave the page?";
            }
        };
    }
}

mounted() {
    if (!this.embedded) {
        this.Galaxy = getGalaxyInstance();
        this.Galaxy.frame = this.windowManager;  // Global access point
    }
}
```

Passes `windowManager.getTab()` to Masthead as `windowTab` prop.

---

## Component Usage Patterns

### Pattern 1: ContentItem.vue (History Item Display)

File: `client/src/components/History/Content/ContentItem.vue`

The canonical example of window manager integration:

```javascript
function onDisplay() {
    const Galaxy = getGalaxyInstance();
    const isWindowManagerActive = Galaxy.frame && Galaxy.frame.active;

    let displayUrl = itemUrls.value.display;

    // Add displayOnly param when windowed
    if (isWindowManagerActive && displayUrl) {
        displayUrl += displayUrl.includes("?") ? "&displayOnly=true" : "?displayOnly=true";
    }

    const hidInfo = props.item.hid ? `${props.item.hid}: ` : "";
    const options = {
        force: true,
        preventWindowManager: !isWindowManagerActive,
        title: isWindowManagerActive ? `${hidInfo} ${props.name}` : undefined
    };

    router.push(displayUrl, options);
}
```

### Pattern 2: displayOnly Prop

Components conditionally hide UI when windowed:

```vue
<!-- DatasetView.vue -->
<header v-if="!displayOnly"> ... </header>
<BNav v-if="!displayOnly" pills> ... </BNav>
<div class="content"> ... </div>
```

Router passes `displayOnly` from query param:
```javascript
{
    props: (route) => ({
        displayOnly: route.query.displayOnly === "true"
    })
}
```

### Pattern 3: Panel Hiding

File: `client/src/composables/usePanels.ts`

Windows automatically hide panels via `hide_panels=true` query param appended by `_build_url()`.

---

## CSS/Layout

### File: `client/src/style/scss/windows.scss`

Key styles:
- `.winbox` — `margin-top: calc($masthead-height + 1px)`, border-radius, box-shadow
- `.winbox.max` — Maximized: no margin/border/shadow
- `.winbox.min` — Minimized: collapsed
- `.wb-header` — `background: $brand-primary`
- `.iframe-focus-overlay` — Absolute positioned overlay for click handling
- `.winbox.focus .iframe-focus-overlay` — `pointer-events: none` (lets focused window receive clicks)
- `.wb-full` — `display: none !important` (Galaxy hides WinBox fullscreen button)

---

## Call Flow: Opening Content in a Window

```
1. Component calls router.push(url, { title: "...", preventWindowManager: false })
   ↓
2. router-push.js interceptor checks: title && !preventWindowManager && Galaxy.frame.active
   ↓ (if true)
3. Galaxy.frame.add({ title, url })
   ├─ Build URL: append hide_panels=true, hide_masthead=true
   ├─ Calculate position: staggered grid
   ├─ WinBox.new() creates floating iframe window
   └─ counter++
   ↓
4. Iframe loads URL with displayOnly=true
   ├─ Component mounts with displayOnly prop
   ├─ Edit UI hidden (v-if="!displayOnly")
   └─ Content displayed in read-only mode
```

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `client/src/entry/analysis/window-manager.js` | WindowManager class (WinBox wrapper) |
| `client/src/entry/analysis/router-push.js` | Patches router.push for window interception |
| `client/src/entry/analysis/router-push.test.js` | Unit tests for router interception |
| `client/src/entry/analysis/App.vue` | Mounts WindowManager, attaches to `Galaxy.frame` |
| `client/src/components/History/Content/router-push-options.ts` | RouterPushOptions interface |
| `client/src/components/History/Content/ContentItem.vue` | Example: dataset display with WM |
| `client/src/style/scss/windows.scss` | WinBox CSS customization |
| `client/src/composables/usePanels.ts` | Panel visibility via route query |
| `client/src/utils/navigation/navigation.yml` | Selector: `masthead.window_manager` |

---

## Adding Window Manager Support for History Notebooks

To integrate:

1. **Accept `displayOnly` prop** in `HistoryNotebookView.vue`
2. **Hide edit UI when windowed** — toolbar (save/back), editor; show read-only rendered content
3. **Router config** — pass `displayOnly` from `route.query.displayOnly === "true"`
4. **Trigger from HistoryOptions** — call `router.push()` with `title` and `preventWindowManager: false`
5. **Notebook picker** — if history has multiple notebooks, need to choose which one (or open most recent)

**Important**: The window manager loads content in an **iframe** via URL. The component must be fully functional when loaded standalone at its URL with `?hide_panels=true&hide_masthead=true&displayOnly=true`.
