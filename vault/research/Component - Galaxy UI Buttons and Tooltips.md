---
type: research
subtype: component
tags:
  - research/component
  - galaxy/client
  - galaxy/testing
component: "Galaxy UI Buttons and Tooltips"
galaxy_areas: [client, testing]
status: draft
created: 2026-10-30
revised: 2026-10-30
revision: 1
ai_generated: true
summary: "GButton, GLink, GTooltip and the v-g-tooltip directive - disabled rendering, title vs tooltip vs disabled-title, and how E2E helpers see each tooltip"
sources:
  - "vault/agents/gx_research/todo/client_galaxy_ui_components.md"
  - "https://github.com/galaxyproject/galaxy/issues/24531"
related_notes:
  - "[[Component - E2E Tests - Writing]]"
  - "[[Component - E2E Tests Smart Components]]"
---

# Galaxy UI Buttons and Tooltips

Verified against Galaxy `origin/dev` at `65e6daff2334c8cfd4971682eecfb87f38a224be`. Paths are relative to the Galaxy repo root.

**Scope**: the clickable base components `GButton` and `GLink`, the `GTooltip` component, the `v-g-tooltip` directive, the shared timing helper `tooltipTiming.ts`, and how Selenium/Playwright helpers observe these tooltips. **Out of scope**: the other G-components (GModal, GDropdown, GPopover, GTable, ...), `hoverBridge.ts`/GPopover hover handling, and per-component BButton/`v-b-tooltip` migration status.

## Where the code lives

The components live in the workspace package `@galaxyproject/galaxy-ui` under `client/packages/ui/`. It ships raw source and has two consumers: the Galaxy client, which runs on Vue 3 under `@vue/compat` with Bootstrap, and the Tool Shed frontend, which runs on plain Vue 3 without Bootstrap (`client/packages/ui/README.md`).

| Piece | Source | Client import path |
|---|---|---|
| GButton | `client/packages/ui/src/components/GButton.vue` | `@/components/BaseComponents/GButton.vue` (5-line re-export shim) |
| GLink | `client/packages/ui/src/components/GLink.vue` | `@/components/BaseComponents/GLink.vue` (shim) |
| GTooltip | `client/packages/ui/src/components/GTooltip.vue` | `@/components/BaseComponents/GTooltip.vue` (shim) |
| `vGTooltip` | `client/packages/ui/src/directives/vGTooltip.ts` | `@/directives/vGTooltip` (re-export); registered globally as `v-g-tooltip` in `installAppPlugins()`, `client/src/utils/mountVueComponent.js:24-31` |
| Title/element logic | `packages/ui/src/composables/{currentTitle,clickableElement,resolveElement}.ts` | `BaseComponents/composables/*.ts` re-export |
| Hover/focus timing | `packages/ui/src/utils/tooltipTiming.ts`, `packages/ui/src/composables/accessibleHover.ts` | exported from the package `index.ts:65,76-80` |

Unit tests for the shims sit beside them in `client/src/components/BaseComponents/` (`GButton.test.ts`, `GLink.test.ts`, `GTooltip.test.ts`). The directive's tests are in `client/src/directives/vGTooltip.test.ts`. The package itself has no directive test.

## GButton

`GButton.vue:20-59` defines these props: `href`, `to`, `color` (default grey), `outline`, `disabled`, `title`, `disabledTitle`, `size` (default medium), `tooltip`, `tooltipPlacement`, `inline`, `iconOnly`, `transparent`, `pill`, `pressed` (defaults to `undefined` so a non-toggle sets no `aria-pressed`), and `loading`. It emits `click` and `update:pressed`.

### Rendered element

`useClickableElement()` (`composables/clickableElement.ts:19-31`) picks the root element:

1. disabled (GButton passes `disabled || loading`, `GButton.vue:101-111`) → plain `<button>`, even when `to`/`href` is set
2. `to` → `RouterLink`
3. `href` → `<a>` (only a plain anchor gets `href`, `GButton.vue:116`)
4. otherwise → `<button>`

On the root (`GButton.vue:137-150`):
- `type` is `$attrs.type ?? "button"` for buttons, so a GButton never submits a form by accident.
- `class="g-button"` plus variant classes `g-<color>`, `g-<size>`, and `g-disabled`, `g-outline`, `g-loading` and similar. `g-button`, `g-transparent` and `g-link` are public class names guarded by `client/packages/ui/src/publicClasses.test.ts:57`.
- `data-title` is always the current title, including the disabled title. It is never blanked, so E2E selectors key on it. Examples: `navigation.yml:139` (`button[@data-title="Delete build"]`), `navigation.yml:1417`, `test_histories_list.py:216`.
- `title` is set to the current title only when `tooltip` is off.
- `aria-disabled="true"` when disabled. `aria-busy` when loading. `aria-pressed` only for a `<button>` toggle that isn't a disclosure (`GButton.vue:122-128`).
- `v-bind="{ ...anchorAttributes, ...$attrs }"` comes last, so consumer attributes override (`GButton.test.ts` "lets an explicit aria-pressed from the consumer win").

### Disabled is `aria-disabled`, never native `disabled`

GButton never renders the native `disabled` attribute. The test `GButton.test.ts:43-52` ("remains hoverable when disabled") asserts this. The blocking happens in three other places:
- **JS click guard**, `onClick()` at `GButton.vue:66-77`. When `disabled || loading`, it calls `preventDefault()` and `stopPropagation()` and emits nothing. That mirrors a native disabled control, which dispatches no click, so ancestors and `.stop`/`.prevent` modifiers behave the same (tests at `GButton.test.ts:139-160`).
- **No navigation**, because the root falls back to `<button>` and `:to` becomes `''` (`GButton.vue:143`).
- **CSS** `.g-disabled` greys the button with `!important` and `cursor: default`, and deliberately has **no `pointer-events: none`** (`GButton.vue:312-339`, comment at 316-317). Hover must survive so the `disabledTitle` tooltip can show.

`loading` is just as inert, but it keeps the button's colour and sets `aria-busy` instead of `aria-disabled` (`GButton.test.ts:111`).

Consequences:
- The element stays focusable and stays in the tab order.
- Anything that tests for a native `disabled` (`:disabled` CSS, `el.disabled`, Selenium `is_enabled()`) sees an **enabled** button. See [E2E](#how-e2e-tests-see-these).

### `title`, `tooltip`, `disabledTitle`

`useCurrentTitle()` (`composables/currentTitle.ts:43-53`): when disabled, the current title is `disabledTitle ?? title`. Otherwise it is `title`.

| Props | Native `title` attr | `data-title` | Tooltip |
|---|---|---|---|
| `title` | current title | current title | browser native only |
| `tooltip` + `title` | none | current title | GTooltip child (`GButton.vue:155-159`), shown when `tooltip && currentTitle` (`:130`) |
| `tooltip` + `title` + `disabled-title`, disabled | none | disabled title | GTooltip showing the **disabled title**, hover still works |
| `disabled-title` without `tooltip` | disabled title, as a native title | disabled title | browser native only. Compare the usual pairing with `tooltip` in `Tool/CustomToolEditor.vue:232-240` and `Tool/Buttons/ToolFavoriteButton.vue:24-30` |

For a disabled control that should explain itself, the supported pattern is **`tooltip` + `title` + `disabled-title`**. At this SHA, 13 GButton opening tags under `client/src` combine `tooltip` with `disabled-title`, and 33 lines outside `BaseComponents/` mention `disabled-title`/`disabledTitle`.

## GLink

`GLink.vue:17-38` takes the same title machinery (`href`, `to`, `disabled`, `title`, `disabledTitle`, `tooltip`, `tooltipPlacement`) plus `dark`, `thin` and `unselectable`. It has no colour or size variants. It shares `useClickableElement` and `useCurrentTitle` with GButton, so the disabled, `aria-disabled`, `data-title` and tooltip behaviour is the same (`GLink.vue:80-98`). It differs in four ways:
- It renders **no `type` attribute**. When GLink falls back to `<button>` (no `to`/`href`, or disabled), that button takes the HTML default `type="submit"` inside a `<form>`.
- `.g-disabled` adds an underline plus grey text (`GLink.vue` style, `&.g-disabled`).
- It has no `loading` or `pressed` props.
- Disabled is only `aria-disabled` plus the click guard (`GLink.vue:44-54`). Tests: `GLink.test.ts:31-66,106`.

## GTooltip component

`GTooltip.vue` takes the props `id?`, `reference: HTMLElement | null`, `text?` and `placement?` (default `top`), plus a default slot for rich content. It exposes `show()` and `hide()`.

- **Always mounted.** The template is one `div.g-tooltip[role=tooltip]` (`GTooltip.vue:113-130`). While hidden it carries Bootstrap's `sr-only` class. The component also restates `sr-only` itself, because the Tool Shed has no Bootstrap (`:152-164`). Visibility shows in `data-show="true"|"false"`. GButton and GLink mount it only while `tooltip && currentTitle` is truthy, but as long as that holds the `.g-tooltip` node is **in the DOM whether or not it is showing**.
- **ARIA.** A `watchImmediate` sets `aria-describedby=<tooltip id>` on the reference element and moves it when the reference changes (`:36-53`). The id comes from `useUid("g-tooltip")` unless `id` is passed. Screen readers get the text from the sr-only node even when nothing is visible.
- **Show/hide** come from `useAccessibleHover(reference, show, hide, { showDelayMs: DEFAULT_TOOLTIP_HOVER_DELAY_MS, delayFocusEnter: false })` (`:102-105`). See `composables/accessibleHover.ts:11-79`:
  - `mouseenter` waits 300 ms before showing.
  - `focus` shows **immediately**, on any focus, keyboard or pointer alike.
  - `mouseleave`, `blur` and `Escape` hide.
  - **There is no disabled check**, which is why the disabled-title tooltip works.
- **Positioning.** `useFloatingPosition` runs `offset(8)`, `flip` and `shift` with `altBoundary`, plus `arrow`. It tracks only while showing (`GTooltip.test.ts:43-70`).
- **Direct users** beyond GButton/GLink: `Dataset/DatasetState.vue`, `Common/ExportIncludeOptions.vue`, `TagsMultiselect/StatelessTags.vue`, `Common/GCard.vue`.

## `v-g-tooltip` directive

`vGTooltip.ts` replaces bootstrap-vue's `v-b-tooltip` and keeps its modifier API (`:1-18`):
- **Placement modifiers:** `.top` (default), `.bottom`, `.left`, `.right`, `.topright`/`.topleft`/`.bottomright`/`.bottomleft` (`PLACEMENT_MAP`, `:109-118`), or `placement` in an object value.
- **Trigger:** `.hover` (default) or `.focus` (focus-only).
- **Other modifiers:** `.html` (DOMPurify-sanitised `innerHTML`), `.v-danger`, `.onoverflow` (show only when the text is truncated; a ResizeObserver hides it again, `:426-438`).
- **Value forms:** none (read the element's `title`), a string, `{ title, placement }`, or `{ title, show }` for controlled display.

### What it does to the DOM

- **Content resolution**, `getContent()` (`:149-164`): a string value, then the object's `title`, then the element's `title` attribute or `vnode.props.title`. A title found this way is **copied into `data-g-tooltip-title`**, and later reads fall back to that dataset value.
- **Balloon lifecycle.** `createTooltipEl()` (`:166-188`) builds a detached `div.g-tooltip-d[role=tooltip]` > `div.g-tooltip-d-inner` + `div.g-tooltip-d-arrow`. The balloon is **appended to `<body>` only on show and removed on hide** (`:254-256`, `:309-311`), so "absent" really means hidden. The comment says this is for Selenium's `wait_for_absent`. Styles are injected once into `<head>` (`:120-128`).
- **ARIA.** On mount the directive sets `aria-describedby="g-tooltip-N"` on the host (`:421-423`), pointing at a node that is only in the DOM while showing. `updateContent()` (`:379-403`) also sets `aria-label` from the content on unnamed `button`, `a[href]`, form-control, `[role=button]` and `[role=img]` hosts, which gives icon-only buttons a name. It does this only when the target has no text, `aria-labelledby` or explicit `aria-label`. On a menu wrapper it labels the `aria-haspopup` toggle instead (`getLabelTarget`, `:406-408`).
- **Title suppression.** `scheduleShowTooltip()` blanks the native `title` (`title=""`) **before** the 300 ms delay (`:283-294`, `suppressNativeTooltip` `:262-266`), and `showTooltip()` blanks it again. `hideTooltip()` and `unmounted` restore it from `data-g-tooltip-title` (`:268-272`). Between hover and leave, the element's `title` is `""`. That is why `test_workflow_run.py:233-237` falls back to a text XPath ("`v-g-tooltip` rewrites the title attribute").
- **Triggers** (`setupListeners`, `:319-365`):
  - `mouseenter` schedules the show. `mouseleave` hides.
  - `focusin` shows immediately, but only for keyboard focus (`:focus-visible`). Pointer or programmatic focus is left to the hover path (`isNonKeyboardFocus`, `:315-317`).
  - `focusout` and `Escape` hide.
  - A capture-phase `click` hides the balloon when the host owns a popup toggle.

### The disabled guard

`showTooltip()` returns before rendering when the host is natively disabled, has a `disabled` attribute, has **`aria-disabled="true"`**, or owns an expanded popup (`:229-236`). Every disabled GButton or GLink carries `aria-disabled="true"`, so:

> **`v-g-tooltip` on a disabled GButton/GLink shows nothing.** The title was already blanked in `scheduleShowTooltip`, so the browser's native tooltip is gone too until `mouseleave`.

Issue [#24531](https://github.com/galaxyproject/galaxy/issues/24531) is this exact case: the history item edit button at `client/src/components/History/Content/ContentOptions.vue:139-151` (`v-g-tooltip.hover :disabled="editDisabled" :title="localize(editButtonTitle)"`) renders `title="" data-g-tooltip-title="This dataset is not yet editable." aria-disabled="true"`. At this SHA, 20 GButton opening tags in 9 `client/src` files combine `v-g-tooltip` with `disabled`/`:disabled`. Many of them toggle only during loading, but each has the same silent title. The fix being prepared in the `issue_24531_edit_disabled_tooltip_26.2` branch (not merged at this SHA) moves the edit button to `tooltip` + `disabled-title` and leaves the other sites for a `dev` follow-up.

## Directive vs built-in tooltip: when to use which

| Situation | Use |
|---|---|
| GButton/GLink that can be **disabled** and should explain why | `tooltip` + `title` + `disabled-title` props. Never `v-g-tooltip`. |
| GButton/GLink, always enabled | Either works. The `tooltip` prop gives an always-present sr-only description. The directive auto-sets `aria-label` on icon-only buttons and appends its balloon only on show. |
| Non-G element (span, icon, BFormCheckbox, plain `<button>`) | `v-g-tooltip`, the only option |
| HTML content, danger styling, overflow-only, controlled `show` | `v-g-tooltip` (`.html`, `.v-danger`, `.onoverflow`, `{show}`) |
| Rich slot content anchored to an arbitrary element | `<GTooltip :reference="el">…</GTooltip>` directly |

Don't combine them. `GLink v-g-tooltip.hover tooltip title=…` appears in `SchemaOrg/OrganizationViewer.vue:23`, `PersonViewer.vue:26,36` and `GrantViewer.vue:14`. With `tooltip` set, GLink drops the `title` attribute, so the directive has no content and never shows. It still writes its own `aria-describedby`, and GTooltip writes one too, onto the same element. Only one of the two survives.

## Shared timing

`tooltipTiming.ts` defines `DEFAULT_TOOLTIP_HOVER_DELAY_MS = 300` and `INTERACTIVE_POPOVER_CLOSE_DELAY_MS = 50`. `useDelayedAction(ms)` is a resettable single `setTimeout` with `schedule`, `clear` and `isScheduled`. Both tooltip implementations use the 300 ms hover delay: the directive through `state.showDelay` (`vGTooltip.ts:448`), GTooltip through `useAccessibleHover` (`accessibleHover.ts:19`). Focus differs between them. GTooltip shows immediately on any focus. The directive shows immediately on keyboard focus only.

## How E2E tests see these

Selectors live in `client/src/utils/navigation/navigation.yml`. `lib/galaxy/navigation/navigation.yml` is a symlink to it. Helpers live in `lib/galaxy/selenium/navigates_galaxy.py`.

| Helper / selector | Definition | Sees directive balloon | Sees GTooltip |
|---|---|---|---|
| `_.tooltip_balloon` | `'.tooltip, .g-tooltip-d'` (`navigation.yml:14`) | yes | **no** |
| `_.tooltip_inner` | `'.tooltip-inner, .g-tooltip-d-inner'` (`:15`) | yes | no |
| `_.tooltip_balloon_with_text(text)` | XPath on class `g-tooltip-d` (`:16-18`) | yes | no |
| `_.tooltip_by_id(id)` | `'#${id}'` (`:19`) | yes, while shown | yes |
| `clear_tooltips()` | hover `#center`, wait `.g-tooltip-d` absent/hidden (`navigates_galaxy.py:2102-2104`) | yes | no |
| `_clear_tooltip(component)` | `hover_away()`, then `wait_for_absent()`, up to 2 tries (`:3320-3333`) | yes | would never succeed (node always present) |
| `get_tooltip_text(el)` | `_clear_tooltip(tooltip_balloon)`, `hover(el)`, `tooltip_balloon.wait_for_visible().text` (`:3335-3346`) | yes | **times out** |
| `assert_tooltip_text[_contains]` | wrap `get_tooltip_text` (`:3369-3379`) | yes | no |

Consequences:
- **`get_tooltip_text` only reads `v-g-tooltip` (and legacy `.tooltip`) balloons.** A GButton or GLink using the `tooltip` prop renders `.g-tooltip`, which `tooltip_balloon` doesn't match. Moving a button from the directive to `tooltip`/`disabled-title` therefore breaks any `assert_tooltip_text` on it.
- **A GTooltip-aware read** follows the reference's `aria-describedby` to the `.g-tooltip` and waits for `data-show="true"`. The node is always in the DOM, so absence-based waits can't work. `workflow_editor_try_connect()` already reads `aria-describedby` and calls `tooltip_by_id(...).wait_for_text()` (`navigates_galaxy.py:1439-1440`). The 24531 branch adds the same fallback to `get_tooltip_text` (unmerged).
- **Prefer `data-title` over `title` in selectors.** The directive blanks `title` during hover, and the `tooltip` prop omits it entirely. `data-title` is stable and follows `disabled-title`.
- **Disabled state.** GButton is `aria-disabled` only:
  - Selenium's `WebElement.is_enabled()` reports it as enabled. Playwright's `is_enabled()` treats `aria-disabled="true"` as disabled. So `assert_disabled()` (`has_driver.py:211-215` vs `has_playwright_driver.py:393-399`) passes on one backend and fails on the other.
  - Clickability waits also pass on a disabled GButton.
  - Current tests assert the attribute instead: `test_history_dataset_state.py:75-77` and `test_workflow_extraction.py:202`.
  - To wait for an enabled GButton, use `:not([aria-disabled])` selectors: `start_button_enabled` and `data_library_add_selected_enabled` (`navigation.yml:1833,1880`), with the helper comments at `upload_activity_helpers.py:286,391`.

## Known issues and gaps at this SHA

- [#24531](https://github.com/galaxyproject/galaxy/issues/24531) is open: `v-g-tooltip` on disabled GButtons is silent (see the directive section above).
- `vGTooltip.test.ts` has no test of the disabled/`aria-disabled` guard or of its interaction with title suppression.
- The tooltip helpers don't cover GTooltip, and `assert_disabled` diverges between backends (see E2E above).
- GLink's `<button>` fallback has no `type="button"`.
- The SchemaOrg viewers apply both tooltip mechanisms to one element.

## Notes

- `projects/architecture/topics/client.md` carries the short BButton→GButton migration guidance. This note is the deeper reference for disabled and tooltip semantics.
- Both tooltip implementations position with `@floating-ui/dom`. The directive calls `computePosition` and `autoUpdate` itself (`vGTooltip.ts:190-210,259`). GTooltip uses the package's `useFloatingPosition` composable.
