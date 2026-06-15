# Embedding Galaxy Notebooks & Pages outside Galaxy — research + plan

**What this is:** research into how Galaxy embeds workflow displays externally today, and a plan for doing the same for Notebooks (Galaxy-Flavored Markdown) and Pages. Produced by a research subagent reading the `history_pages` worktree. File:line refs are to that branch.

---

## (A) How external workflow embedding works today

Galaxy already ships a complete **iframe-of-a-published-route** embedding path for workflows. No oEmbed, no standalone image/widget API — it's a full Vue app in an iframe, gated by the sharable-publishing system.

Four moving parts:

1. **Publish/access gate (reused abstraction).** Workflows are `SharableModelManager[StoredWorkflow]`. Publishing sets `importable=True`+`published=True`; `is_accessible()` returns True whenever `importable` is set → anonymous read.
   - `lib/galaxy/managers/sharable.py:101-160` (`is_accessible`, `publish`, `make_importable`, `set_slug`)
   - `lib/galaxy/managers/workflows.py:323-338` (`get_stored_accessible_workflow` allows access when importable)
   - Sharing API: `lib/galaxy/webapps/galaxy/api/workflows.py:971-1070`

2. **The embeddable URL is a client route, not an API:**
   `https://HOST/published/workflow?id=ENCODED_ID&embed=true&buttons=true&minimap=true&zoom=0.75`
   - Route: `client/src/entry/analysis/router.js:208-222` → `WorkflowPublished.vue` (parses `embed`,`zoom`,`buttons`,`about`,`heading`,`minimap`,`zoom_controls`,`initialX/Y`).
   - iframe snippet generator for users: `client/src/components/Sharing/Embeds/WorkflowEmbed.vue` (builds `<iframe src=...>` via `getFullAppUrl("published/workflow?...")`).

3. **The X-Frame-Options carve-out (the linchpin).** Galaxy sends `X-Frame-Options` on every response *except* embed requests:
   ```python
   # lib/galaxy/webapps/base/webapp.py:280-281
   def _is_embed_request(path, query_string):
       return path.startswith("/published/") and "embed=true" in query_string
   ```
   - Enforced in `lib/galaxy/webapps/galaxy/fast_app.py:132-156` (`XFrameOptionsMiddleware` appends header only when `not _is_embed_request`).
   - **Path-prefix based (`/published/`) → already covers `/published/page`, `/published/visualization`, `/published/history`.**
   - CORS for API XHR is separate: `GalaxyCORSMiddleware`, only on if `allowed_origin_hostnames` is configured (`fast_app.py:155-168`).

4. **Inside the iframe** the published component fetches `/api/workflows/{id}` + `/download?style=editor` (anonymous-accessible for importable) and renders client-side.

**Server-side SVG exists but is login-gated, not the embed path:** `gen_image` controller `lib/galaxy/webapps/galaxy/controllers/workflow.py:123-138` (`@web.require_login`); generator `WorkflowManager.get_workflow_svg(..., for_embed=True)` `lib/galaxy/managers/workflows.py:396-427` (canvas in `lib/galaxy/workflow/render.py`). This SVG generator is **reused by markdown** and is the natural primitive for any image-snapshot option.

Contract: external page → `<iframe src="/published/workflow?id=...&embed=true">` → middleware drops X-Frame-Options → Vue loads → anonymous API read on importable workflow. Auth = published only; private → 403.

## (B) How Pages/Notebooks render, and what blocks external embedding

"Notebooks" = Galaxy-Flavored Markdown. Both **Pages** (`Page`/`PageRevision`, content_format markdown) and notebook markdown go through `lib/galaxy/managers/markdown_util.py`. **Two pipelines** — which one you pick is the whole ballgame.

**Pipeline 1 — client-side interactive (live UI).** `PageView.vue` → `Markdown.vue` (`parseMarkdown`) → `MarkdownGalaxy.vue` + element components. Directives become live fetches:
- `client/src/components/Markdown/gxuris.ts:25-32` rewrites `gxdatasetasimage://ID` → `/dataset/display?dataset_id=ID`, `gxstatic://` → `/static/...`.
- `HistoryDatasetAsPdf.vue:22` embeds `<embed src="/dataset/display?dataset_id=ID#page=N">`.
- `MarkdownGalaxy.vue:43` resolves invocation context via `useInvocationStore()` (API).
- `visualization` directive mounts a full Galaxy viz plugin — heavy JS, live data.

**Pipeline 2 — server-side self-contained (export).** `ToBasicMarkdownDirectiveHandler` (`markdown_util.py:876-1010`) **bakes everything in**: datasets as base64 data-URI images (`_embed_image` :951), PDFs rasterized to images, **workflow diagrams via `get_workflow_svg(for_embed=True)` inlined as base64 SVG** (:1004-1009). Flows `to_basic_markdown()` (:1155) → `to_html()` (:1163, markdown→sanitized HTML) → `to_pdf_raw()`/weasyprint (:1169).

**What renders Pages on the web today:**
- `GET /api/pages/{id}` (`api/pages.py:240`) → `PageService.show` → `_page_to_details` → `rewrite_content_for_export`; access via `get_object(check_accessible=True)` → **published pages already anonymous-readable**.
- `GET /api/pages/{id}.pdf` (:195) + `POST /api/pages/{id}/prepare_download` (:219) → server-side PDF (Pipeline 2).
- Client published route `/published/page?id=...&embed=true&displayOnly=true` **already exists** (`router.js:193-201`; `PageView.vue` accepts `embed`/`displayOnly`).

**What blocks external embedding today:**
1. **No server-rendered static-HTML endpoint.** `to_html()` exists but is exposed nowhere — only PDF. No self-contained HTML artifact to embed; only the live Vue app.
2. **Iframe of `/published/page?embed=true` is technically already unblocked** (path is `/published/`) — but loads the full SPA and depends on Pipeline 1's live `/dataset/display` + `/api`. `/dataset/display` enforces `_can_access_dataset` (`controllers/dataset.py:96-112`), so **private datasets referenced in a published page → broken images/403 inside the iframe**. Core content-access gap.
3. **Relative asset URLs** (gxuris, dataset/static) are app-root-relative — fine in a same-Galaxy iframe, impossible for "copy HTML elsewhere" without the base64 path.
4. **Heavy JS / visualization directives** don't degrade to static in Pipeline 1; only Pipeline 2 flattens them (and even then doesn't render interactive viz — needs a snapshot strategy).
5. **No embed-snippet UI for pages** — `WorkflowEmbed.vue` exists; no `PageEmbed` equivalent.

## (C) Plan / options for embedding Notebooks + Pages externally

Three realistic, non-exclusive options.

### Option 1 — Iframe of the published page view (`/published/page?embed=true`)
Mirror workflow embed exactly. Lowest new-code; max reuse.
- **Reuses:** X-Frame-Options carve-out (already covers `/published/`), `embed`/`displayOnly` props on `PageView.vue`, pages sharing/slug API (`api/pages.py:267-352`), anonymous `/api/pages/{id}`.
- **Files:** add `client/src/components/Sharing/Embeds/PageEmbed.vue` (clone `WorkflowEmbed.vue`, src=`published/page?id=...&embed=true&displayOnly=true`); wire into page sharing UI. Verify `displayOnly` hides chrome/owner controls.
- **Tradeoffs:** + near-zero backend, interactive. − loads whole SPA (heavy); **breaks on private referenced datasets** (only safe when page + every referenced dataset is published); needs live Galaxy; not portable to a static host.
- **Security:** publish-only (enforced); embed only relaxes X-Frame-Options, not auth. Confirm `displayOnly` strips edit affordances for anonymous viewers.

### Option 2 — Server-rendered self-contained HTML export endpoint (RECOMMENDED primary)
Expose the existing Pipeline 2 as HTML → single inert HTML blob with base64-inlined images + workflow SVGs. Embeddable anywhere (iframe `srcdoc`, static site, blog) with **no live-Galaxy dependency and no per-dataset auth problem at view time** (access checked once, server-side, at render).
- **Reuses heavily:** `to_basic_markdown()` → `to_html()` (`markdown_util.py:1155-1166`) already exist and already inline datasets/workflow SVG. Same path that powers PDF export; add an HTML sibling.
- **Files:**
  - `services/pages.py`: add `show_html(trans, id)` next to `show_pdf` (:156) → `to_basic_markdown`+`to_html`, optionally branded via the `to_branded_pdf` CSS-loading approach (`markdown_util.py:1221`).
  - `api/pages.py`: add `GET /api/pages/{id}.html` mirroring `show_pdf` (:195), `response_class=HTMLResponse`, same `check_accessible=True` → published-only.
  - Notebook (non-Page) variant: same `to_basic_markdown`/`to_html` works on any internal markdown (the invocation-report path already uses these).
- **Tradeoffs:** + portable, robust, no client-runtime/auth coupling, dataset access resolved server-side. − static (no interactive viz; `visualization` directive can't flatten to HTML today — needs placeholder or snapshot); larger base64 payloads → must size-bound.
- **Security (most important here):** access runs server-side during render (handlers call `hda_manager.get_accessible(...)`; private content won't render — confirm it raises/skips, doesn't leak). Keep `to_html` sanitization; no `allow_html` passthrough for untrusted pages. **OpenAI/LLM key in `config/galaxy.yml` is never touched by this path — keep it that way; no directive resolves secrets.** Prefer hosting under `/published/...` so the one existing `_is_embed_request` rule governs framing rather than adding new allowlist entries.

### Option 3 — Image/PNG/SVG snapshot widget
For READMEs/emails that can't iframe. Reuse `get_workflow_svg` for the workflow-diagram case (cheap). Full-page snapshot needs headless browser infra Galaxy lacks → high cost/low reuse. **Scope to workflow-diagram-only snapshots; defer full-page rasterization.**

### Recommended path
Ship **Option 2** (portable self-contained HTML, reusing `to_basic_markdown`/`to_html`) as primary + **Option 1** (page embed iframe under `/published/`) as the interactive same-Galaxy variant. Both gated by the existing sharable publish system; both reuse the `/published/` X-Frame-Options carve-out. No net-new auth/sharing abstractions.

### Reuse scorecard
- Publish/slug/anonymous: 100% reuse of `SharableModelManager` + pages sharing API — no new auth model.
- Iframe carve-out: reuse `_is_embed_request` (already `/published/` prefix, already covers pages).
- Self-contained render: reuse `ToBasicMarkdownDirectiveHandler` + `to_basic_markdown` + `to_html` + branded-CSS loader; add only an HTML response sibling.
- Embed-snippet UI: clone `WorkflowEmbed.vue` → `PageEmbed.vue`.
- Workflow diagram image: reuse `get_workflow_svg(for_embed=True)`.

## (D) Open questions
1. Embed target — same-Galaxy interactive iframe (Opt 1) or portable paste-anywhere HTML (Opt 2)? Drives priority.
2. Must embeds support **private** referenced datasets? If yes, Opt 1 unsafe → Opt 2 (published-only server render) or a signed `instance_access_token` flow. Does the existing `instance_access_token` directive already mint a scoped token usable here?
3. Interactive `visualization` directives in embeds — OK as static placeholder/snapshot in Opt 2, or hard interactive requirement (forcing Opt 1)?
4. Cross-origin: same-origin embedders (no CORS work) or arbitrary third-party (then `allowed_origin_hostnames` + deliberate `/published/` embed URL)?
5. Size limits for base64-inlined HTML — cap per-dataset size for `as_image`/`as_pdf` inlining?
6. Notebooks not backed by a `Page` — what addressable URL/identity do they have for an embed endpoint? (Pages have slug+id; standalone notebook markdown may not.)
7. HTML export for large pages — reuse async short-term-storage (`prepare_download`) or stay synchronous like `show_pdf`?
