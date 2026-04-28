# gxwf-ui polish — round 2

**Date:** 2026-04-23
**Parent context:** Round 1 redesign landed on branch `styling` in `galaxy-tool-util-ts`. Dropped gold borders, moved Clean/Lint/Export/Diagram to primary tabs, tucked Validate/Roundtrip/Convert behind ⋯ menu, added IWC nav link, tooltips, OS-dark default, dashboard filter + count + sort.
**Worktree:** `/Users/jxc755/projects/worktrees/galaxy-tool-util/branch/styling`.
**Key files:** `packages/gxwf-ui/src/{App.vue, main.ts, views/*, components/*}`, `packages/gxwf-ui/src/styles/galaxy.css`, `packages/gxwf-ui/src/theme.ts`, `packages/gxwf-e2e/src/locators.ts`.

## What round 1 deliberately left on the table

- Diagram still inside Tabs (first + default), not promoted to a dedicated primary region.
- Files view untouched (FileBrowser + EditorShell + EditorToolbar).
- No motion/micro-interaction pass; visuals sit where PrimeVue defaults + Galaxy palette land them.
- No keyboard shortcuts beyond PrimeVue defaults.
- Bundle size ballooned to ~8MB minified (Monaco + vscode deps). Warned but not addressed.

## Goals for round 2

Make the workflow view feel content-first, make operations feel like tools you reach for against that content, polish Files view to parity with workflows view, and tighten interaction feedback. Still no full agency-grade pass — save that for round 3 once these land.

---

## Phase A — Diagram as primary region (WorkflowView rehierarchy)

**Why:** Round 1 made Diagram the default tab but it still competes with Clean/Lint/Export in the tab strip. The user asks repeatedly to "see the workflow", so the diagram should *always* be visible when a workflow is open, not one of four equal modes.

**Shape:**
- WorkflowView layout: header strip → diagram panel (fills ~60vh by default, resizable) → "Tools" strip below with primary actions.
- Primary tool buttons (no longer tabs): Clean, Lint, Export. Secondary ⋯ menu: Validate, Roundtrip, Convert.
- Clicking a tool opens results in a collapsible drawer *below* the diagram (or side drawer on wide screens) — diagram stays visible.
- Result drawer header = operation name + Run controls + close button. Drawer contents = current tab panel contents (re-used).

**Files touched:**
- `components/OperationPanel.vue` — split into `OperationPanel` (action strip + drawer state) and per-op `ResultDrawer` content. The existing per-op templates become child components or a single `<OperationResult :op="activeOp">` dispatcher.
- `components/ToolStrip.vue` (new, small) — primary buttons + overflow menu.
- `components/ResultDrawer.vue` (new) — PrimeVue `Drawer` (bottom position) or a simple `<section>` with slide-down transition; drawer is right-hand if viewport ≥ 1280px, otherwise bottom. Test both.
- `views/WorkflowView.vue` — replaces `<OperationPanel>` with `<WorkflowDiagram>` + `<ToolStrip>` + `<ResultDrawer>`.

**Risks/unknowns:**
- PrimeVue `Drawer` may clash with the Monaco Files view if we later reuse it there. Scope drawer styling via `:scoped`.
- Persisting which op's result is latest: keep current `opCache` keyed by workflow path + op; drawer just reads from it.
- Deep link: currently `/workflow/:path` implies active tab via component state. Consider `?op=clean` query param for shareable "show me the clean run" URLs.

**Tests:**
- RTG component test: opening a workflow shows diagram + tool strip; no drawer.
- Clicking Clean opens drawer with clean controls; Run wires to `runClean`.
- Closing drawer leaves diagram visible; running a second op swaps drawer contents.
- Advanced ⋯ still promotes Validate/Roundtrip/Convert through the menu.
- E2E `clean.spec.ts`, `export.spec.ts`, `convert.spec.ts`, `roundtrip.spec.ts` — locators may need an "open tool" verb rather than "click tab". Extend `openOperationTab` helper to locate primary buttons by `data-description="tool strip {op}"` OR `data-description="{op} tab"` depending on which mode; keep API stable.

---

## Phase B — Files view parity

**Why:** Files view still has the old visual treatment (textarea fallback + Monaco side-by-side), inline save/error blocks, and no help text. Dashboard and WorkflowView set a new bar; FileView reads as unfinished.

**Shape:**
- Replace inline save/error/success `Message` blocks with `useToast` toasts — layout stops shifting when saving.
- Breadcrumb above editor (clickable path segments navigate the browser tree).
- `EditorToolbar`: add keyboard hint tooltips (⌘S save, ⌘Z undo, ⌘⇧Z redo, ⌘F find, ⌘⇧P palette). Some already have `title`; migrate to `v-tooltip`.
- `FileBrowser`: add filter input (same pattern as WorkflowList), empty-state treatment.
- Dirty indicator: replace "Save •" label hack with an unobtrusive badge or tab-style asterisk on the breadcrumb.

**Files touched:**
- `components/EditorToolbar.vue` (tooltip migration, keyboard hints).
- `components/FileBrowser.vue` (filter input, empty state).
- `views/FileView.vue` (toast wiring, breadcrumb, layout).
- `main.ts` (register `ToastService` + mount `<Toast>` in `App.vue`).

**Tests:**
- RTG: save success shows toast (no inline green block); save error shows error toast.
- RTG: filter in FileBrowser narrows tree.
- Breadcrumb click navigates.
- E2E: existing `EditorToolbar` locators (`editor toolbar save` etc.) preserved.

---

## Phase C — Spacing / type / motion pass

**Why:** Round 1 removed ornamentation; round 2 tightens proportions. Current spacing mixes 0.25 / 0.35 / 0.4 / 0.6 / 0.75 / 1 / 1.5rem. No motion anywhere.

**Shape:**
- Unify spacing tokens in `galaxy.css`: `--gx-sp-1 0.25rem`, `--gx-sp-2 0.5rem`, `--gx-sp-3 0.75rem`, `--gx-sp-4 1rem`, `--gx-sp-6 1.5rem`, `--gx-sp-8 2rem`. Sweep scoped styles to use tokens (grep `rem` in `src/**/*.vue`).
- Type scale tokens: `--gx-fs-xs 0.75rem`, `--gx-fs-sm 0.85rem`, `--gx-fs-base 1rem`, `--gx-fs-lg 1.25rem`, `--gx-fs-xl 1.5rem`.
- Replace ad-hoc monospace declarations (`font-family: monospace`) with `--gx-font-mono` (define once, use everywhere). Currently `WorkflowList` inline-styles + `WorkflowView` scoped styles + `DashboardView` + `EditorShell` all repeat the string.
- Motion: `prefers-reduced-motion`-gated transitions on hover, tab switch, drawer open (150ms ease). PrimeVue already provides most; ensure our scoped styles don't disable.

**Files touched:** `styles/galaxy.css`, every `*.vue` with a `<style scoped>` block (~10 files).

**Tests:** visual regression via Playwright screenshots against a couple of representative pages (Dashboard, WorkflowView, FileView). Out-of-scope: per-token unit tests.

---

## Phase D — Bundle split

**Why:** `pnpm build` emits single 8MB chunk; gzip ~2MB. First paint on cold cache is noticeable even locally. Monaco + vscode-services are most of it, and only Files view uses them.

**Shape:**
- Route-level lazy load for `FileView`: `component: () => import("../views/FileView.vue")`.
- Within `FileView`, keep Monaco dynamic-import gated on `VITE_GXWF_MONACO` flag (already the case). Audit `EditorShell.vue` + Monaco setup for eager imports that leak into the dashboard chunk.
- Mermaid already dynamic-imported in `composables/useMermaid.ts` — verify.
- Don't chase the chunk-split config knob until route lazy-load is done.

**Files touched:** `router/index.ts`, possibly `composables/useMermaid.ts` (if eagerly imported), `App.vue` (no change expected).

**Tests:** `pnpm build` output check — Dashboard-only chunk should be well under 1MB. Add a `scripts/check-bundle-size.mjs` that fails if the main chunk exceeds a threshold (e.g. 1.5MB gzip). Wire into `make check`? Discuss — could be noisy.

---

## Phase E — redesign-existing-projects skill pass

**Why:** User's own prompt flagged this — after structural polish, run the skill to catch "generic AI" leftovers (shadow stacking, overly muted colors, default button chrome, unused whitespace).

**Shape:** Invoke the skill against the current branch. Cherry-pick suggestions; ignore anything that fights the Galaxy palette or reintroduces ornament. This is the one phase that ships as a separate PR for a cleaner diff.

---

## Unified testing approach

- RTG component tests for A + B. Add tests failing first against current `main`/`styling`, then land implementation.
- Keep E2E green at every phase. Update `packages/gxwf-e2e/src/locators.ts` once per phase, not ad hoc in specs.
- `make check` + `make test` + `pnpm build` before each phase's merge.
- Manual smoke via `pnpm dev` in both light and dark OS mode before calling a phase done.

## Ordering

A → B → C → D → E. A and B can interleave if someone else picks up one. C is a sweep best done after A+B settle so we don't touch files twice. D is independent, but easier last so the route-split doesn't need to be re-tested after every visual change. E is last by definition.

## Out of scope (round 3 candidates)

- Keyboard shortcuts beyond editor (e.g. `g d` go to diagram, `/` focus filter).
- Dashboard workflow grouping (by top-level directory) — only useful past ~50 workflows.
- Actual CI enforcement of bundle size / visual regression.
- Theming knobs (light-mode-only lab, extra presets).
- Workflow diagram interactivity (click step → jump to Clean result for that step, etc.).

## Unresolved questions

- Phase A drawer: bottom vs side vs modal — preference?
- Phase A deep link `?op=clean` — worth it or YAGNI?
- Phase B toast vs inline for save success — fully replace, or keep inline as fallback?
- Phase B Breadcrumb — truncate long paths how? (middle ellipsis, scroll, wrap?)
- Phase C — sweep all `<style scoped>` now, or opt in per-file as they're touched?
- Phase D — add bundle-size CI gate, or manual-only?
- Phase E — run skill against `styling` branch or after rebase to `main`?
