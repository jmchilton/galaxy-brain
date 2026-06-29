# Galaxy Embed Theme Plan: Dark-mode the embedded Page for Orbit

> **Status:** Phase A implemented, unit-tested, **and live-verified** end-to-end
> 2026-06-22 — embed renders fully dark (bg `#2c3143`, light text, no white bands, no
> cell errors). Not yet committed. Galaxy: built-in `orbit` theme + `--content-*`
> plumbing + `App.vue` `?theme=` honoring + `PageView` dark prose CSS (themes 5/5,
> resolveTheme 8/8). Orbit: `getEmbedUrl` appends `&theme=orbit` (1003/1003 green).
> Live-verify caught + fixed two real bugs (see §4 Phase A notes): the scoped-CSS
> `:global()` mangling and a Bootstrap `.bg-white`/`.stripe` white-band. **Committed**
> 2026-06-22 — Galaxy `c101fb3b31`, Orbit `82ff4f2` (both on `notebook_iframe`, not
> pushed). Pending: Phase B (widgets); the separate loom-session push fix is still
> uncommitted in the Loom worktree.
> **Date:** 2026-06-22
> **Goal:** When Orbit shows a bound Galaxy Page in its `<webview>` (the notebook
> embed), the page should read as part of Orbit's dark shell instead of a bright
> white rectangle — done the *right* way, by extending Galaxy's existing theme
> system into page content, not by injecting CSS into a cross-origin webview.
> **Related:** [LOOM_PLAN.md](LOOM_PLAN.md) (the embed itself),
> [LOOM_1B_EMBED_AUTH_DESIGN.md](LOOM_1B_EMBED_AUTH_DESIGN.md) (embed-token auth).

---

## 0. Problem

Orbit is **dark-only** (single fixed `:root` palette in `app/src/renderer/styles.css`
— "Galaxy brand dark theme", `#2c3143` bg / gold accent; no light mode, no
`prefers-color-scheme`).

The notebook embed is **not Orbit-rendered**. `artifact-panel.ts:showGalaxyWebview()`
mounts an Electron `<webview>` pointing cross-origin at
`{galaxy_server_url}/published/page?id={pageId}&embed=true&rev=…`. Inside it,
**Galaxy** renders the page (`PageView.vue`, `embed` mode). `embed=true` strips
chrome only — it does **not** theme. Galaxy renders light (Bootstrap 4.6). Net
effect: a white document sitting in a dark shell.

## 1. Research findings (2026-06-22)

Galaxy *does* have a real, runtime theme system — and it's the right hook, but it
does not reach page content today.

- **Config-driven, no code to add a theme.** `config/themes_conf.yml` defines named
  themes (`blue`, `lightblue`, `pride`, `smoky`, `anvil`).
- **Generic flattener.** `lib/galaxy/util/themes.py:flatten_theme` turns *any*
  nested dict into `--key-subkey` CSS custom properties. It is **not** hardcoded to
  masthead — arbitrary nested keys already flatten to CSS vars.
- **Applied at the app root.** `client/src/entry/analysis/App.vue` binds the selected
  theme dict as inline `:style="theme"` on `#app`, so vars cascade to everything.

**Two limits make it unusable as-is for the embed:**

1. **Masthead-only reach.** Every sample theme defines `masthead:` and nothing else,
   and page/markdown content CSS consumes **zero** theme vars
   (`grep 'var(--…'` in `components/Page` + `components/Markdown` → empty). Content
   color is hardcoded light Bootstrap 4. And in `embed=true` the masthead isn't even
   rendered (`isChromeFree`), so **today's themes have literally no visual effect on
   the embed.**
2. **Selection is a persisted user preference** (`App.vue` reads
   `userStore.currentTheme`; set via `/api/users`), **not a URL param.** An embed has
   no theme picker and the embed-token user may have no pref set.

**Galaxy stack constraint:** Bootstrap **4.6** + bootstrap-vue 2.23 — predates
Bootstrap 5.3 `data-bs-theme` / native dark mode. There is no `prefers-color-scheme`
anywhere in the client. So a content dark mode must be built on CSS custom
properties; there is nothing native to switch on.

## 1a. Decisions (locked 2026-06-22)

- **Selection: `?theme=<id>` honored for *any* embedded page** (chrome-free mode),
  generically — not hardcoded to one theme. Keeps it flexible: any theme in
  `config.themes` can be requested by an embedder. (Resolves Q2.)
- **Framing: an Orbit-branded theme**, not a general Galaxy dark-mode pitch. Theme id
  is **`orbit`** (so the URL reads `?theme=orbit`, not the redundant
  `?theme=orbit-theme`). (Resolves Q3 + Q5.)
- **`orbit` is a built-in theme**, always present in `config.themes` regardless of the
  admin's `themes_conf.yml`. Rationale: `themes_config_file` is **not** in
  `add_sample_file_to_defaults`, so there is **no** sample fallback — an admin with no
  `themes_conf.yml` has `config.themes == {}`. A built-in guarantees `?theme=orbit`
  resolves on any Galaxy the Orbit embed connects to. Admin config may override
  `orbit` by redefining the key. (Resolves the deployment gap.)
- **Param read is client-side** in `App.vue`'s `theme()` computed (the theme dict
  already comes from server `config.themes`; no new server route needed). (Resolves Q4.)
- **Content var prefix `--content-*`** (flattened from a nested `content:` block).

## 2. Decision

**Extend Galaxy's theme system into page content** and select it for the embed via a
query param. This is the durable choice:

- Reuses the existing abstraction (`themes_conf.yml` + `flatten_theme` + `#app`
  inline vars) instead of a new one.
- Lands a **reusable dark-mode foundation in Galaxy** that benefits all users, not
  just Orbit.
- Avoids the rejected alternative: Orbit calling `webview.insertCSS()` into a
  cross-origin guest (couples to Galaxy's DOM/class names, specificity war vs
  Galaxy's light CSS, white FOUC before inject, restyle every widget by hand — an
  unbounded chase).

**Defaults preserve light.** Every var-ified rule defaults to its current light value
(`var(--content-bg, #fff)`), so normal Galaxy is byte-unchanged until a dark theme is
selected.

## 3. Architecture

Four pieces, smallest-blast-radius first:

1. **Built-in `orbit` theme + content surfaces.** Define `orbit` as a built-in nested
   theme in `lib/galaxy/util/themes.py`, seeded into `config.themes` before
   `_load_theme` so it's always available (admin-overridable). Its `content:` block
   flattens to `--content-bg`, `--content-text`, `--content-surface`,
   `--content-border`, `--content-link`, etc. `flatten_theme` already supports nesting
   — **no parser change**. Also document a `content:` example in
   `themes_conf.yml.sample`.
2. **Content CSS consumes the vars.** Replace hardcoded light colors in `PageView.vue`
   and the Markdown render components with `var(--content-*, <light-default>)`. *This
   is the cost driver* — it scales with widget variety (see §4 phasing). Defaults keep
   normal Galaxy byte-unchanged.
3. **Honor `?theme=<id>` for any embedded page.** Extend `App.vue`'s `theme()`
   computed: when `this.embedded`, read `$route.query.theme`; if it's a known key in
   `config.themes`, apply that theme dict on `#app` (its `--content-*` vars cascade to
   `PageView`). Returns `null` otherwise (today's behavior). Generic — any theme id
   works. Gated on `embedded`, so it never overrides a logged-in user's pref in the
   normal app.
4. **Orbit appends `&theme=orbit`.** In the embed-URL builder
   (`extensions/loom/galaxy-embed.ts` `getEmbedUrl`), append `&theme=<id>` (default
   `orbit`, configurable). The `orbit` built-in mirrors Orbit's palette
   (`app/src/renderer/styles.css` `:root` — `#2c3143` surface, `#f0f2f8` text, gold).

## 4. Phasing (prose-first)

Each phase is independently shippable and red-to-green testable.

- **Phase A — Plumbing + prose.** ✅ implemented + unit-tested 2026-06-22.
  - A1 ✅ Built-in `orbit` theme (`lib/galaxy/util/themes.py:BUILTIN_THEMES` +
    `flattened_builtin_themes()`) seeded into `config.themes` in
    `lib/galaxy/config/__init__.py` (admin-overridable). `content:` block →
    `--content-*` vars. Documented `content:` in `themes_conf.yml.sample` (blue, light
    values). Test `test/unit/util/test_themes.py` (5).
  - A2 ✅ `PageView.vue`: dark prose rules gated under `#app.embed-themed
    .page-view.embed` (bg, container, headings, links, code/pre, blockquote, hr,
    tables, `.text-muted`, plus Bootstrap `.bg-white`/`.bg-light`→surface and
    `.stripe`→border), all from `--content-*` vars → un-themed embed byte-identical.
    **Must be a NON-scoped `<style>` block**: a scoped block with
    `:global(#app.embed-themed) .page-view.embed` is mis-compiled by the rolldown Vue
    scoped transform (drops the descendant, lands rules on `#app`). Found in live verify.
  - A3 ✅ Theme resolution extracted to pure `resolveTheme.ts` (used by `App.vue`
    `theme()`); honors `$route.query.theme` when `embedded`, generic over any
    `config.themes` key; `App.vue` root tags `embed-themed` when an embedded theme is
    active. Test `resolveTheme.test.ts` (8).
  - A4 ✅ Orbit `getEmbedUrl` appends `&theme=<id>` (default `DEFAULT_EMBED_THEME =
    "orbit"`, `null` omits). Tests in `galaxy-embed.test.ts` + `ui-bridge-embed.test.ts`.
  - A5 ✅ Duplicate-title fix (`ceb2de8880`): the chrome-free branch rendered
    PageView's `page-title` Heading **and** `Markdown.vue`'s own sticky title header
    (the dup was light-on-white, invisible until theming landed). Added a `hideHeader`
    prop to `Markdown.vue`, set on PageView's chrome-free render; keeps `page-title`.
  - ✅ Live-verified end-to-end (dark render, single title) + committed: Galaxy
    `c101fb3b31` + `ceb2de8880`, Orbit `82ff4f2`.
  - Covers the **majority** of real Pages (narrative + tables) cheaply.
- **Phase B — Rich widgets.** Var-ify the embedded Galaxy markdown widgets that
  render inside a Page: invocation tables, history/dataset cards, dataset peeks,
  job views, charts/visualizations. Each widget = its own var-ification + visual
  check on dark. Largest, most open-ended phase — do only the widgets that actually
  appear in Loom-pushed Pages first (invocation + history are the common ones).
- **Phase C — Polish.** Scrollbars, focus rings, selection color, loading/skeleton
  backgrounds, empty/error states, image/figure backgrounds (white-on-dark images),
  syntax highlighting theme for code blocks.

## 5. Testing strategy (red-to-green)

Galaxy-side (client):
- **`App.vue` theme test:** with `embedded` + `$route.query.theme="orbit"`, assert
  `theme()` returns the `orbit` dict (its `--content-*` vars); with no query theme
  while embedded, returns `null` (today's behavior); unknown id → `null`.
- **`themes.py` unit:** assert `flatten_theme` emits `--content-bg` etc. for a nested
  `content:` block, and that the built-in `orbit` theme exposes the content vars
  (guards the schema contract).
- **Selenium/Playwright (optional, Phase A end):** load a published page with
  `&embed=true&theme=orbit`, assert computed `background-color` of the content root
  is dark. Run **one suite at a time** per repo convention.

Orbit-side:
- **`galaxy-embed.test.ts`:** `getEmbedUrl` appends `&theme=` when an embed-theme is
  configured; omits it when not. Extends the existing rev/embed_origin param tests.

Per house rule: red-to-green, never weaken assertions, run newly-added tests before
claiming done.

## 6. Risks / watch-list

- **Phase B is unbounded if scoped to "all widgets."** Cap it to widgets that appear
  in Loom-pushed Pages; `log`/note anything deferred so coverage isn't overstated.
- **Default-light regression risk.** Any var-ified rule missing its light fallback
  shifts normal Galaxy. Mitigate: every `var(--x, <light>)` must carry the current
  value as fallback; the "no theme stays light" test guards this.
- **Cross-origin images on dark.** Galaxy-rendered figures/plots with transparent
  backgrounds may look wrong on dark; may need a per-image white backing surface.
- **Theme-param vs user-pref precedence.** Must NOT let `?theme=` override a logged-in
  user's chosen theme in the normal app — restrict the override to chrome-free/embed
  mode.
- **Community/design dimension.** A general Galaxy dark mode is a broader design
  conversation than an Orbit-only embed theme (same code, bigger blast radius). Decide
  framing before opening a Galaxy PR (§7 Q3).

## 7. Unresolved questions

1. **Content scope to ship first:** prose/markdown only (Phase A — current default),
   or must rich widgets (invocation tables, history cards, charts) be dark at v1 too?
   (Cost driver. Proceeding prose-first unless told otherwise.)

### Resolved (2026-06-22)
- **Q2 Selection:** `?theme=<id>` query param, honored for any embedded page. ✅
- **Q3 Framing:** Orbit-branded built-in theme, id `orbit`. ✅
- **Q4 Param read:** client-side in `App.vue` `theme()` (gated on `embedded`). ✅
- **Q5 Naming:** theme id `orbit` (not `orbit-theme`/`dark`); content var prefix
  `--content-*`. ✅
