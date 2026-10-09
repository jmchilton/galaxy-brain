# PR 21959 — Replace BPopover with custom GPopover component

- PR: https://github.com/galaxyproject/galaxy/pull/21959
- Author: dannon (plus a large follow-on stack of commits by itisAliRH)
- Base: dev, +1907/-211, 34 files, not draft
- Head reviewed: `0afb7498f39` (worktree `~/projects/worktrees/galaxy/pr/21959`, diffed against merge-base with fresh `origin/dev`)
- State: mergeable; **already APPROVED by itisAliRH** (their earlier CHANGES_REQUESTED on missing arrow / hover gap / creator table is addressed in-branch)
- CI (2026-09-25): 15 checks reported, 1 pass (CircleCI get_code_and_test), 14 pending (client-unit-test, build-client, API, CodeQL). No failures yet.
- Tests not run locally: worktree has no `client/node_modules`; install not cheap.

## Summary of change

- New `client/packages/ui/src/components/GPopover.vue` (floating-ui, Bootstrap `.popover` classes, arrow, BPopover-compatible props: `target` id/element/getter, `triggers`, `placement`, `boundary` (ignored), `title`/`content`/slots, `show.sync`, `customClass`, `shown`/`hidden` events). Re-exported from `client/src/components/BaseComponents/GPopover.vue`.
- Extracted `useFloatingPosition` composable (`packages/ui/src/composables/floatingPosition.ts`); GTooltip now uses it too.
- New `packages/ui/src/utils/hoverBridge.ts`: safe-triangle geometry so pointer can travel trigger -> popover without closing (floating-ui's `safePolygon` is React-only, so a local impl is justified).
- Popover relocated to `document.body` (or enclosing `<dialog>`) manually; vue2-teleport dropped.
- All BPopover / `b-popover` usages migrated (grep confirms zero left in `client/src` and `client/packages`). Deletes unused `PreferredStorePopover.vue`. PersonViewer/OrganizationViewer switched from never-resolving `$refs['button'] || 'works-lazily'` target to a uid element id (real bug fix, with test). `suppressBootstrapVueWarnings()` dropped from ToolForm test.
- Tests: GPopover.test.ts (~40 cases), GTooltip.test.ts, floatingPosition.test.ts, hoverBridge.test.ts, CreatorViewers.test.ts.

## Findings (ranked)

### 1. Medium — slot content now rendered eagerly and kept mounted (BPopover rendered lazily)

`GPopover.vue:479-494`: popover body is `v-show`, so default/title slot components mount with the host and never unmount. BPopover only instantiated slot content in its template instance on show and destroyed it on hide. Verified side effects at migrated call sites:

- `Tool/ToolLinkPopover.vue` -> `ToolLink.vue:27-34` calls `toolStore.fetchToolForId()` on mount (immediate watch). Now fires eagerly for every ToolLinkPopover:
  - `WorkflowInvocationStepHeader.vue:40` — every tool step header. `WorkflowStepTitle.vue:42-45` already fetches the same tool in the same tick; `fetchToolForId` (`stores/toolStore.ts:248`) has no in-flight dedupe, so invocation view now issues ~2x `/api/tools/{id}` per tool step on load instead of 1.
  - `Markdown/Sections/Elements/Workflow/WorkflowDisplay.vue:121`, `JobMetrics.vue:68`, `JobParameters.vue:70` — new eager fetches per element/step (previously hover-only).
- `Tool/ToolTargetPreferredObjectStorePopover.vue:10` -> `ShowSelectedObjectStore.vue` calls `getObjectStoreDetails()` on setup; now on every tool form load when a tool-level store is set (ToolCard mounts it whenever `allowObjectStoreSelection`).
- Every `ToolsListCard`, ag-grid `CellStatusComponent`, `DatasetPopoverLink` etc. now keeps a full hidden popover subtree in `<body>`.

Suggested fix: keep the positioned shell `v-show` (listeners/relocation depend on `popoverEl` existing) but gate the slot, e.g.

```vue
<template v-if="showState">
  <div v-if="title || $slots.title" class="popover-header">...</div>
  <div class="popover-body"><slot>{{ content }}</slot></div>
</template>
```

(or a `hasBeenShown` flag if keeping content warm after first open is preferred). Add a test: slot component not mounted until first show. Note `Node.vue` already guards `Recommendations` with `v-if="popoverShow"`, i.e. callers were relying on the lazy behaviour implicitly.

### 2. Medium (reuse) — third positioned-overlay implementation; no stated convergence with `Popper`

Galaxy already has `client/src/components/Popper/Popper.vue` + `usePopper.ts` (`@popperjs/core`), used by ~11 components (HelpPopover, ActivityItem, NotificationsBell, UploadExtension, StorageQuotaImpactBar, CellAdd/CellAction, LoginRequired, ...). It implements the same trigger model (click/hover, interactive close grace via the same `useDelayedAction`/`INTERACTIVE_POPOVER_CLOSE_DELAY_MS`), outside-click close (`usePopper.ts:46-52`), Escape close (`:61-68`) and `.popper-close` delegation (`:53-60`). After this PR there are three: GTooltip, GPopover, Popper.

The PR does good seam work (`useFloatingPosition`, shared timing, moving into `packages/ui`), but:
- Ask for a tracked follow-up (or a line in the description / #21956) that Popper migrates onto GPopover (or onto `useFloatingPosition` + shared trigger logic) so `@popperjs/core` can go, rather than both living on.
- `packages/ui/src/composables/accessibleHover.ts` (used by GTooltip) already owns hover/focus/Escape listener wiring with a show delay; GPopover re-implements hover/focus wiring at `GPopover.vue:360-409`. It can't drop in as-is (GPopover needs close grace + bridge), but extending `useAccessibleHover` with a close-delay/exit hook would keep one hover state machine.
- `resolveTarget()` (`GPopover.vue:78-103`) duplicates the `$el` unwrapping in `packages/ui/src/composables/resolveElement.ts` (`useResolveElement`). Minor; could share a plain `resolveElement(value)` helper.

### 3. Low — `hover focus` does not keep the popover open while focused

`GPopover.vue:369-383`: triggers are independent, so with `triggers="hover focus"` (CellStatusComponent, DatasetPopoverLink, StorageOperationOutcomeProgress) a focused trigger closes on `mouseleave`, and `blur` hides immediately even while the pointer is over trigger/popover. BPopover tracked active triggers and stayed open while any was active. Suggest a small `activeTriggers` set (hover/focus/click) and close only when empty. No focus/blur test exists at all — add one.

### 4. Low — no Escape dismissal

No keydown handling. GTooltip (`accessibleHover.ts:45-49`) and `usePopper.ts:61-68` both close on Escape; the code comment at `GPopover.vue:231` cites WCAG 1.4.13, which also requires "dismissable". itisAliRH says keyboard/SR support follows in a stacked PR — fine, but Escape is cheap and would align with the two existing siblings; worth including here or confirming it's in that follow-up.

### 5. Low / question — defaults differ from BPopover

BPopover defaults: `triggers="click"`, `placement="right"` (verified in bootstrap-vue `src/components/popover/popover.js`). GPopover: `triggers="hover"`, `placement="auto"` -> mapped to `"bottom"` (`GPopover.vue:46-47,120`).
- Placement change is user-visible where callers omit it: `CellStatusComponent.vue:63`, `ToolCard.vue:243`, `ToolLinkPopover.vue:22`, `PersonViewer.vue:5`, `OrganizationViewer.vue:5` (right -> bottom). Probably fine, but should be intentional.
- Trigger change affects `FormDataExtensions.vue:50` and `FilterMenu.vue:242`, which omit `triggers` and toggle via their own button + `show.sync`. Under GPopover, hovering the button opens the popover after 300 ms and the subsequent click then closes it. Both paths currently appear unused (`popover` prop / `view="popover"` never passed), so not a live regression — suggest `triggers="manual"` there explicitly, or matching BPopover's defaults.

### 6. Nits

- `GPopover.vue:3` docblock says `"boundary" is unused` while the prop doc at `:30-33` describes behaviour; pick one wording.
- `GPopover.test.ts:101-107` asserts only the absence of `altBoundary` — passes trivially if flip/shift were removed. Assert the expected options instead.
- `click blur` installs a permanent capture-phase `document` click listener per instance even while hidden (`GPopover.vue:388-400`); could add on show / remove on hide. Only PersonViewer/OrganizationViewer use it today.
- PR description is stale: says 15 files, doesn't mention the move into `packages/ui`, GTooltip refactor, hover bridge, or teleport drop. Worth refreshing for reviewers/changelog.
- `ToolCard.vue:242` still uses literal `id="target"` (pre-existing, but migrating it to a uid would be a free fix while touching the line).

## Reuse / abstraction assessment

Positive: extracted `useFloatingPosition` and moved GTooltip onto it; reused `useDelayedAction`, timing constants and `useUid`; component lives in `packages/ui` alongside GTooltip; hover-bridge geometry isolated as pure, unit-tested functions. Negative: leaves `Popper.vue`/`usePopper.ts` (`@popperjs/core`) as a parallel popover path with overlapping features GPopover lacks (Escape, close-element delegation); hover/focus wiring duplicates `useAccessibleHover`; target resolution duplicates `useResolveElement`. Net: good seam for positioning, but trigger/interaction logic now exists three times.

## Test assessment

Strong on hover/bridge edge cases, relocation, teardown races, show.sync, aria-describedby preservation, click-outside; geometry has unit tests; CreatorViewers test pins a real bug fix. `TemplateSummaryPopover.test.ts` change (attrs -> `props("target")`) is an equivalent assertion, not weakened. ToolForm test dropping `suppressBootstrapVueWarnings()` is a strengthening. Gaps: no focus/blur trigger tests (3 call sites use `hover focus`), no lazy-render test, one negative-only assertion (nit 6). No Selenium/Playwright selectors reference BV popovers (only tour `.tour-element`), so e2e impact is nil.

## Draft GitHub review comment

> Posted by Claude (AI assistant) on behalf of jmchilton
>
> Nice work — `useFloatingPosition` + moving GTooltip onto it is a good seam, and the PersonViewer/OrganizationViewer target fix is a real bug fix. A few things, none blocking given the existing approval:
>
> 1. **Slot content now mounts eagerly.** The body is `v-show`, so slot components mount with the host and stay mounted; BPopover only instantiated them on show. `ToolLink` fetches `/api/tools/{id}` on mount, so every `ToolLinkPopover` (invocation step headers, WorkflowDisplay, JobMetrics/JobParameters) now fetches eagerly — on the invocation view that doubles up with `WorkflowStepTitle`'s fetch since `fetchToolForId` doesn't dedupe. `ToolTargetPreferredObjectStorePopover` likewise fetches object-store details on every tool form load. Gating the header/body on `showState` (keeping the shell `v-show`) would restore the old behaviour.
> 2. **Convergence with `Popper.vue`/`usePopper`.** That's a third popover implementation (popperjs) with click/hover, outside-click, Escape and `.popper-close`. Could we note a follow-up to move it onto GPopover / `useFloatingPosition` so `@popperjs/core` can go? Relatedly, GPopover's hover/focus wiring overlaps `useAccessibleHover`, and `resolveTarget` overlaps `useResolveElement`.
> 3. **`hover focus` parity.** Triggers are independent, so a focused trigger closes on mouseleave and blur closes while hovered; BPopover stayed open while any trigger was active. There are no focus/blur tests yet.
> 4. **Escape.** GTooltip and usePopper both dismiss on Escape; worth adding here if cheap, or confirming it's in the keyboard follow-up.
> 5. **Defaults differ from BPopover** (`click`/`right` vs `hover`/`auto`→`bottom`). Placement visibly changes for CellStatusComponent, ToolCard, ToolLinkPopover, Person/OrganizationViewer. `FormDataExtensions` and `FilterMenu`'s popover view omit `triggers` and toggle via their own button, so hover now opens them and the click then closes — those paths look unused today, but `triggers="manual"` would make intent explicit.
>
> Nits: the `boundary` test only asserts absence of `altBoundary`; the PR description predates the move into `packages/ui`/hover bridge and could use a refresh.
